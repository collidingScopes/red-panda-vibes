// Enhanced Portal System for Red Panda Vibes
// Creates functional fantasy-styled portals that open URLs when activated

// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Portal system initializing...");
    initPortalSystem();
});

function initPortalSystem() {
    console.log("Waiting for game initialization...");
    let attempts = 0;
    const maxAttempts = 30; // Give more time to initialize
    
    // Check for game initialization every second
    const checkInterval = setInterval(() => {
        attempts++;
        // Look for key game elements
        const canvasExists = document.querySelector('canvas') !== null;
        const gameStarted = document.getElementById('start-game-button')?.classList.contains('hidden') || false;
        
        // Log progress to help debug
        if (attempts % 5 === 0) {
            console.log(`Portal init attempt ${attempts}/${maxAttempts} - Canvas: ${canvasExists}, Game started: ${gameStarted}`);
            
            // Check if scene would be available
            const scene = getGameScene();
            console.log(`Scene available: ${scene !== null}`);
            
            // Check global THREE.js objects
            console.log("THREE available:", typeof THREE !== 'undefined');
            console.log("Scene keys:", scene ? Object.keys(scene).join(', ') : 'N/A');
        }
        
        if (canvasExists && gameStarted) {
            console.log("Game detected as running, creating portals...");
            clearInterval(checkInterval);
            createPortals();
            return;
        }
        
        // As a fallback, if we've waited too long, try creating portals anyway
        if (attempts >= maxAttempts && canvasExists) {
            console.log("Maximum wait time exceeded. Attempting to create portals anyway...");
            clearInterval(checkInterval);
            
            // Allow some extra time for scene to be available
            setTimeout(() => {
                console.log("Delayed portal creation starting...");
                createPortals();
            }, 2000);
        }
    }, 1000);
}

// Portal class - handles creation and behavior of each portal
class Portal {
    constructor(position, url, color = 0xa020f0, name = "Portal") {
        this.position = position;
        this.url = url;
        this.name = name;
        this.color = color;
        this.activationRadius = 5; // Distance at which player can activate portal
        this.animationStartRadius = 20; // Distance at which animations begin
        this.portalGroup = new THREE.Group();
        this.portalActive = true;
        this.cooldownTime = 1000;
        this.lastActivationTime = 0;
        this.isAnimating = false;
        
        this.createPortal();
    }
    
    createPortal() {
        // Get scene from the existing THREE.js scene
        const scene = getGameScene();
        if (!scene) {
            console.error("Cannot create portal: scene not found");
            
            // We'll try attaching to the scene once it becomes available
            const checkForScene = setInterval(() => {
                const newScene = getGameScene();
                if (newScene && this.portalGroup) {
                    console.log(`Found scene, adding delayed portal ${this.name}`);
                    clearInterval(checkForScene);
                    newScene.add(this.portalGroup);
                }
            }, 2000); // Check every 2 seconds
            
            // Continue setup without adding to scene yet
        }
        
        // Verify THREE.js is available
        if (typeof THREE === 'undefined') {
            console.error("THREE.js not available for portal creation");
            return;
        }
        
        try {
            // Create the stone arch (external ring)
            const stoneRingGeometry = new THREE.TorusGeometry(4, 1, 12, 32);
            const stoneMaterial = new THREE.MeshStandardMaterial({
                color: 0x5b037d,
                roughness: 0.7,
                metalness: 0.5,
            });
            const stoneRing = new THREE.Mesh(stoneRingGeometry, stoneMaterial);
            stoneRing.castShadow = true;
            this.portalGroup.add(stoneRing);
            
            // Create inner ring with glowing effect
            const innerRingGeometry = new THREE.TorusGeometry(4, 0.3, 12, 32);
            const innerRingMaterial = new THREE.MeshStandardMaterial({
                color: this.color,
                emissive: this.color,
                emissiveIntensity: 0.5,
                metalness: 0.8,
                roughness: 0.2,
            });
            this.innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
            this.portalGroup.add(this.innerRing);
            
            // Create portal center - energy vortex
            const portalGeometry = new THREE.CircleGeometry(4, 32);
            this.portalMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide,
            });
            
