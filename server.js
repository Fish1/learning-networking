var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');

var app = new express();
var server = http.Server(app);
var io = socketIO(server);

var uuidCounter = 0;

app.set('port', 25565);
app.use('/static', express.static(__dirname + '/static'));

// send static
app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname, 'static/game.html'));
});

app.get('/three.min.js', function(request, response) {
	response.sendFile(path.join(__dirname, 'node_modules/three/build/three.min.js'));
});

app.get('/nipplejs.min.js', function(request, response) {
	response.sendFile(path.join(__dirname, 'node_modules/nipplejs/dist/nipplejs.min.js'));
});

app.get('/side.png', function(request, response) {
	response.sendFile(path.join(__dirname, 'static/side.png'));
});

app.get('/face.png', function(request, response) {
	response.sendFile(path.join(__dirname, 'static/face.png'));
});

// start server
server.listen(25565, function() {
	console.log('Server running on port 25565...');
});

var sockets = new Map();
var users = new Map();

// emit position data to every connection, except to the specified uuid
function emitPosition(uuid, posX, posZ, rotY) {
	sockets.forEach(function(entry) {

		if(entry.uuid != uuid) {
			entry.socket.emit('position',
				{uuid: uuid,
				posX: posX,
				posZ: posZ,
				rotY: rotY});
		}
	});
};

// emit username for everyone to update
function emitUsername(uuid, username) {
	sockets.forEach(function(entry) {
		if(entry.uuid != uuid) {
			entry.socket.emit('username', 
				{uuid: uuid,
				username: username});
		}
	});
};

// emit a leave so clients stop rendering disconnected uers
function emitLeave(uuid) {
	sockets.forEach(function(entry) {
		entry.socket.emit('leave', uuid);
	});
};

io.on('connection', function(socket) {

	var uuid = uuidCounter++;

	var address = socket.request.connection.remoteAddress;

	var socketData = {
		uuid: uuid,
		socket: socket
	};

	var userData = {
		uuid: uuid,
		username: "",
		posX: 25,
		posZ: 25,
		rotY: 0
	};

	console.log('Connect - ' + address);

	// send the connected user a welcome packet, with their IP and position
	socket.emit('welcome', userData);

	// make sure position are updated properly
	sockets.forEach(function(entry) {
		// tell new user about other persons position
		var user = users.get(entry.uuid);
		socket.emit('init', user);

		// tell other person about new users position
		entry.socket.emit('init', userData);
	});

	// add the new user to the connection map
	sockets.set(uuid, socketData);	
	users.set(uuid, userData);

	// log when a user leaves, and tell other users to stop rendering the this user
	socket.on('disconnect', function(data) {
		console.log('Disconnect - ' + address);
		users.delete(uuid);
		sockets.delete(uuid);
		emitLeave(uuid);
	});

	// update position based on key strokes
	socket.on('move', function(data) {
		var x = Math.cos(data.angle - (Math.PI / 2)) * data.distance * -1;
		var y = Math.sin(data.angle - (Math.PI / 2)) * data.distance;

		userData.posZ += y;
		userData.posX += x;
	});

	socket.on('angle', function(data) {
		userData.rotY = data.angle;
	});

	socket.on('username', function(data) {
		userData.username = data;
		emitUsername(uuid, data);
	});
});

setInterval(function() {
	sockets.forEach(function(entry) {
		var user = users.get(entry.uuid);
		emitPosition(user.uuid, user.posX, user.posZ, user.rotY);
	});
}, 100);
