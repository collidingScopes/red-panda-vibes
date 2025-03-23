// Color palette - consolidated repeated color definitions
const COLORS = {
    pastel: [0xaae6ff, 0xbba1ff, 0xffaad5, 0xa1ffbb, 0xffe1aa],
    foliage: [0xa1ffcc, 0xe2a1ff, 0xf9a1ff, 0xffa1a1, 0xa1f9ff],
    synthwave: [0xff00ff, 0x00ffff, 0xfe5eff, 0x0652ff, 0xff2a6d],
    cyberpunk: [0xf7f500, 0xff0055, 0x00fffb, 0x7700ff, 0xff8c00],
    noir: [0x080808, 0x1a1a1a, 0x333333, 0x8c8c8c, 0xffffff],
    forest: [0x1e4d2b, 0x006c67, 0x598c4f, 0x8fac55, 0x2f5233],
    sea: [0x00353f, 0x006273, 0x0097b2, 0x5cd9ff, 0xb8ebff],
    sunset: [0xff7b00, 0xff5252, 0xffb56b, 0xff3f00, 0x5c0029]
};
let selectedPalette = COLORS.synthwave;

function getRandomPalette() {
    const paletteNames = Object.keys(COLORS);
    const randomIndex = Math.floor(Math.random() * paletteNames.length);
    const randomPaletteName = paletteNames[randomIndex];
    selectedPalette = COLORS[randomPaletteName];
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

// PASTEL NEON STYLED TERRAIN SYSTEM
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

    // Create a large flat base with soft gradient
    const terrainSize = 400;
    const baseGeometry = new THREE.BoxGeometry(terrainSize, 1, terrainSize);
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
    const segmentSize = 4;
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
                //const baseColor = COLORS.pastel[Math.floor(Math.random() * COLORS.pastel.length)];
                const baseColor = selectedPalette[Math.floor(Math.random() * selectedPalette.length)];

                // Create a subtle color variation
                const color = new THREE.Color(baseColor);
                color.r += (Math.random() * 0.1 - 0.05);
                color.g += (Math.random() * 0.1 - 0.05);
                color.b += (Math.random() * 0.1 - 0.05);
                
                const hillMaterial = new THREE.MeshStandardMaterial({
                    color: color,
                });
                
                const hill = new THREE.Mesh(hillGeometry, hillMaterial);
                hill.position.set(posX, height/2, posZ);
                hill.receiveShadow = true;
                hillsGroup.add(hill);
            }
        }
    }    
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
    
    gradient.addColorStop(0, threeColorToHex(selectedPalette[0])); // Center: Light blue
    gradient.addColorStop(0.3, threeColorToHex(selectedPalette[1])); // Middle: Light purple
    gradient.addColorStop(0.6, threeColorToHex(selectedPalette[2])); // Outer middle: Pink
    gradient.addColorStop(1, threeColorToHex(selectedPalette[3])); // Edge: Mint green
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
    
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
    const bambooHeight = 30; // Total height
    const bambooRadius = 1;

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
    const bambooLight = new THREE.PointLight(0x00ff00, 2.5, 15); // More natural green glow
    bambooLight.position.y = bambooHeight/2; // Position at middle of bamboo

    bambooLight.castShadow = true;
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
    for (let i = 0; i < 150; i++) {
        const flowerGroup = createNeonFlowerPatch();
        
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 90 + 5;
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        const terrainHeight = getTerrainHeight(x, z);
        flowerGroup.position.set(x, terrainHeight, z);
        
        scene.add(flowerGroup);
    }
    
    // Create pastel-styled trees
    for (let i = 0; i < 20; i++) {
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

function createRiver() {
    console.log("Generating smooth river...");
    
    // River group to hold all segments
    const riverGroup = new THREE.Group();
    
    // River settings
    const riverWidth = 15.0;           // Width of the river
    const riverDepth = -0.7;            // Depth of the river below terrain
    const curveSegments = 80;          // Number of segments to create the smooth curve
    const curveResolution = 80;       // Resolution of points along the curve
    const mapRadius = 150;             // Approximate radius of walkable area
    const waterColor = 0x0049ff;       // Bright turquoise color for better visibility
    
    // Create a spline curve for the river path
    const generateRiverPath = () => {
        // Find a starting point at the edge of the walkable area
        const startAngle = Math.random() * Math.PI * 2;
        const startX = Math.cos(startAngle) * mapRadius * 0.9;
        const startZ = Math.sin(startAngle) * mapRadius * 0.9;
        
        // Random points for the spline
        const points = [];
        
        // Add starting point
        points.push(new THREE.Vector3(startX, 0, startZ));
        
        // Calculate the general direction (opposite side of the map)
        const endAngle = startAngle + Math.PI + (Math.random() * Math.PI/2 - Math.PI/4);
        const targetX = Math.cos(endAngle) * mapRadius * 0.9;
        const targetZ = Math.sin(endAngle) * mapRadius * 0.9;
        
        // Generate control points for the curve
        // We'll create several points along the way with some randomness
        const numControlPoints = 4;
        for (let i = 1; i <= numControlPoints; i++) {
            const t = i / (numControlPoints + 1);
            
            // Linear interpolation from start to end
            const baseX = startX + (targetX - startX) * t;
            const baseZ = startZ + (targetZ - startZ) * t;
            
            // Add randomness, but less as we get closer to the target
            const randomFactor = (1 - t) * 0.5;
            const offsetX = (Math.random() * 2 - 1) * mapRadius * randomFactor;
            const offsetZ = (Math.random() * 2 - 1) * mapRadius * randomFactor;
            
            // Push the point slightly toward the center for a more natural flow
            const distFromCenter = Math.sqrt(baseX * baseX + baseZ * baseZ);
            const centerPull = Math.max(0, (distFromCenter - mapRadius * 0.4) / mapRadius);
            const toCenterX = -baseX * centerPull * 0.3;
            const toCenterZ = -baseZ * centerPull * 0.3;
            
            points.push(new THREE.Vector3(
                baseX + offsetX + toCenterX,
                0,
                baseZ + offsetZ + toCenterZ
            ));
        }
        
        // Add end point
        points.push(new THREE.Vector3(targetX, 0, targetZ));
        
        // Create a smooth curve through these points
        return new THREE.CatmullRomCurve3(points, false, "centripetal", 0.5);
    };
    
    // Generate the river curve
    const riverCurve = generateRiverPath();
    
    // Create an array to store the river path for collision detection
    const riverPath = [];
    
    // Create semi-transparent water material with subtle animation
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: waterColor,
        roughness: 0.8,
        metalness: 0.1,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide
    });
    
    // Create the river mesh by extruding a shape along the curve
    const createRiverMesh = () => {
        // Sample points along the curve for collision detection
        const samples = riverCurve.getPoints(curveResolution);
        samples.forEach(point => {
            const terrainHeight = getTerrainHeight(point.x, point.z);
            riverPath.push({
                x: point.x,
                z: point.z,
                y: terrainHeight - riverDepth,
            });
        });
        
        // Create frames along the curve for extrusion
        const frames = riverCurve.computeFrenetFrames(curveSegments, false);
        
        // Create geometry
        const riverGeometry = new THREE.BufferGeometry();
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        
        // Generate mesh data
        for (let i = 0; i <= curveSegments; i++) {
            const t = i / curveSegments;
            const point = riverCurve.getPoint(t);
            const normal = frames.normals[Math.min(i, curveSegments - 1)];
            const binormal = frames.binormals[Math.min(i, curveSegments - 1)];
            
            // Adjust height to follow terrain with a slight depression
            const terrainHeight = getTerrainHeight(point.x, point.z);
            point.y = terrainHeight - riverDepth;
            
            // Create points on both sides of the river
            for (let j = 0; j <= 1; j++) {
                const side = j === 0 ? -1 : 1;
                const width = riverWidth / 2;
                
                // Calculate vertex position
                const vx = point.x + binormal.x * width * side;
                const vy = point.y;
                const vz = point.z + binormal.z * width * side;
                
                // Add vertex
                vertices.push(vx, vy, vz);
                
                // Add normal (pointing up)
                normals.push(0, 1, 0);
                
                // Add UV coordinates
                uvs.push(j, t * 10); // Repeat texture along the river
            }
        }
        
        // Create faces (triangles)
        for (let i = 0; i < curveSegments; i++) {
            const base = i * 2;
            
            // Two triangles per segment
            indices.push(
                base, base + 1, base + 2,
                base + 2, base + 1, base + 3
            );
        }
        
        // Set attributes
        riverGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        riverGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        riverGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        riverGeometry.setIndex(indices);
        
        // Create the mesh
        const riverMesh = new THREE.Mesh(riverGeometry, waterMaterial);
        //riverMesh.receiveShadow = true;
        
        return riverMesh;
    };
    
    // Create and add the main river mesh
    const riverMesh = createRiverMesh();
    riverGroup.add(riverMesh);
        
    // Add the river group to the scene
    scene.add(riverGroup);
    
    // Store river path in game state for collision detection
    if (window.gameState) {
        window.gameState.riverPath = riverPath;
        window.gameState.riverWidth = riverWidth;
        window.gameState.riverCurve = riverCurve; // Store the curve for animation
    }
    
    return riverGroup;
}

