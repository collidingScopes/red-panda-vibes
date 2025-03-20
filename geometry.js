// Color palette - consolidated repeated color definitions
const COLORS = {
    neon: [0xff84f0, 0x84ffef, 0xb3ff84, 0xffee84, 0xff84a1],
    pastel: [0xaae6ff, 0xbba1ff, 0xffaad5, 0xa1ffbb, 0xffe1aa],
    crystal: [0xff9ee6, 0x9eecff, 0xccff9e, 0xffe79e, 0xce9eff],
    foliage: [0xa1ffcc, 0xe2a1ff, 0xf9a1ff, 0xffa1a1, 0xa1f9ff],
    flower: [0xff84d9, 0x84ffee, 0xa2ff84, 0xffee84, 0xd084ff]
};

// Helper function to create canvas elements
function getCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

// Make getTerrainHeight function globally accessible
window.getTerrainHeight = function(x, z) {
    return Math.max(0, (
        Math.sin(x * 0.03) * Math.cos(z * 0.03) * 12 + 
        Math.sin(x * 0.07 + z * 0.05) * 4 +
        Math.sin(x * 0.1 + 1.5) * Math.cos(z * 0.08 + 2.3) * 5
    ) * 0.7 * (window.terrainHeightMultiplier || 1.0));
};

// Create a gradient background for sunset effect
const createSunsetBackground = () => {
    const canvas = getCanvas(2, 512);
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
    texture.repeat.set(1, 1);
    
    return texture;
};

