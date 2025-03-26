class Jetpack {
    constructor(scene, player, getTerrainHeight) {
        // Add a timestamp to the instance for debugging
        this._instanceId = Date.now();
        console.log(`Creating jetpack instance ${this._instanceId}`);
        
        this.scene = scene;
        this.player = player;
        
        // Track initialization state
        this._initialized = false;
        
        // Safe wrapper for getTerrainHeight function
        this.getTerrainHeight = (x, z) => {
            try {
                if (typeof getTerrainHeight !== 'function') {
                    return 0;
                }
                const height = getTerrainHeight(x, z);
                return (height !== undefined && !isNaN(height)) ? height : 0;
            } catch (e) {
                console.warn("Error getting terrain height:", e);
                return 0;
            }
        };

        // Jetpack properties
        this.object = null;
        this.isActive = false;
        this.isCollected = false;
        this.floatHeight = 5.0;
        this.floatAmplitude = 0.5;
        this.floatSpeed = 1.0;
        this.floatTime = 0;
        
        // Fuel properties
        this.maxFuel = 200; // Increased from 100 to 200
        this.currentFuel = this.maxFuel;
        this.fuelBurnRate = 25;
        this.fuelRegenRate = 0; // No regeneration when not in use
        this.thrustForce = 25;
        this.fuelBar = null;
        this.fuelBarContainer = null;
        
        // Particles
        this.particles = null;
        this.particleSystem = null;
        
        // Sounds
        this.jetpackSound = null;
        this.pickupSound = null;
        this.outOfFuelSound = null;
    }
    
    initialize() {
        console.log("Initializing jetpack", this);
        
        // Check if we've already initialized this instance
        if (this._initialized) {
            console.log("This jetpack instance was already initialized, skipping");
            return;
        }
        
        this.createJetpack();
        this.createFuelBar();
        this.createParticleSystem();
        
        if (window.soundSystem && window.soundSystem.initialized) {
            this.jetpackSound = window.soundSystem.createSound('jetpack', './sounds/jetpack.mp3', 0.5, true);
            this.pickupSound = window.soundSystem.createSound('jetpack-pickup', './sounds/pickup.mp3', 0.7);
            // Create a sound for when fuel runs out
            this.outOfFuelSound = window.soundSystem.createSound('jetpack-empty', './sounds/powerdown.mp3', 0.6);
        }
        
        // Place the jetpack with a short delay to ensure terrain is initialized
        setTimeout(() => {
            this.placeRandomly();
            console.log("Jetpack placed at:", this.object.position);
        }, 1000);
        
        // Listen for level complete events
        this.setupLevelCompleteListener();
        
        // Listen for game over events
        this.setupGameOverListener();
        
        // Mark as initialized to prevent duplicate initialization
        this._initialized = true;
        
        // Log completion
        console.log("Jetpack initialization complete");
    }
    
    setupGameOverListener() {
        // Watch for changes to gameState.gameOver
        // Since we can't use events directly, we'll check in the update method
        console.log("Game over listener functionality added to update method");
    }
    
    handleGameOver() {
        console.log("Handling game over for jetpack");
        
        // Stop all jetpack functionality
        this.isActive = false;
        this.isCollected = false;
        
        // Stop any sounds
        if (this.jetpackSound && this.jetpackSound.isPlaying) {
            this.jetpackSound.stop();
        }
        
        // Hide UI elements
        if (this.fuelBarContainer) {
            this.fuelBarContainer.style.display = 'none';
            this.fuelBarContainer.label.style.display = 'none';
        }
        
        // Hide particles
        if (this.particleSystem) {
            this.particleSystem.visible = false;
        }
        
        // Make sure the jetpack object is invisible until game is reset
        if (this.object) {
            this.object.visible = false;
            console.log("Jetpack hidden due to game over");
        }
        
        // Reset fuel for next game
        this.currentFuel = this.maxFuel;
    }
    
    setupLevelCompleteListener() {
        // Check if the level system is available in the game state
        if (window.gameState && window.gameState.levelSystem) {
            // Hook into level completion
            const originalShowLevelComplete = window.gameState.levelSystem.showLevelComplete;
            
            if (originalShowLevelComplete && !window.gameState.levelSystem._jetpackLevelHooked) {
                window.gameState.levelSystem.showLevelComplete = () => {
                    // Call the original function first
                    originalShowLevelComplete.call(window.gameState.levelSystem);
                    
                    // Now reset the jetpack for next level
                    this.deactivateJetpack();
                };
                
                window.gameState.levelSystem._jetpackLevelHooked = true;
                console.log("Jetpack level completion hook added");
            }
            
            // Also hook into applyLevelSettings to ensure jetpack appears in new levels
            const originalApplyLevelSettings = window.gameState.levelSystem.applyLevelSettings;
            
            if (originalApplyLevelSettings && !window.gameState.levelSystem._jetpackLevelApplyHooked) {
                window.gameState.levelSystem.applyLevelSettings = (level) => {
                    // Call the original function first
                    originalApplyLevelSettings.call(window.gameState.levelSystem, level);
                    
                    
                    // Add a delay to ensure level is fully loaded before placing jetpack
                    console.log("Level changed, placing new jetpack");
                    setTimeout(() => {
                        if (this.object) {
                            this.object.visible = true;
                            this.placeRandomly();
                        } else {
                            console.log("Jetpack object missing, recreating");
                            this.createJetpack();
                            //this.placeRandomly();
                        }
                    }, 1000);
                    
                };
                
                window.gameState.levelSystem._jetpackLevelApplyHooked = true;
                console.log("Jetpack level change hook added");
            }
        } else {
            // If level system isn't available yet, try again in a moment
            console.log("Level system not ready, will try to hook level complete later");
            setTimeout(() => this.setupLevelCompleteListener(), 1000);
        }
    }
    
    createJetpack() {
        const jetpackGroup = new THREE.Group();
        const scale = 3.0;

        const bodyGeometry = new THREE.BoxGeometry(0.7 * scale, 1 * scale, 0.5 * scale);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x00FFFF });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5 * scale;
        jetpackGroup.add(body);
        
        const tankGeometry = new THREE.BoxGeometry(0.3 * scale, 0.8 * scale, 0.3 * scale);
        const tankMaterial = new THREE.MeshLambertMaterial({ color: 0x595959 });
        const leftTank = new THREE.Mesh(tankGeometry, tankMaterial);
        leftTank.position.set(-0.25 * scale, 0.5 * scale, 0);
        jetpackGroup.add(leftTank);
        
        const rightTank = new THREE.Mesh(tankGeometry.clone(), tankMaterial);
        rightTank.position.set(0.25 * scale, 0.5 * scale, 0);
        jetpackGroup.add(rightTank);
        
        const strapGeometry = new THREE.BoxGeometry(0.1 * scale, 0.8 * scale, 0.6 * scale);
        const strapMaterial = new THREE.MeshLambertMaterial({ color: 0xFF00FF });
        const leftStrap = new THREE.Mesh(strapGeometry, strapMaterial);
        leftStrap.position.set(-0.4 * scale, 0.5 * scale, 0);
        jetpackGroup.add(leftStrap);
        
        const rightStrap = new THREE.Mesh(strapGeometry.clone(), strapMaterial);
        rightStrap.position.set(0.4 * scale, 0.5 * scale, 0);
        jetpackGroup.add(rightStrap);
        
        const thrusterGeometry = new THREE.CylinderGeometry(0.15 * scale, 0.05 * scale, 0.3 * scale, 8);
        const thrusterMaterial = new THREE.MeshLambertMaterial({ color: 0xFF4500 });
        const leftThruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
        leftThruster.position.set(-0.25 * scale, 0, 0);
        leftThruster.rotation.x = Math.PI;
        jetpackGroup.add(leftThruster);
        
        const rightThruster = new THREE.Mesh(thrusterGeometry.clone(), thrusterMaterial);
        rightThruster.position.set(0.25 * scale, 0, 0);
        rightThruster.rotation.x = Math.PI;
        jetpackGroup.add(rightThruster);
        
        const nozzleGeometry = new THREE.CylinderGeometry(0.05 * scale, 0.1 * scale, 0.15 * scale, 8);
        const nozzleMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
        const leftNozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
        leftNozzle.position.set(-0.25 * scale, -0.2 * scale, 0);
        leftNozzle.rotation.x = Math.PI;
        jetpackGroup.add(leftNozzle);
        
        const rightNozzle = new THREE.Mesh(nozzleGeometry.clone(), nozzleMaterial);
        rightNozzle.position.set(0.25 * scale, -0.2 * scale, 0);
        rightNozzle.rotation.x = Math.PI;
        jetpackGroup.add(rightNozzle);
        
        jetpackGroup.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.castShadow = true;
                //object.receiveShadow = true;
            }
        });

        this.object = jetpackGroup;
        
        // Set an initial position that is visible
        //this.object.position.set(10, 10, 10);
        
        this.scene.add(this.object);
        this.floatTime = Math.random() * Math.PI * 2;
    }
    
    createFuelBar() {
        this.fuelBarContainer = document.createElement('div');
        this.fuelBarContainer.className = 'fuel-bar-container';
        this.fuelBarContainer.style.position = 'absolute';
        this.fuelBarContainer.style.bottom = '50%';
        this.fuelBarContainer.style.right = '25%';
        this.fuelBarContainer.style.width = '200px';
        this.fuelBarContainer.style.height = '20px';
        this.fuelBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.fuelBarContainer.style.border = '2px solid white';
        this.fuelBarContainer.style.borderRadius = '10px';
        this.fuelBarContainer.style.overflow = 'hidden';
        this.fuelBarContainer.style.display = 'none';
        
        const label = document.createElement('div');
        label.textContent = 'JETPACK FUEL';
        label.style.position = 'absolute';
        label.style.bottom = '53%';
        label.style.right = '25%';
        label.style.color = 'white';
        label.style.fontFamily = 'Arial, sans-serif';
        label.style.fontSize = '12px';
        label.style.fontWeight = 'bold';
        label.style.textShadow = '2px 2px 2px rgba(0, 0, 0, 0.5)';
        label.style.display = 'none';
        this.fuelBarContainer.label = label;
        
        this.fuelBar = document.createElement('div');
        this.fuelBar.style.width = '100%';
        this.fuelBar.style.height = '100%';
        this.fuelBar.style.backgroundColor = '#00AAFF';
        this.fuelBar.style.transition = 'width 0.1s';
        
        this.fuelBarContainer.appendChild(this.fuelBar);
        document.body.appendChild(this.fuelBarContainer);
        document.body.appendChild(label);
    }
    
    createParticleSystem() {
        const particleCount = 200;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 1.0;
            positions[i * 3 + 1] = -(Math.random() * 4);
            positions[i * 3 + 2] = (Math.random() - 0.5) * 1.0;
            colors[i * 3] = Math.random() * 0.5 + 0.5;
            colors[i * 3 + 1] = Math.random() * 0.5;
            colors[i * 3 + 2] = 0;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: false,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        this.particles = particles;
        this.particleSystem = new THREE.Points(particles, particleMaterial);
        this.particleSystem.visible = false;
        this.scene.add(this.particleSystem);
    }
    
    updateParticles() {
        if (!this.isActive || !this.particleSystem || !this.particles) return;
        
        const positions = this.particles.attributes.position.array;
        const colors = this.particles.attributes.color.array;
        const particleCount = positions.length / 3;
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3 + 1] -= 0.1;
            if (positions[i * 3 + 1] < -4) {
                positions[i * 3] = (Math.random() - 0.5) * 1.0;
                positions[i * 3 + 1] = -(Math.random() * 4);
                positions[i * 3 + 2] = (Math.random() - 0.5) * 1.0;
                colors[i * 3] = Math.random() * 0.2 + 0.8;
                colors[i * 3 + 1] = Math.random() * 0.7;
                colors[i * 3 + 2] = 0.2;
            }
        }
        
        this.particles.attributes.position.needsUpdate = true;
        this.particles.attributes.color.needsUpdate = true;
    }
    
    placeRandomly() {
        // First check if the object exists, if not, create it again
        if (!this.object) {
            console.log("Jetpack object missing, recreating it");
            //this.createJetpack();
        }
        
        // Make sure the object is in the scene
        if (this.object.parent !== this.scene) {
            console.log("Jetpack not in scene, adding it back");
            this.scene.add(this.object);
        }
        
        // Use a player-relative position for better visibility
        if (this.player) {
            const playerPos = this.player.position;
            
            // Place jetpack x units away from player in a random direction
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random()*30;
            
            const x = playerPos.x + Math.cos(angle) * distance;
            const z = playerPos.z + Math.sin(angle) * distance;
            
            // Get terrain height at this position
            const terrainHeight = this.getTerrainHeight(x, z);
            const y = terrainHeight + this.floatHeight;
            
            // Set the position
            this.object.position.set(x, y, z);
            this.object.visible = true;
            
            // Make sure all children are visible too
            this.object.traverse(child => {
                if (child.visible !== undefined) {
                    child.visible = true;
                }
            });
            
            console.log(`Jetpack placed at: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}), visibility: ${this.object.visible}`);
        } else {
            // Fallback to a fixed position if player reference is not available
            this.object.position.set(20, 10, 20);
            this.object.visible = true;
            console.log("Jetpack placed at fallback position (20, 10, 20)");
        }
        
        this.isCollected = false;
        this.isActive = false;
        this.currentFuel = this.maxFuel;
        
        if (this.fuelBarContainer) {
            this.fuelBarContainer.style.display = 'none';
            this.fuelBarContainer.label.style.display = 'none';
        }
        
        if (this.particleSystem) {
            this.particleSystem.visible = false;
        }
    }
    
    update(deltaTime) {
        // Check if game is in a paused or completion state
        if (window.gameState && (window.gameState.goalReached || window.gameState.gamePaused)) return;
        
        // Handle game over state explicitly
        if (window.gameState && window.gameState.gameOver) {
            if (this.isCollected || this.isActive) {
                console.log("Game over detected, cleaning up jetpack state");
                this.handleGameOver();
            }
            return;
        }
        
        if (!this.isCollected) {
            this.floatTime += deltaTime * this.floatSpeed;
            const floatOffset = Math.sin(this.floatTime) * this.floatAmplitude;
            
            if (this.object) {
                // Get terrain height safely
                const baseHeight = this.getTerrainHeight(this.object.position.x, this.object.position.z);
                this.object.position.y = baseHeight + this.floatHeight + floatOffset;
                this.object.rotation.y += deltaTime * 0.5;
                
                const glowPulse = (Math.sin(this.floatTime * 2) * 0.2) + 0.8;
                this.object.children.forEach(child => {
                    if (child.material && child.material.opacity !== undefined && child.geometry instanceof THREE.SphereGeometry) {
                        child.material.opacity = 0.3 * glowPulse;
                        child.scale.set(glowPulse, glowPulse, glowPulse);
                    }
                });
                
                const distance = this.player.position.distanceTo(this.object.position);
                if (distance < 5) {
                    this.collectJetpack();
                }
            }
        } else {
            if (window.gameState && window.gameState.keyStates['Space'] && 
                window.gameState.gameStarted && !window.gameState.playerOnGround) {
                if (this.currentFuel > 0) {
                    this.isActive = true;
                    window.gameState.playerVelocity.y += this.thrustForce * deltaTime;
                    this.currentFuel = Math.max(0, this.currentFuel - (this.fuelBurnRate * deltaTime));
                    
                    if (this.particleSystem) {
                        this.particleSystem.visible = true;
                        this.particleSystem.position.copy(this.player.position);
                        this.particleSystem.position.y -= 0.5;
                    }
                    
                    if (this.jetpackSound && !this.jetpackSound.isPlaying) {
                        this.jetpackSound.play();
                    }
                    
                    // Check if fuel just ran out
                    if (this.currentFuel === 0) {
                        this.handleFuelDepletion();
                    }
                } else {
                    // No fuel left
                    this.isActive = false;
                    
                    if (this.particleSystem) {
                        this.particleSystem.visible = false;
                    }
                    
                    if (this.jetpackSound && this.jetpackSound.isPlaying) {
                        this.jetpackSound.stop();
                    }
                }
            } else {
                this.isActive = false;
                // Removed fuel regeneration while inactive
                
                if (this.particleSystem) {
                    this.particleSystem.visible = false;
                }
                
                if (this.jetpackSound && this.jetpackSound.isPlaying) {
                    this.jetpackSound.stop();
                }
            }
            
            this.updateFuelBar();
            this.updateParticles();
        }
    }
    
    collectJetpack() {
        console.log("Jetpack collected!");
        this.isCollected = true;
        this.object.visible = false;
        this.fuelBarContainer.style.display = 'block';
        this.fuelBarContainer.label.style.display = 'block';
        
        if (this.pickupSound) {
            this.pickupSound.play();
        }
        
        this.showJetpackTutorial();
    }
    
    handleFuelDepletion() {
        console.log("Jetpack fuel depleted!");
        
        // Play out of fuel sound
        if (this.outOfFuelSound) {
            this.outOfFuelSound.play();
        }
        
        // Show a notification to the player
        this.showFuelDepletionMessage();
        
        // Completely deactivate the jetpack functionality
        this.deactivateJetpack();
    }
    
    deactivateJetpack() {
        console.log("Deactivating jetpack");
        
        // Set flags
        this.isActive = false;
        this.isCollected = false;
        
        // Stop sounds
        if (this.jetpackSound && this.jetpackSound.isPlaying) {
            this.jetpackSound.stop();
        }
        
        // Hide particles
        if (this.particleSystem) {
            this.particleSystem.visible = false;
        }
        
        // Hide fuel bar
        if (this.fuelBarContainer) {
            this.fuelBarContainer.style.display = 'none';
            this.fuelBarContainer.label.style.display = 'none';
        }
        
        // Reset fuel for next time
        this.currentFuel = this.maxFuel;
    }
    
    showFuelDepletionMessage() {
        const message = document.createElement('div');
        message.className = 'level-warning';
        message.innerHTML = 'Jetpack fuel depleted!';
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 2000);
    }
    
    showJetpackTutorial() {
        const tutorial = document.createElement('div');
        tutorial.className = 'level-warning';
        if(isMobile){
            tutorial.innerHTML = 'Jetpack Collected! Tap to activate. Watch your fuel gauge!';
        } else {
            tutorial.innerHTML = 'Jetpack Collected! Press SPACE to activate. Watch your fuel gauge!';
        }
        document.body.appendChild(tutorial);
        setTimeout(() => tutorial.remove(), 4500);
    }
    
    updateFuelBar() {
        if (!this.fuelBar) return;
        
        const fuelPercent = (this.currentFuel / this.maxFuel) * 100;
        this.fuelBar.style.width = `${fuelPercent}%`;
        
        if (fuelPercent > 60) {
            this.fuelBar.style.backgroundColor = '#00AAFF';
        } else if (fuelPercent > 30) {
            this.fuelBar.style.backgroundColor = '#FFAA00';
        } else {
            this.fuelBar.style.backgroundColor = '#FF3300';
            if (fuelPercent < 10) {
                const pulseSpeed = Math.sin(Date.now() / 100) * 0.3 + 0.7;
                this.fuelBar.style.opacity = pulseSpeed.toString();
            } else {
                this.fuelBar.style.opacity = '1';
            }
        }
    }
    
    reset() {
        console.log("Resetting jetpack");
        
        // Completely reset jetpack state
        this.isActive = false;
        this.isCollected = false;
        this.currentFuel = this.maxFuel;
        
        // Stop sounds
        if (this.jetpackSound && this.jetpackSound.isPlaying) {
            this.jetpackSound.stop();
        }
        
        // Hide particles
        if (this.particleSystem) {
            this.particleSystem.visible = false;
        }
        
        // Hide fuel bar
        if (this.fuelBarContainer) {
            this.fuelBarContainer.style.display = 'none';
            this.fuelBarContainer.label.style.display = 'none';
        }
        
        // Ensure the object still exists and is properly set up
        if (!this.object || !this.object.visible) {
            console.log("Jetpack object missing or invisible during reset, checking state");
            if (!this.object) {
                console.log("Creating new jetpack object");
                this.createJetpack();
            } else {
                console.log("Ensuring jetpack visibility");
                this.object.visible = true;
            }
        }
        
        // Create a new jetpack in the world after a short delay
        // to ensure the level is properly reset first
        setTimeout(() => {
            console.log("Executing delayed jetpack placement after level reset");
            this.placeRandomly();
        }, 1000);
    }
}

// Export to window for global access (matching ChangingRoom pattern)
window.Jetpack = Jetpack;