// Improved Power-ups system for Red Panda platformer
let floatHeight = 3.5;
class PowerupSystem {
    constructor(scene, player, getTerrainHeight) {
        this.scene = scene;
        this.player = player;
        this.getTerrainHeight = getTerrainHeight;
        
        // Collection of active powerups on the map
        this.activePowerups = [];

        // Add animation distance threshold
        this.animationConfig = {
            proximityThreshold: 50, // Distance at which powerups start animating
            optimizationEnabled: true // Toggle to enable/disable optimization
        };

        this.collectionRadius = 4.0; // Distance to collect

        // Power-up configuration
        this.config = {
            speedBoost: {
                duration: 10, // duration in seconds
                multiplier: 2.0, // Speed multiplier
                minCount: 3,  // Minimum number per level
                maxCount: 5,  // Maximum number per level
                spawnRadius: {
                    min: 35,   // Minimum distance from player
                    max: 120,    // Maximum distance from player
                },
                color: 0x00ffff, // Cyan color for speed boost
            },
            invisibility: {
                duration: 10, // duration in seconds
                minCount: 2,  // Minimum number per level
                maxCount: 4,  // Maximum number per level
                spawnRadius: {
                    min: 35,   // Minimum distance from player
                    max: 120,  // Maximum distance from player
                },
                color: 0xaa55ff, // Purple color for invisibility
            },
        };
        
        // Active effects on the player
        this.activeEffects = {
            speedBoost: {
                active: false,
                timeRemaining: 0,
                originalSpeed: null,
                progressBar: null
            },
            invisibility: {
                active: false,
                timeRemaining: 0,
                progressBar: null,
                originalMaterials: [], // Store original material properties
            },
        };
        
        // Set up UI elements
        this.createPowerupUI();
        
        // Bind methods
        this.update = this.update.bind(this);        
    }
    
    // Initialize the system at the start of a level
    initialize() {        
        // Clear any existing powerups
        this.clearAllPowerups();
        
        // Create new powerups for the level
        this.createSpeedBoostPowerups();
        this.createInvisibilityPowerups();
    }

    // Add a method to adjust animation settings
    adjustAnimationSettings(proximityThreshold, enabled = true) {
        this.animationConfig.proximityThreshold = proximityThreshold || this.animationConfig.proximityThreshold;
        this.animationConfig.optimizationEnabled = enabled;
    }
    
    // Create the UI elements for powerup status
    createPowerupUI() {
        const container = document.querySelector('#powerup-status-container');

        // Create speed boost progress element (initially hidden)
        const speedBoostContainer = document.createElement('div');
        speedBoostContainer.className = 'powerup-status-item';
        speedBoostContainer.id = 'speed-boost-container';
        speedBoostContainer.style.display = 'none'; // Hide initially
        speedBoostContainer.style.borderRadius = '5px';
        speedBoostContainer.style.padding = '5px 10px';
        speedBoostContainer.style.color = '#fff';
        speedBoostContainer.style.fontFamily = 'Arial, sans-serif';
        speedBoostContainer.style.fontSize = '14px';
        speedBoostContainer.style.width = '200px';
        
        // Add icon and label
        speedBoostContainer.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <span style="color: cyan; margin-right: 5px;">⚡</span>
                <span>Speed Boost</span>
            </div>
            <div class="progress-bar-outer" style="height: 8px; background-color: rgba(255, 255, 255, 0.3); border-radius: 4px; overflow: hidden;">
                <div id="speed-boost-progress" class="progress-bar-inner" style="height: 100%; width: 100%; background-color: cyan; transition: width 0.1s linear;"></div>
            </div>
        `;
        
        container.appendChild(speedBoostContainer);
        
        // Store reference to the progress bar
        this.activeEffects.speedBoost.progressBar = {
            container: speedBoostContainer,
            bar: document.getElementById('speed-boost-progress')
        };

        const invisibilityContainer = document.createElement('div');
        invisibilityContainer.className = 'powerup-status-item';
        invisibilityContainer.id = 'invisibility-container';
        invisibilityContainer.style.display = 'none'; // Hide initially
        invisibilityContainer.style.borderRadius = '5px';
        invisibilityContainer.style.padding = '5px 10px';
        invisibilityContainer.style.color = '#fff';
        invisibilityContainer.style.fontFamily = 'Arial, sans-serif';
        invisibilityContainer.style.fontSize = '14px';
        invisibilityContainer.style.width = '200px';
        invisibilityContainer.style.marginTop = '10px';

        // Add icon and label
        invisibilityContainer.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <span style="color: #aa55ff; margin-right: 5px;">👻</span>
                <span>Invisibility</span>
            </div>
            <div class="progress-bar-outer" style="height: 8px; background-color: rgba(255, 255, 255, 0.3); border-radius: 4px; overflow: hidden;">
                <div id="invisibility-progress" class="progress-bar-inner" style="height: 100%; width: 100%; background-color: #aa55ff; transition: width 0.1s linear;"></div>
            </div>
        `;

        container.appendChild(invisibilityContainer);

        // Store reference to the progress bar
        this.activeEffects.invisibility.progressBar = {
            container: invisibilityContainer,
            bar: document.getElementById('invisibility-progress')
        };
    }
    
