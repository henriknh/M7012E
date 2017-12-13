var socket = io.connect('ws://localhost:'+ws_port+'/screen');

socket.on('connect', function() {
    console.log('connect');
});

socket.on('disconnect', function() {
    console.log('disconnect');
});

socket.on('lobbystate', function(lobbystate) {
    lobbystate = JSON.parse(lobbystate);
    if(lobbystate == "lobby") {
        document.getElementById('lobby').style.display='block';
        document.getElementById('game').style.display='none';
        document.getElementById('loading').style.display='none';
        document.getElementById('gameover').style.display='none';
    } else if (lobbystate == "game") {
        document.getElementById('lobby').style.display='none';
        document.getElementById('game').style.display='block';
        document.getElementById('loading').style.display='none';
        document.getElementById('gameover').style.display='none';
    } else if (lobbystate == "loading") {

        // Clear eventual prevous games
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        board.innerHtml = "";
        while (board.firstChild) {
            board.removeChild(board.firstChild);
        }


        document.getElementById('lobby').style.display='none';
        document.getElementById('game').style.display='none';
        document.getElementById('loading').style.display='block';
        document.getElementById('gameover').style.display='none';
    } else if (lobbystate == "gameover") {
        document.getElementById('lobby').style.display='none';
        document.getElementById('game').style.display='none';
        document.getElementById('loading').style.display='none';
        document.getElementById('gameover').style.display='block';

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
    }

    document.getElementById('loadingtips').innerHTML="";
    gameState = {};
    lastGameState = {};
});

socket.on('loadingtips', function(loadingtips) {
    loadingtips = JSON.parse(loadingtips);
    document.getElementById('loadingtips').innerHTML=loadingtips.message;
});

window.onload = function(e){
    canvasResize();
    renderLoop();
};

window.onresize = function(e) {
    canvasResize();
};

var canvas;
var board;
var ctx;
var canvasWidth;
var canvasHeight;
var canvasOffsetX;
var canvasOffsetY;
var objectScaling;
function canvasResize() {
    canvas = document.getElementById("gameBoard");
    board = document.getElementById('htmlGameBoard');
    ctx = canvas.getContext("2d");
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    ctx.canvas.width  = canvasWidth;
    ctx.canvas.height = canvasHeight;
    canvasOffsetX = canvasWidth*0.25;
    canvasOffsetY = canvasHeight*0.6;
    objectScaling = (canvasWidth+canvasHeight)/2/100;
}

var gameState = {};
var lastGameState = {};
var gameStateTick = 0;

socket.on('gamestate', function(gameStateIn) {
    gameStateTick = window.performance.now();
    lastGameState = gameState;
    gameState = JSON.parse(gameStateIn);
});

var fps = 30;
var ticks = 0;
var lastTick = 0;

