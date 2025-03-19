// Redesigned Mobile Controls for Red Panda Explorer
// This version implements an auto-runner style gameplay for mobile devices
// where the panda moves forward automatically and touch controls steering

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
    
    console.log("Mobile device detected, enabling auto-runner mobile controls");
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
        #mobile-control-area {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1500; 
            touch-action: none;
            background-color: transparent;
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
        
        #mobile-speed-toggle {
            position: fixed;
            width: 90px;
            height: 90px;
            border-radius: 50%;
            background-color: rgba(255, 132, 223, 0.3);
            border: 3px solid #ff84df;
            color: #ff84df;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            line-height: 90px;
            z-index: 2000;
            touch-action: none;
            box-shadow: 0 0 15px rgba(255, 132, 223, 0.5);
            pointer-events: all;
            left: 20px;
            bottom: 20px;
        }
        
        #mobile-speed-toggle.active {
            background-color: rgba(255, 132, 223, 0.5);
        }
        
        #touch-indicator {
            position: fixed;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: rgba(132, 255, 239, 0.6);
            pointer-events: none;
            z-index: 2500;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 10px rgba(132, 255, 239, 0.5);
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        /* Speed meter */
        #speed-meter {
            position: fixed;
            top: 45px;
            left: 10px;
            background-color: rgba(0, 0, 0, 0.5);
            color: #84ffef;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 12px;
            font-family: 'Courier New', monospace;
            z-index: 1000;
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