            // Create a simple spiral pattern texture
            const spiralTexture = this.createSpiralTexture();
            this.portalMaterial.map = spiralTexture;
            this.portalMaterial.alphaMap = spiralTexture;
            
            this.portalCenter = new THREE.Mesh(portalGeometry, this.portalMaterial);
            this.portalCenter.position.z = 0.1;
            this.portalGroup.add(this.portalCenter);
            
            // Create particle system
            this.createParticles();
            
            // Get terrain height at position and place portal upright
            let terrainHeight = 0;
            try {
                terrainHeight = getTerrainHeightAt(this.position.x, this.position.z);
            } catch (e) {
                console.warn("Could not get terrain height, using default", e);
                // Default fallback height
                terrainHeight = 0;
            }
            this.position.y = terrainHeight + 3.5;
            
            // Set portal position
            this.portalGroup.position.set(this.position.x, this.position.y, this.position.z);
            
            // Create portal lights
            this.createPortalLights();
            
            // Add label above portal
            this.addPortalLabel();
            
            // Add the portal to the scene if available
            if (scene) {
                scene.add(this.portalGroup);
                console.log(`Portal "${this.name}" created at (${this.position.x}, ${this.position.y}, ${this.position.z})`);
            } else {
                console.log(`Portal "${this.name}" created but waiting for scene to be available`);
            }
        } catch (e) {
            console.error("Error during portal creation:", e);
        }
    }
    
    createPortalLights() {
        // Main portal light in center
        this.portalLight = new THREE.PointLight(this.color, 3, 20);
        this.portalLight.position.set(0, 0, 0.5);
        this.portalLight.intensity = 0.3; // Start dimmed
        this.portalGroup.add(this.portalLight);
        
        // Ambient pulsing light
        this.ambientLight = new THREE.PointLight(this.color, 1, 20);
        this.ambientLight.position.set(0, 0, 2);
        this.ambientLight.intensity = 0.2; // Start dimmed
        this.portalGroup.add(this.ambientLight);
    }
    
    createSpiralTexture() {
        // Create a canvas for the spiral texture
        const canvas = document.createElement('canvas');
        canvas.width = 512; // Increased resolution for better detail
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Clear with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw a spiral pattern
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // More vibrant background gradient
        const bgGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, canvas.width / 2
        );
        
        // Add color stops based on portal color
        const colorObj = new THREE.Color(this.color);
        const complementaryColor = new THREE.Color(
            1 - colorObj.r,
            1 - colorObj.g,
            1 - colorObj.b
        );
        
        // Background gradient with more contrast
        bgGradient.addColorStop(0, 'white');
        bgGradient.addColorStop(0.4, colorObj.getStyle());
        bgGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.8)');
        bgGradient.addColorStop(0.9, complementaryColor.getStyle());
        bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        
        // Fill background
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw multiple spiral arms for more visual interest
        for (let arm = 0; arm < 3; arm++) {
            const armOffset = (Math.PI * 2 / 3) * arm;
            ctx.beginPath();
            
            // Create gradient for this spiral arm
            const spiralGradient = ctx.createLinearGradient(
                centerX - canvas.width/2, centerY - canvas.height/2,
                centerX + canvas.width/2, centerY + canvas.height/2
            );
            
            // Alternate colors for each arm for more visual interest
            if (arm % 2 === 0) {
                spiralGradient.addColorStop(0, 'white');
                spiralGradient.addColorStop(0.5, colorObj.getStyle());
                spiralGradient.addColorStop(1, 'white');
            } else {
                spiralGradient.addColorStop(0, colorObj.getStyle());
                spiralGradient.addColorStop(0.5, 'white');
                spiralGradient.addColorStop(1, colorObj.getStyle());
            }
            
            ctx.strokeStyle = spiralGradient;
            ctx.lineWidth = 8; // Thicker lines for better visibility
            
            // Draw spiral with more iterations and tighter spacing
            for (let i = 0; i < 1500; i++) {
                const angle = (i / 20) + armOffset;
                const radius = (i / 1500) * (canvas.width / 1.8);
                
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    }
    
    createParticles() {
        // Create particle system for the swirling effect
        const particleCount = 400;
        const particles = new THREE.BufferGeometry();
        
        // Create arrays for particle positions
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        // Generate particles in a disc pattern
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const radius = Math.random() * 4.5;
            const angle = Math.random() * Math.PI * 2;
            
            positions[i3] = Math.cos(angle) * radius;
            positions[i3 + 1] = Math.sin(angle) * radius;
            positions[i3 + 2] = (Math.random() - 0.5) * 0.5;
            
            // Convert portal color to RGB for particles
            const color = new THREE.Color(this.color);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }
        
        // Set attributes for the particles
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Material for the particles
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // Create the particle system
        this.particles = new THREE.Points(particles, particleMaterial);
        this.portalGroup.add(this.particles);
        
        // Store initial positions for animation
        this.particleInitialPositions = positions.slice();
    }
    
    addPortalLabel() {
        // Create a canvas for the label text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 100;
        
        // Set up text style
        context.fillStyle = 'rgba(72, 3, 99, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = 'bold 70px Courier New';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Create gradient for text
        const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#84ffef');  // Cyan
        gradient.addColorStop(0.5, '#ff84f0'); // Pink
        gradient.addColorStop(1, '#a2ff84');  // Green
        
        context.fillStyle = gradient;
        context.fillText(this.name, canvas.width / 2, canvas.height / 2);

        // Create a texture from the canvas
        const texture = new THREE.CanvasTexture(canvas);
        
        // Create a sprite material with the texture
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.3 // Start dim
        });
        
        // Create the sprite
        this.labelSprite = new THREE.Sprite(material);
        this.labelSprite.scale.set(10, 2.5, 1); // text size
        this.labelSprite.position.set(0, 5.5, 0); // Position above the portal

        this.portalGroup.add(this.labelSprite);
    }
    
    update(deltaTime, playerPosition) {
        if (!this.portalActive) return;
        
        // Calculate distance to player
        const dx = playerPosition.x - this.portalGroup.position.x;
        const dy = playerPosition.y - this.portalGroup.position.y;
        const dz = playerPosition.z - this.portalGroup.position.z;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Make portal face player for better visibility
        this.facePlayer(playerPosition);
        
        // Animation phase - activate when player is getting close
        if (distanceToPlayer < this.animationStartRadius) {
            if (!this.isAnimating) {
                this.startPortalAnimation();
            }
            
            // Update animations
            this.updatePortalAnimation(deltaTime, distanceToPlayer);
            
            // Show UI indicator when near portal
            updatePortalUI(true, this.name);
            
            // If player is within activation radius, activate the portal
            if (distanceToPlayer < this.activationRadius) {
                const currentTime = Date.now();
                
                // Check cooldown to prevent rapid re-activation
                if (currentTime - this.lastActivationTime > this.cooldownTime) {
                    this.activate();
                    this.lastActivationTime = currentTime;
                }
            }
        } else if (this.isAnimating) {
            // Deactivate animations when player moves away
            this.stopPortalAnimation();
            updatePortalUI(false, "");
        }
    }
    
    startPortalAnimation() {
        this.isAnimating = true;
        
        // Increase opacity of portal elements
        this.fadeIn(this.portalMaterial, 0.8);
        this.fadeIn(this.particles.material, 0.7);
        this.fadeIn(this.labelSprite.material, 0.8);
        
        // Increase light intensity
        this.portalLight.intensity = 8.2;
        this.ambientLight.intensity = 1.2;
        
        console.log(`Portal "${this.name}" animation started`);
    }
    
    stopPortalAnimation() {
        this.isAnimating = false;
        
        // Decrease opacity of portal elements
        this.fadeIn(this.portalMaterial, 0.1);
        this.fadeIn(this.particles.material, 0.1);
        this.fadeIn(this.labelSprite.material, 0.1);
        
        // Decrease light intensity
        this.portalLight.intensity = 0.1;
        this.ambientLight.intensity = 0.1;
    }
    
    fadeIn(material, targetOpacity) {
        material.opacity = targetOpacity;
    }
    
    updatePortalAnimation(deltaTime, distanceToPlayer) {
        // Intensify animations as player gets closer
        const proximityFactor = 1 - (distanceToPlayer / this.animationStartRadius);
        
        // Rotate portal center
        this.portalCenter.rotation.z += deltaTime * 0.5 * (1 + proximityFactor);
        
        // Pulse the ambient light
        const time = performance.now() * 0.002;
        this.ambientLight.intensity = 1.2 + Math.sin(time * 2) * 0.4 * proximityFactor;
        
        // Rotate inner ring in opposite direction
        this.innerRing.rotation.z -= deltaTime * 0.25;
        
        // Animate particles
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            const particleCount = positions.length / 3;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                
                // Get initial position
                const x = this.particleInitialPositions[i3];
                const y = this.particleInitialPositions[i3 + 1];
                
                // Calculate rotation speed based on distance from center
                const distance = Math.sqrt(x * x + y * y);
                const rotationSpeed = (1 - distance / 5) * 2 * proximityFactor;
                const angle = time * rotationSpeed;
                
                // Rotate position
                positions[i3] = x * Math.cos(angle) - y * Math.sin(angle);
                positions[i3 + 1] = x * Math.sin(angle) + y * Math.cos(angle);
                
                // Add slight vertical wobble
                positions[i3 + 2] = Math.sin(time * 5 + i * 0.1) * 0.2 * proximityFactor;
            }
            
            // Mark positions for update
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
    }
    
    facePlayer(playerPosition) {
        // Calculate direction to player
        const direction = new THREE.Vector3(
            playerPosition.x - this.portalGroup.position.x,
            0, // Ignore Y to keep portal upright
            playerPosition.z - this.portalGroup.position.z
        );
        
        // Only rotate if the player is moving
        if (direction.length() > 0.1) {
            direction.normalize();
            
            // Create a temporary target position in front of the portal
            const targetPos = new THREE.Vector3().copy(this.portalGroup.position).add(direction);
            
            // Look at the target position
            this.portalGroup.lookAt(targetPos);
        }
    }
    
    activate() {
        // Only trigger if player is actually moving through the portal
        if (!this.isAnimating) return;
        
        console.log(`Portal "${this.name}" activated! Opening ${this.url}`);
        
        // Play portal sound if available
        if (window.soundSystem && window.soundSystem.initialized) {
            // Create ascending tones for portal activation
            window.soundSystem.playTone(300, 0.1, 'sine', 0.3);
            window.soundSystem.playTone(450, 0.15, 'sine', 0.3, 0.1);
            window.soundSystem.playTone(600, 0.2, 'sine', 0.3, 0.25);
            window.soundSystem.playTone(900, 0.4, 'sine', 0.3, 0.45);
        }
        
        // Create and click a link element
        const link = document.createElement('a');
        link.href = this.url;
        link.target = "_blank";
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Remove this portal from the scene
        this.removeFromScene();

        // Remove this portal from the global portals array
        this.removeFromPortalsArray();
        // Hide portal UI elements
        updatePortalUI(false, "");

        resetAllKeyStates();
        pauseGame();

    }
    
    // Add these helper methods to the Portal class
    removeFromScene() {
        try {
            // Get scene
            const scene = getGameScene();
            if (scene && this.portalGroup) {
                // Remove the portal from the scene
                scene.remove(this.portalGroup);
                console.log(`Removed portal "${this.name}" from scene`);
                
                // Properly dispose of resources
                if (this.portalGroup) {
                    this.disposePortalResources();
                }
            }
        } catch (e) {
            console.error(`Error removing portal "${this.name}" from scene:`, e);
        }
    }
    
    removeFromPortalsArray() {
        try {
            // Remove from the global portals array if it exists
            if (window.__portals && Array.isArray(window.__portals)) {
                const index = window.__portals.findIndex(portal => portal === this);
                if (index !== -1) {
                    window.__portals.splice(index, 1);
                    console.log(`Removed portal "${this.name}" from portals array. Remaining portals: ${window.__portals.length}`);
                }
            }
        } catch (e) {
            console.error(`Error removing portal "${this.name}" from portals array:`, e);
        }
    }
    
    disposePortalResources() {
        try {
            // Dispose of geometries and materials to prevent memory leaks
            if (this.innerRing) {
                if (this.innerRing.geometry) this.innerRing.geometry.dispose();
                if (this.innerRing.material) this.innerRing.material.dispose();
            }
            
            if (this.portalCenter) {
                if (this.portalCenter.geometry) this.portalCenter.geometry.dispose();
                if (this.portalCenter.material) {
                    if (this.portalCenter.material.map) this.portalCenter.material.map.dispose();
                    if (this.portalCenter.material.alphaMap) this.portalCenter.material.alphaMap.dispose();
                    this.portalCenter.material.dispose();
                }
            }
            
            if (this.particles) {
                if (this.particles.geometry) this.particles.geometry.dispose();
                if (this.particles.material) this.particles.material.dispose();
            }
            
            if (this.labelSprite && this.labelSprite.material) {
                if (this.labelSprite.material.map) this.labelSprite.material.map.dispose();
                this.labelSprite.material.dispose();
            }
            
            // Remove references
            this.innerRing = null;
            this.portalCenter = null;
            this.particles = null;
            this.labelSprite = null;
            this.portalGroup = null;
            this.portalLight = null;
            this.ambientLight = null;
            
            console.log(`Portal "${this.name}" resources disposed`);
        } catch (e) {
            console.error(`Error disposing portal "${this.name}" resources:`, e);
        }
    }
}

