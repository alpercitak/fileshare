import type { ServerWebSocket } from 'bun';
import type { ClientMessage, PeerId, RoomCode, ServerMessage } from '@fileshare/shared';

const PORT = 4001;
const ROOM_TTL_MS = 10 * 60 * 1000; // 10 minutes

type Peer = {
  id: PeerId;
  socket: ServerWebSocket;
};

type Room = {
  code: RoomCode;
  initiator: Peer;
  joiner: Peer | null;
  createdAt: number;
};

const peers = new Map<ServerWebSocket, Peer>();
const rooms = new Map<RoomCode, Room>();

// ── helpers ─────────────────────────────────────────────────

const send = (socket: ServerWebSocket, message: ServerMessage) => {
  socket.send(JSON.stringify(message));
};

const generateRoomCode = (): RoomCode => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
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
    open(socket) {
      const peer: Peer = { id: crypto.randomUUID(), socket };
      peers.set(socket, peer);
    },

    close(socket) {
      const peer = peers.get(socket);
      if (!peer) return;

      // notify other peer in any room this peer was in
      for (const [code, room] of rooms) {
        const other = getOtherPeer(room, peer);
        if (other) {
          send(other.socket, { type: 'peerLeft', payload: { roomCode: code, peerId: peer.id } });
        }
        if (room.initiator.id === peer.id || room.joiner?.id === peer.id) {
          rooms.delete(code);
        }
      }

      peers.delete(socket);
    },

    message(socket, rawMessage) {
      const peer = peers.get(socket);
      if (!peer) return;

      const message = JSON.parse(rawMessage.toString()) as ClientMessage;

      switch (message.type) {
        case 'createRoom': {
          const code = generateRoomCode();
          rooms.set(code, { code, initiator: peer, joiner: null, createdAt: Date.now() });
          send(socket, { type: 'roomCreated', payload: { roomCode: code } });
          break;
        }

        case 'joinRoom': {
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
