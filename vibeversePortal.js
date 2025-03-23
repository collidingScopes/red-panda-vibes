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
        this.activationDistance = 10;
        this.portalLight = null;
        this.portalParticles = null;
        this.clock = new THREE.Clock();
        this.portalShaderMaterial = null;
        this.portalWidth = 20;
        this.portalHeight = 20;
        this.portalIndicator = document.getElementById('portal-indicator');
        this.portalInfo = document.getElementById('portal-info');
        this.isPlayerInPortal = false;
        this.playerPreviouslyNearby = false;
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
        
        // Add to scene
        scene.add(this.portalGroup);
        
        console.log("Vibeverse portal created at:", this.position);
        
        return this.portalGroup;
    }
    
    getRandomPosition() {
        // Generate a random position away from the player
        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 40; // Between 40-80 units away
        
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
        
        // Add decorative corners
        this.addDecorativeCorners();
        
        // Add to portal group
        this.portalGroup.add(this.frameGroup);
    }
    
    addDecorativeCorners() {
        const cornerSize = 0.8;
        const cornerDepth = 0.5;
        const cornerGeometry = new THREE.BoxGeometry(cornerSize, cornerSize, cornerDepth);
        
        // Use a more ornate material for corners
        const cornerMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0x333333,
            emissiveIntensity: 0.5
        });
        
        // Create corner meshes
        const corners = [];
        for (let i = 0; i < 4; i++) {
            corners[i] = new THREE.Mesh(cornerGeometry, cornerMaterial);
        }
        
        // Position the corners
        const halfWidth = this.portalWidth/2 + 0.5;
        const halfHeight = this.portalHeight + 0.5;
        
        corners[0].position.set(-halfWidth, halfHeight, 0); // Top left
        corners[1].position.set(halfWidth, halfHeight, 0);  // Top right
        corners[2].position.set(-halfWidth, 0, 0);          // Bottom left
        corners[3].position.set(halfWidth, 0, 0);           // Bottom right
        
        // Add corners to the frame group
        corners.forEach(corner => this.frameGroup.add(corner));
    }

    update(shaderTime) {
        if (!this.portalShaderMaterial) return;
        
        // Update shader time
        const time = this.clock.getElapsedTime();
        this.portalShaderMaterial.uniforms.time.value = time;
        
        // Check distance to player
        const distanceToPlayer = this.player.position.distanceTo(this.portalGroup.position);
        
        // Player is near the portal
        if (distanceToPlayer < this.activationDistance) {
            if (!this.playerPreviouslyNearby) {
                this.playerPreviouslyNearby = true;
                // Show portal indicator
                this.portalInfo.style.display = 'block';
                this.portalIndicator.style.display = 'block';
                
                // Animate portal light intensity
                if (this.portalLight) {
                    this.portalLight.intensity = 3;
                }
            }
            
            // Update portal indicator direction
            this.updatePortalIndicator();
            
            // Check if player is entering the portal (from the front)
            this.checkPortalEntry(distanceToPlayer);
        } else {
            // Player is far from portal
            if (this.playerPreviouslyNearby) {
                this.playerPreviouslyNearby = false;
                // Hide portal indicator
                this.portalInfo.style.display = 'none';
                this.portalIndicator.style.display = 'none';
                
                // Reset portal light intensity
                if (this.portalLight) {
                    this.portalLight.intensity = 2;
                }
            }
            
            this.isPlayerInPortal = false;
        }
    }
    
    updatePortalIndicator() {
        // Calculate direction from player to portal
        const direction = new THREE.Vector3().subVectors(
            this.portalGroup.position,
            this.player.position
        );
        
        // Project the direction onto the XZ plane for 2D direction
        direction.y = 0;
        direction.normalize();
        
        // Get camera direction for reference
        const cameraDirection = new THREE.Vector3();
        window.camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();
        
        // Calculate angle between directions
        const angle = Math.atan2(
            direction.x * cameraDirection.z - direction.z * cameraDirection.x,
            direction.x * cameraDirection.x + direction.z * cameraDirection.z
        );
        
        // Convert to degrees
        const degrees = (angle * 180 / Math.PI);
        
        // Update the indicator style
        this.portalIndicator.style.transform = `rotate(${degrees}deg)`;
    }
    
    checkPortalEntry(distanceToPlayer) {
        // Vector from portal to player
        const portalToPlayer = new THREE.Vector3().subVectors(
            this.player.position,
            this.portalGroup.position
        );
        
        // Portal forward direction (negative z in local space)
        const portalForward = new THREE.Vector3(0, 0, -1);
        portalForward.applyQuaternion(this.portalGroup.quaternion);
        
        // Check if player is in front of the portal
        const dotProduct = portalToPlayer.dot(portalForward);
        
        // Calculate horizontal distance to portal center
        const portalPlanePosition = this.portalGroup.position.clone();
        portalPlanePosition.y += this.portalHeight / 2; // Adjust to portal center height
        
        const horizontalDistanceToPortalCenter = new THREE.Vector2(
            this.player.position.x - portalPlanePosition.x,
            this.player.position.z - portalPlanePosition.z
        ).length();
        
        // Calculate vertical position relative to portal
        const playerYRelativeToPortalBottom = this.player.position.y - this.portalGroup.position.y;
        const playerYRelativeToPortalTop = this.player.position.y - (this.portalGroup.position.y + this.portalHeight);
        
        // Check if player is at the right height to go through portal
        const isAtRightHeight = playerYRelativeToPortalBottom > 0 && playerYRelativeToPortalTop < 0;
        
        // Player is in the portal if:
        // 1. They are close enough
        // 2. They are at the right height
        // 3. They are approaching from the front side
        // 4. They are horizontally aligned with the portal center
        if (distanceToPlayer < 5 && 
            //isAtRightHeight && 
            //dotProduct > 0 && 
            horizontalDistanceToPortalCenter < this.portalWidth / 2) {
            
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
        console.log("Portal activated!");
        
        // Pause the game
        if (typeof window.pauseGame === 'function') {
            window.pauseGame();
        }

        resetAllKeyStates();
        
        // Open portal URL in a new tab
        const portalUrl = "http://portal.pieter.com/?username=panda&color=red&speed=5&ref=https://collidingscopes.github.io/red-panda-vibes/";
        window.open(portalUrl, '_blank');
        
        // Play portal sound if available
        if (window.playPortalSound && typeof window.playPortalSound === 'function') {
            window.playPortalSound();
        }
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
        
        // Hide UI elements
        if (this.portalInfo) this.portalInfo.style.display = 'none';
        if (this.portalIndicator) this.portalIndicator.style.display = 'none';
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
            
            // Calculate delta time
            shaderTime += 5.0;
            //this.lastTime = currentTime;
            
            // Update all portals
            this.update(shaderTime / 1000); // Convert to seconds
        };
    }
    
    update(shaderTime) {
        // Skip if game is paused or over
        if (window.gameState && (window.gameState.gamePaused || window.gameState.gameOver)) {
            return;
        }
        
        // Update each portal
        this.portals.forEach(portal => portal.update(shaderTime));
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