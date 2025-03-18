// Game state
const gameState = {
    playerVelocity: new THREE.Vector3(),
    playerOnGround: false,
    keyStates: {},
    goalReached: false
};

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x181818); // Dark background for higher contrast

// Reduced fog for higher contrast
scene.fog = new THREE.Fog(0x181818, 150, 300);

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
const pixelRatio = 0.7; // Changed from 0.35 to 0.7 as requested
renderer.setPixelRatio(pixelRatio);

// Enhanced lighting for more dramatic shadows
// Dim ambient light for deeper shadows
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// Strong directional light for harsh shadows
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(30, 100, 50);
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

// Add a secondary light for dramatic effect
const secondaryLight = new THREE.DirectionalLight(0x6666ff, 0.5); // Bluish light
secondaryLight.position.set(-50, 30, -30);
scene.add(secondaryLight);

// Create player as a red panda using stacked boxes
function createRedPandaPlayer() {
    const playerGroup = new THREE.Group();
    
    // Body - reddish brown
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.5, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xC04000, // Reddish brown color
        roughness: 0.5,
        metalness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.25;
    body.castShadow = true;
    playerGroup.add(body);
    
    // Head - reddish brown with white features
    const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.4);
    const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xC04000, // Same reddish brown
        roughness: 0.5,
        metalness: 0.2
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.75;
    head.position.z = 0.1;
    head.castShadow = true;
    playerGroup.add(head);
    
    // White face patches
    const faceGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.1);
    const whiteMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF, // White
        roughness: 0.5,
        metalness: 0.1
    });
    const face = new THREE.Mesh(faceGeometry, whiteMaterial);
    face.position.y = 0.75;
    face.position.z = 0.35;
    face.castShadow = true;
    playerGroup.add(face);
    
    // Black ears
    const earGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const blackMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222, // Black
        roughness: 0.5,
        metalness: 0.1
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
        color: 0xC04000, // Reddish
        roughness: 0.5,
        metalness: 0.2
    });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(0, 0.4, -0.6);
    tail.castShadow = true;
    playerGroup.add(tail);
    
    // Add stripes to tail (small boxes)
    const stripeGeometry = new THREE.BoxGeometry(0.32, 0.1, 0.2);
    const stripeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x663300, // Darker brown
        roughness: 0.5,
        metalness: 0.1
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
        color: 0x663300, // Dark brown
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

// RETRO STYLED TERRAIN SYSTEM
function createTerrain() {
    // Create a large flat base with a box
    const baseGeometry = new THREE.BoxGeometry(400, 1, 400);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x006600, // Darker green for base
        roughness: 0.9,
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
    
    // Generate terrain segments - with more dramatic height variation
    for (let x = 0; x < segments; x++) {
        for (let z = 0; z < segments; z++) {
            const posX = (x * segmentSize) - halfTerrainSize + segmentSize/2;
            const posZ = (z * segmentSize) - halfTerrainSize + segmentSize/2;
            
            // Generate height variation with more extreme values
            const height = getTerrainHeight(posX, posZ);
            
            // Only create visible hills (if height > 0.2)
            if (height > 0.2) {
                const hillGeometry = new THREE.BoxGeometry(segmentSize, height, segmentSize);
                
                // Use a limited retro color palette - just a few shades of green
                const greenShades = [0x00ff00, 0x00cc00, 0x009900, 0x006600];
                const hillColor = greenShades[Math.floor(Math.random() * greenShades.length)];
                
                const hillMaterial = new THREE.MeshStandardMaterial({
                    color: hillColor,
                    roughness: 0.9,
                    metalness: 0.0
                });
                
                const hill = new THREE.Mesh(hillGeometry, hillMaterial);
                hill.position.set(posX, height/2, posZ);
                hill.receiveShadow = true;
                hill.castShadow = true;
                hillsGroup.add(hill);
            }
        }
    }
    
    // Add retro-styled grass clumps (reduced number)
    addRetroGrassClumps(terrainSize);
    
    return hillsGroup;
}

// Enhanced terrain height function with more dramatic hills
function getTerrainHeight(x, z) {
    // More dramatic rolling hills
    const hillHeight = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 12; 
    
    // Add medium terrain variations with higher amplitude
    const mediumNoise = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 6;
    
    // Combine all variations and ensure we have positive heights
    return Math.max(0, (hillHeight + mediumNoise) * 0.5);
}

function addRetroGrassClumps(terrainSize) {
    // Create simplified grass for retro look - just use small boxes
    const grassGeometry = new THREE.BoxGeometry(0.4, 0.8, 0.4);
    
    // Limited palette for retro look
    const grassColors = [0x00ff00, 0x00dd00, 0x00bb00]; 
    const grassMaterials = grassColors.map(color => 
        new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.8
        })
    );
    
    // Reduced number of grass clumps as requested
    const grassCount = 400; // Reduced from 1000
    const halfSize = terrainSize / 2;
    
    for (let i = 0; i < grassCount; i++) {
        const x = Math.random() * terrainSize - halfSize;
        const z = Math.random() * terrainSize - halfSize;
        
        // Get terrain height at this point
        const terrainHeight = getTerrainHeight(x, z);
        
        // Simple grass box
        const grassMaterial = grassMaterials[Math.floor(Math.random() * grassMaterials.length)];
        const grass = new THREE.Mesh(grassGeometry, grassMaterial);
        
        // Position just above terrain with slight random rotation
        grass.position.set(x, terrainHeight + 0.4, z);
        grass.rotation.y = Math.random() * Math.PI;
        
        // Random slight scaling
        const scale = 0.7 + Math.random() * 0.6;
        grass.scale.set(scale, scale, scale);
        
        grass.castShadow = true;
        grass.receiveShadow = true;
        
        scene.add(grass);
    }
}