// Update UI when near a portal
function updatePortalUI(isNearPortal, portalName) {
    const infoElement = document.getElementById('portal-info');
    
    if (infoElement) {
        if (isNearPortal) {
            infoElement.textContent = `${portalName} Nearby`;
            infoElement.classList.add('visible');
        } else {
            infoElement.classList.remove('visible');
        }
    }
}

// Helper function to get the game scene
function getGameScene() {
    // Check for various scene references
    if (window.scene) return window.scene;
    if (window.__scene) return window.__scene;
    if (window.gameState && window.gameState.scene) return window.gameState.scene;
    
    // Try to find the scene in the renderer
    const canvas = document.querySelector('canvas');
    if (canvas && canvas.__renderer && canvas.__renderer.scene) {
        return canvas.__renderer.scene;
    }
    
    // Try to find it as a property in THREE
    if (window.THREE && window.THREE.Scene && window.THREE.Scene.current) {
        return window.THREE.Scene.current;
    }
    
    // Last resort: search for the scene in the window object
    const findScene = function(obj, depth = 0) {
        if (depth > 3 || !obj) return null; // Limit recursion depth
        
        // Check if this object is a THREE.Scene
        if (obj.type === 'Scene' && 
            obj.isScene && 
            typeof obj.add === 'function') {
            return obj;
        }
        
        // Check direct properties
        for (const key in obj) {
            try {
                const value = obj[key];
                if (value && value.type === 'Scene' && 
                    value.isScene && 
                    typeof value.add === 'function') {
                    return value;
                }
            } catch (e) {
                // Skip properties that can't be accessed
            }
        }
        
        return null;
    };
    
    // First check if scene is directly in window
    const windowScene = findScene(window);
    if (windowScene) return windowScene;
    
    // Check if scene is in the global game object
    if (window.game) {
        const gameScene = findScene(window.game);
        if (gameScene) return gameScene;
    }
    
    // As a last resort, try accessing scene from the global renderer
    if (window.renderer && window.renderer.scenes && window.renderer.scenes.length > 0) {
        return window.renderer.scenes[0];
    }
    
    // Log error with more context
    console.error("Scene not found. Available globals:", Object.keys(window).filter(k => typeof window[k] === 'object' && window[k] !== null).join(', '));
    return null;
}

