import type { ServerWebSocket } from 'bun';
import type { ClientMessage, PeerId, ServerMessage } from '@fileshare/shared';

const PORT = 4001;

const clients = new Map<ServerWebSocket<unknown>, PeerId>();

const send = (socket: ServerWebSocket<unknown>, message: ServerMessage) => {
  socket.send(JSON.stringify(message));
};

const emitPeers = (socket?: ServerWebSocket<unknown>) => {
  const peers = Array.from(clients.values());
  const message: ServerMessage = {
    payload: peers,
    type: 'peers',
  };

  if (socket) {
    send(socket, message);
    return;
  }

  for (const client of clients.keys()) {
    send(client, message);
  }
};

const server = Bun.serve({
  fetch(req, server) {
    if (server.upgrade(req)) {
      return;
    }

    return new Response('Expected a WebSocket upgrade', { status: 426 });
  },
  port: PORT,
  websocket: {
    close(socket) {
      clients.delete(socket);
      emitPeers();
    },
    message(socket, rawMessage) {
      const message = JSON.parse(rawMessage.toString()) as ClientMessage;

      switch (message.type) {
        case 'getPeers':
          emitPeers(socket);
          break;
        case 'metadata':
          for (const client of clients.keys()) {
            send(client, { payload: message.payload, type: 'metadata' });
          }
          break;
        case 'chunk':
          for (const client of clients.keys()) {
            send(client, { payload: message.payload, type: 'chunk' });
          }
          break;
      }
    },
    open(socket) {
      clients.set(socket, crypto.randomUUID());
      emitPeers();
    },
  },
});

console.log(`fileshare-server started on ${new Date().toISOString()}: ${server.port}`);
