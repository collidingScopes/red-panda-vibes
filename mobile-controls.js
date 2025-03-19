// RedPandaMobileControls.js
// A mobile control system with a camera that follows behind the character

class RedPandaMobileControls {
    constructor() {
        // Only initialize on mobile devices
        this.isMobile = this.detectMobile();
        if (!this.isMobile) return;
        
        // Core game references
        this.player = null;
        this.camera = null;
        this.gameState = null;
        
        // Camera settings
        this.cameraSettings = {
            distance: 6,           // Distance behind player
            height: 3,             // Height above player
            lookAheadOffset: 1,    // Look ahead offset (player head height)
            damping: 0.1,          // Camera position damping factor (lower = smoother)
            rotationDamping: 0.15, // Camera rotation damping factor
            targetPosition: new THREE.Vector3(),
            currentLookDirection: new THREE.Vector3(0, 0, 1)
        };
        
        // Movement joystick state
        this.joystick = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            deltaX: 0,
            deltaY: 0,
            angle: 0,
            intensity: 0,
            maxRadius: 60,
            containerEl: null,
            stickEl: null
        };
        
        // Jump button
        this.jumpButton = {
            active: false,
            element: null,
            cooldown: false,
            cooldownTime: 500 // ms
        };
        
        // Vector for calculations (reused to reduce garbage collection)
        this.moveVector = new THREE.Vector3();
        this.tempVector = new THREE.Vector3();
        
        // Settings
        this.settings = {
            moveSensitivity: 5.0,
            jumpHeight: 8.0,
            deadzone: 0.1 // Percentage of joystick movement to ignore
        };
        