// Only initialize the AutoRunnerControls class if we're on a mobile device
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
    
    // Auto-Runner Mobile Controls class
    class AutoRunnerControls {
        constructor() {
            // Auto-runner settings
            this.autoRunEnabled = true;
            this.baseRunSpeed = 4.0; // Base forward speed
            this.currentRunSpeed = this.baseRunSpeed;
            this.maxRunSpeed = 8.0; // Maximum forward speed
            this.steeringEnabled = true;
            
            // Touch control variables
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.currentTouchX = 0;
            this.currentTouchY = 0;
            this.isTouching = false;
            this.touchTime = 0;
            this.lastTapTime = 0;
            
            // Steering control variables
            this.steeringDirection = 0; // -1 to 1, where 0 is straight ahead
            this.steeringSensitivity = 0.7; // How responsive steering is
            this.steeringDeadzone = 0.1; // Minimum steering input needed
            
            // Movement state
            this.isJumping = false;
            this.forwardVector = new THREE.Vector3(0, 0, 1); // Initial forward direction
            this.targetDirection = new THREE.Vector3(0, 0, 1); // Direction to steer towards
            
            // Wait briefly to make sure game engine has initialized
            setTimeout(() => {
                this.createMobileControls();
                this.initTouchListeners();
                this.setupGameStatePatching();
                console.log("Auto-runner mobile controls fully initialized");
                
                // Make sure the gameState is globally accessible
                if (window.gameState) {
                    console.log("gameState found in window object");
                } else {
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
                    <p>🏃‍♂️ Your panda runs automatically</p>
                    <p>👆 Touch & drag to steer</p>
                    <p>👇 Tap screen to jump</p>
                    <p>🔘 Use jump button for precise jumps</p>
                    <p>🔄 Use speed button to toggle speed</p>
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
            
            // Create full-screen touch area
            if (!document.getElementById('mobile-control-area')) {
                const touchArea = document.createElement('div');
                touchArea.id = 'mobile-control-area';
                document.body.appendChild(touchArea);
            }
            
            // Create touch indicator
            if (!document.getElementById('touch-indicator')) {
                const touchIndicator = document.createElement('div');
                touchIndicator.id = 'touch-indicator';
                document.body.appendChild(touchIndicator);
            }
            
            // Create jump button if not already there
            if (!document.getElementById('mobile-jump-button')) {
                const jumpButton = document.createElement('div');
                jumpButton.id = 'mobile-jump-button';
                jumpButton.className = 'mobile-control-element';
                jumpButton.innerText = 'JUMP';
                
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
            
            // Create speed toggle button
            if (!document.getElementById('mobile-speed-toggle')) {
                const speedToggle = document.createElement('div');
                speedToggle.id = 'mobile-speed-toggle';
                speedToggle.className = 'mobile-control-element';
                speedToggle.innerText = 'SPEED';
                
                document.body.appendChild(speedToggle);
                
                // Set up speed toggle handler
                speedToggle.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    this.toggleRunSpeed();
                    speedToggle.classList.add('active');
                    return false;
                }, { passive: false });
                
                speedToggle.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    speedToggle.classList.remove('active');
                    return false;
                }, { passive: false });
            }
            
            // Create speed meter
            if (!document.getElementById('speed-meter')) {
                const speedMeter = document.createElement('div');
                speedMeter.id = 'speed-meter';
                speedMeter.innerText = 'SPEED: NORMAL';
                document.body.appendChild(speedMeter);
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
                    target.id === 'mobile-speed-toggle' ||
                    target.id === 'retry-button' ||
                    target.id === 'next-level-button') {
                    return;
                }
                
                // Check if instructions are visible
                const mobileInstructions = document.getElementById('mobile-instructions');
                if (mobileInstructions && !mobileInstructions.classList.contains('hidden')) {
                    return;
                }
                
                // Prevent default for game steering
                e.preventDefault();
                
                // Is this a quick double tap? (for jumping)
                const now = Date.now();
                if (now - this.lastTapTime < 300) {
                    this.jump();
                    this.lastTapTime = 0; // Reset to prevent triple-tap
                    return;
                }
                this.lastTapTime = now;
                
                // Store starting position for steering calculation
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
                this.currentTouchX = this.touchStartX;
                this.currentTouchY = this.touchStartY;
                this.isTouching = true;
                this.touchTime = now;
                
                // Show touch indicator at touch point
                const touchIndicator = document.getElementById('touch-indicator');
                if (touchIndicator) {
                    touchIndicator.style.left = `${this.touchStartX}px`;
                    touchIndicator.style.top = `${this.touchStartY}px`;
                    touchIndicator.style.opacity = '1';
                }
                
            }, { passive: false });
            
            // Touch move - steering
            document.addEventListener('touchmove', (e) => {
                if (!this.isTouching || !this.steeringEnabled) return;
                
                try {
                    e.preventDefault(); // Prevent scrolling
                    
                    const touchX = e.touches[0].clientX;
                    const touchY = e.touches[0].clientY;
                    
                    this.currentTouchX = touchX;
                    this.currentTouchY = touchY;
                    
                    // Calculate horizontal movement for steering
                    // Positive = right, Negative = left
                    const screenWidth = window.innerWidth;
                    const horizontalDelta = touchX - this.touchStartX;
                    
                    // Calculate steering input (normalized from -1 to 1)
                    // Use a percentage of screen width for consistent feel across devices
                    const steeringInput = Math.max(-1, Math.min(1, horizontalDelta / (screenWidth * 0.3)));
                    
                    // Apply deadzone to prevent tiny movements
                    if (Math.abs(steeringInput) < this.steeringDeadzone) {
                        this.steeringDirection = 0;
                    } else {
                        this.steeringDirection = steeringInput * this.steeringSensitivity;
                    }
                    
                    // Move touch indicator
                    const touchIndicator = document.getElementById('touch-indicator');
                    if (touchIndicator) {
                        touchIndicator.style.left = `${touchX}px`;
                        touchIndicator.style.top = `${touchY}px`;
                    }
                    
                } catch (error) {
                    console.error("Mobile controls: Error during touch movement", error);
                }
            }, { passive: false });
            
            // Touch end - release touch
            document.addEventListener('touchend', (e) => {
                try {
                    // Only prevent default if we were actually touching
                    if (this.isTouching) {
                        e.preventDefault();
                    }
                    
                    // Check if this was a tap (short duration, little movement)
                    if (this.isTouching) {
                        const touchDuration = Date.now() - this.touchTime;
                        const moveDistance = Math.sqrt(
                            Math.pow(this.currentTouchX - this.touchStartX, 2) + 
                            Math.pow(this.currentTouchY - this.touchStartY, 2)
                        );
                        
                        if (touchDuration < 200 && moveDistance < 20) {
                            // This is a quick tap, trigger jump
                            this.jump();
                        }
                    }
                    
                    // Reset steering
                    this.steeringDirection = 0;
                    this.isTouching = false;
                    
                    // Hide touch indicator
                    const touchIndicator = document.getElementById('touch-indicator');
                    if (touchIndicator) {
                        touchIndicator.style.opacity = '0';
                    }
                    
                } catch (error) {
                    console.error("Mobile controls: Error during touch end", error);
                }
            }, { passive: false });
        }
        
        setupGameStatePatching() {
            // Patch into the game's update loop
            const self = this;
            
            // Save references to key game objects
            this.findGameObjects();
            
            // Create a new update method to plug into the game engine
            window.updatePlayerPositionMobile = function(deltaTime) {
                self.updateAutoRunnerMovement(deltaTime);
            };
            
            // Override the original update function when on mobile
            if (window.updatePlayerPosition && typeof window.updatePlayerPosition === 'function') {
                // Store the original function
                window.updatePlayerPositionOriginal = window.updatePlayerPosition;
                
                // Replace with our mobile version
                window.updatePlayerPosition = function(deltaTime) {
                    window.updatePlayerPositionMobile(deltaTime);
                };
                
                console.log("Successfully overrode player movement for auto-running");
            } else {
                console.warn("Could not find updatePlayerPosition function to override");
            }
        }
        
        findGameObjects() {
            // Try to get references to game objects and camera
            this.player = window.player;
            this.camera = window.camera;
            this.gameState = window.gameState;
            
            if (!this.player || !this.gameState) {
                console.warn("Could not find all required game objects - will retry");
                
                // Retry after a short delay
                setTimeout(() => this.findGameObjects(), 500);
            } else {
                console.log("Found all required game objects for auto-runner");
            }
        }
        
        updateAutoRunnerMovement(deltaTime) {
            // Skip if game over or goal reached
            if (!this.gameState || this.gameState.goalReached || this.gameState.gameOver) return;
            
            // Get player reference
            const player = this.player;
            if (!player) return;
            
            // Physics constants
            const jumpForce = 8.0;
            const gravity = 10.0;
            
            // Ground check
            const groundHeight = window.getTerrainHeight(player.position.x, player.position.z);
            this.gameState.playerOnGround = player.position.y <= groundHeight + 0.5;
            
            // Apply gravity
            if (!this.gameState.playerOnGround) {
                this.gameState.playerVelocity.y -= gravity * deltaTime;
            } else {
                this.gameState.playerVelocity.y = Math.max(0, this.gameState.playerVelocity.y);
                
                // Snap to ground if on ground
                if (player.position.y < groundHeight + 0.5) {
                    player.position.y = groundHeight + 0.5;
                }
            }
            
            // Handle jumping
            if (this.isJumping && this.gameState.playerOnGround) {
                this.gameState.playerVelocity.y = jumpForce;
                this.isJumping = false; // Reset jump flag once applied
            }
            
            // Calculate movement direction based on current forward direction and steering
            const cameraDirection = new THREE.Vector3();
            if (this.camera) {
                this.camera.getWorldDirection(cameraDirection);
                cameraDirection.y = 0;
                cameraDirection.normalize();
            } else {
                // Fallback if camera not available
                cameraDirection.set(0, 0, -1);
            }
            
            // Calculate steering vector - rotate cameraDirection by steeringDirection
            const steeringAngle = this.steeringDirection * Math.PI * 0.5 * deltaTime; // Convert to radians, scaled by time
            const rotatedDirection = cameraDirection.clone();
            rotatedDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), steeringAngle);
            
            // Update forward vector with steering
            this.forwardVector.copy(rotatedDirection);
            
            // Apply auto-running movement
            if (this.autoRunEnabled) {
                const moveDelta = this.forwardVector.clone().multiplyScalar(this.currentRunSpeed * deltaTime);
                player.position.add(moveDelta);
                
                // Rotate player to face direction of movement
                player.lookAt(player.position.clone().add(this.forwardVector));
                
                // Adjust player to terrain height
                const newGroundHeight = window.getTerrainHeight(player.position.x, player.position.z);
                
                // Only adjust height if we're on the ground
                if (this.gameState.playerOnGround) {
                    player.position.y = newGroundHeight + 0.5;
                }
                
                // Apply vertical velocity (gravity/jumping)
                player.position.y += this.gameState.playerVelocity.y * deltaTime;
                
                // Prevent player from sinking
                const currentGroundHeight = window.getTerrainHeight(player.position.x, player.position.z);
                if (player.position.y < currentGroundHeight + 0.5 && this.gameState.playerVelocity.y <= 0) {
                    player.position.y = currentGroundHeight + 0.5;
                    this.gameState.playerVelocity.y = 0;
                }
            }
        }
        
        jump() {
            if (!this.gameState || this.gameState.goalReached || this.gameState.gameOver) return;
            
            // Set jump flag - will be applied in next update if on ground
            this.isJumping = true;
            
            // For immediate feedback, also try direct key simulation
            if (window.gameState) {
                window.gameState.keyStates['Space'] = true;
                
                // Reset space key after a short delay
                setTimeout(() => {
                    if (window.gameState) {
                        window.gameState.keyStates['Space'] = false;
                    }
                }, 100);
            }
        }
        
        toggleRunSpeed() {
            if (!this.gameState || this.gameState.goalReached || this.gameState.gameOver) return;
            
            // Toggle between normal and fast speed
            if (this.currentRunSpeed === this.baseRunSpeed) {
                this.currentRunSpeed = this.maxRunSpeed;
                document.getElementById('speed-meter').innerText = 'SPEED: FAST';
            } else {
                this.currentRunSpeed = this.baseRunSpeed;
                document.getElementById('speed-meter').innerText = 'SPEED: NORMAL';
            }
        }
    }

    // Initialize auto-runner controls when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.autoRunnerControls = new AutoRunnerControls();
        });
    } else {
        // DOM already loaded, initialize now
        window.autoRunnerControls = new AutoRunnerControls();
    }
    
    // Initialize camera controls for auto-runner
    // We don't need the original mobile-camera-controls.js as we'll handle this differently
    window.addEventListener('load', function() {
        // Ensure camera follows player direction in auto-runner mode
        function initAutoRunnerCamera() {
            // Try to get camera
            if (!window.camera) {
                setTimeout(initAutoRunnerCamera, 500);
                return;
            }
            
            // Override the original camera update if it exists
            if (typeof window.updateCamera === 'function') {
                const originalUpdateCamera = window.updateCamera;
                
                window.updateCamera = function() {
                    if (window.autoRunnerControls) {
                        // In mobile auto-runner mode, camera follows player direction automatically
                        updateAutoRunnerCamera();
                    } else {
                        // On desktop, use original camera controls
                        originalUpdateCamera();
                    }
                };
                
                console.log("Camera controls configured for auto-runner mode");
            }
            
            function updateAutoRunnerCamera() {
                // Skip if required objects aren't available
                if (!window.player || !window.camera || !window.autoRunnerControls) return;
                
                // Skip camera update during special game states
                if (window.gameState && (window.gameState.goalReached || window.gameState.gameOver)) {
                    return;
                }
                
                const player = window.player;
                const camera = window.camera;
                const controls = window.autoRunnerControls;
                
                // Use player's forward direction for camera positioning
                const forwardDir = controls.forwardVector.clone();
                
                // Camera settings
                const cameraHeight = 4;
                const cameraDistance = 6;
                const lookAheadDistance = 3;
                
                // Position camera behind player
                camera.position.copy(player.position)
                    .sub(forwardDir.clone().multiplyScalar(cameraDistance));
                
                // Add height offset
                camera.position.y = player.position.y + cameraHeight;
                
                // Look ahead of player
                const lookTarget = player.position.clone()
                    .add(forwardDir.clone().multiplyScalar(lookAheadDistance));
                lookTarget.y = player.position.y + 1; // Look at head level
                
                camera.lookAt(lookTarget);
            }
        }
        
        // Start camera initialization
        initAutoRunnerCamera();
    });
}

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
        
        // Reset auto-runner controls if they exist
        if (window.autoRunnerControls) {
            window.autoRunnerControls.steeringDirection = 0;
            window.autoRunnerControls.isJumping = false;
            window.autoRunnerControls.forwardVector.set(0, 0, 1);
            window.autoRunnerControls.currentRunSpeed = window.autoRunnerControls.baseRunSpeed;
            document.getElementById('speed-meter').innerText = 'SPEED: NORMAL';
        }
        
        // Restart animation loop if it was cancelled
        if (!window.gameState.animationId) {
            window.lastTime = performance.now();
            window.gameState.animationId = requestAnimationFrame(window.animate);
        }
    }
};