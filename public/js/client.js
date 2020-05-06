// Room uuid is in the url. 
var pathname = window.location.pathname;
var room = pathname.substring(pathname.lastIndexOf("/") + 1, pathname.length);

// Check uuid validity of url.
const uuid = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
if (!room.match(uuid)) {
  window.alert("Error: the url used is incorrect.");
  window.location.replace(window.location.origin); // Redirect to /
}

// Generates a pgp key.
async function keygen() {
  const { privateKeyArmored, publicKeyArmored, revocationCertificate } =
    await openpgp.generateKey({ userIds: [{}], curve: 'ed25519' });

  return { privateKeyArmored, publicKeyArmored };
}

// Encrypts a message given a list of keys.
async function encrypt(message, keyList) {
  const publicKeys = await Promise.all(keyList.map(async (key) => {
    return (await openpgp.key.readArmored(key)).keys[0];
  }));

  const { data: encrypted } = await openpgp.encrypt({
    message: openpgp.message.fromText(message),
    publicKeys
  });

  return encrypted;
}

// Decrypts a message given a private key.
async function decrypt(message, privKey) {
  const { keys: [privateKey] } = await openpgp.key.readArmored(privKey);

  const { data: decrypted } = await openpgp.decrypt({
    message: await openpgp.message.readArmored(message),
    privateKeys: [privateKey]
  });

  return decrypted;
}

// Modifies DOM once it is loaded.
$(function () {
  var keyList = []; // connected users public keys
  var socket = io(); // instantiate the socket connection

  $('#loginForm').submit((e) => {
    e.preventDefault(); // prevents page reloading
    var username = $('#username').val().trim();

    if (!username) {
      $('#username').val('');
      return false;
    }

    $('#login').hide();
    $('#login').off('click');
    $('#chat').show();
    
    // Join room from url when the username is entered.
    keygen().then((result) => {
      socket.emit('join room', room, result.publicKeyArmored, username);
      sessionStorage.privateKey = result.privateKeyArmored;
    });
  });

  // When a user sends a message.
  socket.on('chat message', (data) => {
    decrypt(data.msg, sessionStorage.privateKey).then((decryptedMsg) => {
      // We use jQuery .text() function to sanitize input.
      msgDiv = $('<div class="text-break text-wrap">').text(decryptedMsg);
      authorDiv = $('<div class="author">').text(data.username);
      container = $('<li class="received align-self-start my-1">');
      
      $('#messages').append(container.append([msgDiv, authorDiv]));
      $('#messages').scrollTop($('#messages')[0].scrollHeight); // scroll to bottom
    });
  });

  // When the server sends a message.
  socket.on('admin message', (msg) => {
    message = $('<li class="admin align-self-center my-1 text-break text-wrap">');
    $('#messages').append(message.text(msg));
    $('#messages').scrollTop($('#messages')[0].scrollHeight);
  });

  // When a user decides to delete messages
  socket.on('remove messages', () => {
    $('#messages').empty();
  });

  // When a new user joins or we join a room with people already in.
  socket.on('add key', (key) => {
    keyList.push(key);
  });

  // When a participant leaves.
  socket.on('remove key', (key) => {
    var i = keyList.indexOf(key);
    if (i > -1)
      keyList.splice(i, 1);
  });

  // Send a message.
  $('#textbar').submit((e) => {
    e.preventDefault(); // prevents page reloading
    var msg = $('#message').val();

    encrypt(msg, keyList)
      .then((encryptedMSG) => {
        socket.emit('chat message', encryptedMSG);
      })
      .catch((error) => {
        // Do nothing when there is no one else connceted.
      });

    message = $('<li class="sent align-self-end my-1 text-break text-wrap">');
    $('#messages').append(message.text(msg));
    $('#message').val('');
    $('#messages').scrollTop($('#messages')[0].scrollHeight);
    return false;
  });

  // Delete messages
  $('#deleteMessages').click(() => {
    var remove = confirm('Are you sure you want to delete messages ? They will be deleted for all users connected to this chat.');
    if (remove) {
      socket.emit('remove messages');
      $('#messages').empty();
    }
  });
});