// Create player using the provided 3D model
function createRedPandaPlayer() {
    const playerGroup = new THREE.Group();
    
    // Check if required THREE.js components are loaded
    if (typeof THREE === 'undefined') {
        console.error('THREE.js not loaded yet');
        return playerGroup;
    }
    
    // Try to initialize loader if it doesn't exist
    if (!THREE.GLTFLoader && window.ensureGLTFLoader) {
        window.ensureGLTFLoader();
    }
    
    // Load the GLB model
    // The loader is attached to THREE as a global reference
    const loader = THREE.GLTFLoader ? new THREE.GLTFLoader() : null;
    
    // Check if loader is available
    if (!loader) {
        console.error('GLTFLoader not available yet, using fallback panda');
        const fallbackPanda = createBlockPanda();
        playerGroup.add(fallbackPanda);
        
        // Notify game about fallback (without animations)
        if (window.setPandaModel) {
            window.setPandaModel(fallbackPanda, []);
        }
        
        return playerGroup;
    }
    
    // Create a placeholder until the model loads
    const placeholderGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const placeholderMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff9966,
        transparent: true,
        opacity: 0.5 // Semi-transparent placeholder
    });
    const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
    placeholder.castShadow = true;
    playerGroup.add(placeholder);
    
    // Load the 3D model
    loader.load(
        'assets/panda3DModel6.glb', // Note: Path corrected to match specified location
        (gltf) => {
            console.log('Panda model loaded successfully');
            
            // Extract animations if available
            const animations = gltf.animations || [];
            if (animations.length) {
                console.log(`Model contains ${animations.length} animations`);
            }
            
            // Scale the model appropriately
            const model = gltf.scene;
            model.scale.set(3.0, 3.0, 3.0); // Adjust scale as needed
            model.rotation.y = -Math.PI/2; //90 degree clockwise turn

            // Center the model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center); // Center the model
            
            // Adjust the y-position so the panda stands on the ground
            const size = box.getSize(new THREE.Vector3());
            model.position.y += size.y / 2;
            
            // Set up shadows
            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            
            // Add model to player group
            playerGroup.add(model);
            
            // Remove placeholder after model loads
            playerGroup.remove(placeholder);
            
            // Store model reference in gameState for animations
            if (window.setPandaModel) {
                window.setPandaModel(model, animations);
            }
        },
        (xhr) => {
            console.log(`Loading panda model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
        },
        (error) => {
            console.error('Error loading panda model:', error);
            
            // If model fails to load, use the original block-based panda
            console.log('Falling back to block-based panda');
            const fallbackPanda = createBlockPanda();
            playerGroup.add(fallbackPanda);
            playerGroup.remove(placeholder);
            
            // Notify game about fallback (without animations)
            if (window.setPandaModel) {
                window.setPandaModel(fallbackPanda, []);
            }
        }
    );
    
    return playerGroup;
}

// Create the original block-based panda as fallback
function createBlockPanda() {
    const pandaGroup = new THREE.Group();
    
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
    pandaGroup.add(body);
    
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
    pandaGroup.add(head);
    
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
    pandaGroup.add(face);
    
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
    pandaGroup.add(leftEar);
    
    // Right ear
    const rightEar = new THREE.Mesh(earGeometry, blackMaterial);
    rightEar.position.set(0.2, 1.05, 0.1);
    rightEar.castShadow = true;
    pandaGroup.add(rightEar);
    
    // Nose
    const noseGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const nose = new THREE.Mesh(noseGeometry, blackMaterial);
    nose.position.set(0, 0.7, 0.45);
    nose.castShadow = true;
    pandaGroup.add(nose);
    
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
    pandaGroup.add(tail);
    
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
        pandaGroup.add(stripe);
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
    pandaGroup.add(frontLeftLeg);
    
    // Front right leg
    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.position.set(0.2, -0.125, 0.15);
    frontRightLeg.castShadow = true;
    pandaGroup.add(frontRightLeg);
    
    // Back left leg
    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.position.set(-0.2, -0.125, -0.15);
    backLeftLeg.castShadow = true;
    pandaGroup.add(backLeftLeg);
    
    // Back right leg
    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.position.set(0.2, -0.125, -0.15);
    backRightLeg.castShadow = true;
    pandaGroup.add(backRightLeg);
    
    return pandaGroup;
}

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
    const segmentSize = 2;
    const terrainSize = 220;
    const segments = Math.floor(terrainSize / segmentSize);
    const halfTerrainSize = terrainSize / 2;
    
    // Create hills group
    const hillsGroup = new THREE.Group();
    scene.add(hillsGroup);
    
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
                const baseColor = COLORS.pastel[Math.floor(Math.random() * COLORS.pastel.length)];
                
                // Create a subtle color variation
                const color = new THREE.Color(baseColor);
                color.r += (Math.random() * 0.1 - 0.05);
                color.g += (Math.random() * 0.1 - 0.05);
                color.b += (Math.random() * 0.1 - 0.05);
                
                const hillMaterial = new THREE.MeshStandardMaterial({
                    color: color,
                    // roughness: 0.7,
                    // metalness: 0.1,
                    // emissive: baseColor,
                    // emissiveIntensity: 0.05 // Subtle glow
                });
                
                const hill = new THREE.Mesh(hillGeometry, hillMaterial);
                hill.position.set(posX, height/2, posZ);
                hill.receiveShadow = true;
                //hill.castShadow = true;
                hillsGroup.add(hill);
            }
        }
    }
    
    // Add the neon glow lights
    //addNeonLights();
    
    return hillsGroup;
}

// Create a gradient texture for the terrain base
function createTerrainBaseTexture() {
    const canvas = getCanvas(512, 512);
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

// Create stylized bamboo stalk (replaces flag pole)
function createFlagPole() {
    const group = new THREE.Group();
    
    // Create node rings (the slightly wider parts between segments)
    function createNodeRing(posY, radius) {
        const ringGeometry = new THREE.CylinderGeometry(radius/1.5, radius/1.5, 0.3, 12);
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22, // Darker green for nodes
            roughness: 0.8,
            metalness: 0.1
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.y = posY;
        ring.castShadow = true;
        return ring;
    }
    
    // Create a leaf cluster (small pointed leaves coming out from the node)
    function createLeafCluster(posY, radius) {
        const cluster = new THREE.Group();
        
        // Create 3-5 leaves in a fan arrangement
        const leafCount = 3 + Math.floor(Math.random() * 3);
        const baseAngle = Math.random() * Math.PI * 2; // Random starting angle
        
        for (let i = 0; i < leafCount; i++) {
            // Calculate angle for this leaf
            const angle = baseAngle + (i * (Math.PI / 2) / (leafCount - 1));
            
            // Create a simple triangle shape for the leaf
            const leafShape = new THREE.Shape();
            leafShape.moveTo(0, 0);
            leafShape.lineTo(0.6, 0.3);
            leafShape.lineTo(1+Math.random()*4, 0);
            leafShape.lineTo(Math.random(), -0.3);
            leafShape.lineTo(0, 0);
            
            const leafGeometry = new THREE.ShapeGeometry(leafShape);
            const leafMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x32CD32, // Lime green
                roughness: 0.8,
                side: THREE.DoubleSide
            });
            
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            
            // Position and rotate leaf
            leaf.position.set(
                Math.cos(angle) * (radius), 
                0,
                Math.sin(angle) * (radius)
            );
            
            // Rotate to face outward
            leaf.rotation.y = Math.PI/2 - angle;
            // Tilt slightly upward
            leaf.rotation.x = -Math.PI/6;
            
            cluster.add(leaf);
        }
        
        cluster.position.y = posY;
        return cluster;
    }
    
    // Create a full bamboo stalk that goes all the way to the ground
    const bambooHeight = 25; // Total height
    const bambooRadius = 0.7;

    // Add node rings at positions matching the image
    const nodePositions = [3, 7, 11, 15]; // Positions from bottom
    
    nodePositions.forEach(posY => {
        const ring = createNodeRing(posY, bambooRadius);
        group.add(ring);
        
        // Add leaf cluster at this node if it's not too close to the top
        if (posY < bambooHeight - 3) {
            const leafCluster = createLeafCluster(posY+Math.random()*4-2, bambooRadius);
            group.add(leafCluster);
        }
    });
    
    // Add a light to highlight the bamboo
    const bambooLight = new THREE.PointLight(0x00ff00, 1.5, 15); // Green light
    bambooLight.position.y = bambooHeight / 2; // Position at middle of bamboo
    bambooLight.castShadow = false;
    group.add(bambooLight);
    
    // Position the bamboo stalk far away from the starting point
    const x = 50;
    const z = 50;
    const y = getTerrainHeight(x, z);
    // Setting y position to terrain height directly (bamboo will grow from ground)
    group.position.set(x, y, z);
    
    scene.add(group);
    return group;
}

// Create pastel neon styled obstacles
function createObstacles() {
    const obstacles = [];
    
    // Create reusable geometries
    const baseCrystalGeometry = new THREE.ConeGeometry(0.6, 1.5, 4, 1);
    const stemGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const flowerGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    
    // Create crystals instead of rocks
    for (let i = 0; i < 20; i++) {
        const crystalSize = Math.random() * 1.5 + 0.8;
        const crystalColor = COLORS.crystal[Math.floor(Math.random() * COLORS.crystal.length)];
        
        const crystalMaterial = new THREE.MeshStandardMaterial({ 
            color: crystalColor,
            roughness: 0.2,
            metalness: 0.3,
            transparent: true,
            opacity: 0.8,
            emissive: crystalColor,
            emissiveIntensity: 0.5
        });
        
        const crystal = new THREE.Mesh(baseCrystalGeometry, crystalMaterial);
        crystal.scale.set(crystalSize, crystalSize, crystalSize);
        
        // Position crystals randomly around the map
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 80 + 10;
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        // Make sure crystals are on the terrain
        const terrainHeight = getTerrainHeight(x, z);
        crystal.position.set(x, terrainHeight + crystalSize * 0.3, z);
        
        // Add random rotation for variety
        crystal.rotation.x = (Math.random() - 0.5) * 0.2;
        crystal.rotation.y = Math.random() * Math.PI;
        crystal.rotation.z = (Math.random() - 0.5) * 0.2;
        
        crystal.castShadow = true;
        crystal.receiveShadow = true;
        
        scene.add(crystal);
        obstacles.push(crystal);
    }
    
    // Create pastel-styled trees
    for (let i = 0; i < 25; i++) {
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
    const stemMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x84ffa2,
        emissive: 0x84ffa2,
        emissiveIntensity: 0.4
    });
    
    for (let i = 0; i < 300; i++) {
        const flowerGroup = createNeonFlowerPatch(stemGeometry, flowerGeometry, stemMaterial);
        
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
    const foliageColor = COLORS.foliage[Math.floor(Math.random() * COLORS.foliage.length)];
    
    // Tree foliage - rounded cone for soft look
    const foliageGeometry = new THREE.ConeGeometry(2, 4, 8); // More sides for smoother look
    const foliageMaterial = new THREE.MeshStandardMaterial({ 
        color: foliageColor,
        roughness: 0.7,
        metalness: 0.1,
        emissive: foliageColor,
        emissiveIntensity: 0.6
    });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = 3;
    foliage.castShadow = true;
    
    treeGroup.add(trunk);
    treeGroup.add(foliage);
    
    return treeGroup;
}

function createNeonFlowerPatch(stemGeometry, flowerGeometry, stemMaterial) {
    const flowerGroup = new THREE.Group();
    
    // Create 2-4 flowers in a small patch
    const flowerCount = Math.floor(Math.random() * 3) + 2;
    
    for (let i = 0; i < flowerCount; i++) {
        const flowerColor = COLORS.flower[Math.floor(Math.random() * COLORS.flower.length)];
        const flowerMaterial = new THREE.MeshStandardMaterial({ 
            color: flowerColor,
            roughness: 0.6,
            metalness: 0.3,
            emissive: flowerColor,
            emissiveIntensity: 0.8
        });
        
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 0.2;
        
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

function createRiver() {
    console.log("Generating improved river...");
    // River group to hold all segments
    const riverGroup = new THREE.Group();
    
    // River settings
    const riverWidth = 20.0; // Width of the river (narrow enough to jump across)
    const segmentLength = 8.5; // Length of each river segment
    const riverLength = 8000; // Total river length (number of segments)
    const mapRadius = 150; // Approximate radius of walkable area
    const centerAttraction = 1.5; // How strongly the river is pulled toward the map center
    const noiseInfluence = 0.4; // How much terrain influences river direction
    const pathRandomness = 0.15; // Random variation in river direction
    const riverFloatHeight = 0.8; //amount of float above ground

    // Shimmering water material - semi-transparent with slight animation
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a9ff5, // Base blue color
        roughness: 0.1, // Very smooth surface
        metalness: 0.3, // Slightly metallic for light reflections
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide // Render both sides for better visibility
        /*
        emissive: 0x006699, // Slight blue glow
        emissiveIntensity: 0.2,
        */
    });
    
    // Find a starting point at the edge of the walkable area
    const startAngle = Math.random() * Math.PI * 2;
    const startX = Math.cos(startAngle) * mapRadius;
    const startZ = Math.sin(startAngle) * mapRadius;
    
    // Calculate the opposite direction (to flow across the map)
    const endAngle = startAngle + Math.PI; // Opposite direction
    const targetX = Math.cos(endAngle) * mapRadius;
    const targetZ = Math.sin(endAngle) * mapRadius;
    
    // Initialize river path
    let currentX = startX;
    let currentZ = startZ;
    let currentAngle = Math.atan2(targetZ - startZ, targetX - startX); // Initial angle toward target
    
    // Use simplex noise for more natural flow
    const simplex = new SimplexNoise();
    
    // Generate river path
    const riverPath = [];
    
    for (let i = 0; i < riverLength; i++) {
        // Store current point
        const terrainHeight = getTerrainHeight(currentX, currentZ);
        riverPath.push({
            x: currentX,
            z: currentZ,
            y: terrainHeight + riverFloatHeight, // Slightly above terrain
        });
        
        // Calculate direction to center for attraction
        const distanceFromCenter = Math.sqrt(currentX * currentX + currentZ * currentZ);
        const angleToCenter = Math.atan2(-currentZ, -currentX); // Angle toward center (0,0)
        
        // Calculate terrain gradient to influence flow direction (rivers tend to flow downhill)
        const gradientSampleDistance = 8.0;
        const heightRight = getTerrainHeight(currentX + gradientSampleDistance, currentZ);
        const heightLeft = getTerrainHeight(currentX - gradientSampleDistance, currentZ);
        const heightDown = getTerrainHeight(currentX, currentZ + gradientSampleDistance);
        const heightUp = getTerrainHeight(currentX, currentZ - gradientSampleDistance);
        
        const gradientX = (heightLeft - heightRight) / (2 * gradientSampleDistance);
        const gradientZ = (heightUp - heightDown) / (2 * gradientSampleDistance);
        
        const gradientAngle = Math.atan2(gradientZ, gradientX);
        
        // Get noise value for this position to add variation
        const noiseValue = simplex.noise2D(currentX * 0.01, currentZ * 0.01) * Math.PI;
        
        // Angle toward the end point (with decreasing influence as we get closer to center)
        const targetDirection = Math.atan2(targetZ - currentZ, targetX - currentX);
        const targetInfluence = Math.min(1.0, distanceFromCenter / mapRadius) * 0.4;
        
        // Combine all influences:
        // 1. General direction toward the target (with decreasing influence)
        // 2. Attraction toward the center (with increasing influence as we get further from center)
        // 3. Terrain gradient influence (rivers flow downhill)
        // 4. Noise for natural variation
        // 5. Small random factor for unpredictability
        let newAngle = currentAngle;
        
        newAngle += (targetDirection - currentAngle) * targetInfluence;
        newAngle += (angleToCenter - currentAngle) * centerAttraction * (distanceFromCenter / mapRadius);
        newAngle += (gradientAngle - currentAngle) * noiseInfluence;
        newAngle += noiseValue * noiseInfluence;
        newAngle += (Math.random() - 0.5) * pathRandomness;
        
        // Smooth the angle change for more natural flow
        currentAngle = currentAngle * 0.8 + newAngle * 0.2;
        
        // Move to next point
        currentX += Math.cos(currentAngle) * segmentLength;
        currentZ += Math.sin(currentAngle) * segmentLength;
        
        // Stop if we're beyond the map boundary
        if (Math.sqrt(currentX * currentX + currentZ * currentZ) > mapRadius * 1.2) {
            break;
        }
        
        // Also stop if we've reached the approximate opposite side
        const distanceToTarget = Math.sqrt(
            Math.pow(currentX - targetX, 2) + 
            Math.pow(currentZ - targetZ, 2)
        );
        
        if (distanceToTarget < mapRadius * 0.3) {
            break;
        }
    }
    
    // Create river segments from the generated path
    for (let i = 0; i < riverPath.length - 1; i++) {
        const start = riverPath[i];
        const end = riverPath[i + 1];
        
        // Calculate segment direction
        const direction = new THREE.Vector3(end.x - start.x, 0, end.z - start.z).normalize();
        
        // Calculate perpendicular direction for width
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
        
        // Calculate the length of this segment
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        
        // Create a custom geometry for the river segment that follows the terrain
        const points = [];
        const numSteps = 2; // More steps mean smoother terrain following
        
        // Create points for left bank
        for (let step = 0; step <= numSteps; step++) {
            const t = step / numSteps;
            const x = start.x + dx * t - perpendicular.x * riverWidth/2;
            const z = start.z + dz * t - perpendicular.z * riverWidth/2;
            const y = getTerrainHeight(x, z) + riverFloatHeight; // Slightly above terrain
            points.push(new THREE.Vector3(x, y, z));
        }
        
        // Create points for right bank (in reverse order)
        for (let step = numSteps; step >= 0; step--) {
            const t = step / numSteps;
            const x = start.x + dx * t + perpendicular.x * riverWidth/2;
            const z = start.z + dz * t + perpendicular.z * riverWidth/2;
            const y = getTerrainHeight(x, z) + riverFloatHeight; // Slightly above terrain
            points.push(new THREE.Vector3(x, y, z));
        }
        
        // Create shape
        const shape = new THREE.Shape();
        shape.moveTo(points[0].x, points[0].z);
        
        for (let j = 1; j < points.length; j++) {
            shape.lineTo(points[j].x, points[j].z);
        }
        
        shape.lineTo(points[0].x, points[0].z); // Close the shape
        
        // Create geometry from shape
        const geometry = new THREE.ShapeGeometry(shape);
        
        // Map vertices to 3D positions
        const positionAttribute = geometry.getAttribute('position');
        
        for (let j = 0; j < positionAttribute.count; j++) {
            const x = positionAttribute.getX(j);
            const z = positionAttribute.getY(j); // Y in shape becomes Z in 3D
            const y = getTerrainHeight(x, z) + riverFloatHeight; // Y is height above terrain with ripple
            positionAttribute.setXYZ(j, x, y, z);
        }
        
        geometry.computeVertexNormals();
        
        // Create the river segment
        const segment = new THREE.Mesh(geometry, waterMaterial.clone());
        riverGroup.add(segment);
    }
    
    // Add to scene
    scene.add(riverGroup);
    
    // Store river path in game state for collision detection
    if (window.gameState) {
        window.gameState.riverPath = riverPath;
        window.gameState.riverWidth = riverWidth;
    }
    
    return riverGroup;
}

// SimplexNoise implementation (simplified version)
// This is a basic implementation to avoid external dependencies
class SimplexNoise {
    constructor() {
        this.grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
        this.p = [];
        for (let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(Math.random() * 256);
        }
        
        // To remove the need for index wrapping, double the permutation table length
        this.perm = new Array(512);
        this.gradP = new Array(512);
        
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
            this.gradP[i] = this.grad3[this.perm[i] % 12];
        }
    }
    
    // 2D simplex noise
    noise2D(xin, yin) {
        // Skew the input space to determine which simplex cell we're in
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const G2 = (3 - Math.sqrt(3)) / 6;
        
        const s = (xin + yin) * F2; // Hairy factor for 2D
        let i = Math.floor(xin + s);
        let j = Math.floor(yin + s);
        
        const t = (i + j) * G2;
        const X0 = i - t; // Unskew the cell origin back to (x,y) space
        const Y0 = j - t;
        const x0 = xin - X0; // The x,y distances from the cell origin
        const y0 = yin - Y0;
        
        // Determine which simplex we are in
        let i1, j1;
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } else {
            i1 = 0;
            j1 = 1;
        }
        
        // Offsets for corners
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;
        
        // Wrap the integer indices at 256
        const ii = i & 255;
        const jj = j & 255;
        
        // Calculate the contribution from the three corners
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        let n0 = 0;
        
        if (t0 >= 0) {
            t0 *= t0;
            const gi0 = this.gradP[ii + this.perm[jj]];
            n0 = t0 * t0 * (gi0[0] * x0 + gi0[1] * y0);
        }
        
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        let n1 = 0;
        
        if (t1 >= 0) {
            t1 *= t1;
            const gi1 = this.gradP[ii + i1 + this.perm[jj + j1]];
            n1 = t1 * t1 * (gi1[0] * x1 + gi1[1] * y1);
        }
        
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        let n2 = 0;
        
        if (t2 >= 0) {
            t2 *= t2;
            const gi2 = this.gradP[ii + 1 + this.perm[jj + 1]];
            n2 = t2 * t2 * (gi2[0] * x2 + gi2[1] * y2);
        }
        
        // Add contributions from each corner to get the final noise value
        // The result is scaled to return values in the interval [-1, 1]
        return 70 * (n0 + n1 + n2);
    }
}

// Add river collision detection and effects to the game loop
function setupRiverGameplay() {
    // Skip if we don't have the river path
    if (!window.gameState || !window.gameState.riverPath) return;
    
    // Store the original update function
    const originalUpdatePlayerPosition = window.updatePlayerPosition;
    
    // Override with our modified function
    window.updatePlayerPosition = function(deltaTime) {
        // Call the original function first
        originalUpdatePlayerPosition(deltaTime);
        
        // Check for river collision
        checkRiverCollision();
    };
    
    // Function to check if player is in the river
    function checkRiverCollision() {
        // Skip if game is over
        if (window.gameState.gameOver) return;
        
        const player = window.player;
        const riverPath = window.gameState.riverPath;
        const riverWidth = window.gameState.riverWidth;
        
        // Check each river segment
        for (let i = 0; i < riverPath.length - 1; i++) {
            const start = riverPath[i];
            const end = riverPath[i + 1];
            
            // Calculate distance to line segment (river segment)
            const distanceToRiver = distanceToLineSegment(
                player.position.x, player.position.z,
                start.x, start.z,
                end.x, end.z
            );
            
            // If player is in the river and not jumping high enough
            if (distanceToRiver < riverWidth/2) {
                // Add a slight slowing effect in the river
                if (gameState.playerVelocity.x !== 0 || gameState.playerVelocity.z !== 0) {
                    // Slow down by 30%
                    gameState.playerVelocity.x *= 0.4;
                    gameState.playerVelocity.z *= 0.4;
                }
                
                // Add slight current effect pushing in river direction
                const direction = new THREE.Vector3(end.x - start.x, 0, end.z - start.z).normalize();
                player.position.x += direction.x * 0.08;
                player.position.z += direction.z * 0.08;
                
                // Play splash sound if we just entered the river
                if (!gameState.playerInRiver) {
                    if (window.soundSystem && window.soundSystem.initialized) {
                        // Using the existing sound system if available
                        // We'll create a splash sound function in a moment
                        playWaterSplashSound();
                    }
                }
                
                // Mark that player is in river
                gameState.playerInRiver = true;
                return;
            }
        }
        
        // If we got here, player is not in the river
        gameState.playerInRiver = false;
    }
}

// Helper function to calculate distance from point to line segment
function distanceToLineSegment(px, pz, x1, z1, x2, z2) {
    const A = px - x1;
    const B = pz - z1;
    const C = x2 - x1;
    const D = z2 - z1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) // in case of 0 length line
        param = dot / lenSq;
    
    let xx, zz;
    
    if (param < 0) {
        xx = x1;
        zz = z1;
    } else if (param > 1) {
        xx = x2;
        zz = z2;
    } else {
        xx = x1 + param * C;
        zz = z1 + param * D;
    }
    
    const dx = px - xx;
    const dz = pz - zz;
    
    return Math.sqrt(dx * dx + dz * dz);
}