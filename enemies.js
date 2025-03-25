// Enemy class and management for Red Panda Explorer
class EnemyManager {
    constructor(scene, player, terrainHeightFunction) {
        this.scene = scene;
        this.player = player;
        this.getTerrainHeight = terrainHeightFunction;
        this.enemies = [];
        this.gameOver = false;
        
        // Enemy settings
        this.COUNT = 15; // Number of enemies in the world
        this.DETECTION_RADIUS = 25; // How far enemies can see the player
        this.SPEED_WANDER = gameState.speed*0.55; // Speed when wandering randomly
        this.SPEED_CHASE = gameState.speed*0.7; // Speed when chasing the player
        this.KILL_DISTANCE = 1.4; // How close an enemy needs to be to catch the player
        
        // Add kill counter property
        this.killCount = 0;
        
        // Add invisibility property
        this.playerIsInvisible = false;
        
        // Reusable vectors to optimize performance
        this.tempVector = new THREE.Vector3();
        this.targetVector = new THREE.Vector3();

        // Add these new properties for smooth movement
        this.rotationSmoothness = 0.9; // Lower values = smoother rotation (0.05 - 0.2 is good)
        this.minMovementThreshold = 0.01; // Minimum movement before rotating
        
        // Create game over screen (hidden initially)
        this.createGameOverScreen();
        
        // Initialize the kill counter display
        this.updateKillCounterDisplay();
    }
    
    // Initialize enemies
    initialize() {        
        for (let i = 0; i < this.COUNT; i++) {
            this.createEnemy();
        }
    }
    
    // Create a single enemy
    createEnemy() {
        // Position enemy randomly on terrain, but away from player start position
        let x, z, distanceFromStart;
        do {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 70 + 40; // Minimum 40 units from center
            x = Math.cos(angle) * distance;
            z = Math.sin(angle) * distance;
            
            // Calculate distance from start position (0,0,0)
            distanceFromStart = Math.sqrt(x * x + z * z);
        } while (distanceFromStart < 30); // Make sure it's at least 30 units away from start
        
        const y = this.getTerrainHeight(x, z) + 1; // Slightly above terrain
        
        // Create the oily blob enemy with dark, translucent material
        const enemy = this.createBlobMesh();
        enemy.position.set(x, y, z);
        
        // Add enemy properties
        enemy.userData = {
            velocity: new THREE.Vector3(), // Current velocity vector
            targetPoint: new THREE.Vector3(x, y, z), // Where it's trying to go
            wanderTimer: 0, // Timer for changing wander direction
            wanderInterval: 3 + Math.random() * 2, // Time between wander direction changes
            state: 'wander', // 'wander' or 'chase'
            initialScale: enemy.scale.x, // Save initial scale for pulsing animation
        };
        
        this.scene.add(enemy);
        this.enemies.push(enemy);
        return enemy;
    }
    
    // Create the oil slick blob mesh with alien-like appearance
    createBlobMesh() {
        // Create group to hold the entire enemy
        const blobGroup = new THREE.Group();
        
        // Main body - dark translucent sphere with warped shape
        const blobGeometry = new THREE.SphereGeometry(1, 8, 8);
        
        // Create custom vertex displacement for more organic shape
        const positionAttribute = blobGeometry.getAttribute('position');
        const vertex = new THREE.Vector3();
        
        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);
            
            // Apply noise to make it blobby (this is a simple way to create organic feel)
            const noise = Math.sin(vertex.x * 4) * 0.2 + 
                        //Math.sin(vertex.y * 5) * 0.2 + 
                        Math.sin(vertex.z * 3) * 0.2;
            
            vertex.multiplyScalar(1 + noise);
            
            positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        
        // Update normals for proper lighting
        //blobGeometry.computeVertexNormals();
        
        // Create dark, oily material with slight sheen
        const blobMaterial = new THREE.MeshStandardMaterial({
            color: 0x151556, // Very dark blue-black
            roughness: 0.3, // Somewhat shiny
            metalness: 1.0, // Metallic look for oil sheen effect
            transparent: true,
            opacity: 0.8,
            emissive: 0x154473, // Slight blue glow
            emissiveIntensity: 0.7
        });
        
