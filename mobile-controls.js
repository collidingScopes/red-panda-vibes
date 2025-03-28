// Mobile Controls for Red Panda Explorer

class MobileControls {
    // Constants for configuration
    static DEBUG = false;                // Set to true to enable debug logging
    static MOVEMENT_DEADZONE = 10;       // Pixels of movement to ignore
    static MOVEMENT_SCALE = 0.015;       // Scaling factor for touch movement
    static JUMP_DURATION = 100;          // Ms for jump touch duration
    static MAX_INIT_WAIT = 10000;        // Max time to wait for game initialization (ms)
    static INIT_CHECK_INTERVAL = 100;    // How often to check for game objects (ms)
    
    /**
     * Creates a new mobile controls instance
     */
    constructor() {
        // Check if we're on a mobile device
        if (!isMobile) {
            this.log("Not a mobile device, skipping mobile controls");
            return;
        }

        this.log("Initializing mobile controls");

        // Game object references
        this.player = null;
        this.camera = null;
        this.gameState = null;

        // Touch tracking variables
        this.moveTouchId = null;
        this.jumpTouchId = null;
        this.moveStartX = 0;
        this.moveStartY = 0;
        this.moveCurrentX = 0;
        this.moveCurrentY = 0;
        this.jumpTriggered = false;
        this.activeTouches = new Map(); // Track all active touches by ID
        
        // Cache DOM elements
        this.instructionsElement = document.getElementById('instructions');
        this.goalMessageElement = document.getElementById('goal-message');
        this.gameOverElement = document.getElementById('game-over-screen');
        this.levelCompleteElement = document.getElementById('level-complete-content');
        
        // Initialize UI and event listeners
        this.log("Initializing mobile UI");
        
        // Setup orientation change and resize handling
        this.setupOrientationHandling();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Add tap handler for additional jump detection
        this.setupTapHandler();
        
        // Track initialization state
        this.initialized = false;
        
        // Start connecting to the game with a safety timeout
        this.connectToGameWithTimeout();
    }

    /**
     * Logs a message if debug mode is enabled
     * @param {string} message - The message to log
     */
    log(message) {
        if (MobileControls.DEBUG) {
            console.log(`[MobileControls] ${message}`);
        }
    }

