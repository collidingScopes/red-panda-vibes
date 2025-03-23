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
    const waterColor = 0x0072b5;       // Rich blue color for better realism
    
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
                const opacity = 0.3 + Math.random() * 0.4;
                
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
        
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const radius = 10 + Math.random() * 40;
            const startAngle = Math.random() * Math.PI * 2;
            const endAngle = startAngle + Math.PI * 1.5 + Math.random() * Math.PI * 0.5;
            
            ctx.globalAlpha = 0.3 + Math.random() * 0.3;
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
        
        // Add directional streaks for rapids
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        
        for (let i = 0; i < 60; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const length = 20 + Math.random() * 60;
            const angle = -Math.PI / 4 + (Math.random() * Math.PI / 2); // Mostly flow direction
            
            ctx.lineWidth = 1 + Math.random() * 3;
            ctx.globalAlpha = 0.3 + Math.random() * 0.5;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(
                x + Math.cos(angle) * length,
                y + Math.sin(angle) * length
            );
            ctx.stroke();
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
        
        // Add ripple patterns for swirls and eddies
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const radius = 15 + Math.random() * 60;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            
            // Create more dramatic ripples
            gradient.addColorStop(0, 'rgba(230, 230, 255, 0.9)');
            gradient.addColorStop(0.3, 'rgba(180, 180, 255, 0.7)');
            gradient.addColorStop(0.6, 'rgba(80, 80, 255, 0.5)');
            gradient.addColorStop(1, 'rgba(128, 128, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.globalAlpha = 0.7 + Math.random() * 0.3;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add white water rapids effect - strong normal variation
        for (let i = 0; i < 60; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const size = 10 + Math.random() * 25;
            
            // Create a strong bump for white water
            ctx.fillStyle = 'rgba(240, 240, 255, 0.9)';
            ctx.globalAlpha = 0.8;
            
            // Create irregular shapes for rapids
            ctx.beginPath();
            ctx.moveTo(x, y);
            for (let j = 0; j < 6; j++) {
                const angle = j * Math.PI / 3 + Math.random() * 0.5;
                const distance = size * (0.5 + Math.random() * 0.8);
                ctx.lineTo(
                    x + Math.cos(angle) * distance,
                    y + Math.sin(angle) * distance
                );
            }
            ctx.closePath();
            ctx.fill();
            
            // Add a shadow effect for depth
            ctx.fillStyle = 'rgba(50, 50, 200, 0.7)';
            ctx.beginPath();
            ctx.ellipse(x + 5, y + 5, size * 0.4, size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
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
    
    // Add foam particles along the edges
    addRiverFoam(riverGroup, riverCurve, riverWidth);
    
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

// Function to add foam particles along river edges for visual interest
function addRiverFoam(riverGroup, riverCurve, riverWidth) {
    const foamCount = 150; // Increased foam count for more prominent white water
    const foamMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7
    });
    
    // Create foam group
    const foamGroup = new THREE.Group();
    
    // Add foam throughout the river, with concentration at edges and rapids
    for (let i = 0; i < foamCount; i++) {
        // Random position along the river curve
        const t = Math.random();
        const point = riverCurve.getPoint(t);
        
        // Determine if this is an edge foam or mid-river foam
        const isEdgeFoam = Math.random() > 0.3; // 70% edge foam
        
        // Random side of the river
        const side = Math.random() > 0.5 ? -1 : 1;
        
        // Get tangent and normal at this point
        const tangent = riverCurve.getTangent(t);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        
        let x, z, foamType;
        
        if (isEdgeFoam) {
            // Position near the edge of the river
            const edgeFactor = 0.8 + Math.random() * 0.2; // 80-100% of the way to the edge
            x = point.x + normal.x * (riverWidth / 2) * side * edgeFactor;
            z = point.z + normal.z * (riverWidth / 2) * side * edgeFactor;
            foamType = "edge";
        } else {
            // Position somewhere in the river
            const riverPos = Math.random() * 0.8 - 0.4; // -0.4 to 0.4 (middle 80% of river)
            x = point.x + normal.x * (riverWidth / 2) * riverPos;
            z = point.z + normal.z * (riverWidth / 2) * riverPos;
            foamType = "surface";
        }
        
        // Get terrain height at this position
        const terrainHeight = getTerrainHeight(x, z);
        const y = terrainHeight - 0.5; // Slightly below water surface
        
        // Create foam particle - with different shapes based on type
        let foamGeometry;
        const foamSize = 0.1 + Math.random() * 0.4;
        
        if (foamType === "edge" || Math.random() > 0.7) {
            // Sphere for normal foam bubbles
            foamGeometry = new THREE.SphereGeometry(foamSize, 6, 6);
        } else {
            // Flatter shapes for surface foam patches
            foamGeometry = new THREE.CylinderGeometry(
                foamSize * 1.5, foamSize * 1.5, foamSize * 0.3, 6, 1
            );
            // Rotate to lay flat on water
            foamGeometry.rotateX(Math.PI / 2);
        }
        
        const foam = new THREE.Mesh(foamGeometry, foamMaterial.clone());
        foam.material.opacity = 0.5 + Math.random() * 0.5;
        
        foam.position.set(x, y, z);
        
        // Store original position and other animation data
        foam.userData = {
            t: t,                    // Position along the curve
            side: side,              // Which side of the river
            foamType: foamType,      // Type of foam (edge or surface)
            speed: 0.02 + Math.random() * 0.07, // Speed of movement (faster)
            originalY: y,            // Original y position
            bobAmount: 0.05 + Math.random() * 0.15, // How much it bobs up and down
            bobSpeed: 1 + Math.random() * 3, // Speed of bobbing
            spinSpeed: Math.random() * 2 - 1, // Random rotation
        };
        
        foamGroup.add(foam);
    }
    
    riverGroup.add(foamGroup);
    
    // Store foam group for animation
    if (window.gameState) {
        window.gameState.riverFoam = foamGroup;
    }
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
    
    // Generate rapids placement
    const createRapidsPositions = () => {
        // Check if riverCurve exists and rapids haven't been created yet
        if (!window.gameState.riverCurve) {
            console.warn("River curve not available for rapids creation");
            return; // Exit if no curve exists
        }
        
        if (!window.gameState.rapidPositions) {
            // Place rapids at intervals along the river
            const rapidPositions = [];
            const riverCurve = window.gameState.riverCurve;
            const numRapids = 8 + Math.floor(Math.random() * 5);
            
            for (let i = 0; i < numRapids; i++) {
                // Distribute rapids along the river
                const t = 0.1 + (i / numRapids) * 0.8; // Avoid edges
                const point = riverCurve.getPoint(t);
                const tangent = riverCurve.getTangent(t);
                
                rapidPositions.push({
                    position: point.clone(),
                    t: t,
                    radius: 5 + Math.random() * 10,
                    intensity: 0.5 + Math.random() * 0.5,
                    flowDirection: tangent.clone()
                });
            }
            
            window.gameState.rapidPositions = rapidPositions;
        }
    };
    
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
    createRapidsPositions();
    createWaterSplashSystem();
    
    // Override with our modified function that includes enhanced water animation
    window.updateScene = function(deltaTime) {
        // Call the original update function
        originalUpdateScene(deltaTime);
        
        // Update water animations
        updateWaterAnimations(deltaTime);
    };
    
    // Function to update water animations
    function updateWaterAnimations(deltaTime) {
        // Skip if game is over or not initialized
        if (!window.gameState) return;
        
        // Update animation times
        const anim = window.gameState.waterAnimTime;
        anim.flowTime += deltaTime;
        anim.waveTime += deltaTime;
        anim.rapidTime += deltaTime;
        anim.foamTime += deltaTime;
        
        // Animate water texture flow with varying speeds in different areas
        if (window.gameState.waterTexture) {
            // Main flow direction
            window.gameState.waterTexture.offset.y -= 0.03 * deltaTime;
            
            // Add some side-to-side motion for more natural flow
            const sideMotion = Math.sin(anim.flowTime * 0.2) * 0.002;
            window.gameState.waterTexture.offset.x += sideMotion;
        }
        
        // Animate normal map with more complex motion
        if (window.gameState.waterNormalMap) {
            // Main flow direction
            window.gameState.waterNormalMap.offset.y -= 0.04 * deltaTime;
            
            // Add wobble effect
            const wobbleX = Math.sin(anim.waveTime * 0.5) * 0.003;
            const wobbleY = Math.cos(anim.waveTime * 0.3) * 0.002;
            
            window.gameState.waterNormalMap.offset.x += wobbleX + (0.01 * deltaTime);
            window.gameState.waterNormalMap.offset.y += wobbleY;
        }
        
        // Animate foam texture if it exists
        if (window.gameState.foamTexture) {
            window.gameState.foamTexture.offset.y -= 0.05 * deltaTime;
            
            // Animate scale slightly for more dynamic feel
            const scaleWobble = 1 + Math.sin(anim.foamTime * 0.4) * 0.05;
            window.gameState.foamTexture.repeat.set(6, 1.5 * scaleWobble);
        }
        
        // Animate foam particles with more dynamic behavior
        if (window.gameState.riverFoam) {
            const foamGroup = window.gameState.riverFoam;
            const riverCurve = window.gameState.riverCurve;
            
            // Skip if no riverCurve available
            if (!riverCurve) return;
            
            foamGroup.children.forEach(foam => {
                // Vary speed based on position - faster in middle, slower at edges
                const speedVariation = 1 + (Math.sin(anim.flowTime * 0.3 + foam.userData.t * Math.PI * 2) * 0.3);
                
                // Update position along the river
                foam.userData.t += foam.userData.speed * deltaTime * speedVariation;
                if (foam.userData.t > 1) foam.userData.t = 0;
                
                // Get new position on the curve
                const point = riverCurve.getPoint(foam.userData.t);
                
                // Get tangent and normal at this point
                const tangent = riverCurve.getTangent(foam.userData.t);
                const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
                
                // More dynamic edge movement
                const time = anim.foamTime * foam.userData.bobSpeed;
                const edgePulsation = 0.7 + Math.sin(time) * 0.2 + Math.sin(time * 2.7) * 0.1;
                
                const x = point.x + normal.x * (window.gameState.riverWidth / 2) * foam.userData.side * edgePulsation;
                const z = point.z + normal.z * (window.gameState.riverWidth / 2) * foam.userData.side * edgePulsation;
                
                // More complex bobbing motion
                const bobHeight = foam.userData.bobAmount * (1 + Math.sin(time * 1.5) * 0.2);
                const y = foam.userData.originalY + Math.sin(time) * bobHeight + Math.sin(time * 2.5) * bobHeight * 0.3;
                
                // Update foam position
                foam.position.set(x, y, z);
                
                // Vary opacity for more natural look
                foam.material.opacity = 0.7 + Math.sin(time * 0.8) * 0.3;
            });
        }
        
        // Dynamic vertex animation for the river surface
        if (window.gameState.riverMesh) {
            const mesh = window.gameState.riverMesh;
            
            // Make sure we have a valid geometry
            if (mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.position) {
                const positions = mesh.geometry.attributes.position.array;
                const vertexCount = positions.length / 3;
                
                // Create wave patterns that travel along the river
                const time = anim.waveTime;
                
                // Update a portion of vertices each frame for better performance
                // Only process a subset of vertices each frame
                const updateCount = Math.min(100, vertexCount);
                for (let i = 0; i < updateCount; i++) {
                    // Choose a random vertex
                    const vertexIdx = Math.floor(Math.random() * vertexCount);
                    const idx = vertexIdx * 3 + 1; // Y-coordinate
                    
                    // Make sure index is valid
                    if (idx >= positions.length) continue;
                    
                    // Get x and z coordinates for position-based variation
                    const x = positions[idx - 1];
                    const z = positions[idx + 1];
                    
                    // Create traveling waves
                    const wavePhase1 = (x * 0.05 + z * 0.05 + time * 0.5) * Math.PI * 2;
                    const wavePhase2 = (x * 0.02 - z * 0.03 + time * 0.7) * Math.PI * 2;
                    
                    // Estimate position in river (0 = edge, 1 = center)
                    const edgeFactor = 0.5 + Math.sin(vertexIdx / vertexCount * Math.PI) * 0.5;
                    
                    // Combine waves with different frequencies
                    const wave = (Math.sin(wavePhase1) * 0.15 + Math.sin(wavePhase2) * 0.08) * edgeFactor;
                    
                    // Set the new height with clamping to prevent extreme values
                    const originalY = positions[idx];
                    positions[idx] = originalY * 0.9 + wave * 0.1;
                }
                
                mesh.geometry.attributes.position.needsUpdate = true;
            }
        }
        
        // Only update rapids if we have all required components
        if (window.gameState.rapidPositions && window.gameState.splashSystem) {
            updateRapids(deltaTime);
        }
    }
    
    // Function to create and update rapids effects
    function updateRapids(deltaTime) {
        if (!window.gameState.rapidPositions || !window.gameState.splashSystem) return;
        
        const rapids = window.gameState.rapidPositions;
        const splashSystem = window.gameState.splashSystem;
        const now = Date.now();
        
        // Only proceed if we have valid data
        if (!Array.isArray(rapids) || rapids.length === 0) return;
        
        // Spawn new splashes at rapids locations periodically
        if (now - splashSystem.lastSpawnTime > 100) { // Every 100ms
            splashSystem.lastSpawnTime = now;
            
            // Pick a random rapid location
            const rapidIndex = Math.floor(Math.random() * rapids.length);
            const rapid = rapids[rapidIndex];
            
            // Create a new splash at this location if rapid has valid data
            if (rapid && rapid.position) {
                createSplashAtRapid(rapid);
            }
        }
        
        // Update existing splashes
        const splashes = splashSystem.splashes;
        for (let i = splashes.length - 1; i >= 0; i--) {
            const splash = splashes[i];
            
            // Update age
            splash.age += deltaTime;
            
            // Remove if too old
            if (splash.age >= splash.lifetime) {
                splashSystem.group.remove(splash.mesh);
                splashes.splice(i, 1);
                continue;
            }
            
            // Update position based on velocity
            splash.mesh.position.x += splash.velocity.x * deltaTime;
            splash.mesh.position.y += splash.velocity.y * deltaTime;
            splash.mesh.position.z += splash.velocity.z * deltaTime;
            
            // Apply gravity
            splash.velocity.y -= 9.8 * deltaTime;
            
            // Update opacity based on age
            const lifeProgress = splash.age / splash.lifetime;
            splash.mesh.material.opacity = 0.8 * (1 - lifeProgress);
            
            // Scale down over time
            const scale = 1 - (lifeProgress * 0.5);
            splash.mesh.scale.set(scale, scale, scale);
        }
    }
    
    // Function to create a water splash effect at a rapid
    function createSplashAtRapid(rapid) {
        if (!window.gameState.splashSystem) return;
        
        const splashSystem = window.gameState.splashSystem;
        
        // Safety check for required properties
        if (!rapid.position || !rapid.flowDirection) {
            console.warn("Invalid rapid data for splash creation");
            return;
        }
        
        // Number of splash particles to create
        const particleCount = 1 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < particleCount; i++) {
            // Random position within the rapid area
            const randomAngle = Math.random() * Math.PI * 2;
            const randomRadius = Math.random() * rapid.radius * 0.8;
            const x = rapid.position.x + Math.cos(randomAngle) * randomRadius;
            const z = rapid.position.z + Math.sin(randomAngle) * randomRadius;
            
            // Get terrain height at this position
            let terrainHeight = 0;
            try {
                terrainHeight = getTerrainHeight(x, z);
            } catch (e) {
                // If getTerrainHeight is not available, use the rapid's y position
                terrainHeight = rapid.position.y;
            }
            
            const y = terrainHeight - 0.3; // Slightly below water surface
            
            // Create splash geometry
            const size = 0.2 + Math.random() * 0.4;
            const geometry = new THREE.SphereGeometry(size, 4, 4);
            
            // Clone material to allow individual opacity
            const material = splashSystem.material.clone();
            const mesh = new THREE.Mesh(geometry, material);
            
            // Position splash
            mesh.position.set(x, y, z);
            
            // Calculate velocity - mostly up and in flow direction
            const flowDir = rapid.flowDirection;
            const speedFactor = 0.5 + Math.random() * rapid.intensity;
            
            const splash = {
                mesh: mesh,
                lifetime: 0.5 + Math.random() * 0.5,
                age: 0,
                velocity: {
                    x: flowDir.x * speedFactor + (Math.random() * 0.5 - 0.25),
                    y: 1 + Math.random() * 2,
                    z: flowDir.z * speedFactor + (Math.random() * 0.5 - 0.25)
                }
            };
            
            // Add to system
            splashSystem.group.add(mesh);
            splashSystem.splashes.push(splash);
        }
    }
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