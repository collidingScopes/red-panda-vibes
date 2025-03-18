// Mobile Camera Controls Enhancement
// This script adds automatic camera rotation for mobile devices only

// We'll modify the MobileControls class to handle camera rotation
if (isMobileDevice) {
    // Wait for the game to initialize
    window.addEventListener('load', function() {
        setTimeout(function() {
            // Make sure the MobileControls class is initialized
            if (window.mobileControls) {
                enhanceMobileCameraControls();
            }
        }, 1500); // Wait a bit longer to ensure game is fully initialized
    });
}

function enhanceMobileCameraControls() {
    console.log("Enhancing mobile camera controls");
    
    // Store original update function to make sure we properly extend it
    const originalAnimate = window.animate;
    
    if (originalAnimate && typeof originalAnimate === 'function') {
        // Override the animation loop to add our camera positioning
        window.animate = function(currentTime) {
            // First call the original animate function to maintain game behavior
            const animResult = originalAnimate(currentTime);
            
            // Then apply our mobile-only camera adjustments
            if (isMobileDevice && window.player && window.camera) {
                updateMobileCameraPosition();
            }
            
            return animResult;
        };
        
        console.log("Successfully overrode animation loop for mobile camera");
    } else {
        console.error("Could not find animation loop to override");
    }
    
    // Add camera properties to the MobileControls class
    if (window.mobileControls) {
        window.mobileControls.targetCameraAngle = 0;
        window.mobileControls.currentCameraAngle = 0;
        window.mobileControls.cameraRotationSpeed = 0.05; // Slower for smoother rotation
        window.mobileControls.lastMovementDirection = new THREE.Vector3();
        window.mobileControls.movementThreshold = 0.15;
        window.mobileControls.isRotating = false;
        
        // Override the mobile touch handlers to capture movement direction
        attachMovementDirectionTracking();
    }
}

// Track user's movement direction to determine camera angle
function attachMovementDirectionTracking() {
    // Preserve the original touchmove event
    const originalTouchMove = document.ontouchmove;
    
    // Add our custom touchmove handler
    document.ontouchmove = function(e) {
        // Call original handler if it exists
        if (originalTouchMove) {
            originalTouchMove(e);
        }
        
        // Early exit if no mobile controls or game state
        if (!window.mobileControls || !window.gameState) return;
        
        // Early exit if game is over or goal reached
        if (window.gameState.goalReached || window.gameState.gameOver) return;
        
        // If we have active movement from joystick
        if (window.mobileControls.isTouching) {
            // Get current movement direction
            const moveX = window.mobileControls.moveDirection.x; 
            const moveZ = window.mobileControls.moveDirection.z;
            
            // Only update camera if movement is significant
            if (Math.abs(moveX) > window.mobileControls.movementThreshold || 
                Math.abs(moveZ) > window.mobileControls.movementThreshold) {
                
                // Calculate angle based on movement direction
                const moveAngle = Math.atan2(moveX, moveZ);
                
                // Set target camera angle
                window.mobileControls.targetCameraAngle = moveAngle;
                window.mobileControls.isRotating = true;
                
                // Store movement direction
                window.mobileControls.lastMovementDirection.set(moveX, 0, moveZ);
            }
        }
    };
}

// Function to update the mobile camera position and rotation
function updateMobileCameraPosition() {
    // Early exit if game is in special states
    if (window.gameState && (window.gameState.goalReached || window.gameState.gameOver)) {
        return;
    }
    
    // Get required objects
    const camera = window.camera;
    const player = window.player;
    const mobileControls = window.mobileControls;
    
    // Make sure all required objects exist
    if (!camera || !player || !mobileControls) {
        return;
    }
    
    // Smooth camera angle interpolation
    if (mobileControls.isRotating) {
        // Calculate shortest path for angle change
        let angleDiff = mobileControls.targetCameraAngle - mobileControls.currentCameraAngle;
        
        // Normalize angle to -π to π for shortest rotation
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Apply smooth rotation
        if (Math.abs(angleDiff) > 0.01) {
            mobileControls.currentCameraAngle += angleDiff * mobileControls.cameraRotationSpeed;
        } else {
            mobileControls.isRotating = false;
        }
    }
    
    // Set camera parameters
    const cameraAngleHorizontal = mobileControls.currentCameraAngle;
    const cameraAngleVertical = Math.PI/12; // Small downward angle (15 degrees)
    const cameraDistance = 5;
    
    // Calculate camera position relative to player
    const horizontalDistance = cameraDistance * Math.cos(cameraAngleVertical);
    const verticalDistance = cameraDistance * Math.sin(cameraAngleVertical);
    
    // Position camera based on player's current position and our angle
    camera.position.x = player.position.x + horizontalDistance * Math.sin(cameraAngleHorizontal);
    camera.position.z = player.position.z + horizontalDistance * Math.cos(cameraAngleHorizontal);
    
    // CRITICAL FIX: Always maintain proper height relative to player's current Y position
    // This ensures camera follows player when they fall or jump
    camera.position.y = player.position.y + 1.5 + verticalDistance;
    
    // Make camera look at player's head
    camera.lookAt(
        player.position.x,
        player.position.y + 1, // Look at head level
        player.position.z
    );
    
    // Log camera position occasionally for debugging
    if (Math.random() < 0.01) {
        console.log("Mobile camera tracking: ", 
            "Player Y:", player.position.y.toFixed(2), 
            "Camera Y:", camera.position.y.toFixed(2),
            "Angle:", (mobileControls.currentCameraAngle * 180 / Math.PI).toFixed(1) + "°"
        );
    }
}