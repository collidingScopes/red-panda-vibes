// Vibeverse Portal System
// Adds colorful portals that transport the player to portal.pieter.com
let shaderTime = 0;
class VibeversePortal {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.portalGroup = new THREE.Group();
        this.portalMesh = null;
        this.frameGroup = null;
        this.isActive = false;
        this.position = new THREE.Vector3();
        this.activationDistance = 15;
        this.portalParticles = null;
        this.clock = new THREE.Clock();
        this.portalShaderMaterial = null;
        this.portalWidth = 10;
        this.portalHeight = 10;
        this.isPlayerInPortal = false;
        this.signboardGroup = null;
    }

    create(position) {
        this.position = position || this.getRandomPosition();
        
        // Create portal group
        this.portalGroup = new THREE.Group();
        this.portalGroup.position.copy(this.position);
        
        // Make sure portal is aligned with terrain
        const groundHeight = window.getTerrainHeight(this.position.x, this.position.z);
        this.portalGroup.position.y = groundHeight;

        // Look at player initially
        this.portalGroup.lookAt(this.player.position);
        
        // Reset the X rotation to keep portal standing upright
        // This ensures the portal is vertical regardless of terrain
        this.portalGroup.rotation.x = 0;
        this.portalGroup.rotation.z = 0;

        // Create the swirling portal effect using custom shader
        this.createSwirlingPortal();
        
        // Create decorative frame
        this.createPortalFrame();
        
        // Create signboard at the top
        this.createSignboard();
        
        // Add to scene
        scene.add(this.portalGroup);
        
        console.log("Vibeverse portal created at:", this.position);
        
        return this.portalGroup;
    }
    
    getRandomPosition() {
        // Generate a random position away from the player
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 60;
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        // Use the existing terrain height function
        const y = window.getTerrainHeight(x, z);
        
        return new THREE.Vector3(x, y, z);
    }
    
    createSwirlingPortal() {
        // Create a custom shader for the swirling portal effect
        const portalVertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        const portalFragmentShader = `
            uniform float time;
            varying vec2 vUv;
            
            // Based on "Warp Speed" by David Hoskins
            // https://www.shadertoy.com/view/Msl3WH
            
            void main() {
                vec2 uv = vUv * 2.0 - 1.0;
                vec3 finalColor = vec3(0.0);
                float v = 0.0;
                
                // Swirl effect
                float speed = 1.0;
                float zoom = 2.0;
                float intensity = 2.0;
                
                // First spiral layer
                for (float i = 0.0; i < 36.0; i++) {
                    float a = i * (3.14159 * 2.0) / 18.0;
                    float x = cos(a);
                    float y = sin(a);
                    float d = length(uv - vec2(x, y) * zoom);
                    
                    // Pulse wave based on distance and time
                    v += sin(d * 10.0 - time * speed) * intensity / (d + 0.5);
                }
                
                // Second spiral layer - faster and different direction
                for (float i = 0.0; i < 24.0; i++) {
                    float a = i * (3.14159 * 2.0) / 12.0;
                    float x = cos(a + time * 0.1);
                    float y = sin(a + time * 0.1);
                    float d = length(uv - vec2(x, y) * (zoom * 0.7));
                    
                    v += sin(d * 8.0 + time * speed * 1.5) * intensity * 0.7 / (d + 0.3);
                }
                
                // Combine colors
                vec3 color1 = vec3(0.8, 0.2, 0.8); // Purple
                vec3 color2 = vec3(1.0, 0.6, 0.1); // Orange
                vec3 color3 = vec3(0.2, 0.4, 1.0); // Blue
                
                float vn = sin(v * 0.5 + time * 0.2) * 0.5 + 0.5;
                finalColor = mix(color1, color2, vn);
                finalColor = mix(finalColor, color3, sin(v * 0.2 - time * 0.1) * 0.5 + 0.5);
                
                // Add a glow effect
                float glow = max(0.0, 1.0 - length(uv) * 0.8);
                finalColor += vec3(0.8, 0.6, 1.0) * glow * 0.6;
                
                // Intensity
                gl_FragColor = vec4(finalColor, min(1.0, v * 0.05 + 0.8));
            }
        `;
        
        // Create shader material
        this.portalShaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 }
            },
            vertexShader: portalVertexShader,
            fragmentShader: portalFragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        // Create portal plane
        const portalGeometry = new THREE.PlaneGeometry(this.portalWidth, this.portalHeight);
        this.portalMesh = new THREE.Mesh(portalGeometry, this.portalShaderMaterial);
        this.portalMesh.rotation.y = Math.PI; // Face the player
        
        // Move up so bottom is at ground level
        this.portalMesh.position.y = this.portalHeight / 2;
        
        this.portalGroup.add(this.portalMesh);
    }
    
    createPortalFrame() {
        this.frameGroup = new THREE.Group();
        
        // Frame material with glowing effect
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555, 
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x222222
        });
        
        // Frame dimensions
        const frameThickness = 0.4;
        const frameDepth = 0.4;
        const padding = 0.1;
        
        // Create frame parts (four sides of the frame)
        const topGeometry = new THREE.BoxGeometry(this.portalWidth + frameThickness*2 + padding*2, frameThickness, frameDepth);
        const bottomGeometry = new THREE.BoxGeometry(this.portalWidth + frameThickness*2 + padding*2, frameThickness, frameDepth);
        const leftGeometry = new THREE.BoxGeometry(frameThickness, this.portalHeight + padding*2, frameDepth);
        const rightGeometry = new THREE.BoxGeometry(frameThickness, this.portalHeight + padding*2, frameDepth);
        
        // Create meshes
        const top = new THREE.Mesh(topGeometry, frameMaterial);
        const bottom = new THREE.Mesh(bottomGeometry, frameMaterial);
        const left = new THREE.Mesh(leftGeometry, frameMaterial);
        const right = new THREE.Mesh(rightGeometry, frameMaterial);
        
        // Position the frame parts
        top.position.set(0, this.portalHeight + frameThickness/2 + padding, 0);
        bottom.position.set(0, -frameThickness/2, 0);
        left.position.set(-this.portalWidth/2 - frameThickness/2 - padding, this.portalHeight/2, 0);
        right.position.set(this.portalWidth/2 + frameThickness/2 + padding, this.portalHeight/2, 0);
        
        // Add frame parts to group
        this.frameGroup.add(top);
        this.frameGroup.add(bottom);
        this.frameGroup.add(left);
        this.frameGroup.add(right);

        // Add to portal group
        this.portalGroup.add(this.frameGroup);
    }
    
    createSignboard() {
        this.signboardGroup = new THREE.Group();
        
        // Signboard dimensions
        const signboardWidth = this.portalWidth + 2;
        const signboardHeight = 3; // Height of the signboard
        const signboardDepth = 0.5;
        const signboardOffsetY = 0; // Space between portal top and signboard bottom
        
        // Signboard background
        const signboardGeometry = new THREE.BoxGeometry(signboardWidth, signboardHeight, signboardDepth);
        const signboardMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.4,
            roughness: 0.6,
            emissive: 0x111111
        });
        
        const signboard = new THREE.Mesh(signboardGeometry, signboardMaterial);
        
        // Position the signboard above the portal
        signboard.position.y = this.portalHeight + signboardOffsetY + signboardHeight/2;
        
        // Create text for the signboard
        this.createSignboardText("VIBEVERSE PORTAL", signboardWidth * 0.8, signboard.position.y);
        
        // Add signboard to the group
        this.signboardGroup.add(signboard);

        // Add to portal group
        this.portalGroup.add(this.signboardGroup);
    }
    
    createSignboardText(text, width, yPosition) {
        // Use a TextureLoader to create a canvas-based text texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Make canvas size larger for better resolution
        canvas.width = 600;
        canvas.height = 150;
        
        // Clear background with a dark color
        context.fillStyle = '#222222';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add text
        context.font = 'bold 56px Helvetica, Arial, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Add white glow
        context.shadowColor = '#FFFFFF';
        context.shadowBlur = 25;
        context.fillStyle = '#FFFFFF';
        
        // Draw text centered
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        
        // Create material with the text texture
        const signMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        // Create plane for the sign
        const signGeometry = new THREE.PlaneGeometry(width, width * (canvas.height / canvas.width));
        const signMesh = new THREE.Mesh(signGeometry, signMaterial);
        
        // Position the sign
        signMesh.position.set(0, yPosition, 0.3);
        
        // Add to signboard group
        this.signboardGroup.add(signMesh);
        
        // Add a second version on the back side for visibility from both directions
        const backSignMesh = signMesh.clone();
        backSignMesh.rotation.y = Math.PI;
        backSignMesh.position.z = -0.3;
        this.signboardGroup.add(backSignMesh);
    }
    
    update() {
        if (!this.portalShaderMaterial) return;
        
        // Update shader time
        const time = this.clock.getElapsedTime();
        this.portalShaderMaterial.uniforms.time.value = time;
        
        // Check distance to player
        const distanceToPlayer = this.player.position.distanceTo(this.portalGroup.position);
        
        const infoElement = document.getElementById('portal-info');

        // Player is near the portal
        if (distanceToPlayer < this.activationDistance) {
            infoElement.textContent = `Vibeverse Portal Nearby`;
            infoElement.classList.add('visible');

            // Check if player is entering the portal
            this.checkPortalEntry(distanceToPlayer);
        } else {
            infoElement.classList.remove('visible');
            this.isPlayerInPortal = false;
        }
    }
    
    checkPortalEntry(distanceToPlayer) {
        // Calculate horizontal distance to portal center
        const portalPlanePosition = this.portalGroup.position.clone();
        
        // Calculate horizontal distance only (ignore Y-axis)
        const horizontalDistanceToPortal = new THREE.Vector2(
            this.player.position.x - portalPlanePosition.x,
            this.player.position.z - portalPlanePosition.z
        ).length();
        
        // Calculate vertical position relative to portal
        const playerHeightRelativeToPortal = this.player.position.y - portalPlanePosition.y;
        
        // Check if player is within the portal's vertical range
        // This allows for jumping through the portal
        const isInPortalVerticalRange = playerHeightRelativeToPortal > 0 && 
                                       playerHeightRelativeToPortal < this.portalHeight;
        
        // Player is in the portal if:
        // 1. They are horizontally close enough
        // 2. They are horizontally aligned with the portal center
        // 3. They are within the portal's vertical range
        if (horizontalDistanceToPortal < 4 &&
            horizontalDistanceToPortal < this.portalWidth / 2 &&
            isInPortalVerticalRange) {
            
            if (!this.isPlayerInPortal) {
                this.isPlayerInPortal = true;
                
                // Activate the portal (transport player)
                this.activatePortal();
            }
        } else {
            this.isPlayerInPortal = false;
        }
    }

    activatePortal() {
        resetAllKeyStates();
        // Create portal URL with parameters
        const portalUrl = "http://portal.pieter.com/"+urlParams;
        
        // Play portal sound if available
        if (window.soundSystem && window.soundSystem.initialized) {
        // Create ascending tones for portal activation
        window.soundSystem.playTone(300, 0.1, 'sine', 0.3);
        window.soundSystem.playTone(450, 0.15, 'sine', 0.3, 0.1);
        window.soundSystem.playTone(600, 0.2, 'sine', 0.3, 0.25);
        window.soundSystem.playTone(900, 0.4, 'sine', 0.3, 0.45);
        }
              
        // Try different methods to open the URL
        try {
            // First attempt: Use window.open
            window.location.href = portalUrl;
        } catch (e) {
            console.warn(`window.open failed: ${e.message}. Falling back to link method.`);
        
            // Fallback: Create and click a link element
            const link = document.createElement('a');
            link.href = portalUrl;
            link.rel = "noopener"; //
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
        }

        pauseGame();
    }
    
    dispose() {
        // Remove from scene
        if (this.portalGroup && this.scene) {
            this.scene.remove(this.portalGroup);
        }
        
        // Dispose materials and geometries
        if (this.portalMesh) {
            this.portalMesh.geometry.dispose();
            this.portalMesh.material.dispose();
        }
    }
}

