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

    // Make selectedPalette accessible globally
    window.selectedPalette = selectedPalette;

    // Update grass system colors if it exists
    if (window.gameState && window.gameState.grassSystem) {
        window.gameState.grassSystem.updateColors(selectedPalette);
    }

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

function createLeafCluster(posY, radius) {
    const cluster = new THREE.Group();
    
    // Create 0-2 stem + leaf groups at each node (some nodes may have no stems)
    const stemCount = Math.floor(Math.random() * 3);
    const baseAngle = Math.random() * Math.PI * 2; // Random starting angle
    
    for (let i = 0; i < stemCount; i++) {
        // Calculate angle for this stem with some variation
        const angle = baseAngle + (i * (Math.PI * 2) / stemCount) + (Math.random() * 0.5 - 0.25);
        
        // Create a stem sub-group
        const stemGroup = new THREE.Group();
        
        // Create the stem - a thin cylinder shooting off from the main stalk
        const stemLength = 0.5 + Math.random() * 2.5;
        const stemGeometry = new THREE.CylinderGeometry(
            0.05, // top radius (thin)
            0.08, // bottom radius (slightly thicker at base)
            stemLength,
            5, // fewer segments for low-poly look
            1
        );
        
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x7FFF00, // Light green for stem
            roughness: 0.5,
            flatShading: true
        });
        
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        
        // Position and rotate the stem to shoot outward from the stalk
        // Move stem to start at the stalk surface and extend outward
        stem.position.set(
            Math.cos(angle) * (radius + stemLength/2),
            0,
            Math.sin(angle) * (radius + stemLength/2)
        );
        
        // Rotate so the stem points outward from the stalk
        stem.rotation.z = Math.PI/2; // Lay the stem horizontally
        stem.rotation.y = -angle; // Point away from the stalk
        
        // Add a slight upward angle to stems
        stem.rotation.x = -Math.PI/6 + (Math.random() * Math.PI/6); // Slight upward angle
        
        stemGroup.add(stem);
        
        // Create 3-6 leaves radiating from the end of the stem
        const leafCount = 3 + Math.floor(Math.random() * 4);
        const leafBaseAngle = Math.random() * Math.PI * 2;
        
        for (let j = 0; j < leafCount; j++) {
            // Leaves should radiate in a somewhat fan-like arrangement
            // When j=0, we want a leaf pointing up/outward
            // When j=leafCount-1, we want a leaf pointing down/outward
            
            // Create a leaf shape - larger leaves as requested
            const leafShape = new THREE.Shape();
            const leafLength = 2.0 + Math.random() * 1.2; // Significantly increased length
            const leafWidth = 0.3 + Math.random() * 0.2;  // Doubled width
            
            // Create a pointed leaf shape
            leafShape.moveTo(0, 0);
            leafShape.lineTo(-leafWidth/2, leafLength * 0.2);
            leafShape.lineTo(-leafWidth/4, leafLength * 0.5);
            leafShape.lineTo(0, leafLength);
            leafShape.lineTo(leafWidth/4, leafLength * 0.5);
            leafShape.lineTo(leafWidth/2, leafLength * 0.2);
            leafShape.lineTo(0, 0);
            
            const leafGeometry = new THREE.ShapeGeometry(leafShape);
            
            // Vary the leaf color slightly
            const colorVariation = 0.2;
            const leafColor = new THREE.Color(0x32CD32).multiplyScalar(0.9 + Math.random() * colorVariation);
            
            const leafMaterial = new THREE.MeshStandardMaterial({ 
                color: leafColor,
                roughness: 0.8,
                side: THREE.DoubleSide,
                flatShading: true
            });
            
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            
            // Distribute leaves in a fan-like arrangement at the end of the stem
            // We'll use a semicircle arrangement with some randomization
            
            // Calculate the fan angle - leaves should spread in roughly 160° arc
            const fanSpread = Math.PI * 0.8; // ~145 degrees
            let fanAngle;
            
            // Distribute the leaves evenly in the fan
            if (leafCount > 1) {
                fanAngle = -fanSpread/2 + (j / (leafCount - 1)) * fanSpread;
            } else {
                fanAngle = 0; // Single leaf points straight
            }
            
            // Add some randomness to the angle
            fanAngle += (Math.random() * 0.2 - 0.1);
            
            // Position leaf at the end of the stem
            const stemEndX = Math.cos(angle) * (radius + stemLength);
            const stemEndY = 0;
            const stemEndZ = Math.sin(angle) * (radius + stemLength);
            
            // Place leaf at the end of the stem
            leaf.position.set(
                stemEndX - Math.cos(angle) * 0.1, // Slightly inward from stem end
                stemEndY,
                stemEndZ - Math.sin(angle) * 0.1
            );
            
            // Base rotation to align with stem direction
            leaf.rotation.y = -angle;
            
            // Apply the fan angle rotation (around local X axis after the stem direction is set)
            leaf.rotateOnAxis(new THREE.Vector3(1, 0, 0), fanAngle);
            
            // Add a slight twist for natural look
            leaf.rotateOnAxis(new THREE.Vector3(0, 1, 0), (Math.random() * 1.0 - 0.5));
            
            stemGroup.add(leaf);
        }
        
        cluster.add(stemGroup);
    }
    
    cluster.position.y = posY;
    return cluster;
}

