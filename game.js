const isIPad = () => {
    // For iPadOS 13+
    const isIPadOS = navigator.maxTouchPoints > 1 && 
                        navigator.platform === 'MacIntel';
                        
    // Traditional iPad detection
    const isTraditionalIPad = /iPad/i.test(navigator.userAgent);

    return isIPadOS || isTraditionalIPad;
};

// General mobile detection including fixed iPad detection
const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || isIPad();
console.log("Mobile check:", isMobile);

// Game state
const gameState = {
    speed: 16.0,
    currentLevel: 1,
    levelsCompleted: 0,
    playerVelocity: new THREE.Vector3(),
    playerOnGround: false,
    keyStates: {},
    gamePaused: false,
    goalReached: false,
    enemyManager: null,
    levelSystem: null, // Add the level system reference
    gameStarted: false,
    gameOver: false,   // Add game over state
    changingRoom: null,
    jetpack: null,
    ipod: null,
    gameboy: null,
    cubicle: null,
    newspaper: null,
    useGrassSystem: true,
    grassSystem: null,
    sunset: null,
    isMovingBackward: false,
    fixedCameraPosition: null,  // Will store camera position when backward movement starts
};

// Create global animation controller
window.animationController = new AnimationController();

// Add trampoline properties to gameState
gameState.trampoline = {
    object: null,
    bounceForce: 30, // Much stronger than normal jump
    cooldown: false,
    bounceSound: null,
    bounceAnimation: null,
    lastBounceTime: 0
};

//physics
const jumpForce = 10.5;
const gravity = 16.0;
const turnSpeed = isMobile ? 1 : 4.5;  // How quickly the panda rotates to face movement direction

// Make gameState globally accessible for mobile controls
window.gameState = gameState;

// FPS counter variables
let frameCount = 0;
let lastFpsUpdate = 0;
let fps = 0;
const fpsCounter = document.getElementById('fps-counter');

// Camera setup
// Camera setup
const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

// Create re-usable camera offset vectors
// We'll add a new property to gameState to track the current offset
const normalCameraOffset = new THREE.Vector3(0, 6, -10); // Normal offset
const backwardCameraOffset = new THREE.Vector3(0, 7, -15); // Increased distance when moving backward
// We'll create a portraitCameraOffset dynamically when needed

// Create a current cameraOffset that can be modified based on conditions
const cameraOffset = normalCameraOffset.clone();

// Add references to gameState
gameState.normalCameraOffset = normalCameraOffset;
gameState.backwardCameraOffset = backwardCameraOffset;
gameState.cameraOffset = cameraOffset;

const cameraTransitionSpeed = 3.0; // Speed of transition between normal and backward camera
const cameraLerpSpeed = 1.5; // Speed of camera interpolation (adjust for smoothness)

// Renderer setup with post-processing for dithering
const renderer = new THREE.WebGLRenderer({ antialias: false }); // Disable antialiasing for pixelated look
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows for better look
document.body.appendChild(renderer.domElement);

const pixelRatio = 1.0; //higher value gives higher quality graphics
renderer.setPixelRatio(pixelRatio);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf8a7e9, 30, 150);

// Apply sunset background
scene.background;
updateBackground(nightSky);

// Enhanced sunset lighting for more dramatic shadows
// Warm ambient light for sunset feel
const ambientLight = new THREE.AmbientLight(0xffe0c0, 0.9); // Warm amber glow
scene.add(ambientLight);

// Strong directional light with warm sunset color

const directionalLight = new THREE.DirectionalLight(0xff9966, 1.2); // Warm orange sunset
directionalLight.position.set(-25, 20, 30); // Position to create dramatic shadows
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -20;
// Increase shadow darkness for more contrast
directionalLight.shadow.bias = 0.001;
scene.add(directionalLight);

// Create the red panda player
const player = createRedPandaPlayer();
player.position.set(0, 50, 0);
player.receiveShadow = true;
scene.add(player);