// Global portal system to manage all portals
class PortalSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.portals = [];
        this.maxPortals = 1; // Just one portal at a time
    }
    
    initialize() {
        console.log("Initializing portal system");
        this.createVibeversePortal();
        this.setupUpdateLoop();
    }
    
    createVibeversePortal() {
        // Clear any existing portals
        this.removeVibeversePortal();
        
        // Create new portals
        for (let i = 0; i < this.maxPortals; i++) {
            const portal = new VibeversePortal(this.scene, this.player);
            portal.create();
            this.portals.push(portal);
        }
    }
    
    removeVibeversePortal() {
        this.portals.forEach(portal => portal.dispose());
        this.portals = [];
    }
    
    setupUpdateLoop() {
        // Store original animation function
        const originalAnimate = window.animate;
        
        // Replace with our version that updates portals
        window.animate = (currentTime) => {
            // Call original animation function
            if (originalAnimate) {
                originalAnimate(currentTime);
            }
            
            shaderTime += 5.0;

            // Skip if game is paused or over
            if (window.gameState && (window.gameState.gamePaused || window.gameState.gameOver)) {
                return;
            }
            
            // Update each portal
            this.portals.forEach(portal => portal.update(shaderTime));
        };
    }
}

// Initialize portal system
function initVibeversePortalSystem() {
    console.log("Setting up vibeverse portal system");
    
    // Make sure scene and player are defined
    if (!scene || !window.player) {
        console.error("Required objects (scene, player) not found");
        return;
    }
    
    // Create portal system
    window.portalSystem = new PortalSystem(window.scene, window.player);
    window.portalSystem.initialize();
}

// Export functions for global access
//window.initVibeversePortalSystem = initVibeversePortalSystem;
window.createVibeversePortal = function() {
    if (window.portalSystem) {
        window.portalSystem.createVibeversePortal();
    }
};
window.removeVibeversePortal = function() {
    if (window.portalSystem) {
        window.portalSystem.removeVibeversePortal();
    }
};