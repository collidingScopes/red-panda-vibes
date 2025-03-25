// Level 1 reminder functionality
(function() {
    // Variables to track reminder state
    let reminderTimer = null;
    let reminderShownTimer = null;
    let reminderShown = false;
    
    // Function to show reminder message
    function showReminderMessage() {
        // Only show the reminder if the player is still on level 1 and hasn't reached the goal
        if (gameState.currentLevel === 1 && !gameState.goalReached && !reminderShown) {
            const reminderMessage = document.getElementById('reminder-message');
            reminderMessage.classList.remove('hidden');
            reminderShown = true;
            
            // Set timer to hide the message after 4 seconds
            reminderShownTimer = setTimeout(() => {
                hideReminderMessage();
            }, 4000);
        }
    }
    
    // Function to hide reminder message
    function hideReminderMessage() {
        const reminderMessage = document.getElementById('reminder-message');
        reminderMessage.classList.add('hidden');
    }
    
    // Function to initialize reminder timer
    function initReminderTimer() {
        // Clear any existing timers
        if (reminderTimer) {
            clearTimeout(reminderTimer);
        }
        if (reminderShownTimer) {
            clearTimeout(reminderShownTimer);
        }
        
        // Reset reminder shown flag
        reminderShown = false;
        
        // Hide reminder message to ensure it's not visible initially
        hideReminderMessage();
        
        // Only set reminder for level 1
        if (gameState.currentLevel === 1) {
            // Set timer to show reminder after 55 seconds
            reminderTimer = setTimeout(showReminderMessage, 55000);
        }
    }
    
    // Listen for level changes and game state changes
    function setupListeners() {
        // Watch for level changes
        const levelSystem = gameState.levelSystem;
        if (levelSystem) {
            // Hook into level change functionality
            const originalApplyLevelSettings = levelSystem.applyLevelSettings;
            levelSystem.applyLevelSettings = function(level) {
                originalApplyLevelSettings.call(this, level);
                
                // Reset reminder timer when level changes
                initReminderTimer();
            };
        }
        
        // Reset reminder when game resets
        const originalResetGame = window.resetGame;
        window.resetGame = function() {
            originalResetGame();
            initReminderTimer();
        };
        
        // Also initialize when game starts
        document.getElementById('start-game-button').addEventListener('click', initReminderTimer);
        
        // Cancel reminder when goal is reached
        const checkGoal = function() {
            if (gameState.goalReached && reminderTimer) {
                clearTimeout(reminderTimer);
                hideReminderMessage();
            }
        };
        
        // Check for goal reached every 3 seconds
        setInterval(checkGoal, 3000);
    }
    
    // Initialize when game loads
    document.addEventListener('DOMContentLoaded', function() {
        // Delay setup slightly to ensure game state is initialized
        setTimeout(function() {
            setupListeners();
            
            // Initialize reminder timer
            initReminderTimer();
        }, 1000);
    });
    
    // If document is already loaded, set up immediately
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setupListeners();
        
        // Initialize reminder timer
        initReminderTimer();
    }
})();