// Updated river collision detection
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
        checkRiverCollision(deltaTime);
    };
    
    // Function to check if player is in the river
    function checkRiverCollision(deltaTime) {
        // Skip if game is over
        if (window.gameState.gameOver) return;
        
        const player = window.player;
        const riverPath = window.gameState.riverPath;
        const riverWidth = window.gameState.riverWidth;
        const riverCurve = window.gameState.riverCurve;
        
        // Find the closest point on the river path to the player
        let closestDist = Infinity;
        let closestPoint = null;
        let closestIndex = 0;
        
        // Check each point in the river path
        for (let i = 0; i < riverPath.length; i++) {
            const point = riverPath[i];
            const dx = player.position.x - point.x;
            const dz = player.position.z - point.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < closestDist) {
                closestDist = distance;
                closestPoint = point;
                closestIndex = i;
            }
        }
        
        // Check BOTH horizontal distance AND vertical position
        // Only apply river physics if:
        // 1. The player is horizontally within the river width
        // 2. The player is vertically close to the river surface (within a small threshold)
        const verticalDistanceToRiver = Math.abs(player.position.y - closestPoint.y);
        const verticalThreshold = 1.5; // Adjust this value as needed
        
        if (closestDist < riverWidth / 2 && verticalDistanceToRiver < verticalThreshold) {
            // Add slowing effect
            if (gameState.playerVelocity.x !== 0 || gameState.playerVelocity.z !== 0) {
                // Slow down movement
                gameState.playerVelocity.x *= 0.5;
                gameState.playerVelocity.z *= 0.5;
            }
            
            // Calculate river flow direction
            let flowDirection;
            
            if (riverCurve) {
                // Use the tangent from the curve for more accuracy
                const t = closestIndex / (riverPath.length - 1);
                flowDirection = riverCurve.getTangent(t);
            } else {
                // Fallback: calculate direction based on points
                const prevIndex = Math.max(0, closestIndex - 1);
                const nextIndex = Math.min(riverPath.length - 1, closestIndex + 1);
                
                const prevPoint = riverPath[prevIndex];
                const nextPoint = riverPath[nextIndex];
                
                const dx = nextPoint.x - prevPoint.x;
                const dz = nextPoint.z - prevPoint.z;
                
                // Normalize
                const mag = Math.sqrt(dx * dx + dz * dz);
                flowDirection = {
                    x: dx / mag,
                    z: dz / mag
                };
            }
            
            // Apply current effect
            player.position.x += flowDirection.x * 4 * deltaTime;
            player.position.z += flowDirection.z * 4 * deltaTime;
            
            // Play splash sound if just entered the river
            if (!gameState.playerInRiver) {
                if (window.soundSystem && window.soundSystem.initialized) {
                    window.playWaterSplashSound();
                }
            }
            
            // Mark player as in river
            gameState.playerInRiver = true;
            return;
        }
        
        // Not in river
        gameState.playerInRiver = false;
    }
}