// Helper function to get the player
function getGamePlayer() {
    // Try to access the player from common global variables
    return window.player || (window.gameState ? window.gameState.player : null);
}

// Helper to get terrain height at a position
function getTerrainHeightAt(x, z) {
    // First try to use the game's getTerrainHeight function if available
    if (window.getTerrainHeight) {
        return window.getTerrainHeight(x, z);
    }
    
    // Fallback: simple terrain height approximation
    return Math.max(0, (
        Math.sin(x * 0.03) * Math.cos(z * 0.03) * 12 + 
        Math.sin(x * 0.07 + z * 0.05) * 4 +
        Math.sin(x * 0.1 + 1.5) * Math.cos(z * 0.08 + 2.3) * 5
    ) * 0.7);
}

// Create the portals
function createPortals() {
    console.log("Creating magical portals...");
    
    // Verify if scene is available - very important!
    const scene = getGameScene();
    if (!scene) {
        console.error("Failed to find scene. Attempting alternative approach...");
        
        // Check if we can access the scene via renderer
        if (window.renderer && typeof window.renderer.render === 'function') {
            // If renderer exists, let's try to inject our scene detection
            // This is a last resort approach
            const originalRender = window.renderer.render;
            window.renderer.render = function(scene, camera) {
                if (!window.__scene && scene) {
                    console.log("Scene detected via renderer hook!");
                    window.__scene = scene;
                    // Try creating portals again after a short delay
                    setTimeout(createPortals, 500);
                }
                return originalRender.call(this, scene, camera);
            };
            console.log("Installed scene detection hook. Will retry portal creation when scene is detected.");
            return [];
        }
        
        console.error("Cannot create portals: THREE.js scene not available. Portals will not work.");
        return [];
    }
    
    // Portal destinations with meaningful URLs
    const portalDestinations = [
        { 
            url: "https://fly.pieter.com", 
            name: "Fly.Pieter.com", 
            color: 0xff00ff // Magenta
        },
        { 
            url: "https://github.com/collidingScopes/red-panda-vibes", 
            name: "Panda Source Code", 
            color: 0xa020f0 // Purple
        },
        { 
            url: "https://vector-tango.scobel.dev/", 
            name: "Vector. Tango.", 
            color: 0x9400d3 // Dark Violet
        },
        { 
            url: "https://firstpersonflappy.com/", 
            name: "First Person Flappy", 
            color: 0x8a2be2 // Blue Violet
        },
        { 
            url: "https://threejs.org/", 
            name: "ThreeJS Game Engine", 
            color: 0x9370db // Medium Purple
        },
        { 
            url: "https://vibe-cannon.vercel.app/", 
            name: "Vibe Cannon", 
            color: 0x70dbcc
        }
    ];
    
    // Calculate positions in a circle around the map
    const portals = [];
    const portalCount = portalDestinations.length;
    const mapRadius = 80;
    let randomDistance = 60;
    
    // Log confirmation that we have a valid scene
    console.log("Valid THREE.js scene found:", scene);
    console.log("Scene children count:", scene.children ? scene.children.length : 'unknown');
    
    for (let i = 0; i < portalCount; i++) {
        // Calculate angle for even distribution
        const angle = (i / portalCount) * Math.PI * 2;
        
        // Calculate position
        const x = Math.cos(angle) * (mapRadius + Math.random()*randomDistance);
        const z = Math.sin(angle) * (mapRadius + Math.random()*randomDistance);
        const position = { x, y: 0, z };
        
        try {
            // Create the portal
            const portal = new Portal(
                position,
                portalDestinations[i].url,
                portalDestinations[i].color,
                portalDestinations[i].name
            );
            
            portals.push(portal);
        } catch (e) {
            console.error(`Error creating portal ${i}:`, e);
        }
    }
    
    console.log(`Created ${portals.length} magical portals`);
    
    // Setup update loop for portals
    setupPortalUpdates(portals);
    
    // Store portals in window for external access
    window.__portals = portals;
    
    return portals;
}

