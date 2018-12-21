document.addEventListener("DOMContentLoaded", function() {

var username = prompt("Enter a username");

if(username == null || username === "")
{
	username = "anon";
}

var socket = io().connect('http://jacobenders.ddns.net:25565');

var uuid;

var connections = new Map();

socket.on('welcome', function(data) {
	uuid = data.uuid;
	console.log('Your ID is ' + uuid);
	connections.set(data.uuid, {uuid: data.uuid,
		posX: data.posX,
		posY: data.posY, username: username});
	socket.emit('username', username);
});

socket.on('init', function(data) {
	connections.set(data.uuid, data);
});

socket.on('position', function(data) {
	var con = connections.get(data.uuid);
	con.posX = data.posX;
	con.posY = data.posY;
});

socket.on('username', function(data) {
	connections.get(data.uuid).username = data.username;
});

socket.on('leave', function(data) {
	connections.delete(data);	
	console.log('Disconnect - ' + data);
});

var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');

context.font = "40px Arial";

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

function renderScreen() {
	context.clearRect(0,0,canvas.width, canvas.height);
	connections.forEach(function(entry) {
		context.fillRect(entry.posX, entry.posY, 25, 25);
		if(entry.username != null)
		context.fillText(entry.username, entry.posX, entry.posY - 5);
	});
};

function onKeyPress(e) {
	var key = String.fromCharCode(e.charCode);

	var speed = 4.0;

	if(key == 'a')
	{
		connections.get(uuid).posX -= speed;
		socket.emit('move', 'left');
	}
	if(key == 's')
	{
		connections.get(uuid).posY += speed;
		socket.emit('move', 'down');
	}
	if(key == 'w')
	{
		connections.get(uuid).posY -= speed;
		socket.emit('move', 'up');
	}
	if(key == 'd')
	{
		connections.get(uuid).posX += speed;
		socket.emit('move', 'right');
	}
};

window.addEventListener('keypress', onKeyPress, false);

window.addEventListener('resize', function() {
	canvas.width = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
	renderScreen();
});

setInterval(function (){
	renderScreen();
}, 30);

});
