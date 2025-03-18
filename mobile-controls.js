// Mobile Controls for Red Panda Explorer
class MobileControls {
    constructor(gameState) {
        this.gameState = gameState;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isTouching = false;
        this.touchTime = 0;
        this.lastTapTime = 0;
        this.isMobile = false;
        
        // Movement control variables
        this.moveDirection = { x: 0, z: 0 };
        this.dragThreshold = 20; // Minimum pixel distance to register as a drag
        this.maxDragDistance = 100; // Maximum drag distance for full speed
        
        console.log("Mobile controls: Initializing...");
        
        // Disable default touch behaviors
        this.disableDefaultTouchBehavior();
        
        // Create joystick container for visual feedback
        this.createJoystickUI();
        
        // Create mobile-specific instructions
        this.createMobileInstructions();
        
        // Initialize touch event listeners
        this.initTouchListeners();

        // Detect if we're on mobile and show/hide controls appropriately
        this.detectMobile();
    }
    
    // Create a visual joystick UI for feedback
    createJoystickUI() {
        // Outer container
        const joystickContainer = document.createElement('div');
        joystickContainer.id = 'mobile-joystick-container';
        joystickContainer.className = 'mobile-control-element hidden';
        
        // Inner joystick that will move
        const joystickInner = document.createElement('div');
        joystickInner.id = 'mobile-joystick-inner';
        
        // Jump button
        const jumpButton = document.createElement('div');
        jumpButton.id = 'mobile-jump-button';
        jumpButton.className = 'mobile-control-element hidden';
        jumpButton.innerText = 'JUMP';
        
        // Add to DOM
        joystickContainer.appendChild(joystickInner);
        document.body.appendChild(joystickContainer);
        document.body.appendChild(jumpButton);
    }
    
    // Initialize all touch event listeners
    initTouchListeners() {
        // Touch start - initial contact
        document.addEventListener('touchstart', (e) => {
            // Prevent default to avoid browser actions like scrolling
            e.preventDefault();
            
            // Don't process touches if mobile instructions are showing
            if (!this.isMobile || 
                (!document.getElementById('mobile-instructions').classList.contains('hidden'))) {
                return;
            }
            
            console.log("Mobile controls: Touch detected");
            
            // Is this a quick double tap? (for jumping)
            const now = Date.now();
            if (now - this.lastTapTime < 300) {
                this.jump();
                console.log("Mobile controls: Double-tap jump triggered");
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
                    joystickInner.style.transform = 'translate(0px, 0px)';
                } else {
                    console.error("Mobile controls: Failed to find joystick inner element");
                }
            } else {
                console.error("Mobile controls: Failed to find joystick container element");
            }
        }, { passive: false });
        
