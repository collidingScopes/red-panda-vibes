// FixedFollowCamera.js
// A simplified mobile control system with camera that strictly follows behind the player

class FixedFollowCamera {
    constructor() {
        // Only initialize on mobile devices
        this.isMobile = this.detectMobile();
        if (!this.isMobile) return;
        
        // Debug flag - set to true to log camera positioning info
        this.debugMode = true;
        
        // Core game references
        this.player = null;
        this.camera = null;
        this.gameState = null;
        
        // Camera settings
        this.cameraSettings = {
            distance: 6,      // Distance behind player
            height: 3.5,      // Height offset from player's position
            lookOffset: 1,    // Height offset for look target (player's head)
            lookAhead: 2      // Look ahead distance in front of player
        };
        
        // Virtual joystick
        this.joystick = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            deltaX: 0,
            deltaY: 0,
            maxRadius: 60,
            containerEl: null, 
            stickEl: null
        };
        
        // Jump button
        this.jumpButton = {
            active: false,
            element: null
        };
        
        // Movement settings
        this.settings = {
            speed: 5.0,
            jumpHeight: 8.0
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
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        
        return isMobileDevice || isTouchDevice;
    }
    
    // Initialize
    init() {
        console.log("Initializing FixedFollowCamera for mobile");
        
        document.body.classList.add('mobile-device');
        
        // Create UI elements
        this.createControls();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Find game objects (player, camera, etc.)
        this.findGameObjects();
        
        // Override game functions for mobile
        this.overrideGameFunctions();
        
        // Hide any original mobile controls
        this.hideOriginalControls();
    }
    
    // Create mobile control UI elements
    createControls() {
        // Add mobile styles
        this.addMobileStyles();
        
        // Create joystick
        this.createJoystick();
        
        // Create jump button
        this.createJumpButton();
    }
    
    // Add mobile-specific styles
    addMobileStyles() {
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            /* Mobile control styles */
            body.mobile-device {
                touch-action: none;
                user-select: none;
                overflow: hidden;
                position: fixed;
                width: 100%;
                height: 100%;
            }
            
            /* Joystick styles */
            #fc-joystick-container {
                position: fixed;
                width: 120px;
                height: 120px;
                background-color: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(132, 255, 239, 0.6);
                border-radius: 50%;
                touch-action: none;
                z-index: 1000;
                bottom: 80px;
                left: 80px;
                backdrop-filter: blur(2px);
            }
            
