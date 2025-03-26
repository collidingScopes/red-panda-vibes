// Gameboy Class
// Creates a low-poly 3D Gameboy Color in the game

// Create Snake game container
const snakeContainer = document.createElement('div');
snakeContainer.id = 'snake-game-container';

class Gameboy {
    constructor(scene, player, getTerrainHeight) {
        this.scene = scene;
        this.player = player;
        this.getTerrainHeight = getTerrainHeight;
        this.object = null;
        this.cooldown = false;
        this.cooldownTime = 2000; // 2 seconds cooldown between interactions
        this.detectionRadius = 6; // How close player needs to be to interact
        this.floatHeight = 6;
        // Colors
        this.bodyColor = 0xFFD700; // Yellow
        this.screenFrameColor = 0x000000; // Black
        this.screenColor = 0x98FB98; // Light green for the screen
        this.buttonsColor = {
            dpad: 0x0000FF, // Blue D-pad
            a: 0xFF0000,    // Red A button
            b: 0x00BFFF,    // Light blue B button
            select: 0x000000, // Black select button
            start: 0x000000   // Black start button
        };
        this.glow = null;
        this.particleSystem = null;
        this.particleTimeout = null;
        
        // Post-game cooldown to prevent immediate reactivation
        this.postGameCooldown = false;
        this.postGameCooldownTime = 4000; // 4 seconds post-game cooldown
    }

