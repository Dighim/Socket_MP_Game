var http = require('http');
var fs = require('fs');
var path = require('path');
var id = 1;

// Chargement du fichier index.html affiché au client
var server = http.createServer(function (req, res) {
    var fileStream;
    var resourcePath;
    if (req.url === "/") {
        fs.readFile('./index.html', 'utf-8', function (error, content) {
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(content);
        });
    } else if (req.url.match("\.css$")) {
        resourcePath = path.join(__dirname, req.url);
        fileStream = fs.createReadStream(resourcePath, "UTF-8");
        res.writeHead(200, {"Content-Type": "text/css"});
        fileStream.pipe(res);
    } else if (req.url.match("\.png$")) {
        resourcePath = path.join(__dirname, req.url);
        fileStream = fs.createReadStream(resourcePath);
        res.writeHead(200, {"Content-Type": "image/png"});
        fileStream.pipe(res);
    } else if (req.url.match("\.js$")) {
        resourcePath = path.join(__dirname, req.url);
        fileStream = fs.createReadStream(resourcePath, "UTF-8");
        res.writeHead(200, {"Content-Type": "application/javascript"});
        fileStream.pipe(res);
    } else {
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end("No Page Found");
    }
});

// Chargement de socket.io
var io = require('socket.io').listen(server);

var players = {};
var inputs = [];

var SPEED = 150;
var WORLD = {
    width: 500,
    height: 500
};
var SQUARESIZE = 50;

// Quand un client se connecte, on le note dans la console
io.sockets.on('connection', function (socket) {
    console.log('Un client est connecté !');

    socket.on('disconnect', function () {
        delete players[socket.id];
        console.log('Un client s\'est déconnecté !');
    });

    socket.on('player_update', function (input) {
        input.id = socket.id;
        inputs.push(input);
    });

    players[socket.id] = {
        x: Math.round(Math.random() * (WORLD.width - SQUARESIZE)),
        y: Math.round(Math.random() * (WORLD.height - SQUARESIZE))
    };

    setInterval(function () {
        simulateWorld();
    }, 300);
});

function simulateWorld() {
    for(var playerId in players){
        if(players.hasOwnProperty(playerId)){
            players[playerId].oldX = players[playerId].x;
            players[playerId].oldY = players[playerId].y;
        }
    }
    for(var idx = 0; idx < inputs.length; idx++){
        var input = inputs[idx];
        var player = players[input.id];
        player.x += input.vx * SPEED * input.elapsedTime;
        player.y += input.vy * SPEED * input.elapsedTime;
    }
    io.sockets.emit("game_update", {timestamp: Date.now(), players: players, inputs: inputs});
    inputs = [];
}

server.listen(8080, "0.0.0.0");

console.log("Server created on localhost:8080")