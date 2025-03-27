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
        this.jumpStarted = false; // Add flag to track if jump animation has already been started
        this.jumpFinishedCallback = null;
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
        
        if (this.animations['idle']) {
            this.playAnimation('idle');
        } else if (animations.length > 0) {
            this.playAnimation(animations[0].name);
        }
    }
    
    playAnimation(name, transitionTime = this.defaultTransitionTime) {
        // Block any animation changes if jumping (except finishing jump)
        if (this.isJumping && name !== 'jump') {
            console.log(`Blocked animation ${name} - jumping in progress`);
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

        // Stop any existing animations if jumping starts
        if (name === 'jump' && this.currentAction) {
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
                    console.log("Jump animation finished naturally");
                    this.isJumping = false;
                    this.jumpStarted = false; // Reset jump started flag
                    this.mixer.removeEventListener('finished', this.jumpFinishedCallback);
                    
                    // Transition based on current movement state
                    if (this.isRunning) {
                        this.playAnimation('running');
                    } else {
                        this.playAnimation('idle');
                    }
                }
            };
            
            this.mixer.addEventListener('finished', this.jumpFinishedCallback);
        }
        
        // Update state flags
        this.isRunning = (name === 'running');
        
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
        }
    }
    
    handleMovementState(isMoving, isJumping) {
        // Prevent any state changes during jump animation
        if (this.isJumping) {
            return;
        }
        
        // Handle jump request - only trigger once when jump starts
        if (isJumping && !this.isJumping && !this.jumpStarted) {
            console.log("Starting jump animation");
            this.playAnimation('jump');
            return;
        }
        
        // Handle running to idle transition - only if we're not jumping
        if (!this.isJumping && !this.jumpStarted) {
            if (isMoving && !this.isRunning) {
                this.playAnimation('running');
            } else if (!isMoving && this.isRunning) {
                this.playAnimation('idle');
            }
        }
    }
    
    // Add method to force stop current animation
    stopCurrentAnimation() {
        if (this.currentAction) {
            this.currentAction.stop();
            this.isJumping = false;
            this.isRunning = false;
            this.jumpStarted = false; // Reset jump started flag
            if (this.jumpFinishedCallback) {
                this.mixer.removeEventListener('finished', this.jumpFinishedCallback);
            }
        }
    }
}