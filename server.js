var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');

var app = new express();
var server = http.Server(app);
var io = socketIO(server);

var uuidCounter = 0;
var ueidCounter = 0;

app.set('port', 25565);

app.use('/static', express.static(__dirname + '/static'));
app.use('/resources', express.static(__dirname + '/resources'));

// send static
app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname, 'static/game.html'));
});

app.get('/three.min.js', function(request, response) {
	response.sendFile(path.join(__dirname, 
		'node_modules/three/build/three.min.js'));
});

app.get('/GLTFLoader.js', function(request, response) {
	response.sendFile(path.join(__dirname, 
		'node_modules/three/examples/js/loaders/GLTFLoader.js'));
});

app.get('/nipplejs.min.js', function(request, response) {
	response.sendFile(path.join(__dirname, 
		'node_modules/nipplejs/dist/nipplejs.min.js'));
});

// start server
server.listen(25565, function() {
	console.log('Server running on port 25565...');
});

var sockets = new Map();
var users = new Map();

var enemies = [];
enemies.push({ueid: ueidCounter++, posX: 0, posZ: 0, rotY: 0});
enemies.push({ueid: ueidCounter++, posX: 50, posZ: 50, rotY: 10});

// emit position data to every connection, except to the specified uuid
function emitPositionPlayer(uuid) {
	var user = users.get(uuid);
	sockets.forEach(function(entry) {
		if(entry.uuid != uuid) {
			entry.socket.emit('position-player',
				{uuid: uuid,
				posX: user.posX,
				posZ: user.posZ,
				rotation: user.rotation});
		}
	});
};

// emit a leave so clients stop rendering disconnected uers
function emitDespawnPlayer(uuid) {
	sockets.forEach(function(entry) {
		entry.socket.emit('despawn-player', uuid);
	});
}

function emitPositionEnemies() {
	sockets.forEach(function(entry) {
		entry.socket.emit('position-enemies', enemies);
	});
}

function emitDespawnEnemy(ueid) {
	sockets.forEach(function(entry) {
		entry.socket.emit('despawn-enemy', ueid);
	});
}

io.on('connection', function(socket) {

	var uuid = uuidCounter++;

	var address = socket.request.connection.remoteAddress;

	var socketData = {
		uuid: uuid,
		socket: socket
	};

	var userData = {
		uuid: uuid,
		posX: 25,
		posZ: 25,
		rotation: {}
	};

	console.log('Connect - ' + address);

	// send the connected user a welcome packet, with their IP and position
	socket.emit('welcome', userData);

	// make sure position are updated properly
	sockets.forEach(function(entry) {
		// tell new user about other persons position
		var user = users.get(entry.uuid);
		socket.emit('spawn-player', user);

		// tell other person about new users position
		entry.socket.emit('spawn-player', userData);
	});

	// add the new user to the connection map
	sockets.set(uuid, socketData);	
	users.set(uuid, userData);

	// log when a user leaves, and tell other users to stop rendering the this user
	socket.on('disconnect', function(data) {
		console.log('Disconnect - ' + address);
		users.delete(uuid);
		sockets.delete(uuid);
		emitDespawnPlayer(uuid);
	});

	socket.on('position', function(data) {
		// do error correction here... soon
		userData.posZ = data.posZ;
		userData.posX = data.posX;
		userData.rotation = data.rotation;
	});

	socket.on('attack', function(data) {
		var removeArray = [];

		enemies.forEach(function(entry, index) {
			var dx = entry.posX - userData.posX;
			var dz = entry.posZ - userData.posZ;
			var distance = Math.sqrt(
				Math.pow(dx, 2) +
				Math.pow(dz, 2));
			
			if(distance <= 12)
			{
			//	removeArray.push({index: index, ueid: entry.ueid});
				entry.posX += (dx / distance) * 12;
				entry.posY += (dz / distance) * 12;
			}
		});

		removeArray.forEach(function(entry) {
			enemies.splice(entry.index,1);
			emitDespawnEnemy(entry.ueid);
		});
	});
});

setInterval(function() {
	sockets.forEach(function(entry) {
		emitPositionPlayer(entry.uuid);
	});

	emitPositionEnemies();
}, 50);

setInterval(function() {
	enemies.forEach(function(entry) {
		entry.posX += (Math.random() - 0.5) * 2;
		if(entry.posX > 50)
			entry.posX = 50;
		else if(entry.posX < -50)
			entry.posX = -50;
		
		entry.posZ += (Math.random() - 0.5) * 2;
		if(entry.posZ > 50)
			entry.posZ = 50;
		else if(entry.posZ < -50)
			entry.posZ = -50;
	});
}, 100);

setInterval(function() {
	if(enemies.length >= 5)
		return;
	enemies.push({ueid: ueidCounter++, 
		posX: (Math.random() - 0.5) * 100, 
		posZ: (Math.random() - 0.5) * 100, rotY: 10});
}, 5000);
