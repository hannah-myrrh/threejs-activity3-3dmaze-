// Simple "You Win" overlay + Restart button
// Works with your Electron/Three.js maze project

export function showWinOverlay(onRestart) {
    // Prevent duplicate overlays
    if (document.querySelector('#win-overlay')) return;

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'win-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0, 0, 0, 0.7)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '999';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.5s ease';
    document.body.appendChild(overlay);

    // Create message text
    const message = document.createElement('h1');
    message.innerText = '🎉 You Win! 🎉';
    message.style.color = 'white';
    message.style.fontSize = '3rem';
    message.style.marginBottom = '20px';
    message.style.textShadow = '0 0 20px gold';
    message.style.animation = 'pulse 1.5s infinite';
    overlay.appendChild(message);

    // Create Restart button
    const restartButton = document.createElement('button');
    restartButton.innerText = 'Restart Maze';
    restartButton.style.padding = '12px 24px';
    restartButton.style.fontSize = '1.2rem';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '12px';
    restartButton.style.background = 'gold';
    restartButton.style.color = '#333';
    restartButton.style.cursor = 'pointer';
    restartButton.style.boxShadow = '0 0 20px rgba(255,215,0,0.6)';
    restartButton.onmouseenter = () => restartButton.style.background = '#ffea00';
    restartButton.onmouseleave = () => restartButton.style.background = 'gold';
    overlay.appendChild(restartButton);

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
    `;
    document.head.appendChild(style);

    // Fade in
    setTimeout(() => { overlay.style.opacity = '1'; }, 50);

    // Restart action
    restartButton.onclick = () => {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
            if (typeof onRestart === 'function') onRestart();
        }, 500);
    };
}
