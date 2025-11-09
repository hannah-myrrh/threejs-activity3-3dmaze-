import * as THREE from './three.min.js';
import { createParticles } from './particles.js';
import { showWinOverlay } from './winOverlay.js';

// get container from index.html
const container = document.getElementById('game-container');

// renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
container.appendChild(renderer.domElement);

// scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // sky blue

// camera setup
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 16);

// lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

// === AUDIO SETUP ===
const listener = new THREE.AudioListener();
camera.add(listener);
const audioLoader = new THREE.AudioLoader();

// background sound
const bgSound = new THREE.Audio(listener);
audioLoader.load('assets/sounds/bat.mp3', (buffer) => {
  bgSound.setBuffer(buffer);
  bgSound.setLoop(true);
  bgSound.setVolume(0.25);
  bgSound.play();
});

// win sound
const winSound = new THREE.Audio(listener);
audioLoader.load('assets/sounds/bat.wav', (buffer) => {
  winSound.setBuffer(buffer);
  winSound.setLoop(false);
  winSound.setVolume(0.7);
});

// floor
const groundMat = new THREE.MeshStandardMaterial({ color: 0x167f16 });
const groundGeo = new THREE.PlaneGeometry(80, 80);
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// maze setup (red walls)
const MAZE_SIZE = 11;
const CELL = 2.0;
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const walls = new THREE.Group();
scene.add(walls);

// static maze layout
const maze = [
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,1],
  [1,0,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,1],
  [1,1,1,1,1,0,1,1,1,0,1],
  [1,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1]
];

// build walls
for (let i = 0; i < MAZE_SIZE; i++) {
  for (let j = 0; j < MAZE_SIZE; j++) {
    if (maze[i][j] === 1) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(CELL, 2, CELL), wallMaterial);
      wall.position.set((j - (MAZE_SIZE-1)/2) * CELL, 1, (i - (MAZE_SIZE-1)/2) * CELL);
      walls.add(wall);
    }
  }
}

// exit gate
const exitMat = new THREE.MeshStandardMaterial({ color: 0x6a3 });
const exitGeo = new THREE.BoxGeometry(3, 3, 0.5);
const exit = new THREE.Mesh(exitGeo, exitMat);
exit.position.set((MAZE_SIZE-1)/2 * CELL - CELL, 1.5, -(MAZE_SIZE-1)/2 * CELL + CELL);
scene.add(exit);

// player ball
const ballRadius = 0.6;
const ballMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
const ball = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 32, 32), ballMat);
ball.position.set(0, ballRadius, (MAZE_SIZE-1)/2 * CELL - CELL);
scene.add(ball);

// movement vars
let velocity = new THREE.Vector3(0, 0, 0);
let input = { x: 0, z: 0 };
let onGround = true;
let hasWon = false;
let winParticles = null;

// joystick input hook
window.setJoystick = (nx, nz) => { input.x = nx; input.z = nz };

// simple collision
function collideWithWalls(pos) {
  const next = pos.clone();
  for (const wall of walls.children) {
    const hw = CELL / 2;
    const min = new THREE.Vector3(wall.position.x - hw, 0, wall.position.z - hw);
    const max = new THREE.Vector3(wall.position.x + hw, 2, wall.position.z + hw);
    const bMin = new THREE.Vector3(next.x - ballRadius, 0, next.z - ballRadius);
    const bMax = new THREE.Vector3(next.x + ballRadius, 2 * ballRadius, next.z + ballRadius);

    if (bMax.x > min.x && bMin.x < max.x && bMax.z > min.z && bMin.z < max.z) {
      const overlapX = Math.min(bMax.x - min.x, max.x - bMin.x);
      const overlapZ = Math.min(bMax.z - min.z, max.z - bMin.z);
      if (overlapX < overlapZ) {
        if (pos.x > wall.position.x) pos.x += overlapX + 0.01;
        else pos.x -= overlapX + 0.01;
        velocity.x = 0;
      } else {
        if (pos.z > wall.position.z) pos.z += overlapZ + 0.01;
        else pos.z -= overlapZ + 0.01;
        velocity.z = 0;
      }
    }
  }
}

// raycast exit check
const ray = new THREE.Raycaster();
function checkExit() {
  const dir = new THREE.Vector3();
  dir.subVectors(exit.position, ball.position).normalize();
  ray.set(ball.position, dir);
  const hits = ray.intersectObject(exit);
  return hits.length > 0 && hits[0].distance < 2.0;
}

// camera follow
function updateCamera() {
  const target = new THREE.Vector3(ball.position.x, ball.position.y + 7, ball.position.z + 12);
  camera.position.lerp(target, 0.08);
  camera.lookAt(ball.position);
}

// resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// keyboard input
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'w') input.z = -1;
  if (e.key === 'ArrowDown' || e.key === 's') input.z = 1;
  if (e.key === 'ArrowLeft' || e.key === 'a') input.x = -1;
  if (e.key === 'ArrowRight' || e.key === 'd') input.x = 1;
});
window.addEventListener('keyup', (e) => {
  if (['ArrowUp','w'].includes(e.key)) input.z = 0;
  if (['ArrowDown','s'].includes(e.key)) input.z = 0;
  if (['ArrowLeft','a'].includes(e.key)) input.x = 0;
  if (['ArrowRight','d'].includes(e.key)) input.x = 0;
});

// main animation loop
let last = performance.now();

function animate() {
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;

  const accel = 14.0;
  const damping = 0.92;

  // calculate forward and right movement based on camera
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0; forward.normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), forward).normalize();

  velocity.x += (right.x * input.x + forward.x * input.z) * accel * dt;
  velocity.z += (right.z * input.x + forward.z * input.z) * accel * dt;
  velocity.multiplyScalar(damping);

  // move ball
  const nextPos = ball.position.clone().addScaledVector(velocity, dt);
  collideWithWalls(nextPos);
  if (nextPos.y <= ballRadius + 0.02) {
    nextPos.y = ballRadius + 0.02;
    onGround = true;
    velocity.y = 0;
  }
  ball.position.copy(nextPos);

  // rotate ball by velocity
  const rotAxis = new THREE.Vector3(velocity.z, 0, -velocity.x).normalize();
  const rotSpeed = velocity.length() * dt / ballRadius;
  if (rotSpeed > 0.0001) ball.rotateOnWorldAxis(rotAxis, rotSpeed);

  // check win condition
  if (!hasWon && checkExit()) {
    hasWon = true;
    winParticles = createParticles(scene, exit.position, 0xffff00, 200);
    winSound.play(); // 🔊 play win sound
    showWinOverlay(() => {
      hasWon = false;
      ball.position.set(0, ballRadius, (MAZE_SIZE - 1)/2 * CELL - CELL);
      velocity.set(0, 0, 0);
      if (winParticles) winParticles = null;
    });
  }

  if (winParticles) winParticles.update(dt);
  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
