// This script adds keyboard functionality for all game overlays
// and ensures they share a common class


// Function to handle keyboard events for overlays
function setupKeyboardControls() {
    document.addEventListener('keydown', (event) => {
      // Check if Enter key was pressed
      if (event.code === 'Enter') {

        console.log("enter key pressed");

        const startGameButton = document.getElementById('start-game-button');
        if (startGameButton && startGameButton.style.display !== 'none' && !gameState.gameStarted) {
          startGameButton.click();
          //startGameButton.style.display = 'none';
          return;
        }

        // Level complete screen
        const levelCompleteScreen = document.getElementById('level-complete-content');
        if (levelCompleteScreen && gameState.goalReached) {
          gameState.levelSystem.advanceToNextLevel();
          return;
        }

        // Game over screen
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen && gameState.gameOver) {
          resetGame();
          return;
        }

      }
    });
  }
  
  // Initialize overlay enhancements
  function initOverlayEnhancements() {
    setupKeyboardControls();
  }
  
  // Add to window load event
  window.addEventListener('load', initOverlayEnhancements);

  // Main keystate reset function
function resetAllKeyStates() {
  console.log("Resetting all key states");
  
  // Reset keys in common input handler patterns
  if (window.inputHandler || window.input || window.gameInput) {
      const inputHandler = window.inputHandler || window.input || window.gameInput;
      
      if (inputHandler) {
          // Reset keys object
          if (inputHandler.keys && typeof inputHandler.keys === 'object') {
              console.log("Resetting keys in input handler");
              Object.keys(inputHandler.keys).forEach(key => {
                  inputHandler.keys[key] = false;
              });
          }
          
          // Reset specific common key state properties
          const keyProps = ['isJumping', 'jump', 'forward', 'backward', 'left', 'right', 
                           'moveForward', 'moveBackward', 'moveLeft', 'moveRight', 
                           'space', 'shift', 'ctrl', 'alt'];
          
          keyProps.forEach(prop => {
              if (typeof inputHandler[prop] !== 'undefined') {
                  inputHandler[prop] = false;
              }
          });
      }
  }
  
  // Reset global key state object
  if (window.keyState && typeof window.keyState === 'object') {
      console.log("Resetting global keyState object");
      Object.keys(window.keyState).forEach(key => {
          window.keyState[key] = false;
      });
  }
  
  // Reset our own key state tracker
  if (window._portalKeyStates && typeof window._portalKeyStates === 'object') {
      Object.keys(window._portalKeyStates).forEach(key => {
          window._portalKeyStates[key] = false;
      });
  }
  
  // Dispatch key up events for common movement keys
  const commonKeys = ['w', 'a', 's', 'd', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  
  commonKeys.forEach(key => {
      // Create and dispatch a keyup event
      const keyupEvent = new KeyboardEvent('keyup', {
          key: key,
          code: key.length === 1 ? 'Key' + key.toUpperCase() : key,
          bubbles: true
      });
      
      document.dispatchEvent(keyupEvent);
      window.dispatchEvent(keyupEvent);
      
      // Also dispatch to canvas if it exists
      const canvas = document.querySelector('canvas');
      if (canvas) {
          canvas.dispatchEvent(keyupEvent);
      }
  });
  
  // Reset player state
  if (window.player) {
      // Reset common player movement properties
      if (window.player.isJumping !== undefined) window.player.isJumping = false;
      if (window.player.jumping !== undefined) window.player.jumping = false;
      if (window.player.jump !== undefined) window.player.jump = false;
      
      // Reset velocity if it exists and is in a jump
      if (window.player.velocity) {
          if (window.player.velocity.y > 0) {
              window.player.velocity.y = 0;
          }
      }
  }
}

function isInAppBrowser() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  
  // Common patterns for in-app browsers
  const inAppPatterns = [
      // X/Twitter
      'Twitter',
      'TwitterAndroid',
      'TwitteriOS',
      
      // Facebook
      'FB_IAB',           // Facebook In-App Browser
      'FBAN',            // Facebook App Native
      'FBAV',            // Facebook App Version
      
      // Instagram
      'Instagram',
      
      // LinkedIn
      'LinkedInApp',
      
      // Snapchat
      'Snapchat',
      
      // TikTok
      'TikTok',
      
      // Mobile-specific indicators often present with in-app browsers
      /\bMobile\b.*\bSafari\b/,  // Mobile Safari-like but not standalone
  ];

  // Check if any pattern matches
  for (let pattern of inAppPatterns) {
      if (typeof pattern === 'string') {
          if (ua.includes(pattern)) return true;
      } else if (pattern instanceof RegExp) {
          if (pattern.test(ua)) return true;
      }
  }

  // Additional check: window size vs screen size
  // In-app browsers often have different dimensions due to UI elements
  const isFullScreen = window.innerHeight === screen.height && 
                      window.innerWidth === screen.width;

  // Check for standalone browser features that might be absent
  const isStandalone = ('standalone' in window.navigator) && 
                      window.navigator.standalone;

  // If it's not full screen and not standalone, might be in-app
  return !isFullScreen && !isStandalone;
}