var curr_x;
var curr_y;
var socket;

var player;

var game_players = {};
var game_asteroids = [];
var game_bullets = {};

var npcs = [];
var gameover;

var crash = false;
var timer;

var player_state;
var curr_bullet;
let spaceship;
let opp_spaceship;

let MAX_HEALTH = 4;
let RECT_WIDTH = 80;

class Player {
  constructor(x, y, h) {
    this.h = h;
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
  }

  update() {
    if (curr_x != -1 && curr_y != -1) {
      var direction = createVector(curr_x - width / 2, curr_y - height / 2);
      direction.setMag(2);
      this.vel.lerp(direction, 0.1);
      this.pos.add(this.vel);
      this.constrain();
    }
  }

  slowdown() {
    var valcpy = createVector(this.vel.x, this.vel.y);
    var slowvel = valcpy.setMag(1);
    this.pos.add(slowvel);
    this.constrain();
  }

  check_if_bullet_hits(x, y, other_player) {
    var d = dist(x, y, other_player.x, other_player.y);
    if (d <= 30) {
      return true;
    } else {
      return false;
    }
  }

  check_if_crashes(ast) {
    var xd = dist(this.pos.x, this.pos.y, ast.x, ast.y);
    if (xd <= ast.r + 15) {
      return true;
    } else {
      return false;
    }
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());
    translate(-this.pos.x, -this.pos.y);
    imageMode(CENTER);
    image(spaceship, this.pos.x, this.pos.y, 50, 50);
    pop();
  }

  constrain() {
    if (this.pos.x < -width * 1.5) {
      this.pos.x = -width * 1.5;
    } else if (this.pos.x > width * 1.5) {
      this.pos.x = width * 1.5;
    } else if (this.pos.y > height * 1.5) {
      this.pos.y = height * 1.5;
    } else if (this.pos.y < -height * 1.5) {
      this.pos.y = -height * 1.5;
    }
  }
}

class Opponent {
  constructor(x, y, h, dirx, diry) {
    this.h = h;
    this.x = x;
    this.y = y;
    this.vel = createVector(dirx, diry);
  }

  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.vel.heading());
    translate(-this.x, -this.y);
    imageMode(CENTER);
    image(opp_spaceship, this.x, this.y, 50, 50);
    pop();
  }
}

function preload() {
  opp_spaceship = loadImage("assests/op.png");
  spaceship = loadImage("assests/spaceship.png");
}

function setup() {
  createCanvas(800, 800);
  frameRate(30);
  player = new Player(random(-200, 200), random(-200, 200), 4);

  curr_x = -1;
  curr_y = -1;
  gameover = false;

  player_state = {
    x: player.pos.x,
    y: player.pos.y,
    dirx: player.vel.x,
    diry: player.vel.y,
    timestamp: new Date().getTime(),
  };

  curr_bullet = 0;

  print(player_state.timestamp);

  socket = io.connect("http://localhost:5000");

  socket.emit("register_player_state", player_state);

  socket.on("update_game_players", (data) => {
    game_players = data;
  });

  socket.on("update_game_bullets", (data) => {
    game_bullets = data;
    for (var key of Object.keys(game_players)) {
      if (key != socket.id) {
        op = game_players[key];
        if (socket.id in game_bullets) {
          for (var i of game_bullets[socket.id]) {
            hit = player.check_if_bullet_hits(i.x, i.y, op);
            if (hit) {
              console.log("bullet hit event");
              socket.emit("bullet_hit", {
                who: key,
                which: i,
                when: new Date().getTime(),
              });
            }
          }
        }
      }
    }
  });

  socket.emit("get_asteroids");

  socket.on("update_asteroids", (data) => {
    console.log("updating asteroids");
    game_asteroids = data;
  });

  socket.on("gameover", () => {
    gameover = true;
  });
}

function draw() {
  background(0, 0, 40);
  fill(255);
  if (!gameover) {
    textSize(15);
    text("Health", 10, 30);

    fill(255, 200, 0);
    if (socket.id in game_players) {
      drawWidth = (game_players[socket.id].h / MAX_HEALTH) * RECT_WIDTH;
    } else {
      drawWidth = (MAX_HEALTH / MAX_HEALTH) * RECT_WIDTH;
    }
    rect(70, 15, drawWidth, 20);
    //translate the player's og pos to the center
    translate(width / 2, height / 2);
    // translate the player's origin to the center of the screen
    translate(-player.pos.x, -player.pos.y);

    for (var i = game_asteroids.length - 1; i >= 0; i--) {
      ast = game_asteroids[i];
      fill(255);
      ellipse(ast.x, ast.y, ast.r, ast.r);
      if (player.check_if_crashes(ast)) {
        console.log("crashed into asteroid");
        socket.emit("asteroid_crash", ast);
        crash = true;
        timer = parseInt(ast.r / 4);
      }
    }

    // draw the opponent
    for (var key of Object.keys(game_players)) {
      if (key != socket.id) {
        op = new Opponent(
          game_players[key].x,
          game_players[key].y,
          game_players[key].h,
          game_players[key].dirx,
          game_players[key].diry
        );
        op.draw();
      }
    }

    // draw the bullets on the screen
    for (var key of Object.keys(game_bullets)) {
      for (var i of game_bullets[key]) {
        if (key != socket.id) {
          fill(255, 0, 0);
          ellipse(i.x, i.y, 10, 10);
        } else {
          fill(0, 255, 0);
          ellipse(i.x, i.y, 10, 10);
        }
      }
    }

    // update players position
    if (mouseDragged && !crash) {
      player.update();
    }

    if (crash) {
      player.slowdown();
      if (frameCount % 20 == 0 && timer > 0) {
        console.log(timer);
        timer--;
      }
      if (timer == 0) {
        crash = false;
      }
    }
    player.draw();
    // update players state, emit that to the server
    player_state.x = player.pos.x;
    player_state.y = player.pos.y;
    player_state.dirx = player.vel.x;
    player_state.diry = player.vel.y;
    player_state.timestamp = new Date().getTime();
    socket.emit("update_player_state", player_state);
  } else {
    textSize(50);
    text("You have been bested", 120, 320);
    text("GAME OVER!", 200, 400);
  }
}

// when mouse is dragged update the current position
function mouseDragged() {
  curr_x = mouseX;
  curr_y = mouseY;
}

// on space pressed, register a bullet with the server
function keyPressed() {
  if (key == " ") {
    console.log("Bullet fired");
    if (curr_x != -1 && curr_y != -1) {
      var bullet_dir = createVector(curr_x - width / 2, curr_y - height / 2);
      b = {
        id: socket.id + "b" + curr_bullet,
        x: player.pos.x,
        y: player.pos.y,
        dirx: bullet_dir.x,
        diry: bullet_dir.y,
      };
      socket.emit("register_bullet_state", b);
      curr_bullet++;
    }
  }
}
