import * as THREE from './three.module.js';
import { createParticles } from './particles.js';


const container = document.getElementById('game-container');

// renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
container.appendChild(renderer.domElement);


// scene & camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // sky blue
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 16);

// lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
hemi.position.set(0, 50, 0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 7.5);
scene.add(dir);

// simple ground
const groundMat = new THREE.MeshStandardMaterial({ color: 0x167f16 });
const groundGeo = new THREE.PlaneGeometry(80, 80);
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// simple maze generator (grid of walls)
const MAZE_SIZE = 11; // odd number
const CELL = 2.0;
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
const walls = new THREE.Group();
scene.add(walls);

// Simple static maze layout (you can replace with procedural generator)
// 0 = empty, 1 = wall
const sample = [
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

for (let i = 0; i < MAZE_SIZE; i++) {
    for (let j = 0; j < MAZE_SIZE; j++) {
        if (sample[i][j] === 1) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(CELL, 2.2, CELL), wallMaterial);
        box.position.set((j - (MAZE_SIZE-1)/2) * CELL, 1.1, (i - (MAZE_SIZE-1)/2) * CELL);
        walls.add(box);
        }
    }
}

// exit gate
const exitMat = new THREE.MeshStandardMaterial({ color: 0x6a3 });
const exitGeo = new THREE.BoxGeometry(3, 3.2, 0.6);
const exit = new THREE.Mesh(exitGeo, exitMat);
exit.position.set((MAZE_SIZE-1)/2 * CELL - CELL, 1.6, -(MAZE_SIZE-1)/2 * CELL + CELL);
scene.add(exit);


// player (ball) - basic physics emulation
const ballRadius = 0.6;
const ballGeom = new THREE.SphereGeometry(ballRadius, 32, 32);
const ballMat = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
const ball = new THREE.Mesh(ballGeom, ballMat);
ball.castShadow = true;
ball.position.set(0, ballRadius + 0.02, (MAZE_SIZE-1)/2 * CELL - CELL);
scene.add(ball);

// movement state
let velocity = new THREE.Vector3(0, 0, 0);
let onGround = true;
const accel = 14.0;
const damping = 0.92;


// joystick input (wheel or touch)
let input = { x: 0, z: 0 };

// simple AABB collision test with walls
function collideWithWalls(position) {
    // check each wall
    const next = position.clone();
    for (const w of walls.children) {
        const hw = CELL/2;
        const wallMin = new THREE.Vector3(w.position.x - hw, 0, w.position.z - hw);
        const wallMax = new THREE.Vector3(w.position.x + hw, 2.2, w.position.z + hw);

        // ball AABB
        const ballMin = new THREE.Vector3(next.x - ballRadius, 0, next.z - ballRadius);
        const ballMax = new THREE.Vector3(next.x + ballRadius, 2*ballRadius, next.z + ballRadius);

         if (ballMax.x > wallMin.x && ballMin.x < wallMax.x && ballMax.z > wallMin.z && ballMin.z < wallMax.z) {
         // collision occurred — push back
         // compute simple separation by projecting out along x or z depending on overlap
        const overlapX = Math.min(ballMax.x - wallMin.x, wallMax.x - ballMin.x);
        const overlapZ = Math.min(ballMax.z - wallMin.z, wallMax.z - ballMin.z);
        if (overlapX < overlapZ) {
            if (position.x > w.position.x) position.x += overlapX + 0.01;
            else position.x -= overlapX + 0.01;
            velocity.x = 0;
        } else {
            if (position.z > w.position.z) position.z += overlapZ + 0.01;
            else position.z -= overlapZ + 0.01;
            velocity.z = 0;
            }
        }
    }
}

// raycaster for exit detection & pickups
const ray = new THREE.Raycaster();


function checkExit() {
    const dir = new THREE.Vector3();
    dir.subVectors(exit.position, ball.position).normalize();
    ray.set(ball.position, dir);
    const hits = ray.intersectObject(exit);
    if (hits.length > 0 && hits[0].distance < 2.2) return true;
    return false;
}

// particle system (simple) — createParticles returns an object with update()
let winParticles = null;


// camera follow
function updateCamera() {
    const desired = new THREE.Vector3(ball.position.x, ball.position.y + 7.5, ball.position.z + 12.0);
    camera.position.lerp(desired, 0.08);
    camera.lookAt(ball.position);
}

// handle resize
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// keyboard for desktop
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w') input.z = -1;
    if (e.key === 'ArrowDown' || e.key === 's') input.z = 1;
    if (e.key === 'ArrowLeft' || e.key === 'a') input.x = -1;
    if (e.key === 'ArrowRight' || e.key === 'd') input.x = 1;
});
window.addEventListener('keyup', (e) => {
    if ((e.key === 'ArrowUp' || e.key === 'w') && input.z === -1) input.z = 0;
    if ((e.key === 'ArrowDown' || e.key === 's') && input.z === 1) input.z = 0;
    if ((e.key === 'ArrowLeft' || e.key === 'a') && input.x === -1) input.x = 0;
    if ((e.key === 'ArrowRight' || e.key === 'd') && input.x === 1) input.x = 0;
});

// joystick-driven input: joystick.js will update `input` object via window.setJoystick(x,z)
window.setJoystick = (nx, nz) => { input.x = nx; input.z = nz };

let last = performance.now();
let hasWon = false;

function animate() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;

    // apply input acceleration relative to camera forward
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), forward).normalize();


    const ax = right.multiplyScalar(input.x * accel * dt);
    const az = forward.multiplyScalar(input.z * accel * dt);
    velocity.x += ax.x + az.x;
    velocity.z += ax.z + az.z;


    // gravity (tiny) and damping
    if (!onGround) velocity.y -= 9.8 * dt;
    velocity.multiplyScalar(damping);


    // integrate
    const nextPos = ball.position.clone().addScaledVector(velocity, dt);
    collideWithWalls(nextPos);

    // floor check
    if (nextPos.y <= ballRadius + 0.02) {
        nextPos.y = ballRadius + 0.02; onGround = true; velocity.y = 0;
    }

    ball.position.copy(nextPos);

    // update camera
    updateCamera();

    // rotate ball according to velocity (for realism)
    const rotAxis = new THREE.Vector3(velocity.z, 0, -velocity.x).normalize();
    const rotSpeed = velocity.length() * dt / ballRadius;
    if (rotSpeed > 0.0001) ball.rotateOnWorldAxis(rotAxis, rotSpeed);

    // check if player reached exit
    if (!hasWon && checkExit()) {
        hasWon = true;
        console.log("You reached the exit!");
        winParticles = createParticles(scene, ball.position);
    }

    // update particles
    if (winParticles) {
        winParticles.update(dt);
    }

    // render scene
    renderer.render(scene, camera);

    requestAnimationFrame(animate);
}

// start game
animate();
