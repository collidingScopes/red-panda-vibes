// Mobile Controls for Red Panda Explorer
// This script adds touch controls for mobile devices while preserving desktop gameplay

class MobileControls {
    constructor() {
        // Only initialize if on a mobile device
        this.isMobile = this.checkIfMobile();
        
        if (!this.isMobile) return;
        
        // References to game objects (will be populated when the game initializes)
        this.player = null;
        this.camera = null;
        this.gameState = null;
        
        // Touch control state
        this.touchActive = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchCurrentX = 0;
        this.touchCurrentY = 0;
        
        // Movement and camera parameters
        this.movementDeadzone = 20; // Minimum touch movement before registering input
        this.movementScale = 0.015; // Scaling factor for movement sensitivity
        this.cameraLocked = true; // Whether camera is locked behind player
        
        // Jump button state
        this.jumpButtonPressed = false;
        
        // Initialize UI and event listeners
        this.initMobileUI();
        this.addEventListeners();
        
        // Create a variable to track when we're ready to connect to the game
        this.initialized = false;
        
        // Create a timer to check for game objects after the game loads
        this.connectToGameTimer = setInterval(() => this.connectToGame(), 500);
        
        // Flag to track if we've already modified the game's camera update function
        this.cameraUpdateModified = false;
        
        console.log("Mobile controls initialized");
    }
    
    // Check if user is on a mobile device
    checkIfMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    // Initialize mobile UI elements
    initMobileUI() {
        // Create container for mobile controls
        const controlsContainer = document.createElement('div');
        controlsContainer.id = 'mobile-controls-container';
        document.body.appendChild(controlsContainer);
        
        // Create jump button
        const jumpButton = document.createElement('div');
        jumpButton.id = 'mobile-jump-button';
        jumpButton.innerHTML = '↑';
        controlsContainer.appendChild(jumpButton);
        
        // Add styles for mobile controls
        this.addMobileStyles();
    }
    
