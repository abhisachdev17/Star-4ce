const express = require("express");
const app = express();
const port = 5000;
const MAX_HEALTH = 4;
// var lerp = require("vectors/lerp")(2);
var limit = require("vectors/limit")(2);
var add = require("vectors/add")(2);
var width = 800;
var height = 800;

const server = app.listen(port, listen);
const io = require("socket.io")(server);

app.use(express.static("public"));

var game_players = {};
var game_bullets = {};
var game_asteroids = [];

function listen() {
  var port = server.address().port;
  console.log("Game Server listening at http://" + "localhost:" + port);
}

function generate_npcs() {
  for (var i = 0; i < 50; i++) {
    var posx = Math.random() * width * 2 - width;
    var posy = Math.random() * height * 2 - height;
    game_asteroids.push({ x: posx, y: posy, r: Math.random() * 10 + 5 });
  }
}

function predict_hit(who, when, x, y) {
  if (who in game_players) {
    var player_x = game_players[who].x;
    var player_y = game_players[who].y;
    var player_dx = game_players[who].dirx;
    var player_dy = game_players[who].diry;

    var player_last_update = game_players[who].timestamp;
    // a 150 ms window, giving the low pinger equal chance
    var d = Math.sqrt((player_x - x) ** 2 + (player_y - y) ** 2);
    var val = Math.abs(player_last_update - when);
    if (val > 150 && val < 1000) {
      var player_speed = limit([player_dx, player_dy], 2);
      var travelled_dist_x = player_x - (player_speed[0] * val) / 1000;
      var travelled_dist_y = player_x - (player_speed[1] * val) / 1000;
      var could_travel = Math.sqrt(
        travelled_dist_x ** 2 + travelled_dist_y ** 2
      );
      if (d - could_travel <= 30) {
        return true;
      }
      return false;
    } else if (val < 150) {
      if (d <= 30) {
        return true;
      }
      return false;
    }
    return false;
  }
}

class Bullet {
  constructor(id, x, y, dirx, diry) {
    this.id = id;
    this.pos = [x, y];
    this.dir = [dirx, diry];
    this.dir = limit(this.dir, 20.0);
    this.coverage = 0;
  }

  update() {
    this.pos = add(this.pos, this.dir);
    this.coverage++;
  }
}

io.on("connect", (socket) => {
  console.log("New client has connected " + socket.id);

  socket.on("register_player_state", (data) => {
    //console.log(data);
    if (!(socket.id in game_players)) {
      game_players[socket.id] = data;
      game_players[socket.id].h = MAX_HEALTH;
    }
  });

  socket.on("register_bullet_state", (data) => {
    if (!(socket.id in game_bullets)) {
      game_bullets[socket.id] = [];
    }
    game_bullets[socket.id].push(
      new Bullet(data.id, data.x, data.y, data.dirx, data.diry)
    );
  });

  socket.on("update_player_state", (data) => {
    if (socket.id in game_players) {
      if ("h" in data) {
        console.log("why is the health here? rejecting the cheater");
      } else {
        var temp = game_players[socket.id];
        game_players[socket.id] = data;
        game_players[socket.id].h = temp.h;
      }
    }
  });

  socket.on("get_asteroids", (data) => {
    if (socket.id in game_players) {
      if (game_asteroids.length == 0) {
        console.log("generating asteroids");
        generate_npcs();
      }
      socket.emit("update_asteroids", game_asteroids);
      //game_players[socket.id] = data;
    }
  });

  socket.on("asteroid_crash", (data) => {
    if (socket.id in game_players) {
      for (var i = game_asteroids.length - 1; i >= 0; i--) {
        if (JSON.stringify(data) == JSON.stringify(game_asteroids[i])) {
          game_asteroids.splice(i, 1);
        }
      }

      if (game_asteroids.length <= 5) {
        console.log("generating new asteroids");
        generate_npcs();
      }

      io.emit("update_asteroids", game_asteroids);
    }
  });

  socket.on("bullet_hit", (data) => {
    if (socket.id in game_players) {
      console.log("player in game");
      player_found = false;
      if (data.who in game_players) {
        console.log("opponent in game");
        player_bullets = game_bullets[socket.id];
        bullet_pos = -1;
        for (var b = player_bullets.length - 1; b >= 0; b--) {
          if (data.which.id == player_bullets[b].id) {
            bullet_pos = b;
            break;
          }
        }
        if (bullet_pos > -1) {
          hit_fr = predict_hit(data.who, data.when, data.which.x, data.which.y);

          if (hit_fr) {
            console.log("bullet has hit the other player");

            game_bullets[socket.id].splice(bullet_pos, 1);
            game_players[data.who].h--;
            if (game_players[data.who].h == 0) {
              io.to(data.who).emit("gameover");

              delete game_bullets[data.who];
              delete game_players[data.who];
            }
          }
        }
      }
    }
  });

  socket.on("get_player_state", () => {
    if (socket.id in game_players) {
      socket.emit(game_players[socket.id]);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client has disconnected " + socket.id);
    delete game_bullets[socket.id];
    delete game_players[socket.id];
  });
});

function notify_player_state() {
  io.sockets.emit("update_game_players", game_players);
}

function notify_bullet_state() {
  var bullets = {};
  for (key of Object.keys(game_bullets)) {
    for (var i = game_bullets[key].length - 1; i >= 0; i--) {
      b = game_bullets[key][i];
      b.update();
      if (b.coverage >= 120) {
        game_bullets[key].splice(i, 1);
      }
      if (!(key in bullets)) {
        bullets[key] = [];
      }
      bullets[key].push({ id: b.id, x: b.pos[0], y: b.pos[1] });
    }
  }
  io.sockets.emit("update_game_bullets", bullets);
}

setInterval(notify_player_state, 33);
setInterval(notify_bullet_state, 33);