// Function to store reference to the panda model when it's loaded
// This will be called by the geometry.js file after model loading
window.setPandaModel = function(model, animations) {
    gameState.pandaModel = model;
    gameState.pandaModelLoaded = true;
    
    // Initialize animation controller
    if (window.animationController) {
        window.animationController.init(model, animations);
        gameState.animationController = window.animationController;
        console.log("Animation controller initialized with " + animations.length + " animations");
    }
    
    console.log("Panda model reference set in game state");
};

// Create the map
gameState.terrain = createTerrain();
const flagPole = createFlagPole();
const obstacles = createObstacles();
const river = createRiver();

function initEventListeners() {
    // Input handling
    document.addEventListener('keydown', (event) => {
        event.preventDefault();
        gameState.keyStates[event.code] = true;
    });

    document.addEventListener('keyup', (event) => {
        gameState.keyStates[event.code] = false;
    });

    // Handle window resize for all devices
    window.addEventListener('resize', handleViewportResize);
    
    // Add explicit orientation change handling for mobile
    if (isMobile) {
        window.addEventListener('orientationchange', () => {
            // Slight delay to let the browser complete orientation change
            setTimeout(handleViewportResize, 100);
        });
    }
}

// Camera controls
let cameraAngleHorizontal = 0;
let cameraAngleVertical = 0;

// Add min and max for vertical camera angle to prevent looking below ground
const cameraTarget = new THREE.Vector3(); // Reusable vector for camera target

function updateCamera(deltaTime) {
    // Use different camera offset based on movement direction
    if (gameState.isMovingBackward) {
        // Smoothly transition to backward camera position
        gameState.cameraOffset.lerp(gameState.backwardCameraOffset, cameraTransitionSpeed * deltaTime);
    } else {
        // Determine which camera offset to use based on device orientation
        // Portrait mode on mobile uses portraitCameraOffset, otherwise use normalCameraOffset
        const targetOffset = (isMobile && window.innerWidth / window.innerHeight < 1 && gameState.portraitCameraOffset) 
            ? gameState.portraitCameraOffset 
            : gameState.normalCameraOffset;
            
        // Smoothly transition back to the appropriate camera position
        gameState.cameraOffset.lerp(targetOffset, cameraTransitionSpeed * deltaTime);
    }

    const targetOffset = gameState.cameraOffset.clone()
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    const targetPosition = player.position.clone().add(targetOffset);

    camera.position.lerp(targetPosition, cameraLerpSpeed * deltaTime);

    const lookAtTarget = new THREE.Vector3()
        .copy(player.position)
        .add(new THREE.Vector3(0, 1, 0));
    camera.lookAt(lookAtTarget);
}

