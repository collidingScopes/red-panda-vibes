// Ensure this function is defined in global scope
window.createRiver = function() {
    console.log("Generating smooth river with flow animation...");
    
    // River group to hold all segments
    const riverGroup = new THREE.Group();
    
    // River settings
    const riverWidth = 15.0;           // Width of the river
    const riverDepth = -0.7;           // Depth of the river below terrain
    const curveSegments = 80;          // Number of segments to create the smooth curve
    const curveResolution = 80;        // Resolution of points along the curve
    const mapRadius = 150;             // Approximate radius of walkable area
    
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
    
    // Create water material with flow animation
    const waterTexture = createWaterTexture();
    const waterNormalMap = createWaterNormalMap();
    const foamTexture = createFoamTexture();
    
    const waterMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x06d6d6, // Vibrant turquoise like in the reference image
        roughness: 0.15,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        map: waterTexture,
        normalMap: waterNormalMap,
        normalScale: new THREE.Vector2(0.6, 0.6), // Stronger normals for more visible ripples
        envMapIntensity: 1.2,
        clearcoat: 0.7,
        clearcoatRoughness: 0.2,
        transmission: 0.4,
        ior: 1.33,
        emissive: 0x086b91,
        emissiveIntensity: 0.2 // Subtle glow for more vibrance
    });
    
    // Create water texture with dynamic flow patterns
    function createWaterTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        // Gradient background to simulate depth variations
        const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#e5f9ff');
        gradient.addColorStop(0.7, '#d0f5ff');
        gradient.addColorStop(1, '#b8efff');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 1024);
        
        // Add multiple flow direction patterns
        // Main directional flow lines
        ctx.strokeStyle = '#a0e6ff';
        ctx.lineWidth = 2;
        
        const drawFlowPattern = (startY, endY, amplitudeRange, frequencyRange, speedMultiplier) => {
            for (let i = startY; i < endY; i += 10) {
                ctx.beginPath();
                const amplitude = amplitudeRange[0] + Math.random() * (amplitudeRange[1] - amplitudeRange[0]);
                const frequency = frequencyRange[0] + Math.random() * (frequencyRange[1] - frequencyRange[0]);
                const opacity = 0.6 + Math.random() * 0.4;
                
                ctx.globalAlpha = opacity;
                
                for (let x = 0; x < 1024; x += 2) {
                    const yOffset = Math.sin(x * frequency) * amplitude;
                    const y = i + yOffset;
                    
                    if (x === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
            }
        };
        
        // Main fast flow in center (straight lines with small waves)
        drawFlowPattern(300, 700, [5, 15], [0.005, 0.01], 2.0);
        
        // Slower flows near edges (more wavy)
        drawFlowPattern(0, 300, [20, 40], [0.01, 0.03], 0.7);
        drawFlowPattern(700, 1024, [20, 40], [0.01, 0.03], 0.7);
        
        // Add circular patterns for whirlpools and eddies
        ctx.strokeStyle = '#80d8ff';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const radius = 10 + Math.random() * 80;
            const startAngle = Math.random() * Math.PI * 2;
            const endAngle = startAngle + Math.PI * 1.5 + Math.random() * Math.PI * 0.5;
            
            ctx.globalAlpha = 0.6 + Math.random() * 0.3;
            ctx.beginPath();
            ctx.arc(x, y, radius, startAngle, endAngle);
            ctx.stroke();
            
            // Add a smaller inner circle for some eddies
            if (Math.random() > 0.5) {
                ctx.beginPath();
                ctx.arc(x, y, radius * 0.6, startAngle, endAngle);
                ctx.stroke();
            }
        }
        
        // Reset alpha
        ctx.globalAlpha = 1.0;
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(8, 2); // More repeats for more visible flow
        
        // Store texture for animation
        window.gameState.waterTexture = texture;
        
        return texture;
    }
    
    // Create foam texture for white water rapids effect
    function createFoamTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        // Clear background
        ctx.fillStyle = 'rgba(255,255,255,0)';
        ctx.fillRect(0, 0, 1024, 1024);
        
        // Create white water foam patterns
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const size = 5 + Math.random() * 25;
            
            // Randomize foam shape
            const opacity = 0.3 + Math.random() * 0.7;
            ctx.fillStyle = `rgba(255,255,255,${opacity})`;
            
            ctx.beginPath();
            
            // Create irregular foam shapes
            if (Math.random() > 0.5) {
                // Oval foam
                ctx.ellipse(x, y, size, size * (0.5 + Math.random() * 0.5), 
                         Math.random() * Math.PI * 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Irregular blob
                ctx.moveTo(x, y);
                for (let j = 0; j < 6; j++) {
                    const angle = j * Math.PI / 3;
                    const distance = size * (0.7 + Math.random() * 0.6);
                    ctx.lineTo(
                        x + Math.cos(angle) * distance,
                        y + Math.sin(angle) * distance
                    );
                }
                ctx.closePath();
                ctx.fill();
            }
        }
        
        ctx.globalAlpha = 1.0;
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(6, 1.5);
        
        // Store for animation
        window.gameState.foamTexture = texture;
        
        return texture;
    }
    
    // Create enhanced water normal map for dynamic surface ripples
    function createWaterNormalMap() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        // Fill with neutral normal color (128, 128, 255)
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(0, 0, 1024, 1024);
        
        // Create directional flow normals
        // Add diagonal wave patterns - main flow direction
        for (let i = 0; i < 40; i++) {
            // Create flow lines with varied widths
            const startX = Math.random() * 1024;
            const startY = Math.random() * 1024;
            const length = 200 + Math.random() * 400;
            const width = 10 + Math.random() * 40;
            const angle = -Math.PI / 4 + (Math.random() * Math.PI / 2); // Flow direction with variation
            
            const endX = startX + Math.cos(angle) * length;
            const endY = startY + Math.sin(angle) * length;
            
            // Create gradient along flow line
            const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
            
            // Wave-like pattern in normal map
            const cycles = 5 + Math.floor(Math.random() * 8); // Number of light/dark transitions
            
            for (let j = 0; j <= cycles; j++) {
                const stop = j / cycles;
                const value = j % 2 === 0 ? 220 : 90; // Alternate between light and dark
                gradient.addColorStop(stop, `rgb(${value}, ${value}, 255)`);
            }
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = width;
            ctx.globalAlpha = 0.6 + Math.random() * 0.4;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        
        // Reset alpha
        ctx.globalAlpha = 1.0;
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(6, 2);
        
        // Store normal map for animation
        window.gameState.waterNormalMap = texture;
        
        return texture;
    }
    
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
                
                // Add UV coordinates - adjust to follow the flow direction
                uvs.push(j, t * 10); // Repeat texture along the river
            }
        }
        
        // Add subtle vertex displacement for waves
        const vertexCount = vertices.length / 3;
        for (let i = 0; i < vertexCount; i++) {
            const idx = i * 3 + 1; // Y-coordinate index
            // Small random displacement
            vertices[idx] += (Math.random() * 0.1 - 0.05);
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
        riverMesh.receiveShadow = true;
        
        return riverMesh;
    };
    
    // Create and add the main river mesh
    const riverMesh = createRiverMesh();
    riverGroup.add(riverMesh);

    // Add rocks and obstacles in the river for white water rapids effect
    addRiverRocks(riverGroup, riverCurve, riverWidth);
    
    // Add the river group to the scene
    scene.add(riverGroup);
    
    // Create water animation system
    setupWaterAnimation();
    
    // Store river path in game state for collision detection
    if (window.gameState) {
        window.gameState.riverPath = riverPath;
        window.gameState.riverWidth = riverWidth;
        window.gameState.riverCurve = riverCurve; // Store the curve for animation
        window.gameState.riverMesh = riverMesh; // Store mesh for animation updates
    }
    
    return riverGroup;
}

