// Color palette - consolidated repeated color definitions
const COLORS = {
    foliage: [0xa1ffcc, 0xe2a1ff, 0xf9a1ff, 0xffa1a1, 0xa1f9ff],
    synthwave: [0xff00ff, 0x00ffff, 0xfe5eff, 0x0652ff, 0xff2a6d],
    cyberpunk: [0xf7f500, 0xff0055, 0x00fffb, 0x7700ff, 0xff8c00],
    forest: [0x1e4d2b, 0x006c67, 0x598c4f, 0x8fac55, 0x2f5233],
    sea: [0x00353f, 0x006273, 0x0097b2, 0x5cd9ff, 0xb8ebff],
    sunset: [0xff7b00, 0xff5252, 0xffb56b, 0xff3f00, 0x5c0029],
    dusk: [0x2c1e4a, 0x512b81, 0x7e4e90, 0xc55ffc, 0x9e8ec8],
    matrix: [0x003b00, 0x008f11, 0x00ff41, 0x30ff70, 0x95ffb8],
    desert: [0xc2956e, 0xe3bc9a, 0xd4a76a, 0x8b5d33, 0xf2dba8],
    tundra: [0xd1fff6, 0xa1ffcc, 0xf0eaff, 0x00e5d5, 0xffd1fc],
};
let selectedPalette = COLORS.synthwave;

function getRandomPalette() {
    const paletteNames = Object.keys(COLORS);
    
    // Find the current palette name by comparing the selectedPalette array with all palette arrays
    const currentPaletteName = paletteNames.find(name => 
        COLORS[name] === selectedPalette || 
        (Array.isArray(COLORS[name]) && Array.isArray(selectedPalette) && 
         JSON.stringify(COLORS[name]) === JSON.stringify(selectedPalette))
    );
    
    // Filter out the current palette
    const availablePalettes = paletteNames.filter(name => name !== currentPaletteName);
    
    // Select a random palette from the remaining options
    const randomIndex = Math.floor(Math.random() * availablePalettes.length);
    const randomPaletteName = availablePalettes[randomIndex];
    
    // Update the selectedPalette
    selectedPalette = COLORS[randomPaletteName];
    
    // Return the new palette (optional)
    return selectedPalette;
}

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

function createTerrain() {
    getRandomPalette(); //assigns a random palette to selectedPalette array
    if(scene.fog) scene.fog.color.set(selectedPalette[0]);
    updateBackground([
        { position: 1, color: threeColorToHex(selectedPalette[4]) },
        { position: 0.75, color: threeColorToHex(selectedPalette[3]) },
        { position: 0.6, color: threeColorToHex(selectedPalette[2]) },
        { position: 0.4, color: threeColorToHex(selectedPalette[2]) },
        { position: 0.25, color: threeColorToHex(selectedPalette[1]) },
        { position: 0, color: threeColorToHex(selectedPalette[0]) },
    ]);

    // Create a large flat base with soft gradient (unchanged)
    const terrainSize = 400;
    const baseGeometry = new THREE.BoxGeometry(terrainSize, 1, terrainSize);
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
    
    // Setup for terrain generation
    const segmentSize = 4;
    const segments = Math.floor(terrainSize / segmentSize);
    const halfTerrainSize = terrainSize / 2;
    
    // OPTIMIZATION 1: Use InstancedMesh for similar colored segments
    // Create a lookup for palette colors
    const paletteInstancedMeshes = {};
    
    // Create a single box geometry to be reused
    const boxGeometry = new THREE.BoxGeometry(segmentSize, 1, segmentSize);
    
    // Hills group
    const hillsGroup = new THREE.Group();
    scene.add(hillsGroup);
    
    // First pass: Count instances needed for each color in the palette
    const instanceCounts = {};
    selectedPalette.forEach(color => {
        instanceCounts[color] = 0;
    });
    
    // Count needed instances
    for (let x = 0; x < segments; x++) {
        for (let z = 0; z < segments; z++) {
            const posX = (x * segmentSize) - halfTerrainSize + segmentSize/2;
            const posZ = (z * segmentSize) - halfTerrainSize + segmentSize/2;
            
            const height = getTerrainHeight(posX, posZ);
            
            if (height > 0.2) {
                // Select a base color from the palette
                const baseColor = selectedPalette[Math.floor(Math.random() * selectedPalette.length)];
                instanceCounts[baseColor]++;
            }
        }
    }
    
    // Create instanced meshes for each color
    selectedPalette.forEach(baseColor => {
        if (instanceCounts[baseColor] > 0) {
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(baseColor),
                roughness: 0.7,
                metalness: 0.1
            });
            
            const instancedMesh = new THREE.InstancedMesh(
                boxGeometry,
                material,
                instanceCounts[baseColor]
            );
            instancedMesh.receiveShadow = true;
            
            paletteInstancedMeshes[baseColor] = {
                mesh: instancedMesh,
                count: 0 // Current instance count
            };
            
            hillsGroup.add(instancedMesh);
        }
    });
    
    // Create a dummy object for positioning
    const dummy = new THREE.Object3D();
    
    // Second pass: Actually position the instances
    for (let x = 0; x < segments; x++) {
        for (let z = 0; z < segments; z++) {
            const posX = (x * segmentSize) - halfTerrainSize + segmentSize/2;
            const posZ = (z * segmentSize) - halfTerrainSize + segmentSize/2;
            
            const height = getTerrainHeight(posX, posZ);
            
            if (height > 0.2) {
                // Select a base color from the palette
                const baseColor = selectedPalette[Math.floor(Math.random() * selectedPalette.length)];
                
                // Get the instanced mesh for this color
                const instanceData = paletteInstancedMeshes[baseColor];
                
                // Position and scale the dummy object
                dummy.position.set(posX, height/2, posZ);
                dummy.scale.set(1, height, 1); // Scale vertically to match height
                dummy.updateMatrix();
                
                // Apply matrix to the instance
                instanceData.mesh.setMatrixAt(instanceData.count, dummy.matrix);
                instanceData.count++;
            }
        }
    }
    
    // Update the instance matrices
    Object.values(paletteInstancedMeshes).forEach(({ mesh }) => {
        mesh.instanceMatrix.needsUpdate = true;
    });
    
    // OPTIMIZATION 2: For subtle color variations, we can use vertex colors in a follow-up pass
    // This would add some complexity but could be implemented if needed
    
    return hillsGroup;
}

