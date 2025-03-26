// Enhanced Portal System for Red Panda Vibes - Sky Portal Version
// Creates functional fantasy-styled portals that open URLs when activated
let numPortalsPerLevel = 1;
let urlParams = "?portal=true&username=panda&color=red&speed=5&ref=https://collidingscopes.github.io/red-panda-vibes/"
urlParams += "&avatar_url=https://collidingscopes.github.io/red-panda-vibes/"+pandaModelLocation;

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
    constructor(position, url, color = 0xa020f0, name = "Sky Portal") {
        this.position = position;
        this.url = url;
        this.name = name;
        this.color = color;
        this.activationRadius = 8; // Increased activation radius for sky portal
        this.animationStartRadius = 25; // Increased animation radius for sky portal
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
            const stoneRingGeometry = new THREE.TorusGeometry(6, 1.5, 16, 32); // Larger size for sky portal
            const stoneMaterial = new THREE.MeshStandardMaterial({
                color: 0x5b037d,
                roughness: 0.7,
                metalness: 0.5,
            });
            const stoneRing = new THREE.Mesh(stoneRingGeometry, stoneMaterial);
            stoneRing.castShadow = true;
            this.portalGroup.add(stoneRing);
            
            // Create inner ring with glowing effect
            const innerRingGeometry = new THREE.TorusGeometry(6, 0.5, 16, 32); // Larger size for sky portal
            const innerRingMaterial = new THREE.MeshStandardMaterial({
                color: this.color,
                emissive: this.color,
                emissiveIntensity: 0.8, // Increased for better visibility in sky
                metalness: 0.8,
                roughness: 0.2,
            });
            this.innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
            this.portalGroup.add(this.innerRing);
            
            // Create portal center - energy vortex
            const portalGeometry = new THREE.CircleGeometry(6, 32); // Larger size for sky portal
            this.portalMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.7, // Higher opacity for better visibility
                side: THREE.DoubleSide,
            });
            
            // Create particle system
            this.createParticles();
            
            // Set fixed sky position - 100 units high as requested
            this.position.y = 100;
            
            // Set portal position
            this.portalGroup.position.set(this.position.x, this.position.y, this.position.z);
            
            // Create portal lights
            this.createPortalLights();
            
            // Add label above portal
            this.addPortalLabel();
            
            // Add the portal to the scene if available
            if (scene) {
                scene.add(this.portalGroup);
                console.log(`Sky Portal "${this.name}" created at height Y=100`);
            } else {
                console.log(`Sky Portal "${this.name}" created but waiting for scene to be available`);
            }
        } catch (e) {
            console.error("Error during portal creation:", e);
        }
    }
    
    createPortalLights() {
        // Create a stronger light for sky portal
        let lightColor = COLORS.synthwave[Math.floor((COLORS.synthwave.length-1)*Math.random())];
        this.portalLight = new THREE.PointLight(lightColor, 3, 30); // Stronger light with longer range
        this.portalLight.position.set(0, 0, 0.5);
        this.portalGroup.add(this.portalLight);
    }
    
    createParticles() {
        // Create particle system for the swirling effect
        const particleCount = 300; // More particles for sky portal
        const particles = new THREE.BufferGeometry();
        
        // Create arrays for particle positions
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        // Generate particles in a disc pattern
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const radius = Math.random() * 6.5; // Larger radius for sky portal
            const angle = Math.random() * Math.PI * 2;
            
            positions[i3] = Math.cos(angle) * radius;
            positions[i3 + 1] = Math.sin(angle) * radius;
            positions[i3 + 2] = (Math.random() - 0.5) * 1.0; // More depth variation
            
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
            size: 0.25, // Larger particles for sky portal
            vertexColors: true,
            transparent: true,
            opacity: 0.5, // Higher opacity for better visibility
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
        canvas.width = 1200; // Larger canvas for better visibility
        canvas.height = 150;
        
        // Set up text style
        context.fillStyle = 'rgba(72, 3, 99, 0.9)'; // More opaque for sky visibility
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = 'bold 80px Courier New'; // Larger font for sky portal
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
            opacity: 0.9 // Higher opacity for better visibility in sky
        });
        
        // Create the sprite
        this.labelSprite = new THREE.Sprite(material);
        this.labelSprite.scale.set(15, 3.5, 1); // Larger text size for sky visibility
        this.labelSprite.position.set(0, 8, 0); // Position above the portal

        this.portalGroup.add(this.labelSprite);
    }
    
    update(deltaTime, playerPosition) {
        if (!this.portalActive) return;
        
        // Calculate distance to player
        const dx = playerPosition.x - this.portalGroup.position.x;
        const dy = playerPosition.y - this.portalGroup.position.y;
        const dz = playerPosition.z - this.portalGroup.position.z;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Animation phase - activate when player is getting close
        if (distanceToPlayer < this.animationStartRadius) {
            if (!this.isAnimating) {
                this.startPortalAnimation();
            }

            // For sky portal, make it face downward toward the player
            this.facePlayerFromSky(playerPosition);
            
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
        this.fadeIn(this.portalMaterial, 0.9);
        this.fadeIn(this.particles.material, 0.9);
        this.fadeIn(this.labelSprite.material, 1.0);
        
        // Increase light intensity
        this.portalLight.intensity = 5; // Stronger light effect for sky portal
        
        console.log(`Sky Portal "${this.name}" animation started`);
    }
    
    stopPortalAnimation() {
        this.isAnimating = false;
        
        // Decrease opacity of portal elements
        this.fadeIn(this.portalMaterial, 0.4); // Keep slightly visible from a distance
        this.fadeIn(this.particles.material, 0.3);
        this.fadeIn(this.labelSprite.material, 0.6);
        
        // Decrease light intensity but keep it slightly visible
        this.portalLight.intensity = 1.0;
    }
    
    fadeIn(material, targetOpacity) {
        material.opacity = targetOpacity;
    }
    
    updatePortalAnimation(deltaTime, distanceToPlayer) {
        // Intensify animations as player gets closer
        const proximityFactor = 1 - (distanceToPlayer / this.animationStartRadius);

        // Pulse the light
        const time = performance.now() * 0.002;
        this.portalLight.intensity = 2 + Math.sin(time * 1.5) * 3;
        
        // Rotate inner ring in opposite direction
        this.innerRing.rotation.z -= deltaTime * 0.8; // Faster rotation for sky portal
        
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
                const rotationSpeed = (1 - distance / 7) * 3 * proximityFactor;
                const angle = time * rotationSpeed;
                
                // Rotate position
                positions[i3] = x * Math.cos(angle) - y * Math.sin(angle);
                positions[i3 + 1] = x * Math.sin(angle) + y * Math.cos(angle);
                
                // Add slight vertical wobble
                positions[i3 + 2] = Math.sin(time * 7 + i * 0.1) * 0.5 * proximityFactor;
            }
            
            // Mark positions for update
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
    }
    
    facePlayerFromSky(playerPosition) {
        // Calculate direction to player from sky
        const direction = new THREE.Vector3(
            playerPosition.x - this.portalGroup.position.x,
            playerPosition.y - this.portalGroup.position.y,
            playerPosition.z - this.portalGroup.position.z
        );
        
        // For sky portal, we want to always face toward the player (looking down)
        if (direction.length() > 0.1) {
            direction.normalize();
            
            // Look directly at player position - for sky portal this is important
            this.portalGroup.lookAt(playerPosition);
            
            // Add slight tilt to make portal more visible from below
            this.portalGroup.rotation.x += Math.PI / 6;
        }
    }
    
    activate() {
        // Only trigger if player is actually moving through the portal
        if (!this.isAnimating) return;
        console.log(`Sky Portal "${this.name}" activated! Opening ${ this.url}`);
       
        resetAllKeyStates();

        // Play portal sound if available
        if (window.soundSystem && window.soundSystem.initialized) {
            // Create ascending tones for portal activation
            window.soundSystem.playTone(300, 0.1, 'sine', 0.3);
            window.soundSystem.playTone(450, 0.15, 'sine', 0.3, 0.1);
            window.soundSystem.playTone(600, 0.2, 'sine', 0.3, 0.25);
            window.soundSystem.playTone(900, 0.4, 'sine', 0.3, 0.45);
        }
       
        // Ensure URL has protocol
        let targetUrl = this.url;
        if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            targetUrl = "https://" + targetUrl;
        }
       
        // Try different methods to open the URL
        try {
            // First attempt: Use window.open
            window.location.href = targetUrl;
        } catch (e) {
            console.warn(`window.open failed: ${e.message}. Falling back to link method.`);
        }
        // Fallback: Create and click a link element
        const link = document.createElement('a');
        link.href = targetUrl;
        //link.target = "_blank";
        link.rel = "noopener";
        document.body.appendChild(link);
       
        // For in-app browsers, sometimes triggering a real click event works better
        if (isInAppBrowser()) {
            const clickEvent = new Event('click', {
                bubbles: true,
                cancelable: true
            });
            link.dispatchEvent(clickEvent);
        } else {
            link.click();
        }
       
        // Clean up after a short delay
        setTimeout(() => {
            document.body.removeChild(link);
        }, 100);
        
        // Remove this portal from the scene
        this.removeFromScene();
       
        // Remove this portal from the global portals array
        this.removeFromPortalsArray();
       
        // Hide portal UI elements
        updatePortalUI(false, "");
       
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
    } else {
        // Create portal info element if it doesn't exist
        const portalInfo = document.createElement('div');
        portalInfo.id = 'portal-info';
        portalInfo.style.position = 'fixed';
        portalInfo.style.top = '20px';
        portalInfo.style.left = '50%';
        portalInfo.style.transform = 'translateX(-50%)';
        portalInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        portalInfo.style.color = '#fff';
        portalInfo.style.padding = '10px 20px';
        portalInfo.style.borderRadius = '20px';
        portalInfo.style.fontFamily = 'Arial, sans-serif';
        portalInfo.style.fontWeight = 'bold';
        portalInfo.style.zIndex = '1000';
        portalInfo.style.transition = 'opacity 0.3s ease';
        portalInfo.style.opacity = '0';
        portalInfo.style.pointerEvents = 'none';
        
        if (isNearPortal) {
            portalInfo.textContent = `${portalName} Nearby`;
            portalInfo.style.opacity = '1';
        }
        
        document.body.appendChild(portalInfo);
    }
}

