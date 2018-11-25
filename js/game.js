var DIRECTIONS = [{code: 'S'.charCodeAt(0), dir: {x: 0, y: 1}}, {
    code: 'Z'.charCodeAt(0),
    dir: {x: 0, y: -1}
}, {code: 'D'.charCodeAt(0), dir: {x: 1, y: 0}}, {code: 'Q'.charCodeAt(0), dir: {x: -1, y: 0}}]

var player;

var otherPlayers;

var SQUARESIZE = 50;

var SPEED = 150;

var keyPressed = [];

var inputs = [];
var otherInputs = [];

var inputId = 1;

var TIMEBEFOREUPDATE = 0.3;

var canvas;
var ctx;

var socket = io.connect('51.38.234.106:8080');
//var socket = io.connect('localhost:8080');

socket.on('new_player', function (data) {
    if (otherPlayers) {
        otherPlayers[data.id] = data.player;
    }
});

socket.on('del_player', function (data) {
    if (otherPlayers) {
        delete otherPlayers[data.id];
    }
});

socket.on('game_update', function (data) {
    var myPlayer = data.players[socket.id];
    if (myPlayer !== undefined && player === undefined) {
        player = {
            x: myPlayer.x,
            y: myPlayer.y,
            vx: 0,
            vy: 0
        };
        requestAnimationFrame(function () {
            mainLoop(Date.now());
        });
    } else if (data.players.length !== 0) {
        var inputProcessed = data.inputs.filter(function (input) {
            return input.id === socket.id;
        });
        inputs = inputs.slice(inputProcessed.length);
        var self = myPlayer;
        player.x = self.x;
        player.y = self.y;
        var added = {x: 0, y: 0};
        for (var idx = 0; idx < inputs.length; idx++) {
            var input = inputs[idx];
            added.x += input.vx * SPEED * input.elapsedTime;
            added.y += input.vy * SPEED * input.elapsedTime;
        }
        player.x += added.x;
        player.y += added.y;
    }

    if (!otherPlayers) {
        otherPlayers = data.players;
        delete otherPlayers[socket.id];
    } else {
        for (var playerId in otherPlayers) {
            if (otherPlayers.hasOwnProperty(playerId)) {
                var currentPlayer = data.players[playerId];
                if (currentPlayer) {
                    otherPlayers[playerId].x = currentPlayer.oldX;
                    otherPlayers[playerId].y = currentPlayer.oldY;
                    var playerInputs = data.inputs.filter(function (input) {
                        return input.id === playerId;
                    });
                    processInput(playerInputs);
                }
            }
        }
    }
});

function processInput(inputs) {
    if (inputs.length !== 0) {
        var currentPlayer = otherPlayers[inputs[0].id];
        var input = inputs[0];
        if (currentPlayer) {
            currentPlayer.x += input.vx * input.elapsedTime * SPEED;
            currentPlayer.y += input.vy * input.elapsedTime * SPEED;
        }
        processInput(inputs.slice(1));
    }
}

$(document).ready(function () {
        canvas = $('canvas')[0];

        ctx = canvas.getContext('2d');

        $(document).on('keydown', function (ev) {
            if (!keyPressed.includes(ev.which))
                keyPressed.push(ev.which);
        });

        $(document).on('keyup', function (ev) {
            var idx = keyPressed.indexOf(ev.which);
            if (idx !== -1)
                keyPressed.splice(idx, 1);
        });
    }
);

function mainLoop(time) {
    var elapsedTime = (Date.now() - time) / 1000;

    if (elapsedTime >= 7 / 1000) {
        time = Date.now();
        player.vx = 0;
        player.vy = 0;
        for (var idx = 0; idx < DIRECTIONS.length; idx++) {
            var direction = DIRECTIONS[idx];
            if (keyPressed.includes(direction.code)) {
                player.vx += direction.dir.x;
                player.vy += direction.dir.y;
            }
        }

        if (player.vx !== 0 || player.vy !== 0) {
            player.x += player.vx * SPEED * elapsedTime;
            player.y += player.vy * SPEED * elapsedTime;

            var input = {elapsedTime: elapsedTime, inputId: inputId++, vx: player.vx, vy: player.vy};
            inputs.push(input);
            socket.emit('player_update', input);
        }
    }
    drawAll();

    requestAnimationFrame(function () {
        mainLoop(time);
    });
}

function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(player.x, player.y, SQUARESIZE, SQUARESIZE);
    for (var playerId in otherPlayers) {
        if (otherPlayers.hasOwnProperty(playerId)) {
            var currentPlayer = otherPlayers[playerId];
            ctx.fillRect(currentPlayer.x, currentPlayer.y, SQUARESIZE, SQUARESIZE);
        }
    }
}