// Create a gradient texture for the terrain base
function createTerrainBaseTexture() {
    const resolution = 32;
    const canvas = getCanvas(resolution, resolution);
    const context = canvas.getContext('2d');
    
    // Create a radial gradient
    const gradient = context.createRadialGradient(
        resolution, resolution, 0,
        resolution, resolution, resolution
    );
    
    gradient.addColorStop(0, threeColorToHex(selectedPalette[0]));
    gradient.addColorStop(0.3, threeColorToHex(selectedPalette[1])); 
    gradient.addColorStop(0.6, threeColorToHex(selectedPalette[2])); 
    gradient.addColorStop(1, threeColorToHex(selectedPalette[3]));
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, resolution, resolution);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

function threeColorToHex(threeColor) {
    // If it's already a THREE.Color object
    if (threeColor.isColor) {
      // Convert to hex string and ensure it has the # prefix
      return '#' + threeColor.getHexString();
    }
    
    // If it's a hex number (like 0xff0000)
    else if (typeof threeColor === 'number') {
      // Convert to a hex string and remove the '0x' prefix if present
      let hexString = threeColor.toString(16);
      
      // Pad with zeros if needed to ensure 6 digits
      while (hexString.length < 6) {
        hexString = '0' + hexString;
      }
      
      return '#' + hexString;
    }
    
    // If it's already a string, ensure it has the # prefix
    else if (typeof threeColor === 'string') {
      return threeColor.startsWith('#') ? threeColor : '#' + threeColor;
    }
    
    // If conversion isn't possible
    console.error('Unable to convert to hex color:', threeColor);
    return '#000000'; // Default to black
}

