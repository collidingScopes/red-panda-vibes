// Game state
const gameState = {
    playerVelocity: new THREE.Vector3(),
    playerOnGround: false,
    keyStates: {},
    goalReached: false
};

// Scene setup with pastel sunset background
const scene = new THREE.Scene();

// FPS counter variables
let frameCount = 0;
let lastFpsUpdate = 0;
let fps = 0;

// Create a gradient background for sunset effect
const createSunsetBackground = () => {
    // Create a gradient texture
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    // Create a beautiful sunset gradient (top to bottom)
    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#6b88ff');    // Top: Soft blue
    gradient.addColorStop(0.3, '#a183e0');  // Upper middle: Soft purple
    gradient.addColorStop(0.5, '#e18ad4');  // Middle: Pink purple
    gradient.addColorStop(0.7, '#ffa7a7');  // Lower middle: Light pink
    gradient.addColorStop(1, '#ffcbb6');    // Bottom: Soft peach
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 2, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Adjust repeat setting to stretch the texture properly
    texture.repeat.set(1, 1);
    
    return texture;
};

// Apply sunset background
scene.background = createSunsetBackground();

// Softer pastel fog to match the scene
scene.fog = new THREE.Fog(0xa183e0, 150, 350);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

// Renderer setup with post-processing for dithering
const renderer = new THREE.WebGLRenderer({ antialias: false }); // Disable antialiasing for pixelated look
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows for better look
document.body.appendChild(renderer.domElement);

// Set up a low-resolution render target for pixelated look
const pixelRatio = 2.0; // Changed from 0.35 to 0.7 as requested
renderer.setPixelRatio(pixelRatio);

// Enhanced sunset lighting for more dramatic shadows
// Warm ambient light for sunset feel
const ambientLight = new THREE.AmbientLight(0xffe0c0, 0.4); // Warm amber glow
scene.add(ambientLight);

// Strong directional light with warm sunset color
const directionalLight = new THREE.DirectionalLight(0xff9966, 1.2); // Warm orange sunset
directionalLight.position.set(-30, 20, 30); // Position to create dramatic shadows
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
// Increase shadow darkness for more contrast
directionalLight.shadow.bias = -0.001;
scene.add(directionalLight);

// Add a secondary light for dramatic effect - cool blue to complement warm light
const secondaryLight = new THREE.DirectionalLight(0x84b9ff, 0.6); // Bluish light
secondaryLight.position.set(50, 30, -30);
scene.add(secondaryLight);

// Add some neon glow point lights scattered around
function addNeonLights() {
    // Neon colors from the reference image
    const neonColors = [
        0xff84f0, // Pink
        0x84ffef, // Cyan
        0xb3ff84, // Green
        0xffee84, // Yellow
        0xff84a1  // Red-pink
    ];
    
    for (let i = 0; i < 15; i++) {
        const color = neonColors[Math.floor(Math.random() * neonColors.length)];
        const intensity = 0.6 + Math.random() * 0.8;
        const radius = 2 + Math.random() * 3;
        
        const light = new THREE.PointLight(color, intensity, radius * 8);
        
        // Random position
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 80 + 10;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const y = getTerrainHeight(x, z) + (Math.random() * 4) + 0.5;
        
        light.position.set(x, y, z);
        scene.add(light);
    }
}