function renderLoop() {
    ticks++;

    let nowTick = window.performance.now();
    let deltaTime = nowTick - lastTick;
    lastTick = nowTick;

    if(gameState.game == 'space') {

        canvas.style.display = 'block';
        board.style.display = 'none';

        if(typeof gameState !== 'undefined' && typeof lastGameState !== 'undefined') {
            if(Object.keys(gameState).length !== 0 && gameState.constructor === Object && Object.keys(lastGameState).length !== 0 && lastGameState.constructor === Object) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                let timeSinceLastGameStatus = (window.performance.now() - gameStateTick)/ 1000;
                deltaTimeGameState = gameState.timestamp - lastGameState.timestamp;

                // Background
                if(gameState.hasOwnProperty('background')) {
                    ctx.fillStyle=gameState.background.color;
                    ctx.fillRect(0,0,canvasWidth,canvasHeight);
                }

                // Players
                if(gameState.hasOwnProperty('players')) {
                    gameState.players.forEach(function (player, index) {
                        if(lastGameState.players[index] && !player.dead) {
                            let pos = calcObjectPostion(gameState.players[index], lastGameState.players[index], deltaTimeGameState, timeSinceLastGameStatus);
                            drawSpaceship(pos, gameState.players[index]);
                        }
                    });
                }

                // Obstacles
                if(gameState.hasOwnProperty('asteroids')) {
                    gameState.asteroids.forEach(function (asteroid, index) {
                        if(lastGameState.asteroids[index] && !asteroid.dead) {
                            let pos = calcObjectPostion(gameState.asteroids[index], lastGameState.asteroids[index], deltaTimeGameState, timeSinceLastGameStatus);
                            drawAsteroid(pos, gameState.asteroids[index]);
                        }
                    });
                }

                // Stars
                if(gameState.hasOwnProperty('stars')) {
                    gameState.stars.forEach(function (obstacle, index) {
                        if(lastGameState.stars[index] && !obstacle.dead) {
                            let pos = calcObjectPostion(gameState.stars[index], lastGameState.stars[index], deltaTimeGameState, timeSinceLastGameStatus);
                            drawStars(pos, gameState.stars[index]);
                        }
                    });
                }
            }
        }
    }

    if(gameState.game == 'quiz' && gameState.questions_done >= 0) {

        canvas.style.display = 'none';
        board.style.display = 'block';

        board.innerHtml = "";
        while (board.firstChild) {
            board.removeChild(board.firstChild);
        }

        var question_progress = document.createElement('div');
        question_progress.className = 'question_progress';
        question_progress.innerHTML = (gameState.questions_done+1)+' / '+gameState.total_questions;
        board.appendChild(question_progress);

        var question = document.createElement('div');
        question.className = 'question';
        question.innerHTML = gameState.question.question;
        board.appendChild(question);

        if(gameState.state == 'answer') {
            var answer = document.createElement('div');
            answer.className = 'answer';
            answer.innerHTML = gameState.question.alternatives[gameState.question.correct];
            board.appendChild(answer);

            /*if(gameState.question.hasOwnProperty('funfact')) {
                var funfact = document.createElement('div');
                funfact.className = 'funfact';
                funfact.innerHTML = gameState.question.funfact;
                board.appendChild(funfact);
            }*/
        } else {
            var quiz_countdown = document.createElement('div');
            quiz_countdown.className = 'answer';
            quiz_countdown.innerHTML = parseInt(gameState.countdown);
            board.appendChild(quiz_countdown);
        }

        var score = document.createElement('div');
        score.className = 'score';

        gameState.players.forEach(function(player) {
            var playerScore = document.createElement('div');
            playerScore.className = 'player';
            playerScore.innerHTML = player.score;
            if(player.score > 99) {
                playerScore.style.fontSize = "4em";
            }
            if(player.score > 999) {
                playerScore.style.fontSize = "3em";
            }
            playerScore.style.backgroundColor = player.color;
            score.appendChild(playerScore);
        });

        board.appendChild(score);
    }

    //window.requestAnimationFrame(renderLoop);
    window.setTimeout(renderLoop, 1000 / fps);
}

function calcObjectPostion(state1, state2, deltaTimeGameState, timeSinceLastGameStatus) {
    let deltaXGameState = state1.x - state2.x;
    let deltaXPerSecond = deltaXGameState / deltaTimeGameState;
    let deltaX = deltaXPerSecond * timeSinceLastGameStatus;

    let deltaYGameState = state1.y - state2.y;
    let deltaYPerSecond = deltaYGameState / deltaTimeGameState;
    let deltaY = deltaYPerSecond * timeSinceLastGameStatus;

    return {x: (state1.x+deltaX)*canvasWidth*0.01, y: (state1.y+deltaY)*canvasHeight*0.01};
}

function drawSpaceship(pos, state) {
    ctx.fillStyle=state.color;
    ctx.beginPath();
    ctx.moveTo(pos.x-canvasWidth*0.01*state.width/2, pos.y-canvasHeight*0.01*state.height/2);
    ctx.lineTo(pos.x-canvasWidth*0.01*state.width/2, pos.y+canvasHeight*0.01*state.height/2);
    ctx.lineTo(pos.x+canvasWidth*0.01*state.width/2, pos.y+canvasHeight*0.01*state.height/2);
    ctx.lineTo(pos.x+canvasWidth*0.01*state.width/2, pos.y-canvasHeight*0.01*state.height/2);
    /*ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x-canvasWidth*0.01*state.width/2, pos.y+canvasHeight*0.01*state.height);
    ctx.lineTo(pos.x+canvasWidth*0.01*state.width/2, pos.y+canvasHeight*0.01*state.height);*/
    ctx.fill();
}