    // Create speed boost powerups
    createSpeedBoostPowerups() {
        const config = this.config.speedBoost;
        
        // Decide how many to create
        const count = Math.floor(Math.random() * (config.maxCount - config.minCount + 1)) + config.minCount;
        
        for (let i = 0; i < count; i++) {
            const powerup = this.createSpeedBoostPowerup();
        }
    }
    
    // Create a single speed boost powerup
    createSpeedBoostPowerup() {
        if (!this.scene || !this.getTerrainHeight) {
            console.error("Scene or getTerrainHeight not available");
            return null;
        }
        
        const config = this.config.speedBoost;
        
        // Find a random position on the map
        const angle = Math.random() * Math.PI * 2;
        const distance = config.spawnRadius.min + Math.random() * (config.spawnRadius.max - config.spawnRadius.min);
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const y = this.getTerrainHeight(x, z) + floatHeight; // Float above terrain
        
        // Create the powerup object
        const powerup = this.createPowerupModel(config.color, config.particleColor);
        powerup.position.set(x, y, z);
        powerup.userData.type = 'speedBoost';
        powerup.userData.collected = false;
        powerup.userData.initialY = y; // Set initial Y for hover animation
        
        // Add to scene and track it
        this.scene.add(powerup);
        this.activePowerups.push(powerup);
        
        return powerup;
    }
    
