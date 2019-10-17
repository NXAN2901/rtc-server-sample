var express = require("express");
var app = express();
var fs = require("fs");
var open = require("open");
var options = {
  key: fs.readFileSync("./fake-keys/privatekey.pem"),
  cert: fs.readFileSync("./fake-keys/certificate.pem")
};
var serverPort = process.env.PORT || 3000;
var https = require("https");
var http = require("http");
var server;
if (process.env.LOCAL) {
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}
var io = require("socket.io")(server);

var roomList = {};

app.get("/", function(req, res) {
  console.log("get /");
  res.sendFile(__dirname + "/index.html");
});
server.listen(process.env.PORT || 3000, function() {
  console.log("server up and running at %s port", serverPort);
  if (process.env.LOCAL) {
    open("https://localhost:" + serverPort);
  }
});

function socketIdsInRoom(roomId) {
  var socketIds = io.nsps["/"].adapter.rooms[roomId];
  if (socketIds) {
    var collection = [];
    for (var key in socketIds) {
      collection.push(key);
    }
    return collection;
  }
  return [];
}

io.on("connection", function(socket) {
  console.log("Connection: ", socket.id);
  socket.on("disconnect", function() {
    console.log("disconnect");
    if (socket.room) {
      var room = socket.room;
      io.to(room).emit("leave", socket.id);
      socket.leave(room);
    }
  });

  socket.on("join", function(name, callback) {
    console.log("join", name);
    var socketIds = socketIdsInRoom(name);
    callback(socketIds);
    socket.join(name);
    socket.room = name;
  });

  socket.on("exchange", function(data) {
    console.log("exchange", data);
    data.from = socket.id;
    var to = io.sockets.connected[data.to];
    to.emit("exchange", data);
  });

  socket.on("send-message", function(data, cb) {
    const roomId = data.roomId;
    const displayName = data.displayName;
    const message = data.message;
    const socketIds = socketIdsInRoom(roomId);
    const friends = socketIds
      .map(socketId => {
        return {
          socketId
        };
      })
      .filter(friend => friend.socketId != socket.id);
    friends.forEach(friend => {
      io.sockets.connected[friend.socketId].emit("send-message", {
        displayName,
        message
      });
    });
    cb({
      displayName,
      message
    });
  });

  // socket.on("send-image", function (data, cb) => {
  //   const roomId = data.roomId;
  //   const socketIds = socketIdsInRoom(roomId)
    
  // }) 
});
