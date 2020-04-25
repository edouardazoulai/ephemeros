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
  console.log('a user connected');

  socket.on('chat message', (msg) => {
    console.log('new message: ' + msg);
    socket.broadcast.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    socket.broadcast.emit('admin message', 'user disconnected');
  });
});

http.listen(port, () => {
  console.log('listening on *:' + port);
});