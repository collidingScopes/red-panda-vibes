// Mobile Controls for Red Panda Explorer
class MobileControls {
    constructor() {
        this.initialized = false;
        this.isMobile = this.detectMobile();
        
        if (!this.isMobile) return;
        
        // References to game objects
        this.player = null;
        this.camera = null;
        this.gameState = null;
        
        // Movement joystick state
        this.moveJoystick = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            deltaX: 0,
            deltaY: 0,
            angle: 0,
            intensity: 0,
            maxRadius: 60, // Maximum joystick movement radius
            containerEl: null,
            stickEl: null
        };
        
        // Camera joystick state
        this.cameraJoystick = {
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
        
        // Camera state tracking
        this.cameraState = {
            horizontalAngle: 0,
            verticalAngle: 0,
            MIN_VERTICAL_ANGLE: -Math.PI/8,
            MAX_VERTICAL_ANGLE: Math.PI/6
        };
        
        // Jump button state
        this.jumpButton = {
            active: false,
            element: null,
            cooldown: false,
            cooldownTime: 500 // ms
        };
        
        // Vector objects for calculations (reused to reduce garbage collection)
        this.moveVector = new THREE.Vector3();
        this.cameraForward = new THREE.Vector3();
        this.cameraRight = new THREE.Vector3();
        
        // Settings
        this.settings = {
            moveSensitivity: 5.0,
            cameraSensitivity: 1.5,
            jumpHeight: 8.0,
            deadzone: 0.1 // Percentage of joystick movement to ignore
        };
        
        // Initialize after DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    // Detect if user is on a mobile device
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
        
        // Override movement functions
        this.overrideGameFunctions();
        
        this.initialized = true;
        console.log("Mobile controls initialized");
    }
    
    // Create mobile UI elements
    createMobileUI() {
        // Add styles
        this.addMobileStyles();
        
        // Create movement joystick
        this.moveJoystick.containerEl = document.createElement('div');
        this.moveJoystick.containerEl.id = 'move-joystick-container';
        this.moveJoystick.containerEl.className = 'joystick-container';
        
        this.moveJoystick.stickEl = document.createElement('div');
        this.moveJoystick.stickEl.id = 'move-joystick-stick';
        this.moveJoystick.stickEl.className = 'joystick-stick';
        this.moveJoystick.stickEl.innerHTML = '<div class="joystick-icon">⬆</div>';
        
        this.moveJoystick.containerEl.appendChild(this.moveJoystick.stickEl);
        document.body.appendChild(this.moveJoystick.containerEl);
        
        // Create camera joystick
        this.cameraJoystick.containerEl = document.createElement('div');
        this.cameraJoystick.containerEl.id = 'camera-joystick-container';
        this.cameraJoystick.containerEl.className = 'joystick-container';
        
        this.cameraJoystick.stickEl = document.createElement('div');
        this.cameraJoystick.stickEl.id = 'camera-joystick-stick';
        this.cameraJoystick.stickEl.className = 'joystick-stick';
        this.cameraJoystick.stickEl.innerHTML = '<div class="joystick-icon">👁️</div>';
        
        this.cameraJoystick.containerEl.appendChild(this.cameraJoystick.stickEl);
        document.body.appendChild(this.cameraJoystick.containerEl);
        
        // Create jump button
        this.jumpButton.element = document.createElement('div');
        this.jumpButton.element.id = 'jump-button';
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
            .joystick-container {
                position: fixed;
                width: 120px;
                height: 120px;
                background-color: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(132, 255, 239, 0.5);
                border-radius: 50%;
                touch-action: none;
                z-index: 1000;
            }
            
            #move-joystick-container {
                left: 70px;
                bottom: 70px;
            }
            
