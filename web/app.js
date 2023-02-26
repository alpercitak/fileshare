const express = require("express");
const http = require("http");
const path = require("path");

const PORT = 4002;

const app = express();
const httpServer = http.createServer(app);

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "/views"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", async (req, res) => {
	return res.render("home.pug");
});

httpServer.timeout = 0;
httpServer.listen(PORT);

console.log(`fileshare-client started on ${new Date(Date.now())}: ${PORT}`);
