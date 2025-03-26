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
        this.emojis = ['🔊', '🎸', '🎵', '🥁', '🎶', '🎧', '🎹', '💿'];
        this.emojiTextures = []; // Store loaded textures
        this.particleSystem = null;
        this.particleTimeout = null;
    }

    // Add this method to load the font
    loadFont() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.FontLoader();
            loader.load(
                'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', // Default Three.js font
                (font) => {
                    this.font = font;
                    console.log("Helvetiker font loaded successfully");
                    resolve();
                },
                undefined,
                (error) => {
                    console.error('Error loading font:', error);
                    reject(error);
                }
            );
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

    loadEmojiTextures() {
        const loader = new THREE.TextureLoader();
        const texturePromises = this.emojis.map(emoji => {
            // Convert emoji to lowercase hexadecimal Unicode code point
            const codePoint = emoji.codePointAt(0).toString(16).toLowerCase();
            const url = `https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/${codePoint}.png`;
            return new Promise((resolve, reject) => {
                loader.load(
                    url,
                    (texture) => resolve({ emoji, texture }),
                    undefined,
                    (error) => {
                        console.error(`Error loading texture for ${emoji} at ${url}:`, error);
                        reject(error);
                    }
                );
            });
        });

        return Promise.all(texturePromises).then(results => {
            this.emojiTextures = results;
            console.log("Emoji textures loaded successfully");
        }).catch(error => {
            console.error("Failed to load some emoji textures:", error);
        });
    }

    // Modify initialize to load textures (font loading removed)
    async initialize() {
        console.log("Initializing iPod...");
        await this.loadEmojiTextures(); // Load 2D emoji textures
        await this.createIpodModel();   // No font dependency anymore
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
    
    createEmojiFireworks() {
        if (this.emojiTextures.length === 0) {
            console.warn("Emoji textures not loaded yet, cannot create fireworks");
            return;
        }

        const particleGroup = new THREE.Group();
        const particleCount = 25;
        const particles = [];

        for (let i = 0; i < particleCount; i++) {
            const { texture } = this.emojiTextures[Math.floor(Math.random() * this.emojiTextures.length)];
            const material = new THREE.SpriteMaterial({
                map: texture,
                color: new THREE.Color(1, 1, 1), // white
                transparent: true
            });

            const particle = new THREE.Sprite(material);
            particle.scale.set(0.7, 0.7, 0.7); // Adjust size as needed
            particle.position.set(
                this.object.position.x,
                this.object.position.y,
                this.object.position.z
            );

            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 4 + 2,
                (Math.random() - 0.5) * 5
            );

            particleGroup.add(particle);
            particles.push(particle);
        }

        this.scene.add(particleGroup);
        this.particleSystem = { group: particleGroup, particles };

        this.particleTimeout = setTimeout(() => {
            this.removeEmojiFireworks();
        }, 2000);

        this.animateEmojiFireworks(particles);
    }

    animateEmojiFireworks(particles) {
        const startTime = Date.now();
        const duration = 2000;
    
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
    
            if (progress < 1) {
                particles.forEach(particle => {
                    particle.position.add(particle.velocity.clone().multiplyScalar(0.016));
                    particle.velocity.y -= 0.12; // Gravity
                    // particle.material.opacity = 1 - progress;
                    particle.material.rotation += 0.05; // Rotate the sprite's texture
                });
                requestAnimationFrame(animate);
            }
        };
    
        requestAnimationFrame(animate);
    }

    removeEmojiFireworks() {
        if (this.particleSystem) {
            this.scene.remove(this.particleSystem.group);
            this.particleSystem = null;
        }
        if (this.particleTimeout) {
            clearTimeout(this.particleTimeout);
            this.particleTimeout = null;
        }
    }

    triggerNextTrack() {
        console.log("iPod touched, playing next track");
        this.createEmojiFireworks();

        if (window.soundSystem && window.soundSystem.initialized) {
            window.soundSystem.playNextTrack();
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

    destroy() {
        this.removeEmojiFireworks();
        if (this.object && this.object.parent) {
            this.scene.remove(this.object);
        }
    }
}

// Export for use in game.js
window.Ipod = Ipod;