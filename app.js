// Base Setup.
// Call needed packages.
var express = require('express'); // call express
var app = express(); // define our app using express
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var port = process.env.PORT || 5000; // set the port

// Force https on prod.
if(process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https')
      res.redirect(`https://${req.header('host')}${req.url}`)
    else
      next()
  })
}

app.use(express.static(__dirname + '/public')); // set the static folder
app.use('/pgp', express.static(__dirname + '/node_modules/openpgp/dist/lightweight'));


// Routing.
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/chat/:id', (req, res) => {
  res.sendFile(__dirname + '/public/chat.html');
});


// Socket.io event handling.
io.on('connection', (socket) => {
  socket.on('join room', (room, publicKey, username) => {
    socket.join(room);
    socket.publickey = publicKey;
    socket.username = username;
    socket.broadcast.to(room).emit('admin message', `${username} joined the conversation`);
    socket.broadcast.to(room).emit('add key', publicKey);

    // Add public keys of all clients in the room.
    var clients = io.sockets.adapter.rooms[room].sockets;
    for (var clientId in clients) {
      var client = io.sockets.connected[clientId];
      if (client != socket)
        socket.emit('add key', client.publickey);
    }
  });

  socket.on('chat message', (msg) => {
    for (var room in socket.rooms) {
      socket.broadcast.to(room).emit('chat message', {
        username: socket.username,
        msg: msg
      });
    }
  });

  socket.on('remove messages', () => {
    for (var room in socket.rooms) {
      socket.broadcast.to(room).emit('remove messages');
    }
  });

  socket.on('disconnecting', () => {
    for (var room in socket.rooms) {
      socket.broadcast.to(room).emit('admin message', `${socket.username} disconnected`);
      socket.broadcast.to(room).emit('remove key', socket.publickey);
    }
  });
});


// Start the server.
http.listen(port, () => {
  console.log('listening on port ' + port);
});