// Setup the update loop for portals
function setupPortalUpdates(portals) {
    let lastTime = 0;
    
    function updatePortals(currentTime) {
        // Calculate delta time
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        // Skip if delta time is invalid
        if (isNaN(deltaTime) || deltaTime > 0.1) {
            requestAnimationFrame(updatePortals);
            return;
        }
        
        // Get player position
        const player = getGamePlayer();
        if (player && player.position) {
            // Update each portal
            for (const portal of portals) {
                portal.update(deltaTime, player.position);
            }
        }
        
        // Continue the loop
        requestAnimationFrame(updatePortals);
    }
    
    // Start the update loop
    requestAnimationFrame(updatePortals);
}

// Function to add a new portal programmatically
window.addPortal = function(position, url, name, color) {
    if (!window.__portals) window.__portals = [];
    
    // Default values
    position = position || { 
        x: (Math.random() - 0.5) * 160, 
        y: 0, 
        z: (Math.random() - 0.5) * 160 
    };
    url = url || "https://example.com";
    name = name || "New Portal";
    color = color || 0xa020f0;
    
    // Create the new portal
    const portal = new Portal(position, url, color, name);
    window.__portals.push(portal);
    
    console.log(`Added new portal "${name}" at (${position.x}, ${position.y}, ${position.z})`);
    return portal;
};

