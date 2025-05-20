const PORT = 4001;

const options = {
	pingInterval: 4000,
	pingTimeout: 8000,
	cors: {
		origin: '*',
	},
};

const io = require('socket.io')(options);

io.on('connection', async (socket) => {
	socket.on('disconnect', async () => {
		const ids = await io.allSockets();
		io.emit('getPeers', Array.from(ids));
	});
	socket.on('getPeers', async () => {
		const ids = await io.allSockets();
		socket.emit('getPeers', Array.from(ids));
	});
	socket.on('chunk', (data) => {
		io.emit('chunk', data);
	});
	socket.on('metadata', (data) => {
		io.emit('metadata', data);
	});
	const ids = await io.allSockets();
	io.emit('getPeers', Array.from(ids));
});

io.listen(PORT);

console.log(`fileshare-server started on ${new Date(Date.now())}: ${PORT}`);
