import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { GameRoom } from "./rooms/GameRoom";

import path from "path";

const port = Number(process.env.PORT || 4001);
const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from the client build directory
app.use(express.static(path.join(__dirname, "..", "client", "dist")));

const gameServer = new Server({
    server: createServer(app),
});

gameServer.define("game_room", GameRoom);

gameServer.listen(port);
console.log(`Listening on ws://localhost:${port}`);
console.log(`Serving client on http://localhost:${port}`);
