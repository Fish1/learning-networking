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
		posZ: data.posZ, 
		username: username});
	socket.emit('username', username);
});

socket.on('init', function(data) {
	connections.set(data.uuid, data);
	var geo = new THREE.BoxBufferGeometry(3,3,3);
	var loader = new THREE.TextureLoader();
	var mats = [
		new THREE.MeshBasicMaterial({
			map: loader.load('/side.png')
		}),
		new THREE.MeshBasicMaterial({
			map: loader.load('/side.png')
		}),
		new THREE.MeshBasicMaterial({
			map: loader.load('/side.png')
		}),
		new THREE.MeshBasicMaterial({
			map: loader.load('/side.png')
		}),
		new THREE.MeshBasicMaterial({
			map: loader.load('/side.png')
		}),
		new THREE.MeshBasicMaterial({
			map: loader.load('/face.png')
		})
	];
	var mesh = new THREE.Mesh(geo, mats);
	mesh.position.x = data.posX;
	mesh.position.z = data.posZ;
	mesh.position.y = 2;
	connections.get(data.uuid).mesh = mesh;	
	connections.get(data.uuid).tween = 0;


	scene.add(mesh);
});

socket.on('position', function(data) {
	var con = connections.get(data.uuid);
	con.posX = data.posX;
	con.posZ = data.posZ;
	con.rotY = data.rotY;

	var mesh = connections.get(data.uuid).mesh;
	//mesh.position.z = data.posZ;
//	mesh.position.x = data.posX;
//	mesh.rotation.y = data.rotY;
});

socket.on('username', function(data) {
	connections.get(data.uuid).username = data.username;
});

socket.on('leave', function(data) {
	scene.remove(connections.get(data).mesh);	
	connections.delete(data);
	console.log('Disconnect - ' + data);
});
/*
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
*/
/*
context.font = "40px Arial";
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
*/
var keyStates = new Map();

function onKeyDown(e) {
	var key = String.fromCharCode(e.which).toLowerCase();
	keyStates.set(key, true);
};

function onKeyUp(e) {
	var key = String.fromCharCode(e.which).toLowerCase();
	keyStates.set(key, false);
};

window.addEventListener('keydown', onKeyDown, false);

window.addEventListener('keyup', onKeyUp, false);

function renderScreen() {
	context.clearRect(0,0,canvas.width, canvas.height);
	connections.forEach(function(entry) {
		context.fillRect(entry.posX, entry.posY, 25, 25);
		if(entry.username != null)
		context.fillText(entry.username, entry.posX, entry.posY - 5);
	});
};

var speed = 4.0;

function updateLogic() {

	if(keyStates.get('w') == true)
	{
		socket.emit('move',{angle: camera.rotation.y, distance: 1});
		var x = Math.cos(camera.rotation.y - (Math.PI / 2));
		var y = Math.sin(camera.rotation.y - (Math.PI / 2));
		camera.position.z += y;
		camera.position.x -= x;
	}

	if(keyStates.get('s') == true)
	{
		socket.emit('move',{angle: camera.rotation.y, distance: -1});
		var x = Math.cos(camera.rotation.y - (Math.PI / 2));
		var y = Math.sin(camera.rotation.y - (Math.PI / 2));
		camera.position.z -= y;
		camera.position.x += x;
	}

	if(keyStates.get('q') == true || keyStates.get('a') == true){
		camera.rotation.y += 0.1;
		socket.emit('angle', {angle: camera.rotation.y});
	}
	
	if(keyStates.get('e') == true || keyStates.get('d') == true){
		camera.rotation.y -= 0.1;
		socket.emit('angle', {angle: camera.rotation.y});
	}
}

function updateTween() {
	connections.forEach(function(entry) {
		if(entry.uuid == uuid)
			return;

		var mesh = entry.mesh;
		var dx = entry.posX + mesh.position.x;
		dx /= 2;
		var dz = entry.posZ + mesh.position.z;
		dz /= 2;

		mesh.position.x = dx;
		mesh.position.z = dz;

		var dr = entry.rotY + mesh.rotation.y;
		dr /= 2;
		mesh.rotation.y = dr;
	});
}

setInterval(function (){
	updateLogic();
}, 50);

var manager = nipplejs.create({
	color: 'white'});

manager.on('added', function(evt, nipple) {

	nipple.on('dir:up', function(evt) {
		keyStates.set('w', true);			
		keyStates.set('s', false);			
		keyStates.set('q', false);			
		keyStates.set('e', false);			
		
	});

	nipple.on('dir:down', function(evt) {
		keyStates.set('w', false);
		keyStates.set('s', true);			
		keyStates.set('q', false);			
		keyStates.set('e', false);			

	});

	nipple.on('dir:left', function(evt) {
		keyStates.set('w', false);
		keyStates.set('s', false);			
		keyStates.set('q', true);			
		keyStates.set('e', false);			

	});

	nipple.on('dir:right', function(evt) {
		keyStates.set('w', false);
		keyStates.set('s', false);			
		keyStates.set('q', false);			
		keyStates.set('e', true);			

	});

	nipple.on('end', function(evt) {
		keyStates.set('w', false);			
		keyStates.set('s', false);			
		keyStates.set('q', false);			
		keyStates.set('e', false);			
	});
});

var camera, scene, renderer;
var ground;

function init() {
	camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
	camera.position.z = 25;
	camera.position.x = 25;
	camera.position.y = 2.5;
	scene = new THREE.Scene();

	/*
	var geometry = new THREE.BoxBufferGeometry(20,20,20);
	mesh = new THREE.Mesh(geometry);
	mesh.material.color.setHex(0xffffff);
	scene.add(mesh);
	*/

	var g = new THREE.PlaneGeometry(100, 100);
	var mat = new THREE.MeshBasicMaterial( {color:0x00ff00, side:THREE.DoubleSide});
	ground = new THREE.Mesh(g, mat);
	ground.rotation.x = -Math.PI / 2;
	scene.add(ground);

	renderer = new THREE.WebGLRenderer({antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	window.addEventListener('resize', onWindowResize, false);
};

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
	updateTween();
}

init();
animate();



});
