import type { ServerWebSocket } from 'bun';
import type { ClientMessage, PeerId, RoomCode, ServerMessage } from '@fileshare/shared';
import { getPort } from '@fileshare/shared';

const PORT = getPort();
const ROOM_TTL_MS = 10 * 60 * 1000; // 10 minutes

type Peer = {
  id: PeerId;
  socket: ServerWebSocket;
  roomCode: RoomCode | null;
};

type Room = {
  code: RoomCode;
  initiator: Peer;
  joiner: Peer | null;
  createdAt: number;
};

const peers = new Map<ServerWebSocket, Peer>();
const rooms = new Map<RoomCode, Room>();

const send = (socket: ServerWebSocket, message: ServerMessage) => {
  socket.send(JSON.stringify(message));
};

const CLIENT_MESSAGE_TYPES = new Set<string>(['createRoom', 'joinRoom', 'sdpOffer', 'sdpAnswer', 'iceCandidate']);

const parseClientMessage = (raw: string): ClientMessage | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)) return null;
  if (typeof parsed.type !== 'string' || !CLIENT_MESSAGE_TYPES.has(parsed.type)) return null;

  if (parsed.type !== 'createRoom') {
    const payload = 'payload' in parsed ? parsed.payload : undefined;
    const roomCode =
      typeof payload === 'object' && payload !== null && 'roomCode' in payload ? payload.roomCode : undefined;
    if (typeof roomCode !== 'string') return null;
  }

  return parsed as ClientMessage;
};

const generateRoomCode = (): RoomCode => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars, 32 entries so byte % 32 is unbiased
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const code = Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
  return rooms.has(code) ? generateRoomCode() : code;
};

const getOtherPeer = (room: Room, self: Peer): Peer | null => {
  if (room.initiator.id === self.id) return room.joiner;
  if (room.joiner?.id === self.id) return room.initiator;
  return null;
};

const cleanupRooms = () => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL_MS) {
      room.initiator.roomCode = null;
      if (room.joiner) room.joiner.roomCode = null;
      rooms.delete(code);
    }
  }
};

setInterval(cleanupRooms, 60_000);

const server = Bun.serve({
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response('Expected a WebSocket upgrade', { status: 426 });
  },
  port: PORT,
  websocket: {
    maxPayloadLength: 64 * 1024, // SDP/ICE are small
    open(socket) {
      const peer: Peer = { id: crypto.randomUUID(), socket, roomCode: null };
      peers.set(socket, peer);
    },

    close(socket) {
      const peer = peers.get(socket);
      if (!peer) return;

      // notify other peer in the room this peer was in
      if (peer.roomCode !== null) {
        const room = rooms.get(peer.roomCode);
        if (room) {
          const other = getOtherPeer(room, peer);
          if (other) {
            send(other.socket, { type: 'peerLeft', payload: { roomCode: room.code, peerId: peer.id } });
            other.roomCode = null;
          }
          rooms.delete(room.code);
        }
      }

      peers.delete(socket);
    },

    message(socket, rawMessage) {
      const peer = peers.get(socket);
      if (!peer) return;

      const message = parseClientMessage(rawMessage.toString());
      if (!message) {
        send(socket, { type: 'error', payload: { code: 'INVALID_MESSAGE', message: 'Invalid message' } });
        return;
      }

      switch (message.type) {
        case 'createRoom': {
          if (peer.roomCode !== null) {
            send(socket, { type: 'error', payload: { code: 'ALREADY_IN_ROOM', message: 'Already in a room' } });
            break;
          }

          const code = generateRoomCode();
          rooms.set(code, { code, initiator: peer, joiner: null, createdAt: Date.now() });
          peer.roomCode = code;
          send(socket, { type: 'roomCreated', payload: { roomCode: code } });
          break;
        }

        case 'joinRoom': {
          if (peer.roomCode !== null) {
            send(socket, { type: 'error', payload: { code: 'ALREADY_IN_ROOM', message: 'Already in a room' } });
            break;
          }

          const room = rooms.get(message.payload.roomCode);

          if (!room) {
            send(socket, { type: 'error', payload: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } });
            break;
          }
          if (room.joiner !== null) {
            send(socket, { type: 'error', payload: { code: 'ROOM_FULL', message: 'Room is full' } });
            break;
          }

          room.joiner = peer;
          peer.roomCode = room.code;

          // tell joiner they're in, tell initiator someone arrived
          send(socket, { type: 'roomJoined', payload: { roomCode: room.code, peerId: peer.id } });
          send(room.initiator.socket, { type: 'peerJoined', payload: { roomCode: room.code, peerId: peer.id } });
          break;
        }

        case 'sdpOffer':
        case 'sdpAnswer':
        case 'iceCandidate': {
          const room = rooms.get(message.payload.roomCode);
          if (!room) {
            break;
          }

          const other = getOtherPeer(room, peer);
          if (!other) {
            break;
          }

          // forward with sender's id attached
          send(other.socket, { ...message, payload: { ...message.payload, from: peer.id } } as ServerMessage);
          break;
        }
      }
    },
  },
});

console.log(`fileshare-server started on ${new Date().toISOString()}: ${server.port}`);