// Create player as a red panda using stacked boxes
function createRedPandaPlayer() {
    const playerGroup = new THREE.Group();
    
    // Body - pastel orange for the red panda
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.5, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff9966, // Pastel orange
        roughness: 0.5,
        metalness: 0.3,
        emissive: 0x331100, // Slight emissive glow
        emissiveIntensity: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.25;
    body.castShadow = true;
    playerGroup.add(body);
    
    // Head - pastel orange with white features
    const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.4);
    const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff9966, // Same pastel orange
        roughness: 0.5,
        metalness: 0.3,
        emissive: 0x331100, // Slight emissive glow
        emissiveIntensity: 0.2
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.75;
    head.position.z = 0.1;
    head.castShadow = true;
    playerGroup.add(head);
    
    // White face patches
    const faceGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.1);
    const whiteMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xfff4e0, // Warm white
        roughness: 0.4,
        metalness: 0.2,
        emissive: 0x333333, // Slight emissive glow
        emissiveIntensity: 0.1
    });
    const face = new THREE.Mesh(faceGeometry, whiteMaterial);
    face.position.y = 0.75;
    face.position.z = 0.35;
    face.castShadow = true;
    playerGroup.add(face);
    
    // Black ears
    const earGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const blackMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444, // Dark gray
        roughness: 0.5,
        metalness: 0.2
    });
    
    // Left ear
    const leftEar = new THREE.Mesh(earGeometry, blackMaterial);
    leftEar.position.set(-0.2, 1.05, 0.1);
    leftEar.castShadow = true;
    playerGroup.add(leftEar);
    
    // Right ear
    const rightEar = new THREE.Mesh(earGeometry, blackMaterial);
    rightEar.position.set(0.2, 1.05, 0.1);
    rightEar.castShadow = true;
    playerGroup.add(rightEar);
    
    // Nose
    const noseGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const nose = new THREE.Mesh(noseGeometry, blackMaterial);
    nose.position.set(0, 0.7, 0.45);
    nose.castShadow = true;
    playerGroup.add(nose);
    
    // Tail - reddish with striped pattern
    const tailGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.7);
    const tailMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff9966, // Pastel orange
        roughness: 0.5,
        metalness: 0.3,
        emissive: 0x331100, // Slight emissive glow
        emissiveIntensity: 0.2
    });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(0, 0.4, -0.6);
    tail.castShadow = true;
    playerGroup.add(tail);
    
    // Add stripes to tail (small boxes)
    const stripeGeometry = new THREE.BoxGeometry(0.32, 0.1, 0.2);
    const stripeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcc6633, // Darker orange
        roughness: 0.5,
        metalness: 0.2
    });
    
    // Add 3 stripes
    for(let i = 0; i < 3; i++) {
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.position.set(0, 0.4, -0.4 - (i * 0.2));
        stripe.castShadow = true;
        playerGroup.add(stripe);
    }
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.15);
    const legMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcc6633, // Dark orange
        roughness: 0.5,
        metalness: 0.2
    });
    
    // Front left leg
    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.position.set(-0.2, -0.125, 0.15);
    frontLeftLeg.castShadow = true;
    playerGroup.add(frontLeftLeg);
    
    // Front right leg
    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.position.set(0.2, -0.125, 0.15);
    frontRightLeg.castShadow = true;
    playerGroup.add(frontRightLeg);
    
    // Back left leg
    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.position.set(-0.2, -0.125, -0.15);
    backLeftLeg.castShadow = true;
    playerGroup.add(backLeftLeg);
    
    // Back right leg
    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.position.set(0.2, -0.125, -0.15);
    backRightLeg.castShadow = true;
    playerGroup.add(backRightLeg);
    
    return playerGroup;
}

// Create the red panda player
const player = createRedPandaPlayer();
player.position.set(0, 2, 0);
player.receiveShadow = true;
scene.add(player);

// PASTEL NEON STYLED TERRAIN SYSTEM
function createTerrain() {
    // Create a large flat base with soft gradient
    const baseGeometry = new THREE.BoxGeometry(400, 1, 400);
    // Create a gradient material for the base
    const baseTexture = createTerrainBaseTexture();
    const baseMaterial = new THREE.MeshStandardMaterial({
        map: baseTexture,
        roughness: 0.7,
        metalness: 0.1
    });
    
    const baseTerrain = new THREE.Mesh(baseGeometry, baseMaterial);
    baseTerrain.position.y = -0.5;
    baseTerrain.receiveShadow = true;
    scene.add(baseTerrain);
    
    // Create the actual terrain with hills using many small box segments
    const segmentSize = 10;
    const terrainSize = 200;
    const segments = Math.floor(terrainSize / segmentSize);
    const halfTerrainSize = terrainSize / 2;
    
    // Create hills group
    const hillsGroup = new THREE.Group();
    scene.add(hillsGroup);
    
    // Pastel neon colors from the reference image
    const pastelColors = [
        0xaae6ff, // Light blue
        0xbba1ff, // Lavender
        0xffaad5, // Pink
        0xa1ffbb, // Mint green
        0xffe1aa  // Peach
    ];
    
    // Generate terrain segments - with more flowing height variation
    for (let x = 0; x < segments; x++) {
        for (let z = 0; z < segments; z++) {
            const posX = (x * segmentSize) - halfTerrainSize + segmentSize/2;
            const posZ = (z * segmentSize) - halfTerrainSize + segmentSize/2;
            
            // Generate height variation with more flowing values
            const height = getTerrainHeight(posX, posZ);
            
            // Only create visible hills (if height > 0.2)
            if (height > 0.2) {
                const hillGeometry = new THREE.BoxGeometry(segmentSize, height, segmentSize);
                
                // Choose a pastel color with slight randomization
                const baseColor = pastelColors[Math.floor(Math.random() * pastelColors.length)];
                
                // Create a subtle color variation
                const color = new THREE.Color(baseColor);
                color.r += (Math.random() * 0.1 - 0.05);
                color.g += (Math.random() * 0.1 - 0.05);
                color.b += (Math.random() * 0.1 - 0.05);
                
                const hillMaterial = new THREE.MeshStandardMaterial({
                    color: color,
                    roughness: 0.7,
                    metalness: 0.1,
                    emissive: baseColor,
                    emissiveIntensity: 0.05 // Subtle glow
                });
                
                const hill = new THREE.Mesh(hillGeometry, hillMaterial);
                hill.position.set(posX, height/2, posZ);
                hill.receiveShadow = true;
                hill.castShadow = true;
                hillsGroup.add(hill);
            }
        }
    }
    
    // Add the neon glow lights
    addNeonLights();
    
    return hillsGroup;
}