// Function to add rocks and obstacles in the river for white water rapids effect
function addRiverRocks(riverGroup, riverCurve, riverWidth) {
    const rocksCount = 25; // Number of rock clusters
    
    // Create a group for the rocks
    const rocksGroup = new THREE.Group();
    
    // Create rock materials with variance
    const rockMaterials = [
        new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 }), // Gray
        new THREE.MeshStandardMaterial({ color: 0x705040, roughness: 0.8 }), // Brown
        new THREE.MeshStandardMaterial({ color: 0x606060, roughness: 0.7 })  // Dark gray
    ];
    
    // Place rock clusters along the river
    const rockPositions = [];
    
    for (let i = 0; i < rocksCount; i++) {
        // Position along the river curve, avoid the very beginning and end
        const t = 0.1 + Math.random() * 0.8; 
        const point = riverCurve.getPoint(t);
        
        // Get tangent and normal at this point
        const tangent = riverCurve.getTangent(t);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        
        // Position somewhere in the river, mostly toward the middle
        const riverPos = (Math.random() * 0.8 - 0.4) * 0.8; // Concentrated more in the middle
        const x = point.x + normal.x * (riverWidth / 2) * riverPos;
        const z = point.z + normal.z * (riverWidth / 2) * riverPos;
        
        // Get terrain height at this position
        const terrainHeight = getTerrainHeight(x, z);
        const y = terrainHeight - 0.3; // Partly above water surface
        
        // Create a rock cluster
        const rockCluster = createRockCluster(x, y, z);
        rocksGroup.add(rockCluster);
        
        // Remember position for rapids effects
        rockPositions.push({
            position: new THREE.Vector3(x, y, z),
            t: t,
            flowDirection: tangent.clone(),
            normal: normal.clone(),
            radius: 3 + Math.random() * 3
        });
    }
    
    // Store rock positions for water effects
    if (window.gameState) {
        window.gameState.rockPositions = rockPositions;
    }
    
    // Add rocks to the river group
    riverGroup.add(rocksGroup);
    
    // Function to create a cluster of rocks
    function createRockCluster(x, y, z) {
        const cluster = new THREE.Group();
        const clusterSize = 1 + Math.random() * 2; // Size of overall cluster
        const rocksInCluster = 1 + Math.floor(Math.random() * 4); // 1-4 rocks per cluster
        
        for (let i = 0; i < rocksInCluster; i++) {
            // Random position within cluster
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * clusterSize;
            const rockX = x + Math.cos(angle) * distance * 0.5;
            const rockZ = z + Math.sin(angle) * distance * 0.5;
            
            // Random rock size
            const rockSize = 0.5 + Math.random() * 1.5;
            
            // Random rock geometry
            let rockGeometry;
            const rockType = Math.floor(Math.random() * 3);
            
            if (rockType === 0) {
                // Pointed rock
                rockGeometry = new THREE.ConeGeometry(rockSize, rockSize * 2, 5 + Math.floor(Math.random() * 3));
                // Tilt it randomly
                rockGeometry.rotateX((Math.random() * 0.3) * Math.PI);
                rockGeometry.rotateZ((Math.random() * 0.3) * Math.PI);
            } else if (rockType === 1) {
                // Round rock
                rockGeometry = new THREE.SphereGeometry(
                    rockSize,
                    6 + Math.floor(Math.random() * 3),
                    6 + Math.floor(Math.random() * 3)
                );
                // Squash it a bit
                rockGeometry.scale(1, 0.7 + Math.random() * 0.3, 1);
            } else {
                // Angular rock
                rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
                // Random rotation
                rockGeometry.rotateX(Math.random() * Math.PI);
                rockGeometry.rotateY(Math.random() * Math.PI);
                rockGeometry.rotateZ(Math.random() * Math.PI);
            }
            
            // Choose a random rock material
            const rockMaterial = rockMaterials[Math.floor(Math.random() * rockMaterials.length)];
            
            // Create the rock
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            
            // Position it with slight height variance
            rock.position.set(
                rockX,
                y + rockSize * 0.1 * Math.random(), // Slight vertical variation
                rockZ
            );
            
            // Add to cluster
            cluster.add(rock);
        }
        
        return cluster;
    }
}