        const blob = new THREE.Mesh(blobGeometry, blobMaterial);
        blob.castShadow = true;
        blobGroup.add(blob);
        
        // Add smaller bubbles on the surface for alien look
        const bubbleCount = 1 + Math.floor(Math.random() * 5);
        const bubbleMaterial = new THREE.MeshStandardMaterial({
            color: 0x731d77, // Dark blue
            roughness: 0.2, // Very shiny
            metalness: 0.8, // Very metallic
            transparent: true,
            opacity: 0.8,
        });
        
        for (let i = 0; i < bubbleCount; i++) {
            const bubbleSize = 0.3 + Math.random() * 0.4;
            const bubbleGeometry = new THREE.SphereGeometry(bubbleSize, 5, 5);
            const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
            
            // Position bubble on surface of main blob
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const radius = 0.8;
            
            bubble.position.x = radius * Math.sin(phi) * Math.cos(theta);
            bubble.position.y = radius * Math.sin(phi) * Math.sin(theta);
            bubble.position.z = radius * Math.cos(phi);
            
            blobGroup.add(bubble);
        }
        
        // Scale the entire enemy
        const scale = 1.0 + Math.random() * 0.5; // Random size variation
        blobGroup.scale.set(scale, scale, scale);
        
        return blobGroup;
    }
    
    // Update the kill counter display
    updateKillCounterDisplay() {
        const counterElement = document.getElementById('enemy-kill-counter');
        if (counterElement) {
            counterElement.textContent = `Monsters smushed: ${this.killCount}`;
        }
    }
    
    // Add this method to the EnemyManager class
    killEnemy(enemy) {
        // Increment kill counter
        this.killCount++;
        
        // Update the counter display
        this.updateKillCounterDisplay();
        
        // Create an explosion effect at the enemy's position
        this.createDeathEffect(enemy.position.clone());
        
        // Remove from scene
        this.scene.remove(enemy);
        
        // Remove from array
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
        }
        
        // Properly dispose of resources
        this.disposeEnemy(enemy);
        
        // Play crush sound
        if (window.playEnemyCrushSound) {
            window.playEnemyCrushSound();
        }
    }

    // 2. Add a visual effect for when enemies are killed
    // Add this method to the EnemyManager class
    createDeathEffect(position) {
        // Create particle effect (simple expanding rings)
        const ringCount = 3;
        //const ringColor = 0x84ffef; // Cyan color to match game's theme
        const ringColor = COLORS.synthwave[Math.floor(Math.random() * COLORS.synthwave.length)];
            
        for (let i = 0; i < ringCount; i++) {
            // Create ring geometry
            const geometry = new THREE.RingGeometry(0.2, 0.4, 16);
            const material = new THREE.MeshBasicMaterial({ 
                color: ringColor,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            
            const ring = new THREE.Mesh(geometry, material);
            ring.position.copy(position);
            
            // Rotate ring to be horizontal
            ring.rotation.x = Math.PI / 2;
            
            this.scene.add(ring);
            
            // Animate the ring
            const delay = i * 100; // Stagger the animations
            const duration = 800; // Animation duration in ms
            const startTime = performance.now() + delay;
            
            const animate = (time) => {
                const elapsed = time - startTime;
                
                if (elapsed < 0) {
                    requestAnimationFrame(animate);
                    return;
                }
                
                if (elapsed > duration) {
                    this.scene.remove(ring);
                    geometry.dispose();
                    material.dispose();
                    return;
                }
                
                const progress = elapsed / duration;
                
                // Scale the ring
                const scale = 0.5 + progress * 15;
                ring.scale.set(scale, scale, scale);
                
                // Fade out
                material.opacity = 1.0 * (1 - progress);
                
                requestAnimationFrame(animate);
            };
            
            requestAnimationFrame(animate);
        }
    }

    checkJumpKill() {
        // Skip if we're on level 1 (no enemies) or game is over
        if ((gameState.levelSystem && gameState.currentLevel === 1) || this.gameOver) {
            return;
        }
        
        // Only check when player is falling (velocity.y < 0)
        if (gameState.playerVelocity.y >= 0) {
            return;
        }
        
        const playerPos = this.player.position.clone();
        const playerBottom = playerPos.y - 0.5; // Approximate bottom of player
        
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const enemyPos = enemy.position.clone();
            const enemyTop = enemyPos.y + 1.0; // Approximate top of enemy
            
            // Calculate horizontal distance to enemy
            enemyPos.y = 0;
            playerPos.y = 0;
            const horizontalDistance = enemyPos.distanceTo(playerPos);
            
            // If player is directly above enemy (within jump kill radius) and close to top of enemy
            if (horizontalDistance < 1.2 && 
                Math.abs(playerBottom - enemyTop) < 0.5) {
                
                // Kill the enemy
                this.killEnemy(enemy);
                
                // Make player bounce
                gameState.playerVelocity.y = 11.0; // Bounce up velocity
                
                // Only kill one enemy per frame
                break;
            }
        }
    }

    update(deltaTime) {
        if (this.gameOver) return;
        
        for (const enemy of this.enemies) {
            this.updateEnemy(enemy, deltaTime);
        }
        
        // Check for jump kills (add this line)
        this.checkJumpKill();
        
        // Check if any enemy has caught the player
        this.checkPlayerCaught();
    }
    
    updateEnemy(enemy, deltaTime) {
        const userData = enemy.userData;
        
        // Distance to player
        const distanceToPlayer = enemy.position.distanceTo(this.player.position);
        
        // Check if we're currently in a rotation transition for wandering
        if (userData.state === 'wander' && userData.isRotating) {
            // Handle rotation transition
            userData.rotationTimer += deltaTime;
            if (userData.rotationTimer >= userData.rotationDuration) {
                // Rotation complete, resume movement
                userData.isRotating = false;
            }
            // Skip the rest of the update while rotating
            return;
        }
        
        // Update enemy state based on player proximity and invisibility status
        if (distanceToPlayer < this.DETECTION_RADIUS && !this.playerIsInvisible) {
            // Add this check to play warning sound only when first detecting player:
            if (userData.state !== 'chase') {
                if (window.playEnemyWarningSound) window.playEnemyWarningSound();
            }
            userData.state = 'chase';
            
            // For chase state, target the player directly
            this.targetVector.copy(this.player.position);
        } else {
            // If was chasing but lost sight or player is invisible, keep moving toward last known position for a while
            if (userData.state === 'chase') {
                // Only switch back to wander if we're close to where we last saw the player
                const distanceToTarget = enemy.position.distanceTo(userData.targetPoint);
                if (distanceToTarget < 2) {
                    userData.state = 'wander';
                    userData.wanderTimer = 0; // Reset wander timer
                    
                    // Set initial wander direction
                    this.setNewWanderDirection(enemy);
                }
            } else {
                userData.state = 'wander';
                
                userData.wanderTimer += deltaTime;
                if (userData.wanderTimer >= userData.wanderInterval) {
                    userData.wanderTimer = 0;
                    
                    // Set new wander direction
                    this.setNewWanderDirection(enemy);
                    
                    // Add slight variation to wander interval
                    userData.wanderInterval = 5 + Math.random() * 5;
                    
                    // Skip the rest of the update to prevent movement in this frame
                    return;
                }
            }
            
            // Copy the target point for movement calculation
            this.targetVector.copy(userData.targetPoint);
        }
        
        // Calculate direction to target
        this.tempVector.subVectors(this.targetVector, enemy.position).normalize();
        
        // Apply appropriate speed based on state
        const speed = (userData.state === 'chase') ? this.SPEED_CHASE : this.SPEED_WANDER;
        userData.velocity.copy(this.tempVector).multiplyScalar(speed * deltaTime);
        
        // Apply velocity
        enemy.position.add(userData.velocity);
        
        // Adjust height to terrain
        const terrainHeight = this.getTerrainHeight(enemy.position.x, enemy.position.z);
        enemy.position.y = terrainHeight + 1.2; // Hover above terrain
        
        // Handle rotation based on state
        if (userData.state === 'chase') {
            // For chase state, use smooth rotation (keeping original behavior)
            if (userData.velocity.length() > this.minMovementThreshold) {
                // Store the current rotation as a quaternion if it doesn't exist
                if (!userData.currentRotation) {
                    userData.currentRotation = new THREE.Quaternion().copy(enemy.quaternion);
                }
                
                // Create a target rotation by looking at where we're moving
                const targetPosition = enemy.position.clone().add(userData.velocity.clone().normalize());
                const tempEnemy = enemy.clone();
                tempEnemy.lookAt(targetPosition);
                const targetRotation = new THREE.Quaternion().copy(tempEnemy.quaternion);
                
                // Smoothly interpolate between current and target rotation
                userData.currentRotation.slerp(targetRotation, this.rotationSmoothness);
                
                // Apply the smooth rotation
                enemy.quaternion.copy(userData.currentRotation);
            }
        }
        // For wander state, rotation is handled in setNewWanderDirection
    }
    
    // Add this new helper method to set a new wander direction
    setNewWanderDirection(enemy) {
        const userData = enemy.userData;
        
        // Generate new random point for wandering
        const wanderRadius = 20 + Math.random() * 50;
        const angle = Math.random() * Math.PI * 2; // Completely random angle
        
        const newX = enemy.position.x + Math.cos(angle) * wanderRadius;
        const newZ = enemy.position.z + Math.sin(angle) * wanderRadius;
        const terrainHeight = this.getTerrainHeight(newX, newZ);
        
        userData.targetPoint.set(newX, terrainHeight + 1.2, newZ);
        
        // Set rotation state
        userData.isRotating = true;
        userData.rotationTimer = 0;
        userData.rotationDuration = 0.3; // Time to complete rotation (in seconds)
        
        // Immediately face the new direction
        const direction = new THREE.Vector3(newX - enemy.position.x, 0, newZ - enemy.position.z).normalize();
        const targetPosition = enemy.position.clone().add(direction);
        enemy.lookAt(targetPosition);
    }

    // Check if any enemy has caught the player
    checkPlayerCaught() {
        // Skip enemy collision check if we're on level 1 (no enemies) OR if the player is invisible
        if (gameState.levelSystem && gameState.currentLevel === 1 || this.playerIsInvisible) return;
        
        for (const enemy of this.enemies) {
            const distanceToPlayer = enemy.position.distanceTo(this.player.position);
            
            if (distanceToPlayer < this.KILL_DISTANCE) {
                this.triggerGameOver();
                break;
            }
        }
    }
    
    // Trigger game over state
    triggerGameOver() {
        // Set game state to game over
        gameState.gameOver = true;
        this.gameOver = true;

        // Add this line to play game over sound:
        if (window.playGameOverSound) window.playGameOverSound();
        
        // Save high score to localStorage
        const highScore = localStorage.getItem('redPandaHighScore') || 0;
        const currentScore = gameState.levelSystem ? gameState.currentLevel : 1;
        
        if (currentScore > highScore) {
            localStorage.setItem('redPandaHighScore', currentScore);
        }
        
        // Update game over screen with high score
        const gameOverScreen = document.getElementById('game-over-screen');
        const highScoreElement = gameOverScreen.querySelector('.high-score');
        
        document.querySelector('.current-game-level').textContent = `Current Score: Level ${currentScore}`;
        highScoreElement.textContent = `High Score: Level ${Math.max(highScore, currentScore)}`;
        
        // Show game over screen
        document.getElementById('game-over-screen').classList.remove("hidden");
    }
    
    // Reset enemies for a new game
    reset() {
        // Remove all existing enemies
        for (const enemy of this.enemies) {
            this.scene.remove(enemy);
            this.disposeEnemy(enemy);
        }

        // Reset kill counter when starting a new game
        if(this.gameOver){
            this.killCount = 0;
            this.updateKillCounterDisplay();
        }
        
        this.enemies = [];
        this.gameOver = false;
        this.playerIsInvisible = false; // Reset invisibility status
        document.getElementById('game-over-screen').classList.add("hidden");
        
        // Create new enemies
        this.initialize();
    }
    
    // Create game over screen
    createGameOverScreen() {
        // Add event listener for retry button
        document.getElementById('retry-button').addEventListener('click', () => {
            resetGame(); // This function is defined in game.js
        });
    }
    
    // Properly dispose of enemy resources to prevent memory leaks
    disposeEnemy(enemy) {
        enemy.traverse((child) => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => {
                        if (material.map) material.map.dispose();
                        material.dispose();
                    });
                } else {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            }
        });
    }
}

// Export the enemy manager for use in game.js
window.EnemyManager = EnemyManager;