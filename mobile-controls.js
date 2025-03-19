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
        setTimeout(() => {
            this.fixGameButtonsForTouch();
        }, 1000);
    }
    
    // Handle touch start event
    handleTouchStart(event) {
        // Ignore if it's a touch on the jump button or any UI button
        if (event.target.id === 'mobile-jump-button' || 
            event.target.tagName.toLowerCase() === 'button') {
            return;
        }
        
        // Get the first touch
        const touch = event.touches[0];
        
        this.touchActive = true;
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchCurrentX = touch.clientX;
        this.touchCurrentY = touch.clientY;
        
        // Prevent default scrolling behavior only if not on a button or input
        if (event.cancelable && 
            !['BUTTON', 'INPUT', 'A'].includes(event.target.tagName)) {
            event.preventDefault();
        }
    }
    
    // Handle touch move event
    handleTouchMove(event) {
        // Ignore if touch isn't active or it's on jump button or UI button
        if (!this.touchActive || 
            event.target.id === 'mobile-jump-button' || 
            event.target.tagName.toLowerCase() === 'button') {
            return;
        }
        
        // Get the first touch
        const touch = event.touches[0];
        
        this.touchCurrentX = touch.clientX;
        this.touchCurrentY = touch.clientY;
        
        // Update movement direction based on touch delta
        if (this.gameState) {
            this.updateMovementFromTouch();
        }
        
        // Prevent default scrolling behavior only if not on a button or input
        if (event.cancelable && 
            !['BUTTON', 'INPUT', 'A'].includes(event.target.tagName)) {
            event.preventDefault();
        }
    }
    
    // Handle touch end event
    handleTouchEnd(event) {
        // Ignore if it's a touch on the jump button or UI button
        if (event.target.id === 'mobile-jump-button' || 
            event.target.tagName.toLowerCase() === 'button') {
            return;
        }
        
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
                
                // Wait a moment before overriding camera to ensure game is fully initialized
                setTimeout(() => {
                    // Override the camera update function for mobile
                    this.overrideCameraUpdate();
                    console.log("Mobile controls connected to game");
                }, 2000);
                
                // Clear the connection timer
                clearInterval(this.connectToGameTimer);
            }
        }
    }
    
    // Override the camera update function to keep camera behind player
    overrideCameraUpdate() {
        if (this.cameraUpdateModified) return;
        
        // We'll only set up a hook for the updateCamera function,
        // but we won't replace it entirely to ensure gravity works properly
        
        // Store original updateCamera reference 
        const originalUpdateCamera = window.updateCamera;
        
        if (typeof originalUpdateCamera === 'function') {
            window.updateCamera = () => {
                // Call original camera update to preserve game physics
                originalUpdateCamera();
                
                // If on mobile and player has reached the ground, apply our camera adjustment
                if (this.isMobile && this.player && this.camera && 
                    this.gameState && this.gameState.playerOnGround) {
                    this.adjustMobileCamera();
                }
            };
            
            this.cameraUpdateModified = true;
            console.log("Camera update function overridden for mobile");
        } else {
            console.warn("Could not find updateCamera function");
        }
    }
    
    // Adjust camera position for mobile without completely replacing the original function
    adjustMobileCamera() {
        // Only adjust horizontal position to keep behind player
        if (!this.camera || !this.player) return;
        
        // Get player's forward direction
        const playerForward = new THREE.Vector3(0, 0, 1);
        playerForward.applyQuaternion(this.player.quaternion);
        playerForward.normalize();
        
        // Gradually rotate cameraAngleHorizontal to match player orientation
        if (window.cameraAngleHorizontal !== undefined) {
            // Calculate target angle based on player direction
            const targetAngle = Math.atan2(playerForward.x, playerForward.z);
            
            // Smoothly interpolate current camera angle to target angle
            const angleDiff = targetAngle - window.cameraAngleHorizontal;
            
            // Handle angle wrapping
            let shortestAngleDiff = angleDiff;
            if (angleDiff > Math.PI) shortestAngleDiff = angleDiff - 2 * Math.PI;
            if (angleDiff < -Math.PI) shortestAngleDiff = angleDiff + 2 * Math.PI;
            
            // Gradually adjust camera angle
            window.cameraAngleHorizontal += shortestAngleDiff * 0.1;
        }
    }
    
    // Fix touch events for game UI buttons
    fixGameButtonsForTouch() {
        // Get all buttons in the game
        const buttons = document.querySelectorAll('button');
        
        buttons.forEach(button => {
            // Add touch event listener
            button.addEventListener('touchstart', (event) => {
                // Don't prevent default here to allow the click to go through
                
                // For specific navigation buttons, also trigger the Enter key
                if (['next-level-button', 'retry-button', 'close-instructions'].includes(button.id)) {
                    setTimeout(() => {
                        // Simulate the Enter key press for level navigation
                        const enterKeyEvent = new KeyboardEvent('keydown', {
                            code: 'Enter',
                            key: 'Enter',
                            bubbles: true
                        });
                        document.dispatchEvent(enterKeyEvent);
                    }, 100);
                }
            });
        });
        
        // Set up a mutation observer to handle dynamically added buttons
        this.setupButtonObserver();
    }
    
    // Set up mutation observer for dynamically added buttons
    setupButtonObserver() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // ELEMENT_NODE
                            // Check for buttons within the added node
                            const buttons = node.querySelectorAll ? node.querySelectorAll('button') : [];
                            buttons.forEach(button => {
                                button.addEventListener('touchstart', (event) => {
                                    // For specific navigation buttons
                                    if (['next-level-button', 'retry-button', 'close-instructions'].includes(button.id)) {
                                        setTimeout(() => {
                                            const enterKeyEvent = new KeyboardEvent('keydown', {
                                                code: 'Enter',
                                                key: 'Enter',
                                                bubbles: true
                                            });
                                            document.dispatchEvent(enterKeyEvent);
                                        }, 100);
                                    }
                                });
                            });
                        }
                    });
                }
            });
        });
        
        // Start observing the document body
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Update method to be called in the game loop
    update() {
        if (!this.isMobile || !this.initialized) return;
        
        // Apply jump if jump button is pressed
        if (this.jumpButtonPressed) {
            this.gameState.keyStates['Space'] = true;
        } else {
            this.gameState.keyStates['Space'] = false;
        }
    }
}

// Wait for DOM content to be loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.mobileControls = new MobileControls();
});

// Create a small, non-invasive hook into the animation loop
(function() {
    // Wait for the game to initialize
    const hookInterval = setInterval(() => {
        // Check if animate function exists
        if (typeof window.animate === 'function' && window.mobileControls) {
            // Original animate function
            const originalAnimate = window.animate;
            
            // Override animate to include mobile controls update
            window.animate = function(currentTime) {
                // Call the original animate function first to ensure game physics work
                const result = originalAnimate(currentTime);
                
                // Update mobile controls if enabled
                if (window.mobileControls.isMobile && window.mobileControls.initialized) {
                    window.mobileControls.update();
                }
                
                return result;
            };
            
            clearInterval(hookInterval);
            console.log("Animation loop hooked for mobile controls");
        }
    }, 500);
    
    // Clear interval after 10 seconds if hook fails
    setTimeout(() => clearInterval(hookInterval), 10000);
})();