function drawAsteroid(pos, state) {
    ctx.fillStyle=state.color;
    ctx.beginPath();
    ctx.moveTo(pos.x-canvasWidth*0.01*state.width/2, pos.y-canvasHeight*0.01*state.height/2);
    ctx.lineTo(pos.x-canvasWidth*0.01*state.width/2, pos.y+canvasHeight*0.01*state.height/2);
    ctx.lineTo(pos.x+canvasWidth*0.01*state.width/2, pos.y+canvasHeight*0.01*state.height/2);
    ctx.lineTo(pos.x+canvasWidth*0.01*state.width/2, pos.y-canvasHeight*0.01*state.height/2);
    /*ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x-canvasWidth*0.01*state.width/2, pos.y+canvasHeight*0.01*state.height/2);
    ctx.lineTo(pos.x, pos.y+canvasHeight*0.01*state.height);
    ctx.lineTo(pos.x+canvasWidth*0.01*state.width/2, pos.y+canvasHeight*0.01*state.height/2);*/
    ctx.fill();
}

function drawStars(pos, state) {
    ctx.fillStyle=state.color;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y-canvasHeight*0.01*state.height/2);
    ctx.lineTo(pos.x-canvasWidth*0.01*state.width/2, pos.y);
    ctx.lineTo(pos.x, pos.y+canvasHeight*0.01*state.height/2);
    ctx.lineTo(pos.x+canvasWidth*0.01*state.width/2, pos.y);
    ctx.fill();
}

socket.on('queue_updated', function(queue) {
    let json = JSON.parse(queue);

    let html = '';
    for(let item of json) {
        html += '<p>'+item+'</p>';
    }

    document.getElementById("queue").innerHTML = "There are "+ json.length +" in queue...";
});

var startPing, stopPing;
function ping() {
    startPing = window.performance.now();
    socket.emit('ping', {});
}

setInterval(function(){
    ping();
}, 1000);

socket.on('ping', function(data) {
    stopPing = window.performance.now();
    console.log((stopPing-startPing).toFixed(2)+ ' ms\n#'+ticks+' render updates');
    ticks = 0;
});


socket.on('countdown', function(countdown) {
    if (countdown < 4 && countdown >= 0) {
        document.getElementById("countdown").className = 'animated infinite zoomInDown';
    }

    if(countdown < 0) {
        document.getElementById("countdown").style.display = 'none';
        return;
    }
    if(countdown == 0) {
        countdown = "Go!";
        setTimeout(function(){
            document.getElementById("countdown").style.display = 'none';
        }, 1000);
    }

    document.getElementById("countdown").style.display = 'block';
    document.getElementById("countdown").innerHTML = countdown;
});

socket.on('gameover', function(gameState) {
  // Tar lista: [[alla spelare], [spelarnas poäng]]
  var gameState = JSON.parse(gameState);

  colors = ['#EE82EE', '#90EE90', '#87CEFA', '#FF4500'];

  var symbol = "&#x25B2";

  var players = gameState['players'];
  var tmp = [["p1","p2"], [24, 25]];

  // table
  var table = document.createElement('table');
  table.setAttribute("id", "scoreTable");
  table.style.fontSize = "4pc";
  //table.style.border = "1px solid black";

  for (var player = 0; player < players.length; player++) { // Row for each player
    var tr = document.createElement('tr'); // rad


    // player (name)
    var td = document.createElement('td'); // cell
    tr.appendChild(td);
    td.innerHTML = symbol;
    td.style.color = players[player]['color'];
    //td.style.border = "1px solid black";
    td.style.width = "10%";

    // player (score)
    td = document.createElement('td'); // cell
    tr.appendChild(td);
    td.innerHTML = players[player]['score'];
    //td.style.color = players[player]['color'];
    //td.style.border = "1px solid black";


    table.appendChild(tr);
  }

  table.style.width="100%";
  document.getElementById('score').appendChild(table);
  document.getElementById('gameover').style.display='block';
});