        // Touch move - dragging motion
        document.addEventListener('touchmove', (e) => {
            if (!this.isTouching || !this.isMobile) return;
            e.preventDefault();
            
            try {
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
                    this.gameState.keyStates['KeyW'] = this.moveDirection.z > 0;
                    this.gameState.keyStates['KeyS'] = this.moveDirection.z < 0;
                    this.gameState.keyStates['KeyA'] = this.moveDirection.x > 0;
                    this.gameState.keyStates['KeyD'] = this.moveDirection.x < 0;
                    
                    // Visual feedback - move joystick inner component
                    const joystickInner = document.getElementById('mobile-joystick-inner');
                    if (joystickInner) {
                        // Limit the visual movement to the joystick bounds
                        const maxVisualMove = 35; // radius of joystick is 50, inner is 30, so 50-30/2 = 35 max
                        const visualX = dragDirection.x * Math.min(dragDistance, maxVisualMove);
                        const visualY = dragDirection.y * Math.min(dragDistance, maxVisualMove);
                        joystickInner.style.transform = `translate(${visualX}px, ${visualY}px)`;
                        
                        // Log movement direction and intensity once per second (to avoid flooding console)
                        if (Math.floor(Date.now() / 1000) % 3 === 0) {
                            console.log(`Mobile controls: Moving - Direction: (${this.moveDirection.x.toFixed(2)}, ${this.moveDirection.z.toFixed(2)}), Speed: ${speed.toFixed(2)}`);
                        }
                    } else {
                        console.error("Mobile controls: Failed to find joystick inner element during drag");
                    }
                }
            } catch (error) {
                console.error("Mobile controls: Error during touch movement", error);
            }
        }, { passive: false });
        
        // Touch end - release touch
        document.addEventListener('touchend', (e) => {
            if (!this.isMobile) return;
            e.preventDefault();
            
            try {
                // Check if this was a tap (short duration, little movement)
                if (this.isTouching) {
                    const touchDuration = Date.now() - this.touchTime;
                    if (touchDuration < 200) {
                        // This is a quick tap, trigger jump
                        this.jump();
                        console.log("Mobile controls: Tap jump triggered");
                    }
                }
                
                // Reset all states
                this.isTouching = false;
                this.moveDirection.x = 0;
                this.moveDirection.z = 0;
                
                // Reset the keyboard simulation
                this.gameState.keyStates['KeyW'] = false;
                this.gameState.keyStates['KeyS'] = false;
                this.gameState.keyStates['KeyA'] = false;
                this.gameState.keyStates['KeyD'] = false;
                
                // Hide the joystick
                const joystickContainer = document.getElementById('mobile-joystick-container');
                if (joystickContainer) {
                    joystickContainer.classList.add('hidden');
                }
                
                console.log("Mobile controls: Touch released, movement stopped");
            } catch (error) {
                console.error("Mobile controls: Error during touch end", error);
            }
        }, { passive: false });
        
        // Dedicated jump button event
        const jumpButton = document.getElementById('mobile-jump-button');
        if (jumpButton) {
            jumpButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (!this.isMobile) return;
                
                this.jump();
                jumpButton.classList.add('active');
                console.log("Mobile controls: Jump button pressed");
            }, { passive: false });
            
            jumpButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (!this.isMobile) return;
                
                jumpButton.classList.remove('active');
            }, { passive: false });
        } else {
            console.error("Mobile controls: Failed to find jump button element");
        }
    }
    
    // Jump function
    jump() {
        try {
            if (!this.gameState) {
                console.error("Mobile controls: GameState not available for jump");
                return;
            }
            
            this.gameState.keyStates['Space'] = true;
            console.log("Mobile controls: Jump initiated");
            
            // Reset the space key after a short delay
            setTimeout(() => {
                this.gameState.keyStates['Space'] = false;
                console.log("Mobile controls: Jump key released");
            }, 100);
        } catch (error) {
            console.error("Mobile controls: Error during jump", error);
        }
    }
    
    // Handle camera rotation via touch
    initCameraControls() {
        // We use a two-finger touch for camera rotation
        let initialTouchDistance = 0;
        let initialCameraAngle = 0;
        
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                
                // Calculate the initial distance between touches
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                initialTouchDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                
                // Store the current camera angle
                initialCameraAngle = this.gameState.cameraAngleHorizontal || 0;
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                
                // Calculate current touch distance
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentTouchDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                
                // Calculate rotation based on the change in finger positioning
                const touchCenter1 = {
                    x: (touch1.clientX + touch2.clientX) / 2,
                    y: (touch1.clientY + touch2.clientY) / 2
                };
                
                // Get the angle of the line between the two touches
                const angle = Math.atan2(
                    touch2.clientY - touch1.clientY,
                    touch2.clientX - touch1.clientX
                );
                
                // Rotate camera based on the change in angle
                // Adjust sensitivity as needed
                this.gameState.cameraAngleHorizontal = initialCameraAngle + (angle * 0.5);
            }
        });
    }
    
    // Disable default touch behaviors like pinch zoom, text selection, etc.
    disableDefaultTouchBehavior() {
        // Prevent touchmove from scrolling the page
        document.addEventListener('touchmove', function(e) {
            e.preventDefault();
        }, { passive: false });
        
        // Prevent touch delay on mobile devices
        document.addEventListener('touchstart', function(e) {
            e.preventDefault();
        }, { passive: false });
        
        // Disable context menu (long press)
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });
        
        // Add meta viewport settings to prevent zooming
        const metaViewport = document.querySelector('meta[name=viewport]');
        if (metaViewport) {
            metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        } else {
            const meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.getElementsByTagName('head')[0].appendChild(meta);
        }
        
        console.log("Mobile controls: Default touch behaviors disabled");
    }
    
    // Create mobile-specific instructions
    createMobileInstructions() {
        const mobileInstructions = document.createElement('div');
        mobileInstructions.id = 'mobile-instructions';
        mobileInstructions.className = 'game-overlay-screen hidden';
        
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
        
        // Add event listeners for mobile instruction buttons
        document.getElementById('close-mobile-instructions').addEventListener('click', () => {
            document.getElementById('mobile-instructions').classList.add('hidden');
            console.log("Mobile controls: Instructions closed via button");
        });
        
        document.getElementById('start-mobile-game').addEventListener('click', () => {
            document.getElementById('mobile-instructions').classList.add('hidden');
            console.log("Mobile controls: Game started via button");
        });
        
        console.log("Mobile controls: Mobile-specific instructions created");
    }
    
    // Detect if the user is on a mobile device
    detectMobile() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (this.isMobile) {
            console.log("Mobile controls: Mobile device detected");
            
            // Show mobile controls
            const mobileElements = document.querySelectorAll('.mobile-control-element');
            mobileElements.forEach(element => {
                element.classList.remove('hidden');
            });
            
            // Position jump button
            const jumpButton = document.getElementById('mobile-jump-button');
            jumpButton.style.right = '20px';
            jumpButton.style.bottom = '20px';
            
            // Hide standard instructions and show mobile instructions
            const standardInstructions = document.getElementById('instructions');
            if (standardInstructions) {
                standardInstructions.classList.add('hidden');
                console.log("Mobile controls: Standard instructions hidden");
            }
            
            // Show mobile-specific instructions
            const mobileInstructions = document.getElementById('mobile-instructions');
            if (mobileInstructions) {
                mobileInstructions.classList.remove('hidden');
                console.log("Mobile controls: Mobile instructions shown");
            } else {
                console.error("Mobile controls: Failed to find mobile instructions element");
            }
        } else {
            console.log("Mobile controls: Not a mobile device, controls hidden");
        }
    }
}