// Function to remove all portals
function removeAllPortals() {
    if (!window.__portals || !window.__portals.length) return;
    
    console.log(`Removing all portals (${window.__portals.length} total)`);
    
    // Get scene
    const scene = getGameScene();
    if (!scene) {
        console.error("Cannot remove portals: scene not found");
        return;
    }
    
    // Remove each portal from scene and dispose resources
    for (const portal of window.__portals) {
        try {
            scene.remove(portal.portalGroup);
            portal.disposePortalResources();
        } catch (e) {
            console.error(`Error removing portal "${portal.name}":`, e);
        }
    }
    
    // Clear the portals array
    window.__portals = [];
    
    // Hide portal UI elements
    updatePortalUI(false, "");
    
    console.log("All portals successfully removed");
}

// Main keystate reset function
function resetAllKeyStates() {
    console.log("Resetting all key states");
    
    // Reset keys in common input handler patterns
    if (window.inputHandler || window.input || window.gameInput) {
        const inputHandler = window.inputHandler || window.input || window.gameInput;
        
        if (inputHandler) {
            // Reset keys object
            if (inputHandler.keys && typeof inputHandler.keys === 'object') {
                console.log("Resetting keys in input handler");
                Object.keys(inputHandler.keys).forEach(key => {
                    inputHandler.keys[key] = false;
                });
            }
            
            // Reset specific common key state properties
            const keyProps = ['isJumping', 'jump', 'forward', 'backward', 'left', 'right', 
                             'moveForward', 'moveBackward', 'moveLeft', 'moveRight', 
                             'space', 'shift', 'ctrl', 'alt'];
            
            keyProps.forEach(prop => {
                if (typeof inputHandler[prop] !== 'undefined') {
                    inputHandler[prop] = false;
                }
            });
        }
    }
    
    // Reset global key state object
    if (window.keyState && typeof window.keyState === 'object') {
        console.log("Resetting global keyState object");
        Object.keys(window.keyState).forEach(key => {
            window.keyState[key] = false;
        });
    }
    
    // Reset our own key state tracker
    if (window._portalKeyStates && typeof window._portalKeyStates === 'object') {
        Object.keys(window._portalKeyStates).forEach(key => {
            window._portalKeyStates[key] = false;
        });
    }
    
    // Dispatch key up events for common movement keys
    const commonKeys = ['w', 'a', 's', 'd', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    
    commonKeys.forEach(key => {
        // Create and dispatch a keyup event
        const keyupEvent = new KeyboardEvent('keyup', {
            key: key,
            code: key.length === 1 ? 'Key' + key.toUpperCase() : key,
            bubbles: true
        });
        
        document.dispatchEvent(keyupEvent);
        window.dispatchEvent(keyupEvent);
        
        // Also dispatch to canvas if it exists
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.dispatchEvent(keyupEvent);
        }
    });
    
    // Reset player state
    if (window.player) {
        // Reset common player movement properties
        if (window.player.isJumping !== undefined) window.player.isJumping = false;
        if (window.player.jumping !== undefined) window.player.jumping = false;
        if (window.player.jump !== undefined) window.player.jump = false;
        
        // Reset velocity if it exists and is in a jump
        if (window.player.velocity) {
            if (window.player.velocity.y > 0) {
                window.player.velocity.y = 0;
            }
        }
    }
}