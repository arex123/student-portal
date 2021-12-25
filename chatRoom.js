const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const formatMessage = require("./util/message");

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./util/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, "public")));
const bot = "chadbox bot";

// app.get('/',()=>{
//     app.render('chat.html');
// })


io.on("connection", (socket) => {
  //first code-> // console.log('New WS connection...');

  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);

    //broadcast when a user connects
    socket.emit("message", formatMessage(bot, "Welcome to chadbox!")); //it will emit/tell to only connected client

    socket.broadcast
      .to(user.room)
      .emit("message", formatMessage(bot, `${user.username} is connected!`)); //it will emit(tell) to everyone except himself

    //send users to room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  //Listen to chatmessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  //Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(bot, `${user.username} has left the chat`)
      );

      //send users to room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });

  //io.emit() it will emit to everybody
});

const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => console.log(`server started ${PORT}`));
