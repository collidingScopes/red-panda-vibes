// Mobile Controls for Red Panda Explorer
class MobileControls {
    constructor() {
        this.isMobile = this.checkIfMobile();
        if (!this.isMobile) return;

        // Game object references
        this.player = null;
        this.camera = null;
        this.gameState = null;

        // Touch control state
        this.moveTouchId = null;
        this.moveStartX = 0;
        this.moveStartY = 0;
        this.moveCurrentX = 0;
        this.moveCurrentY = 0;
        this.jumpTriggered = false;

        // Movement parameters
        this.movementDeadzone = 20;
        this.movementScale = 0.015;
        this.cameraLocked = true;

        this.initMobileUI();
        this.addEventListeners();
        this.initialized = false;
        this.connectToGameTimer = setInterval(() => this.connectToGame(), 500);
        this.cameraUpdateModified = false;

        console.log("Mobile controls initialized");
    }

    checkIfMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    initMobileUI() {
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
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        // Ensure UI buttons work with touch
        this.fixGameButtonsForTouch();
    }

    handleTouchStart(event) {
        // Ignore if game not initialized or touch on UI element
        if (!this.initialized || this.isUIElement(event.target)) return;

        const touch = event.touches[0];
        
        // If no movement touch is active, start movement
        if (!this.moveTouchId) {
            this.moveTouchId = touch.identifier;
            this.moveStartX = this.moveCurrentX = touch.clientX;
            this.moveStartY = this.moveCurrentY = touch.clientY;
            event.preventDefault();
        }
    }

    handleTouchMove(event) {
        if (!this.initialized || !this.moveTouchId) return;

        const touch = Array.from(event.touches).find(t => t.identifier === this.moveTouchId);
        if (!touch) return;

        this.moveCurrentX = touch.clientX;
        this.moveCurrentY = touch.clientY;
        this.updateMovement();
        event.preventDefault();
    }

    handleTouchEnd(event) {
        if (!this.initialized) return;

        const touch = event.changedTouches[0];
        
        // Handle movement touch ending
        if (this.moveTouchId === touch.identifier) {
            const deltaX = touch.clientX - this.moveStartX;
            const deltaY = touch.clientY - this.moveStartY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // If it was a short tap (not a drag), trigger jump
            if (distance < this.movementDeadzone && !this.isUIElement(event.target)) {
                this.triggerJump();
            }

            // Reset movement
            this.moveTouchId = null;
            this.resetMovementKeys();
            event.preventDefault();
        }
    }

    updateMovement() {
        if (!this.gameState) return;

        const deltaX = (this.moveCurrentX - this.moveStartX) * this.movementScale;
        const deltaY = (this.moveCurrentY - this.moveStartY) * this.movementScale;

        // Reset movement keys
        this.resetMovementKeys();

        // Apply movement based on drag distance
        if (Math.abs(deltaX) > this.movementDeadzone * this.movementScale) {
            this.gameState.keyStates['KeyA'] = deltaX < 0;
            this.gameState.keyStates['KeyD'] = deltaX > 0;
        }
        if (Math.abs(deltaY) > this.movementDeadzone * this.movementScale) {
            this.gameState.keyStates['KeyW'] = deltaY < 0;
            this.gameState.keyStates['KeyS'] = deltaY > 0;
        }
    }

    resetMovementKeys() {
        this.gameState.keyStates['KeyW'] = false;
        this.gameState.keyStates['KeyA'] = false;
        this.gameState.keyStates['KeyS'] = false;
        this.gameState.keyStates['KeyD'] = false;
    }

    triggerJump() {
        if (!this.gameState || this.jumpTriggered) return;
        
        this.jumpTriggered = true;
        this.gameState.keyStates['Space'] = true;
        
        // Reset jump after a short delay
        setTimeout(() => {
            this.gameState.keyStates['Space'] = false;
            this.jumpTriggered = false;
        }, 100);
    }

    isUIElement(target) {
        return target.tagName === 'BUTTON' || 
               target.closest('#instructions') || 
               target.closest('#goal-message') || 
               target.closest('#level-complete-content') || 
               target.closest('#game-over-screen');
    }

    connectToGame() {
        if (window.gameState && window.camera && window.player) {
            this.gameState = window.gameState;
            this.camera = window.camera;
            this.player = window.player;
            this.initialized = true;
            
            setTimeout(() => this.overrideCameraUpdate(), 2000);
            clearInterval(this.connectToGameTimer);
        }
    }

    overrideCameraUpdate() {
        if (this.cameraUpdateModified) return;

        const originalUpdateCamera = window.updateCamera;
        if (typeof originalUpdateCamera === 'function') {
            window.updateCamera = () => {
                originalUpdateCamera();
                if (this.isMobile && this.player && this.camera && this.gameState.playerOnGround) {
                    this.adjustMobileCamera();
                }
            };
            this.cameraUpdateModified = true;
            console.log("Camera update function overridden for mobile");
        }
    }

    adjustMobileCamera() {
        if (!this.camera || !this.player) return;

        const playerForward = new THREE.Vector3(0, 0, 1);
        playerForward.applyQuaternion(this.player.quaternion);
        playerForward.normalize();

        if (window.cameraAngleHorizontal !== undefined) {
            const targetAngle = Math.atan2(playerForward.x, playerForward.z);
            let angleDiff = targetAngle - window.cameraAngleHorizontal;
            if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            window.cameraAngleHorizontal += angleDiff * 0.1;
        }
    }

    fixGameButtonsForTouch() {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('touchstart', (e) => {
                e.stopPropagation(); // Prevent movement/jump from triggering
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
        // Movement is handled in touch events, no need for continuous update here
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.mobileControls = new MobileControls();
});

(function() {
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
            console.log("Animation loop hooked for mobile controls");
        }
    }, 500);
    setTimeout(() => clearInterval(hookInterval), 10000);
})();