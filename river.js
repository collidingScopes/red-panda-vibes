// Fix the water animation by properly using waterShaderTime
let waterShaderTime = 0; // Keep this global variable

window.createRiver = function() {
    console.log("Generating smooth river with flow animation...");
    
    // River group to hold all segments
    const riverGroup = new THREE.Group();
    
    // River settings
    const riverWidth = 15.0;
    const riverDepth = -0.7;
    const curveSegments = 80;
    const curveResolution = 80;
    const mapRadius = 150;
    
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
    
    // Create water material with flow animation - MODIFIED to use global waterShaderTime
    const waterMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: waterShaderTime }, // Initialize with current waterShaderTime
            uFlowSpeed: { value: 0.5 },
            uSwirlIntensity: { value: 0.3 },
            uBaseColor: { value: new THREE.Color(0x06d6d6) },
            uFoamColor: { value: new THREE.Color(0xffffff) },
            uWaveHeight: { value: 0.2 },
            uNormalStrength: { value: 0.6 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            uniform float uTime;
            uniform float uWaveHeight;
            
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                
                // Add subtle wave displacement
                float wave = sin(position.x * 4.0 + uTime) * cos(position.z * 4.0 + uTime) * uWaveHeight;
                vec3 newPosition = position + normal * wave;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uFlowSpeed;
            uniform float uSwirlIntensity;
            uniform vec3 uBaseColor;
            uniform vec3 uFoamColor;
            uniform float uNormalStrength;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            // Simple noise function
            float noise(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            
            // Smooth noise
            float smoothNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(noise(i + vec2(0.0, 0.0)), noise(i + vec2(1.0, 0.0)), u.x),
                    mix(noise(i + vec2(0.0, 1.0)), noise(i + vec2(1.0, 1.0)), u.x),
                    u.y
                );
            }
            
            // Flowing water effect
            vec2 flowDirection(vec2 uv) {
                float t = uTime * uFlowSpeed;
                vec2 flow = vec2(
                    smoothNoise(uv + vec2(t, 0.0)) - 0.5,
                    smoothNoise(uv + vec2(0.0, t)) - 0.5
                );
                return normalize(flow) * uSwirlIntensity;
            }
            
            void main() {
                // Calculate flowing UV coordinates
                vec2 flowUV = vUv + flowDirection(vUv) * uTime;
                
                // Create swirling patterns
                float swirl = smoothNoise(flowUV * 8.0);
                float turbulence = smoothNoise(flowUV * 5.0 + vec2(uTime * 0.5));
                
                // Calculate normal perturbation
                vec3 normalPerturb = vec3(
                    smoothNoise(flowUV + vec2(0.1, 0.0)) - smoothNoise(flowUV - vec2(0.1, 0.0)),
                    smoothNoise(flowUV + vec2(0.0, 0.1)) - smoothNoise(flowUV - vec2(0.0, 0.1)),
                    1.0
                );
                vec3 perturbedNormal = normalize(vNormal + normalPerturb * uNormalStrength);
                
                // Base water color with depth variation
                vec3 color = uBaseColor * (0.6 + swirl * 0.4);
                
                // Add foam where there's more turbulence
                float foamFactor = smoothstep(0.7, 1.0, turbulence);
                color = mix(color, uFoamColor, foamFactor * 0.6);
                
                // Simple lighting
                vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
                float diff = max(dot(perturbedNormal, lightDir), 0.0);
                color *= (0.5 + diff * 0.5);
                
                // Add subtle specular
                vec3 viewDir = normalize(-vPosition);
                vec3 reflectDir = reflect(-lightDir, perturbedNormal);
                float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
                color += vec3(spec * 0.3);
                
                gl_FragColor = vec4(color, 0.85);
            }
        `,
        transparent: true,
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
    
    // Create water animation system - FIXED
    setupWaterAnimation(riverMesh);
    
    // Store river path in game state for collision detection
    if (window.gameState) {
        window.gameState.riverPath = riverPath;
        window.gameState.riverWidth = riverWidth;
        window.gameState.riverCurve = riverCurve; // Store the curve for animation
        window.gameState.riverMesh = riverMesh; // Store mesh for animation updates
    }
    
    return riverGroup;
}

// Modified to ensure the riverMesh is passed directly to setupWaterAnimation
function setupWaterAnimation(riverMesh) {
    if (window.riverAnimationSetup) return;
    window.riverAnimationSetup = true;
    
    const originalUpdateScene = window.updateScene || function(){};
    
    window.updateScene = function(deltaTime) {
        // Call original update scene function if it exists
        originalUpdateScene(deltaTime);
        
        // Update global waterShaderTime - critical for animation
        waterShaderTime += deltaTime * 0.5; // Adjust speed factor as needed
        
        // Directly update the shader uniform with the current waterShaderTime
        if (riverMesh && riverMesh.material && riverMesh.material.uniforms) {
            riverMesh.material.uniforms.uTime.value = waterShaderTime;
        }
    };
    
    // Ensure the animation loop uses waterShaderTime correctly
    const originalAnimationLoop = window.animationLoop || function(){};
    
    window.animationLoop = function(timestamp) {
        // Calculate delta time, using a fixed small increment if needed
        const deltaTime = 1/60; // ~60fps
        
        // Update water shader time
        // Call the updateScene which will update the water shader
        window.updateScene(deltaTime);
        
        // Call original animation loop
        originalAnimationLoop(timestamp);
    };
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
            
            // Apply current effect - use waterShaderTime for consistent animation
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
        
        // Set up animation for particles based on waterShaderTime
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
        const startTime = waterShaderTime; // Use waterShaderTime for consistent animation
        const duration = 1.0; // 1 second (in normalized time)
        
        const animateRipple = (deltaTime) => {
            const elapsed = waterShaderTime - startTime;
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
        
        // Override with our enhanced version that properly updates waterShaderTime
        window.animationLoop = function(timestamp) {
            // Calculate delta time
            const deltaTime = 1/60; // Fixed time step (~60fps)
            
            // Update waterShaderTime - this is the critical part for water animation
            waterShaderTime += deltaTime;
            
            // Execute all animation callbacks
            window.animationCallbacks.forEach(callback => callback(deltaTime));
            
            // Call original loop
            originalAnimationLoop(timestamp);
        };
    }
    
    // Enable particles by default
    window.enableParticles = true;
}