    // Create a visual model for powerups
    createPowerupModel(color) {
        // Parent group for the powerup
        const group = new THREE.Group();
        
        // Create glowing gem in the center - much larger and more visible
        const gemGeometry = new THREE.OctahedronGeometry(1.5, 0); // Increased size from 0.5 to 1.5
        const gemMaterial = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 1.0, // Increased from 0.8
            roughness: 0.5,
            metalness: 0.5,
            transparent: true,  // Make it transparent
            opacity: 0.6,
        });
        const gem = new THREE.Mesh(gemGeometry, gemMaterial);
        group.add(gem);
        
        // Add wireframe outline
        const wireframeGeometry = new THREE.OctahedronGeometry(1.55, 0); // Slightly larger than the gem
        const wireframeMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff,   // White wireframe
            linewidth: 1,
            transparent: true,
            opacity: 0.6
        });
        const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(wireframeGeometry),
            wireframeMaterial
        );
        group.add(wireframe);

        // Add animation data
        group.userData.rotationSpeed = 0.04 + Math.random() * 0.2;
        group.userData.bobHeight = 0.2;
        group.userData.bobSpeed = 0.04 + Math.random() * 0.2;
        group.userData.hoverTime = Math.random() * Math.PI * 2; // Random start time for hovering
        
        return group;
    }
    
    // Check for powerup collection
    checkCollection() {
        if (!this.player || this.activePowerups.length === 0) return;
        
        const playerPos = this.player.position;
        
        for (let i = this.activePowerups.length - 1; i >= 0; i--) {
            const powerup = this.activePowerups[i];
            
            // Skip if already collected
            if (powerup.userData.collected) continue;
            
            // Check distance to player
            const distance = powerup.position.distanceTo(playerPos);
            
            if (distance < this.collectionRadius) {
                this.collectPowerup(powerup);
            }
        }
    }
    
    // Handle powerup collection
    collectPowerup(powerup) {
        // Mark as collected
        powerup.userData.collected = true;
        
        // Apply effect based on type
        const type = powerup.userData.type;
        
        if (type === 'speedBoost') {
            this.applySpeedBoost();
            
            // Play collection sound if available
            if (window.soundSystem && window.soundSystem.initialized) {
                // If there's a specific powerup sound, use it
                if (window.soundSystem.playPowerupSound) {
                    window.soundSystem.playPowerupSound();
                } else {
                    // Otherwise use a suitable existing sound
                    if (window.playGoalSound) window.playGoalSound();
                }
            }
        } else if (type === 'invisibility') {
            this.applyInvisibility();
            
            // Play collection sound
            if (window.soundSystem && window.soundSystem.initialized) {
                // Play a special invisibility sound effect
                if (window.playInvisibilitySound) {
                    window.playInvisibilitySound();
                } else if (window.soundSystem.playInvisibilitySound) {
                    window.soundSystem.playInvisibilitySound();
                } else if (window.soundSystem.playPowerupSound) {
                    window.soundSystem.playPowerupSound();
                } else {
                    // Fallback to another suitable sound
                    if (window.playGoalSound) window.playGoalSound();
                }
            }
        }
        
        // Animate collection effect
        this.animateCollection(powerup);
    }
    
    // Apply speed boost effect
    applySpeedBoost() {
        const config = this.config.speedBoost;
        
        // If already active, just extend the duration
        if (this.activeEffects.speedBoost.active) {
            this.activeEffects.speedBoost.timeRemaining = config.duration;
            this.updateSpeedBoostUI();
            return;
        }
        
        // Store original speed and apply boost
        this.activeEffects.speedBoost.originalSpeed = gameState.speed;
        gameState.speed = this.activeEffects.speedBoost.originalSpeed * config.multiplier;
        
        // Set active state
        this.activeEffects.speedBoost.active = true;
        this.activeEffects.speedBoost.timeRemaining = config.duration;
        
        // Show UI
        this.updateSpeedBoostUI();
        
        console.log(`Speed boost activated! Speed: ${gameState.speed} (${config.duration} seconds)`);
    }
    
    // Update speed boost UI
    updateSpeedBoostUI() {
        const effect = this.activeEffects.speedBoost;
        
        if (!effect.progressBar || !effect.progressBar.container || !effect.progressBar.bar) {
            // UI elements might not be ready, recreate them
            this.createPowerupUI();
            
            // If still not available, return
            if (!effect.progressBar || !effect.progressBar.container || !effect.progressBar.bar) {
                console.warn("Speed boost UI elements not available");
                return;
            }
        }
        
        if (effect.active) {
            // Show container
            document.querySelector("#powerup-status-container").classList.remove("hidden");
            effect.progressBar.container.style.display = 'block';
            
            // Update progress
            const percentage = (effect.timeRemaining / this.config.speedBoost.duration) * 100;
            effect.progressBar.bar.style.width = `${percentage}%`;
        } else {
            // Hide container
            document.querySelector("#powerup-status-container").classList.add("hidden");
            effect.progressBar.container.style.display = 'none';
        }
    }
    
    // Animate powerup collection effect
    animateCollection(powerup) {
        if (!this.scene) return;

        // Remove the powerup from scene with a small delay
        setTimeout(() => {
            this.scene.remove(powerup);
            
            // Remove from active list
            const index = this.activePowerups.indexOf(powerup);
            if (index > -1) {
                this.activePowerups.splice(index, 1);
            }
            
            // Dispose of geometries and materials
            this.disposePowerup(powerup);
        }, 100);
    }
    
    // Properly dispose of powerup to avoid memory leaks
    disposePowerup(powerup) {
        if (!powerup) return;
        
        // Recursively dispose of all children
        powerup.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
    }
    
    // Update active effects
    updateEffects() {
        // Update speed boost effect
        if (this.activeEffects.speedBoost.active) {
            // Make sure deltaTime is reasonable (cap it at 0.1 seconds)
            const limitedDeltaTime = 1/60; //assume 60fps
            
            // Reduce the timer
            this.activeEffects.speedBoost.timeRemaining -= limitedDeltaTime;
            
            // Update UI
            this.updateSpeedBoostUI();
            
            // Check if expired
            if (this.activeEffects.speedBoost.timeRemaining <= 0) {
                // Revert speed boost
                gameState.speed = this.activeEffects.speedBoost.originalSpeed;
                this.activeEffects.speedBoost.active = false;
                this.activeEffects.speedBoost.timeRemaining = 0;
                
                // Update UI
                this.updateSpeedBoostUI();
                
                console.log("Speed boost expired, speed reverted to normal");
            }
        }

        if (this.activeEffects.invisibility.active) {
            // Make sure deltaTime is reasonable (cap it at 0.1 seconds)
            const limitedDeltaTime = 1/60; //assume 60fps
            
            // Reduce the timer
            this.activeEffects.invisibility.timeRemaining -= limitedDeltaTime;
            
            // Update UI
            this.updateInvisibilityUI();
            
            // Check if expired
            if (this.activeEffects.invisibility.timeRemaining <= 0) {
                // Revert invisibility effect
                if (window.gameState && window.gameState.enemyManager) {
                    window.gameState.enemyManager.playerIsInvisible = false;
                }

                this.restorePlayerMaterials();
                this.activeEffects.invisibility.active = false;
                this.activeEffects.invisibility.timeRemaining = 0;
                
                // Update UI
                this.updateInvisibilityUI();
                
                console.log("Invisibility expired");
            }
        }
    }
    
    // Animate hovering and particle effects for powerups -- only when nearby player
    animatePowerups() {
        // Skip animation if player isn't available
        if (!this.player) return;
        
        const playerPos = this.player.position;
        const time = performance.now() / 1000;
        
        this.activePowerups.forEach(powerup => {
            if (powerup.userData.collected) return;
            
            // Calculate distance to player
            const distance = powerup.position.distanceTo(playerPos);
            
            // Only animate if within proximity threshold or if optimization is disabled
            if (!this.animationConfig.optimizationEnabled || 
                distance < this.animationConfig.proximityThreshold) {
                
                // Rotate the powerup
                powerup.rotation.y += powerup.userData.rotationSpeed;
                
                // Bob up and down
                powerup.userData.hoverTime += powerup.userData.bobSpeed;
                const initialY = powerup.userData.initialY || powerup.position.y;
                powerup.position.y = initialY + 
                                    Math.sin(powerup.userData.hoverTime) * powerup.userData.bobHeight;

            } else {

                // Reset position to initial height to avoid position jumps when coming back into view
                powerup.position.y = powerup.userData.initialY || powerup.position.y;
            }
        });
    }
    
    // Update method called every frame
    update() {
        if (!this.player) return;
        
        // Check for collection
        this.checkCollection();
        
        // Update active effects
        this.updateEffects();
        
        // Animate powerups
        this.animatePowerups();
    }
    
    // Clear all powerups
    clearAllPowerups() {
        if (!this.scene) return;
        
        // Remove from scene and dispose
        this.activePowerups.forEach(powerup => {
            this.scene.remove(powerup);
            this.disposePowerup(powerup);
        });
        
        // Clear array
        this.activePowerups = [];
    }
    
    // Handle level reset
    onLevelReset() {
        //console.log("PowerupSystem: Level reset");
        
        // Clear existing powerups
        this.clearAllPowerups();
        
        // Reset any active effects
        if (this.activeEffects.speedBoost.active) {
            gameState.speed = this.activeEffects.speedBoost.originalSpeed;
            this.activeEffects.speedBoost.active = false;
            this.activeEffects.speedBoost.timeRemaining = 0;
            this.updateSpeedBoostUI();
        }

        if (this.activeEffects.invisibility.active) {
            if (window.gameState && window.gameState.enemyManager) {
                window.gameState.enemyManager.playerIsInvisible = false;
            }
            this.restorePlayerMaterials();
            this.activeEffects.invisibility.active = false;
            this.activeEffects.invisibility.timeRemaining = 0;
            this.updateInvisibilityUI();
        }
        
        // Create new powerups
        this.createSpeedBoostPowerups();
        this.createInvisibilityPowerups();
    }

    createInvisibilityPowerups() {
        const config = this.config.invisibility;
        
        // Decide how many to create
        const count = Math.floor(Math.random() * (config.maxCount - config.minCount + 1)) + config.minCount;
                
        for (let i = 0; i < count; i++) {
            const powerup = this.createInvisibilityPowerup();
        }
    }
    
    // Add this method to create a single invisibility powerup:
    createInvisibilityPowerup() {
        if (!this.scene || !this.getTerrainHeight) {
            console.error("Scene or getTerrainHeight not available");
            return null;
        }
        
        const config = this.config.invisibility;
        
        // Find a random position on the map
        const angle = Math.random() * Math.PI * 2;
        const distance = config.spawnRadius.min + Math.random() * (config.spawnRadius.max - config.spawnRadius.min);
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const y = this.getTerrainHeight(x, z) + floatHeight; // Float above terrain
        
        // Create the powerup object
        const powerup = this.createPowerupModel(config.color);
        powerup.position.set(x, y, z);
        powerup.userData.type = 'invisibility';
        powerup.userData.collected = false;
        powerup.userData.initialY = y; // Set initial Y for hover animation
        
        // Add to scene and track it
        this.scene.add(powerup);
        this.activePowerups.push(powerup);
        
        return powerup;
    }
    
    // Add method to apply invisibility effect
    applyInvisibility() {
        const config = this.config.invisibility;
        
        // If already active, just extend the duration
        if (this.activeEffects.invisibility.active) {
            this.activeEffects.invisibility.timeRemaining = config.duration;
            this.updateInvisibilityUI();
            return;
        }
        
        // Set active state
        this.activeEffects.invisibility.active = true;
        this.activeEffects.invisibility.timeRemaining = config.duration;
        
        // Apply the effect to enemies (make them wander instead of chase)
        if (window.gameState && window.gameState.enemyManager) {
            window.gameState.enemyManager.playerIsInvisible = true;
        }
        
        // Apply transparency to player model
        this.applyPlayerTransparency(0.4); // 40% opacity
        
        // Show UI
        this.updateInvisibilityUI();
        
        console.log(`Invisibility activated! (${config.duration} seconds)`);
    }

    // Add method to apply transparency to the player model
    applyPlayerTransparency(opacity) {
        if (!this.player) return;
        
        // Store original materials and apply transparency
        this.activeEffects.invisibility.originalMaterials = [];
        
        this.player.traverse((node) => {
            if (node.isMesh && node.material) {
                // Handle arrays of materials
                if (Array.isArray(node.material)) {
                    node.material.forEach(material => {
                        // Store original properties
                        this.activeEffects.invisibility.originalMaterials.push({
                            material: material,
                            transparent: material.transparent,
                            opacity: material.opacity
                        });
                        
                        // Apply transparency
                        material.transparent = true;
                        material.opacity = opacity;
                        material.needsUpdate = true;
                    });
                } else {
                    // Store original properties
                    this.activeEffects.invisibility.originalMaterials.push({
                        material: node.material,
                        transparent: node.material.transparent,
                        opacity: node.material.opacity
                    });
                    
                    // Apply transparency
                    node.material.transparent = true;
                    node.material.opacity = opacity;
                    node.material.needsUpdate = true;
                }
            }
        });
    }

    // Add method to restore original material properties
    restorePlayerMaterials() {
        // Restore original material properties
        this.activeEffects.invisibility.originalMaterials.forEach(item => {
            item.material.transparent = item.transparent;
            item.material.opacity = item.opacity;
            item.material.needsUpdate = true;
        });
        
        // Clear the stored materials
        this.activeEffects.invisibility.originalMaterials = [];
    }
    
    // Add method to update invisibility UI
    updateInvisibilityUI() {
        const effect = this.activeEffects.invisibility;
        
        if (!effect.progressBar || !effect.progressBar.container || !effect.progressBar.bar) {
            // UI elements might not be ready, recreate them
            this.createPowerupUI();
            
            // If still not available, return
            if (!effect.progressBar || !effect.progressBar.container || !effect.progressBar.bar) {
                console.warn("Invisibility UI elements not available");
                return;
            }
        }
        
        if (effect.active) {
            // Show container
            document.querySelector("#powerup-status-container").classList.remove("hidden");
            effect.progressBar.container.style.display = 'block';
            
            // Update progress
            const percentage = (effect.timeRemaining / this.config.invisibility.duration) * 100;
            effect.progressBar.bar.style.width = `${percentage}%`;
        } else {
            // Hide container if no active effects
            if (!this.activeEffects.speedBoost.active) {
                document.querySelector("#powerup-status-container").classList.add("hidden");
            }
            effect.progressBar.container.style.display = 'none';
        }
    }
}

