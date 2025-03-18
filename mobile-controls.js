// Mobile Controls for Red Panda Explorer - Fixed for iOS
class MobileControls {
    constructor(gameState) {
        console.log("Mobile controls: Constructor started");
        this.gameState = gameState;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isTouching = false;
        this.touchTime = 0;
        this.lastTapTime = 0;
        this.isMobile = false;
        this.mobileInstructionsCreated = false;
        this.controlsCreated = false;
        
        // Movement control variables
        this.moveDirection = { x: 0, z: 0 };
        this.dragThreshold = 20; // Minimum pixel distance to register as a drag
        this.maxDragDistance = 100; // Maximum drag distance for full speed
        
        // Wait for DOM to be fully ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            // DOM already loaded
            this.init();
        }
    }
    
    // Initialize everything after the DOM is ready
    init() {
        console.log("Mobile controls: Initializing...");
        
        // Add mobile styles first
        this.addMobileStyles();
        
        // Create UI elements
        this.createMobileInstructions();
        this.createJoystickUI();
        this.mobileInstructionsCreated = true;
        this.controlsCreated = true;
        
        // Detect if we're on mobile
        this.detectMobile();
        
        // Only if we're on mobile, set up the event listeners and disable default behaviors
        if (this.isMobile) {
            // Configure iOS-specific settings first
            this.configureIOSSettings();
            
            // Then init touch listeners
            this.initTouchListeners();
            
            // Make sure helper functions run after a short delay
            setTimeout(() => {
                this.updateControlsVisibility(true);
            }, 500);
        }
    }

    // Configure iOS-specific settings
    configureIOSSettings() {
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
        
        // Prevent document scrolling - iOS specific approach
        document.addEventListener('touchmove', function(e) {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Force body to fill the screen on iOS
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        document.body.style.overflow = 'hidden';
        
        console.log("Mobile controls: iOS-specific settings configured");
    }
    
    // Create a visual joystick UI for feedback
    createJoystickUI() {
        // Check if elements already exist first
        if (document.getElementById('mobile-joystick-container')) {
            console.log("Mobile controls: Joystick UI already exists");
            return;
        }
        
        console.log("Mobile controls: Creating joystick UI");
        
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
        
        console.log("Mobile controls: Joystick UI created");
    }
    
    // Create mobile-specific instructions
    createMobileInstructions() {
        // Check if the element already exists
        if (document.getElementById('mobile-instructions')) {
            console.log("Mobile controls: Mobile instructions already exist");
            return;
        }
        
        console.log("Mobile controls: Creating mobile instructions");
        
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
        
        // Add event listeners for mobile instruction buttons after a short delay
        setTimeout(() => {
            const closeButton = document.getElementById('close-mobile-instructions');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    const instructions = document.getElementById('mobile-instructions');
                    if (instructions) {
                        instructions.classList.add('hidden');
                        console.log("Mobile controls: Instructions closed via button");
                    }
                });
            }
            
            const startButton = document.getElementById('start-mobile-game');
            if (startButton) {
                startButton.addEventListener('click', () => {
                    const instructions = document.getElementById('mobile-instructions');
                    if (instructions) {
                        instructions.classList.add('hidden');
                        console.log("Mobile controls: Game started via button");
                    }
                });
            }
        }, 100);
        
        console.log("Mobile controls: Mobile instructions created");
    }
    
    // Update visibility of control elements
    updateControlsVisibility(show) {
        console.log(`Mobile controls: ${show ? 'Showing' : 'Hiding'} controls`);
        
        // Get all elements
        const mobileElements = document.querySelectorAll('.mobile-control-element');
        const mobileInstructions = document.getElementById('mobile-instructions');
        const standardInstructions = document.getElementById('instructions');
        
        if (show) {
            // Show mobile controls
            mobileElements.forEach(element => {
                element.classList.remove('hidden');
                console.log(`Mobile controls: Showed ${element.id}`);
            });
            
            // Position jump button
            const jumpButton = document.getElementById('mobile-jump-button');
            if (jumpButton) {
                jumpButton.style.right = '20px';
                jumpButton.style.bottom = '20px';
            }
            
            // Hide standard instructions
            if (standardInstructions) {
                standardInstructions.classList.add('hidden');
                console.log("Mobile controls: Standard instructions hidden");
            }
            
            // Show mobile instructions
            if (mobileInstructions) {
                mobileInstructions.classList.remove('hidden');
                console.log("Mobile controls: Mobile instructions shown");
            }
        } else {
            // Hide mobile controls
            mobileElements.forEach(element => {
                element.classList.add('hidden');
            });
            
            // Hide mobile instructions
            if (mobileInstructions) {
                mobileInstructions.classList.add('hidden');
            }
        }
    }
    
    // Initialize all touch event listeners
    initTouchListeners() {
        console.log("Mobile controls: Setting up touch listeners");
        
        // Touch start - initial contact
        document.addEventListener('touchstart', (e) => {
            // Don't prevent default on all touch events in iOS, only when needed
            // This allows proper button clicks to work
            
            // Don't process touches if:
            // 1. We're not on mobile
            // 2. Mobile instructions are showing
            // 3. Touch targets an interactive element like button
            if (!this.isMobile) return;
            
            const target = e.target;
            // Allow button touches to work normally
            if (target.tagName === 'BUTTON' || 
                target.id === 'close-mobile-instructions' || 
                target.id === 'start-mobile-game' ||
                target.id === 'mobile-jump-button') {
                return;
            }
            
            // Check if instructions are visible
            const mobileInstructions = document.getElementById('mobile-instructions');
            if (mobileInstructions && !mobileInstructions.classList.contains('hidden')) {
                return;
            }
            
            // Now we can prevent default for game movement
            e.preventDefault();
            
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
                        
                        // Log movement direction occasionally
                        if (Math.floor(Date.now() / 1000) % 3 === 0) {
                            console.log(`Mobile controls: Moving - Dir: (${this.moveDirection.x.toFixed(2)}, ${this.moveDirection.z.toFixed(2)}), Speed: ${speed.toFixed(2)}`);
                        }
                    }
                }
            } catch (error) {
                console.error("Mobile controls: Error during touch movement", error);
            }
        }, { passive: false });
        
        // Touch end - release touch
        document.addEventListener('touchend', (e) => {
            if (!this.isMobile) return;
            
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
        
        // Setup a dedicated jump button (more reliable than taps)
        setTimeout(() => {
            this.setupJumpButton();
        }, 200);
    }
    
    // Setup the jump button separately
    setupJumpButton() {
        const jumpButton = document.getElementById('mobile-jump-button');
        if (!jumpButton) {
            console.error("Mobile controls: Jump button not found");
            return;
        }
        
        // Clear existing listeners
        const newJumpButton = jumpButton.cloneNode(true);
        jumpButton.parentNode.replaceChild(newJumpButton, jumpButton);
        
        // Add new listeners
        newJumpButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this.isMobile) return;
            
            this.jump();
            newJumpButton.classList.add('active');
            console.log("Mobile controls: Jump button pressed");
            return false;
        }, { passive: false });
        
        newJumpButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this.isMobile) return;
            
            newJumpButton.classList.remove('active');
            return false;
        }, { passive: false });
        
        console.log("Mobile controls: Jump button set up");
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
                if (this.gameState) {
                    this.gameState.keyStates['Space'] = false;
                    console.log("Mobile controls: Jump key released");
                }
            }, 100);
        } catch (error) {
            console.error("Mobile controls: Error during jump", error);
        }
    }
    
    // Detect if the user is on a mobile device
    detectMobile() {
        // Test with multiple methods for better compatibility
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(userAgent);
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        
        this.isMobile = isIOS || isAndroid || isMobileUA || isTouchDevice;
        
        console.log("Mobile detection results:");
        console.log("- iOS:", isIOS);
        console.log("- Android:", isAndroid);
        console.log("- Mobile UA:", isMobileUA);
        console.log("- Touch device:", isTouchDevice);
        console.log("- FINAL RESULT:", this.isMobile);
        
        // Always apply iOS specific fixes if it's an iOS device
        if (isIOS) {
            console.log("Mobile controls: iOS-specific features enabled");
            // Add iOS specific class to body
            document.body.classList.add('ios-device');
        }
        
        // Update control visibility based on mobile detection
        if (this.mobileInstructionsCreated && this.controlsCreated) {
            this.updateControlsVisibility(this.isMobile);
        } else {
            console.log("Mobile controls: UI elements not yet created, will update visibility later");
        }
    }
    
    // Add mobile-specific styles
    addMobileStyles() {
        console.log("Mobile controls: Adding mobile styles");
        
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
                transform: translate(-50%, -50%);
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
                width: 90%;
                max-width: 400px;
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
    }
}

// Initialize mobile controls when the window is loaded
window.addEventListener('load', () => {
    console.log("Window loaded, initializing mobile controls");
    
    // Make sure gameState exists before initializing
    if (window.gameState) {
        window.mobileControls = new MobileControls(window.gameState);
    } else {
        // If gameState isn't available yet, wait for it with a retry mechanism
        let retries = 0;
        const MAX_RETRIES = 20;
        const checkGameState = setInterval(() => {
            retries++;
            if (window.gameState) {
                console.log(`Found gameState after ${retries} attempts`);
                window.mobileControls = new MobileControls(window.gameState);
                clearInterval(checkGameState);
            } else if (retries >= MAX_RETRIES) {
                console.error("Mobile controls: Failed to find gameState after 20 attempts");
                clearInterval(checkGameState);
            }
        }, 100);
    }
});