// Game physics and movement
function updatePlayerPosition(deltaTime) {
    if (gameState.goalReached) return;
        
    // Ground check
    const groundHeight = getTerrainHeight(player.position.x, player.position.z);
    const wasOnGround = gameState.playerOnGround;
    gameState.playerOnGround = player.position.y <= groundHeight + 0.5;
    
    // Apply gravity
    if (!gameState.playerOnGround && gameState.gameStarted) {
        gameState.playerVelocity.y -= gravity * deltaTime;
    } else {
        gameState.playerVelocity.y = Math.max(0, gameState.playerVelocity.y);
        
        // Snap to ground if on ground - improved to prevent sinking
        if (player.position.y < groundHeight + 0.5) {
            player.position.y = groundHeight + 0.5;
        }
    }
    
    // Track if we just initiated a jump this frame
    let jumpInitiated = false;
    
    // Handle jumping - only when on ground and not already jumping
    if (gameState.keyStates['Space'] && gameState.playerOnGround && 
        (!gameState.animationController || 
         (!gameState.animationController.isJumping && !gameState.animationController.jumpStarted))) {
        
        gameState.playerVelocity.y = jumpForce;
        jumpInitiated = true;
        console.log("Jump initiated in game logic");
    
        // Play jump sound
        if (window.soundSystem && window.soundSystem.initialized) {
            window.soundSystem.playJumpSound();
        }
        
        // Play jump animation using the controller - only at the start of the jump
        if (gameState.animationController) {
            // Set a slight delay before changing animation state
            setTimeout(() => {
                gameState.animationController.handleMovementState(false, true);
            }, 50);
        }
    }
    
    // Check player height for high altitude "fly" animation
    // This will be handled in the animation controller's update method
    // but we log here for debugging
    if (player.position.y >= 20 && gameState.animationController && 
        gameState.animationController.animations['fly'] &&
        !gameState.animationController.isFlying) {
    }
    
    // Movement direction (in camera space)
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    const movingForward = gameState.keyStates['KeyW'] || gameState.keyStates['ArrowUp'];
    const movingBackward = gameState.keyStates['KeyS'] || gameState.keyStates['ArrowDown'];
    
    if (movingForward) moveDirection.z = 1.0;
    if (movingBackward) moveDirection.z = -1.0;
    if (gameState.keyStates['KeyA'] || gameState.keyStates['ArrowLeft']) moveDirection.x = 1.0;
    if (gameState.keyStates['KeyD'] || gameState.keyStates['ArrowRight']) moveDirection.x = -1.0;

    moveDirection.normalize();
    gameState.isMovingBackward = movingBackward && !movingForward;
    
    // Convert movement from camera space to world space
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    
    const cameraRight = new THREE.Vector3(cameraDirection.z, 0, -cameraDirection.x);
    
    const worldMoveDirection = new THREE.Vector3();
    worldMoveDirection.addScaledVector(cameraRight, moveDirection.x);
    worldMoveDirection.addScaledVector(cameraDirection, moveDirection.z);
    
    // Apply movement
    if (worldMoveDirection.length() > 0) {
        worldMoveDirection.normalize();
        
        const moveDelta = worldMoveDirection.clone().multiplyScalar(gameState.speed * deltaTime);
        player.position.add(moveDelta);

        // Add footstep sounds when walking on ground
        if (gameState.playerOnGround) {
            const now = Date.now();
            if (now - (gameState.lastFootstepTime || 0) > 300) {
                if (window.playFootstepSound) window.playFootstepSound();
                gameState.lastFootstepTime = now;
            }
        }
        
        // Adjust player to terrain height
        const newGroundHeight = getTerrainHeight(player.position.x, player.position.z);
        if (gameState.playerOnGround) {
            player.position.y = newGroundHeight + 0.5;
        }
        
        // Smooth turn rotation
        if (worldMoveDirection.length() > 0 && !gameState.isMovingBackward) {
            const targetRotation = Math.atan2(worldMoveDirection.x, worldMoveDirection.z);
            let currentRotation = player.rotation.y;
            
            let rotationDiff = targetRotation - currentRotation;
            while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
            while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
            
            player.rotation.y += rotationDiff * Math.min(turnSpeed * deltaTime, 1.0);
        }

        // Only update running animation if we're not in the middle of a jump
        if (gameState.animationController && !gameState.animationController.isJumping) {
            gameState.animationController.handleMovementState(true, false);
        }
    } else {
        // When movement stops, transition to idle if not jumping
        if (gameState.animationController && !gameState.animationController.isJumping) {
            gameState.animationController.handleMovementState(false, false);
        }
    }
    
    // Apply vertical velocity (gravity/jumping)
    player.position.y += gameState.playerVelocity.y * deltaTime;
    
    // Prevent player from sinking too much when landing on hills
    const currentGroundHeight = getTerrainHeight(player.position.x, player.position.z);
    if (player.position.y < currentGroundHeight + 0.5 && gameState.playerVelocity.y <= 0) {
        player.position.y = currentGroundHeight + 0.5;
        gameState.playerVelocity.y = 0;
    }
    
    // Detect landing on ground (was in air, now on ground)
    if (!wasOnGround && gameState.playerOnGround) {
        if (window.soundSystem && window.soundSystem.initialized && window.soundSystem.playLandSound) {
            window.soundSystem.playLandSound();
        }
    }
    
    // Update camera position
    updateCamera(deltaTime);
    
    if (!gameState.goalReached && !gameState.gameOver) {
        checkTrampolineCollision();
    }

    // Check for goal (flag pole) - horizontal distance only for better pole collision
    const dx = player.position.x - flagPole.position.x;
    const dz = player.position.z - flagPole.position.z;
    const horizontalDistanceToGoal = Math.sqrt(dx * dx + dz * dz);

    if (horizontalDistanceToGoal < 2.8 && !gameState.goalReached) {
        gameState.goalReached = true;
        gameState.levelsCompleted ++;

        // Hide all tutorial messages if this is level 1
        if (gameState.levelSystem && gameState.currentLevel === 1) {
            cancelAllTutorials();
        }

        // Hide all elements with class "level-warning"
        document.querySelectorAll('.level-warning').forEach(element => {
            element.classList.add('hidden');
        });

        // Play goal sound
        if (window.playGoalSound) window.playGoalSound();
        
        // Use level system instead of showing the simple goal message
        if (gameState.levelSystem) {
            gameState.levelSystem.showLevelComplete();
        }
    }
}

