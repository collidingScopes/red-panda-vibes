// Level Selector Script for Red Panda Vibes
// This script adds level selection functionality to the game start screen

(function() {
    // Initialization function
    function initLevelSelector() {
        // Create the level selector container
        const levelSelectorContainer = document.createElement('div');
        levelSelectorContainer.id = 'level-selector-container';
        
        // Create the label
        const label = document.createElement('label');
        label.setAttribute('for', 'level-select');
        label.textContent = 'Starting Level: ';
        
        // Create the select dropdown
        const select = document.createElement('select');
        select.id = 'level-select';
        select.name = 'level-select';
        
        // Add options for levels 1-10
        for (let i = 1; i <= 10; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Level ${i}`;
            if (i === 1) option.selected = true;
            select.appendChild(option);
        }
        
        // Assemble the container
        levelSelectorContainer.appendChild(label);
        levelSelectorContainer.appendChild(select);
        
        // Find the game start screen
        const gameStartScreen = document.getElementById('game-start-screen');
        if (gameStartScreen) {
            // Find the start button
            const startButton = document.getElementById('start-game-button');
            
            // Insert level selector before the start button
            if (startButton) {
                gameStartScreen.insertBefore(levelSelectorContainer, startButton);
            } else {
                gameStartScreen.appendChild(levelSelectorContainer);
            }
            
            // Override the start button's click handler
            overrideStartButton(select);
        }
    }
    
    // Function to override the start button's behavior
    function overrideStartButton(levelSelect) {
        const startButton = document.getElementById('start-game-button');
        
        // Add new click event listener
        startButton.addEventListener('click', function() {
            const selectedLevel = parseInt(levelSelect.value);
            
            // Set the level in gameState
            if (window.gameState) {
                window.gameState.currentLevel = selectedLevel;
                window.gameState.gameStarted = true;
                
                // Apply level settings if level system exists
                if (window.gameState.levelSystem) {
                    window.gameState.levelSystem.applyLevelSettings(selectedLevel);
                    window.gameState.levelSystem.updateLevelIndicator();
                }
                
                // Hide the start screen
                startButton.classList.add("hidden");
                document.querySelector("#level-selector-container").classList.add("hidden");
                document.querySelector("#game-start-screen").classList.add("hidden");

                // Show tutorials for level 1, otherwise show level-specific warnings
                if (selectedLevel === 1) {
                    setTimeout(function() {
                        if (typeof window.showTutorialMessages === 'function') {
                            window.showTutorialMessages();
                        }
                    }, 4000);
                } else {
                    // Show level warnings for the selected level
                    if (window.levelWarnings) {
                        setTimeout(function() {
                            window.levelWarnings.showWarningForLevel(selectedLevel);
                        }, 1000);
                    }
                }
            }

            initPortalSystem();

        });
        
    }
    
    // Initialize when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLevelSelector);
    } else {
        // If DOMContentLoaded has already fired
        initLevelSelector();
    }
})();