// Initialize mobile controls when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make sure gameState exists before initializing
    if (window.gameState) {
        window.mobileControls = new MobileControls(window.gameState);
    } else {
        // If gameState isn't available yet, wait for it
        const checkGameState = setInterval(() => {
            if (window.gameState) {
                window.mobileControls = new MobileControls(window.gameState);
                clearInterval(checkGameState);
            }
        }, 100);
    }
});

// Add mobile-specific styles
function addMobileStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* Mobile control styles */
        #mobile-joystick-container {
            position: fixed;
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background-color: rgba(132, 255, 239, 0.2);
            border: 2px solid #84ffef;
            z-index: 1000;
            touch-action: none;
            box-shadow: 0 0 15px rgba(132, 255, 239, 0.5);
        }
        
        #mobile-joystick-inner {
            position: absolute;
            width: 30px;
            height: 30px;
            background-color: rgba(255, 132, 223, 0.6);
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            transform-origin: center center;
            box-shadow: 0 0 10px rgba(255, 132, 223, 0.7);
        }
        
        #mobile-jump-button {
            position: fixed;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background-color: rgba(162, 255, 132, 0.2);
            border: 2px solid #a2ff84;
            color: #a2ff84;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            text-align: center;
            line-height: 80px;
            z-index: 1000;
            touch-action: none;
            box-shadow: 0 0 15px rgba(162, 255, 132, 0.5);
        }
        
        #mobile-jump-button.active {
            background-color: rgba(162, 255, 132, 0.4);
            transform: scale(0.95);
        }
        
        /* Mobile instructions styles */
        #mobile-instructions {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 400px;
            background-color: rgba(0, 0, 0, 0.8);
            color: #ff84df;
            padding: 20px;
            border: 2px solid #84ffef;
            border-radius: 5px;
            z-index: 2000;
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
        }
        
        #mobile-instructions p {
            margin: 10px 0;
        }
        
        .start-button {
            background-color: rgba(162, 255, 132, 0.2);
            color: #a2ff84;
            border: 2px solid #a2ff84;
            padding: 10px 20px;
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
        
        /* Disable text selection on mobile */
        * {
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
            html, body {
                overflow: hidden;
                position: fixed;
                width: 100%;
                height: 100%;
            }
            
            #instructions {
                max-width: 80%;
                font-size: 14px;
            }
            
            .game-overlay-screen {
                max-width: 90%;
                padding: 15px;
            }
            
            #level-indicator {
                font-size: 14px;
                padding: 8px 12px;
            }
        }
    `;
    
    document.head.appendChild(styleElement);
    console.log("Mobile controls: Mobile styles added");
}

// Add the styles when loaded
document.addEventListener('DOMContentLoaded', addMobileStyles);