// Mobile Controls for Red Panda Explorer
class MobileControls {
    // Constants for configuration
    static DEBUG = false;                // Set to true to enable debug logging
    static MOVEMENT_DEADZONE = 20;       // Pixels of movement to ignore
    static MOVEMENT_SCALE = 0.015;       // Scaling factor for touch movement
    static JUMP_DURATION = 100;          // Ms for jump touch duration
    static MAX_INIT_WAIT = 10000;        // Max time to wait for game initialization (ms)
    static INIT_CHECK_INTERVAL = 100;    // How often to check for game objects (ms)
    
    /**
     * Creates a new mobile controls instance
     */
    constructor() {
        // Check if we're on a mobile device
        if (!this.isMobileDevice()) {
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
        this.moveStartX = 0;
        this.moveStartY = 0;
        this.moveCurrentX = 0;
        this.moveCurrentY = 0;
        this.jumpTriggered = false;
        
        // Cache DOM elements
        this.instructionsElement = document.getElementById('instructions');
        this.goalMessageElement = document.getElementById('goal-message');
        this.gameOverElement = document.getElementById('game-over-screen');
        this.levelCompleteElement = document.getElementById('level-complete-content');
        
        // Initialize UI and event listeners
        this.initMobileUI();
        this.setupEventListeners();
        
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
     * Checks if the current device is a mobile device
     * @return {boolean} True if on a mobile device
     */
    isMobileDevice() {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
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

    // =============== UI CREATION METHODS ===============
    
    /**
     * Initializes mobile-specific UI changes
     */
    initMobileUI() {
        this.log("Initializing mobile UI");
        
        // Create style element for mobile-specific CSS
        const styleElement = document.createElement('style');
        styleElement.textContent = `
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
                #instructions p:nth-child(2),
                #instructions p:nth-child(3) {
                    display: none;
                }
                #instructions::after {
                    content: "👆 Drag to move, tap to jump";
                    display: block;
                    margin-top: 8px;
                    font-size: 14px;
                }
            }
        `;
        document.head.appendChild(styleElement);
        
        // Create camera flip button
        this.createCameraFlipButton();
    }
    
    /**
     * Creates a camera flip button for quick camera rotation
     */
    createCameraFlipButton() {
        const button = document.createElement('button');
        button.id = 'camera-flip-button';
        button.innerHTML = '↻';
        button.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            width: 50px;
            height: 50px;
            font-size: 24px;
            background-color: rgba(0, 0, 0, 0.5);
            color: #84ffef;
            border: 2px solid #84ffef;
            border-radius: 50%;
            z-index: 150;
            display: none;
            justify-content: center;
            align-items: center;
            box-shadow: 0 0 10px rgba(132, 255, 239, 0.6);
        `;
        document.body.appendChild(button);
        
        // Adjust instructions position if camera flip button exists
        if (this.instructionsElement) {
            this.instructionsElement.style.left = '70px';
        }
        
        // Add touch event for camera flip
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (window.cameraAngleHorizontal !== undefined) {
                window.cameraAngleHorizontal = (window.cameraAngleHorizontal + Math.PI) % (Math.PI * 2);
                this.log(`Camera flipped to ${window.cameraAngleHorizontal}`);
                
                // Visual feedback
                button.style.backgroundColor = 'rgba(132, 255, 239, 0.3)';
                setTimeout(() => button.style.backgroundColor = 'rgba(0, 0, 0, 0.5)', 300);
            }
        }, { passive: false });
        
        // Store reference for later use
        this.cameraFlipButton = button;
    }
    
    /**
     * Updates the camera flip button visibility based on overlay presence
     */
    updateCameraFlipButtonVisibility() {
        if (!this.cameraFlipButton) return;
        
        const overlaysVisible = [
            this.instructionsElement,
            this.goalMessageElement,
            this.levelCompleteElement,
            this.gameOverElement
        ].some(el => {
            return el && (el.style.display === 'block' || !el.classList.contains('hidden'));
        });
        
        this.cameraFlipButton.style.display = overlaysVisible ? 'none' : 'flex';
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
        
        // Fix touch handling for game buttons
        this.setupTouchForGameButtons();
        
        // Set up observers for overlay visibility
        this.setupOverlayObservers();
    }
    
    /**
     * Sets up mutation observers for overlay visibility changes
     */
    setupOverlayObservers() {
        const overlays = [
            this.instructionsElement,
            this.goalMessageElement,
            this.levelCompleteElement, 
            this.gameOverElement
        ];
        
        // Create observer for overlay visibility changes
        const observer = new MutationObserver(() => {
            this.updateCameraFlipButtonVisibility();
        });
        
        // Observe each overlay for attribute changes
        overlays.forEach(el => {
            if (el) {
                observer.observe(el, { 
                    attributes: true, 
                    attributeFilter: ['style', 'class'] 
                });
            }
        });
        
        // Initial update
        this.updateCameraFlipButtonVisibility();
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
     * Handles the start of a touch event
     * @param {TouchEvent} event - The touch start event
     */
    handleTouchStart(event) {
        if (!this.initialized) {
            this.log("Touch start ignored - not initialized yet");
            return;
        }

        const touch = event.touches[0];
        
        // Skip if touching a UI element
        if (this.isUIElement(event.target)) {
            this.log("Touch on UI element:", event.target);
            return;
        }
        
        // Skip if already tracking a touch
        if (this.moveTouchId !== null) {
            return;
        }

        // Start tracking this touch
        this.moveTouchId = touch.identifier;
        this.moveStartX = this.moveCurrentX = touch.clientX;
        this.moveStartY = this.moveCurrentY = touch.clientY;
        this.log(`Movement started at (${this.moveStartX}, ${this.moveStartY}) with ID: ${this.moveTouchId}`);
        event.preventDefault();
    }

    /**
     * Handles touch movement for player control
     * @param {TouchEvent} event - The touch move event
     */
    handleTouchMove(event) {
        if (!this.initialized || this.moveTouchId === null) {
            return;
        }

        // Find the touch we're tracking
        const touch = Array.from(event.touches).find(t => t.identifier === this.moveTouchId);
        if (!touch) {
            return;
        }

        // Update current position
        this.moveCurrentX = touch.clientX;
        this.moveCurrentY = touch.clientY;
        this.updateMovement();
        event.preventDefault();
    }

    /**
     * Handles the end of a touch event
     * @param {TouchEvent} event - The touch end event
     */
    handleTouchEnd(event) {
        if (!this.initialized) {
            return;
        }

        // Check if this is the touch we're tracking
        const touch = Array.from(event.changedTouches).find(t => t.identifier === this.moveTouchId);
        if (touch) {
            // Calculate movement distance
            const deltaX = touch.clientX - this.moveStartX;
            const deltaY = touch.clientY - this.moveStartY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // If minimal movement, treat as tap (jump)
            if (distance < MobileControls.MOVEMENT_DEADZONE && !this.isUIElement(event.target)) {
                this.triggerJump();
            }

            // Stop tracking this touch
            this.moveTouchId = null;
            this.resetMovementKeys();
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
               target.closest('#camera-flip-button');
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
            
            this.log("Connected to game objects successfully");
            
            // Show camera flip button once connected
            if (this.cameraFlipButton) {
                this.updateCameraFlipButtonVisibility();
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Game loop update function
     */
    update() {
        // Currently empty, but could be used for continuous updates
        // if needed in the future
    }
}

// Initialize mobile controls when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mobileControls = new MobileControls();
});

// Hook into the animation loop to enable update calls
(function() {
    const hookInterval = setInterval(() => {
        if (typeof window.animate === 'function' && window.mobileControls) {
            const originalAnimate = window.animate;
            window.animate = function(currentTime) {
                const result = originalAnimate(currentTime);
                if (window.mobileControls.initialized) {
                    window.mobileControls.update();
                }
                return result;
            };
            clearInterval(hookInterval);
            if (MobileControls.DEBUG) {
                console.log("[MobileControls] Animation loop hooked");
            }
        }
    }, 500);
    
    // Safety timeout
    setTimeout(() => clearInterval(hookInterval), 10000);
})();