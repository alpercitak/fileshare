const express = require('express');
const http = require('http');
const path = require("path");

const config = {
    port: process.env.PORT || 4001
};

const app = express();
const httpServer = http.createServer(app);

// init websocket server
(() => {
    const options = {pingInterval: 4000, pingTimeout: 8000};
    const io = require('socket.io')(httpServer, options);

    io.on("connection", async (socket) => {
        socket.on("disconnect", async (reason) => {
            const ids = await io.allSockets();
            io.emit("getPeers", Array.from(ids));
        });
        socket.on("getPeers", async () => {
            const ids = await io.allSockets();
            socket.emit("getPeers", Array.from(ids));
        });

        socket.on("chunk", (data) => {
            io.emit("chunk", data);
        });

        socket.on("metadata", (data) => {
            io.emit("metadata", data);
        });

        const ids = await io.allSockets();
        io.emit("getPeers", Array.from(ids));
    });

    console.log('fileshare websocket-server started on %s:%d', new Date(Date.now()), config.port);
})();

// init http server
(() => {
    app.set("view engine", "pug");
    app.set("views", path.join(__dirname, "/views"));
    app.use(express.static("public"));

    app.get("/", async (req, res) => {
        return res.render("home.pug");
    });

    httpServer.timeout = 0;
    httpServer.listen(config.port);

    console.log('fileshare http-server started on %s:%d', new Date(Date.now()), config.port);
})();