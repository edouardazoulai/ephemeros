// Room uuid is in the url. 
var pathname = window.location.pathname;
var room = pathname.substring(pathname.lastIndexOf("/") + 1, pathname.length);

// Check uuid validity of url.
const uuid = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
if (!room.match(uuid)) {
  window.alert("Error: the url used is incorrect.");
  window.location.replace(window.location.origin); // Redirect to /
}

// Modifies DOM once it is loaded.
$(function () {
  var socket = io();

  $('form').submit(function(e) {
    e.preventDefault(); // prevents page reloading
    var msg = $('#message').val();
    socket.emit('chat message', msg);
    $('#messages').append($('<li class="sent">').text(msg));
    $('#message').val('');
    return false;
  });

  // Join room from url when the socket connects.
  socket.on('connect', function() {
    socket.emit('join room', room);
  });

  // When a user sends a message.
  socket.on('chat message', function(msg) {
    $('#messages').append($('<li calss="received">').text(msg));
  });

  // When the server sends a message.
  socket.on('admin message', function(msg) {
    $('#messages').append($('<li class="admin">').text(msg));
  });
});