// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const env = require("dotenv")

const envData = env.config()?.parsed;

if (!envData) {
    throw new Error("ENV data not found")
}

let users = 0;

// Database connections
const con = mysql.createConnection({
    host: envData.DB_SERVER_URL,
    user: envData.DB_USER,
    password: envData.DB_PASSWORD,
    database: envData.PLACE_DB
});

con.connect(err => {
    if (err) throw err;
    console.log("Connected to Place database!");
});

const con2 = mysql.createConnection({
    host: envData.DB_SERVER_URL,
    user: envData.DB_USER,
    password: envData.DB_PASSWORD,
    database: envData.PLACE_DB
});
con2.connect(err => {
    if (err) throw err;
    console.log("Connected to R database!");
});

const counters = [
];

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});


app.use(bodyParser.json()); // Parse JSON bodies

app.use((req, res, next) => {
    const host = req.headers.host;
    const webRoot = "./html/";
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    express.static(path.join(__dirname, webRoot))(req, res, next);
});

// Automatically load all route files in the "routes" directory
const routesPath = path.join(__dirname, 'routes');
fs.readdirSync(routesPath).forEach(file => {
    if (file.endsWith('.js')) {
        const route = require(path.join(routesPath, file));
        const routePath = `/${file.replace('.js', '')}`;
        app.use(routePath, route);
        console.log(`Loaded route: ${routePath}`);
    }
});

io.on('connection', (socket) => {
    const userAgent = socket.handshake.headers['user-agent'] || "UNAVAILABLE";
    
    users += 1;
    io.emit("users", users);
    

    console.log(users);
    console.log('A user connected:', socket.id);

    // Custom event handler
    socket.on('chat message', (msg) => {
        console.log('Message received:', msg);
        io.emit('chat message', msg); // Broadcast message to all clients
    });

    socket.on("type", (type) => {
        if (type == "counter") {
            counters.push(String(socket.id));
            socket.emit("users", users);
        }
    });

    socket.on('placePixel', (msg) => {
        var { x = 0, y = 0, color = "#ffffff", token, canvasIDMsg } = msg;
        var canvasID = "place"

        if (!canvasIDMsg || canvasIDMsg == undefined) {
            if (msg.canvas) {
                canvasID = msg.canvas
            }
        } else {
            canvasID = canvasIDMsg
        }

        console.log('Message received:', msg);

        console.log(canvasID, canvasIDMsg)

        con2.query(`SELECT id FROM tokens WHERE token = '${token}'`, (err, result) => {
            if (result && result[0]) {

                const uid = result[0]["id"];
                console.log(uid)
                con2.query(`SELECT username FROM accounts WHERE id = ${uid}`, (err, result) => {
                    const username = result[0].username;
                    console.log(canvasID)
                    con.query(`SELECT id FROM pixels WHERE x = ${x} AND y = ${y} AND canvasID = '${canvasID}'`, (err, result) => {
                        if (result && result[0]) {
                            con.query(`UPDATE pixels SET color = '${color}', timestamp = CURRENT_TIMESTAMP, userid = ${uid}, useragent = '${userAgent}' WHERE id = ${result[0].id}`);
                            io.emit('placePixel', { x, y, color, userid: uid, canvas: canvasID });
                        } else {
                            con.query(`INSERT INTO pixels (x, y, color, timestamp, userid, useragent, canvasID) VALUES (${x}, ${y}, '${color}', CURRENT_TIMESTAMP, ${uid}, '${userAgent}', '${canvasID}')`);
                            io.emit('placePixel', { x, y, color, userid: uid, canvas: canvasID });
                        }
                    });
                });
            }
        })
    });

    io.emit("users", users);
});

// Start the server
const PORT = process.env.PORT || 1234;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