    // Add CSS styles for mobile controls
    addMobileStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            #mobile-controls-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
            }
            
            #mobile-jump-button {
                width: 60px;
                height: 60px;
                background-color: rgba(162, 255, 132, 0.4);
                color: white;
                font-size: 36px;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                border: 2px solid rgba(162, 255, 132, 0.8);
                box-shadow: 0 0 10px rgba(162, 255, 132, 0.6);
                user-select: none;
                touch-action: manipulation;
            }
            
            #mobile-jump-button:active {
                background-color: rgba(162, 255, 132, 0.7);
            }
            
            /* Make instructions smaller on mobile */
            @media (max-width: 768px) {
                #instructions {
                    max-width: 90%;
                    font-size: 14px;
                    padding: 10px;
                }
                
                #instructions h3 {
                    font-size: 16px;
                    margin-bottom: 8px;
                }
                
                /* Update control instructions for mobile */
                #instructions p:nth-child(2),
                #instructions p:nth-child(3) {
                    display: none;
                }
                
                /* Add mobile-specific instruction */
                #instructions::after {
                    content: "👆 Swipe to move, tap the jump button to jump";
                    display: block;
                    margin-top: 8px;
                    font-size: 14px;
                }
            }
        `;
        document.head.appendChild(styleElement);
    }
    
    // Add event listeners for touch controls
    addEventListeners() {
        // Touch start event for movement
        document.addEventListener('touchstart', (event) => this.handleTouchStart(event), { passive: false });
        
        // Touch move event for movement
        document.addEventListener('touchmove', (event) => this.handleTouchMove(event), { passive: false });
        
        // Touch end event to stop movement
        document.addEventListener('touchend', (event) => this.handleTouchEnd(event), { passive: false });
        
        // Jump button events
        const jumpButton = document.getElementById('mobile-jump-button');
        jumpButton.addEventListener('touchstart', (event) => {
            event.preventDefault();
            this.jumpButtonPressed = true;
        });
        
        jumpButton.addEventListener('touchend', (event) => {
            event.preventDefault();
            this.jumpButtonPressed = false;
        });
        
        // Fix for game UI buttons
        this.fixGameButtonsForTouch();
    }
    
    // Handle touch start event
    handleTouchStart(event) {
        // Ignore if it's a touch on the jump button
        if (event.target.id === 'mobile-jump-button') return;
        
        // Get the first touch
        const touch = event.touches[0];
        
        this.touchActive = true;
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchCurrentX = touch.clientX;
        this.touchCurrentY = touch.clientY;
        
        // Prevent default scrolling behavior
        if (event.cancelable) event.preventDefault();
    }
    
    // Handle touch move event
    handleTouchMove(event) {
        // Ignore if touch isn't active or it's on jump button
        if (!this.touchActive || event.target.id === 'mobile-jump-button') return;
        
        // Get the first touch
        const touch = event.touches[0];
        
        this.touchCurrentX = touch.clientX;
        this.touchCurrentY = touch.clientY;
        
        // Update movement direction based on touch delta
        if (this.gameState) {
            this.updateMovementFromTouch();
        }
        
        // Prevent default scrolling behavior
        if (event.cancelable) event.preventDefault();
    }
    
    // Handle touch end event
    handleTouchEnd(event) {
        // Ignore if it's a touch on the jump button
        if (event.target.id === 'mobile-jump-button') return;
        
        this.touchActive = false;
        
        // Reset movement keys
        if (this.gameState) {
            this.gameState.keyStates['KeyW'] = false;
            this.gameState.keyStates['KeyA'] = false;
            this.gameState.keyStates['KeyS'] = false;
            this.gameState.keyStates['KeyD'] = false;
        }
    }
    
    // Update movement direction based on touch position
    updateMovementFromTouch() {
        const deltaX = this.touchCurrentX - this.touchStartX;
        const deltaY = this.touchCurrentY - this.touchStartY;
        
        // Reset all movement keys
        this.gameState.keyStates['KeyW'] = false;
        this.gameState.keyStates['KeyA'] = false;
        this.gameState.keyStates['KeyS'] = false;
        this.gameState.keyStates['KeyD'] = false;
        
        // Apply forward/backward movement (Y axis)
        if (Math.abs(deltaY) > this.movementDeadzone) {
            if (deltaY < 0) {
                this.gameState.keyStates['KeyW'] = true; // Forward
            } else {
                this.gameState.keyStates['KeyS'] = true; // Backward
            }
        }
        
        // Apply left/right movement (X axis)
        if (Math.abs(deltaX) > this.movementDeadzone) {
            if (deltaX < 0) {
                this.gameState.keyStates['KeyA'] = true; // Left
            } else {
                this.gameState.keyStates['KeyD'] = true; // Right
            }
        }
    }
    
    // Connect to game objects once they're available
    connectToGame() {
        // Check if window.gameState exists
        if (window.gameState) {
            this.gameState = window.gameState;
            
            // Get camera reference
            if (window.camera) {
                this.camera = window.camera;
            }
            
            // Get player reference
            if (window.player) {
                this.player = window.player;
            }
            
            // Check if we have all required references
            if (this.gameState && this.camera && this.player && !this.initialized) {
                this.initialized = true;
                
                // Override the camera update function for mobile
                this.overrideCameraUpdate();
                
                // Clear the connection timer
                clearInterval(this.connectToGameTimer);
                
                console.log("Mobile controls connected to game");
            }
        }
    }
    
    // Override the camera update function to keep camera behind player
    overrideCameraUpdate() {
        if (this.cameraUpdateModified) return;
        
        // Store reference to the original updateCamera function
        const originalUpdateCamera = window.updateCamera;
        
        // Override the updateCamera function
        window.updateCamera = () => {
            // Only use our mobile camera control on mobile
            if (this.isMobile && this.cameraLocked) {
                this.updateMobileCamera();
            } else {
                // Use original camera update for desktop
                originalUpdateCamera();
            }
        };
        
        this.cameraUpdateModified = true;
    }
    
    // Mobile-specific camera update that follows behind the player
    updateMobileCamera() {
        if (!this.camera || !this.player) return;
        
        // Get player's forward direction
        const playerForward = new THREE.Vector3(0, 0, 1);
        playerForward.applyQuaternion(this.player.quaternion);
        playerForward.normalize();
        
        // Set camera position behind player
        const cameraDistance = 5; // Distance behind player
        const cameraHeight = 2.5; // Height above player
        
        this.camera.position.x = this.player.position.x - playerForward.x * cameraDistance;
        this.camera.position.z = this.player.position.z - playerForward.z * cameraDistance;
        this.camera.position.y = this.player.position.y + cameraHeight;
        
        // Make camera look at player
        const lookAtPoint = new THREE.Vector3();
        lookAtPoint.copy(this.player.position);
        lookAtPoint.y += 1; // Look at player's head level
        this.camera.lookAt(lookAtPoint);
    }
    
    // Fix touch events for game UI buttons
    fixGameButtonsForTouch() {
        // Add this method to fix all buttons in the game
        const fixButtonTouch = (buttonId) => {
            const button = document.getElementById(buttonId);
            if (button) {
                // Remove existing click listeners (if we can)
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // Add touch event listener
                newButton.addEventListener('touchstart', (event) => {
                    event.preventDefault();
                    // Simulate the Enter key press for level navigation
                    const enterKeyEvent = new KeyboardEvent('keydown', {
                        code: 'Enter',
                        key: 'Enter',
                        bubbles: true
                    });
                    document.dispatchEvent(enterKeyEvent);
                    
                    // Also trigger click for direct button handlers
                    newButton.click();
                });
            }
        };
        
        // Fix all game UI buttons
        const buttonIds = [
            'next-level-button',
            'retry-button',
            'close-instructions'
        ];
        
        // Add a slight delay to ensure all buttons are loaded
        setTimeout(() => {
            buttonIds.forEach(fixButtonTouch);
            console.log("Fixed touch events for game UI buttons");
        }, 1000);
        
        // Add mutation observer to fix any new buttons that appear
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.id && buttonIds.includes(node.id)) {
                            fixButtonTouch(node.id);
                        }
                    });
                }
            });
        });
        
        // Start observing the document body for added nodes
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Update method to be called in the game loop
    update() {
        if (!this.isMobile || !this.initialized) return;
        
        // Apply jump if jump button is pressed and player is on ground
        if (this.jumpButtonPressed) {
            // Set Space key state to true regardless of ground state
            // This allows the game's jump logic to handle the ground check
            this.gameState.keyStates['Space'] = true;
        } else {
            this.gameState.keyStates['Space'] = false;
        }
    }
}

// Create global instance
window.mobileControls = new MobileControls();

// Hook into the animation loop to update mobile controls
(function() {
    // Original animate function
    const originalAnimate = window.animate;
    
    // Override animate to include mobile controls update
    if (originalAnimate && window.mobileControls) {
        window.animate = function(currentTime) {
            // Call the original animate function
            const result = originalAnimate(currentTime);
            
            // Update mobile controls if enabled
            if (window.mobileControls.isMobile && window.mobileControls.initialized) {
                window.mobileControls.update();
            }
            
            return result;
        };
    }
})();