// Setup enhanced river animation for dynamic water flow effects
function setupWaterAnimation() {
    // Skip if animation is already set up
    if (window.riverAnimationSetup) return;
    window.riverAnimationSetup = true;
    
    // Store the original update function
    const originalUpdateScene = window.updateScene || function(){};
    
    // Create time variables for animations
    if (!window.gameState.waterAnimTime) {
        window.gameState.waterAnimTime = {
            flowTime: 0,
            waveTime: 0,
            rapidTime: 0,
            foamTime: 0
        };
    }
    
    // Create water splash system for rapids
    const createWaterSplashSystem = () => {
        if (!window.gameState.splashSystem) {
            // Make sure scene exists
            if (typeof scene === 'undefined') {
                console.warn("Scene not available for splash system");
                return;
            }
            
            const splashGroup = new THREE.Group();
            scene.add(splashGroup);
            
            // Create material for water splashes
            const splashMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8
            });
            
            window.gameState.splashSystem = {
                group: splashGroup,
                material: splashMaterial,
                splashes: [], // Will hold active splashes
                lastSpawnTime: 0
            };
        }
    };
    
    // Initialize rapids and splash systems
    createWaterSplashSystem();
    
    // Override with our modified function that includes enhanced water animation
    window.updateScene = function(deltaTime) {
        // Call the original update function
        originalUpdateScene(deltaTime);
    };
}