            #fc-joystick-stick {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 60px;
                height: 60px;
                background-color: rgba(255, 132, 223, 0.4);
                border: 2px solid rgba(255, 132, 223, 0.8);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 10px rgba(255, 132, 223, 0.6);
            }
            
            /* Jump button */
            #fc-jump-button {
                position: fixed;
                right: 80px;
                bottom: 80px;
                width: 100px;
                height: 100px;
                background-color: rgba(162, 255, 132, 0.4);
                border: 3px solid rgba(162, 255, 132, 0.8);
                border-radius: 50%;
                color: white;
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
            
            #fc-jump-button.active {
                background-color: rgba(162, 255, 132, 0.7);
                transform: scale(0.95);
            }
            
            /* Debug info */
            #fc-debug-info {
                position: fixed;
                top: 50px;
                left: 10px;
                background-color: rgba(0, 0, 0, 0.7);
                color: #ffffff;
                font-family: monospace;
                font-size: 12px;
                padding: 10px;
                border-radius: 5px;
                z-index: 2000;
                max-width: 300px;
                overflow: hidden;
                white-space: pre;
                display: none;
            }
        `;
        
        document.head.appendChild(styleEl);
        
        // Add debug info element if in debug mode
        if (this.debugMode) {
            const debugEl = document.createElement('div');
            debugEl.id = 'fc-debug-info';
            document.body.appendChild(debugEl);
            
            // Make debug info visible
            debugEl.style.display = 'block';
        }
    }
    
    // Create virtual joystick
    createJoystick() {
        const container = document.createElement('div');
        container.id = 'fc-joystick-container';
        
        const stick = document.createElement('div');
        stick.id = 'fc-joystick-stick';
        
        container.appendChild(stick);
        document.body.appendChild(container);
        
        this.joystick.containerEl = container;
        this.joystick.stickEl = stick;
    }
    
    // Create jump button
    createJumpButton() {
        const button = document.createElement('div');
        button.id = 'fc-jump-button';
        button.textContent = 'JUMP';
        
        document.body.appendChild(button);
        this.jumpButton.element = button;
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Joystick event listeners
        this.setupJoystickEvents();
        
        // Jump button event listeners
        this.setupJumpButtonEvents();
        
        // Prevent default browser behaviors on touch
        document.addEventListener('touchmove', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    // Setup joystick event handlers
    setupJoystickEvents() {
        const container = this.joystick.containerEl;
        const stick = this.joystick.stickEl;
        
        // Touch start on joystick
        container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = container.getBoundingClientRect();
            
            this.joystick.active = true;
            this.joystick.startX = rect.left + rect.width / 2;
            this.joystick.startY = rect.top + rect.height / 2;
            this.joystick.currentX = touch.clientX;
            this.joystick.currentY = touch.clientY;
            
            this.updateJoystickPosition();
        });
        
        // Touch move on joystick
        container.addEventListener('touchmove', (e) => {
            if (!this.joystick.active) return;
            e.preventDefault();
            
            this.joystick.currentX = e.touches[0].clientX;
            this.joystick.currentY = e.touches[0].clientY;
            
            this.updateJoystickPosition();
        });
        
        // Touch end on joystick
        container.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.resetJoystick();
        });
        
        // Touch cancel on joystick
        container.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.resetJoystick();
        });
    }
    
    // Update joystick position and calculate movement values
    updateJoystickPosition() {
        // Calculate delta from center
        this.joystick.deltaX = this.joystick.currentX - this.joystick.startX;
        this.joystick.deltaY = this.joystick.currentY - this.joystick.startY;
        
        // Calculate distance from center
        const distance = Math.sqrt(this.joystick.deltaX * this.joystick.deltaX + this.joystick.deltaY * this.joystick.deltaY);
        
        // If beyond max radius, normalize
        if (distance > this.joystick.maxRadius) {
            const scale = this.joystick.maxRadius / distance;
            this.joystick.deltaX *= scale;
            this.joystick.deltaY *= scale;
        }
        
        // Update visual position of stick
        const stick = this.joystick.stickEl;
        stick.style.transform = `translate(calc(-50% + ${this.joystick.deltaX}px), calc(-50% + ${this.joystick.deltaY}px))`;
    }
    
    // Reset joystick to center position
    resetJoystick() {
        this.joystick.active = false;
        this.joystick.deltaX = 0;
        this.joystick.deltaY = 0;
        
        // Reset visual position
        this.joystick.stickEl.style.transform = 'translate(-50%, -50%)';
    }
    
    // Setup jump button event handlers
    setupJumpButtonEvents() {
        const button = this.jumpButton.element;
        
        // Touch start
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.jumpButton.active = true;
            button.classList.add('active');
            
            // Trigger jump
            this.handleJump();
        });
        
        // Touch end
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.jumpButton.active = false;
            button.classList.remove('active');
        });
    }
    
    // Handle jump action
    handleJump() {
        if (!this.gameState) return;
        
        // Only jump if on ground
        if (this.gameState.playerOnGround) {
            this.gameState.playerVelocity.y = this.settings.jumpHeight;
        }
    }
    
    // Find game objects (player, camera, game state)
    findGameObjects() {
        // Check for global game objects
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
            
            // Log initial positions for debugging
            if (this.debugMode) {
                this.logDebugInfo();
            }
        }
    }
    
    // Override game functions for mobile controls
    overrideGameFunctions() {
        const self = this;
        
        // Store original functions
        window._desktopUpdatePlayerPosition = window.updatePlayerPosition || function() {};
        window._desktopUpdateCamera = window.updateCamera || function() {};
        
        // Override player movement function
        window.updatePlayerPosition = function(deltaTime) {
            if (self.isMobile) {
                self.updateMobilePlayerPosition(deltaTime);
            } else {
                window._desktopUpdatePlayerPosition(deltaTime);
            }
        };
        
        // Override camera update function
        window.updateCamera = function() {
            if (self.isMobile) {
                self.updateMobileCamera();
            } else {
                window._desktopUpdateCamera();
            }
        };
        
        console.log("Game functions overridden for mobile controls");
    }
    
    // Update player position based on mobile joystick input
    updateMobilePlayerPosition(deltaTime) {
        // Skip if game is over, goal reached, or missing objects
        if (!this.player || !this.gameState || !this.camera ||
            this.gameState.goalReached || this.gameState.gameOver) {
            return;
        }
        
        const speed = this.settings.speed;
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
        
        // Move player based on joystick input
        if (this.joystick.active && (this.joystick.deltaX !== 0 || this.joystick.deltaY !== 0)) {
            // Get camera's forward and right vectors (for movement relative to view)
            const cameraForward = new THREE.Vector3(0, 0, -1);
            cameraForward.applyQuaternion(this.camera.quaternion);
            cameraForward.y = 0; // Keep movement on horizontal plane
            cameraForward.normalize();
            
            const cameraRight = new THREE.Vector3(1, 0, 0);
            cameraRight.applyQuaternion(this.camera.quaternion);
            cameraRight.y = 0;
            cameraRight.normalize();
            
            // Convert joystick input to movement direction
            // Note: Joystick Y is inverted (positive is down on screen)
            const moveDirection = new THREE.Vector3();
            moveDirection.addScaledVector(cameraForward, -this.joystick.deltaY); // Forward/backward
            moveDirection.addScaledVector(cameraRight, this.joystick.deltaX);    // Left/right
            
            if (moveDirection.length() > 0.1) {
                moveDirection.normalize();
                
                // Calculate movement delta
                const moveDelta = moveDirection.clone().multiplyScalar(speed * deltaTime);
                
                // Move player
                this.player.position.add(moveDelta);
                
                // Rotate player to face movement direction
                this.player.lookAt(this.player.position.clone().add(moveDirection));
                
                // Adjust to terrain height if on ground
                if (this.gameState.playerOnGround) {
                    const newHeight = window.getTerrainHeight(this.player.position.x, this.player.position.z);
                    this.player.position.y = newHeight + 0.5;
                }
            }
        }
        
        // Apply vertical velocity (jumping/falling)
        this.player.position.y += this.gameState.playerVelocity.y * deltaTime;
        
        // Prevent falling through terrain
        const newGroundHeight = window.getTerrainHeight(this.player.position.x, this.player.position.z);
        if (this.player.position.y < newGroundHeight + 0.5) {
            this.player.position.y = newGroundHeight + 0.5;
            this.gameState.playerVelocity.y = 0;
            this.gameState.playerOnGround = true;
        }
        
        // Check for goal (flag pole)
        this.checkGoalReached();
        
        // Update debug info if enabled
        if (this.debugMode) {
            this.logDebugInfo();
        }
    }
    
    // Update camera position to follow behind player
    updateMobileCamera() {
        if (!this.camera || !this.player) return;
        
        // Skip during game over or goal reached
        if (this.gameState && (this.gameState.goalReached || this.gameState.gameOver)) {
            return;
        }
        
        // Get player's forward direction (the direction they're facing)
        const playerForward = new THREE.Vector3(0, 0, 1);
        playerForward.applyQuaternion(this.player.quaternion);
        playerForward.normalize();
        
        // Calculate camera position directly behind player
        // The negative of player's forward direction is the vector pointing behind them
        const behindPlayer = playerForward.clone().multiplyScalar(-this.cameraSettings.distance);
        
        // Start from player's position
        const cameraPosition = this.player.position.clone();
        
        // Add the "behind" offset
        cameraPosition.add(behindPlayer);
        
        // Add height offset
        cameraPosition.y += this.cameraSettings.height;
        
        // Set camera position
        this.camera.position.copy(cameraPosition);
        
        // Calculate look target (in front of player)
        const lookTarget = this.player.position.clone();
        
        // Add height offset for player's head
        lookTarget.y += this.cameraSettings.lookOffset;
        
        // Add forward offset
        lookTarget.add(playerForward.clone().multiplyScalar(this.cameraSettings.lookAhead));
        
        // Set camera to look at target
        this.camera.lookAt(lookTarget);
    }
    
    // Check if player has reached the goal
    checkGoalReached() {
        if (!window.flagPole || this.gameState.goalReached) return;
        
        const dx = this.player.position.x - window.flagPole.position.x;
        const dz = this.player.position.z - window.flagPole.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < 1) {
            this.gameState.goalReached = true;
            
            if (this.gameState.levelSystem) {
                this.gameState.levelSystem.showLevelComplete();
            } else {
                document.getElementById('goal-message').style.display = 'block';
            }
        }
    }
    
    // Hide original mobile controls to prevent conflicts
    hideOriginalControls() {
        // List of possible original control element IDs
        const controlIds = [
            'move-joystick-container',
            'camera-joystick-container',
            'jump-button',
            'mobile-instructions'
        ];
        
        // Try to hide each element
        controlIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
                console.log(`Hid original control: ${id}`);
            }
        });
    }
    
    // Log debug information
    logDebugInfo() {
        if (!this.debugMode || !this.player || !this.camera) return;
        
        const debugEl = document.getElementById('fc-debug-info');
        if (!debugEl) return;
        
        const playerPos = this.player.position;
        const cameraPos = this.camera.position;
        
        // Calculate vector from camera to player
        const cameraToPlayer = new THREE.Vector3();
        cameraToPlayer.subVectors(playerPos, cameraPos);
        const distanceToPlayer = cameraToPlayer.length();
        
        // Get player forward direction
        const playerForward = new THREE.Vector3(0, 0, 1);
        playerForward.applyQuaternion(this.player.quaternion);
        
        // Format positions with 2 decimal places
        const formatVec = (v) => `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
        
        debugEl.textContent = 
            `Player: ${formatVec(playerPos)}\n` +
            `Camera: ${formatVec(cameraPos)}\n` +
            `Player Forward: ${formatVec(playerForward)}\n` +
            `Camera Distance: ${distanceToPlayer.toFixed(2)}\n` +
            `Joystick: (${this.joystick.deltaX.toFixed(0)}, ${this.joystick.deltaY.toFixed(0)})\n` +
            `On Ground: ${this.gameState ? this.gameState.playerOnGround : 'unknown'}\n` +
            `Y Velocity: ${this.gameState ? this.gameState.playerVelocity.y.toFixed(2) : 'unknown'}`;
    }
    
    // Reset controls (called when game resets)
    reset() {
        this.resetJoystick();
        
        this.jumpButton.active = false;
        if (this.jumpButton.element) {
            this.jumpButton.element.classList.remove('active');
        }
    }
}

// Initialize fixed follow camera system
window.addEventListener('load', function() {
    window.fixedFollowCamera = new FixedFollowCamera();
    
    // Override reset function to also reset our controls
    const originalResetGame = window.resetGame || function() {};
    window.resetGame = function() {
        originalResetGame();
        
        if (window.fixedFollowCamera) {
            window.fixedFollowCamera.reset();
        }
    };
});