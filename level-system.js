// Level System for Red Panda Explorer with infinite levels
class LevelSystem {
    constructor(scene, enemyManager, player, flagPole) {
        this.scene = scene;
        this.enemyManager = enemyManager;
        this.player = player;
        this.flagPole = flagPole;
        
        // Base level settings - we'll calculate harder difficulties from these
        this.baseSettings = {
            enemyCount: 5,           // Base number of enemies
            enemySpeedWander: gameState.speed*0.6,     // Base speed when wandering
            enemySpeedChase: gameState.speed*0.8,      // Base speed when chasing
        };
        
        // Create level indicator UI
        this.createLevelIndicator();
        
        // Create level completion UI
        this.createLevelCompleteUI();
    }
    
    // Initialize level
    initialize() {
        this.applyLevelSettings(gameState.currentLevel);
        this.updateLevelIndicator();
    }
    
    // Calculate settings for the current level
    calculateLevelSettings(level) {
        // Level 1 is special with no enemies
        if (level === 1) {
            return {
                enemyCount: 0,
                enemySpeedWander: this.baseSettings.enemySpeedWander,
                enemySpeedChase: this.baseSettings.enemySpeedChase,
                flagHeight: 35, // Starting flag height
                terrainHeightMultiplier: 1.0 // Base terrain height
            };
        }
        
        // For levels 2 and above, scale difficulty
        const enemyCount = Math.max(0, this.baseSettings.enemyCount + (level - 2) * 5);
        
        // Calculate enemy speed: increases by 4% per level above level 2
        const speedMultiplier = 1 + (level - 2) * 0.04;
        const enemySpeedWander = this.baseSettings.enemySpeedWander * speedMultiplier;
        const enemySpeedChase = this.baseSettings.enemySpeedChase * speedMultiplier;
        
        // NEW: Shrink flag pole with each level (minimum 5 units)
        //const flagHeight = Math.max(7, 30 - (level - 1) * 1.5);
        const flagHeight = 35;

        // NEW: Increase terrain height multiplier with each level
        const terrainHeightMultiplier = 1.0 + Math.min(1.8, (level - 1) * 0.05);
        
        return {
            enemyCount,
            enemySpeedWander,
            enemySpeedChase,
            flagHeight,
            terrainHeightMultiplier
        };
    }
    
    // Apply settings for the current level
    applyLevelSettings(level) {
        const settings = this.calculateLevelSettings(level);
        
        // Update enemy count and speed
        this.enemyManager.COUNT = settings.enemyCount;
        this.enemyManager.SPEED_WANDER = settings.enemySpeedWander;
        this.enemyManager.SPEED_CHASE = settings.enemySpeedChase;
        this.enemyManager.reset(); // Reset and recreate enemies with new count and speed
        
        if(level > 1){
            this.player.position.set(0, 50, 0);

            this.updateTerrainHeight(settings.terrainHeightMultiplier);

            // Reposition the flag for this level (further away for higher levels)
            const distance = 50 + (level * 7); // Increase distance with level
            const angle = Math.random() * Math.PI * 2; // Random angle for variety
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            // Update flag pole position
            this.updateFlagPosition(x, z);
        }
            
        // NEW: Show level warning message if available
        if (window.levelWarnings) {
            window.levelWarnings.showWarningForLevel(level);
        }
    }
    
    // Update flag position for new level
    updateFlagPosition(x, z) {
        const terrainHeightFunction = window.getTerrainHeight || this.enemyManager.getTerrainHeight;
        const y = terrainHeightFunction(x, z);
        this.flagPole.position.set(x, y, z);
    }

    // Update terrain height multiplier
    updateTerrainHeight(multiplier) {
        // Store the current multiplier for use in the terrain height calculation
        window.terrainHeightMultiplier = multiplier;
        
        // Regenerate the visible terrain geometry
        if (window.regenerateTerrain) {
            window.regenerateTerrain();
        }
    }
    
    // Create level indicator UI
    createLevelIndicator() {
        const levelIndicator = document.createElement('div');
        levelIndicator.id = 'level-indicator';
        levelIndicator.innerHTML = `<span>Level ${gameState.currentLevel}</span>`;
        document.body.appendChild(levelIndicator);
    }
    
    // Update level indicator text
    updateLevelIndicator() {
        const indicator = document.getElementById('level-indicator');
        if (indicator) {
            indicator.innerHTML = `<span>Level ${gameState.currentLevel}</span>`;
        }
    }
    
    // Create level complete UI
    createLevelCompleteUI() {        
        // Add event listener for next level button
        document.getElementById('next-level-button').addEventListener('click', () => {
            this.advanceToNextLevel();
        });
    }
    
    // Advance to next level
    advanceToNextLevel() {
        // Always advance to the next level
        gameState.currentLevel++;
        this.applyLevelSettings(gameState.currentLevel);
        this.updateLevelIndicator();
    
        // Add this line to play level up sound:
        if (window.playLevelUpSound) window.playLevelUpSound();
        
        // Hide level complete screen and reset goal reached state
        document.getElementById('level-complete-content').classList.add('hidden');
        gameState.goalReached = false;
        
        // Handle portals for the new level
        if (window.removeAllPortals && typeof window.removeAllPortals === 'function') {
            window.removeAllPortals();
        }
        
        // Create new portals after a short delay
        setTimeout(() => {
            if (window.createPortals && typeof window.createPortals === 'function') {
                window.createPortals();
            }
        }, 1000);
    }
    
    // Show level complete screen
    showLevelComplete() {

        document.getElementById('instructions').classList.add("hidden");

        // Update level status
        const statusEl = document.getElementById('level-status');
        if (statusEl) {
            statusEl.innerHTML = `<p>Get ready for Level ${gameState.currentLevel + 1}!</p>`;
            document.getElementById('next-level-button').textContent = 'Next Level';
        }
        
        // Show the level complete screen
        document.getElementById('level-complete-content').classList.remove('hidden');
    
        // Remove portals when level is completed
        if (window.removeAllPortals && typeof window.removeAllPortals === 'function') {
            window.removeAllPortals();
        }
    }
    
    // Restart the entire game
    restartGame() {
        gameState.currentLevel = 1;
        this.applyLevelSettings(gameState.currentLevel);
        this.updateLevelIndicator();
        
        // Reset game state
        gameState.goalReached = false;

        // Reset warnings
        if (window.levelWarnings) {
            window.levelWarnings.reset();
        }

        // Handle portals for the new game
        if (window.removeAllPortals && typeof window.removeAllPortals === 'function') {
            window.removeAllPortals();
        }
        
        // Create new portals after a short delay
        setTimeout(() => {
            if (window.createPortals && typeof window.createPortals === 'function') {
                window.createPortals();
            }
        }, 1000);
    }
}

// Export the level system for use in game.js
window.LevelSystem = LevelSystem;