    /**
     * Creates throttled version of a function that limits how often it can be called
     * @param {Function} callback - The function to throttle
     * @param {number} delay - Minimum ms between calls
     * @return {Function} The throttled function
     */
    throttle(callback, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                callback.apply(this, args);
            }
        };
    }

    /**
     * Sets up orientation change and resize handling
     */
    setupOrientationHandling() {
        // Handle both orientation change and resize events
        window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
        window.addEventListener('resize', this.throttle(this.handleResize.bind(this), 100));
        
        // Initial resize
        this.handleResize();
    }
    
    /**
     * Handles orientation change event
     */
    handleOrientationChange() {
        this.log("Orientation changed");
        
        // We need to wait a bit for the browser to complete the orientation change
        setTimeout(() => {
            this.handleResize();
        }, 200);
    }
    
    /**
     * Handles resize event - adjusts renderer and camera
     */
    handleResize() {
        if (!window.renderer || !window.camera) {
            this.log("Renderer or camera not ready for resize");
            return;
        }
        
        this.log("Resizing view");
        
        // Update renderer size to fill viewport
        window.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update camera aspect ratio
        window.camera.aspect = window.innerWidth / window.innerHeight;
        window.camera.updateProjectionMatrix();
        
        // Get current viewport dimensions and aspect ratio
        const currentAspect = window.innerWidth / window.innerHeight;
        const isPortrait = currentAspect < 1;
        const baseAspect = 16 / 9; // Reference aspect ratio (landscape)
        const baseDistance = 8.0;  // Original camera distance
        
        // Calculate new camera distance: 
        let aspectFactor;
        
        if (isPortrait) {
            aspectFactor = 1.6;
            this.log(`Portrait mode detected - setting camera factor: ${aspectFactor}`);
        } else {
            // Normal landscape - use base distance
            aspectFactor = 1.0;
        }
        
        // Set the new camera distance
        window.cameraDistance = baseDistance * aspectFactor;
        
        this.log(`Adjusted camera distance to ${window.cameraDistance} (aspect: ${currentAspect}, portrait: ${isPortrait})`);
        
        // Maintain pixel ratio setting
        if (window.pixelRatio) {
            window.renderer.setPixelRatio(window.pixelRatio);
        }
    }

    // =============== EVENT HANDLING METHODS ===============
    
    /**
     * Sets up event listeners for touch controls
     */
    setupEventListeners() {
        this.log("Setting up event listeners");
        
        // Touch events with throttling for move events
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchmove', 
            this.throttle((e) => this.handleTouchMove(e), 16), // ~60fps
            { passive: false }
        );
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        document.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
        
        // Fix touch handling for game buttons
        this.setupTouchForGameButtons();
    }
    
    /**
     * Adds touch event handling to game buttons
     */
    setupTouchForGameButtons() {
        // Function to handle button touch
        const handleButtonTouch = (button) => {
            button.addEventListener('touchstart', (e) => {
                this.log(`Button touched: ${button.id || button.textContent}`);
                e.stopPropagation();
                
                // Simulate Enter key press for specific buttons
                if (['next-level-button', 'retry-button', 'close-instructions'].includes(button.id)) {
                    setTimeout(() => {
                        const enterEvent = new KeyboardEvent('keydown', {
                            code: 'Enter',
                            key: 'Enter',
                            bubbles: true
                        });
                        document.dispatchEvent(enterEvent);
                    }, 100);
                }
            });
        };
        
        // Apply to existing buttons
        document.querySelectorAll('button').forEach(button => {
            handleButtonTouch(button);
        });
        
        // Watch for new buttons being added
        const buttonObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            // Check if node is a button
                            if (node.tagName === 'BUTTON') {
                                handleButtonTouch(node);
                            }
                            
                            // Check child buttons
                            const childButtons = node.querySelectorAll ? 
                                node.querySelectorAll('button') : [];
                            childButtons.forEach(button => handleButtonTouch(button));
                        }
                    });
                }
            });
        });
        
        // Observe only specific containers likely to have dynamically added buttons
        const containers = [
            document.body,
            this.instructionsElement,
            this.goalMessageElement,
            this.levelCompleteElement,
            this.gameOverElement
        ];
        
        containers.forEach(container => {
            if (container) {
                buttonObserver.observe(container, { 
                    childList: true, 
                    subtree: true 
                });
            }
        });
    }
    
    /**
     * Handles the start of a touch event - updated for multi-touch
     * @param {TouchEvent} event - The touch start event
     */
    handleTouchStart(event) {
        if (!this.initialized) {
            this.log("Touch start ignored - not initialized yet");
            return;
        }

        // Check first if this could be a simple tap-to-jump
        // If there's no active movement touch, consider this a potential jump
        let isPotentialJump = this.moveTouchId === null;

        // Process each touch in the event
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            
            // Skip if touching a UI element
            if (this.isUIElement(event.target)) {
                this.log("Touch on UI element:", event.target);
                continue;
            }
            
            // Store touch information with timestamp
            this.activeTouches.set(touch.identifier, {
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                startTime: Date.now(),
                isMovementTouch: false,
                isJumpTouch: false,
                potentialTapJump: isPotentialJump // Flag this as a potential tap jump if we have no movement touch
            });
            
            // If this is the first touch and we don't have a movement touch yet, use it for potential movement
            if (this.moveTouchId === null) {
                this.moveTouchId = touch.identifier;
                this.moveStartX = touch.clientX;
                this.moveStartY = touch.clientY;
                this.moveCurrentX = touch.clientX;
                this.moveCurrentY = touch.clientY;
                this.activeTouches.get(touch.identifier).isMovementTouch = true;
                this.log(`Movement touch started at (${this.moveStartX}, ${this.moveStartY}) with ID: ${this.moveTouchId}`);
                
                // We'll determine if this is actually a jump in handleTouchEnd based on duration and movement
            } 
            // If this is a second touch or beyond, always trigger a jump
            else {
                this.jumpTouchId = touch.identifier;
                this.activeTouches.get(touch.identifier).isJumpTouch = true;
                this.triggerJump();
                this.log(`Additional touch detected - triggering jump with ID: ${touch.identifier}`);
            }
        }
        
        // Prevent default behavior to avoid scrolling
        if (!this.isUIElement(event.target)) {
            event.preventDefault();
        }
    }

    /**
     * Handles touch movement for player control - updated for multi-touch
     * @param {TouchEvent} event - The touch move event
     */
    handleTouchMove(event) {
        if (!this.initialized) {
            return;
        }

        // Process each moved touch
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            
            // Update the touch data in our map
            if (this.activeTouches.has(touch.identifier)) {
                const touchData = this.activeTouches.get(touch.identifier);
                
                // Update touch data
                touchData.currentX = touch.clientX;
                touchData.currentY = touch.clientY;
                
                // If this is our movement touch, update movement
                if (touch.identifier === this.moveTouchId) {
                    this.moveCurrentX = touch.clientX;
                    this.moveCurrentY = touch.clientY;
                    
                    // Update player movement
                    this.updateMovement();
                }
            }
        }
        
        // Prevent default behavior to avoid scrolling
        if (!this.isUIElement(event.target)) {
            event.preventDefault();
        }
    }

    /**
     * Handles the end of a touch event - updated for multi-touch
     * @param {TouchEvent} event - The touch end event
     */
    handleTouchEnd(event) {
        if (!this.initialized) {
            return;
        }
    
        // Process each ended touch
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            
            // Check if this touch is in our tracked touches
            if (this.activeTouches.has(touch.identifier)) {
                const touchData = this.activeTouches.get(touch.identifier);
                
                // Calculate touch duration and movement
                const touchDuration = Date.now() - (touchData.startTime || 0);
                const deltaX = touchData.currentX - touchData.startX;
                const deltaY = touchData.currentY - touchData.startY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                this.log(`Touch ended - Duration: ${touchDuration}ms, Distance: ${distance.toFixed(2)}px`);
                
                // Detect tap-to-jump: short duration with minimal movement
                if (touchDuration < 300 && distance < MobileControls.MOVEMENT_DEADZONE * 1.5) {
                    // If this is the movement touch but it was just a quick tap with minimal movement,
                    // treat it as a jump instead of movement
                    this.triggerJump();
                    this.log("Jump triggered from quick tap");
                }
                
                // If this was our movement touch, reset it
                if (touch.identifier === this.moveTouchId) {
                    this.moveTouchId = null;
                    this.resetMovementKeys();
                    
                    // Try to find another touch to use for movement
                    for (const [id, data] of this.activeTouches.entries()) {
                        if (id !== touch.identifier && !data.isJumpTouch) {
                            this.moveTouchId = id;
                            this.moveStartX = data.startX;
                            this.moveStartY = data.startY;
                            this.moveCurrentX = data.currentX;
                            this.moveCurrentY = data.currentY;
                            data.isMovementTouch = true;
                            this.updateMovement();
                            break;
                        }
                    }
                }
                
                // If this was our jump touch, reset it
                if (touch.identifier === this.jumpTouchId) {
                    this.jumpTouchId = null;
                }
                
                // Remove the touch from our map
                this.activeTouches.delete(touch.identifier);
            }
        }
        
        // Prevent default behavior
        if (!this.isUIElement(event.target)) {
            event.preventDefault();
        }
    }
    
    /**
     * Checks if an element is part of the UI
     * @param {HTMLElement} target - The element to check
     * @return {boolean} True if element is part of the UI
     */
    isUIElement(target) {
        return target.tagName === 'BUTTON' || 
               target.closest('#instructions') || 
               target.closest('#goal-message') || 
               target.closest('#level-complete-content') || 
               target.closest('#game-over-screen') ||
               target.closest('#instruction-button') ||
               target.closest('#sound-toggle') ||
               target.closest('#level-select') ||
               target.closest('#level-select-container') ||
               target.closest('#feedback-button') ||
               target.closest('#level-indicator');
    }
    
    // =============== GAME CONTROL METHODS ===============
    
    /**
     * Updates player movement based on touch position
     */
    updateMovement() {
        if (!this.gameState) {
            return;
        }

        const deltaX = (this.moveCurrentX - this.moveStartX) * MobileControls.MOVEMENT_SCALE;
        const deltaY = (this.moveCurrentY - this.moveStartY) * MobileControls.MOVEMENT_SCALE;
        const deadzone = MobileControls.MOVEMENT_DEADZONE * MobileControls.MOVEMENT_SCALE;

        // Reset all movement keys first
        this.resetMovementKeys();

        // Apply horizontal movement if beyond deadzone
        if (Math.abs(deltaX) > deadzone) {
            this.gameState.keyStates['KeyA'] = deltaX < 0;
            this.gameState.keyStates['KeyD'] = deltaX > 0;
        }
        
        // Apply vertical movement if beyond deadzone
        if (Math.abs(deltaY) > deadzone) {
            this.gameState.keyStates['KeyW'] = deltaY < 0;
            this.gameState.keyStates['KeyS'] = deltaY > 0;
        }
    }

    /**
     * Resets all movement key states
     */
    resetMovementKeys() {
        if (!this.gameState) return;
        
        this.gameState.keyStates['KeyW'] = false;
        this.gameState.keyStates['KeyA'] = false;
        this.gameState.keyStates['KeyS'] = false;
        this.gameState.keyStates['KeyD'] = false;
    }

    /**
     * Triggers a jump action
     */
    triggerJump() {
        if (!this.gameState || this.jumpTriggered) {
            return;
        }

        this.log("Jump triggered");
        this.jumpTriggered = true;
        this.gameState.keyStates['Space'] = true;
        
        // Reset jump after a short delay
        setTimeout(() => {
            if (this.gameState) {
                this.gameState.keyStates['Space'] = false;
            }
            this.jumpTriggered = false;
        }, MobileControls.JUMP_DURATION);
    }
    
    // =============== GAME CONNECTION METHODS ===============
    
    /**
     * Attempts to connect to game objects with a timeout
     */
    connectToGameWithTimeout() {
        // Clear any existing timer
        if (this.connectToGameTimer) {
            clearInterval(this.connectToGameTimer);
        }
        
        // Set up timeout to stop trying after MAX_INIT_WAIT
        const timeoutId = setTimeout(() => {
            if (this.connectToGameTimer) {
                clearInterval(this.connectToGameTimer);
                this.log("Failed to connect to game objects within timeout period");
            }
        }, MobileControls.MAX_INIT_WAIT);
        
        // Try to connect at regular intervals
        this.connectToGameTimer = setInterval(() => {
            if (this.tryConnectToGame()) {
                clearInterval(this.connectToGameTimer);
                clearTimeout(timeoutId);
            }
        }, MobileControls.INIT_CHECK_INTERVAL);
    }
    
    /**
     * Tries to connect to the game objects
     * @return {boolean} True if successfully connected
     */
    tryConnectToGame() {
        if (window.gameState && window.camera && window.player) {
            this.gameState = window.gameState;
            this.camera = window.camera;
            this.player = window.player;
            this.initialized = true;
            
            // Make renderer globally accessible for resize handling
            window.renderer = renderer;
            
            this.log("Connected to game objects successfully");
            return true;
        }
        
        return false;
    }

    /**
     * Sets up a separate tap handler for jump detection
     */
    setupTapHandler() {
        // Tap detection variables
        this.lastTapTime = 0;
        
        // Create a simple tap handler that works even if the regular touch handling doesn't catch it
        document.addEventListener('click', (event) => {
            // Skip if we're on a UI element, not initialized, or during game over
            if (this.isUIElement(event.target) || !this.initialized || 
                (this.gameState && this.gameState.gameOver)) {
                return;
            }
            
            // Get current time for debouncing
            const now = Date.now();
            
            // Prevent too many rapid taps (debounce)
            if (now - this.lastTapTime < 300) {
                return;
            }
            
            this.lastTapTime = now;
            this.log("Tap detected, triggering jump");
            this.triggerJump();
        });
    }
}

// Initialize mobile controls when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mobileControls = new MobileControls();
});