// This code adds a bouncy trampoline that launches the panda high into the air

// Create the trampoline with neon styling matching the game's aesthetic
function createTrampoline() {
    // Create a group to hold all trampoline parts
    const trampolineGroup = new THREE.Group();
    
    // Create base frame with neon color from the game's palette
    const frameColor = 0xe800ff; //neon pink
    const frameGeometry = new THREE.CylinderGeometry(6, 6, 0.5, 16);
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: frameColor,
        roughness: 0.4,
        metalness: 0.6,
        emissive: frameColor,
        emissiveIntensity: 0.5
    });
    
    const frameBase = new THREE.Mesh(frameGeometry, frameMaterial);
    frameBase.position.y = 0.25;
    frameBase.castShadow = true;
    frameBase.receiveShadow = true;
    
    // Create bouncy surface with contrasting color
    const surfaceColor = 0xfbff00; // neon yellow
    const surfaceGeometry = new THREE.CylinderGeometry(4, 4, 0.1, 16);
    const surfaceMaterial = new THREE.MeshStandardMaterial({
        color: surfaceColor,
        roughness: 0.2,
        metalness: 0.4,
        emissive: surfaceColor,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.9
    });
    
    const bouncySurface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    bouncySurface.position.y = 1; // Slightly above the base
    bouncySurface.castShadow = true;
    
    // Add legs to the trampoline
    const legGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: frameColor,
        roughness: 0.5,
        metalness: 0.5
    });
    
    // Add 6 legs around the circumference
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const legX = Math.cos(angle) * 2.5;
        const legZ = Math.sin(angle) * 2.5;
        
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(legX, 0, legZ);
        leg.castShadow = true;
        trampolineGroup.add(leg);
    }
    
    // Create a point light to emphasize the trampoline
    const trampolineLight = new THREE.PointLight(surfaceColor, 1, 10);
    trampolineLight.position.y = 2;
    trampolineLight.castShadow = false;
    
    // Add all parts to the group
    trampolineGroup.add(frameBase);
    trampolineGroup.add(bouncySurface);
    trampolineGroup.add(trampolineLight);
    
    // Place the trampoline at a random position near the center of the map
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 30 + 10; // Between 10-40 units from center
    
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    
    // Set position based on terrain height, but floating higher above the ground
    const y = getTerrainHeight(x, z) + 0.8; // Floating above ground
    trampolineGroup.position.set(x, y, z);
    
    // Store the bouncy surface for animation
    gameState.trampoline.bounceAnimation = bouncySurface;
    
    scene.add(trampolineGroup);
    return trampolineGroup;
}

// Initialize the trampoline system
function initTrampoline() {
    gameState.trampoline.object = createTrampoline();
    
    // Create trampoline bounce sound
    if (window.soundSystem && window.soundSystem.initialized) {
        // Will be used when the panda bounces
        gameState.trampoline.bounceSound = function() {
            // Play a fun "boing" sound using the existing sound system
            window.soundSystem.playTone(300, 0.1, 'sine', 0.3);
            window.soundSystem.playTone(400, 0.1, 'sine', 0.3, 0.1);
            window.soundSystem.playTone(500, 0.2, 'sine', 0.3, 0.2);
            window.soundSystem.playTone(600, 0.3, 'sine', 0.3, 0.3);
        };
    }
    
    console.log("Trampoline initialized at", 
        gameState.trampoline.object.position.x,
        gameState.trampoline.object.position.y,
        gameState.trampoline.object.position.z);
}

