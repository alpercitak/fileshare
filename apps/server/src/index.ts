import { Server, type Socket } from 'socket.io';

const PORT = 4001;

const io = new Server({
  pingInterval: 4000,
  pingTimeout: 8000,
  cors: {
    origin: '*',
  },
});

const emitPeers = async (socket?: Socket) => {
  const ids = Array.from(await io.allSockets());

  if (socket) {
    socket.emit('getPeers', ids);
    return;
  }

  io.emit('getPeers', ids);
};

io.on('connection', (socket) => {
  socket.on('disconnect', async () => {
    await emitPeers();
  });

  socket.on('getPeers', async () => {
    await emitPeers(socket);
  });

  socket.on('chunk', (data) => {
    io.emit('chunk', data);
  });

  socket.on('metadata', (data) => {
    io.emit('metadata', data);
  });

  void emitPeers();
});

io.listen(PORT);

console.log(`fileshare-server started on ${new Date().toISOString()}: ${PORT}`);