// Create a gradient texture for the terrain base
function createTerrainBaseTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    // Create a radial gradient
    const gradient = context.createRadialGradient(
        256, 256, 0,
        256, 256, 384
    );
    
    gradient.addColorStop(0, '#a1e6ff'); // Center: Light blue
    gradient.addColorStop(0.3, '#c4a1ff'); // Middle: Light purple
    gradient.addColorStop(0.6, '#ffa1e6'); // Outer middle: Pink
    gradient.addColorStop(1, '#84ffbb'); // Edge: Mint green
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Enhanced terrain height function with more flowing hills
function getTerrainHeight(x, z) {
    // More flowing rolling hills using sine waves with different frequencies
    const hillHeight = Math.sin(x * 0.03) * Math.cos(z * 0.03) * 12 + 
                     Math.sin(x * 0.07 + z * 0.05) * 4;
    
    // Add medium terrain variations
    const mediumNoise = Math.sin(x * 0.1 + 1.5) * Math.cos(z * 0.08 + 2.3) * 5;
    
    // Combine all variations and ensure we have positive heights
    return Math.max(0, (hillHeight + mediumNoise) * 0.5);
}

const terrain = createTerrain();

// Create neon-styled flag pole with rainbow flag
function createFlagPole() {
    const group = new THREE.Group();
    
    // CHANGE: Make the pole taller (increased from 10 to 20)
    const poleGeometry = new THREE.BoxGeometry(0.5, 20, 0.5); // Doubled height
    const poleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, // White color
        roughness: 0.3,
        metalness: 0.8,
        emissive: 0xaaaaff, // Subtle blue glow
        emissiveIntensity: 0.4
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 10; // Adjusted to center the taller pole
    pole.castShadow = true;
    
    // CHANGE: Create a rainbow gradient flag
    // Create a canvas for the rainbow gradient
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    
    // Create a vibrant rainbow gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, '#ff1a8c'); // Hot pink
    gradient.addColorStop(0.16, '#ff1a1a'); // Bright red
    gradient.addColorStop(0.33, '#ffaa00'); // Orange
    gradient.addColorStop(0.5, '#ffff00'); // Yellow
    gradient.addColorStop(0.66, '#1aff1a'); // Green
    gradient.addColorStop(0.83, '#00ccff'); // Cyan
    gradient.addColorStop(1, '#cc66ff'); // Purple
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 150);
    
    // Create a texture from the canvas
    const flagTexture = new THREE.CanvasTexture(canvas);
    flagTexture.needsUpdate = true;
    
    // Create the flag with the rainbow texture
    const flagGeometry = new THREE.PlaneGeometry(4, 2); // Made larger for better visibility
    const flagMaterial = new THREE.MeshBasicMaterial({ 
        map: flagTexture,
        side: THREE.DoubleSide,
        // emissive: 0xffffff,
        // emissiveIntensity: 0.8 // Increased glow
    });
    const flag = new THREE.Mesh(flagGeometry, flagMaterial);
    flag.position.set(2, 18, 0); // Position higher on the taller pole
    flag.castShadow = true;
    
    group.add(pole);
    group.add(flag);
    
    // Add a brighter light for the flag to make it more visible from a distance
    const flagLight = new THREE.PointLight(0xffffff, 2, 15); // Brighter white light
    flagLight.position.set(2, 16, 0); // Position at the flag
    flagLight.castShadow = false;
    group.add(flagLight);
    
    // Position the flag pole far away from the starting point
    const x = 50;
    const z = 50;
    const y = getTerrainHeight(x, z);
    group.position.set(x, y, z);
    
    scene.add(group);
    return group;
}

