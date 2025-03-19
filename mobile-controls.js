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

        this.lastMoveDirection = new THREE.Vector3(0, 0, 1); // Default forward direction

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
            console.log(`Movement started at (${this.moveStartX}, ${this.moveStartY}) with ID: ${this.moveTouchId}`);
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
        console.log(`Touch moved to (${this.moveCurrentX}, ${this.moveCurrentY})`);
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

            console.log(`Touch ended. Distance: ${distance}`);
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
    
        const moveVector = new THREE.Vector3();
        if (Math.abs(deltaX) > this.movementDeadzone * this.movementScale) {
            this.gameState.keyStates['KeyA'] = deltaX < 0;
            this.gameState.keyStates['KeyD'] = deltaX > 0;
            moveVector.x = deltaX < 0 ? -1 : 1;
        }
        if (Math.abs(deltaY) > this.movementDeadzone * this.movementScale) {
            this.gameState.keyStates['KeyW'] = deltaY < 0;
            this.gameState.keyStates['KeyS'] = deltaY > 0;
            moveVector.z = deltaY < 0 ? 1 : -1;
        }
    
        // Update lastMoveDirection if there's significant movement
        if (moveVector.length() > 0) {
            this.lastMoveDirection.copy(moveVector).normalize();
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