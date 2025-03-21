// Improved Power-ups system for Red Panda platformer
class PowerupSystem {
    constructor(scene, player, getTerrainHeight) {
        this.scene = scene;
        this.player = player;
        this.getTerrainHeight = getTerrainHeight;
        
        // Collection of active powerups on the map
        this.activePowerups = [];
        
        // Power-up configuration
        this.config = {
            speedBoost: {
                duration: 10, // duration in seconds
                multiplier: 2.0, // Speed multiplier
                minCount: 3,  // Minimum number per level
                maxCount: 6,  // Maximum number per level
                spawnRadius: {
                    min: 25,   // Minimum distance from player
                    max: 100,    // Maximum distance from player
                },
                color: 0x00ffff, // Cyan color for speed boost
            }
        };
        
        // Active effects on the player
        this.activeEffects = {
            speedBoost: {
                active: false,
                timeRemaining: 0,
                originalSpeed: null,
                progressBar: null
            }
        };
        
        // Set up UI elements
        this.createPowerupUI();
        
        // Bind methods
        this.update = this.update.bind(this);
        
        console.log("PowerupSystem constructor completed");
    }
    
    // Initialize the system at the start of a level
    initialize() {
        console.log("PowerupSystem initialize called");
        
        // Clear any existing powerups
        this.clearAllPowerups();
        
        // Create new powerups for the level
        this.createSpeedBoostPowerups();
    }
    
    // Create the UI elements for powerup status
    createPowerupUI() {
        console.log("Creating powerup UI elements");

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
        
        console.log("Powerup UI elements created");
    }
    
    // Create speed boost powerups
    createSpeedBoostPowerups() {
        const config = this.config.speedBoost;
        
        // Decide how many to create
        const count = Math.floor(Math.random() * (config.maxCount - config.minCount + 1)) + config.minCount;
        
        console.log(`Attempting to create ${count} speed boost powerups`);
        
        for (let i = 0; i < count; i++) {
            const powerup = this.createSpeedBoostPowerup();
            if (powerup) {
                console.log(`Speed boost powerup ${i+1} created at position:`, 
                    powerup.position.x, powerup.position.y, powerup.position.z);
            }
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
        const y = this.getTerrainHeight(x, z) + 1.5; // Float above terrain
        
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
            roughness: 0.2,
            metalness: 0.9,
            transparent: true,  // Make it transparent
            opacity: 0.7        // Set opacity to 70%
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
        
        // Add a stronger point light for glow effect
        const light = new THREE.PointLight(color, 1.0, 10); // Increased intensity and range
        light.position.set(0, 0, 0);
        group.add(light);
        
        // Add animation data
        group.userData.rotationSpeed = Math.random() * 0.3;
        group.userData.bobHeight = 0.2;
        group.userData.bobSpeed = Math.random() * 0.3;
        group.userData.hoverTime = Math.random() * Math.PI * 2; // Random start time for hovering
        
        return group;
    }
    
    // Check for powerup collection
    checkCollection() {
        if (!this.player || this.activePowerups.length === 0) return;
        
        const playerPos = this.player.position;
        const collectionRadius = 2.0; // Distance to collect (increased from 1.5)
        
        for (let i = this.activePowerups.length - 1; i >= 0; i--) {
            const powerup = this.activePowerups[i];
            
            // Skip if already collected
            if (powerup.userData.collected) continue;
            
            // Check distance to player
            const distance = powerup.position.distanceTo(playerPos);
            
            if (distance < collectionRadius) {
                console.log(`Powerup collected! Distance: ${distance}`);
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
        
        // Create a collection effect (expanding ring)
        const ringGeometry = new THREE.RingGeometry(0.1, 0.2, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff, // Use default color in case powerup.children is not available
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide
        });
        
        // Try to get the actual color from the powerup
        if (powerup.children && powerup.children[0] && powerup.children[0].material) {
            ringMaterial.color = powerup.children[0].material.color;
        }
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(powerup.position);
        ring.rotation.x = Math.PI / 2; // Lay flat
        this.scene.add(ring);
        
        // Animate ring then remove
        let scale = 1;
        let opacity = 1;
        
        const expandRing = () => {
            scale += 0.15;
            opacity -= 0.03;
            
            ring.scale.set(scale, scale, scale);
            ringMaterial.opacity = opacity;
            
            if (opacity > 0) {
                requestAnimationFrame(expandRing);
            } else {
                this.scene.remove(ring);
                ringGeometry.dispose();
                ringMaterial.dispose();
            }
        };
        
        expandRing();
        
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
    }
    
    // Animate hovering and particle effects for powerups
    animatePowerups() {
        const time = performance.now() / 1000;
        
        this.activePowerups.forEach(powerup => {
            if (powerup.userData.collected) return;
            
            // Rotate the powerup
            powerup.rotation.y += powerup.userData.rotationSpeed;
            
            // Bob up and down
            powerup.userData.hoverTime += powerup.userData.bobSpeed;
            const initialY = powerup.userData.initialY || powerup.position.y;
            powerup.position.y = initialY + 
                                Math.sin(powerup.userData.hoverTime) * powerup.userData.bobHeight;
            
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
        console.log("All powerups cleared");
    }
    
    // Handle level reset
    onLevelReset() {
        console.log("PowerupSystem: Level reset");
        
        // Clear existing powerups
        this.clearAllPowerups();
        
        // Reset any active effects
        if (this.activeEffects.speedBoost.active) {
            gameState.speed = this.activeEffects.speedBoost.originalSpeed;
            this.activeEffects.speedBoost.active = false;
            this.activeEffects.speedBoost.timeRemaining = 0;
            this.updateSpeedBoostUI();
        }
        
        // Create new powerups
        this.createSpeedBoostPowerups();
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
    console.log("Starting powerup system initialization");
    initPowerupSystemWithGameObjects();
}

// Initialize with available game objects
function initPowerupSystemWithGameObjects() {
    console.log("Initializing powerup system with game objects");
    
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
            console.log("Powerup system integrated with animation loop");
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
                console.log("Powerup system integrated with level system");
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
            console.log("Powerup system integrated with game reset");
        }
        
        console.log("Powerup system fully initialized and integrated with game");
    } catch (error) {
        console.error("Error initializing powerup system:", error);
    }
}

// Export the initialization function to be called from game.js
window.initPowerups = function() {
    console.log("initPowerups called from game.js");
    
    // Only initialize once
    if (!powerupSystem) {
        initializePowerupSystem();
    } else {
        console.log("Powerup system already initialized");
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

// Initialize when the start game button is pressed
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, setting up powerup initialization with start button");
    
    // Find the start game button
    const startButton = document.getElementById('start-game-button');
    
    if (startButton) {
        console.log("Found start game button, adding powerup initialization");
        
        // Add our initialization to the button click event
        startButton.addEventListener('click', () => {
            console.log("Start button clicked, initializing powerup system");
            
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
    console.log("Window loaded, checking for start game button");
    
    // Try again to find the start button
    const startButton = document.getElementById('start-game-button');
    
    if (startButton && !startButton.powerupListenerAdded) {
        console.log("Adding powerup initialization to start button (backup)");
        
        startButton.powerupListenerAdded = true;
        
        // Add our initialization to the button click event
        startButton.addEventListener('click', () => {
            console.log("Start button clicked (backup handler), initializing powerup system");
            
            setTimeout(() => {
                if (!powerupSystem && !window.powerSystemInitialized) {
                    window.powerSystemInitialized = true;
                    initializePowerupSystem();
                }
            }, 2000); // 2 second delay after game start
        });
    }
});