const flagPole = createFlagPole();

// Create pastel neon styled obstacles
function createObstacles() {
    const obstacles = [];
    
    // Create crystals instead of rocks (reduced count and removed individual lights to stay within WebGL limits)
    for (let i = 0; i < 20; i++) { // Reduced from 40 to 20
        const crystalSize = Math.random() * 1.5 + 0.8;
        // Use pyramid/cones for crystal look
        const crystalGeometry = new THREE.ConeGeometry(crystalSize * 0.6, crystalSize * 1.5, 4, 1);
        
        // Neon pastel colors from the image
        const crystalColors = [
            0xff9ee6, // Pink
            0x9eecff, // Cyan
            0xccff9e, // Green
            0xffe79e, // Yellow
            0xce9eff  // Purple
        ];
        const crystalColor = crystalColors[Math.floor(Math.random() * crystalColors.length)];
        
        const crystalMaterial = new THREE.MeshStandardMaterial({ 
            color: crystalColor,
            roughness: 0.2,
            metalness: 0.3,
            transparent: true,
            opacity: 0.8,
            emissive: crystalColor,
            emissiveIntensity: 0.5 // Increased from 0.3 to 0.5 for brighter glow
        });
        
        const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
        
        // Position crystals randomly around the map
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 80 + 10;
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        // Make sure crystals are on the terrain
        const terrainHeight = getTerrainHeight(x, z);
        crystal.position.set(x, terrainHeight + crystalSize * 0.5, z);
        
        // Add random rotation for variety
        crystal.rotation.x = (Math.random() - 0.5) * 0.2;
        crystal.rotation.y = Math.random() * Math.PI;
        crystal.rotation.z = (Math.random() - 0.5) * 0.2;
        
        crystal.castShadow = true;
        crystal.receiveShadow = true;
        
        // Removed individual point lights inside crystal to reduce uniform count
        // Using stronger emissive instead
        
        scene.add(crystal);
        obstacles.push(crystal);
    }
    
    // Create pastel-styled trees
    for (let i = 0; i < 30; i++) {
        const tree = createPastelTree();
        
        // Position trees randomly around the map
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 80 + 15;
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        // Make sure trees are on the terrain
        const terrainHeight = getTerrainHeight(x, z);
        tree.position.set(x, terrainHeight, z);
        
        scene.add(tree);
        obstacles.push(tree);
    }
    
    // Create glowing flowers
    for (let i = 0; i < 500; i++) {
        const flowerGroup = createNeonFlowerPatch();
        
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 90 + 5;
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        const terrainHeight = getTerrainHeight(x, z);
        flowerGroup.position.set(x, terrainHeight, z);
        
        scene.add(flowerGroup);
    }
    
    return obstacles;
}

function createPastelTree() {
    const treeGroup = new THREE.Group();
    
    // Tree trunk - box for retro blockiness with warm color
    const trunkGeometry = new THREE.BoxGeometry(0.6, 2, 0.6);
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xd9a066,
        roughness: 0.8,
        metalness: 0.1,
        emissive: 0x331100,
        emissiveIntensity: 0.1
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1;
    trunk.castShadow = true;
    
    // Choose from pastel colors for the foliage
    const foliageColors = [
        0xa1ffcc, // Mint
        0xe2a1ff, // Lavender
        0xf9a1ff, // Pink
        0xffa1a1, // Peach
        0xa1f9ff  // Cyan
    ];
    const foliageColor = foliageColors[Math.floor(Math.random() * foliageColors.length)];
    
    // Tree foliage - rounded cone for soft look
    const foliageGeometry = new THREE.ConeGeometry(2, 4, 8); // More sides for smoother look
    const foliageMaterial = new THREE.MeshStandardMaterial({ 
        color: foliageColor,
        roughness: 0.7,
        metalness: 0.1,
        emissive: foliageColor,
        emissiveIntensity: 0.6 // Increased from 0.2 to 0.6 for stronger glow
    });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = 3;
    foliage.castShadow = true;
    
    // Removed point light to reduce uniform count
    // Using stronger emissive instead
    
    treeGroup.add(trunk);
    treeGroup.add(foliage);
    
    return treeGroup;
}