            #camera-joystick-container {
                right: 70px;
                bottom: 70px;
            }
            
            .joystick-stick {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 60px;
                height: 60px;
                background-color: rgba(255, 132, 223, 0.3);
                border: 2px solid rgba(255, 132, 223, 0.8);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 10px rgba(255, 132, 223, 0.6);
            }
            
            .joystick-icon {
                color: rgba(255, 255, 255, 0.9);
                font-size: 24px;
                text-shadow: 0 0 8px rgba(255, 132, 223, 0.8);
            }
            
            /* Jump button */
            #jump-button {
                position: fixed;
                right: 70px;
                bottom: 200px;
                width: 80px;
                height: 80px;
                background-color: rgba(162, 255, 132, 0.3);
                border: 3px solid rgba(162, 255, 132, 0.8);
                border-radius: 50%;
                color: rgba(255, 255, 255, 0.9);
                font-family: 'Courier New', monospace;
                font-size: 18px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                text-shadow: 0 0 8px rgba(162, 255, 132, 0.8);
                box-shadow: 0 0 15px rgba(162, 255, 132, 0.5);
            }
            
            #jump-button.active {
                background-color: rgba(162, 255, 132, 0.6);
                transform: scale(0.95);
            }
            
            /* Mobile instructions */
            #mobile-instructions {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
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
                max-width: 80%;
            }
            
            #mobile-instructions h3 {
                color: #ffee84;
                margin-top: 10px;
                margin-bottom: 20px;
                font-size: 24px;
            }
            
            #mobile-instructions .control-diagram {
                display: flex;
                justify-content: space-around;
                margin: 15px 0;
            }
            
            #mobile-instructions .control-item {
                text-align: center;
                padding: 10px;
            }
            
            #mobile-instructions .control-icon {
                font-size: 30px;
                margin-bottom: 5px;
                color: #84ffef;
            }
            
            #start-mobile-game {
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
            
            /* Hide desktop instructions on mobile */
            body.mobile-device #instructions {
                display: none !important;
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
        instructions.id = 'mobile-instructions';
        instructions.className = 'game-overlay-screen';
        
        instructions.innerHTML = `
            <button id="close-mobile-instructions" class="close-button">&times;</button>
            <h3>Red Panda Explorer 🐼</h3>
            <div class="control-diagram">
                <div class="control-item">
                    <div class="control-icon">👈</div>
                    <p>LEFT: Move Panda</p>
                </div>
                <div class="control-item">
                    <div class="control-icon">👉</div>
                    <p>RIGHT: Look Around</p>
                </div>
            </div>
            <div class="control-item">
                <div class="control-icon">👆</div>
                <p>Press JUMP button to jump</p>
            </div>
            <p>🏁 Find the rainbow flag!</p>
            <p>Avoid the dark monsters!</p>
            <button id="start-mobile-game" class="start-button">START GAME</button>
        `;
        
        document.body.appendChild(instructions);
        
        // Add event listeners
        document.getElementById('close-mobile-instructions').addEventListener('click', () => {
            instructions.classList.add('hidden');
        });
        
        document.getElementById('start-mobile-game').addEventListener('click', () => {
            instructions.classList.add('hidden');
        });
    }
    
    // Set up event listeners for touch controls
    setupEventListeners() {
        // Movement joystick events
        this.setupJoystickEvents(this.moveJoystick);
        
        // Camera joystick events
        this.setupJoystickEvents(this.cameraJoystick);
        
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
                e.target.id !== 'start-mobile-game') {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    // Set up joystick event handlers
    setupJoystickEvents(joystick) {
        const container = joystick.containerEl;
        const stick = joystick.stickEl;
        
        // Touch start - initialize joystick position
        container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            
            // Get touch position relative to container
            const touch = e.touches[0];
            const rect = container.getBoundingClientRect();
            
            joystick.active = true;
            joystick.startX = rect.left + rect.width / 2;
            joystick.startY = rect.top + rect.height / 2;
            joystick.currentX = touch.clientX;
            joystick.currentY = touch.clientY;
            
            // Calculate delta from center
            this.updateJoystickDelta(joystick);
            
            // Update visual position of stick
            this.updateJoystickVisuals(joystick);
        });
        
        // Touch move - update joystick position
        container.addEventListener('touchmove', (e) => {
            if (!joystick.active) return;
            e.preventDefault();
            
            // Update current position
            joystick.currentX = e.touches[0].clientX;
            joystick.currentY = e.touches[0].clientY;
            
            // Calculate delta from center
            this.updateJoystickDelta(joystick);
            
            // Update visual position of stick
            this.updateJoystickVisuals(joystick);
        });
        
        // Touch end - reset joystick
        container.addEventListener('touchend', (e) => {
            e.preventDefault();
            joystick.active = false;
            joystick.deltaX = 0;
            joystick.deltaY = 0;
            joystick.angle = 0;
            joystick.intensity = 0;
            
            // Center the stick
            stick.style.transform = 'translate(-50%, -50%)';
        });
        
        // Touch cancel - same as touch end
        container.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            joystick.active = false;
            joystick.deltaX = 0;
            joystick.deltaY = 0;
            joystick.angle = 0;
            joystick.intensity = 0;
            
            // Center the stick
            stick.style.transform = 'translate(-50%, -50%)';
        });
    }
    
    // Update joystick delta values
    updateJoystickDelta(joystick) {
        // Calculate raw delta
        joystick.deltaX = joystick.currentX - joystick.startX;
        joystick.deltaY = joystick.currentY - joystick.startY;
        
        // Calculate distance from center
        const distance = Math.sqrt(joystick.deltaX * joystick.deltaX + joystick.deltaY * joystick.deltaY);
        
        // If beyond max radius, normalize
        if (distance > joystick.maxRadius) {
            const scale = joystick.maxRadius / distance;
            joystick.deltaX *= scale;
            joystick.deltaY *= scale;
        }
        
        // Calculate angle and intensity
        joystick.angle = Math.atan2(joystick.deltaY, joystick.deltaX);
        joystick.intensity = Math.min(distance / joystick.maxRadius, 1.0);
        
        // Apply deadzone
        if (joystick.intensity < this.settings.deadzone) {
            joystick.intensity = 0;
            joystick.deltaX = 0;
            joystick.deltaY = 0;
        }
    }
    
    // Update joystick visual position
    updateJoystickVisuals(joystick) {
        const offsetX = joystick.deltaX;
        const offsetY = joystick.deltaY;
        
        joystick.stickEl.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
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
            console.log("Found all required game objects");
            
            // Initialize camera angles
            if (window.cameraAngleHorizontal !== undefined) {
                this.cameraState.horizontalAngle = window.cameraAngleHorizontal;
            }
            
            if (window.cameraAngleVertical !== undefined) {
                this.cameraState.verticalAngle = window.cameraAngleVertical;
            }
        }
    }
    
    // Override game functions for mobile
    overrideGameFunctions() {
        const self = this;
        
        // Store original update function if it exists
        if (window.updatePlayerPosition && typeof window.updatePlayerPosition === 'function') {
            window.updatePlayerPositionOriginal = window.updatePlayerPosition;
            
            // Override with our mobile-aware function
            window.updatePlayerPosition = function(deltaTime) {
                if (self.initialized && self.isMobile) {
                    self.updatePlayerMovement(deltaTime);
                } else {
                    window.updatePlayerPositionOriginal(deltaTime);
                }
            };
        }
        
        // Store original camera update function if it exists
        if (window.updateCamera && typeof window.updateCamera === 'function') {
            window.updateCameraOriginal = window.updateCamera;
            
            // Override with our mobile-aware function
            window.updateCamera = function() {
                if (self.initialized && self.isMobile) {
                    self.updateCamera();
                } else {
                    window.updateCameraOriginal();
                }
            };
        }
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
        if (this.moveJoystick.active && this.moveJoystick.intensity > 0) {
            // Get camera direction (forward and right vectors)
            this.camera.getWorldDirection(this.cameraForward);
            this.cameraForward.y = 0;
            this.cameraForward.normalize();
            
            this.cameraRight.crossVectors(new THREE.Vector3(0, 1, 0), this.cameraForward);
            this.cameraRight.normalize();
            
            // Convert joystick input to world movement
            // Note: joystick deltaY is inverted because screen Y is inverted
            this.moveVector.set(0, 0, 0);
            this.moveVector.addScaledVector(this.cameraForward, -this.moveJoystick.deltaY / this.moveJoystick.maxRadius);
            this.moveVector.addScaledVector(this.cameraRight, this.moveJoystick.deltaX / this.moveJoystick.maxRadius);
            
            if (this.moveVector.length() > 0.1) {
                this.moveVector.normalize();
                
                // Apply movement with speed and intensity
                const moveDelta = this.moveVector.clone().multiplyScalar(speed * this.moveJoystick.intensity * deltaTime);
                this.player.position.add(moveDelta);
                
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
        
        // Update global values for integration with other code
        if (typeof window.cameraAngleHorizontal !== 'undefined') {
            window.cameraAngleHorizontal = this.cameraState.horizontalAngle;
        }
        
        if (typeof window.cameraAngleVertical !== 'undefined') {
            window.cameraAngleVertical = this.cameraState.verticalAngle;
        }
        
        // Check for goal (flagpole) - copy from original code
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
    
    // Update camera based on camera joystick input
    updateCamera() {
        if (!this.camera || !this.player) return;
        
        // Update camera angles based on joystick input
        if (this.cameraJoystick.active && this.cameraJoystick.intensity > 0) {
            // Horizontal movement (left/right) affects horizontal angle
            this.cameraState.horizontalAngle += this.cameraJoystick.deltaX * 0.0003 * this.settings.cameraSensitivity;
            
            // Vertical movement (up/down) affects vertical angle
            // Note: deltaY is negative when moving up (since screen Y is inverted)
            const verticalChange = this.cameraJoystick.deltaY * 0.0003 * this.settings.cameraSensitivity;
            this.cameraState.verticalAngle = Math.max(
                this.cameraState.MIN_VERTICAL_ANGLE,
                Math.min(this.cameraState.MAX_VERTICAL_ANGLE, this.cameraState.verticalAngle + verticalChange)
            );
        }
        
        // Calculate camera position with orbit controls
        const cameraDistance = 5; // Same as desktop
        const horizontalDistance = cameraDistance * Math.cos(this.cameraState.verticalAngle);
        const verticalDistance = cameraDistance * Math.sin(this.cameraState.verticalAngle);
        
        // Update camera position
        this.camera.position.x = this.player.position.x + horizontalDistance * Math.sin(this.cameraState.horizontalAngle);
        this.camera.position.z = this.player.position.z + horizontalDistance * Math.cos(this.cameraState.horizontalAngle);
        this.camera.position.y = this.player.position.y + 1.5 + verticalDistance; // 1.5 is height offset
        
        // Look at player's head level
        const target = this.player.position.clone();
        target.y += 1;
        this.camera.lookAt(target);
    }
    
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
            
            .ios-device .joystick-container,
            .ios-device .joystick-stick,
            .ios-device #jump-button {
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
    
    // Method to reset controls when game resets
    reset() {
        // Reset joystick states
        this.moveJoystick.active = false;
        this.moveJoystick.deltaX = 0;
        this.moveJoystick.deltaY = 0;
        this.moveJoystick.angle = 0;
        this.moveJoystick.intensity = 0;
        
        this.cameraJoystick.active = false;
        this.cameraJoystick.deltaX = 0;
        this.cameraJoystick.deltaY = 0;
        this.cameraJoystick.angle = 0;
        this.cameraJoystick.intensity = 0;
        
        // Reset joystick visuals
        if (this.moveJoystick.stickEl) {
            this.moveJoystick.stickEl.style.transform = 'translate(-50%, -50%)';
        }
        
        if (this.cameraJoystick.stickEl) {
            this.cameraJoystick.stickEl.style.transform = 'translate(-50%, -50%)';
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
        // Repositioning controls based on new screen dimensions
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Only make adjustments if elements exist
        if (this.moveJoystick.containerEl && this.cameraJoystick.containerEl && this.jumpButton.element) {
            // If in portrait mode (height > width)
            if (height > width) {
                // Move controls closer to bottom for better thumb reach
                this.moveJoystick.containerEl.style.bottom = '40px';
                this.cameraJoystick.containerEl.style.bottom = '40px';
                this.jumpButton.element.style.bottom = '130px';
            } else {
                // In landscape, use default positions
                this.moveJoystick.containerEl.style.bottom = '70px';
                this.cameraJoystick.containerEl.style.bottom = '70px';
                this.jumpButton.element.style.bottom = '200px';
            }
            
            // Reset joystick states to prevent stuck inputs
            this.reset();
        }
    }
    
    // Helper method to smoothly apply joystick input
    smoothInput(current, target, smoothFactor) {
        return current + (target - current) * Math.min(1.0, smoothFactor);
    }
    
    // Vibrate device for haptic feedback (if supported)
    vibrateDevice(pattern) {
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                // Vibration API not supported or not allowed
            }
        }
    }
    
    // Display a temporary hint overlay to guide new users
    showControlHints() {
        const hintsShown = localStorage.getItem('controlHintsShown');
        if (hintsShown) return;
        
        // Create hints overlay
        const hintsOverlay = document.createElement('div');
        hintsOverlay.className = 'control-hints-overlay';
        hintsOverlay.innerHTML = `
            <div class="hint-container left">
                <div class="hint-arrow">↔️</div>
                <div class="hint-text">Move</div>
            </div>
            <div class="hint-container right">
                <div class="hint-arrow">↔️</div>
                <div class="hint-text">Look</div>
            </div>
            <div class="hint-container jump">
                <div class="hint-arrow">⬆️</div>
                <div class="hint-text">Jump</div>
            </div>
            <div class="hint-dismiss">Tap to dismiss</div>
        `;
        
        document.body.appendChild(hintsOverlay);
        
        // Add styles for hints
        const hintsStyle = document.createElement('style');
        hintsStyle.textContent = `
            .control-hints-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.7);
                z-index: 5000;
                color: white;
                font-family: 'Courier New', monospace;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .hint-container {
                position: absolute;
                display: flex;
                flex-direction: column;
                align-items: center;
                animation: pulse 2s infinite;
            }
            
            .hint-container.left {
                bottom: 100px;
                left: 70px;
            }
            
            .hint-container.right {
                bottom: 100px;
                right: 70px;
            }
            
            .hint-container.jump {
                bottom: 230px;
                right: 70px;
            }
            
            .hint-arrow {
                font-size: 40px;
                margin-bottom: 10px;
            }
            
            .hint-text {
                color: #84ffef;
                font-size: 18px;
                text-shadow: 0 0 10px rgba(132, 255, 239, 0.8);
            }
            
            .hint-dismiss {
                position: absolute;
                bottom: 50px;
                width: 100%;
                text-align: center;
                color: rgba(255,255,255,0.8);
                font-size: 16px;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }
        `;
        
        document.head.appendChild(hintsStyle);
        
        // Dismiss on tap
        hintsOverlay.addEventListener('click', () => {
            hintsOverlay.remove();
            localStorage.setItem('controlHintsShown', 'true');
        });
        
        // Auto dismiss after 8 seconds
        setTimeout(() => {
            if (document.body.contains(hintsOverlay)) {
                hintsOverlay.remove();
                localStorage.setItem('controlHintsShown', 'true');
            }
        }, 8000);
    }
}

// Initialize mobile controls
window.addEventListener('load', function() {
    // Create global instance
    window.mobileControls = new MobileControls();
    
    // Patch the resetGame function to also reset mobile controls
    const originalResetGame = window.resetGame || function() {};
    window.resetGame = function() {
        // Call original resetGame
        originalResetGame();
        
        // Reset mobile controls
        if (window.mobileControls) {
            window.mobileControls.reset();
        }
    };
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', function() {
        if (window.mobileControls) {
            // Small delay to let browser finish orientation change
            setTimeout(() => window.mobileControls.handleOrientationChange(), 300);
        }
    });
    
    // Also handle resize events
    window.addEventListener('resize', function() {
        if (window.mobileControls) {
            // Small delay to prevent excessive calls during resize
            if (window.mobileControls.resizeTimer) {
                clearTimeout(window.mobileControls.resizeTimer);
            }
            window.mobileControls.resizeTimer = setTimeout(() => {
                window.mobileControls.handleOrientationChange();
            }, 250);
        }
    });
    
    // Show control hints after short delay
    setTimeout(() => {
        if (window.mobileControls && window.mobileControls.isMobile) {
            window.mobileControls.showControlHints();
        }
    }, 2000);
});