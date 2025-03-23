// Create a customizable gradient background
const createGradientBackground = (colorStops = null) => {
    const canvas = getCanvas(2, 512);
    const context = canvas.getContext('2d');
    
    // Create a linear gradient (top to bottom)
    const gradient = context.createLinearGradient(0, 0, 0, 512);
    
    // Use provided color stops or default to sunset gradient
    if (colorStops && Array.isArray(colorStops) && colorStops.length > 0) {
        // Apply custom color stops
        colorStops.forEach(stop => {
            gradient.addColorStop(stop.position, stop.color);
        });
    } else {
        // Default sunset gradient
        gradient.addColorStop(0, '#6b88ff');    // Top: Soft blue
        gradient.addColorStop(0.3, '#a183e0');  // Upper middle: Soft purple
        gradient.addColorStop(0.5, '#e18ad4');  // Middle: Pink purple
        gradient.addColorStop(0.7, '#ffa7a7');  // Lower middle: Light pink
        gradient.addColorStop(1, '#ffcbb6');    // Bottom: Soft peach
    }
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 2, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.repeat.set(1, 1);
    
    return texture;
};

// Set the background with the new function
function updateBackground(colorStops = null) {
    scene.background = createGradientBackground(colorStops);
}

// Night sky gradient
const nightSky = [
    { position: 0, color: '#0a0e23' },    // Top: Dark blue
    { position: 0.3, color: '#1a1e3e' },  // Upper middle: Navy blue
    { position: 0.7, color: '#2d2950' },  // Lower middle: Deep purple blue
    { position: 1, color: '#3b2d50' }     // Bottom: Dark purple
];
// updateBackground(nightSky);

// Dawn gradient
const dawn = [
    { position: 0, color: '#082b4f' },    // Top: Deep blue
    { position: 0.2, color: '#1c5986' },  // Upper middle: Medium blue
    { position: 0.4, color: '#db5461' },  // Middle: Coral
    { position: 0.7, color: '#ffd4b8' },  // Lower middle: Peach
    { position: 1, color: '#fff1e0' }     // Bottom: Cream
];
// updateBackground(dawn);

// Midday gradient
const midday = [
    { position: 0, color: '#3f8cff' },    // Top: Bright blue
    { position: 0.5, color: '#a1c6ff' },  // Middle: Light blue
    { position: 1, color: '#e1f0ff' }     // Bottom: Pale blue
];
// updateBackground(midday);

/*
// Or create a custom gradient on the fly
updateBackground([
    { position: 0, color: '#ff0000' },   // Red at top
    { position: 1, color: '#0000ff' }    // Blue at bottom
  ]);
*/