function createNeonFlowerPatch() {
    const flowerGroup = new THREE.Group();
    
    // Create 2-4 flowers in a small patch
    const flowerCount = Math.floor(Math.random() * 3) + 2;
    
    // Bright neon colors matching the image
    const colors = [
        0xff84d9, // Pink
        0x84ffee, // Cyan
        0xa2ff84, // Green
        0xffee84, // Yellow
        0xd084ff  // Purple
    ];
    
    for (let i = 0; i < flowerCount; i++) {
        // Simple boxes for stem and flower but with glow
        const stemGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
        const stemMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x84ffa2,
            emissive: 0x84ffa2,
            emissiveIntensity: 0.4 // Increased from 0.3
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 0.2;
        
        // Flower head - using sphere for softer look
        const flowerColor = colors[Math.floor(Math.random() * colors.length)];
        const flowerGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const flowerMaterial = new THREE.MeshStandardMaterial({ 
            color: flowerColor,
            roughness: 0.6,
            metalness: 0.3,
            emissive: flowerColor,
            emissiveIntensity: 0.8 // Increased from 0.5 for stronger glow
        });
        const flowerHead = new THREE.Mesh(flowerGeometry, flowerMaterial);
        flowerHead.position.y = 0.5;
        
        // Removed point light to reduce uniform count
        // Using stronger emissive instead
        
        const flower = new THREE.Group();
        flower.add(stem);
        flower.add(flowerHead);
        
        // Position flower within the patch
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 0.5;
        flower.position.x = Math.cos(angle) * distance;
        flower.position.z = Math.sin(angle) * distance;
        
        flowerGroup.add(flower);
    }
    
    return flowerGroup;
}

const obstacles = createObstacles();

// Input handling
document.addEventListener('keydown', (event) => {
    gameState.keyStates[event.code] = true;
});

document.addEventListener('keyup', (event) => {
    gameState.keyStates[event.code] = false;
});

// Add event listener for closing the instructions
document.getElementById('close-instructions').addEventListener('click', () => {
    document.getElementById('instructions').style.display = 'none';
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(pixelRatio); // Maintain pixelated look on resize
});

// Game physics and movement
function updatePlayerPosition(deltaTime) {
    if (gameState.goalReached) return;
    
    const speed = 5.0;
    const jumpForce = 8.0;
    const gravity = 20.0;
    
    // Ground check
    const playerPos = player.position.clone();
    const groundHeight = getTerrainHeight(playerPos.x, playerPos.z);
    gameState.playerOnGround = playerPos.y <= groundHeight + 0.5;
    
    // Apply gravity
    if (!gameState.playerOnGround) {
        gameState.playerVelocity.y -= gravity * deltaTime;
    } else {
        gameState.playerVelocity.y = Math.max(0, gameState.playerVelocity.y);
        
        // Snap to ground if on ground - improved to prevent sinking
        if (playerPos.y < groundHeight + 0.5) {
            player.position.y = groundHeight + 0.5;
        }
    }
    
    // Handle jumping
    if (gameState.keyStates['Space'] && gameState.playerOnGround) {
        gameState.playerVelocity.y = jumpForce;
    }
    
    // Movement direction (in camera space)
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    if (gameState.keyStates['KeyW']) moveDirection.z = 1;
    if (gameState.keyStates['KeyS']) moveDirection.z = -1;
    if (gameState.keyStates['KeyA']) moveDirection.x = 1;
    if (gameState.keyStates['KeyD']) moveDirection.x = -1;
    
    moveDirection.normalize();
    
    // Convert movement from camera space to world space
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    
    const cameraRight = new THREE.Vector3(cameraDirection.z, 0, -cameraDirection.x);
    
    const worldMoveDirection = new THREE.Vector3();
    worldMoveDirection.addScaledVector(cameraRight, moveDirection.x);
    worldMoveDirection.addScaledVector(cameraDirection, moveDirection.z);
    
    // Apply movement
    if (worldMoveDirection.length() > 0) {
        worldMoveDirection.normalize();
        
        // Calculate new position
        const moveDelta = worldMoveDirection.clone().multiplyScalar(speed * deltaTime);
        player.position.add(moveDelta);
        
        // Adjust player to terrain height - improved to prevent sinking
        const newGroundHeight = getTerrainHeight(player.position.x, player.position.z);
        
        // Only adjust height if we're on the ground, and make sure player stays on top
        if (gameState.playerOnGround) {
            player.position.y = newGroundHeight + 0.5; // Keep player on top of terrain
        }
        
        // Rotate player to face direction of movement
        player.lookAt(player.position.clone().add(worldMoveDirection));
    }
    
    // Apply vertical velocity (gravity/jumping)
    player.position.y += gameState.playerVelocity.y * deltaTime;
    
    // Prevent player from sinking too much when landing on hills
    const currentGroundHeight = getTerrainHeight(player.position.x, player.position.z);
    if (player.position.y < currentGroundHeight + 0.5 && gameState.playerVelocity.y <= 0) {
        player.position.y = currentGroundHeight + 0.5;
        gameState.playerVelocity.y = 0;
    }
    
    // Update camera position
    updateCamera();
    
    // Check for goal (flag pole)
    const distanceToGoal = player.position.distanceTo(flagPole.position);
    if (distanceToGoal < 3) {
        gameState.goalReached = true;
        document.getElementById('goal-message').style.display = 'block';
    }
}

