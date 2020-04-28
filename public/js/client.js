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
  const liStyle = 'my-1 text-break text-wrap';

  // Join room from url when the socket connects.
  socket.on('connect', function() {
    keygen().then((result) => {
      socket.emit('join room', room, result.publicKeyArmored);
      sessionStorage.privateKey = result.privateKeyArmored;
    });
  });

  // When a user sends a message.
  socket.on('chat message', function(msg) {
    decrypt(msg, sessionStorage.privateKey).then((msg) => {
      $('#messages').append($(`<li class="received align-self-start ${liStyle}">`).text(msg));
    });
  });

  // When the server sends a message.
  socket.on('admin message', function(msg) {
    $('#messages').append($(`<li class="admin align-self-center ${liStyle}">`).text(msg));
  });

  // When a new user joins or we join a room with people already in.
  socket.on('add key', function(key) {
    keyList.push(key);
  });

  // When a participant leaves.
  socket.on('remove key', function(key) {
    var i = keyList.indexOf(key);
    if (i > -1)
      keyList.splice(i, 1);
  });

  // Send a message.
  $('form').submit(function(e) {
    e.preventDefault(); // prevents page reloading
    var msg = $('#message').val();

    encrypt(msg, keyList)
      .then((encryptedMSG) => {
        socket.emit('chat message', encryptedMSG);
      })
      .catch((error) => {
        // Do nothing when there is no one else connceted.
      });

    $('#messages').append($(`<li class="sent align-self-end ${liStyle}">`).text(msg));
    $('#message').val('');
    return false;
  });
});