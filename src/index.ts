/*
    DiepCustom - custom tank game server that shares diep.io's WebSocket protocol
    Copyright (C) 2022 ABCxFF (github.com/ABCxFF)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program. If not, see <https://www.gnu.org/licenses/>
*/

import * as http from "http";
import * as fs from "fs";
import * as WebSocket from "ws";
import * as config from "./config"
import * as util from "./util";
import GameServer from "./Game";
import TankDefinitions from "./Const/TankDefinitions";
import { commandDefinitions } from "./Const/Commands";

const PORT = config.serverPort;
const ENABLE_API = config.enableApi && config.apiLocation;
const ENABLE_CLIENT = config.enableClient && config.clientLocation && fs.existsSync(config.clientLocation);

if (ENABLE_API) util.log(`Rest API hosting is enabled and is now being hosted at /${config.apiLocation}`);
if (ENABLE_CLIENT) util.log(`Client hosting is enabled and is now being hosted from ${config.clientLocation}`);

const games: GameServer[] = [];

const count = {
    diepcustom: 0,
    mohsen: 0
};

const server = http.createServer( (req, res) => {
    util.saveToVLog("Incoming request to " + req.url);

    if (ENABLE_API && req.url?.startsWith(`/${config.apiLocation}`)) {
        switch (req.url.slice(config.apiLocation.length + 1)) {
            case "/":
                res.writeHead(200);
                return res.end();
            case "/tanks":
                res.writeHead(200);
                return res.end(JSON.stringify(TankDefinitions));
            case "/servers":
                res.writeHead(200);
                return res.end(JSON.stringify(games.map(({ gamemode, name }) => ({ gamemode, name }))));
            case "/commands":
                res.writeHead(200);
                return res.end(JSON.stringify(config.enableCommands ? Object.values(commandDefinitions) : []));
            case "/counter":
                res.writeHead(200);
                return res.end(JSON.stringify(count));
        }
    }

    if (ENABLE_CLIENT) {
        let file: string | null = null;
        let contentType = "text/html"
        switch (req.url) {
            case "/":
                ++count.mohsen;
                file = config.clientLocation + "/index.html";
                contentType = "text/html";
                break;
            case "/0":
                ++count.diepcustom;
                file = config.clientLocation + "/index.html";
                contentType = "text/html";
                break;
            case "/loader.js":
                file = config.clientLocation + "/loader.js";
                contentType = "application/javascript";
                break;
            case "/input.js":
                file = config.clientLocation + "/input.js";
                contentType = "application/javascript";
                break;
            case "/dma.js":
                file = config.clientLocation + "/dma.js";
                contentType = "application/javascript";
                break;
            case "/config.js":
                file = config.clientLocation + "/config.js";
                contentType = "application/javascript";
                break;
        }

        res.setHeader("Content-Type", contentType + "; charset=utf-8");

        if (file && fs.existsSync(file)) {
            res.writeHead(200);
            return res.end(fs.readFileSync(file));
        }

        res.writeHead(404);
        return res.end(fs.readFileSync(config.clientLocation + "/404.html"));
    } 
});

const wss = new WebSocket.Server({
    server,
    maxPayload: config.wssMaxMessageSize,
});

const endpointMatch = /\/game\/diepio-.+/;
// We are override this to allow for checking gamemodes
wss.shouldHandle = function(request: http.IncomingMessage) {
    const url = (request.url || "/");

    if (url.length > 100) return false;

    return endpointMatch.test(url);
}

interface Analytics {
    clients: number,
    clientsDiff: number,
    ais: number,
    aisDiff: number,
    zIndex: number,
    zIndexDiff: number,
    tps: number,
    tpsRatio: number,
    tick: number,
    uptime: number,
    resusage: NodeJS.ResourceUsage,
    cpuusage: NodeJS.CpuUsage,
    memusage: NodeJS.MemoryUsage
}

server.listen(PORT, () => {
    util.log(`Listening on port ${PORT}`);

    // RULES(0): No two game servers should share the same endpoint
    //
    // NOTES(0): As of now, both servers run on the same process (and thread) here
    const gameserver = new GameServer(wss, "ffa", "Annihilation");

    games.push(gameserver);
    


    const analytics: Analytics[] = [];

    let lastTick = 0;
    let lastClientCount = 0;
    let lastAiCount = 0;
    let lastzIndex = 0;
    
    setInterval(() => {
        let tps = gameserver.tick - lastTick;
        if(tps && tps < config.tps * 0.8) {
            console.log("critical tps, logging, tps:", tps);
            analytics.push({
                clients: gameserver.clients.size,
                clientsDiff: gameserver.clients.size - lastClientCount,
                ais: gameserver.entities.AIs.length,
                aisDiff: gameserver.entities.AIs.length - lastAiCount,
                zIndex: gameserver.entities.zIndex,
                zIndexDiff: gameserver.entities.zIndex - lastzIndex,
                tps,
                tpsRatio: tps / config.tps, 
                tick: gameserver.tick,
                uptime: process.uptime(),
                resusage: process.resourceUsage(),
                cpuusage: process.cpuUsage(),
                memusage: process.memoryUsage()
            })
            fs.writeFileSync("./analytics.json", JSON.stringify(analytics));
        }
        lastTick = gameserver.tick;
        lastClientCount = gameserver.clients.size;
        lastAiCount = gameserver.entities.AIs.length;
        lastzIndex = gameserver.entities.zIndex;
    }, 1000);

    util.saveToLog("Servers up", "All servers booted up.", 0x37F554);
    util.log("Dumping endpoint -> gamemode routing table");
    for (const game of games) console.log("> " + `localhost:${config.serverPort}/game/diepio-${game.gamemode}`.padEnd(40, " ") + " -> " + game.name);
});

process.on("uncaughtException", (error) => {
    util.saveToLog("Uncaught Exception", '```\n' + error.stack + '\n```', 0xFF0000);

    throw error;
});
