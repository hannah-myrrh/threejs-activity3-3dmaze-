import * as THREE from 'three';

export function createParticles(scene, position, color = 0xffff00, count = 100) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        positions[i * 3] = position.x + (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 2;
        positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: color,
        size: 0.1,
        transparent: true,
        opacity: 1,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Animate them (simple fade + upward motion)
    const startTime = performance.now();
    function animate() {
        const elapsed = performance.now() - startTime;
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
            positions[i * 3 + 1] += 0.02; // rise slightly
        }
        geometry.attributes.position.needsUpdate = true;

        material.opacity = 1 - elapsed / 2000; // fade out
        if (material.opacity > 0) {
            requestAnimationFrame(animate);
        } else {
            scene.remove(particles);
            geometry.dispose();
            material.dispose();
        }
    }

    animate();
}