// Camera controls
let cameraAngleHorizontal = 0;
let cameraAngleVertical = 0;
const cameraDistance = 5;
// Add min and max for vertical camera angle to prevent looking below ground
const MIN_VERTICAL_ANGLE = -Math.PI/8; // Minimum (looking up)
const MAX_VERTICAL_ANGLE = Math.PI/6;  // Maximum (looking down, but not below ground)

function updateCamera() {
    // Update camera angles based on arrow key inputs
    if (gameState.keyStates['ArrowLeft']) cameraAngleHorizontal += 0.03;
    if (gameState.keyStates['ArrowRight']) cameraAngleHorizontal -= 0.03;
    // Apply the min/max vertical angle limits
    if (gameState.keyStates['ArrowUp']) cameraAngleVertical = Math.max(cameraAngleVertical - 0.03, MIN_VERTICAL_ANGLE);
    if (gameState.keyStates['ArrowDown']) cameraAngleVertical = Math.min(cameraAngleVertical + 0.03, MAX_VERTICAL_ANGLE);
    
    const playerPos = player.position.clone();
    
    // Calculate camera position with orbit controls
    const horizontalDistance = cameraDistance * Math.cos(cameraAngleVertical);
    const verticalDistance = cameraDistance * Math.sin(cameraAngleVertical);
    
    const cameraX = playerPos.x + horizontalDistance * Math.sin(cameraAngleHorizontal);
    const cameraZ = playerPos.z + horizontalDistance * Math.cos(cameraAngleHorizontal);
    const cameraY = playerPos.y + 1.5 + verticalDistance; // 1.5 is a height offset
    
    camera.position.set(cameraX, cameraY, cameraZ);
    camera.lookAt(new THREE.Vector3(playerPos.x, playerPos.y + 1, playerPos.z));
}

// Collision detection
function checkCollisions() {
    const playerRadius = 0.25;
    const playerPos = player.position.clone();
    
    for (const obstacle of obstacles) {
        // Simple sphere-based collision
        const obstaclePos = new THREE.Vector3().setFromMatrixPosition(obstacle.matrixWorld);
        const distance = playerPos.distanceTo(obstaclePos);
        
        // Assuming obstacle radius as 1 for simplicity
        const minDistance = playerRadius + 1;
        
        if (distance < minDistance) {
            // Push player away from obstacle
            const pushDirection = playerPos.clone().sub(obstaclePos).normalize();
            player.position.add(pushDirection.multiplyScalar(minDistance - distance));
        }
    }
}

function resetGame() {
    player.position.set(0, 2, 0);
    gameState.playerVelocity.set(0, 0, 0);
    gameState.goalReached = false;
    document.getElementById('goal-message').style.display = 'none';
}

// Animation loop
let lastTime = 0;

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    // Skip first frame
    if (isNaN(deltaTime) || deltaTime > 0.1) return;

    // Update FPS counter
    frameCount++;
    if (currentTime >= lastFpsUpdate + 1000) {
        fps = Math.round(frameCount * 1000 / (currentTime - lastFpsUpdate));
        document.getElementById('fps-counter').textContent = `FPS: ${fps}`;
        frameCount = 0;
        lastFpsUpdate = currentTime;
    }
    
    updatePlayerPosition(deltaTime);
    checkCollisions();
    
    // Add subtle continuous animation to glowing elements
    const time = currentTime * 0.001; // Convert to seconds
    
    // Add special animation for the rainbow flag
    // Make the flag wave gently
    const flagMesh = flagPole.children[1]; // The flag is the second child of the flagPole group
    if (flagMesh) {
        flagMesh.rotation.y = Math.sin(time * 4.0) * 0.1;
        flagMesh.position.z = Math.sin(time * 4.0) * 0.2; // Add some subtle z-movement
    }
    
    renderer.render(scene, camera);
}

animate();