// Create stylized bamboo stalk (replaces flag pole)
function createFlagPole() {
    const group = new THREE.Group();
    
    // Create a full bamboo stalk that goes all the way to the ground
    const bambooHeight = 35; // Total height
    const bambooRadius = 1;

    // Create bamboo stalk using cylinder instead of box for a more natural look
    const stalkGeometry = new THREE.CylinderGeometry(
        bambooRadius/2, // top radius
        bambooRadius/2, // bottom radius
        bambooHeight,   // height
        12             // radial segments
    );
    
    const stalkMaterial = new THREE.MeshStandardMaterial({
        color: 0x7CFC00, // Light green for bamboo
        roughness: 0.7,
        metalness: 0.1
    });
    
    const stalk = new THREE.Mesh(stalkGeometry, stalkMaterial);
    
    // Position the stalk so its bottom is at y=0
    stalk.position.y = bambooHeight / 2;
    stalk.castShadow = true;
    
    group.add(stalk);

    // Create node rings (the slightly wider parts between segments)
    function createNodeRing(posY, radius) {
        const ringGeometry = new THREE.CylinderGeometry(radius/1.2, radius/1.2, 0.3, 12);
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
            const angle = baseAngle + (i * (Math.PI * 2) / leafCount);
            
            // Create a simple triangle shape for the leaf
            const leafShape = new THREE.Shape();
            leafShape.moveTo(0, 0);
            leafShape.lineTo(0.6, 0.3);
            leafShape.lineTo(2 + Math.random() * 3, 0);
            leafShape.lineTo(0.6, -0.3);
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

    // Add node rings at regular intervals
    const segmentHeight = bambooHeight / 6;
    const nodePositions = [];
    
    // Create nodes at regular intervals
    for (let i = 1; i < 6; i++) {
        nodePositions.push(i * segmentHeight);
    }
    
    nodePositions.forEach(posY => {
        const ring = createNodeRing(posY, bambooRadius);
        group.add(ring);
        
        // Add leaf cluster at this node if it's not too close to the top
        if (posY < bambooHeight - 5) {
            const leafCluster = createLeafCluster(posY, bambooRadius);
            group.add(leafCluster);
        }
    });

    // Position the bamboo stalk at the specified location
    const x = 50;
    const z = 50;
    
    // Make sure getTerrainHeight is defined and available
    let y = 0;
    try {
        y = getTerrainHeight(x, z);
    } catch (e) {
        console.warn("getTerrainHeight function not available, setting y to 0");
    }
    
    // Setting y position to terrain height directly (bamboo will grow from ground)
    group.position.set(x, y, z);
    
    scene.add(group);
    return group;
}

function createPastelTree() {
    const treeGroup = new THREE.Group();
    
    // Tree trunk - box for retro blockiness with warm color
    const trunkGeometry = new THREE.BoxGeometry(1, 8, 1);
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
    let treeHeight = 4+Math.random()*4;
    let treeWidth = 1+Math.random()*4;
    const foliageGeometry = new THREE.ConeGeometry(treeWidth, treeHeight, 8); // More sides for smoother look
    const foliageMaterial = new THREE.MeshStandardMaterial({ 
        color: foliageColor,
        roughness: 0.7,
        metalness: 0.1,
        emissive: foliageColor,
        emissiveIntensity: 0.6
    });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = 8;
    foliage.castShadow = true;
    
    treeGroup.add(trunk);
    treeGroup.add(foliage);
    
    return treeGroup;
}

function createNeonFlowerPatch() {
    const flowerGroup = new THREE.Group();
    
    // Create stem - thinner and slightly curved
    const stem = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 2.0, 0.1), // Slightly taller, thinner stem
        new THREE.MeshStandardMaterial({ 
            color: 0x228B22, // Darker green for stem
            //roughness: 0.7,
            //metalness: 0.1
        })
    );
    
    // Position stem with bottom at y=0
    stem.position.y = 0.6;
    
    // Add a slight curve to the stem
    stem.rotation.z = Math.random() * 0.6 - 0.3;
    flowerGroup.add(stem);
    
    // Create leaves (1-2 small leaves on the stem)
    const leafCount = Math.floor(Math.random() * 2) + 1;
    
    for (let i = 0; i < leafCount; i++) {
        // Create a simple leaf shape
        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, 0);
        leafShape.lineTo(0.4, 0.15);
        leafShape.lineTo(0.8, 0);
        leafShape.lineTo(0.4, -0.15);
        leafShape.lineTo(0, 0);
        
        const leafGeometry = new THREE.ShapeGeometry(leafShape);
        const leafMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x32CD32, // Bright green
            roughness: 0.7,
            side: THREE.DoubleSide
        });
        
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        
        // Position leaf along the stem
        leaf.position.y = 0.5 + i * 0.8;
        
        // Random rotation around the stem
        const angle = Math.random() * Math.PI * 2;
        leaf.position.x = Math.cos(angle) * 0.2;
        leaf.position.z = Math.sin(angle) * 0.2;
        
        // Orient the leaf outward
        leaf.rotation.y = -angle;
        leaf.rotation.x = Math.PI / 2;
        
        flowerGroup.add(leaf);
    }
    
    // Create the flower petals
    const centerRadius = 0.7;
    
    // Choose a random flower color for each flower (one color per flower)
    // Array of vibrant flower colors
    const flowerColors = [
        0xFF5555, // Red
        0xFF9500, // Orange
        0xFFD500, // Golden yellow
        0xFF55FF, // Pink
        0xAA55FF, // Purple
        0x55AAFF, // Blue
        0x55FFAA, // Mint
        0xFF5599  // Rose
    ];
    
    // Randomly select one color for this flower
    const centerColor = new THREE.Color(flowerColors[Math.floor(Math.random() * flowerColors.length)]);
    
    // Create the center of the flower (yellow circle)
    const centerGeometry = new THREE.CircleGeometry(centerRadius, 8);
    const centerMaterial = new THREE.MeshStandardMaterial({
        color: centerColor,
        side: THREE.DoubleSide,
        roughness: 0.7
    });
    
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.rotation.x = -Math.PI / 2 + Math.PI*Math.random()/6; // Lay flat
    center.position.y = 1.6; // Position at top of stem
    flowerGroup.add(center);

    // Add a slight random rotation to the whole flower for variety
    flowerGroup.rotation.y = Math.random() * Math.PI * 2;
    
    return flowerGroup;
}

// Updated obstacles creation function to use our new flower style
function createObstacles() {
    const obstacles = [];
    
    // Create glowing flowers with the new style
    for (let i = 0; i < 125; i++) {
        const flowerGroup = createNeonFlowerPatch();
        
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 120 + 5;
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        const terrainHeight = getTerrainHeight(x, z);
        flowerGroup.position.set(x, terrainHeight, z);
        
        scene.add(flowerGroup);
    }
    
    // Create pastel-styled trees
    for (let i = 0; i < 18; i++) {
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
    
    return obstacles;
}