        // Initialize after DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    // Detect mobile device
    detectMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(userAgent);
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        
        return isIOS || isAndroid || isMobileUA || isTouchDevice;
    }
    
    // Initialize mobile controls
    init() {
        console.log("Initializing Red Panda Mobile Controls");
        
        // Add mobile class to body
        document.body.classList.add('mobile-device');
        
        // Add iOS specific class if needed
        if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
            document.body.classList.add('ios-device');
            this.optimizeForIOS();
        }
        
        // Create mobile UI
        this.createMobileUI();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Try to find game objects
        this.findGameObjects();
        
        // Override game functions
        this.overrideGameFunctions();
        
        // Disable original on-screen arrow buttons if they exist
        this.disableOriginalControls();
        
        console.log("Red Panda Mobile Controls initialization complete");
    }
    
    // Create mobile UI elements
    createMobileUI() {
        // Add mobile-specific styles
        this.addMobileStyles();
        
        // Create joystick
        this.joystick.containerEl = document.createElement('div');
        this.joystick.containerEl.id = 'rp-joystick-container';
        this.joystick.containerEl.className = 'rp-joystick-container';
        
        this.joystick.stickEl = document.createElement('div');
        this.joystick.stickEl.id = 'rp-joystick-stick';
        this.joystick.stickEl.className = 'rp-joystick-stick';
        this.joystick.stickEl.innerHTML = '<div class="rp-joystick-icon">⬆</div>';
        
        this.joystick.containerEl.appendChild(this.joystick.stickEl);
        document.body.appendChild(this.joystick.containerEl);
        
        // Create jump button
        this.jumpButton.element = document.createElement('div');
        this.jumpButton.element.id = 'rp-jump-button';
        this.jumpButton.element.innerHTML = 'JUMP';
        document.body.appendChild(this.jumpButton.element);
        
        // Create mobile instructions
        this.createMobileInstructions();
    }
    
    // Add mobile-specific styles
    addMobileStyles() {
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            /* Mobile control styles */
            body.mobile-device {
                touch-action: none;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                user-select: none;
                overflow: hidden;
                position: fixed;
                width: 100%;
                height: 100%;
            }
            
            /* Joystick styles */
            .rp-joystick-container {
                position: fixed;
                width: 130px;
                height: 130px;
                background-color: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(132, 255, 239, 0.5);
                border-radius: 50%;
                touch-action: none;
                z-index: 1000;
                left: 50%;
                bottom: 100px;
                transform: translateX(-50%);
                backdrop-filter: blur(2px);
            }
            
            .rp-joystick-stick {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 70px;
                height: 70px;
                background-color: rgba(255, 132, 223, 0.3);
                border: 2px solid rgba(255, 132, 223, 0.8);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 10px rgba(255, 132, 223, 0.6);
            }
            
            .rp-joystick-icon {
                color: rgba(255, 255, 255, 0.9);
                font-size: 24px;
                text-shadow: 0 0 8px rgba(255, 132, 223, 0.8);
            }
            
            /* Jump button */
            #rp-jump-button {
                position: fixed;
                right: 40px;
                bottom: 130px;
                width: 90px;
                height: 90px;
                background-color: rgba(162, 255, 132, 0.3);
                border: 3px solid rgba(162, 255, 132, 0.8);
                border-radius: 50%;
                color: rgba(255, 255, 255, 0.9);
                font-family: 'Courier New', monospace;
                font-size: 20px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                text-shadow: 0 0 8px rgba(162, 255, 132, 0.8);
                box-shadow: 0 0 15px rgba(162, 255, 132, 0.5);
                backdrop-filter: blur(2px);
            }
            
            #rp-jump-button.active {
                background-color: rgba(162, 255, 132, 0.6);
                transform: scale(0.95);
            }
            
            /* Mobile instructions */
            #rp-mobile-instructions {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.8);
                color: #ff84df;
                padding: 25px;
                border: 3px solid #84ffef;
                border-radius: 5px;
                z-index: 3000;
                font-family: 'Courier New', monospace;
                text-transform: uppercase;
                letter-spacing: 1px;
                text-align: center;
                box-shadow: 0 0 20px rgba(255, 132, 223, 0.6);
                backdrop-filter: blur(5px);
                max-width: 80%;
            }
            
            #rp-mobile-instructions h3 {
                color: #ffee84;
                margin-top: 10px;
                margin-bottom: 20px;
                font-size: 24px;
            }
            
            #rp-start-mobile-game {
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
            
            /* Button cooldown effect */
            @keyframes cooldown {
                from { opacity: 0.5; }
                to { opacity: 1; }
            }
            
            .cooldown {
                animation: cooldown 0.5s ease-out;
            }
        `;
        
        document.head.appendChild(styleEl);
    }
    
    // Create mobile instructions dialog
    createMobileInstructions() {
        const instructions = document.createElement('div');
        instructions.id = 'rp-mobile-instructions';
        instructions.className = 'game-overlay-screen';
        
        instructions.innerHTML = `
            <button id="rp-close-mobile-instructions" class="close-button">&times;</button>
            <h3>Red Panda Explorer 🐼</h3>
            <div>
                <p>DRAG JOYSTICK TO MOVE</p>
                <p>TAP JUMP BUTTON TO JUMP</p>
            </div>
            <p>🏁 FIND THE RAINBOW FLAG!</p>
            <p>AVOID THE DARK MONSTERS!</p>
            <button id="rp-start-mobile-game" class="start-button">START GAME</button>
        `;
        
        document.body.appendChild(instructions);
        
        // Add event listeners
        document.getElementById('rp-close-mobile-instructions').addEventListener('click', () => {
            instructions.classList.add('hidden');
        });
        
        document.getElementById('rp-start-mobile-game').addEventListener('click', () => {
            instructions.classList.add('hidden');
        });
    }
    
    // Set up event listeners for touch controls
    setupEventListeners() {
        // Joystick events
        this.setupJoystickEvents();
        
        // Jump button events
        this.jumpButton.element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this.jumpButton.cooldown) {
                this.jumpButton.active = true;
                this.jumpButton.element.classList.add('active');
                this.handleJump();
                
                // Apply cooldown
                this.jumpButton.cooldown = true;
                setTimeout(() => {
                    this.jumpButton.cooldown = false;
                    this.jumpButton.element.classList.add('cooldown');
                    setTimeout(() => {
                        this.jumpButton.element.classList.remove('cooldown');
                    }, 500);
                }, this.jumpButton.cooldownTime);
            }
        });
        
        this.jumpButton.element.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.jumpButton.active = false;
            this.jumpButton.element.classList.remove('active');
        });
        
        // Prevent default browser behaviors
        document.addEventListener('touchmove', (e) => {
            if (e.target.tagName !== 'BUTTON' && 
                !e.target.classList.contains('close-button') && 
                e.target.id !== 'rp-start-mobile-game') {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Special handling: anywhere on screen can be joystick
        document.addEventListener('touchstart', (e) => {
            // Skip if touching the jump button or other UI elements
            if (e.target === this.jumpButton.element || 
                e.target.tagName === 'BUTTON' || 
                e.target.classList.contains('close-button') ||
                e.target.id === 'rp-start-mobile-game' ||
                // Check if any overlay screens are visible
                (!document.getElementById('instructions').classList.contains('hidden') ||
                !document.getElementById('level-complete-content').classList.contains('hidden') ||
                !document.getElementById('game-over-screen').classList.contains('hidden'))) {
                return;
            }
            
            // If touch is on the left half of the screen, treat as joystick
            const touchX = e.touches[0].clientX;
            const windowWidth = window.innerWidth;
            
            if (touchX < windowWidth * 0.7) {  // Left 70% of screen for movement
                // Move joystick container to touch position
                const touchY = e.touches[0].clientY;
                this.joystick.containerEl.style.left = (touchX) + 'px';
                this.joystick.containerEl.style.bottom = (window.innerHeight - touchY) + 'px';
                this.joystick.containerEl.style.transform = 'translate(-50%, 50%)';
                
                // Trigger joystick's touchstart (will be handled by the joystick's event handler)
                const touchEvent = new TouchEvent('touchstart', {
                    touches: e.touches,
                    bubbles: true
                });
                this.joystick.containerEl.dispatchEvent(touchEvent);
            }
        });
    }
    
    // Set up joystick event handlers
    setupJoystickEvents() {
        const container = this.joystick.containerEl;
        const stick = this.joystick.stickEl;
        
        // Touch start - initialize joystick position
        container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            
            // Get touch position relative to container
            const touch = e.touches[0];
            const rect = container.getBoundingClientRect();
            
            this.joystick.active = true;
            this.joystick.startX = rect.left + rect.width / 2;
            this.joystick.startY = rect.top + rect.height / 2;
            this.joystick.currentX = touch.clientX;
            this.joystick.currentY = touch.clientY;
            
            // Calculate delta from center
            this.updateJoystickDelta();
            
            // Update visual position of stick
            this.updateJoystickVisuals();
        });
        
        // Touch move - update joystick position
        container.addEventListener('touchmove', (e) => {
            if (!this.joystick.active) return;
            e.preventDefault();
            
            // Update current position
            this.joystick.currentX = e.touches[0].clientX;
            this.joystick.currentY = e.touches[0].clientY;
            
            // Calculate delta from center
            this.updateJoystickDelta();
            
            // Update visual position of stick
            this.updateJoystickVisuals();
        });
        
        // Touch end - reset joystick
        container.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.joystick.active = false;
            this.joystick.deltaX = 0;
            this.joystick.deltaY = 0;
            this.joystick.angle = 0;
            this.joystick.intensity = 0;
            
            // Center the stick
            stick.style.transform = 'translate(-50%, -50%)';
            
            // Reset container position after short delay
            setTimeout(() => {
                if (!this.joystick.active) {
                    container.style.left = '50%';
                    container.style.bottom = '100px';
                    container.style.transform = 'translateX(-50%)';
                }
            }, 300);
        });
        
        // Touch cancel - same as touch end
        container.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.joystick.active = false;
            this.joystick.deltaX = 0;
            this.joystick.deltaY = 0;
            this.joystick.angle = 0;
            this.joystick.intensity = 0;
            
            // Center the stick
            stick.style.transform = 'translate(-50%, -50%)';
            
            // Reset container position after short delay
            setTimeout(() => {
                if (!this.joystick.active) {
                    container.style.left = '50%';
                    container.style.bottom = '100px';
                    container.style.transform = 'translateX(-50%)';
                }
            }, 300);
        });
        
        // Make document-level touch events also release joystick if moved away
        document.addEventListener('touchend', () => {
            if (this.joystick.active) {
                this.joystick.active = false;
                this.joystick.deltaX = 0;
                this.joystick.deltaY = 0;
                this.joystick.angle = 0;
                this.joystick.intensity = 0;
                
                // Center the stick
                stick.style.transform = 'translate(-50%, -50%)';
                
                // Reset container position after short delay
                setTimeout(() => {
                    if (!this.joystick.active) {
                        container.style.left = '50%';
                        container.style.bottom = '100px';
                        container.style.transform = 'translateX(-50%)';
                    }
                }, 300);
            }
        });
    }
    
    // Update joystick delta values
    updateJoystickDelta() {
        // Calculate raw delta
        this.joystick.deltaX = this.joystick.currentX - this.joystick.startX;
        this.joystick.deltaY = this.joystick.currentY - this.joystick.startY;
        
        // Calculate distance from center
        const distance = Math.sqrt(
            this.joystick.deltaX * this.joystick.deltaX + 
            this.joystick.deltaY * this.joystick.deltaY
        );
        
        // If beyond max radius, normalize
        if (distance > this.joystick.maxRadius) {
            const scale = this.joystick.maxRadius / distance;
            this.joystick.deltaX *= scale;
            this.joystick.deltaY *= scale;
        }
        
        // Calculate angle and intensity
        this.joystick.angle = Math.atan2(this.joystick.deltaY, this.joystick.deltaX);
        this.joystick.intensity = Math.min(distance / this.joystick.maxRadius, 1.0);
        
        // Apply deadzone
        if (this.joystick.intensity < this.settings.deadzone) {
            this.joystick.intensity = 0;
            this.joystick.deltaX = 0;
            this.joystick.deltaY = 0;
        }
    }
    
    // Update joystick visual position
    updateJoystickVisuals() {
        const offsetX = this.joystick.deltaX;
        const offsetY = this.joystick.deltaY;
        
        this.joystick.stickEl.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
    }
    
    // Handle jump button press
    handleJump() {
        if (!this.gameState) return;
        
        // Trigger jump if on ground
        if (this.gameState.playerOnGround) {
            this.gameState.playerVelocity.y = this.settings.jumpHeight;
            
            // Also set space key state for compatibility with original code
            if (this.gameState.keyStates) {
                this.gameState.keyStates['Space'] = true;
                
                // Reset after a brief period
                setTimeout(() => {
                    if (this.gameState.keyStates) {
                        this.gameState.keyStates['Space'] = false;
                    }
                }, 100);
            }
        }
    }
    
    // Find game objects
    findGameObjects() {
        // Try to get references to game objects
        if (window.player) {
            this.player = window.player;
        }
        
        if (window.camera) {
            this.camera = window.camera;
        }
        
        if (window.gameState) {
            this.gameState = window.gameState;
        }
        
        // If we couldn't find all objects, retry after a delay
        if (!this.player || !this.camera || !this.gameState) {
            setTimeout(() => this.findGameObjects(), 500);
        } else {
            console.log("Found all required game objects for RedPandaMobileControls");
        }
    }
    
    // Override game functions for mobile
    overrideGameFunctions() {
        const self = this;
        
        // Store original update function if it exists
        if (window.updatePlayerPosition && typeof window.updatePlayerPosition === 'function') {
            window._originalUpdatePlayerPosition = window.updatePlayerPosition;
            
            // Override with our mobile-aware function
            window.updatePlayerPosition = function(deltaTime) {
                if (self.isMobile) {
                    self.updatePlayerMovement(deltaTime);
                } else {
                    window._originalUpdatePlayerPosition(deltaTime);
                }
            };
        }
        
        // Store original camera update function if it exists
        if (window.updateCamera && typeof window.updateCamera === 'function') {
            window._originalUpdateCamera = window.updateCamera;
            
            // Override with our mobile-aware function
            window.updateCamera = function() {
                if (self.isMobile) {
                    self.updateFollowCamera();
                } else {
                    window._originalUpdateCamera();
                }
            };
        }
        
        // Add a flag to indicate our control system is active
        window.redPandaMobileControlsActive = true;
    }
    
    // Update player movement based on joystick input
    updatePlayerMovement(deltaTime) {
        // Skip if game over or goal reached or missing required objects
        if (!this.player || !this.gameState || !this.camera || 
            this.gameState.goalReached || this.gameState.gameOver) {
            return;
        }
        
        const speed = this.settings.moveSensitivity;
        const gravity = 10.0;
        
        // Ground check
        const groundHeight = window.getTerrainHeight(this.player.position.x, this.player.position.z);
        this.gameState.playerOnGround = this.player.position.y <= groundHeight + 0.5;
        
        // Apply gravity
        if (!this.gameState.playerOnGround) {
            this.gameState.playerVelocity.y -= gravity * deltaTime;
        } else {
            this.gameState.playerVelocity.y = Math.max(0, this.gameState.playerVelocity.y);
            
            // Snap to ground if on ground
            if (this.player.position.y < groundHeight + 0.5) {
                this.player.position.y = groundHeight + 0.5;
            }
        }
        
        // Only apply movement if joystick is active
        if (this.joystick.active && this.joystick.intensity > 0) {
            // Convert joystick input to world space movement
            const moveDirection = new THREE.Vector3(
                -this.joystick.deltaX,  // Inverted X for correct left/right movement
                0,
                -this.joystick.deltaY   // Inverted Y for correct forward/back movement
            ).normalize();
            
            // Transform movement direction relative to camera
            const cameraDir = new THREE.Vector3(0, 0, -1);
            cameraDir.applyQuaternion(this.camera.quaternion);
            cameraDir.y = 0;
            cameraDir.normalize();
            
            // Calculate camera's right vector
            const cameraRight = new THREE.Vector3(1, 0, 0);
            cameraRight.applyQuaternion(this.camera.quaternion);
            cameraRight.y = 0;
            cameraRight.normalize();
            
            // Calculate world move direction
            this.moveVector.set(0, 0, 0);
            this.moveVector.addScaledVector(cameraDir, moveDirection.z);
            this.moveVector.addScaledVector(cameraRight, moveDirection.x);
            
            if (this.moveVector.length() > 0.1) {
                this.moveVector.normalize();
                
                // Apply movement with speed and intensity
                const moveDelta = this.moveVector.clone().multiplyScalar(speed * this.joystick.intensity * deltaTime);
                this.player.position.add(moveDelta);
                
                // Store current look direction for camera follow
                this.cameraSettings.currentLookDirection.copy(this.moveVector).normalize();
                
                // Rotate player to face direction of movement
                this.player.lookAt(this.player.position.clone().add(this.moveVector));
                
                // Adjust player to terrain height if on ground
                if (this.gameState.playerOnGround) {
                    const newGroundHeight = window.getTerrainHeight(this.player.position.x, this.player.position.z);
                    this.player.position.y = newGroundHeight + 0.5;
                }
            }
        }
        
        // Apply vertical velocity (gravity/jumping)
        this.player.position.y += this.gameState.playerVelocity.y * deltaTime;
        
        // Prevent player from sinking
        const currentGroundHeight = window.getTerrainHeight(this.player.position.x, this.player.position.z);
        if (this.player.position.y < currentGroundHeight + 0.5 && this.gameState.playerVelocity.y <= 0) {
            this.player.position.y = currentGroundHeight + 0.5;
            this.gameState.playerVelocity.y = 0;
        }
        
        // Check for goal (flagpole)
        if (window.flagPole) {
            const dx = this.player.position.x - window.flagPole.position.x;
            const dz = this.player.position.z - window.flagPole.position.z;
            const horizontalDistanceToGoal = Math.sqrt(dx * dx + dz * dz);
            
            if (horizontalDistanceToGoal < 1 && !this.gameState.goalReached) {
                this.gameState.goalReached = true;
                
                if (this.gameState.levelSystem) {
                    this.gameState.levelSystem.showLevelComplete();
                } else {
                    document.getElementById('goal-message').style.display = 'block';
                }
            }
        }
    }
    
    // Update third-person follow camera
    updateFollowCamera() {
        if (!this.camera || !this.player) return;

        // Skip camera update during special game states
        if (this.gameState && (this.gameState.goalReached || this.gameState.gameOver)) {
            return;
        }
        
        // We always want to look at the same angle as the player is facing
        // Get the player's facing direction
        const playerDirection = new THREE.Vector3(0, 0, 1);
        playerDirection.applyQuaternion(this.player.quaternion);
        playerDirection.y = 0;
        playerDirection.normalize();
        
        // When the player is moving, update the camera look direction
        // This ensures camera always follows the direction player is moving
        if (this.joystick.active && this.joystick.intensity > 0) {
            // Smoothly transition to new look direction
            this.cameraSettings.currentLookDirection.lerp(playerDirection, this.cameraSettings.rotationDamping);
        }
        
        // Calculate camera position: behind player, offset by distance
        const cameraOffset = this.cameraSettings.currentLookDirection.clone().multiplyScalar(-this.cameraSettings.distance);
        
        // Add height offset
        cameraOffset.y = this.cameraSettings.height;
        
        // Set target camera position (player position + offset)
        this.cameraSettings.targetPosition.copy(this.player.position).add(cameraOffset);
        
        // Smoothly move camera to target position
        this.camera.position.lerp(this.cameraSettings.targetPosition, this.cameraSettings.damping);
        
        // Calculate look target (ahead of player)
        const lookTarget = this.player.position.clone();
        
        // Add height offset to look at player's head
        lookTarget.y += this.cameraSettings.lookAheadOffset;
        
        // Add forward offset in player's direction
        this.tempVector.copy(this.cameraSettings.currentLookDirection).multiplyScalar(2);
        lookTarget.add(this.tempVector);
        
        // Look at the target
        this.camera.lookAt(lookTarget);
    }
    
    // Disable original mobile controls
    disableOriginalControls() {
        // Try to remove old mobile control elements
        const oldControls = [
            'move-joystick-container',
            'camera-joystick-container',
            'jump-button',
            'mobile-instructions'
        ];
        
        oldControls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
    }
    
    // iOS specific optimizations
    optimizeForIOS() {
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
            if (e.target.tagName !== 'BUTTON' && 
                e.target.tagName !== 'INPUT' && 
                e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Add CSS with iOS-specific fixes
        const iosStyleEl = document.createElement('style');
        iosStyleEl.textContent = `
            /* iOS-specific fixes */
            .ios-device * {
                -webkit-tap-highlight-color: rgba(0,0,0,0);
            }
            
            .ios-device .rp-joystick-container,
            .ios-device .rp-joystick-stick,
            .ios-device #rp-jump-button {
                -webkit-transform: translateZ(0);
                transform: translateZ(0);
                -webkit-backface-visibility: hidden;
                backface-visibility: hidden;
            }
            
            /* Fix for iOS Safari 100vh issue */
            .ios-device {
                height: 100%;
                position: fixed;
                overflow: hidden;
                width: 100%;
            }
        `;
        document.head.appendChild(iosStyleEl);
    }
    
    // Reset controls when game resets
    reset() {
        // Reset joystick state
        this.joystick.active = false;
        this.joystick.deltaX = 0;
        this.joystick.deltaY = 0;
        this.joystick.angle = 0;
        this.joystick.intensity = 0;
        
        // Reset joystick visuals
        if (this.joystick.stickEl) {
            this.joystick.stickEl.style.transform = 'translate(-50%, -50%)';
        }
        
        // Reset container position
        if (this.joystick.containerEl) {
            this.joystick.containerEl.style.left = '50%';
            this.joystick.containerEl.style.bottom = '100px';
            this.joystick.containerEl.style.transform = 'translateX(-50%)';
        }
        
        // Reset jump button
        this.jumpButton.active = false;
        this.jumpButton.cooldown = false;
        if (this.jumpButton.element) {
            this.jumpButton.element.classList.remove('active');
            this.jumpButton.element.classList.remove('cooldown');
        }
    }
    
    // Handle screen orientation changes
    handleOrientationChange() {
        // Adjust UI positions based on orientation
        if (window.innerHeight > window.innerWidth) {
            // Portrait mode
            if (this.joystick.containerEl) {
                this.joystick.containerEl.style.bottom = '150px';
            }
            if (this.jumpButton.element) {
                this.jumpButton.element.style.bottom = '150px';
                this.jumpButton.element.style.right = '40px';
            }
        } else {
            // Landscape mode
            if (this.joystick.containerEl) {
                this.joystick.containerEl.style.bottom = '100px';
            }
            if (this.jumpButton.element) {
                this.jumpButton.element.style.bottom = '130px';
                this.jumpButton.element.style.right = '40px';
            }
        }
        
        // Reset control states to prevent stuck inputs
        this.reset();
    }
}

// Initialize when the document loads
window.addEventListener('load', function() {
    // Create a global instance
    window.redPandaMobileControls = new RedPandaMobileControls();
    
    // Patch resetGame function to also reset mobile controls
    const originalResetGame = window.resetGame || function() {};
    window.resetGame = function() {
        // Call original resetGame
        originalResetGame();
        
        // Reset mobile controls
        if (window.redPandaMobileControls) {
            window.redPandaMobileControls.reset();
        }
    };
    
    // Handle orientation changes
    window.addEventListener('orientationchange', function() {
        if (window.redPandaMobileControls) {
            // Small delay to let the browser finish orientation change
            setTimeout(() => {
                window.redPandaMobileControls.handleOrientationChange();
            }, 300);
        }
    });
    
    // Also handle resize events (for desktop testing)
    window.addEventListener('resize', function() {
        if (window.redPandaMobileControls) {
            // Debounce to prevent excessive calls
            if (window.redPandaMobileControls.resizeTimer) {
                clearTimeout(window.redPandaMobileControls.resizeTimer);
            }
            window.redPandaMobileControls.resizeTimer = setTimeout(() => {
                window.redPandaMobileControls.handleOrientationChange();
            }, 250);
        }
    });
});