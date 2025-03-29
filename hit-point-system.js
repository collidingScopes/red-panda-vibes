class HitPointsSystem {
    constructor() {
        // Initialize properties
        this.maxHitPoints = 3;
        this.currentHitPoints = 3;
        this.invulnerableTime = 2.0; // Seconds of invulnerability after being hit
        this.isInvulnerable = false;
        this.invulnerableTimer = 0;
        this.hitPointBar = null;
        this.hitPointHearts = [];
        
        // Create the UI elements
        this.createHitPointBar();
        
        // Add custom styles
        this.addStyles();
    }
    
    // Decrease hit points when player is hit
    decreaseHitPoints() {
        // If player is invulnerable, don't decrease hit points
        if (this.isInvulnerable) return;
        
        // Decrease hit points
        this.currentHitPoints--;
        
        // Update the UI
        this.updateHitPointsDisplay();
        
        // Make player invulnerable temporarily
        this.isInvulnerable = true;
        this.invulnerableTimer = 0;
        
        // Play hit sound using the centralized sound system
        if (window.soundSystem) {
            window.soundSystem.playHitSound();
        } else {
            console.warn("Sound system not available, can't play hit sound");
        }
        
        // Flash player model to indicate hit
        this.flashPlayer();
        
        // If hit points reach 0, trigger game over
        if (this.currentHitPoints <= 0) {
            // Let enemy manager handle game over
            if (gameState.enemyManager) {
                gameState.enemyManager.triggerGameOver();
            }
        }
    }
    
    createHitPointBar() {
        // Create container for the hit point bar
        this.hitPointBar = document.createElement('div');
        this.hitPointBar.id = 'hit-point-bar';
        this.hitPointBar.style.position = 'absolute';
        this.hitPointBar.style.bottom = '20px';
        this.hitPointBar.style.left = '50%';
        this.hitPointBar.style.transform = 'translateX(-50%)';
        this.hitPointBar.style.display = 'flex';
        this.hitPointBar.style.gap = '8px';
        this.hitPointBar.style.zIndex = '100';
        
        // Create hearts for each hit point - using a more pixelated, low-poly design
        for (let i = 0; i < this.maxHitPoints; i++) {
            const heart = document.createElement('div');
            heart.className = 'hit-point-heart';
            
            // Low-poly, pixelated heart SVG
            heart.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 16 16" shape-rendering="crispEdges">
                    <path d="M8 14
                           L4 10
                           L2 8
                           L1 6
                           L1 4
                           L3 2
                           L5 2
                           L6 3
                           L8 5
                           L10 3
                           L11 2
                           L13 2
                           L15 4
                           L15 6
                           L14 8
                           L12 10
                           L8 14"
                          fill="#FF0000" stroke="#000000" stroke-width="1" />
                </svg>
            `;
            this.hitPointHearts.push(heart);
            this.hitPointBar.appendChild(heart);
        }
        
        // Add the hit point bar to the document
        document.body.appendChild(this.hitPointBar);
    }
    
    // Flash player model to indicate hit
    flashPlayer() {
        if (!gameState.pandaModel) return;
        
        const flashDuration = 0.2; // Duration of each flash in seconds
        const flashCount = 6; // Number of flashes
        let flashesCompleted = 0;
        
        const flash = () => {
            if (flashesCompleted >= flashCount || !gameState.pandaModel) {
                if (gameState.pandaModel) {
                    // Ensure model is visible at the end
                    gameState.pandaModel.visible = true;
                    
                    // Reset all materials to original opacity
                    gameState.pandaModel.traverse((child) => {
                        if (child.isMesh && child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (mat.transparent) mat.opacity = 1.0;
                                });
                            } else {
                                if (child.material.transparent) child.material.opacity = 1.0;
                            }
                        }
                    });
                }
                return;
            }
            
            // Toggle visibility
            gameState.pandaModel.visible = !gameState.pandaModel.visible;
            flashesCompleted++;
            
            // Schedule next flash
            setTimeout(flash, flashDuration * 1000);
        };
        
        // Start flashing
        flash();
    }
    
    // Update hit points display
    updateHitPointsDisplay() {
        // Update each heart in the display
        for (let i = 0; i < this.maxHitPoints; i++) {
            if (i < this.currentHitPoints) {
                // Heart is filled
                this.hitPointHearts[i].style.opacity = '1';
            } else {
                // Heart is empty
                this.hitPointHearts[i].style.opacity = '0.2';
            }
        }
    }
    
    // Reset hit points to max
    reset() {
        this.currentHitPoints = this.maxHitPoints;
        this.isInvulnerable = false;
        this.invulnerableTimer = 0;
        this.updateHitPointsDisplay();
    }
    
    // Update function called every frame
    update(deltaTime) {
        // Update invulnerability timer
        if (this.isInvulnerable) {
            this.invulnerableTimer += deltaTime;
            if (this.invulnerableTimer >= this.invulnerableTime) {
                this.isInvulnerable = false;
                
                // Ensure player model is fully visible when invulnerability ends
                if (gameState.pandaModel) {
                    gameState.pandaModel.visible = true;
                    
                    // Reset all materials to original opacity
                    gameState.pandaModel.traverse((child) => {
                        if (child.isMesh && child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (mat.transparent) mat.opacity = 1.0;
                                });
                            } else {
                                if (child.material.transparent) child.material.opacity = 1.0;
                            }
                        }
                    });
                }
            }
        }
    }
    
    // Add CSS styles
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #hit-point-bar {
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
            }
            
            .hit-point-heart {
                transition: opacity 0.3s ease;
                image-rendering: pixelated;
            }
            
            .hit-point-heart svg {
                image-rendering: pixelated;
                transform: scale(1.25); /* Make hearts slightly larger */
            }
            
            /* Apply pixelation effect to the SVG path */
            .hit-point-heart svg path {
                shape-rendering: crispEdges;
            }
            
            @media (max-width: 768px) {
                #hit-point-bar {
                    bottom: 60px; /* Position above mobile controls */
                }
                
                .hit-point-heart svg {
                    width: 24px;
                    height: 24px;
                }
            }
        `;
        document.head.appendChild(style);
    }
}