// Initialize powerup system when the game is loaded
let powerupSystem = null;

// Add a helper function to ensure THREE.js is loaded
function ensureThreeJsLoaded(callback, maxAttempts = 20, interval = 300) {
    let attempts = 0;
    
    const check = () => {
        attempts++;
        
        if (typeof THREE !== 'undefined' && window.scene && window.player) {
            console.log("THREE.js and required objects found, continuing initialization");
            callback();
            return;
        }
        
        if (attempts >= maxAttempts) {
            console.error("Failed to initialize powerup system: THREE.js or required objects not loaded after multiple attempts");
            return;
        }
        
        console.log(`Waiting for THREE.js and game objects (attempt ${attempts}/${maxAttempts})...`);
        setTimeout(check, interval);
    };
    
    check();
}

// Initialize the powerup system
function initializePowerupSystem() {
    initPowerupSystemWithGameObjects();
}

// Initialize with available game objects
function initPowerupSystemWithGameObjects() {    
    try {
        // Create powerup system instance
        powerupSystem = new PowerupSystem(
            window.scene || scene, 
            window.player, 
            window.getTerrainHeight || getTerrainHeight
        );
        
        // Make it globally accessible
        window.powerupSystem = powerupSystem;
        
        // Create initial powerups
        powerupSystem.initialize();
        
        // Hook into the game's animation loop if original hasn't been modified yet
        if (window.animate && !window.animate.powerupsIntegrated) {
            const originalAnimate = window.animate;
            
            // Override the animate function to include powerup updates
            window.animate = function(currentTime) {
                // Call the original animate function
                originalAnimate(currentTime);
                
                // Update powerups
                if (powerupSystem && !window.gameState.gamePaused && !window.gameState.gameOver) {
                    powerupSystem.update();
                }
            };
            
            // Mark as integrated to prevent double integration
            window.animate.powerupsIntegrated = true;
        }
        
        // Hook into level system for level changes
        if (window.gameState && window.gameState.levelSystem) {
            const originalAdvanceToNextLevel = window.gameState.levelSystem.advanceToNextLevel;
            
            // Only override if not already overridden
            if (!window.gameState.levelSystem.powerupsIntegrated) {
                window.gameState.levelSystem.advanceToNextLevel = function() {
                    // Call original function
                    originalAdvanceToNextLevel.call(window.gameState.levelSystem);
                    
                    // Reset powerups for new level
                    if (powerupSystem) {
                        powerupSystem.onLevelReset();
                    }
                };
                
                // Mark as integrated to prevent double integration
                window.gameState.levelSystem.powerupsIntegrated = true;
            }
        }
        
        // Hook into game reset if needed
        if (window.resetGame && !window.resetGame.powerupsIntegrated) {
            const originalResetGame = window.resetGame;
            
            window.resetGame = function() {
                // Call original function
                originalResetGame();
                
                // Reset powerups
                if (powerupSystem) {
                    powerupSystem.onLevelReset();
                }
            };
            
            // Mark as integrated
            window.resetGame.powerupsIntegrated = true;
        }
    } catch (error) {
        console.error("Error initializing powerup system:", error);
    }
}

