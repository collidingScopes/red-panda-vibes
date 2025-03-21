const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
console.log("Mobile check:", isMobile);

// Game state
const gameState = {
    speed: 12.0,
    currentLevel: 1,
    playerVelocity: new THREE.Vector3(),
    playerOnGround: false,
    keyStates: {},
    gamePaused: false,
    goalReached: false,
    enemyManager: null,
    levelSystem: null, // Add the level system reference
    gameStarted: false,
    gameOver: false,   // Add game over state
    animationId: null, // Track animation frame ID
    pandaModel: null,  // Reference to the actual 3D model inside the player group
    pandaModelLoaded: false, // Flag to track if the 3D model was loaded
    pandaAnimationMixer: null, // Animation mixer for the panda model
    pandaAnimations: {} // Storage for different animations
};

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
//let speed = 12.0;
const jumpForce = 9.5;
const gravity = 16.0;

// Make gameState globally accessible for mobile controls
window.gameState = gameState;

// FPS counter variables
let frameCount = 0;
let lastFpsUpdate = 0;
let fps = 0;
const fpsCounter = document.getElementById('fps-counter');

// Camera setup
const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

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
scene.background = createSunsetBackground();

// Enhanced sunset lighting for more dramatic shadows
// Warm ambient light for sunset feel
const ambientLight = new THREE.AmbientLight(0xffe0c0, 0.6); // Warm amber glow
scene.add(ambientLight);

// Strong directional light with warm sunset color
const directionalLight = new THREE.DirectionalLight(0xff9966, 1.2); // Warm orange sunset
directionalLight.position.set(-30, 20, 30); // Position to create dramatic shadows
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
// Increase shadow darkness for more contrast
directionalLight.shadow.bias = -0.001;
scene.add(directionalLight);

// Add a secondary light for dramatic effect - cool blue to complement warm light
const secondaryLight = new THREE.DirectionalLight(0x84b9ff, 0.6); // Bluish light
secondaryLight.position.set(50, 30, -30);
scene.add(secondaryLight);

// Add some neon glow point lights scattered around
function addNeonLights() {
    for (let i = 0; i < 8; i++) {
        const color = COLORS.neon[Math.floor(Math.random() * COLORS.neon.length)];
        const intensity = 0.1 + Math.random() * 0.5;
        const radius = 2 + Math.random() * 20;
        
        const light = new THREE.PointLight(color, intensity, radius * 8);
        
        // Random position
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 80 + 10;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const y = getTerrainHeight(x, z) + (Math.random() * 4) + 0.5;
        
        light.position.set(x, y, z);
        scene.add(light);
    }
}

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
    
    if (animations && animations.length > 0) {
        // Set up animation mixer
        gameState.pandaAnimationMixer = new THREE.AnimationMixer(model);
        
        // Store animations by name for easy access
        animations.forEach(clip => {
            gameState.pandaAnimations[clip.name] = clip;
            console.log("Found animation: " + clip.name);
        });
        
        // Set default animation if available
        if (gameState.pandaAnimations['idle']) {
            const idleAction = gameState.pandaAnimationMixer.clipAction(gameState.pandaAnimations['idle']);
            idleAction.play();
        } else if (animations.length > 0) {
            // Just play the first animation if no idle animation is found
            const defaultAction = gameState.pandaAnimationMixer.clipAction(animations[0]);
            defaultAction.play();
        }
    }
    
    console.log("Panda model reference set in game state");
};

// Create the map
gameState.terrain = createTerrain();
const flagPole = createFlagPole();
const flagMesh = flagPole.children[1]; // Cache flag reference for animation
const obstacles = createObstacles();

const river = createRiver();
setupRiverGameplay();