    async createGameboyModel() {
        // Create a group for the whole Gameboy
        const gameboyGroup = new THREE.Group();
        
        // Scale factor to easily adjust the overall size
        const scaleFactor = 2;

        // Main body of the Gameboy
        const bodyGeometry = new THREE.BoxGeometry(5 * scaleFactor, 8 * scaleFactor, 1 * scaleFactor);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.bodyColor,
            roughness: 0.5,
            metalness: 0.2,
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        gameboyGroup.add(body);
        
        // Screen frame (black area around the screen)
        const screenFrameGeometry = new THREE.BoxGeometry(4 * scaleFactor, 4 * scaleFactor, 0.2 * scaleFactor);
        const screenFrameMaterial = new THREE.MeshStandardMaterial({
            color: this.screenFrameColor,
            roughness: 0.8,
            metalness: 0.2
        });
        const screenFrame = new THREE.Mesh(screenFrameGeometry, screenFrameMaterial);
        screenFrame.position.set(0, 1.5 * scaleFactor, 0.6 * scaleFactor);
        gameboyGroup.add(screenFrame);
        
        // Screen (the actual display)
        const screenGeometry = new THREE.BoxGeometry(3 * scaleFactor, 3 * scaleFactor, 0.1 * scaleFactor);
        const screenMaterial = new THREE.MeshStandardMaterial({
            color: this.screenColor,
            roughness: 0.2,
            metalness: 0.3,
            emissive: this.screenColor,
            emissiveIntensity: 0.2
        });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.set(0, 1.5 * scaleFactor, 0.7 * scaleFactor);
        gameboyGroup.add(screen);

        // D-pad (cross shape)
        const dpadGroup = new THREE.Group();
        
        // Horizontal part of D-pad
        const dpadHGeometry = new THREE.BoxGeometry(1.2 * scaleFactor, 0.4 * scaleFactor, 0.2 * scaleFactor);
        const dpadMaterial = new THREE.MeshStandardMaterial({
            color: this.buttonsColor.dpad,
            roughness: 0.5,
            metalness: 0.3
        });
        const dpadH = new THREE.Mesh(dpadHGeometry, dpadMaterial);
        dpadGroup.add(dpadH);
        
        // Vertical part of D-pad
        const dpadVGeometry = new THREE.BoxGeometry(0.4 * scaleFactor, 1.2 * scaleFactor, 0.2 * scaleFactor);
        const dpadV = new THREE.Mesh(dpadVGeometry, dpadMaterial);
        dpadGroup.add(dpadV);
        
        dpadGroup.position.set(-1.5 * scaleFactor, -1.5 * scaleFactor, 0.6 * scaleFactor);
        gameboyGroup.add(dpadGroup);
        
        // A Button
        const aButtonGeometry = new THREE.CylinderGeometry(0.5 * scaleFactor, 0.5 * scaleFactor, 0.2 * scaleFactor, 16);
        const aButtonMaterial = new THREE.MeshStandardMaterial({
            color: this.buttonsColor.a,
            roughness: 0.4,
            metalness: 0.2
        });
        const aButton = new THREE.Mesh(aButtonGeometry, aButtonMaterial);
        aButton.rotation.x = Math.PI / 2;
        aButton.position.set(1.8 * scaleFactor, -1.2 * scaleFactor, 0.6 * scaleFactor);
        gameboyGroup.add(aButton);
        
        // B Button
        const bButtonGeometry = new THREE.CylinderGeometry(0.5 * scaleFactor, 0.5 * scaleFactor, 0.2 * scaleFactor, 16);
        const bButtonMaterial = new THREE.MeshStandardMaterial({
            color: this.buttonsColor.b,
            roughness: 0.4,
            metalness: 0.2
        });
        const bButton = new THREE.Mesh(bButtonGeometry, bButtonMaterial);
        bButton.rotation.x = Math.PI / 2;
        bButton.position.set(0.8 * scaleFactor, -1.8 * scaleFactor, 0.6 * scaleFactor);
        gameboyGroup.add(bButton);
        
        // Start & Select buttons (small rounded rectangles)
        const startSelectGroup = new THREE.Group();
        
        // Helper function to create Start/Select buttons
        const createButton = (x, y) => {
            const geometry = new THREE.CylinderGeometry(0.15 * scaleFactor, 0.15 * scaleFactor, 0.8 * scaleFactor, 16);
            const material = new THREE.MeshStandardMaterial({
                color: this.buttonsColor.select,
                roughness: 0.5,
                metalness: 0.2
            });
            const button = new THREE.Mesh(geometry, material);
            button.rotation.z = Math.PI / 2;
            button.position.set(x, y, 0.6 * scaleFactor);
            return button;
        };
        
        // Select button (left)
        const selectButton = createButton(-0.5 * scaleFactor, -3 * scaleFactor);
        gameboyGroup.add(selectButton);
        
        // Start button (right)
        const startButton = createButton(0.5 * scaleFactor, -3 * scaleFactor);
        gameboyGroup.add(startButton);
        
        // Add Nintendo logo (simplified as a small plate)
        const logoGeometry = new THREE.BoxGeometry(2 * scaleFactor, 0.4 * scaleFactor, 0.05 * scaleFactor);
        const logoMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.5,
            metalness: 0.3
        });
        const logo = new THREE.Mesh(logoGeometry, logoMaterial);
        logo.position.set(0, -3.5 * scaleFactor, 0.55 * scaleFactor);
        gameboyGroup.add(logo);
        
        // Add speaker holes (pattern of small cylinders)
        const speakerGroup = new THREE.Group();
        const speakerMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Create a 3x3 grid of small cylinders for speaker holes
        for(let i = 0; i < 3; i++) {
            for(let j = 0; j < 3; j++) {
                const holeGeometry = new THREE.CylinderGeometry(0.08 * scaleFactor, 0.08 * scaleFactor, 0.1 * scaleFactor, 8);
                const hole = new THREE.Mesh(holeGeometry, speakerMaterial);
                hole.rotation.x = Math.PI / 2;
                hole.position.set(
                    (1.8 + i * 0.25) * scaleFactor, 
                    (-2.5 - j * 0.25) * scaleFactor, 
                    0.55 * scaleFactor
                );
                speakerGroup.add(hole);
            }
        }
        gameboyGroup.add(speakerGroup);
        
        // Add glow effect to make the Gameboy more visible
        const glowMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00,  // Yellow glow
            transparent: true,
            opacity: 0.3,
            emissive: 0xFFFF00,
            emissiveIntensity: 0.5
        });
        
        const glowGeometry = new THREE.BoxGeometry(5.2 * scaleFactor, 8.2 * scaleFactor, 1.2 * scaleFactor);
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(0, 0, -0.1 * scaleFactor);
        gameboyGroup.add(glow);
        
        this.glow = glow;
        
        // Tilt the Gameboy slightly to make it more visible
        gameboyGroup.rotation.x = -Math.PI / 12;
        
        this.object = gameboyGroup;
        
        this.startFloatingAnimation();
    }

    async initialize() {
        console.log("Initializing Gameboy...");
        await this.createGameboyModel();
        this.placeRandomly();
    }
    
    placeRandomly() {
        if (!this.object) return;
        
        // Remove from scene if already added
        if (this.object.parent) {
            this.scene.remove(this.object);
        }
        
        // Find a random position on the map, not too close to the origin
        // Choose a random angle but avoid placing too close to the iPod or other objects
        const angle = Math.random() * Math.PI * 2;
        const distance = 25 + Math.random() * 50; // Between 25 and 75 units from center
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const y = this.getTerrainHeight(x, z);
        
        this.object.position.set(x, y + this.floatHeight, z); // Position above terrain
        this.scene.add(this.object);
        
        console.log(`Gameboy placed at position: ${x}, ${y + this.floatHeight}, ${z}`);
    }
    
    startFloatingAnimation() {
        // Base position
        const baseY = this.object.position.y;
        
        // Add animation properties
        this.animationParams = {
            speed: 0.5 + Math.random() * 0.5,
            amplitude: 0.3,
            rotationSpeed: 0.2,
            time: Math.random() * Math.PI * 2 // Random starting phase
        };
    }
    
    update(deltaTime) {
        if (!this.object) return;
        
        // Handle floating animation
        this.animationParams.time += deltaTime * this.animationParams.speed;
        
        // Bob up and down
        const floatOffset = Math.sin(this.animationParams.time) * this.animationParams.amplitude;
        const baseY = this.getTerrainHeight(
            this.object.position.x, 
            this.object.position.z
        ) + this.floatHeight; // Base height above terrain
        
        this.object.position.y = baseY + floatOffset;
        
        // Gentle rotation
        this.object.rotation.y += deltaTime * this.animationParams.rotationSpeed;
        
        // Pulse the glow
        if (this.glow) {
            const pulseScale = 1 + Math.sin(this.animationParams.time * 1.5) * 0.07;
            this.glow.scale.set(pulseScale, pulseScale, pulseScale);
        }
        
        // Check for player collision
        if (!this.cooldown) {
            const dx = this.player.position.x - this.object.position.x;
            const dy = this.player.position.y - this.object.position.y;
            const dz = this.player.position.z - this.object.position.z;
            
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (distance < this.detectionRadius) {
                this.onPlayerCollision();
                this.startCooldown();
            }
        }
    }
    
    onPlayerCollision() {
        console.log("Player touched the Gameboy - launching Snake game");
        
        // Don't activate if in post-game cooldown
        if (this.postGameCooldown) {
            console.log("Gameboy in cooldown, cannot activate yet");
            
            // Visual feedback for cooldown
            if (this.glow) {
                // Save original color
                const originalColor = this.glow.material.color.clone();
                const originalEmissive = this.glow.material.emissive.clone();
                
                // Flash to red to indicate cooldown
                this.glow.material.color.set(0xFF0000);
                this.glow.material.emissive.set(0xFF0000);
                this.glow.material.emissiveIntensity = 0.5;
                
                // Return to original color after a short delay
                setTimeout(() => {
                    if (this.glow) {
                        this.glow.material.color.copy(originalColor);
                        this.glow.material.emissive.copy(originalEmissive);
                        this.glow.material.emissiveIntensity = 0.5;
                    }
                }, 300);
            }
            
            return;
        }
        
        // Visual feedback
        if (this.glow) {
            // Save original color
            const originalColor = this.glow.material.color.clone();
            const originalEmissive = this.glow.material.emissive.clone();
            
            // Flash to white
            this.glow.material.color.set(0xFFFFFF);
            this.glow.material.emissive.set(0xFFFFFF);
            this.glow.material.emissiveIntensity = 1.0;
            
            // Return to original color after a short delay
            setTimeout(() => {
                if (this.glow) {
                    this.glow.material.color.copy(originalColor);
                    this.glow.material.emissive.copy(originalEmissive);
                    this.glow.material.emissiveIntensity = 0.5;
                }
            }, 300);
        }
        
        // Pause the main game
        if (window.gameState) {
            // If game is already paused or in another state, don't start Snake
            if (window.gameState.gamePaused || window.gameState.goalReached || window.gameState.gameOver) {
                return;
            }
            
            // Pause the game
            window.gameState.gamePaused = true;
            
            // Cancel animation frame to stop the game loop
            if (window.gameState.animationId) {
                cancelAnimationFrame(window.gameState.animationId);
                window.gameState.animationId = null;
            }

            // Create instructions message
            const instructionsMessage = document.createElement('div');
            instructionsMessage.className = 'level-warning';
            if(isMobile){
                instructionsMessage.innerText =
                `Swipe to move.
                Eat food to grow!
                Don't crash into walls or your own tail!
                `;
            } else {
                instructionsMessage.innerText =
                `Use arrow keys to move.
                Eat food to grow!
                Don't crash into walls or your own tail!
                `;
            } 

            // Add instructions to the container
            snakeContainer.appendChild(instructionsMessage);
            
            // Make instructions disappear after 4 seconds
            setTimeout(() => {
                instructionsMessage.style.opacity = '0';
                // Remove from DOM after fade out
                setTimeout(() => {
                    if (document.body.contains(instructionsMessage)) {
                        snakeContainer.removeChild(instructionsMessage);
                    }
                }, 500); // Wait for fade out animation
            }, 5000);
            
            // Start Snake game
            this.startSnakeGame();
        }
    }
    
    startSnakeGame() {

        Object.assign(snakeContainer.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: '1000',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
        });
        
        // Create game screen with retro feel
        const gameScreen = document.createElement('div');
        gameScreen.id = 'snake-game-screen';
        Object.assign(gameScreen.style, {
            width: '80%',
            maxWidth: '600px',
            height: '70vh',
            maxHeight: '600px',
            backgroundColor: '#98FB98', // Light green like old GameBoy screen
            border: '10px solid #333',
            borderRadius: '5px',
            boxShadow: '0 0 20px rgba(255, 255, 0, 0.5)',
            overflow: 'hidden',
            position: 'relative'
        });
        
        // Create canvas for Snake game
        const canvas = document.createElement('canvas');
        canvas.id = 'snake-canvas';
        canvas.width = 600;
        canvas.height = 600;
        Object.assign(canvas.style, {
            width: '100%',
            height: '100%',
            display: 'block'
        });
        
        // Create buttons container for better layout
        const buttonsContainer = document.createElement('div');
        buttonsContainer.id = 'snake-buttons-container';
        Object.assign(buttonsContainer.style, {
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            marginTop: '20px'
        });
        
        // Create new game button
        const newGameButton = document.createElement('button');
        newGameButton.id = 'snake-new-game-button';
        newGameButton.innerText = 'New Game';
        Object.assign(newGameButton.style, {
            padding: '12px 24px',
            fontSize: '18px',
            backgroundColor: '#22cc22', // Vibrant green
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
        });
        
        // Create exit button with more vibrant styling
        const exitButton = document.createElement('button');
        exitButton.id = 'snake-exit-button';
        exitButton.innerText = 'Exit Game';
        Object.assign(exitButton.style, {
            padding: '12px 24px',
            fontSize: '18px',
            backgroundColor: '#ff5555', // Vibrant red
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
        });
        
        // Add hover effects
        newGameButton.onmouseover = () => {
            newGameButton.style.backgroundColor = '#33dd33';
            newGameButton.style.transform = 'translateY(-2px)';
            newGameButton.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
        };
        newGameButton.onmouseout = () => {
            newGameButton.style.backgroundColor = '#22cc22';
            newGameButton.style.transform = 'translateY(0)';
            newGameButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        };
        
        exitButton.onmouseover = () => {
            exitButton.style.backgroundColor = '#ff6666';
            exitButton.style.transform = 'translateY(-2px)';
            exitButton.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
        };
        exitButton.onmouseout = () => {
            exitButton.style.backgroundColor = '#ff5555';
            exitButton.style.transform = 'translateY(0)';
            exitButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        };
        
        // Add buttons to container
        buttonsContainer.appendChild(newGameButton);
        buttonsContainer.appendChild(exitButton);
        
        // Score display
        const scoreDisplay = document.createElement('div');
        scoreDisplay.id = 'snake-score';
        Object.assign(scoreDisplay.style, {
            position: 'absolute',
            top: '10px',
            left: '10px',
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#333'
        });
        scoreDisplay.innerText = 'Score: 0';
        
        // Add elements to the DOM
        gameScreen.appendChild(canvas);
        gameScreen.appendChild(scoreDisplay);
        snakeContainer.appendChild(gameScreen);
        snakeContainer.appendChild(buttonsContainer);
        document.body.appendChild(snakeContainer);
        
        // Start Snake game
        const snakeGame = new SnakeGame(canvas, scoreDisplay, () => {
            // Cleanup function to be called when exiting
            document.body.removeChild(snakeContainer);
            
            // Unpause the main game
            if (window.gameState) {
                window.gameState.gamePaused = false;
                
                // Restart animation loop
                if (!window.gameState.animationId) {
                    window.lastTime = performance.now();
                    window.gameState.animationId = requestAnimationFrame(window.animate);
                }
                
                // Unpause music if available
                if (window.soundSystem && window.soundSystem.unpauseMusic) {
                    window.soundSystem.unpauseMusic();
                }
            }
        });
        
        // Add new game button event listener
        newGameButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Reset the game
            snakeGame.reset();
            
            // If game was over, make sure it's not anymore
            snakeGame.gameOver = false;
            snakeGame.paused = false;
        });
        
        // Add exit button event listener with cleanup safeguards
        exitButton.addEventListener('click', function exitHandler(e) {
            // Prevent the event from bubbling up
            e.preventDefault();
            e.stopPropagation();
            
            // Remove the event listener immediately to prevent multiple triggers
            exitButton.removeEventListener('click', exitHandler);
            
            // Make sure snake game is properly stopped
            snakeGame.stop();
            
            // Check if the container is still in the DOM before removing
            if (document.body.contains(snakeContainer)) {
                document.body.removeChild(snakeContainer);
            }
            
            // Make sure snake game is properly stopped
            snakeGame.stop();
            
            // Check if the container is still in the DOM before removing
            if (document.body.contains(snakeContainer)) {
                document.body.removeChild(snakeContainer);
            }
            
            // Set post-game cooldown
            this.postGameCooldown = true;
            console.log("Starting 4 second post-game cooldown");
            
            // Visual feedback - make gameboy flash red briefly to indicate cooldown
            if (this.glow) {
                this.glow.material.color.set(0xFF0000);
                this.glow.material.emissive.set(0xFF0000);
            }
            
            // Clear cooldown after the specified time
            setTimeout(() => {
                this.postGameCooldown = false;
                console.log("Post-game cooldown ended");
                
                // Return to normal color
                if (this.glow) {
                    this.glow.material.color.set(0xFFFF00);
                    this.glow.material.emissive.set(0xFFFF00);
                }
            }, this.postGameCooldownTime);
            
            // Unpause the main game with a slight delay to ensure cleanup is complete
            setTimeout(() => {
                if (window.gameState) {
                    window.gameState.gamePaused = false;
                    
                    // Restart animation loop
                    if (!window.gameState.animationId) {
                        window.lastTime = performance.now();
                        window.gameState.animationId = requestAnimationFrame(window.animate);
                    }
                    
                    // Unpause music if available
                    if (window.soundSystem && window.soundSystem.unpauseMusic) {
                        window.soundSystem.unpauseMusic();
                    }
                }
            }, 100);
        }.bind(this));
    }
    
    startCooldown() {
        this.cooldown = true;
        
        setTimeout(() => {
            this.cooldown = false;
        }, this.cooldownTime);
    }

    destroy() {
        if (this.object && this.object.parent) {
            this.scene.remove(this.object);
        }
    }
}

