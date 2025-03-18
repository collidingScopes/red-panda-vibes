// This script adds keyboard functionality for all game overlays
// and ensures they share a common class

// Function to add the common class to all overlay screens
function addOverlayClass() {
    // Get all the overlay screens
    const instructionsScreen = document.getElementById('instructions');
    const goalMessageScreen = document.getElementById('goal-message');
    const gameOverScreen = document.getElementById('game-over-screen');
    const levelCompleteScreen = document.getElementById('level-complete-content');
    
    // Add the common class to each screen
    const overlays = [instructionsScreen, goalMessageScreen, gameOverScreen, levelCompleteScreen];
    
    overlays.forEach(overlay => {
      if (overlay) {
        overlay.classList.add('game-overlay-screen');
      }
    });
  }
  
  // Function to handle keyboard events for overlays
  function setupKeyboardControls() {
    document.addEventListener('keydown', (event) => {
      // Check if Enter key was pressed
      if (event.code === 'Enter') {
        // Instructions screen
        const instructionsScreen = document.getElementById('instructions');
        if (instructionsScreen && instructionsScreen.style.display !== 'none') {
          instructionsScreen.style.display = 'none';
          return;
        }
        
        // Level complete screen
        const levelCompleteScreen = document.getElementById('level-complete-content');
        if (levelCompleteScreen && gameState.goalReached) {
          if (gameState.levelSystem) {
            gameState.levelSystem.advanceToNextLevel();
          }
          return;
        }

        // Game over screen
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen && gameState.gameOver) {
          resetGame();
          return;
        }
        
        // Goal message (fallback for when level system isn't active)
        const goalMessageScreen = document.getElementById('goal-message');
        if (goalMessageScreen && goalMessageScreen.style.display === 'block') {
          resetGame();
          return;
        }
      }
    });
  }
  
  // Initialize overlay enhancements
  function initOverlayEnhancements() {
    addOverlayClass();
    setupKeyboardControls();
  }
  
  // Add to window load event
  window.addEventListener('load', initOverlayEnhancements);