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

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "/views"));
app.use(express.static("public"));

app.use(async (req, res, next) => {
    res.locals.TITLE = config.title;
    res.locals.SOCKET_PROTOCOL = process.env.SOCKET_PROTOCOL;
    res.locals.SOCKET_HOST = process.env.SOCKET_HOST;
    return next();
});
app.get("/", async (req, res) => {
    return res.render("home.pug");
});

httpServer.timeout = 0;
httpServer.listen(config.http.port);

console.log(`${config.name} http-server started on ${new Date(Date.now())}:${config.http.port}`);