// Export the initialization function to be called from game.js
window.initPowerups = function() {
    // Only initialize once
    if (!powerupSystem) {
        initializePowerupSystem();
    } else {
    }
};

// Add a function to create a cool powerup pickup sound
if (window.soundSystem) {
    window.soundSystem.playPowerupSound = function() {
        if (!this.initialized || this.muted) return;
        
        try {
            // Play ascending chime sounds
            const baseFreq = 400;
            const numNotes = 5;
            
            for (let i = 0; i < numNotes; i++) {
                // Create an ascending series of notes
                const freq = baseFreq * Math.pow(1.5, i/2); // Gradually increasing frequency
                const delay = i * 0.06; // Short delay between notes
                const duration = 0.15; // Short duration for each note
                
                // Use sine wave for a clean tone
                this.playTone(freq, duration, 'sine', 0.15, delay);
            }
            
            // Add a sparkle sound effect
            setTimeout(() => {
                // Create a sparkle sound using high frequencies
                const sparkleNotes = [1800, 2200, 2600];
                sparkleNotes.forEach((freq, i) => {
                    this.playTone(freq, 0.1, 'sine', 0.1, i * 0.05);
                });
            }, 300);
            
        } catch (error) {
            console.error("Error playing powerup sound:", error);
        }
    };
}

