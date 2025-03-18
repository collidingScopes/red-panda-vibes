// Mobile Controls for Red Panda Explorer
class MobileControls {
    constructor(gameState) {
        this.gameState = gameState;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isTouching = false;
        this.touchTime = 0;
        this.lastTapTime = 0;
        
        // Movement control variables
        this.moveDirection = { x: 0, z: 0 };
        this.dragThreshold = 20; // Minimum pixel distance to register as a drag
        this.maxDragDistance = 100; // Maximum drag distance for full speed
        
        // Create joystick container for visual feedback
        this.createJoystickUI();
        
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
            
            // Is this a quick double tap? (for jumping)
            const now = Date.now();
            if (now - this.lastTapTime < 300) {
                this.jump();
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
            joystickContainer.style.left = `${this.touchStartX - 50}px`; // 50 is half the joystick width
            joystickContainer.style.top = `${this.touchStartY - 50}px`;  // 50 is half the joystick height
            joystickContainer.classList.remove('hidden');
            
            // Reset the inner joystick position
            const joystickInner = document.getElementById('mobile-joystick-inner');
            joystickInner.style.transform = 'translate(0px, 0px)';
        });
        
        // Touch move - dragging motion
        document.addEventListener('touchmove', (e) => {
            if (!this.isTouching) return;
            e.preventDefault();
            
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
                // Limit the visual movement to the joystick bounds
                const maxVisualMove = 35; // radius of joystick is 50, inner is 30, so 50-30/2 = 35 max
                const visualX = dragDirection.x * Math.min(dragDistance, maxVisualMove);
                const visualY = dragDirection.y * Math.min(dragDistance, maxVisualMove);
                joystickInner.style.transform = `translate(${visualX}px, ${visualY}px)`;
            }
        });
        
        // Touch end - release touch
        document.addEventListener('touchend', (e) => {
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
            this.gameState.keyStates['KeyW'] = false;
            this.gameState.keyStates['KeyS'] = false;
            this.gameState.keyStates['KeyA'] = false;
            this.gameState.keyStates['KeyD'] = false;
            
            // Hide the joystick
            document.getElementById('mobile-joystick-container').classList.add('hidden');
        });
        
        // Dedicated jump button event
        document.getElementById('mobile-jump-button').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.jump();
            document.getElementById('mobile-jump-button').classList.add('active');
        });
        
        document.getElementById('mobile-jump-button').addEventListener('touchend', (e) => {
            e.preventDefault();
            document.getElementById('mobile-jump-button').classList.remove('active');
        });
    }
    
    // Jump function
    jump() {
        this.gameState.keyStates['Space'] = true;
        
        // Reset the space key after a short delay
        setTimeout(() => {
            this.gameState.keyStates['Space'] = false;
        }, 100);
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
    
    // Detect if the user is on a mobile device
    detectMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Show mobile controls
            const mobileElements = document.querySelectorAll('.mobile-control-element');
            mobileElements.forEach(element => {
                element.classList.remove('hidden');
            });
            
            // Position jump button
            const jumpButton = document.getElementById('mobile-jump-button');
            jumpButton.style.right = '20px';
            jumpButton.style.bottom = '20px';
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
        
        /* Responsive adjustments for mobile */
        @media (max-width: 768px) {
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
}

// Add the styles when loaded
document.addEventListener('DOMContentLoaded', addMobileStyles);