// Mobile Auto-Runner Camera Controls
// This script provides camera handling specifically for the auto-runner mode on mobile

// Only initialize if this is a mobile device
if (typeof isMobileDevice !== 'undefined' && isMobileDevice) {
    // Wait for the game to initialize
    window.addEventListener('load', function() {
        setTimeout(function() {
            initializeAutoRunnerCamera();
        }, 1000); // Give the game time to initialize
    });
}

// Main initialization function
function initializeAutoRunnerCamera() {
    console.log("Initializing auto-runner camera controls");
    
    // Camera state
    const cameraState = {
        height: 4, // Height above player
        distance: 6, // Distance behind player
        lookAheadDistance: 3, // Distance to look ahead of player
        smoothFactor: 0.1, // For smooth transitions (0-1, lower = smoother)
        currentLookDirection: new THREE.Vector3(0, 0, 1), // Current camera look direction
        targetLookDirection: new THREE.Vector3(0, 0, 1), // Target camera look direction
        smoothedPlayerY: 0, // For smooth vertical camera movement
        lastPlayerY: 0, // Last player height
        yFollowSpeed: 0.1 // Speed to follow Y changes
    };
    
    // Store references to game objects
    let gamePlayer = null;
    let gameCamera = null;
    
    // Try to get references to game objects
    function findGameObjects() {
        if (window.player) {
            gamePlayer = window.player;
            // Store initial player Y position for reference
            cameraState.lastPlayerY = gamePlayer.position.y;
            cameraState.smoothedPlayerY = gamePlayer.position.y;
        }
        
        if (window.camera) {
            gameCamera = window.camera;
        }
        
        return gamePlayer && gameCamera;
    }
    
    // If we can't find game objects immediately, retry
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
        console.log("Overriding camera controls for auto-runner mode");
        
        // Find the original update camera function
        const originalUpdateCamera = window.updateCamera;
        
        // Override with our auto-runner camera function
        window.updateCamera = function() {
            // Use auto-runner camera in mobile mode
            updateAutoRunnerCamera();
        };
        
        // Setup reusable vectors to improve performance
        const tempVector = new THREE.Vector3();
        const cameraPosition = new THREE.Vector3();
        const lookTarget = new THREE.Vector3();
        
        // The main camera update function
        function updateAutoRunnerCamera() {
            // Skip if required objects aren't available
            if (!gamePlayer || !gameCamera) return;
            
            // Skip camera update during special game states
            if (window.gameState && (window.gameState.goalReached || window.gameState.gameOver)) {
                return;
            }
            
            // Get current forward direction
            let forwardDirection;
            
            if (window.autoRunnerControls) {
                // Get direction from auto-runner controls
                forwardDirection = window.autoRunnerControls.forwardVector.clone();
            } else {
                // Fallback: use player's facing direction
                tempVector.set(0, 0, 1);
                tempVector.applyQuaternion(gamePlayer.quaternion);
                tempVector.y = 0;
                tempVector.normalize();
                forwardDirection = tempVector;
            }
            
            // Update target look direction
            cameraState.targetLookDirection.copy(forwardDirection);
            
            // Smoothly interpolate current look direction
            cameraState.currentLookDirection.lerp(cameraState.targetLookDirection, cameraState.smoothFactor);
            cameraState.currentLookDirection.normalize();
            
            // Smooth Y-axis tracking
            const playerYDelta = gamePlayer.position.y - cameraState.lastPlayerY;
            const yFollowSpeed = Math.abs(playerYDelta) > 1.0 ? 0.3 : cameraState.yFollowSpeed;
            cameraState.smoothedPlayerY += (gamePlayer.position.y - cameraState.smoothedPlayerY) * yFollowSpeed;
            cameraState.lastPlayerY = gamePlayer.position.y;
            
            // Calculate camera position (behind player)
            cameraPosition.copy(gamePlayer.position)
                .sub(cameraState.currentLookDirection.clone().multiplyScalar(cameraState.distance));
            
            // Add height offset with smooth Y
            cameraPosition.y = cameraState.smoothedPlayerY + cameraState.height;
            
            // Set camera position
            gameCamera.position.copy(cameraPosition);
            
            // Look ahead of player
            lookTarget.copy(gamePlayer.position)
                .add(cameraState.currentLookDirection.clone().multiplyScalar(cameraState.lookAheadDistance));
            
            // Look at player's head level
            lookTarget.y = cameraState.smoothedPlayerY + 1;
            
            // Point camera at target
            gameCamera.lookAt(lookTarget);
        }
    }
}