// Mobile Controls for Red Panda Explorer
class MobileControls {
    constructor() {
        this.isMobile = this.checkIfMobile();
        if (!this.isMobile) {
            console.log("Not a mobile device, skipping mobile controls");
            return;
        }

        console.log("Initializing mobile controls");

        this.player = null;
        this.camera = null;
        this.gameState = null;

        this.moveTouchId = null;
        this.moveStartX = 0;
        this.moveStartY = 0;
        this.moveCurrentX = 0;
        this.moveCurrentY = 0;
        this.jumpTriggered = false;

        this.movementDeadzone = 20;
        this.movementScale = 0.015;
        this.cameraLocked = true;

        this.initMobileUI();
        this.addEventListeners();
        this.initialized = false;
        this.connectToGameTimer = setInterval(() => this.connectToGame(), 100);
        this.cameraUpdateModified = false;
    }

    checkIfMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log("Mobile check:", isMobile);
        return isMobile;
    }

    initMobileUI() {
        console.log("Initializing mobile UI");
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
    }

    addEventListeners() {
        console.log("Adding touch event listeners");
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.fixGameButtonsForTouch();
    }

    handleTouchStart(event) {
        console.log("Touch start event received", event.touches.length);
        
        if (!this.initialized) {
            console.log("Touch start ignored - not initialized yet");
            return;
        }

        if (this.isUIElement(event.target)) {
            console.log("Touch on UI element:", event.target);
            return;
        }

        const touch = event.touches[0];
        if (!this.moveTouchId) {
            this.moveTouchId = touch.identifier;
            this.moveStartX = this.moveCurrentX = touch.clientX;
            this.moveStartY = this.moveCurrentY = touch.clientY;
            //console.log(`Movement started at (${this.moveStartX}, ${this.moveStartY}) with ID: ${this.moveTouchId}`);
            event.preventDefault();
        } else {
            console.log("Touch start ignored - movement already active");
        }
    }

    handleTouchMove(event) {
        if (!this.initialized || !this.moveTouchId) {
            console.log("Touch move ignored - not initialized or no active touch");
            return;
        }

        const touch = Array.from(event.touches).find(t => t.identifier === this.moveTouchId);
        if (!touch) {
            console.log("Touch move ignored - no matching touch ID found");
            return;
        }

        this.moveCurrentX = touch.clientX;
        this.moveCurrentY = touch.clientY;
        //console.log(`Touch moved to (${this.moveCurrentX}, ${this.moveCurrentY})`);
        this.updateMovement();
        event.preventDefault();
    }

    handleTouchEnd(event) {
        if (!this.initialized) {
            console.log("Touch end ignored - not initialized");
            return;
        }

        const touch = event.changedTouches[0];
        if (this.moveTouchId === touch.identifier) {
            const deltaX = touch.clientX - this.moveStartX;
            const deltaY = touch.clientY - this.moveStartY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            //console.log(`Touch ended. Distance: ${distance}`);
            if (distance < this.movementDeadzone && !this.isUIElement(event.target)) {
                this.triggerJump();
            }

            this.moveTouchId = null;
            this.resetMovementKeys();
            event.preventDefault();
        }
    }

    updateMovement() {
        if (!this.gameState) {
            console.log("Cannot update movement - gameState not available");
            return;
        }

        const deltaX = (this.moveCurrentX - this.moveStartX) * this.movementScale;
        const deltaY = (this.moveCurrentY - this.moveStartY) * this.movementScale;

        this.resetMovementKeys();

        if (Math.abs(deltaX) > this.movementDeadzone * this.movementScale) {
            this.gameState.keyStates['KeyA'] = deltaX < 0;
            this.gameState.keyStates['KeyD'] = deltaX > 0;
            //console.log(`Horizontal movement: ${deltaX < 0 ? 'Left' : 'Right'}`);
        }
        if (Math.abs(deltaY) > this.movementDeadzone * this.movementScale) {
            this.gameState.keyStates['KeyW'] = deltaY < 0;
            this.gameState.keyStates['KeyS'] = deltaY > 0;
            //console.log(`Vertical movement: ${deltaY < 0 ? 'Forward' : 'Backward'}`);
        }
    }

    resetMovementKeys() {
        if (!this.gameState) return;
        this.gameState.keyStates['KeyW'] = false;
        this.gameState.keyStates['KeyA'] = false;
        this.gameState.keyStates['KeyS'] = false;
        this.gameState.keyStates['KeyD'] = false;
    }

    triggerJump() {
        if (!this.gameState || this.jumpTriggered) {
            console.log("Jump ignored - gameState missing or already jumping");
            return;
        }

        console.log("Jump triggered");
        this.jumpTriggered = true;
        this.gameState.keyStates['Space'] = true;
        setTimeout(() => {
            this.gameState.keyStates['Space'] = false;
            this.jumpTriggered = false;
            console.log("Jump reset");
        }, 100);
    }

    isUIElement(target) {
        const isUI = target.tagName === 'BUTTON' || 
                     target.closest('#instructions') || 
                     target.closest('#goal-message') || 
                     target.closest('#level-complete-content') || 
                     target.closest('#game-over-screen');
        return isUI;
    }

    connectToGame() {
        if (window.gameState && window.camera && window.player) {
            this.gameState = window.gameState;
            this.camera = window.camera;
            this.player = window.player;
            this.initialized = true;
            
            console.log("Connected to game objects:", {
                gameState: !!this.gameState,
                camera: !!this.camera,
                player: !!this.player
            });
            
            clearInterval(this.connectToGameTimer);
        } else {
            console.log("Waiting for game objects...", {
                gameState: !!window.gameState,
                camera: !!window.camera,
                player: !!window.player
            });
        }
    }

    fixGameButtonsForTouch() {
        console.log("Fixing game buttons for touch");
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('touchstart', (e) => {
                console.log(`Button touched: ${button.id}`);
                e.stopPropagation();
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
        });

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            const newButtons = node.querySelectorAll ? node.querySelectorAll('button') : [];
                            newButtons.forEach(button => this.fixButtonTouch(button));
                        }
                    });
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    fixButtonTouch(button) {
        button.addEventListener('touchstart', (e) => {
            console.log(`New button touched: ${button.id}`);
            e.stopPropagation();
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
    }

    update() {
        if (!this.isMobile || !this.initialized) return;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded, creating mobile controls");
    window.mobileControls = new MobileControls();
});

(function() {
    console.log("Setting up animation hook");
    const hookInterval = setInterval(() => {
        if (typeof window.animate === 'function' && window.mobileControls) {
            const originalAnimate = window.animate;
            window.animate = function(currentTime) {
                const result = originalAnimate(currentTime);
                if (window.mobileControls.isMobile && window.mobileControls.initialized) {
                    window.mobileControls.update();
                }
                return result;
            };
            clearInterval(hookInterval);
            console.log("Animation loop hooked");
        }
    }, 500);
    setTimeout(() => clearInterval(hookInterval), 10000);
})();

/* Camera flip function */

(function() {
    // Only run this code for mobile devices
    if (!window.mobileControls || !window.mobileControls.isMobile) {
        console.log("Camera flip button not added - not a mobile device");
        return;
    }
    
    // Make sure we can access cameraAngleHorizontal
    if (typeof window.cameraAngleHorizontal === 'undefined') {
        // Expose cameraAngleHorizontal from game.js to the global scope
        let setupCameraAngle = setInterval(() => {
            if (window.gameState) {
                window.cameraAngleHorizontal = 0; // Initialize if not already defined
                console.log("Initialized global cameraAngleHorizontal");
                clearInterval(setupCameraAngle);
            }
        }, 100);
        
        // Clear interval after 5 seconds to avoid potential memory leaks
        setTimeout(() => clearInterval(setupCameraAngle), 5000);
    }
    
    console.log("Setting up camera flip button for mobile");
    
    // Create the button element
    function createCameraFlipButton() {
        // Create button element
        const button = document.createElement('button');
        button.id = 'camera-flip-button';
        button.innerHTML = '↻';
        button.title = 'Flip Camera';
        
        // Add styles directly to the button
        button.style.position = 'fixed';
        button.style.top = '10px';
        button.style.left = '10px';
        button.style.width = '50px';
        button.style.height = '50px';
        button.style.fontSize = '24px';
        button.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        button.style.color = '#84ffef'; // Neon cyan
        button.style.border = '2px solid #84ffef';
        button.style.borderRadius = '50%';
        button.style.zIndex = '150';
        button.style.cursor = 'pointer';
        button.style.display = 'flex';
        button.style.justifyContent = 'center';
        button.style.alignItems = 'center';
        button.style.boxShadow = '0 0 10px rgba(132, 255, 239, 0.6)'; // Cyan glow
        
        // Append to body
        document.body.appendChild(button);
        
        // Move the instructions a bit to the right to make room for the button
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.style.left = '70px';
        }
        
        console.log("Camera flip button created");
        return button;
    }
    
    // Wait for game elements to be ready
    const initInterval = setInterval(() => {
        if (window.camera && window.gameState) {
            clearInterval(initInterval);
            
            console.log("Game objects ready, adding camera flip button");
            
            // Create the button
            const flipButton = createCameraFlipButton();
            
            // Add click event
            flipButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Rotate camera angle by 180 degrees
                window.cameraAngleHorizontal = (window.cameraAngleHorizontal + Math.PI) % (Math.PI * 2);
                
                console.log("Camera flipped to", window.cameraAngleHorizontal);
                
                // Visual feedback that button was pressed
                flipButton.style.backgroundColor = 'rgba(132, 255, 239, 0.3)';
                setTimeout(() => {
                    flipButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                }, 300);
            });
            
            // Handle game overlay visibility
            const handleOverlayVisibility = () => {
                // Check if any overlay is visible
                const instructionsVisible = document.getElementById('instructions').style.display !== 'none';
                const goalMessageVisible = document.getElementById('goal-message').style.display === 'block';
                const levelCompleteVisible = !document.getElementById('level-complete-content').classList.contains('hidden');
                const gameOverVisible = !document.getElementById('game-over-screen').classList.contains('hidden');
                
                // Hide button if any overlay is visible
                flipButton.style.display = (instructionsVisible || goalMessageVisible || levelCompleteVisible || gameOverVisible) ? 'none' : 'flex';
            };
            
            // Set up a mutation observer to monitor overlay visibility changes
            const observer = new MutationObserver((mutations) => {
                handleOverlayVisibility();
            });
            
            // Observe changes to display style and class list for relevant elements
            const overlayElements = [
                document.getElementById('instructions'),
                document.getElementById('goal-message'),
                document.getElementById('level-complete-content'),
                document.getElementById('game-over-screen')
            ];
            
            overlayElements.forEach(element => {
                if (element) {
                    observer.observe(element, { 
                        attributes: true, 
                        attributeFilter: ['style', 'class'] 
                    });
                }
            });
            
            // Initial check for overlay visibility
            handleOverlayVisibility();
            
            console.log("Camera flip button setup complete");
        }
    }, 100);
    
    // Stop checking after 10 seconds to prevent potential memory leaks
    setTimeout(() => clearInterval(initInterval), 10000);
})();