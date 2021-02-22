import Player from "./server/model/Player";

const SERVER_PORT = 8000;
const REFRESH_RATE = 25;

const MONGO_REPO = "Account";
const express = require("express");
const app = require("express")();
const server = require("http").createServer(app);

const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const url =
  "mongodb+srv://admin:admin@cluster0.n3ilx.mongodb.net/mmorpg?retryWrites=true&w=majority";
let dbo;
const io = require("socket.io")(server);

app.get("/", function (_, res) {
  res.sendFile(__dirname + "/client/index.html");
});

app.use("/client", express.static(__dirname + "/client"));

let socketList = {};
let playerList = {};
//let starList = {};

const client = new MongoClient(url, { useUnifiedTopology: true });

client.connect(function (err, db) {
  assert.equal(null, err);
  if (err) throw err;
  dbo = db.db("mmorpg");
  dbo.createCollection(MONGO_REPO, function (err, res) {
    if (err) throw err;
    console.log("¡Coleccion  creada!");
  });
});

io.on("connection", function (socket) {
  socket.id = Math.random();
  socketList[socket.id] = socket;
  console.log("Socket => " + socket.id + " conectado");

  socket.on("signUp", function (userData) {
    isValidNewCredential(userData).then(function (res) {
      if (res) insertCredential(userData);
      io.emit("signUpResponse", { success: res });
    });
  });

  socket.on("signIn", function (userData) {
    isCorrectCredential(userData).then(function (res) {
      if (res.valid) onConnect(socket, userData.username, res.points);
      io.emit("signInResponse", {
        success: res.valid,
        socket_id: socket.id
      });
    });
  });

  socket.on("disconnect", function () {
    if (socketList[socket.id] != null) {
      delete socketList[socket.id];
      console.log(socket.id + " desconectado");
    }

    //encaso de que el array es no esté vacio ...
    if (Object.entries(playerList).length !== 0) {
      const player = playerList[socket.id];
      if (player) {
        toAllChat(player.username + " desconectado");
        socket.emit("removeChar", player.id);
        const query = {
          username: player.username
        };
        const newValues = { $set: { points: player.points } };
        dbo
          .collection(MONGO_REPO)
          .updateOne(query, newValues, function (err, res) {
            if (err) throw err;
            console.log("MongoDB Document Updated: " + res.result);
          });

        delete playerList[socket.id];
      }
    }
  });
});
server.listen(process.env.PORT || SERVER_PORT);
console.log("Server started! localhost at port: " + SERVER_PORT);

setInterval(function () {
  const players = [];

  for (let i in playerList) {
    let player = playerList[i];
    //player.updatePosition();
    players.push({
      id: player.id,
      x: player.x,
      y: player.y,
      username: player.username,
      points: player.points,
      lastPosition: player.lastPosition,
      char: player.char,
      client: player.client,
      char_element: player.char_element,
      char_spritesheet: player.char_spritesheet
    });
  }

  for (let i in socketList) {
    const socket = socketList[i];

    socket.emit("renderInfo", players);
    socket.emit("Time");
  }
}, REFRESH_RATE);

function isValidNewCredential(userData) {
  return new Promise(function (callback) {
    var query = {
      username: userData.username
    };
    dbo
      .collection(MONGO_REPO)
      .find(query)
      .toArray(function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
          console.log(
            "user credential not taken yet: " + JSON.stringify(userData)
          );
          callback(true);
        } else {
          callback(false);
          console.log(
            "User credential already exist: " + JSON.stringify(result)
          );
        }
      });
  });
}

function isCorrectCredential(userData) {
  return new Promise(function (callback) {
    var query = {
      username: userData.username,
      password: userData.password
    };
    dbo
      .collection(MONGO_REPO)
      .find(query)
      .toArray(function (err, result) {
        if (err) throw err;
        if (result.length !== 0) {
          //console.log("Matching Credential: " + JSON.stringify(result[0]));
          callback({ valid: true, points: result[0].points });
        } else {
          callback({ valid: false, points: null });
          console.log("Usuario o contraseña incorrecto");
        }
      });
  });
}

function insertCredential(data) {
  const account = {
    username: data.username,
    password: data.password,
    points: 0
  };
  dbo.collection(MONGO_REPO).insertOne(account, function (err, res) {
    if (err) throw err;
    console.log("MongoDB Document Inserted: " + JSON.stringify(account));
  });
}

function toAllChat(line) {
  for (let i in socketList) socketList[i].emit("addToChat", line);
}

function emitPosition(id, x, y) {
  socketList[id].emit("newPosition", { x: x, y: y });
}

function onConnect(socket, name, points) {
  const player = Player(socket.id, name, points);
  playerList[socket.id] = player;
  socket.on("keyPress", function (data) {
    //glitchy character movement
    //console.log(data.x + " " + data.y);
    player.x = data.x;
    player.y = data.y;
    player.lastPosition = data.lastPosition;

    emitPosition(player.id, player.x, player.y);

    if (data.inputId === "shoot" && playerList[socket.id] != null)
      player.shootBullet();
    else player.lastPosition = data.lastPosition;
  });

  socket.on("socket_client_id", function (data) {
    player.client = data.socket_id;
  });

  socket.on("charSelect", function (data) {
    player.char = data.char;
  });

  socket.on("sendMsgToServer", function (data) {
    const playerName = "" + player.username;
    toAllChat(playerName + ": " + data);
  });

  socket.on("kms", function () {
    if (playerList[socket.id] != null) {
      delete playerList[socket.id];
    }
  });

  socket.on("revive", function () {
    console.log("revive " + socket.id);
    if (playerList[socket.id] == null) {
      playerList[socket.id] = player;
    }
  });

  socket.on("updateChar", function (data) {
    player.char_element = data.char_element;
    player.char_spritesheet = data.char_spritesheet;
  });
}