// Updated createFlagPole function to use the new leaf cluster implementation
function createFlagPole() {
    const group = new THREE.Group();
    
    // Create a full bamboo stalk that goes all the way to the ground
    const bambooHeight = 35; // Total height
    const bambooRadius = 1;

    // Create bamboo stalk with a more distinctly low-poly look
    const stalkGeometry = new THREE.CylinderGeometry(
        bambooRadius/1.8, // top radius (slightly thinner)
        bambooRadius/1.5, // bottom radius
        bambooHeight,     // height
        6                 // fewer radial segments for more obvious low-poly look
    );
    
    const stalkMaterial = new THREE.MeshStandardMaterial({
        color: 0x0c9e0b, // Chartreuse - brighter green for bamboo to match image
        roughness: 0.5,  // Less roughness for a more vibrant appearance
        metalness: 0.1,
        flatShading: true // Add flat shading for low-poly look
    });
    
    const stalk = new THREE.Mesh(stalkGeometry, stalkMaterial);
    
    // Position the stalk so its bottom is at y=0
    stalk.position.y = bambooHeight / 2;
    stalk.castShadow = true;
    
    group.add(stalk);

    // Create node rings (the slightly wider parts between segments)
    function createNodeRing(posY, radius) {
        // Use even fewer segments for a more obviously faceted look
        const ringGeometry = new THREE.CylinderGeometry(radius/1.1, radius/1.1, 0.4, 6); 
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0x32CD32, // More vibrant green for better contrast with the stalk
            roughness: 0.6,
            metalness: 0.1,
            flatShading: true // Add flat shading for low-poly look
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.y = posY;
        ring.castShadow = true;
        
        // Add slight random rotation to the ring for less perfect alignment
        ring.rotation.x = Math.random() * 0.05 - 0.025;
        ring.rotation.z = Math.random() * 0.05 - 0.025;
        
        return ring;
    }
    
    // Add node rings at regular intervals
    const segmentHeight = bambooHeight / 6; // Fewer segments to match image better
    const nodePositions = [];
    
    // Create nodes at regular intervals
    for (let i = 1; i < 6; i++) {
        nodePositions.push(i * segmentHeight);
    }
    
    nodePositions.forEach(posY => {
        const ring = createNodeRing(posY, bambooRadius);
        group.add(ring);
        
        // Create leaf clusters at each node using our updated function
        const leafCluster = createLeafCluster(posY, bambooRadius);
        group.add(leafCluster);
        
        // Add a second offset cluster at some nodes for more density and variation
        if (Math.random() > 0.6) {
            const offsetCluster = createLeafCluster(posY + 0.3, bambooRadius);
            // Rotate the second cluster slightly
            offsetCluster.rotation.y = Math.PI * Math.random();
            group.add(offsetCluster);
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

function createLowPolyTree() {
    const treeGroup = new THREE.Group();
    
    // Tree size parameters
    const treeHeight = 8 + Math.random() * 18; // Vary tree heights
    const trunkHeight = treeHeight * 0.5;
    const trunkWidth = 0.5 + Math.random() * 0.7;
    const foliageSize = 2 + Math.random() * 2;
    
    // Tree trunk - using BoxGeometry but with some randomization for more natural look
    const trunkGeometry = new THREE.CylinderGeometry(
        trunkWidth * 0.7, // top radius (thinner at top)
        trunkWidth, // bottom radius
        trunkHeight,
        5, // fewer radial segments for low-poly look
        3, // height segments
        false
    );
    
    // Apply random vertex displacement to make trunk less perfect
    const trunkPositions = trunkGeometry.attributes.position;
    for (let i = 0; i < trunkPositions.count; i++) {
        const x = trunkPositions.getX(i);
        const y = trunkPositions.getY(i);
        const z = trunkPositions.getZ(i);
        
        // Don't displace top and bottom caps too much
        if (y > -trunkHeight/2 * 0.8 && y < trunkHeight/2 * 0.8) {
            // Add small random displacement to x and z
            trunkPositions.setX(i, x + (Math.random() * 0.2 - 0.1));
            trunkPositions.setZ(i, z + (Math.random() * 0.2 - 0.1));
        }
    }
    
    // Choose a random brown shade for trunk
    const trunkColors = [
        0x8B4513, // SaddleBrown
        0xA0522D, // Sienna
        0xCD853F, // Peru
        0xD2691E  // Chocolate
    ];
    const trunkColor = trunkColors[Math.floor(Math.random() * trunkColors.length)];
    
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
        color: trunkColor,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true // Important for low-poly look
    });
    
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    //trunk.receiveShadow = true;
    
    // Apply slight random rotation to trunk for more natural look
    trunk.rotation.x = (Math.random() * 0.1) - 0.05;
    trunk.rotation.z = (Math.random() * 0.2) - 0.1;
    
    treeGroup.add(trunk);
    
    // Foliage - create multiple geometric shapes clustered together
    const foliageCluster = createFoliageCluster(foliageSize, trunkHeight);
    treeGroup.add(foliageCluster);
    
    // Add a small connection piece to ensure trunk and foliage are connected
    const connectorGeometry = new THREE.CylinderGeometry(
        trunkWidth * 0.8, // top radius
        trunkWidth * 0.7, // bottom radius
        trunkWidth, // short height
        5, // radial segments
        1 // height segments
    );
    
    const connectorMaterial = new THREE.MeshStandardMaterial({
        color: trunkColor,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true
    });
    
    const connector = new THREE.Mesh(connectorGeometry, connectorMaterial);
    connector.position.y = trunkHeight;
    connector.castShadow = true;
    //connector.receiveShadow = true;
    treeGroup.add(connector);
    
    return treeGroup;
}

// Function to create cluster of geometric shapes for foliage
function createFoliageCluster(size, trunkHeight) {
    const foliageGroup = new THREE.Group();
    
    // Select green shade for this tree's foliage from a palette
    const greenColors = [
        0x2E8B57, // SeaGreen
        0x3CB371, // MediumSeaGreen
        0x32CD32, // LimeGreen
        0x228B22, // ForestGreen
        0x6B8E23, // OliveDrab
        0x556B2F  // DarkOliveGreen
    ];
    const baseColor = new THREE.Color(greenColors[Math.floor(Math.random() * greenColors.length)]);
    
    // Determine how many geometric shapes to use for this tree
    const complexity = Math.floor(2 + Math.random() * 6); // 2-7 shapes
    
    // Create multiple geometric shapes with slight color variations
    for (let i = 0; i < complexity; i++) {
        // Vary shape type for more interesting foliage
        let geometry;
        const shapeType = Math.random();
        
        if (shapeType < 0.6) { // 60% polyhedra (similar to reference)
            // Create a polyhedron (low-poly look)
            if (Math.random() < 0.5) {
                // Octahedron (diamond shape)
                geometry = new THREE.OctahedronGeometry(size * (0.5 + Math.random() * 0.5), 0);
            } else {
                // Icosahedron (more facets but still low-poly)
                geometry = new THREE.IcosahedronGeometry(size * (0.4 + Math.random() * 0.6), 0);
            }
        } else if (shapeType < 0.9) { // 30% cubes
            // Create a cube with some variations
            const cubeSize = size * (0.7 + Math.random() * 0.6);
            geometry = new THREE.BoxGeometry(
                cubeSize, 
                cubeSize * (0.8 + Math.random() * 0.4),
                cubeSize * (0.8 + Math.random() * 0.4)
            );
        } else { // 10% tetrahedra
            // Create a tetrahedron (pyramid)
            geometry = new THREE.TetrahedronGeometry(size * (0.4 + Math.random() * 0.6), 0);
        }
        
        // Slight color variation for each shape
        const colorVariation = 0.15;
        const shapeColor = baseColor.clone().multiplyScalar(0.85 + Math.random() * colorVariation);
        
        const material = new THREE.MeshStandardMaterial({
            color: shapeColor,
            roughness: 0.8,
            metalness: 0.1,
            flatShading: true // Critical for low-poly look
        });
        
        const shape = new THREE.Mesh(geometry, material);
        
        // Position each shape relative to center - keep them lower to connect with trunk
        const offset = size * 0.25; // How far shapes can be from center
        
        // Ensure the lowest point of the foliage overlaps with the trunk top
        // by controlling the minimum Y position more carefully
        const minYPosition = trunkHeight - 0.2; // Slight overlap with trunk top
        const randomYOffset = Math.random() * size * 0.7;
        
        shape.position.set(
            (Math.random() * 2 - 1) * offset,
            minYPosition + randomYOffset,
            (Math.random() * 2 - 1) * offset
        );
        
        // Random rotation
        shape.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        shape.castShadow = true;
        //shape.receiveShadow = true;
        
        foliageGroup.add(shape);
    }
    
    return foliageGroup;
}

// Replace createObstacles function to use our new trees
function createObstacles() {
    const obstacles = [];
    
    // Create glowing flowers (unchanged from original function)
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
    
    // Create low poly trees instead of pastel trees
    for (let i = 0; i < 18; i++) {
        const tree = createLowPolyTree();
        
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