// Add invisibility sound effect if using soundSystem
if (window.soundSystem) {
    window.soundSystem.playInvisibilitySound = function() {
        if (!this.initialized || this.muted) return;
        
        try {
            // Create a mysterious sound effect
            const baseFreq = 200;
            
            // Play a descending series of notes for a "disappearing" effect
            for (let i = 0; i < 4; i++) {
                const freq = baseFreq + (3 - i) * 100; // Descending frequency
                const delay = i * 0.1; // Short delay between notes
                this.playTone(freq, 0.2, 'sine', 0.2, delay);
            }
            
            // Add a shimmer effect
            setTimeout(() => {
                const shimmerNotes = [1200, 1500, 1800, 2000, 1700];
                shimmerNotes.forEach((freq, i) => {
                    this.playTone(freq, 0.1, 'sine', 0.1, i * 0.07);
                });
            }, 400);
            
        } catch (error) {
            console.error("Error playing invisibility sound:", error);
        }
    };
}

// Initialize when the start game button is pressed
document.addEventListener('DOMContentLoaded', () => {

    // Find the start game button
    const startButton = document.getElementById('start-game-button');
    
    if (startButton) {
        // Add our initialization to the button click event
        startButton.addEventListener('click', () => {
            
            // Wait a short moment after the button is clicked
            // This gives the game a chance to start and set up THREE.js properly
            setTimeout(() => {
                if (!powerupSystem && !window.powerSystemInitialized) {
                    window.powerSystemInitialized = true;
                    initializePowerupSystem();
                }
            }, 2000); // 2 second delay after game start
        });
    } else {
        console.warn("Start game button not found, will try again when window loads");
    }
});

// Backup initialization via window.onload in case start button wasn't found
window.addEventListener('load', () => {    
    // Try again to find the start button
    const startButton = document.getElementById('start-game-button');
    
    if (startButton && !startButton.powerupListenerAdded) {        
        startButton.powerupListenerAdded = true;
        
        // Add our initialization to the button click event
        startButton.addEventListener('click', () => {            
            setTimeout(() => {
                if (!powerupSystem && !window.powerSystemInitialized) {
                    window.powerSystemInitialized = true;
                    initializePowerupSystem();
                }
            }, 2000); // 2 second delay after game start
        });
    }
});