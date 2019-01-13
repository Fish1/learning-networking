document.addEventListener("DOMContentLoaded", function() {

var username = prompt("Enter a username");

if(username == null || username === "")
{
	username = "anon";
}

var socket = io().connect('http://jacobenders.ddns.net:25565');

var uuid;

var connections = new Map();
var enemies = new Map();

socket.on('welcome', function(data) {
	uuid = data.uuid;
	console.log('Your ID is ' + uuid);
});

socket.on('spawn-player', function(data) {
	connections.set(data.uuid, data);
	var geo = new THREE.BoxBufferGeometry(3,3,3);
	var loader = new THREE.TextureLoader();
	var mats = [
		new THREE.MeshBasicMaterial({
			map: loader.load('/resources/side.png')
		}),
		new THREE.MeshBasicMaterial({
			map: loader.load('/resources/side.png')
		}),
		new THREE.MeshBasicMaterial({
			map: loader.load('/resources/side.png')
		}),
		new THREE.MeshBasicMaterial({
			map: loader.load('/resources/side.png')
		}),
		new THREE.MeshBasicMaterial({
			map: loader.load('/resources/side.png')
		}),
		new THREE.MeshBasicMaterial({
			map: loader.load('/resources/face.png')
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

socket.on('position-player', function(data) {
	var con = connections.get(data.uuid);
	con.posX = data.posX;
	con.posZ = data.posZ;
	con.rotation = data.rotation;
	//console.log(data.rotation);
	//var mesh = connections.get(data.uuid).mesh;
});

socket.on('despawn-player', function(data) {
	scene.remove(connections.get(data).mesh);	
	connections.delete(data);
	console.log('Disconnect - ' + data);
});

socket.on('position-enemies', function(data) {
	data.forEach(function(entry) {
		if(enemies.has(entry.ueid) === false)
		{
			var geo = new THREE.BoxBufferGeometry(3,3,3);
			var mesh = new THREE.Mesh(geo);
			enemies.set(entry.ueid, {mesh: mesh});
			scene.add(mesh);
		}

		var enemy = enemies.get(entry.ueid);
		enemy.mesh.position.x = entry.posX;
		enemy.mesh.position.z = entry.posZ;
		enemy.mesh.rotation.y = entry.rotY;
	});
});

socket.on('despawn-enemy', function(data) {
	var enemy = enemies.get(data);
	scene.remove(enemy.mesh);
	enemies.delete(data);
});

var keyStates = new Map();

function onKeyDown(e) {
	var key = String.fromCharCode(e.which).toLowerCase();
	keyStates.set(key, true);

	if(key === ' ')
	{
		socket.emit('attack');
		swingSword.reset();
		swingSword.play();
	}
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

var moveSpeed = 30.0;
var rotateSpeed = Math.PI / 1.8;
function updateInput(delta) {

	if(keyStates.get('w') == true)
	{
		var forwards = new THREE.Vector3();
		playermesh.getWorldDirection(forwards);
		forwards.y = 0;
		forwards.normalize();

		playermesh.position.z -= forwards.z * moveSpeed * delta;
		playermesh.position.x -= forwards.x * moveSpeed * delta;
	}

	if(keyStates.get('s') == true)
	{
		var forwards = new THREE.Vector3();
		playermesh.getWorldDirection(forwards);
		forwards.y = 0;
		forwards.normalize();

		playermesh.position.z += forwards.z * moveSpeed * delta;
		playermesh.position.x += forwards.x * moveSpeed * delta;
	}

	if(keyStates.get('q') == true || keyStates.get('a') == true)
	{
		playermesh.rotateOnWorldAxis(
			new THREE.Vector3(0,1,0), rotateSpeed * delta);
	}
	
	if(keyStates.get('e') == true || keyStates.get('d') == true)
	{
		playermesh.rotateOnWorldAxis(
			new THREE.Vector3(0,1,0), -rotateSpeed * delta);
	}

	if(keyStates.get(' ') == true)
	{
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

function updateTweenTwo(delta) {
	connections.forEach(function(entry) {
		if(entry.uuid == uuid)
			return;

		var mesh = entry.mesh;

		var dx = entry.posX - mesh.position.x;
		var dz = entry.posZ - mesh.position.z;

		mesh.position.x += dx * delta * 7;
		mesh.position.z += dz * delta * 7;
		//mesh.rotation.y = entry.rotY;
		mesh.rotation.set(entry.rotation._x, entry.rotation._y, entry.rotation._z);
		//mesh.rotation.set(0,0,0);
		//mesh.setRotationFromQuaternion(entry.rotation);
		//mesh.rotateOnWorldAxis(
		//	new THREE.Vector3(0,1,0), entry.rotY);
		/*
		var dr = entry.rotY - mesh.rotation.y;
		mesh.rotation.y += dr * delta * 7;
		*/
		//mesh.rotation.y = entry.rotY * 2 * Math.PI;
	});
}

function emitPosition() {
	socket.emit('position', 
		{posX: playermesh.position.x, posZ: playermesh.position.z, 
			rotation: playermesh.rotation});
}

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

	nipple.on('start', function(evt) {
		socket.emit('attack');
		swingSword.reset();
		swingSword.play();
	});
});

var camera, scene, renderer;
var sword, swordAnimation;
var ground;
var mixer;
var playermesh;
var swingSword;

function init() {
	camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
	camera.position.z = 25;
	camera.position.x = 25;
	camera.position.y = 10;
	camera.rotation.x = -(Math.PI / 4.5);
	scene = new THREE.Scene();

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

	var loader = new THREE.GLTFLoader().setPath('resources/');
	loader.load('sword.glb', function(gltf) {
		var mesh = gltf.scene.children[0];
		mesh.material = new THREE.MeshBasicMaterial({color:0xff0000});
		//mesh.scale.set(0.5,1,0.5);
		gltf.scene.scale.set(0.5,1,0.5);
		scene.add(gltf.scene);
		sword = gltf.scene;

		mixer = new THREE.AnimationMixer(gltf.scene);
		swingSword = mixer.clipAction(gltf.animations[0]);
		swingSword.setDuration(0.20);
		swingSword.setLoop(THREE.LoopOnce);

	}, undefined, function(error) {
		console.log(error);
	});
	
	var playergeo = new THREE.BoxBufferGeometry(3,3,3);
	var loader = new THREE.TextureLoader().setPath('resources/');
	var playermats = [
		new THREE.MeshBasicMaterial({
			map: loader.load('side.png')
		}),
		new THREE.MeshBasicMaterial({
			map: loader.load('side.png')
		}),
		new THREE.MeshBasicMaterial({
			map: loader.load('side.png')
		}),
		new THREE.MeshBasicMaterial({
			map: loader.load('side.png')
		}),
		new THREE.MeshBasicMaterial({
			map: loader.load('side.png')
		}),
		new THREE.MeshBasicMaterial({
			map: loader.load('face.png')
		})
	];
	playermesh = new THREE.Mesh(playergeo, playermats);
	playermesh.position.y = 2;
	scene.add(playermesh);
};

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

var clock = new THREE.Clock();
clock.start();

var cameraGoTo = new THREE.Vector3();

function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);

	var delta = clock.getDelta();
	updateInput(delta);
	updateTweenTwo(delta);

	mixer.update(delta);

	if(clock.getElapsedTime() >= 0.05)
	{
		emitPosition();
		clock.start();
	}

	var forwards = new THREE.Vector3();
	playermesh.getWorldDirection(forwards);
	forwards.y = 0;
	forwards.normalize();

	sword.position.x = playermesh.position.x - forwards.x * 7;
	sword.position.z = playermesh.position.z - forwards.z * 7;

	var quat = new THREE.Quaternion();
	playermesh.getWorldQuaternion(quat);
	//quat.x = 0;
	//quat.z = 0;
	//quat.normalize();
	sword.setRotationFromQuaternion(quat);
	sword.rotation.y -= (Math.PI);
	
	cameraGoTo.x = playermesh.position.x + forwards.x * 20;
	cameraGoTo.z = playermesh.position.z + forwards.z * 20;
	cameraGoTo.y = camera.position.y;

	camera.position.lerp(cameraGoTo, 0.2);
	camera.quaternion.rotateTowards(quat, Math.PI * 0.9 * delta);
}

init();
animate();

});
