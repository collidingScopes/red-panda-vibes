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
        this.SPEED_WANDER = 3; // Speed when wandering randomly
        this.SPEED_CHASE = 5; // Speed when chasing the player
        this.KILL_DISTANCE = 1.5; // How close an enemy needs to be to catch the player
        
        // Reusable vectors to optimize performance
        this.tempVector = new THREE.Vector3();
        this.targetVector = new THREE.Vector3();
        
        // Create game over screen (hidden initially)
        this.createGameOverScreen();
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
            const distance = Math.random() * 80 + 30; // Min 30 units from center
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
        const blobGeometry = new THREE.SphereGeometry(1, 20, 16);
        
        // Create custom vertex displacement for more organic shape
        const positionAttribute = blobGeometry.getAttribute('position');
        const vertex = new THREE.Vector3();
        
        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);
            
            // Apply noise to make it blobby (this is a simple way to create organic feel)
            const noise = Math.sin(vertex.x * 4) * 0.2 + 
                        Math.sin(vertex.y * 5) * 0.2 + 
                        Math.sin(vertex.z * 3) * 0.2;
            
            vertex.multiplyScalar(1 + noise);
            
            positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        
        // Update normals for proper lighting
        blobGeometry.computeVertexNormals();
        
        // Create dark, oily material with slight sheen
        const blobMaterial = new THREE.MeshStandardMaterial({
            color: 0x050510, // Very dark blue-black
            roughness: 0.2, // Somewhat shiny
            metalness: 0.8, // Metallic look for oil sheen effect
            transparent: true,
            opacity: 0.7,
            emissive: 0x334455, // Slight blue glow
            emissiveIntensity: 0.7
        });
        
        const blob = new THREE.Mesh(blobGeometry, blobMaterial);
        blob.castShadow = true;
        blobGroup.add(blob);
        
        // Add smaller bubbles on the surface for alien look
        const bubbleCount = 1 + Math.floor(Math.random() * 5);
        const bubbleMaterial = new THREE.MeshStandardMaterial({
            color: 0x050510, // Dark blue
            roughness: 0.2, // Very shiny
            metalness: 0.8, // Very metallic
            transparent: true,
            opacity: 0.7,
            emissive: 0x334455, // Slight blue glow
            emissiveIntensity: 0.7
        });
        
        for (let i = 0; i < bubbleCount; i++) {
            const bubbleSize = 0.2 + Math.random() * 0.3;
            const bubbleGeometry = new THREE.SphereGeometry(bubbleSize, 8, 8);
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
        
        // // Add a subtle point light to create glow effect
        // const light = new THREE.PointLight(0x334455, 1, 3);
        // light.position.set(0, 0, 0);
        // blobGroup.add(light);
        
        // Scale the entire enemy
        const scale = 0.8 + Math.random() * 0.5; // Random size variation
        blobGroup.scale.set(scale, scale, scale);
        
        return blobGroup;
    }
    
    // Update all enemies
    update(deltaTime) {
        if (this.gameOver) return;
        
        for (const enemy of this.enemies) {
            this.updateEnemy(enemy, deltaTime);
        }
        
        // Check if any enemy has caught the player
        this.checkPlayerCaught();
    }
    
    // Update a single enemy
    updateEnemy(enemy, deltaTime) {
        const userData = enemy.userData;
        
        // Distance to player
        const distanceToPlayer = enemy.position.distanceTo(this.player.position);
        
        // Update enemy state based on player proximity
        if (distanceToPlayer < this.DETECTION_RADIUS) {
            userData.state = 'chase';
            
            // For chase state, target the player directly
            this.targetVector.copy(this.player.position);
        } else {
            // If was chasing but lost sight, keep moving toward last known position for a while
            if (userData.state === 'chase') {
                // Only switch back to wander if we're close to where we last saw the player
                const distanceToTarget = enemy.position.distanceTo(userData.targetPoint);
                if (distanceToTarget < 2) {
                    userData.state = 'wander';
                    userData.wanderTimer = 0; // Reset wander timer
                }
            } else {
                userData.state = 'wander';
                
                // For wander state, update target point periodically
                userData.wanderTimer += deltaTime;
                if (userData.wanderTimer >= userData.wanderInterval) {
                    userData.wanderTimer = 0;
                    
                    // Generate new random point near current position
                    const wanderRadius = 10;
                    const angle = Math.random() * Math.PI * 2;
                    const newX = enemy.position.x + Math.cos(angle) * wanderRadius;
                    const newZ = enemy.position.z + Math.sin(angle) * wanderRadius;
                    const terrainHeight = this.getTerrainHeight(newX, newZ);
                    
                    userData.targetPoint.set(newX, terrainHeight + 1, newZ);
                    
                    // Reset wander interval for variation
                    userData.wanderInterval = 3 + Math.random() * 2;
                }
            }
            
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
        enemy.position.y = terrainHeight + 1; // Hover above terrain
        
        // Rotate enemy to face direction of movement
        if (userData.velocity.length() > 0.01) {
            enemy.lookAt(enemy.position.clone().add(userData.velocity));
        }
        
        // Animate the enemy based on state (pulsing/morphing)
        this.animateEnemy(enemy, deltaTime, userData.state);
    }
    
    // Animate enemy (pulse, grow when chasing, etc)
    animateEnemy(enemy, deltaTime, state) {
        // Pulse effect
        const pulseSpeed = (state === 'chase') ? 10 : 4;
        const pulseAmount = (state === 'chase') ? 0.2 : 0.1;
        const time = performance.now() * 0.001; 
        const pulse = Math.sin(time * pulseSpeed) * pulseAmount;
        
        // Base scale from initial scale
        const baseScale = enemy.userData.initialScale;
        
        // Grow slightly when chasing
        const chaseBonus = (state === 'chase') ? 0.2 : 0;
        
        // Apply scale
        const newScale = baseScale + pulse + chaseBonus;
        enemy.scale.set(newScale, newScale, newScale);
        
        // If chasing, make bubbles pulse more dramatically
        if (state === 'chase') {
            // Increase emissive intensity of all materials
            enemy.traverse((child) => {
                if (child.material) {
                    child.material.emissiveIntensity = 0.3 + Math.abs(pulse);
                }
            });
        } else {
            // Reset emissive intensity when not chasing
            enemy.traverse((child) => {
                if (child.material) {
                    child.material.emissiveIntensity = 0.2;
                }
            });
        }
    }
    
    // Check if any enemy has caught the player
    checkPlayerCaught() {
        // Skip enemy collision check if we're on level 1 (no enemies)
        if (gameState.levelSystem && gameState.levelSystem.currentLevel === 1) return;
        
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
        
        // Save high score to localStorage
        const highScore = localStorage.getItem('redPandaHighScore') || 0;
        const currentScore = gameState.levelSystem ? gameState.levelSystem.currentLevel : 1;
        
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
        
        this.enemies = [];
        this.gameOver = false;
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