// Optimized collision detection
function checkCollisions() {
    const playerRadius = 0.25;
    const obstacleRadius = 1; // Define this once
    const minDistance = playerRadius + obstacleRadius;
    const obstaclePos = new THREE.Vector3(); // Reuse this vector
    const pushDirection = new THREE.Vector3(); // Reuse this vector
    
    for (const obstacle of obstacles) {
        obstaclePos.setFromMatrixPosition(obstacle.matrixWorld);
        const distance = player.position.distanceTo(obstaclePos);
        
        if (distance < minDistance) {
            pushDirection.subVectors(player.position, obstaclePos).normalize();
            player.position.addScaledVector(pushDirection, minDistance - distance);
        }
    }
}

function resetGame() {
    console.log("reset game");
    // Reset game over state
    gameState.gameOver = false;
    gameState.levelsCompleted = 0;

    // Reset player position
    player.position.set(0, 50, 0);
    gameState.playerVelocity.set(0, 0, 0);
    gameState.goalReached = false;
    
    // Hide all UI messages
    document.getElementById('game-over-screen').classList.add('hidden');

    // If level system exists, reset current level
    if (gameState.levelSystem) {
        gameState.levelSystem.applyLevelSettings(gameState.currentLevel);
    }
    
    // Reset enemy manager
    if (gameState.enemyManager) {
        gameState.enemyManager.reset();
    }
    
    // Reset animation - play idle if available
    if (gameState.pandaModelLoaded && gameState.pandaAnimationMixer && gameState.pandaAnimations['idle']) {
        gameState.pandaAnimationMixer.stopAllAction();
        const idleAction = gameState.pandaAnimationMixer.clipAction(gameState.pandaAnimations['idle']);
        idleAction.play();
    }
    
    // Restart animation loop if it was cancelled
    if (!gameState.animationId) {
        lastTime = performance.now();
        gameState.animationId = requestAnimationFrame(animate);
    }

    if (gameState.snowSystem) {
        gameState.snowSystem.dispose();
        gameState.snowSystem = new SnowSystem(scene, player);
    }

    if (gameState.grassSystem && gameState.useGrassSystem) {
        gameState.grassSystem.dispose();
        gameState.grassSystem = new GrassSystem(scene, player, getTerrainHeight);
        
        // Ensure it has the correct colors
        if (window.selectedPalette) {
            gameState.grassSystem.updateColors(window.selectedPalette);
        }
    }

    // Remove old trampoline
    if (gameState.trampoline && gameState.trampoline.object) {
        scene.remove(gameState.trampoline.object);
        gameState.trampoline.object = null;
    }
            
    // Create a new trampoline for this level
    setTimeout(() => {
        initTrampoline();
    }, 1000);

    // Remove old portals and create new ones
    if (window.removeAllPortals && window.createPortals) {
        window.removeAllPortals(); // Remove existing portals
        window.createPortals();    // Immediately create new portals
    } else {
        console.warn("Portal functions not available during reset");
    }
    
    if (gameState.changingRoom) {
        gameState.changingRoom.placeRandomly();
    }

    if (gameState.ipod) {
        gameState.ipod.placeRandomly();
    }

    if (gameState.gameboy) {
        gameState.gameboy.placeRandomly();
    }

    if (gameState.cubicle) {
        gameState.cubicle.placeRandomly();
    }

    if (gameState.newspaper) {
        gameState.newspaper.placeRandomly();
    }

    // Reset hit points system
    if (gameState.hitPointsSystem) {
        gameState.hitPointsSystem.reset();
    }
    
    // Refresh high scores using the instance
    if (gameState.highScoreSystem) {
        console.log("refreshing high scores");
        try {
            gameState.highScoreSystem.fetchHighScores();
            console.log('High scores refreshed for new game');
        } catch (error) {
            console.error('Error refreshing high scores:', error);
        }
    } else {
        console.warn("HighScoreSystem not initialized");
    }
}