// Check for collision with the trampoline
function checkTrampolineCollision() {
    if (!gameState.trampoline.object || gameState.goalReached || gameState.gameOver) return;
    
    const trampoline = gameState.trampoline.object;
    const trampolinePos = trampoline.position;
    const playerPos = player.position;
    
    // Calculate horizontal distance
    const dx = playerPos.x - trampolinePos.x;
    const dz = playerPos.z - trampolinePos.z;
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
    
    // Calculate vertical position relative to trampoline
    const trampolineTop = trampolinePos.y + 0.6; // Top of the bouncy surface
    const playerBottom = playerPos.y; // Bottom of the player
    
    // Check if the player is directly above the trampoline, falling, and close enough vertically
    const isFalling = gameState.playerVelocity.y <= 0;
    const isDirectlyAbove = horizontalDistance < 2.5;
    const isCloseVertically = Math.abs(playerBottom - trampolineTop) < 1.0;
    const isAboveTrampoline = isDirectlyAbove && isCloseVertically;
    
    // Prevent bounce spam with cooldown
    const now = performance.now();
    const cooldownOver = now - gameState.trampoline.lastBounceTime > 1000;
    
    if (isAboveTrampoline && isFalling && cooldownOver) {
        // Bounce the player with extra force!
        gameState.playerVelocity.y = gameState.trampoline.bounceForce;
        
        // Play bounce animation
        animateTrampolineBounce();
        
        // Play bounce sound
        if (gameState.trampoline.bounceSound) {
            gameState.trampoline.bounceSound();
        }
        
        // Set cooldown
        gameState.trampoline.lastBounceTime = now;
        
        // Play special animation for the panda if available
        if (gameState.pandaModelLoaded && gameState.pandaAnimationMixer) {
            gameState.pandaAnimationMixer.stopAllAction();
            
            // Use jump animation if available, but play it faster for the trampoline effect
            if (gameState.pandaAnimations['jump']) {
                const jumpAction = gameState.pandaAnimationMixer.clipAction(gameState.pandaAnimations['jump']);
                jumpAction.setLoop(THREE.LoopOnce);
                jumpAction.clampWhenFinished = true;
                jumpAction.timeScale = 1.5; // Play faster for more dramatic effect
                jumpAction.play();
                
                // Reset to normal animation after jump completes
                setTimeout(() => {
                    if (!gameState.gameOver && gameState.pandaModelLoaded) {
                        gameState.pandaAnimationMixer.stopAllAction();
                        const nextAnim = isMoving() ? 'run' : 'idle';
                        if (gameState.pandaAnimations[nextAnim]) {
                            const action = gameState.pandaAnimationMixer.clipAction(gameState.pandaAnimations[nextAnim]);
                            action.play();
                        }
                    }
                }, 1000);
            }
        }
    }
}

// Animate the trampoline when bounced on
function animateTrampolineBounce() {
    if (!gameState.trampoline.bounceAnimation) return;
    
    const bouncySurface = gameState.trampoline.bounceAnimation;
    
    // Save original position
    const originalY = bouncySurface.position.y;
    
    // Simple animation with setTimeout - no external libraries needed
    // Compress
    bouncySurface.position.y = originalY - 0.3;
    
    // Extend after 100ms
    setTimeout(() => {
        bouncySurface.position.y = originalY + 0.2;
        
        // Return to original after another 200ms
        setTimeout(() => {
            bouncySurface.position.y = originalY;
        }, 200);
    }, 100);
}

// Helper function to check if player is moving horizontally
function isMoving() {
    return (gameState.keyStates['KeyW'] || 
            gameState.keyStates['KeyA'] || 
            gameState.keyStates['KeyS'] || 
            gameState.keyStates['KeyD']);
}

// Add trampoline checking to the game loop
const originalUpdateFunction = updatePlayerPosition;
updatePlayerPosition = function(deltaTime) {
    // Call the original function first
    originalUpdateFunction(deltaTime);
    
    // Check for trampoline collision (if game is still active)
    if (!gameState.goalReached && !gameState.gameOver) {
        checkTrampolineCollision();
    }
};

// Initialize the trampoline when the game starts
document.getElementById('start-game-button').addEventListener('click', () => {
    // Add a slight delay to make sure the game is fully initialized
    setTimeout(() => {
        initTrampoline();
    }, 1000);
});

// Properly handle level transitions and cleanup
if (gameState.levelSystem) {
    // Hook into level completion
    const originalShowLevelComplete = gameState.levelSystem.showLevelComplete;
    gameState.levelSystem.showLevelComplete = function() {
        // Call the original function first
        originalShowLevelComplete.call(this);
        
        // Remove trampoline when level is completed
        if (gameState.trampoline && gameState.trampoline.object) {
            scene.remove(gameState.trampoline.object);
            gameState.trampoline.object = null;
        }
    };
    
    // Hook into new level creation
    const originalApplyLevelSettings = gameState.levelSystem.applyLevelSettings;
    gameState.levelSystem.applyLevelSettings = function(level) {
        // Call the original function
        originalApplyLevelSettings.call(this, level);
        
        // Remove old trampoline if it exists
        if (gameState.trampoline && gameState.trampoline.object) {
            scene.remove(gameState.trampoline.object);
            gameState.trampoline.object = null;
        }
        
        // Create a new trampoline for this level
        setTimeout(() => {
            initTrampoline();
        }, 500);
    };
}