// Helper function to get the game scene
function getGameScene() {
    if(scene) return scene;

    // Log error with more context
    console.error("Scene not found. Available globals:", Object.keys(window).filter(k => typeof window[k] === 'object' && window[k] !== null).join(', '));
    return null;
}

// Create the portals
function createPortals() {    
    // Verify if scene is available - very important!
    const scene = getGameScene();
    if (!scene) {        
        // Check if we can access the scene via renderer
        if (window.renderer && typeof window.renderer.render === 'function') {
            // If renderer exists, let's try to inject our scene detection
            // This is a last resort approach
            const originalRender = window.renderer.render;
            window.renderer.render = function(scene, camera) {
                if (!window.__scene && scene) {
                    window.__scene = scene;
                    // Try creating portals again after a short delay
                    setTimeout(createPortals, 500);
                }
                return originalRender.call(this, scene, camera);
            };
            return [];
        }
        
        console.error("Cannot create portals: THREE.js scene not available. Portals will not work.");
        return [];
    }
        
    // Calculate positions in a circle around the map, but at Y=60
    const portals = [];
    const portalCount = numPortalsPerLevel;
    const mapRadius = 50; // Slightly smaller radius for sky portal
    let randomDistance = 20; // Less random distance for more predictable placement
    let portalDestinationsCopy = portalDestinations.slice();
    let selectedPortalDestinations = getRandomUniqueValues(portalDestinationsCopy, portalCount);

    for (let i = 0; i < portalCount; i++) {
        // Calculate angle for even distribution
        const angle = (i / portalCount) * Math.PI * 2;
        
        // Calculate position - with fixed Y=60 for sky placement
        const x = Math.cos(angle) * (mapRadius + Math.random()*randomDistance);
        const z = Math.sin(angle) * (mapRadius + Math.random()*randomDistance);
        const position = { x, y: 60, z };
        
        try {
            // Create the portal
            const portal = new Portal(
                position,
                selectedPortalDestinations[i].url+urlParams,
                COLORS.synthwave[Math.floor((COLORS.synthwave.length-1)*Math.random())],
                selectedPortalDestinations[i].name,
            );
            
            portals.push(portal);
        } catch (e) {
            console.error(`Error creating sky portal ${i}:`, e);
        }
    }    
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
        const player = window.player;
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

function getRandomUniqueValues(array, count) {
    // Clone the array to avoid modifying the original
    const shuffled = [...array];
    
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Return the first 'count' elements
    return shuffled.slice(0, count);
}

function isInAppBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    
    // Common patterns for in-app browsers
    const inAppPatterns = [
        // X/Twitter
        'Twitter',
        'TwitterAndroid',
        'TwitteriOS',
        
        // Facebook
        'FB_IAB',           // Facebook In-App Browser
        'FBAN',            // Facebook App Native
        'FBAV',            // Facebook App Version
        
        // Instagram
        'Instagram',
        
        // LinkedIn
        'LinkedInApp',
        
        // Snapchat
        'Snapchat',
        
        // TikTok
        'TikTok',
        
        // Mobile-specific indicators often present with in-app browsers
        /\bMobile\b.*\bSafari\b/,  // Mobile Safari-like but not standalone
    ];

    // Check if any pattern matches
    for (let pattern of inAppPatterns) {
        if (typeof pattern === 'string') {
            if (ua.includes(pattern)) return true;
        } else if (pattern instanceof RegExp) {
            if (pattern.test(ua)) return true;
        }
    }

    // Additional check: window size vs screen size
    // In-app browsers often have different dimensions due to UI elements
    const isFullScreen = window.innerHeight === screen.height && 
                        window.innerWidth === screen.width;

    // Check for standalone browser features that might be absent
    const isStandalone = ('standalone' in window.navigator) && 
                        window.navigator.standalone;

    // If it's not full screen and not standalone, might be in-app
    return !isFullScreen && !isStandalone;
}