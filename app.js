require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require("path");

const config = {
    "dirname": __dirname,
    "name": process.env.NAME,
    "title": process.env.NAME_READABLE,
    "http": {
        port: process.env.PORT
    }
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

    console.log(`${config.name} websocket-server started on ${new Date(Date.now())}:${config.http.port}`);
})();

// init http server
(() => {
    app.set("view engine", "pug");
    app.set("views", path.join(__dirname, "/views"));
    app.use(express.static("public"));

    app.use(async (req, res, next) => {
        res.locals.title = config.title;
        return next();
    });
    app.get("/", async (req, res) => {
        return res.render("home.pug");
    });

    httpServer.timeout = 0;
    httpServer.listen(config.http.port);

    console.log(`${config.name} http-server started on ${new Date(Date.now())}:${config.http.port}`);
})();