// Helper function to dispose of THREE.js objects properly
function disposeObject(obj) {
    if (obj.geometry) {
        obj.geometry.dispose();
    }
    
    if (obj.material) {
        if (Array.isArray(obj.material)) {
            obj.material.forEach(material => disposeMaterial(material));
        } else {
            disposeMaterial(obj.material);
        }
    }
    
    if (obj.children) {
        obj.children.forEach(child => disposeObject(child));
    }
}

function disposeMaterial(material) {
    if (material.map) material.map.dispose();
    if (material.lightMap) material.lightMap.dispose();
    if (material.bumpMap) material.bumpMap.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.specularMap) material.specularMap.dispose();
    if (material.envMap) material.envMap.dispose();
    material.dispose();
}

// Animation loop
let lastTime = 0;

function animate(currentTime) {
    // Don't animate if game is paused
    if (gameState.gamePaused) return;
    
    // Store the animation ID so we can cancel it
    gameState.animationId = requestAnimationFrame(animate);
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    // Skip first frame or if too much time passed (e.g., browser tab was inactive)
    if (isNaN(deltaTime) || deltaTime > 0.1) return;

    // Update FPS counter less frequently
    frameCount++;
    if (currentTime >= lastFpsUpdate + 500) {
        fps = Math.round(frameCount * 1000 / (currentTime - lastFpsUpdate));
        fpsCounter.textContent = `FPS: ${fps}`;
        frameCount = 0;
        lastFpsUpdate = currentTime;
    }
    
    // Update animation systems
    if (gameState.animationController) {
        gameState.animationController.update(deltaTime);
    } else if (gameState.pandaModelLoaded && gameState.pandaAnimationMixer) {
        gameState.pandaAnimationMixer.update(deltaTime);
    }
    
    // Only update game logic if not game over
    if (!gameState.gameOver) {
        // Game logic updates
        updatePlayerPosition(deltaTime);
        updateCamera(deltaTime); // Pass deltaTime here
        checkCollisions();
        
        // Update enemies
        if (gameState.enemyManager && !gameState.goalReached) {
            gameState.enemyManager.update(deltaTime);
        }
    }

    if (gameState.snowSystem) {
        gameState.snowSystem.update(deltaTime);
    }

    if (gameState.grassSystem && gameState.useGrassSystem) {
        gameState.grassSystem.update(deltaTime);
    }

    if (gameState.changingRoom && !gameState.goalReached) {
        gameState.changingRoom.update(deltaTime);
    }

    if (gameState.jetpack && !gameState.goalReached) {
        gameState.jetpack.update(deltaTime);
    }

    if (gameState.ipod && !gameState.goalReached) {
        gameState.ipod.update(deltaTime);
    }

    if (gameState.gameboy && !gameState.goalReached) {
        gameState.gameboy.update(deltaTime);
    }

    if (gameState.cubicle && !gameState.goalReached) {
        gameState.cubicle.update(deltaTime);
    }

    if (gameState.newspaper && !gameState.goalReached) {
        gameState.newspaper.update(deltaTime);
    }

    // Update hit points system
    if (gameState.hitPointsSystem && !gameState.gamePaused) {
        gameState.hitPointsSystem.update(deltaTime);
    }
    
    renderer.render(scene, camera);
}

