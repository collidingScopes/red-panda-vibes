class AnimationController {
    constructor() {
        this.mixer = null;
        this.animations = {};
        this.currentAction = null;
        this.previousAction = null;
        
        this.defaultTransitionTime = 0.3;
        
        // State tracking
        this.isJumping = false;
        this.isRunning = false;
        this.isWalkingBackward = false; // New state for backward walking
        this.jumpStarted = false; // Add flag to track if jump animation has already been started
        this.jumpFinishedCallback = null;
        
        // New properties for idle variations
        this.idleTimer = 0;
        this.idleInterval = 5; // How often to potentially switch between idle and dance (in seconds)
        this.isIdle = false;
        this.isDancing = false;
        
        // New property for spin animation after jump kills
        this.isSpinning = false;
        this.spinFinishedCallback = null;
        
        // New property for flying state
        this.isFlying = false;
    }
    
    init(model, animations) {
        if (!model) {
            console.error('Cannot initialize animation controller: No model provided');
            return;
        }
        
        this.mixer = new THREE.AnimationMixer(model);
        
        animations.forEach(clip => {
            this.animations[clip.name] = clip;
            console.log("Animation controller registered: " + clip.name);
        });
        
        // Check if fly animation exists, log warning if not
        if (!this.animations['fly']) {
            console.warn("Fly animation not found but will be needed for high altitude");
        }
        
        // Check if walkingBackward animation exists, log warning if not
        if (!this.animations['walkingBackward']) {
            console.warn("walkingBackward animation not found but will be needed for backward movement");
        }
        
        if (this.animations['idle']) {
            this.playAnimation('idle');
        } else if (animations.length > 0) {
            this.playAnimation(animations[0].name);
        }
    }
    
    playAnimation(name, transitionTime = this.defaultTransitionTime) {
        // Allow spin animation to interrupt any other animation
        if (name === 'spin') {
            // If we're spinning already, don't restart it
            if (this.isSpinning) {
                return this.currentAction;
            }
            // Otherwise continue to play spin (even if jumping)
        } 
        // Block any animation changes if jumping (except finishing jump or spin)
        else if (this.isJumping && name !== 'jump') {
            console.log(`Blocked animation ${name} - jumping in progress`);
            return null;
        }
        // Block any animation changes if spinning (except finishing spin)
        else if (this.isSpinning && name !== 'spin') {
            console.log(`Blocked animation ${name} - spinning in progress`);
            return null;
        }
    
        if (!this.mixer || !this.animations[name]) {
            console.warn(`Cannot play animation: ${name} not found or mixer not initialized`);
            return null;
        }

        // If trying to start a jump animation that's already in progress, ignore
        if (name === 'jump' && this.jumpStarted) {
            console.log('Jump animation already in progress');
            return this.currentAction;
        }
        
        // If trying to start a spin animation that's already in progress, ignore
        if (name === 'spin' && this.isSpinning) {
            console.log('Spin animation already in progress');
            return this.currentAction;
        }

        // Stop any existing animations if jumping starts
        if ((name === 'jump' || name === 'spin') && this.currentAction) {
            this.currentAction.stop();
        }

        const nextAction = this.mixer.clipAction(this.animations[name]);
        this.previousAction = this.currentAction;
        this.currentAction = nextAction;
        
        // Handle same animation case
        if (this.previousAction === this.currentAction && this.currentAction.paused) {
            this.currentAction.paused = false;
            this.currentAction.reset();
            return this.currentAction;
        }
        
        // Update state flags based on animation
        this.isRunning = (name === 'running');
        this.isWalkingBackward = (name === 'walkingBackward'); // New state for backward walking
        this.isIdle = (name === 'idle');
        this.isDancing = (name === 'dance');
        this.isFlying = (name === 'fly');
        
        // Handle jump animation
        if (name === 'jump') {
            this.isJumping = true;
            this.jumpStarted = true; // Mark that jump has started
            nextAction.setLoop(THREE.LoopOnce);
            nextAction.clampWhenFinished = true;
            nextAction.timeScale = 1.0; // Ensure normal playback speed
            nextAction.weight = 1.0; // Full weight to this animation
            
            // Remove any existing listener to prevent duplicates
            if (this.jumpFinishedCallback) {
                this.mixer.removeEventListener('finished', this.jumpFinishedCallback);
            }
            
            // Create new finish listener
            this.jumpFinishedCallback = (e) => {
                // Only handle events for jump animation
                if (e.action === this.currentAction) {
                    //console.log("Jump animation finished naturally");
                    this.isJumping = false;
                    this.jumpStarted = false; // Reset jump started flag
                    this.mixer.removeEventListener('finished', this.jumpFinishedCallback);
                    
                    // Check if player is high up - play fly animation
                    if (window.player && window.player.position.y >= 20 && this.animations['fly']) {
                        this.playAnimation('fly');
                    }
                    // Otherwise transition based on current movement state
                    else if (window.gameState && window.gameState.isMovingBackward && this.animations['walkingBackward']) {
                        this.playAnimation('walkingBackward');
                    }
                    else if (this.isRunning) {
                        this.playAnimation('running');
                    } else {
                        this.playAnimation('idle');
                    }
                }
            };
            
            this.mixer.addEventListener('finished', this.jumpFinishedCallback);
        }
        
        // Handle fly animation
        if (name === 'fly') {
            // Set fly animation to loop continuously while in the air
            nextAction.setLoop(THREE.LoopRepeat);
            nextAction.timeScale = 1.0;
            nextAction.weight = 1.0;
        }
        
        // Handle spin animation (similar to jump but for spin)
        if (name === 'spin') {
            this.isSpinning = true;
            nextAction.setLoop(THREE.LoopOnce);
            nextAction.clampWhenFinished = true;
            nextAction.timeScale = 1.5; // Slightly faster playback for quick spin
            nextAction.weight = 1.0;
            
            // Remove any existing listener to prevent duplicates
            if (this.spinFinishedCallback) {
                this.mixer.removeEventListener('finished', this.spinFinishedCallback);
            }
            
            // Create new finish listener
            this.spinFinishedCallback = (e) => {
                // Only handle events for spin animation
                if (e.action === this.currentAction) {
                    console.log("Spin animation finished naturally");
                    this.isSpinning = false;
                    this.mixer.removeEventListener('finished', this.spinFinishedCallback);
                    
                    // Check if player is high up - play fly animation
                    if (window.player && window.player.position.y >= 20 && this.animations['fly']) {
                        this.playAnimation('fly');
                    }
                    // Otherwise transition based on current movement state
                    else if (window.gameState && window.gameState.isMovingBackward && this.animations['walkingBackward']) {
                        this.playAnimation('walkingBackward');
                    }
                    else if (this.isRunning) {
                        this.playAnimation('running');
                    } else {
                        this.playAnimation('idle');
                    }
                }
            };
            
            this.mixer.addEventListener('finished', this.spinFinishedCallback);
        }
        
        // Handle transitions
        if (this.previousAction && this.previousAction !== this.currentAction) {
            this.previousAction.fadeOut(transitionTime);
        }
        
        this.currentAction.reset();
        this.currentAction.fadeIn(transitionTime);
        this.currentAction.play();
        
        return this.currentAction;
    }
    
    update(deltaTime) {
        if (this.mixer) {
            this.mixer.update(deltaTime);
            
            // Check if player is moving backward and update animation accordingly
            if (window.gameState && window.gameState.isMovingBackward && 
                this.animations['walkingBackward'] && 
                !this.isJumping && !this.isSpinning && 
                !this.isWalkingBackward && window.player.position.y < 20) {
                this.playAnimation('walkingBackward');
            }
            
            // Check if player is high up in the air (y >= 20) and play fly animation
            if (window.player && window.player.position.y >= 20 && this.animations['fly'] &&
                !this.isSpinning && this.currentAction && 
                this.currentAction._clip.name !== 'fly') {
                this.playAnimation('fly');
            }
            // Return to normal animations if no longer high up
            else if (window.player && window.player.position.y < 20 && 
                    this.currentAction && this.currentAction._clip.name === 'fly' &&
                    !this.isSpinning && !this.isJumping) {
                // Return to appropriate animation when back under threshold
                if (window.gameState && window.gameState.isMovingBackward && this.animations['walkingBackward']) {
                    this.playAnimation('walkingBackward');
                }
                else if (this.isRunning) {
                    this.playAnimation('running');
                } else {
                    this.playAnimation('idle');
                }
            }
            
            // Handle idle animation variations (dance) when player is in idle state
            if ((this.isIdle || this.isDancing) && !this.isJumping && !this.isRunning && 
                !this.isSpinning && !this.isWalkingBackward &&
                (!window.player || window.player.position.y < 20)) {
                this.idleTimer += deltaTime;
                
                if (this.idleTimer >= this.idleInterval) {
                    this.idleTimer = 0;
                    
                    // 50% chance to switch between idle and dance
                    if (Math.random() < 0.5) {
                        // If we're currently idle, switch to dance (if available)
                        if (this.isIdle && this.animations['dance']) {
                            this.playAnimation('dance');
                        }
                        // If we're currently dancing, switch to idle
                        else if (this.isDancing && this.animations['idle']) {
                            this.playAnimation('idle');
                        }
                    }
                    
                    // Randomize the interval for next change (between 3 and 8 seconds)
                    this.idleInterval = 3 + Math.random() * 5;
                }
            }
        }
    }
    
    handleMovementState(isMoving, isJumping) {
        // Prevent any state changes during jump or spin animation
        if (this.isJumping || this.isSpinning) {
            return;
        }
        
        // Handle jump request - only trigger once when jump starts
        if (isJumping && !this.isJumping && !this.jumpStarted) {
            console.log("Starting jump animation");
            this.playAnimation('jump');
            return;
        }
        
        // Handle running, backward walking, and idle transitions
        if (!this.isJumping && !this.jumpStarted && !this.isSpinning) {
            // Check for backward movement
            if (window.gameState && window.gameState.isMovingBackward && this.animations['walkingBackward']) {
                // Only transition if we're not already playing backward walking
                if (!this.isWalkingBackward) {
                    this.playAnimation('walkingBackward');
                }
            }
            // Forward movement
            else if (isMoving && !this.isRunning) {
                this.playAnimation('running');
            } 
            // Idle state (no movement)
            else if (!isMoving && (this.isRunning || this.isWalkingBackward)) {
                // Reset idle timer when transitioning to idle
                this.idleTimer = 0;
                this.playAnimation('idle');
            }
        }
    }
    
    // New method to trigger spin animation after jump kill
    playSpinAnimation() {
        // Forcibly stop jump animation if it's playing
        if (this.isJumping) {
            // Remove any existing jump listener
            if (this.jumpFinishedCallback) {
                this.mixer.removeEventListener('finished', this.jumpFinishedCallback);
            }
            // Reset jump state flags
            this.isJumping = false;
            this.jumpStarted = false;
        }
        
        // Only play spin if it's not already spinning
        if (!this.isSpinning && this.animations['spin']) {
            console.log("Starting spin animation after jump kill");
            this.playAnimation('spin');
        }
    }
    
    // Add method to force stop current animation
    stopCurrentAnimation() {
        if (this.currentAction) {
            this.currentAction.stop();
            this.isJumping = false;
            this.isRunning = false;
            this.isWalkingBackward = false; // Added this state reset
            this.isIdle = false;
            this.isDancing = false;
            this.isSpinning = false;
            this.isFlying = false;
            this.jumpStarted = false; // Reset jump started flag
            
            if (this.jumpFinishedCallback) {
                this.mixer.removeEventListener('finished', this.jumpFinishedCallback);
            }
            
            if (this.spinFinishedCallback) {
                this.mixer.removeEventListener('finished', this.spinFinishedCallback);
            }
        }
    }
}