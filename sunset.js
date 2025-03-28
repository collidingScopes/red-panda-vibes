// Create a glowing sun
function createSun() {
    const sunGroup = new THREE.Group();
    let resolution = 20;
    // Main sun disc
    const sunGeometry = new THREE.CircleGeometry(20, resolution);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffdd00,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });
    
    const sunDisc = new THREE.Mesh(sunGeometry, sunMaterial);
    
    // Add outer glow
    const glowGeometry = new THREE.CircleGeometry(25, resolution);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.z = -0.1; // Place slightly behind main disc

    // Add outer glow2
    const glowGeometry2 = new THREE.CircleGeometry(30, resolution);
    const glowMaterial2 = new THREE.MeshBasicMaterial({
        color: 0xff6c00,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });
    
    const glow2 = new THREE.Mesh(glowGeometry2, glowMaterial2);
    glow2.position.z = -0.2; // Place slightly behind main disc
    
    // Add everything to the group
    sunGroup.add(sunDisc);
    sunGroup.add(glow);
    sunGroup.add(glow2);

    // Position the sun more visibly in the scene
    // We'll use the same general direction as the light (-25, 20, 30) but closer
    sunGroup.position.set(-180, 10, 190); // Positioned for visibility
    sunGroup.rotation.y = Math.PI / 1.3; // Angle toward the player
    // Make the sun discs larger for better visibility
    let scale = 2;
    sunDisc.scale.set(scale, scale, scale);
    glow.scale.set(scale, scale, scale);
    glow2.scale.set(scale, scale, scale);

    return sunGroup;
}

// Main function to create the complete sunset environment
function createSunsetEnvironment(scene) {

    // Create and add the sun
    const sun = createSun();
    scene.add(sun);
    
    // Log sun position for debugging
    console.log("Sunset sun created at position:", sun.position);

}