// Snake Game Implementation
class SnakeGame {
    constructor(canvas, scoreElement, onExit) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scoreElement = scoreElement;
        this.onExit = onExit;
        
        // Game settings
        this.gridSize = 20;
        this.tileCount = Math.floor(canvas.width / this.gridSize);
        this.tileSize = canvas.width / this.tileCount;
        
        // Game state
        this.snake = [{ x: 10, y: 10 }]; // Snake starts with one segment
        this.food = this.generateFood();
        this.direction = { x: 0, y: 0 }; // Initially not moving
        this.nextDirection = { x: 0, y: 0 };
        this.speed = 8; // Frames per move
        this.frameCount = 0;
        this.score = 0;
        this.gameOver = false;
        this.paused = false;
        this.animationId = null;
        this.stopping = false;
        this.exitCalled = false;
        
        // Mobile swipe handling
        this.touchStartX = 0;
        this.touchStartY = 0;
        
        // Bind event handlers
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        
        // Start the game
        this.setupEventListeners();
        this.start();
    }
    
    setupEventListeners() {
        // Keyboard control for desktop
        document.addEventListener('keydown', this.handleKeyDown);
        
        // Touch controls for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart);
        this.canvas.addEventListener('touchmove', this.handleTouchMove);
    }
    
    removeEventListeners() {
        document.removeEventListener('keydown', this.handleKeyDown);
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    }
    
    handleKeyDown(e) {
        // Prevent default arrow key scrolling
        if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
        
        if (this.gameOver) {
            if (e.key === ' ' || e.key === 'Enter') {
                this.reset();
            }
            return;
        }
        
        if (e.key === ' ' || e.key === 'Escape') {
            this.togglePause();
            return;
        }
        
        if (this.paused) return;
        
        // Check that we're not trying to go in the opposite direction
        switch(e.key) {
            case 'ArrowUp':
                if (this.direction.y !== 1) { // Not going down
                    this.nextDirection = { x: 0, y: -1 };
                }
                break;
            case 'ArrowDown':
                if (this.direction.y !== -1) { // Not going up
                    this.nextDirection = { x: 0, y: 1 };
                }
                break;
            case 'ArrowLeft':
                if (this.direction.x !== 1) { // Not going right
                    this.nextDirection = { x: -1, y: 0 };
                }
                break;
            case 'ArrowRight':
                if (this.direction.x !== -1) { // Not going left
                    this.nextDirection = { x: 1, y: 0 };
                }
                break;
        }
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }
    
    handleTouchMove(e) {
        if (this.gameOver || this.paused) return;
        
        e.preventDefault();
        
        if (!this.touchStartX || !this.touchStartY) return;
        
        const touchEndX = e.touches[0].clientX;
        const touchEndY = e.touches[0].clientY;
        
        const dx = touchEndX - this.touchStartX;
        const dy = touchEndY - this.touchStartY;
        
        // Ensure minimum swipe distance to prevent accidental inputs
        const minSwipeDistance = 30;
        
        if (Math.abs(dx) < minSwipeDistance && Math.abs(dy) < minSwipeDistance) return;
        
        // Determine if horizontal or vertical swipe based on which has greater magnitude
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            if (dx > 0 && this.direction.x !== -1) { // Right swipe and not going left
                this.nextDirection = { x: 1, y: 0 };
            } else if (dx < 0 && this.direction.x !== 1) { // Left swipe and not going right
                this.nextDirection = { x: -1, y: 0 };
            }
        } else {
            // Vertical swipe
            if (dy > 0 && this.direction.y !== -1) { // Down swipe and not going up
                this.nextDirection = { x: 0, y: 1 };
            } else if (dy < 0 && this.direction.y !== 1) { // Up swipe and not going down
                this.nextDirection = { x: 0, y: -1 };
            }
        }
        
        // Reset touch start position to allow for new swipes
        this.touchStartX = touchEndX;
        this.touchStartY = touchEndY;
    }
    
    generateFood() {
        // Create food at random position, but avoid snake body
        let newFood;
        let foodOnSnake;
        
        do {
            foodOnSnake = false;
            newFood = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
            
            // Check if food is on the snake
            for (let i = 0; i < this.snake.length; i++) {
                if (this.snake[i].x === newFood.x && this.snake[i].y === newFood.y) {
                    foodOnSnake = true;
                    break;
                }
            }
        } while (foodOnSnake);
        
        return newFood;
    }
    
    update() {
        if (this.gameOver || this.paused) return;
        
        this.frameCount++;
        
        // Only update at specific frame intervals to control speed
        if (this.frameCount < this.speed) return;
        this.frameCount = 0;
        
        // Update direction from nextDirection
        this.direction = { ...this.nextDirection };
        
        // If not moving, don't update
        if (this.direction.x === 0 && this.direction.y === 0) return;
        
        // Calculate new head position
        const head = { ...this.snake[0] };
        head.x += this.direction.x;
        head.y += this.direction.y;
        
        // Check for wall collision (game over)
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            this.gameOver = true;
            return;
        }
        
        // Check for self collision (game over)
        for (let i = 0; i < this.snake.length; i++) {
            if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                this.gameOver = true;
                return;
            }
        }
        
        // Add new head to the snake
        this.snake.unshift(head);
        
        // Check if eaten food
        if (head.x === this.food.x && head.y === this.food.y) {
            // Increase score
            this.score += 10;
            this.updateScore();
            
            // Generate new food
            this.food = this.generateFood();
            
            // Increase speed slightly
            if (this.speed > 3 && this.score % 50 === 0) {
                this.speed--;
            }
        } else {
            // Remove tail if no food eaten
            this.snake.pop();
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#98FB98'; // Light green background
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid (optional, for retro feel)
        this.ctx.strokeStyle = '#AADDAA';
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i < this.tileCount; i++) {
            // Vertical lines
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.tileSize, 0);
            this.ctx.lineTo(i * this.tileSize, this.canvas.height);
            this.ctx.stroke();
            
            // Horizontal lines
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.tileSize);
            this.ctx.lineTo(this.canvas.width, i * this.tileSize);
            this.ctx.stroke();
        }
        
        // Draw food
        this.ctx.fillStyle = '#FF0000'; // Red food
        this.ctx.beginPath();
        this.ctx.arc(
            this.food.x * this.tileSize + this.tileSize / 2,
            this.food.y * this.tileSize + this.tileSize / 2,
            this.tileSize / 2 * 0.8, // Slightly smaller than the tile
            0, Math.PI * 2
        );
        this.ctx.fill();
        
        // Draw snake
        for (let i = 0; i < this.snake.length; i++) {
            // Use different color for head
            if (i === 0) {
                this.ctx.fillStyle = '#006600'; // Dark green head
            } else {
                // Gradient from dark to light green for body
                const colorValue = Math.floor(150 - (i * 5)) % 100 + 50;
                this.ctx.fillStyle = `rgb(0, ${colorValue}, 0)`;
            }
            
            // Draw rounded rectangle for snake segments
            const x = this.snake[i].x * this.tileSize;
            const y = this.snake[i].y * this.tileSize;
            const size = this.tileSize * 0.9; // Slightly smaller than the tile
            const radius = size / 4;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + size - radius, y);
            this.ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
            this.ctx.lineTo(x + size, y + size - radius);
            this.ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
            this.ctx.lineTo(x + radius, y + size);
            this.ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Add eyes to the head
            if (i === 0) {
                this.ctx.fillStyle = '#FFFFFF';
                
                // Position eyes based on direction
                let eyeX1, eyeY1, eyeX2, eyeY2;
                const eyeSize = this.tileSize / 6;
                
                if (this.direction.x === 1) { // Moving right
                    eyeX1 = x + size - eyeSize * 2;
                    eyeY1 = y + size / 3;
                    eyeX2 = x + size - eyeSize * 2;
                    eyeY2 = y + size * 2/3;
                } else if (this.direction.x === -1) { // Moving left
                    eyeX1 = x + eyeSize;
                    eyeY1 = y + size / 3;
                    eyeX2 = x + eyeSize;
                    eyeY2 = y + size * 2/3;
                } else if (this.direction.y === -1) { // Moving up
                    eyeX1 = x + size / 3;
                    eyeY1 = y + eyeSize;
                    eyeX2 = x + size * 2/3;
                    eyeY2 = y + eyeSize;
                } else { // Moving down or not moving
                    eyeX1 = x + size / 3;
                    eyeY1 = y + size - eyeSize * 2;
                    eyeX2 = x + size * 2/3;
                    eyeY2 = y + size - eyeSize * 2;
                }
                
                // Draw eyes
                this.ctx.beginPath();
                this.ctx.arc(eyeX1, eyeY1, eyeSize, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.beginPath();
                this.ctx.arc(eyeX2, eyeY2, eyeSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Draw game over screen
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '36px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
            
            this.ctx.font = '24px monospace';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
        }
        
        // Draw pause screen
        if (this.paused && !this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '36px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
            
            this.ctx.font = '18px monospace';
            this.ctx.fillText('Press Space to continue', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
    }
    
    updateScore() {
        this.scoreElement.innerText = `Score: ${this.score}`;
    }
    
    togglePause() {
        this.paused = !this.paused;
    }
    
    reset() {
        this.snake = [{ x: 10, y: 10 }];
        this.food = this.generateFood();
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        this.speed = 8;
        this.frameCount = 0;
        this.score = 0;
        this.updateScore();
        this.gameOver = false;
        this.paused = false;
    }
    
    gameLoop() {
        // Don't continue if we're in the process of stopping
        if (this.stopping) return;
        
        this.update();
        this.draw();
        
        // Continue animation loop
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    start() {
        if (this.animationId) return; // Don't start if already running
        this.gameLoop();
    }
    
    stop() {
        // Set a flag to indicate we're in the process of stopping
        this.stopping = true;
        
        // Cancel animation frame if it exists
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Clean up event listeners
        this.removeEventListeners();
        
        // Call exit callback only if not already called
        if (typeof this.onExit === 'function' && !this.exitCalled) {
            this.exitCalled = true;
            this.onExit();
        }
    }
}

// Export for use in game.js
window.Gameboy = Gameboy;