// Initialize the game
function init() {
    // Set up event listeners
    initEventListeners();

    // Initialize enemy manager
    gameState.enemyManager = new EnemyManager(scene, player, getTerrainHeight);
    gameState.enemyManager.initialize();
    
    // Initialize level system
    gameState.levelSystem = new LevelSystem(scene, gameState.enemyManager, player, flagPole);
    gameState.levelSystem.initialize();
    
    // Make renderer globally accessible for mobile orientation handling
    window.renderer = renderer;

    // Handle initial sizing for proper mobile rendering
    handleViewportResize();
    
    // Start the animation loop with the correct timestamp
    lastTime = performance.now();
    requestAnimationFrame(animate);

    // Make player and other key objects accessible to mobile controls
    window.player = player;

    setTimeout(() => {
        console.log("init mobile controls from game.js");
        window.mobileControls = new MobileControls();
    }, 4000);

    gameState.sunset = createSunsetEnvironment(scene);

    gameState.snowSystem = new SnowSystem(scene, player);
    console.log("Snow system initialized in game init");

    // Initialize grass system
    if(gameState.useGrassSystem){
        gameState.grassSystem = new GrassSystem(scene, player, getTerrainHeight);
        console.log("Grass system initialized in game init");
    }

    if(!isMobile){
        gameState.changingRoom = new ChangingRoom(scene, player, getTerrainHeight);
        gameState.changingRoom.initialize();
        console.log("Changing room initialized");
    }

    initTrampoline();

    //init jetpack
    gameState.jetpack = new Jetpack(scene, player, getTerrainHeight);
    gameState.jetpack.initialize();
    console.log("jetpack initialized");

    // Initialize iPod
    gameState.ipod = new Ipod(scene, player, getTerrainHeight);
    gameState.ipod.initialize();
    console.log("iPod initialized");

    // Initialize Gameboy
    gameState.gameboy = new Gameboy(scene, player, getTerrainHeight);
    gameState.gameboy.initialize();
    console.log("Gameboy initialized");

    gameState.cubicle = new Cubicle(scene, player, getTerrainHeight);
    gameState.cubicle.initialize();
    console.log("cubicle initialized");

    gameState.newspaper = new Newspaper(scene, player, getTerrainHeight);
    gameState.newspaper.initialize();
    console.log("newspaper initialized");

    gameState.highScoreSystem = new HighScoreSystem();
    console.log("HighScoreSystem initialized");

    // Initialize hit points system
    gameState.hitPointsSystem = new HitPointsSystem();
    console.log("Hit points system initialized");
}

function handleViewportResize() {
    // Update renderer size to match viewport
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    // Maintain pixelated look
    renderer.setPixelRatio(pixelRatio);
}

