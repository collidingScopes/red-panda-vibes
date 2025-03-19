// Enhanced Mobile Camera Controls
// This script adds camera rotation that follows player orientation and movement

// We'll directly check if this is a mobile device for immediate execution
if (typeof isMobileDevice !== 'undefined' && isMobileDevice) {
    // Wait for the game to initialize
    window.addEventListener('load', function() {
        setTimeout(function() {
            initializeMobileCameraControls();
        }, 1000); // Give the game time to initialize
    });
}

// Main initialization function
function initializeMobileCameraControls() {
    console.log("Initializing enhanced mobile camera controls");
    
    // Store references to important game objects
    let gamePlayer = null;
    let gameCamera = null;
    let originalUpdateCamera = null;
    
    // Camera state
    const cameraState = {
        targetAngleHorizontal: 0,
        currentAngleHorizontal: 0,
        angleVertical: Math.PI/12, // Small downward angle (15 degrees)
        distance: 5,
        rotationSpeed: 0.05,
        smoothRotationSpeed: 0.08, // Speed for smooth rotation following player
        isRotating: false,
        lastPlayerY: 0,
        smoothedPlayerY: 0,
        yFollowSpeed: 0.1, // Control how quickly camera follows Y changes
        playerHeadOffset: 1.0,
        lastPlayerRotation: new THREE.Quaternion(), // Store player's last rotation
        playerForward: new THREE.Vector3(0, 0, 1), // Initial player forward direction
        lastMovementDirection: new THREE.Vector3() // Last direction player was moving
    };
    
    // Try to get references to game objects
    function findGameObjects() {
        if (window.player) {
            gamePlayer = window.player;
            // Store initial player Y position for reference
            cameraState.lastPlayerY = gamePlayer.position.y;
            cameraState.smoothedPlayerY = gamePlayer.position.y;
            // Initialize the player's rotation
            cameraState.lastPlayerRotation.copy(gamePlayer.quaternion);
        }
        
        if (window.camera) {
            gameCamera = window.camera;
        }
        
        // Try to get the original camera update function to prevent conflicts
        if (typeof window.updateCamera === 'function') {
            originalUpdateCamera = window.updateCamera;
        }
        
        return gamePlayer && gameCamera;
    }
    
    // If we can't find game objects immediately, retry a few times
    let retryCount = 0;
    function attemptInitialization() {
        if (findGameObjects()) {
            // Successfully found objects, now override the camera control
            overrideCameraControl();
        } else {
            retryCount++;
            if (retryCount < 5) {
                console.log(`Retrying game object lookup (attempt ${retryCount})`);
                setTimeout(attemptInitialization, 1000);
            } else {
                console.error("Failed to find required game objects after multiple attempts");
            }
        }
    }
    
    // Begin initialization attempts
    attemptInitialization();
    
    // Override the camera control mechanism
    function overrideCameraControl() {
        console.log("Overriding camera controls for mobile");
        
        // Disable the original camera update if we found it
        if (originalUpdateCamera) {
            console.log("Found original updateCamera function, will bypass it");
            window.updateCamera = function() {
                // Don't do anything - we'll handle camera updates ourselves
                return;
            };
        }
        
        // Set up our update loop
        setupCameraUpdateLoop();
        
        // Set up touch controls for camera movement
        setupMobileCameraControls();
    }
    
    // Setup our own camera update function that will be called in the animation loop
    function setupCameraUpdateLoop() {
        // Store the original animation loop
        const originalAnimate = window.animate;
        
        if (originalAnimate && typeof originalAnimate === 'function') {
            // Create a new animation function that includes our camera update
            window.animate = function(currentTime) {
                // First call the original animation function
                const result = originalAnimate(currentTime);
                
                // Then update our camera
                updateMobileCamera();
                
                return result;
            };
            
            console.log("Successfully injected camera update into animation loop");
        } else {
            console.warn("Could not find animation loop, falling back to requestAnimationFrame");
            
            // Fallback to our own animation loop if we can't find the original
            function updateLoop() {
                updateMobileCamera();
                requestAnimationFrame(updateLoop);
            }
            
            requestAnimationFrame(updateLoop);
        }
    }
    
    // Extract player's forward direction
    function getPlayerForwardDirection() {
        if (!gamePlayer) return new THREE.Vector3(0, 0, 1);
        
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(gamePlayer.quaternion);
        forward.y = 0; // Keep the direction in the horizontal plane
        forward.normalize();
        
        return forward;
    }
    
    // Calculate angle between two vectors in the horizontal plane
    function getHorizontalAngle(vector) {
        // Calculate the angle in the horizontal plane (XZ plane)
        return Math.atan2(vector.x, vector.z);
    }
    
    // The main camera update function
    function updateMobileCamera() {
        // Skip if required objects aren't available
        if (!gamePlayer || !gameCamera) return;
        
        // Skip camera update during special game states
        if (window.gameState && (window.gameState.goalReached || window.gameState.gameOver)) {
            return;
        }
        
        // Get player's current position
        const playerPos = gamePlayer.position;
        
        // Smooth Y-axis tracking with acceleration and deceleration
        // This creates a more natural follow effect, especially when jumping
        const playerYDelta = playerPos.y - cameraState.lastPlayerY;
        
        // If player moved more than 1 unit vertically, use faster follow speed
        // This helps during jumps and falls to keep player in view
        const yFollowSpeed = Math.abs(playerYDelta) > 1.0 ? 0.3 : cameraState.yFollowSpeed;
        
        // Update smoothed Y position - this is key for smooth Y-axis tracking
        cameraState.smoothedPlayerY += (playerPos.y - cameraState.smoothedPlayerY) * yFollowSpeed;
        
        // Save current Y for next frame comparison
        cameraState.lastPlayerY = playerPos.y;
        
        // Get player's current forward direction
        const playerForward = getPlayerForwardDirection();
        
        // Calculate player's orientation angle in the horizontal plane
        const playerAngle = getHorizontalAngle(playerForward);
        
        // Check if player has actually moved
        let hasMovement = false;
        
        // Check the gameState key states to see if player is moving
        if (window.gameState && window.gameState.keyStates) {
            const keys = window.gameState.keyStates;
            hasMovement = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'];
        }
        
        // Only update target angle when player has rotated significantly or we're in joystick rotation mode
        const rotationDiff = Math.abs(playerAngle - cameraState.targetAngleHorizontal);
        if (hasMovement && rotationDiff > 0.1) {
            // When player is moving, the camera should slowly rotate to follow player's direction
            cameraState.targetAngleHorizontal = playerAngle;
            cameraState.isRotating = true;
        }
        
        // Apply smooth rotation
        if (cameraState.isRotating) {
            // Calculate shortest path for angle change
            let angleDiff = cameraState.targetAngleHorizontal - cameraState.currentAngleHorizontal;
            
            // Normalize angle to -π to π for shortest rotation
            if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // Apply smooth rotation
            if (Math.abs(angleDiff) > 0.01) {
                cameraState.currentAngleHorizontal += angleDiff * cameraState.smoothRotationSpeed;
            } else {
                cameraState.isRotating = false;
            }
        }
        
        // Calculate camera position with orbit controls
        const horizontalDistance = cameraState.distance * Math.cos(cameraState.angleVertical);
        const verticalDistance = cameraState.distance * Math.sin(cameraState.angleVertical);
        
        // Position camera using player's current position and our camera angle
        gameCamera.position.x = playerPos.x + horizontalDistance * Math.sin(cameraState.currentAngleHorizontal);
        gameCamera.position.z = playerPos.z + horizontalDistance * Math.cos(cameraState.currentAngleHorizontal);
        
        // Use the smoothed Y value plus offsets
        gameCamera.position.y = cameraState.smoothedPlayerY + cameraState.playerHeadOffset + verticalDistance;
        
        // Look at player's head
        gameCamera.lookAt(
            playerPos.x,
            cameraState.smoothedPlayerY + cameraState.playerHeadOffset, // Look at head level
            playerPos.z
        );
        
        // Save player's rotation for next frame comparison
        cameraState.lastPlayerRotation.copy(gamePlayer.quaternion);
    }
    
    // Set up mobile camera controls based on player movement
    function setupMobileCameraControls() {
        // Only proceed if we have mobile controls available
        if (!window.mobileControls) {
            console.warn("Mobile controls not found, camera rotation by movement won't work");
            return;
        }
        
        // Store current movement direction
        window.mobileControls.lastMovementDirection = new THREE.Vector3();
        
        // Override the mobile touch handlers to detect movement direction
        const originalTouchMove = document.ontouchmove;
        
        document.ontouchmove = function(e) {
            // Call original handler
            if (originalTouchMove) {
                originalTouchMove(e);
            }
            
            // Skip if not applicable
            if (!window.mobileControls || !window.mobileControls.isTouching) return;
            if (window.gameState && (window.gameState.goalReached || window.gameState.gameOver)) return;
            
            // Get movement direction from joystick
            if (window.mobileControls.moveDirection) {
                const moveX = window.mobileControls.moveDirection.x; 
                const moveZ = window.mobileControls.moveDirection.z;
                
                // Only update camera if movement is significant
                const movementThreshold = 0.15;
                if (Math.abs(moveX) > movementThreshold || Math.abs(moveZ) > movementThreshold) {
                    // Calculate angle based on movement direction
                    const moveAngle = Math.atan2(moveX, moveZ);
                    
                    // Set target camera angle (with opposite angle for camera)
                    cameraState.targetAngleHorizontal = -moveAngle; // Inverse for camera position
                    cameraState.isRotating = true;
                    
                    // Store last valid movement direction
                    window.mobileControls.lastMovementDirection.set(moveX, 0, moveZ);
                }
            }
        };
        
        // Hook into the game's player movement function if available
        // This helps us detect when the player turns due to keyboard input
        if (window.updatePlayerPosition && typeof window.updatePlayerPosition === 'function') {
            const originalUpdatePlayerPosition = window.updatePlayerPosition;
            
            window.updatePlayerPosition = function(deltaTime) {
                // Call the original function first
                originalUpdatePlayerPosition(deltaTime);
                
                // After the player has been updated, check if they've rotated
                if (gamePlayer) {
                    const playerForward = getPlayerForwardDirection();
                    const playerAngle = getHorizontalAngle(playerForward);
                    
                    // If significant rotation detected, update camera target
                    const rotationThreshold = 0.2; // About 11 degrees
                    const rotationDiff = Math.abs(playerAngle - cameraState.targetAngleHorizontal);
                    
                    if (rotationDiff > rotationThreshold) {
                        cameraState.targetAngleHorizontal = playerAngle;
                        cameraState.isRotating = true;
                    }
                }
            };
        }
        
        console.log("Mobile camera controls successfully set up!");
    }
}