function initEventListeners() {
    // Input handling
    document.addEventListener('keydown', (event) => {
        event.preventDefault();
        gameState.keyStates[event.code] = true;
    });

    document.addEventListener('keyup', (event) => {
        gameState.keyStates[event.code] = false;
    });

    // Add event listener for closing the instructions
    document.getElementById('close-instructions').addEventListener('click', () => {
        document.getElementById('instructions').style.display = 'none';
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
window.cameraDistance = 7.5;

// Add min and max for vertical camera angle to prevent looking below ground
const MIN_VERTICAL_ANGLE = -Math.PI/11; // Minimum (looking up)
const MAX_VERTICAL_ANGLE = Math.PI/4;  // Maximum (looking down, but not below ground)
const cameraTarget = new THREE.Vector3(); // Reusable vector for camera target

function updateCamera() {
    // Update camera angles based on arrow key inputs
    if (gameState.keyStates['ArrowLeft']) window.cameraAngleHorizontal += 0.03;
    if (gameState.keyStates['ArrowRight']) window.cameraAngleHorizontal -= 0.03;
    // Apply the min/max vertical angle limits
    if (gameState.keyStates['ArrowUp']) window.cameraAngleVertical = Math.max(window.cameraAngleVertical - 0.04, MIN_VERTICAL_ANGLE);
    if (gameState.keyStates['ArrowDown']) window.cameraAngleVertical = Math.min(window.cameraAngleVertical + 0.04, MAX_VERTICAL_ANGLE);
    
    // Calculate camera position with orbit controls
    const horizontalDistance = window.cameraDistance * Math.cos(window.cameraAngleVertical);
    const verticalDistance = window.cameraDistance * Math.sin(window.cameraAngleVertical);
    
    // Update camera position using player's position without cloning
    camera.position.x = player.position.x + horizontalDistance * Math.sin(window.cameraAngleHorizontal);
    camera.position.z = player.position.z + horizontalDistance * Math.cos(window.cameraAngleHorizontal);
    camera.position.y = player.position.y + 2.5 + verticalDistance; // 1.5 is a height offset
    
    // Reuse the target vector
    cameraTarget.copy(player.position);
    cameraTarget.y += 1; // Look at player's head level
    camera.lookAt(cameraTarget);
}

// Game physics and movement
function updatePlayerPosition(deltaTime) {
    if (gameState.goalReached) return;
        
    // Ground check
    const groundHeight = getTerrainHeight(player.position.x, player.position.z);
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
    
    // Handle jumping
    if (gameState.keyStates['Space'] && gameState.playerOnGround) {
        gameState.playerVelocity.y = jumpForce;

        // Add this line to play jump sound
        if (window.soundSystem && window.soundSystem.initialized) {
            window.soundSystem.playJumpSound();
        }
        
        // Play jump animation if available
        if (gameState.pandaModelLoaded && gameState.pandaAnimationMixer && gameState.pandaAnimations['jump']) {
            gameState.pandaAnimationMixer.stopAllAction();
            const jumpAction = gameState.pandaAnimationMixer.clipAction(gameState.pandaAnimations['jump']);
            jumpAction.setLoop(THREE.LoopOnce);
            jumpAction.clampWhenFinished = true;
            jumpAction.play();
            
            // Switch back to idle or run after animation completes
            setTimeout(() => {
                if (!gameState.gameOver && gameState.pandaModelLoaded) {
                    gameState.pandaAnimationMixer.stopAllAction();
                    const nextAnim = isMoving() ? 'run' : 'idle';
                    if (gameState.pandaAnimations[nextAnim]) {
                        const action = gameState.pandaAnimationMixer.clipAction(gameState.pandaAnimations[nextAnim]);
                        action.play();
                    }
                }
            }, 1000); // Adjust timing based on your jump animation length
        }
    }
    
    // Movement direction (in camera space)
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    if (gameState.keyStates['KeyW']) moveDirection.z = 1;
    if (gameState.keyStates['KeyS']) moveDirection.z = -1;
    if (gameState.keyStates['KeyA']) moveDirection.x = 1;
    if (gameState.keyStates['KeyD']) moveDirection.x = -1;
    
    moveDirection.normalize();
    
    // Helper function to check if player is moving horizontally
    function isMoving() {
        return moveDirection.length() > 0;
    }
    
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
        
        // Calculate new position
        const moveDelta = worldMoveDirection.clone().multiplyScalar(gameState.speed * deltaTime);
        player.position.add(moveDelta);

        // Add this code to play footstep sounds when walking on ground:
        if (gameState.playerOnGround) {
            const now = Date.now();
            if (now - (gameState.lastFootstepTime || 0) > 300) {
                if (window.playFootstepSound) window.playFootstepSound();
                gameState.lastFootstepTime = now;
            }
        }
        
        // Adjust player to terrain height - improved to prevent sinking
        const newGroundHeight = getTerrainHeight(player.position.x, player.position.z);
        
        // Only adjust height if we're on the ground, and make sure player stays on top
        if (gameState.playerOnGround) {
            player.position.y = newGroundHeight + 0.5; // Keep player on top of terrain
        }
        
        // Rotate player to face direction of movement
        player.lookAt(player.position.clone().add(worldMoveDirection));
        
        // Play run animation if available and not already running
        if (gameState.pandaModelLoaded && gameState.pandaAnimationMixer && gameState.pandaAnimations['run']) {
            // Check if we're not already playing the run animation
            const currentAction = gameState.pandaAnimationMixer._actions.find(a => a.isRunning());
            if (!currentAction || currentAction._clip.name !== 'run') {
                gameState.pandaAnimationMixer.stopAllAction();
                const runAction = gameState.pandaAnimationMixer.clipAction(gameState.pandaAnimations['run']);
                runAction.play();
            }
        }
    } else if (gameState.playerOnGround) {
        // Play idle animation when not moving and on ground
        if (gameState.pandaModelLoaded && gameState.pandaAnimationMixer && gameState.pandaAnimations['idle']) {
            // Check if we're not already playing the idle animation
            const currentAction = gameState.pandaAnimationMixer._actions.find(a => a.isRunning());
            if (!currentAction || currentAction._clip.name !== 'idle') {
                gameState.pandaAnimationMixer.stopAllAction();
                const idleAction = gameState.pandaAnimationMixer.clipAction(gameState.pandaAnimations['idle']);
                idleAction.play();
            }
        }
    }
    
    // Apply vertical velocity (gravity/jumping)
    player.position.y += gameState.playerVelocity.y * deltaTime;
    
    // Prevent player from sinking too much when landing on hills
    const currentGroundHeight = getTerrainHeight(player.position.x, player.position.z);
    if (player.position.y < currentGroundHeight + 0.5 && gameState.playerVelocity.y <= 0) {
        player.position.y = currentGroundHeight + 0.5;
        gameState.playerVelocity.y = 0;
        
        // If we just landed, play idle or run animation
        if (!gameState.playerOnGround) {
            if (gameState.pandaModelLoaded && gameState.pandaAnimationMixer) {
                gameState.pandaAnimationMixer.stopAllAction();
                const nextAnim = isMoving() ? 'run' : 'idle';
                if (gameState.pandaAnimations[nextAnim]) {
                    const action = gameState.pandaAnimationMixer.clipAction(gameState.pandaAnimations[nextAnim]);
                    action.play();
                }
            }
        }
    }
    
    // Update camera position
    updateCamera();
    
    // Check for goal (flag pole) - horizontal distance only for better pole collision
    const dx = player.position.x - flagPole.position.x;
    const dz = player.position.z - flagPole.position.z;
    const horizontalDistanceToGoal = Math.sqrt(dx * dx + dz * dz);

    // Use a horizontal threshold of 2 units to detect touching any part of the pole
    if (horizontalDistanceToGoal < 2 && !gameState.goalReached) {
        gameState.goalReached = true;

        // Hide all tutorial messages if this is level 1
        if (gameState.levelSystem && gameState.currentLevel === 1) {
            cancelAllTutorials();
        }

        // Hide all elements with class "level-warning"
        document.querySelectorAll('.level-warning').forEach(element => {
            element.classList.add('hidden');
        });

        // Add this line to play goal sound:
        if (window.playGoalSound) window.playGoalSound();
        
        // Use level system instead of showing the simple goal message
        if (gameState.levelSystem) {
            gameState.levelSystem.showLevelComplete();
        } else {
            // Fallback to original message if level system isn't initialized
            document.getElementById('goal-message').style.display = 'block';
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
    
    // Reset player position
    player.position.set(0, 50, 0);
    gameState.playerVelocity.set(0, 0, 0);
    gameState.goalReached = false;
    
    // Hide all UI messages
    document.getElementById('goal-message').style.display = 'none';
    
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

    // Remove old trampoline
    if (gameState.trampoline && gameState.trampoline.object) {
        scene.remove(gameState.trampoline.object);
        gameState.trampoline.object = null;
    }

    // Remove old portals and create new ones
    if (window.removeAllPortals && typeof window.removeAllPortals === 'function') {
        window.removeAllPortals();
        
        // Create new portals after a short delay
        setTimeout(() => {
            if (window.createPortals && typeof window.createPortals === 'function') {
                window.createPortals();
            }
        }, 1000);
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
    
    // Update animation mixer if available
    if (gameState.pandaModelLoaded && gameState.pandaAnimationMixer) {
        gameState.pandaAnimationMixer.update(deltaTime);
    }
    
    // Only update game logic if not game over
    if (!gameState.gameOver) {
        // Game logic updates
        updatePlayerPosition(deltaTime);
        checkCollisions();
        
        // Update enemies
        if (gameState.enemyManager && !gameState.goalReached) {
            gameState.enemyManager.update(deltaTime);
        }
    }

    if (gameState.snowSystem) {
        gameState.snowSystem.update(deltaTime);
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

    // Create direct references to gameState for mobile control access
    if (window.mobileControls) {
        console.log("Mobile controls found - ensuring proper integration");
    }

    gameState.snowSystem = new SnowSystem(scene, player);
    console.log("Snow system initialized in game init");

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
        'instruction-message-4-mobile'
      ];
    } else {
      messageIds = [
        'instruction-message-1',
        'instruction-message-2',
        'instruction-message-3',
        'instruction-message-4'
      ];
    }
    
    // Display time for each message in milliseconds
    const displayTime = 5500; // 5.5 seconds
    
    // Break time between messages
    const breakTime = 1500;
    
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

class SnowSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        
        // Snow settings
        this.COUNT = 900;      // Number of snowflakes
        this.AREA_SIZE = 80;    // Area around player to show snow
        this.FALL_SPEED = 3;    // How fast snow falls
        this.DRIFT_SPEED = 0.6; // How much snow drifts horizontally
        this.MIN_SIZE = 0.01;    // Minimum snowflake size
        this.MAX_SIZE = 0.01;    // Maximum snowflake size

        this.initialize();
    }
    
    initialize() {
        // Create geometry for snow particles
        const positions = new Float32Array(this.COUNT * 3);
        const sizes = new Float32Array(this.COUNT);
        
        for (let i = 0; i < this.COUNT; i++) {
            positions[i * 3] = (Math.random() - 0.5) * this.AREA_SIZE;     // x
            positions[i * 3 + 1] = Math.random() * this.AREA_SIZE;         // y (height)
            positions[i * 3 + 2] = (Math.random() - 0.5) * this.AREA_SIZE; // z
            
            sizes[i] = this.MIN_SIZE + Math.random() * (this.MAX_SIZE - this.MIN_SIZE);
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.2,
            opacity: 0.65,
            transparent: true,
            sizeAttenuation: true,
            depthWrite: false,
            alphaTest: 0.1
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
        
        this.timeOffsets = new Float32Array(this.COUNT);
        for (let i = 0; i < this.COUNT; i++) {
            this.timeOffsets[i] = Math.random() * Math.PI * 2;
        }
        
        console.log("Snow system initialized with", this.COUNT, "particles");
    }
    
    update(deltaTime) {
        if (!this.particles) return;
        
        const playerPos = this.player.position;
        const positions = this.particles.geometry.attributes.position.array;
        
        for (let i = 0; i < this.COUNT; i++) {
            const idx = i * 3;
            
            // Move snowflake down
            positions[idx + 1] -= this.FALL_SPEED * deltaTime;
            
            // Add slight horizontal drift
            const timeOffset = this.timeOffsets[i];
            positions[idx] += Math.sin(timeOffset + performance.now() * 0.001) * this.DRIFT_SPEED * deltaTime;
            positions[idx + 2] += Math.cos(timeOffset + performance.now() * 0.001) * this.DRIFT_SPEED * deltaTime;
            
            // Reset snowflake if it falls below the terrain
            const snowflakeX = positions[idx] + playerPos.x;
            const snowflakeZ = positions[idx + 2] + playerPos.z;
            const terrainHeight = getTerrainHeight(snowflakeX, snowflakeZ);
            
            if (positions[idx + 1] + playerPos.y < terrainHeight + 0.5) {
                positions[idx] = (Math.random() - 0.5) * this.AREA_SIZE;
                positions[idx + 1] = this.AREA_SIZE;
                positions[idx + 2] = (Math.random() - 0.5) * this.AREA_SIZE;
            }
            
            // If snowflake is too far from player, reset it
            if (Math.abs(positions[idx]) > this.AREA_SIZE/2 || 
                Math.abs(positions[idx + 2]) > this.AREA_SIZE/2) {
                positions[idx] = (Math.random() - 0.5) * this.AREA_SIZE;
                positions[idx + 1] = Math.random() * this.AREA_SIZE; 
                positions[idx + 2] = (Math.random() - 0.5) * this.AREA_SIZE;
            }
        }
        
        // Update particle system position to center around player
        this.particles.position.copy(playerPos);
        
        // Mark attributes as needing update
        this.particles.geometry.attributes.position.needsUpdate = true;
    }
    
    dispose() {
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
            this.particles = null;
        }
    }
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
    }
    
    // Create new terrain
    gameState.terrain = createTerrain();
    scene.add(gameState.terrain);
}

// Start the game
init();
window.camera = camera;
window.player = player;
window.regenerateTerrain = regenerateTerrain;

// Expose camera angles to global scope for mobile camera flip button
window.cameraAngleHorizontal = cameraAngleHorizontal;
window.cameraAngleVertical = cameraAngleVertical;