function showTutorialMessages() {
    // Message IDs in order
    let messageIds;
    
    if(isMobile){
      messageIds = [
        'instruction-message-1-mobile',
        'instruction-message-2-mobile',
        'instruction-message-3-mobile',
      ];
    } else {
      messageIds = [
        'instruction-message-1',
        'instruction-message-2',
        'instruction-message-3',
      ];
    }
    
    // Display time for each message in milliseconds
    const displayTime = 5000; // 5 seconds
    
    // Break time between messages
    const breakTime = 1000;
    
    // Create array to store timeouts so we can cancel them later
    window.tutorialTimeouts = [];
    
    // Show messages sequentially
    messageIds.forEach((id, index) => {
      // Calculate delay for this message
      // Each message starts after: (display + break) * previous messages
      const delay = index * (displayTime + breakTime);
      
      // Show this message after the calculated delay
      window.tutorialTimeouts.push(setTimeout(() => {
        const messageEl = document.getElementById(id);
        if (messageEl) {
          messageEl.classList.remove('hidden');
          
          // Hide this message after display time
          window.tutorialTimeouts.push(setTimeout(() => {
            messageEl.classList.add('hidden');
          }, displayTime));
        }
      }, delay));
    });
  }

function cancelAllTutorials() {
    // Clear any pending tutorial timeouts
    if (window.tutorialTimeouts) {
      window.tutorialTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    }
    
    // Hide all tutorial messages (both desktop and mobile)
    document.querySelectorAll('[id^="instruction-message-"]').forEach(element => {
      element.classList.add('hidden');
    });
    
    // Hide any visible level warnings too
    document.querySelectorAll('.level-warning').forEach(element => {
      element.classList.add('hidden');
    });
}

// Pause Game Function
function pauseGame() {
    // Only pause if the game is running
    if (!gameState.gamePaused && !gameState.gameOver && !gameState.goalReached) {
        console.log("Game paused");
        
        // Set pause state
        gameState.gamePaused = true;
        
        // Show pause screen UI
        const pauseScreenContainer = document.getElementById('pause-screen-container');
        if (pauseScreenContainer) {
            pauseScreenContainer.classList.remove('hidden');
        }

        // Cancel animation frame to stop the game loop
        if (gameState.animationId) {
            cancelAnimationFrame(gameState.animationId);
            gameState.animationId = null;
        }

        if(window.soundSystem.pauseMusic) soundSystem.pauseMusic();
    }
}

// Unpause Game Function
function unpauseGame() {
    if (gameState.gamePaused) {
        console.log("Game unpaused");
        
        // Reset pause state
        gameState.gamePaused = false;
        
        // Hide pause screen UI
        const pauseScreenContainer = document.getElementById('pause-screen-container');
        if (pauseScreenContainer) {
            pauseScreenContainer.classList.add('hidden');
        }

        // Restart animation loop
        if (!gameState.animationId) {
            lastTime = performance.now();
            gameState.animationId = requestAnimationFrame(animate);
        }

        if(window.soundSystem.unpauseMusic) soundSystem.unpauseMusic();
    }
}

// Event listener for the unpause button
document.getElementById('unpause-button').addEventListener('click', unpauseGame);

function regenerateTerrain() {
    // Remove old terrain from scene
    if (gameState.terrain) {
        scene.remove(gameState.terrain);
        
        // Properly dispose of all geometries and materials
        gameState.terrain.traverse((child) => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });

        // Dispose of the grass system before creating a new one
        if (gameState.grassSystem && gameState.useGrassSystem) {
            gameState.grassSystem.dispose();
            gameState.grassSystem = null;
        }
    }
    
    // Create new terrain
    gameState.terrain = createTerrain();
    scene.add(gameState.terrain);
    
    // Create new grass system AFTER terrain is created so it uses the new palette
    if(gameState.useGrassSystem){
        if (!gameState.grassSystem) {
            gameState.grassSystem = new GrassSystem(scene, player, getTerrainHeight);
        } else {
            // If for some reason the grass system wasn't disposed, update its colors
            gameState.grassSystem.updateColors(window.selectedPalette || selectedPalette);
        }
    }
}

// Start the game
init();
window.camera = camera;
window.player = player;
window.regenerateTerrain = regenerateTerrain;