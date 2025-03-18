// Improved Mobile Controls for Red Panda Explorer
// This script detects mobile devices first, then only initializes mobile controls when needed

// Immediately detect if the user is on a mobile device
const isMobileDevice = (function() {
    // Test with multiple methods for better compatibility
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(userAgent);
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    
    // Return true if any condition matches
    return isIOS || isAndroid || isMobileUA || isTouchDevice;
})();

// Add body class immediately based on detection
if (isMobileDevice) {
    document.body.classList.add('mobile-device');
    
    // Add iOS specific class if needed
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        document.body.classList.add('ios-device');
    }
    
    console.log("Mobile device detected, enabling mobile controls");
}

// Add mobile styles to document head immediately
(function addMobileStyles() {
    if (!isMobileDevice) return;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* Fixed styles for iOS/mobile devices */
        html, body {
            position: fixed;
            width: 100%;
            height: 100%;
            overflow: hidden;
            -webkit-overflow-scrolling: none;
            overscroll-behavior: none;
            touch-action: none;
        }
        
        /* Mobile control styles with z-index higher than other elements */
        #mobile-joystick-container {
            position: fixed;
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background-color: rgba(132, 255, 239, 0.3);
            border: 3px solid #84ffef;
            z-index: 2000;
            touch-action: none;
            box-shadow: 0 0 15px rgba(132, 255, 239, 0.5);
            pointer-events: all;
        }
        
        #mobile-joystick-inner {
            position: absolute;
            width: 40px;
            height: 40px;
            background-color: rgba(255, 132, 223, 0.7);
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transform: translate(-20px, -20px);
            transform-origin: center center;
            box-shadow: 0 0 10px rgba(255, 132, 223, 0.7);
        }
        
        #mobile-jump-button {
            position: fixed;
            width: 90px;
            height: 90px;
            border-radius: 50%;
            background-color: rgba(162, 255, 132, 0.3);
            border: 3px solid #a2ff84;
            color: #a2ff84;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            line-height: 90px;
            z-index: 2000;
            touch-action: none;
            box-shadow: 0 0 15px rgba(162, 255, 132, 0.5);
            pointer-events: all;
            right: 20px;
            bottom: 20px;
        }
        
        #mobile-jump-button.active {
            background-color: rgba(162, 255, 132, 0.5);
            transform: scale(0.95);
        }
        
        /* Mobile instructions styles */
        #mobile-instructions {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            max-width: 80%;
            background-color: rgba(0, 0, 0, 0.8);
            color: #ff84df;
            padding: 20px;
            border: 3px solid #84ffef;
            border-radius: 5px;
            z-index: 3000;
            font-family: 'Courier New', monospace;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-align: center;
            box-shadow: 0 0 20px rgba(255, 132, 223, 0.6);
            backdrop-filter: blur(5px);
        }
        
        #mobile-instructions h3 {
            color: #ffee84;
            margin-top: 10px;
            margin-bottom: 20px;
            font-size: 24px;
        }
        
        #mobile-instructions p {
            margin: 10px 0;
            font-size: 16px;
        }
        
        .start-button {
            background-color: rgba(162, 255, 132, 0.2);
            color: #a2ff84;
            border: 2px solid #a2ff84;
            padding: 15px 30px;
            margin-top: 20px;
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 2px;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .start-button:hover, .start-button:active {
            background-color: rgba(162, 255, 132, 0.4);
            box-shadow: 0 0 15px rgba(162, 255, 132, 0.7);
        }
        
        /* iOS specific fixes */
        .ios-device .mobile-control-element,
        .ios-device #mobile-instructions {
            -webkit-transform: translateZ(0);
            transform: translateZ(0);
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
        }
        
        /* Disable text selection on mobile */
        .mobile-device * {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-tap-highlight-color: rgba(0,0,0,0);
        }
        
        /* Responsive adjustments for mobile */
        @media (max-width: 768px) {
            #instructions {
                display: none !important;
            }
            
            #fps-counter {
                font-size: 10px;
                padding: 3px;
                bottom: 3px;
                left: 3px;
            }
            
            .game-overlay-screen {
                max-width: 90%;
                padding: 15px;
            }
            
            #level-indicator {
                font-size: 14px;
                padding: 5px 10px;
                right: 5px;
                top: 5px;
            }
        }
    `;
    
    document.head.appendChild(styleElement);
})();

// Only initialize the MobileControls class if we're on a mobile device
if (isMobileDevice) {
    // Configure iOS-specific settings immediately
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        // Add iOS-specific viewport meta tag
        let metaViewport = document.querySelector('meta[name=viewport]');
        if (metaViewport) {
            metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
        } else {
            metaViewport = document.createElement('meta');
            metaViewport.name = 'viewport';
            metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
            document.head.appendChild(metaViewport);
        }
        
        // Prevent scrolling on iOS
        document.addEventListener('touchmove', function(e) {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && 
                e.target.tagName !== 'BUTTON') {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    // Mobile Controls class - only used on mobile devices
    class MobileControls {
        constructor() {
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.isTouching = false;
            this.touchTime = 0;
            this.lastTapTime = 0;
            
            // Movement control variables
            this.moveDirection = { x: 0, z: 0 };
            this.dragThreshold = 20; // Minimum pixel distance to register as a drag
            this.maxDragDistance = 100; // Maximum drag distance for full speed
            
            // Wait briefly to make sure game engine has initialized
            setTimeout(() => {
                this.createMobileControls();
                this.initTouchListeners();
                console.log("Mobile controls fully initialized");
                
                // Make sure the gameState is globally accessible for later use
                if (window.gameState) {
                    console.log("gameState found in window object");
                } else {
                    // Try to get it from the global scope
                    console.log("WARNING: gameState not found in window object - attempting to expose it");
                    window.gameState = gameState; // This makes gameState accessible globally
                }
            }, 500);
        }
        
        createMobileControls() {
            // Create mobile instructions if not already there
            if (!document.getElementById('mobile-instructions')) {
                const mobileInstructions = document.createElement('div');
                mobileInstructions.id = 'mobile-instructions';
                mobileInstructions.className = 'game-overlay-screen';
                
                mobileInstructions.innerHTML = `
                    <button id="close-mobile-instructions" class="close-button">&times;</button>
                    <h3>Red Panda Explorer 🐼</h3>
                    <p>👆 Drag anywhere to move your panda</p>
                    <p>👇 Tap screen to jump</p>
                    <p>🔘 Use jump button for precise jumps</p>
                    <p>🏁 Goal: Find the rainbow flag!</p>
                    <p class="instruction-last-para">Avoid the dark oil monsters!</p>
                    <button id="start-mobile-game" class="start-button">START GAME</button>
                `;
                
                document.body.appendChild(mobileInstructions);
                
                // Add event listeners
                const closeButton = document.getElementById('close-mobile-instructions');
                if (closeButton) {
                    closeButton.addEventListener('click', () => {
                        mobileInstructions.classList.add('hidden');
                    });
                }
                
                const startButton = document.getElementById('start-mobile-game');
                if (startButton) {
                    startButton.addEventListener('click', () => {
                        mobileInstructions.classList.add('hidden');
                    });
                }
            }
            
            // Create joystick UI if not already there
            if (!document.getElementById('mobile-joystick-container')) {
                // Outer container
                const joystickContainer = document.createElement('div');
                joystickContainer.id = 'mobile-joystick-container';
                joystickContainer.className = 'mobile-control-element hidden';
                
                // Inner joystick that will move
                const joystickInner = document.createElement('div');
                joystickInner.id = 'mobile-joystick-inner';
                
                // Add to DOM
                joystickContainer.appendChild(joystickInner);
                document.body.appendChild(joystickContainer);
            }
            
            // Create jump button if not already there
            if (!document.getElementById('mobile-jump-button')) {
                // Jump button
                const jumpButton = document.createElement('div');
                jumpButton.id = 'mobile-jump-button';
                jumpButton.className = 'mobile-control-element';
                jumpButton.innerText = 'JUMP';
                
                // Add to DOM
                document.body.appendChild(jumpButton);
                
                // Set up jump button handler
                jumpButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    this.jump();
                    jumpButton.classList.add('active');
                    return false;
                }, { passive: false });
                
                jumpButton.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    jumpButton.classList.remove('active');
                    return false;
                }, { passive: false });
            }
            
            // Hide standard instructions and show mobile instructions
            const standardInstructions = document.getElementById('instructions');
            if (standardInstructions) {
                standardInstructions.classList.add('hidden');
            }
        }
        
        initTouchListeners() {
            // Touch start - initial contact
            document.addEventListener('touchstart', (e) => {
                const target = e.target;
                
                // Allow button touches to work normally
                if (target.tagName === 'BUTTON' || 
                    target.id === 'close-mobile-instructions' || 
                    target.id === 'start-mobile-game' ||
                    target.id === 'mobile-jump-button' ||
                    target.id === 'retry-button' ||
                    target.id === 'next-level-button') {
                    return;
                }
                
                // Check if instructions are visible
                const mobileInstructions = document.getElementById('mobile-instructions');
                if (mobileInstructions && !mobileInstructions.classList.contains('hidden')) {
                    return;
                }
                
                // Prevent default for game movement
                e.preventDefault();
                
                // Is this a quick double tap? (for jumping)
                const now = Date.now();
                if (now - this.lastTapTime < 300) {
                    this.jump();
                    this.lastTapTime = 0; // Reset to prevent triple-tap
                    return;
                }
                this.lastTapTime = now;
                
                // Store starting position for drag calculation
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
                this.isTouching = true;
                this.touchTime = now;
                
                // Position the joystick at the touch point
                const joystickContainer = document.getElementById('mobile-joystick-container');
                if (joystickContainer) {
                    joystickContainer.style.left = `${this.touchStartX - 50}px`; // 50 is half the joystick width
                    joystickContainer.style.top = `${this.touchStartY - 50}px`;  // 50 is half the joystick height
                    joystickContainer.classList.remove('hidden');
                    
                    // Reset the inner joystick position
                    const joystickInner = document.getElementById('mobile-joystick-inner');
                    if (joystickInner) {
                        joystickInner.style.transform = 'translate(-20px, -20px)';
                    }
                }
            }, { passive: false });
            
            // Touch move - dragging motion
            document.addEventListener('touchmove', (e) => {
                if (!this.isTouching) return;
                
                try {
                    e.preventDefault(); // This is needed for drag to work
                    
                    const touchX = e.touches[0].clientX;
                    const touchY = e.touches[0].clientY;
                    
                    // Calculate the drag distance
                    const dragX = touchX - this.touchStartX;
                    const dragY = touchY - this.touchStartY;
                    const dragDistance = Math.sqrt(dragX * dragX + dragY * dragY);
                    
                    // Only register as a drag if it's beyond the threshold
                    if (dragDistance >= this.dragThreshold) {
                        // Calculate the normalized direction
                        const dragDirection = {
                            x: dragX / dragDistance,
                            y: dragY / dragDistance
                        };
                        
                        // Calculate movement speed based on drag distance
                        const speed = Math.min(dragDistance / this.maxDragDistance, 1.0);
                        
                        // Map drag direction to WASD controls
                        // Note: Z is forward/backward, X is left/right
                        this.moveDirection.z = -dragDirection.y * speed; // Invert Y since positive Y is down on screen
                        this.moveDirection.x = -dragDirection.x * speed; // Invert X to match WASD mapping
                        
                        // Update the gameState keys to simulate keyboard input
                        // Access gameState through multiple possible paths to ensure it works
                        if (window.gameState) {
                            console.log("Mobile move: x=" + this.moveDirection.x.toFixed(2) + ", z=" + this.moveDirection.z.toFixed(2));
                            
                            window.gameState.keyStates['KeyW'] = this.moveDirection.z > 0;
                            window.gameState.keyStates['KeyS'] = this.moveDirection.z < 0;
                            window.gameState.keyStates['KeyA'] = this.moveDirection.x > 0;
                            window.gameState.keyStates['KeyD'] = this.moveDirection.x < 0;
                            
                            // Force direct access to the keyStates object as well
                            // This ensures both access patterns work
                            if (typeof gameState !== 'undefined' && gameState.keyStates) {
                                gameState.keyStates['KeyW'] = this.moveDirection.z > 0;
                                gameState.keyStates['KeyS'] = this.moveDirection.z < 0;
                                gameState.keyStates['KeyA'] = this.moveDirection.x > 0;
                                gameState.keyStates['KeyD'] = this.moveDirection.x < 0;
                            }
                        } else if (typeof gameState !== 'undefined' && gameState.keyStates) {
                            console.log("Using direct gameState access");
                            gameState.keyStates['KeyW'] = this.moveDirection.z > 0;
                            gameState.keyStates['KeyS'] = this.moveDirection.z < 0;
                            gameState.keyStates['KeyA'] = this.moveDirection.x > 0;
                            gameState.keyStates['KeyD'] = this.moveDirection.x < 0;
                        } else {
                            console.error("No gameState access available!");
                        }
                        
                        // Visual feedback - move joystick inner component
                        const joystickInner = document.getElementById('mobile-joystick-inner');
                        if (joystickInner) {
                            // Limit the visual movement to the joystick bounds
                            const maxVisualMove = 35; // radius of joystick is 50, inner is 30, so 50-30/2 = 35 max
                            const visualX = dragDirection.x * Math.min(dragDistance, maxVisualMove);
                            const visualY = dragDirection.y * Math.min(dragDistance, maxVisualMove);
                            joystickInner.style.transform = `translate(${visualX - 20}px, ${visualY - 20}px)`;
                        }
                    }
                } catch (error) {
                    console.error("Mobile controls: Error during touch movement", error);
                }
            }, { passive: false });
            
            // Touch end - release touch
            document.addEventListener('touchend', (e) => {
                try {
                    // Only prevent default if we were actually dragging
                    if (this.isTouching) {
                        e.preventDefault();
                    }
                    
                    // Check if this was a tap (short duration, little movement)
                    if (this.isTouching) {
                        const touchDuration = Date.now() - this.touchTime;
                        if (touchDuration < 200) {
                            // This is a quick tap, trigger jump
                            this.jump();
                        }
                    }
                    
                    // Reset all states
                    this.isTouching = false;
                    this.moveDirection.x = 0;
                    this.moveDirection.z = 0;
                    
                    // Reset the keyboard simulation
                    if (window.gameState) {
                        window.gameState.keyStates['KeyW'] = false;
                        window.gameState.keyStates['KeyS'] = false;
                        window.gameState.keyStates['KeyA'] = false;
                        window.gameState.keyStates['KeyD'] = false;
                    }
                    
                    // Hide the joystick
                    const joystickContainer = document.getElementById('mobile-joystick-container');
                    if (joystickContainer) {
                        joystickContainer.classList.add('hidden');
                    }
                } catch (error) {
                    console.error("Mobile controls: Error during touch end", error);
                }
            }, { passive: false });
        }
        
        jump() {
            try {
                if (window.gameState) {
                    window.gameState.keyStates['Space'] = true;
                    
                    // Reset the space key after a short delay
                    setTimeout(() => {
                        if (window.gameState) {
                            window.gameState.keyStates['Space'] = false;
                        }
                    }, 100);
                }
            } catch (error) {
                console.error("Mobile controls: Error during jump", error);
            }
        }
    }

    // Try to initialize mobile controls when DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.mobileControls = new MobileControls();
        });
    } else {
        // DOM already loaded, initialize now
        window.mobileControls = new MobileControls();
    }
}

// We need to make the game state globally accessible for mobile controls to work
// Add a fix to ensure gameState is properly exposed to the window object
window.addEventListener('load', function() {
    // Wait briefly to make sure game has initialized
    setTimeout(function() {
        // Ensure gameState is accessible globally
        if (typeof gameState !== 'undefined' && !window.gameState) {
            window.gameState = gameState;
            console.log("Exposed gameState to window object");
        }
        
        // Create a hook into the game's update loop to monitor control activity
        if (window.gameState) {
            // Save the original updatePlayerPosition function
            const originalUpdateFn = window.updatePlayerPosition || window.gameState.updatePlayerPosition;
            
            // If we find the function, hook into it to verify mobile controls
            if (typeof originalUpdateFn === 'function') {
                window.updatePlayerPosition = function(deltaTime) {
                    // Log active control keys occasionally for debugging
                    if (Math.random() < 0.01) { // Only log ~1% of the time to avoid spam
                        const activeKeys = [];
                        if (window.gameState.keyStates['KeyW']) activeKeys.push('W');
                        if (window.gameState.keyStates['KeyS']) activeKeys.push('S');
                        if (window.gameState.keyStates['KeyA']) activeKeys.push('A');
                        if (window.gameState.keyStates['KeyD']) activeKeys.push('D');
                        if (activeKeys.length > 0) {
                            console.log("Active keys: " + activeKeys.join(','));
                        }
                    }
                    
                    // Call the original function
                    return originalUpdateFn(deltaTime);
                };
                console.log("Hooked into game update function for mobile diagnostics");
            }
        }
    }, 1000);
});

// Make resetGame function available globally so that mobile controls can access it
window.resetGame = function() {
    if (window.gameState) {
        // Reset game over state
        window.gameState.gameOver = false;
        
        // Reset player position
        if (window.player) {
            window.player.position.set(0, 50, 0);
        }
        window.gameState.playerVelocity.set(0, 0, 0);
        window.gameState.goalReached = false;
        
        // Hide all UI messages
        document.getElementById('goal-message').style.display = 'none';
        
        // If level system exists, reset current level
        if (window.gameState.levelSystem) {
            window.gameState.levelSystem.applyLevelSettings(window.gameState.levelSystem.currentLevel);
        }
        
        // Reset enemy manager
        if (window.gameState.enemyManager) {
            window.gameState.enemyManager.reset();
        }
        
        // Restart animation loop if it was cancelled
        if (!window.gameState.animationId) {
            window.lastTime = performance.now();
            window.gameState.animationId = requestAnimationFrame(window.animate);
        }
    }
};