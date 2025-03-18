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
    // Store original update camera function
    const originalUpdateCamera = window.updateCamera;
    
    // Add camera auto-rotation logic to the MobileControls class
    if (window.mobileControls) {
        // Add camera properties to the MobileControls class
        window.mobileControls.targetCameraAngle = 0; // The angle we want the camera to rotate to
        window.mobileControls.currentCameraAngle = 0; // Current camera angle
        window.mobileControls.cameraRotationSpeed = 0.1; // How quickly camera rotates to match movement
        window.mobileControls.lastMovementDirection = new THREE.Vector3(); // Last significant movement direction
        window.mobileControls.movementThreshold = 0.2; // Minimum movement to trigger camera rotation
        window.mobileControls.isRotating = false; // Flag to track if we're currently rotating
        
        // Replace the updateCamera function with our enhanced version
        window.updateCamera = function() {
            // Only apply our custom camera logic on mobile
            if (isMobileDevice) {
                updateMobileCamera();
            } else {
                // Use original camera update for desktop
                if (originalUpdateCamera) {
                    originalUpdateCamera();
                }
            }
        };
        
        // Enhance the existing mobile controls by monitoring movement direction
        const originalTouchMove = window.mobileControls.initTouchListeners;
        if (originalTouchMove) {
            window.mobileControls.initTouchListeners = function() {
                // Call the original function first
                originalTouchMove.call(window.mobileControls);
                
                // Add our camera calculation logic
                const originalTouchMove = document.addEventListener;
                document.addEventListener = function(type, listener, options) {
                    if (type === 'touchmove') {
                        const wrappedListener = function(e) {
                            // Call original listener
                            listener.call(this, e);
                            
                            // After movement is processed, calculate camera angle
                            if (window.mobileControls.isTouching && 
                                window.gameState && 
                                !window.gameState.goalReached && 
                                !window.gameState.gameOver) {
                                
                                // Get current movement direction
                                const moveX = window.mobileControls.moveDirection.x;
                                const moveZ = window.mobileControls.moveDirection.z;
                                
                                // Only update camera if movement is significant
                                if (Math.abs(moveX) > window.mobileControls.movementThreshold || 
                                    Math.abs(moveZ) > window.mobileControls.movementThreshold) {
                                    
                                    // Calculate the angle based on movement direction
                                    // arctan2 gives us the angle in radians
                                    const moveAngle = Math.atan2(moveX, moveZ);
                                    
                                    // Set the target camera angle to face the opposite direction of movement
                                    // This will make the camera look at where the character is heading
                                    window.mobileControls.targetCameraAngle = moveAngle;
                                    window.mobileControls.isRotating = true;
                                    
                                    // Store the movement direction for reference
                                    window.mobileControls.lastMovementDirection.set(moveX, 0, moveZ);
                                }
                            }
                        };
                        
                        // Replace with our wrapped listener
                        originalTouchMove.call(document, type, wrappedListener, options);
                    } else {
                        // Call original for all other event types
                        originalTouchMove.call(document, type, listener, options);
                    }
                };
            };
            
            // Re-initialize touch listeners with our enhancement
            window.mobileControls.initTouchListeners();
        }
    }
}

// Function to handle mobile camera updates
function updateMobileCamera() {
    // Early exit if game is over or goal is reached
    if (window.gameState && (window.gameState.goalReached || window.gameState.gameOver)) {
        return;
    }
    
    // Get required references
    const camera = window.camera;
    const player = window.player;
    
    if (!camera || !player || !window.mobileControls) {
        return;
    }
    
    const mobileControls = window.mobileControls;
    
    // Smoothly interpolate camera angle if we're rotating
    if (mobileControls.isRotating) {
        // Calculate angle difference (accounting for wrapping around 2π)
        let angleDiff = mobileControls.targetCameraAngle - mobileControls.currentCameraAngle;
        
        // Normalize angle to -π to π for shortest rotation path
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Apply smooth rotation based on rotation speed
        if (Math.abs(angleDiff) > 0.01) {
            mobileControls.currentCameraAngle += angleDiff * mobileControls.cameraRotationSpeed;
        } else {
            mobileControls.isRotating = false;
        }
    }
    
    // Set camera orbit based on current angle
    const cameraAngleHorizontal = mobileControls.currentCameraAngle;
    const cameraAngleVertical = 0.2; // Slight downward tilt
    
    // Calculate camera position in orbit around player
    const cameraDistance = 5; // Keep the same distance as desktop
    const horizontalDistance = cameraDistance * Math.cos(cameraAngleVertical);
    const verticalDistance = cameraDistance * Math.sin(cameraAngleVertical);
    
    // Update camera position
    camera.position.x = player.position.x + horizontalDistance * Math.sin(cameraAngleHorizontal);
    camera.position.z = player.position.z + horizontalDistance * Math.cos(cameraAngleHorizontal);
    camera.position.y = player.position.y + 1.5 + verticalDistance; // 1.5 is a height offset
    
    // Look at the player
    const target = new THREE.Vector3();
    target.copy(player.position);
    target.y += 1; // Look at player's head level
    camera.lookAt(target);
}