const terrain = createTerrain();

// Create retro-styled flag pole
function createFlagPole() {
    const group = new THREE.Group();
    
    // Pole - simpler geometry for retro look
    const poleGeometry = new THREE.BoxGeometry(0.5, 10, 0.5); // Box instead of cylinder
    const poleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xaaaaaa, // Silver color
        roughness: 0.4,
        metalness: 0.8
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 5;
    pole.castShadow = true;
    
    // Flag - bright red for high visibility
    const flagGeometry = new THREE.PlaneGeometry(3, 1.5);
    const flagMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, // Bright red
        side: THREE.DoubleSide
    });
    const flag = new THREE.Mesh(flagGeometry, flagMaterial);
    flag.position.set(1.5, 8, 0);
    flag.castShadow = true;
    
    group.add(pole);
    group.add(flag);
    
    // Position the flag pole far away from the starting point
    const x = 50;
    const z = 50;
    const y = getTerrainHeight(x, z);
    group.position.set(x, y, z);
    
    scene.add(group);
    return group;
}

const flagPole = createFlagPole();

// Create retro-styled obstacles
function createObstacles() {
    const obstacles = [];
    
    // Create blocky rocks for retro look
    for (let i = 0; i < 40; i++) {
        const rockSize = Math.random() * 1.5 + 0.8;
        // Use cube or octahedron for blockier look
        const rockGeometry = Math.random() > 0.5 ? 
            new THREE.BoxGeometry(rockSize, rockSize, rockSize) : 
            new THREE.OctahedronGeometry(rockSize, 0);
        
        // Limited gray palette
        const grayShades = [0x666666, 0x888888, 0xaaaaaa];
        const rockColor = grayShades[Math.floor(Math.random() * grayShades.length)];
        
        const rockMaterial = new THREE.MeshStandardMaterial({ 
            color: rockColor,
            roughness: 0.9
        });
        
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        
        // Position rocks randomly around the map
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 80 + 10;
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        // Make sure rocks are on the terrain
        const terrainHeight = getTerrainHeight(x, z);
        rock.position.set(x, terrainHeight + rockSize * 0.5, z);
        
        // Add random rotation for variety
        rock.rotation.x = Math.random() * Math.PI;
        rock.rotation.y = Math.random() * Math.PI;
        rock.rotation.z = Math.random() * Math.PI;
        
        rock.castShadow = true;
        rock.receiveShadow = true;
        
        scene.add(rock);
        obstacles.push(rock);
    }
    
    // Create retro-styled trees
    for (let i = 0; i < 30; i++) {
        const tree = createRetroTree();
        
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
    
    // Create retro flowers (simple colored boxes) - Increased count as requested
    for (let i = 0; i < 200; i++) { // Increased from 80
        const flowerGroup = createRetroFlowerPatch();
        
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

function createRetroTree() {
    const treeGroup = new THREE.Group();
    
    // Tree trunk - box for retro blockiness
    const trunkGeometry = new THREE.BoxGeometry(0.6, 2, 0.6);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1;
    trunk.castShadow = true;
    
    // Tree foliage - pyramid for retro look
    const foliageGeometry = new THREE.ConeGeometry(2, 4, 4); // 4-sided pyramid
    const foliageMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00aa00, 
        roughness: 0.8 
    });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = 3;
    foliage.castShadow = true;
    
    treeGroup.add(trunk);
    treeGroup.add(foliage);
    
    return treeGroup;
}

function createRetroFlowerPatch() {
    const flowerGroup = new THREE.Group();
    
    // Create 2-4 flowers in a small patch
    const flowerCount = Math.floor(Math.random() * 3) + 2;
    const colors = [0xff0000, 0xff00ff, 0xffff00, 0x0000ff, 0xffffff]; // Bright primary colors
    
    for (let i = 0; i < flowerCount; i++) {
        // Simple boxes for stem and flower
        const stemGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
        const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 0.2;
        
        // Flower head - just a cube
        const flowerGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const flowerMaterial = new THREE.MeshStandardMaterial({ 
            color: colors[Math.floor(Math.random() * colors.length)],
            emissive: 0x111111 // Slight glow
        });
        const flowerHead = new THREE.Mesh(flowerGeometry, flowerMaterial);
        flowerHead.position.y = 0.5;
        
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

function updateCamera() {
    // Update camera angles based on arrow key inputs
    if (gameState.keyStates['ArrowLeft']) cameraAngleHorizontal += 0.03;
    if (gameState.keyStates['ArrowRight']) cameraAngleHorizontal -= 0.03;
    if (gameState.keyStates['ArrowUp']) cameraAngleVertical = Math.max(cameraAngleVertical - 0.03, -Math.PI/4);
    if (gameState.keyStates['ArrowDown']) cameraAngleVertical = Math.min(cameraAngleVertical + 0.03, Math.PI/4);
    
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
    
    updatePlayerPosition(deltaTime);
    checkCollisions();
    
    // Simple dithering implementation using the standard renderer
    // Full shader-based dithering would require more setup
    renderer.render(scene, camera);
}

animate();