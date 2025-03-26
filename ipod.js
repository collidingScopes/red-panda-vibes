// iPod Class
// Creates a low-poly 3D iPod in the game that triggers the next song when touched

class Ipod {
    constructor(scene, player, getTerrainHeight) {
        this.scene = scene;
        this.player = player;
        this.getTerrainHeight = getTerrainHeight;
        this.object = null;
        this.cooldown = false;
        this.cooldownTime = 2000; // 2 seconds cooldown between interactions
        this.detectionRadius = 6; // How close player needs to be to interact
        this.floatHeight = 5;
        this.font = null; // Add this to store the loaded font
        // Colors
        this.ipodColor = 0xE0E0E0; // Silver/white
        this.displayColor = 0x222222; // Dark display
        this.buttonColor = 0xFFFFFF; // White wheel
    }

    // Add this method to load the font
    loadFont() {
        return new Promise((resolve) => {
            const loader = new THREE.FontLoader();
            // Using a commonly available font from Three.js examples
            // You might need to host this file yourself or use a different font
            loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
                this.font = font;
                resolve();
            });
        });
    }
    async createIpodModel() {
        // Create a group for the whole iPod
        const ipodGroup = new THREE.Group();
        
        // Scale factor to easily adjust the overall size
        const scaleFactor = 2;

        // Main body of the iPod - rounded rectangle with beveled edges
        const bodyGeometry = new THREE.BoxGeometry(3 * scaleFactor, 5 * scaleFactor, 0.6 * scaleFactor, 1, 1, 1);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.ipodColor,
            roughness: 0.2,
            metalness: 0.8
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        ipodGroup.add(body);
        
        // Screen/display
        const displayGeometry = new THREE.BoxGeometry(2.4 * scaleFactor, 2 * scaleFactor, 0.1 * scaleFactor);
        const displayMaterial = new THREE.MeshStandardMaterial({
            color: this.displayColor,
            roughness: 0.5,
            metalness: 0.2,
            emissive: 0x333333,
            emissiveIntensity: 0.2
        });
        const display = new THREE.Mesh(displayGeometry, displayMaterial);
        display.position.set(0, 0.8 * scaleFactor, 0.35 * scaleFactor);
        ipodGroup.add(display);

        // Wait for font to load before creating text
        if (!this.font) {
            await this.loadFont();
        }

        // Add "DJ PANDA" text
        const textGeometry = new THREE.TextGeometry('DJ PANDA', {
            font: this.font,
            size: 0.3 * scaleFactor,  // Adjust size to fit screen
            height: 0.02 * scaleFactor,  // Thickness of text
            curveSegments: 12,
            bevelEnabled: false
        });

        const textMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF69B4  // Pink color
        });

        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        
        // Center the text on the screen
        textGeometry.computeBoundingBox();
        const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
        const textHeight = textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y;
        
        textMesh.position.set(
            -textWidth / 2,           // Center horizontally
            0.8 * scaleFactor - textHeight / 2,  // Center vertically on screen
            0.4 * scaleFactor         // Slightly above display surface
        );

        ipodGroup.add(textMesh);

        // Create the click wheel
        const wheelGeometry = new THREE.CylinderGeometry(1 * scaleFactor, 1 * scaleFactor, 0.1 * scaleFactor, 16);
        const wheelMaterial = new THREE.MeshStandardMaterial({
            color: this.buttonColor,
            roughness: 0.3,
            metalness: 0.5
        });
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(0, -1.4 * scaleFactor, 0.35 * scaleFactor);
        ipodGroup.add(wheel);
        
        // Center button on the wheel
        const centerButtonGeometry = new THREE.CylinderGeometry(0.3 * scaleFactor, 0.3 * scaleFactor, 0.12 * scaleFactor, 16);
        const centerButton = new THREE.Mesh(centerButtonGeometry, wheelMaterial);
        centerButton.rotation.x = Math.PI / 2;
        centerButton.position.set(0, -1.4 * scaleFactor, 0.4 * scaleFactor);
        ipodGroup.add(centerButton);
        
        // Add glow effect to make the iPod more visible
        const glowMaterial = new THREE.MeshStandardMaterial({
            color: 0x88CCFF,
            transparent: true,
            opacity: 0.3,
            emissive: 0x88CCFF,
            emissiveIntensity: 0.5
        });
        
        const glowGeometry = new THREE.BoxGeometry(3.2 * scaleFactor, 5.2 * scaleFactor, 0.7 * scaleFactor);
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(0, 0, -0.1 * scaleFactor);
        ipodGroup.add(glow);
        
        this.glow = glow;
        ipodGroup.rotation.x = -Math.PI / 18;
        this.object = ipodGroup;
        
        this.startFloatingAnimation();
    }

    // Modify initialize to handle async
    async initialize() {
        console.log("Initializing iPod...");
        await this.createIpodModel();
        this.placeRandomly();
    }
    
    placeRandomly() {
        if (!this.object) return;
        
        // Remove from scene if already added
        if (this.object.parent) {
            this.scene.remove(this.object);
        }
        
        // Find a random position on the map, not too close to the origin
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 40; // Between 15 and 55 units from center
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const y = this.getTerrainHeight(x, z);
        
        this.object.position.set(x, y + this.floatHeight, z); // Position slightly above terrain
        this.scene.add(this.object);
        
        console.log(`iPod placed at position: ${x}, ${y + this.floatHeight}, ${z}`);
    }
    
    startFloatingAnimation() {
        // Base position
        const baseY = this.object.position.y;
        
        // Add animation properties
        this.animationParams = {
            speed: 0.5 + Math.random() * 0.5,
            amplitude: 0.3,
            rotationSpeed: 0.2,
            time: Math.random() * Math.PI * 2 // Random starting phase
        };
    }
    
    update(deltaTime) {
        if (!this.object) return;
        
        // Handle floating animation
        this.animationParams.time += deltaTime * this.animationParams.speed;
        
        // Bob up and down
        const floatOffset = Math.sin(this.animationParams.time) * this.animationParams.amplitude;
        const baseY = this.getTerrainHeight(
            this.object.position.x, 
            this.object.position.z
        ) + this.floatHeight; // Base height above terrain
        
        this.object.position.y = baseY + floatOffset;
        
        // Gentle rotation
        this.object.rotation.y += deltaTime * this.animationParams.rotationSpeed;
        
        // Pulse the glow
        if (this.glow) {
            const pulseScale = 1 + Math.sin(this.animationParams.time * 1.5) * 0.07;
            this.glow.scale.set(pulseScale, pulseScale, pulseScale);
        }
        
        // Check for player collision
        if (!this.cooldown) {
            const dx = this.player.position.x - this.object.position.x;
            const dy = this.player.position.y - this.object.position.y;
            const dz = this.player.position.z - this.object.position.z;
            
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (distance < this.detectionRadius) {
                this.triggerNextTrack();
                this.startCooldown();
            }
        }
    }
    
    triggerNextTrack() {
        console.log("iPod touched, playing next track");
        
        // Only proceed if we have access to the sound system
        if (window.soundSystem && window.soundSystem.initialized) {
            // Call the playNextTrack function from the sound system
            window.soundSystem.playNextTrack();
            
            // Create a visual feedback effect
            this.createActivationEffect();
        } else {
            console.warn("Sound system not initialized yet");
        }
    }
    
    startCooldown() {
        this.cooldown = true;
        
        setTimeout(() => {
            this.cooldown = false;
        }, this.cooldownTime);
    }
    
    createActivationEffect() {
        // Flash the glow brighter
        if (this.glow) {
            // Store original properties
            const originalIntensity = this.glow.material.emissiveIntensity;
            const originalOpacity = this.glow.material.opacity;
            
            // Intensify the glow
            this.glow.material.emissiveIntensity = 1.5;
            this.glow.material.opacity = 0.8;
            
            // Create explosion particles
            this.createParticleEffect();
            
            // Reset after animation
            setTimeout(() => {
                if (this.glow) {
                    this.glow.material.emissiveIntensity = originalIntensity;
                    this.glow.material.opacity = originalOpacity;
                }
            }, 1000);
        }
    }
    
    createParticleEffect() {
        // Create particles that explode outward
        const particleCount = 20;
        const particleSize = 0.3;
        
        // Create a group for particles
        const particleGroup = new THREE.Group();
        this.scene.add(particleGroup);
        
        // Set group position to iPod position
        particleGroup.position.copy(this.object.position);
        
        // Create particles
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(particleSize, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0x88CCFF,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Random initial position slightly offset from center
            particle.position.set(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            );
            
            // Random velocity
            const angle = Math.random() * Math.PI * 2;
            const height = Math.random() * Math.PI - Math.PI/2;
            const speed = 2 + Math.random() * 3;
            
            particle.userData.velocity = new THREE.Vector3(
                Math.cos(angle) * Math.cos(height) * speed,
                Math.sin(height) * speed,
                Math.sin(angle) * Math.cos(height) * speed
            );
            
            particleGroup.add(particle);
        }
        
        // Animate particles
        let lifetime = 0;
        const maxLifetime = 1.5; // seconds
        
        const animateParticles = () => {
            lifetime += 0.016; // Approximately 60fps
            
            if (lifetime >= maxLifetime) {
                // Clean up
                this.scene.remove(particleGroup);
                particleGroup.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                return;
            }
            
            // Move each particle
            particleGroup.children.forEach(particle => {
                particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.016));
                
                // Apply gravity
                particle.userData.velocity.y -= 0.05;
                
                // Fade out
                particle.material.opacity = 0.7 * (1 - lifetime / maxLifetime);
                
                // Scale down
                const scale = 1 - lifetime / maxLifetime;
                particle.scale.set(scale, scale, scale);
            });
            
            requestAnimationFrame(animateParticles);
        };
        
        animateParticles();
    }
}

// Export for use in game.js
window.Ipod = Ipod;