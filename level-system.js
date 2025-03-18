// Level System for Red Panda Explorer
class LevelSystem {
    constructor(scene, enemyManager, player, flagPole) {
        this.scene = scene;
        this.enemyManager = enemyManager;
        this.player = player;
        this.flagPole = flagPole;
        
        // Level settings
        this.currentLevel = 1;
        this.maxLevel = 5;
        
        // Level-specific settings
        this.levelSettings = {
            // Level 1: No enemies, minimal fog
            1: { 
                enemyCount: 0, 
                fogDensity: 0.01, 
                fogColor: 0xa183e0,
                fogDistance: 100
            },
            // Level 2: Few enemies, light fog
            2: { 
                enemyCount: 5, 
                fogDensity: 0.02, 
                fogColor: 0x9574d4,
                fogDistance: 70
            },
            // Level 3: More enemies, moderate fog
            3: { 
                enemyCount: 10, 
                fogDensity: 0.03, 
                fogColor: 0x8966c9,
                fogDistance: 50
            },
            // Level 4: Many enemies, heavy fog
            4: { 
                enemyCount: 15, 
                fogDensity: 0.04, 
                fogColor: 0x7d57be,
                fogDistance: 30
            },
            // Level 5: Max enemies, very heavy fog
            5: { 
                enemyCount: 20, 
                fogDensity: 0.05, 
                fogColor: 0x7148b3,
                fogDistance: 20
            }
        };
        
        // Create level indicator UI
        this.createLevelIndicator();
        
        // Create level completion UI
        this.createLevelCompleteUI();
    }
    
    // Initialize level
    initialize() {
        this.applyLevelSettings(this.currentLevel);
        this.updateLevelIndicator();
    }
    
    // Apply settings for the current level
    applyLevelSettings(level) {
        const settings = this.levelSettings[level];
        
        // Update fog settings
        this.scene.fog = new THREE.Fog(settings.fogColor, 20, settings.fogDistance);
        
        // Update enemy count
        this.enemyManager.COUNT = settings.enemyCount;
        this.enemyManager.reset(); // Reset and recreate enemies with new count
        
        // Reset player position
        this.player.position.set(0, 50, 0);
        
        // Reposition the flag for this level (further away for higher levels)
        const distance = 50 + (level * 10); // Increase distance with level
        const angle = Math.random() * Math.PI * 2; // Random angle for variety
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        // Update flag pole position
        this.updateFlagPosition(x, z);
    }
    
    // Update flag position for new level
    updateFlagPosition(x, z) {
        const terrainHeightFunction = window.getTerrainHeight || this.enemyManager.getTerrainHeight;
        const y = terrainHeightFunction(x, z);
        this.flagPole.position.set(x, y, z);
    }
    
    // Create level indicator UI
    createLevelIndicator() {
        const levelIndicator = document.createElement('div');
        levelIndicator.id = 'level-indicator';
        levelIndicator.innerHTML = `<span>Level ${this.currentLevel}/${this.maxLevel}</span>`;
        document.body.appendChild(levelIndicator);
    }
    
    // Update level indicator text
    updateLevelIndicator() {
        const indicator = document.getElementById('level-indicator');
        if (indicator) {
            indicator.innerHTML = `<span>Level ${this.currentLevel}/${this.maxLevel}</span>`;
        }
    }
    
    // Create level complete UI
    createLevelCompleteUI() {
        const levelCompleteScreen = document.createElement('div');
        levelCompleteScreen.id = 'level-complete-screen';
        levelCompleteScreen.innerHTML = `
            <div class="level-complete-content">
                <h2>Level Complete!</h2>
                <p>You've reached the flag!</p>
                <div id="level-status"></div>
                <button id="next-level-button">Next Level</button>
            </div>
        `;
        document.body.appendChild(levelCompleteScreen);
        
        // Add event listener for next level button
        document.getElementById('next-level-button').addEventListener('click', () => {
            this.advanceToNextLevel();
        });
    }
    
    // Advance to next level
    advanceToNextLevel() {
        if (this.currentLevel < this.maxLevel) {
            this.currentLevel++;
            this.applyLevelSettings(this.currentLevel);
            this.updateLevelIndicator();
            
            // Hide level complete screen and reset goal reached state
            document.getElementById('level-complete-screen').style.display = 'none';
            gameState.goalReached = false;
        } else {
            // Game complete - show win screen
            this.showGameWinScreen();
        }
    }
    
    // Show level complete screen
    showLevelComplete() {
        // Update level status
        const statusEl = document.getElementById('level-status');
        if (statusEl) {
            if (this.currentLevel < this.maxLevel) {
                statusEl.innerHTML = `<p>Get ready for Level ${this.currentLevel + 1}!</p>`;
                document.getElementById('next-level-button').textContent = 'Next Level';
            } else {
                statusEl.innerHTML = `<p>This is the final level!</p>`;
                document.getElementById('next-level-button').textContent = 'Complete Game';
            }
        }
        
        // Show the level complete screen
        document.getElementById('level-complete-screen').style.display = 'flex';
    }
    
    // Show game win screen
    showGameWinScreen() {
        // Create win screen if it doesn't exist
        if (!document.getElementById('game-win-screen')) {
            const gameWinScreen = document.createElement('div');
            gameWinScreen.id = 'game-win-screen';
            gameWinScreen.innerHTML = `
                <div class="game-win-content">
                    <h2>Congratulations!</h2>
                    <p>You've completed all levels!</p>
                    <p>You are a true Red Panda Explorer!</p>
                    <button id="restart-game-button">Play Again</button>
                </div>
            `;
            document.body.appendChild(gameWinScreen);
            
            // Add event listener for restart button
            document.getElementById('restart-game-button').addEventListener('click', () => {
                this.restartGame();
            });
        }
        
        // Hide level complete screen
        document.getElementById('level-complete-screen').style.display = 'none';
        
        // Show win screen
        document.getElementById('game-win-screen').style.display = 'flex';
    }
    
    // Restart the entire game
    restartGame() {
        this.currentLevel = 1;
        this.applyLevelSettings(this.currentLevel);
        this.updateLevelIndicator();
        
        // Hide win screen
        document.getElementById('game-win-screen').style.display = 'none';
        
        // Reset game state
        gameState.goalReached = false;
    }
}

// Export the level system for use in game.js
window.LevelSystem = LevelSystem;