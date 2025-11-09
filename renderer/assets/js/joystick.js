// Virtual Joystick Control
// Works for both touch and mouse input

const joystickContainer = document.createElement('div');
joystickContainer.style.position = 'absolute';
joystickContainer.style.bottom = '40px';
joystickContainer.style.left = '40px';
joystickContainer.style.width = '120px';
joystickContainer.style.height = '120px';
joystickContainer.style.borderRadius = '50%';
joystickContainer.style.background = 'rgba(255,255,255,0.1)';
joystickContainer.style.border = '2px solid rgba(255,255,255,0.3)';
joystickContainer.style.touchAction = 'none';
joystickContainer.style.zIndex = '10';
document.body.appendChild(joystickContainer);

const stick = document.createElement('div');
stick.style.position = 'absolute';
stick.style.left = '50%';
stick.style.top = '50%';
stick.style.transform = 'translate(-50%, -50%)';
stick.style.width = '60px';
stick.style.height = '60px';
stick.style.borderRadius = '50%';
stick.style.background = 'rgba(255,255,255,0.5)';
stick.style.border = '2px solid rgba(255,255,255,0.6)';
joystickContainer.appendChild(stick);

let dragging = false;
let startX = 0, startY = 0;
let currentX = 0, currentY = 0;
let maxDistance = 40;

function updateJoystick(x, y) {
    const dx = x - startX;
    const dy = y - startY;
    const dist = Math.min(Math.hypot(dx, dy), maxDistance);
    const angle = Math.atan2(dy, dx);
    const normX = (dist / maxDistance) * Math.cos(angle);
    const normY = (dist / maxDistance) * Math.sin(angle);

    // Move the stick visually
    stick.style.transform = `translate(calc(-50% + ${normX * maxDistance}px), calc(-50% + ${normY * maxDistance}px))`;

    // Send movement input to maze3d.js
    if (window.setJoystick) {
        window.setJoystick(normX, -normY); // Invert Y for forward/back
    }
}

function resetJoystick() {
    stick.style.transform = 'translate(-50%, -50%)';
    if (window.setJoystick) window.setJoystick(0, 0);
}

joystickContainer.addEventListener('pointerdown', (e) => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
});

window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    currentX = e.clientX;
    currentY = e.clientY;
    updateJoystick(currentX, currentY);
});

window.addEventListener('pointerup', () => {
    dragging = false;
    resetJoystick();
});
