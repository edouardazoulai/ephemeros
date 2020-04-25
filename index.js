var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/chat/:id', (req, res) => {
  res.sendFile(__dirname + '/chat.html');
});

io.on('connection', (socket) => {
  socket.on('join room', function(room) {
    socket.join(room);
    socket.broadcast.to(room).emit('admin message', 'new user connection');
  });

  socket.on('chat message', (msg) => {
    Object.keys(socket.rooms).forEach((room) => {
      socket.broadcast.to(room).emit('chat message', msg);
    });
  });

  socket.on('disconnecting', () => {
    Object.keys(socket.rooms).forEach((room) => {
      socket.broadcast.to(room).emit('admin message', 'user disconnected');
    });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

http.listen(port, () => {
  console.log('listening on *:' + port);
});