// Updated river collision detection with splash particles
// Make sure this function is also available globally
window.setupRiverGameplay = function() {
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
                
                // Create splash effect
                createWaterSplash(player.position.x, player.position.y, player.position.z);
            }
            
            // Create small ripples while in water occasionally
            if (Math.random() > 0.95) {
                createSmallRipple(player.position.x, player.position.y, player.position.z);
            }
            
            // Mark player as in river
            gameState.playerInRiver = true;
            return;
        }
        
        // Not in river
        gameState.playerInRiver = false;
    }
    
    // Function to create water splash particle effect
    function createWaterSplash(x, y, z) {
        // Skip if particles are disabled
        if (!window.enableParticles) return;
        
        const particleCount = 20;
        const particleGroup = new THREE.Group();
        
        // Create splash material
        const splashMaterial = new THREE.MeshBasicMaterial({
            color: 0xaaddff,
            transparent: true,
            opacity: 0.7
        });
        
        for (let i = 0; i < particleCount; i++) {
            // Create a small particle
            const size = 0.05 + Math.random() * 0.15;
            const geometry = new THREE.SphereGeometry(size, 4, 4);
            const particle = new THREE.Mesh(geometry, splashMaterial);
            
            // Set initial position at the splash point
            particle.position.set(
                x + (Math.random() * 1 - 0.5),
                y,
                z + (Math.random() * 1 - 0.5)
            );
            
            // Set random velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 2;
            particle.userData = {
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: 1 + Math.random() * 3, // Up
                    z: Math.sin(angle) * speed
                },
                gravity: 9.8,
                age: 0,
                maxAge: 0.5 + Math.random() * 0.5
            };
            
            particleGroup.add(particle);
        }
        
        // Add the particle group to the scene
        scene.add(particleGroup);
        
        // Set up animation for particles
        const animateSplash = (deltaTime) => {
            let allDead = true;
            
            particleGroup.children.forEach((particle, index) => {
                // Update age
                particle.userData.age += deltaTime;
                
                // Check if particle should be removed
                if (particle.userData.age >= particle.userData.maxAge) {
                    particleGroup.remove(particle);
                    return;
                }
                
                allDead = false;
                
                // Apply gravity to y velocity
                particle.userData.velocity.y -= particle.userData.gravity * deltaTime;
                
                // Update position
                particle.position.x += particle.userData.velocity.x * deltaTime;
                particle.position.y += particle.userData.velocity.y * deltaTime;
                particle.position.z += particle.userData.velocity.z * deltaTime;
                
                // Fade out based on age
                const life = 1 - (particle.userData.age / particle.userData.maxAge);
                particle.material.opacity = life * 0.7;
                
                // Scale down slightly
                particle.scale.set(life, life, life);
            });
            
            // Remove the group when all particles are dead
            if (allDead) {
                scene.remove(particleGroup);
                window.removeAnimationCallback(animateSplash);
            }
        };
        
        // Add animation callback
        if (window.addAnimationCallback) {
            window.addAnimationCallback(animateSplash);
        }
    }
    
    // Function to create small ripples when moving in water
    function createSmallRipple(x, y, z) {
        // Skip if there's no ripple system
        if (!window.enableParticles) return;
        
        // Create a circular ripple that expands and fades
        const rippleMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        
        const rippleGeometry = new THREE.CircleGeometry(0.2, 16);
        const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
        
        // Position slightly above water surface to be visible
        ripple.position.set(x, y + 0.01, z);
        ripple.rotation.x = -Math.PI / 2; // Flat on water surface
        
        // Add to scene
        scene.add(ripple);
        
        // Set up animation
        const startTime = Date.now();
        const duration = 1000; // 1 second
        
        const animateRipple = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                scene.remove(ripple);
                window.removeAnimationCallback(animateRipple);
                return;
            }
            
            // Expand the ripple
            const scale = 0.2 + progress * 2;
            ripple.scale.set(scale, scale, scale);
            
            // Fade out
            ripple.material.opacity = 0.4 * (1 - progress);
        };
        
        // Add animation callback
        if (window.addAnimationCallback) {
            window.addAnimationCallback(animateRipple);
        }
    }
    
    // Add animation callback system if it doesn't exist
    if (!window.animationCallbacks) {
        window.animationCallbacks = [];
        window.addAnimationCallback = function(callback) {
            window.animationCallbacks.push(callback);
        };
        window.removeAnimationCallback = function(callbackToRemove) {
            window.animationCallbacks = window.animationCallbacks.filter(
                callback => callback !== callbackToRemove
            );
        };
        
        // Store original animation loop
        const originalAnimationLoop = window.animationLoop || function(){};
        
        // Override with our enhanced version
        window.animationLoop = function(timestamp) {
            // Call original loop
            originalAnimationLoop(timestamp);
            
            // Calculate delta time
            const deltaTime = window.deltaTime || 0.016;
            
            // Execute all animation callbacks
            window.animationCallbacks.forEach(callback => callback(deltaTime));
        };
    }
    
    // Enable particles by default
    window.enableParticles = true;
}