// Cubicle Class
// Creates a low-poly 3D cubicle with desk, computer and divider walls in the game

class Cubicle {
    constructor(scene, player, getTerrainHeight) {
        this.scene = scene;
        this.player = player;
        this.getTerrainHeight = getTerrainHeight;
        this.object = null;
        this.cooldown = false;
        this.cooldownTime = 2000; // 2 seconds cooldown between interactions
        this.detectionRadius = 3; // Smaller radius - how close player needs to be to interact
        this.exitCooldownTime = 5000; // 5 seconds cooldown after exiting the computer screen
        this.floatHeight = 1; // Lower float height since it's a workplace object
        
        // Computer screen animation properties
        this.computerScreenContainer = null;
        this.canvas = null;
        this.ctx = null;
        this.animationActive = false;
        this.animationId = null;
        this.previousGameAnimationId = null;
        this.backgroundImage = null;
        
        this.logo = {
            x: 100,
            y: 100,
            width: 280,
            height: 100,
            dx: 2,
            dy: 2,
            color: '#00FFFF' // Initial color - cyan
        };
        
        this.colors = [
            '#00FFFF', // cyan
            '#FF00FF', // magenta
            '#FFFF00', // yellow
            '#00FF00', // lime
            '#FF3399', // pink
            '#33CCFF', // light blue
            '#FF6600'  // orange
        ];
    }

    async createCubicleModel() {
        // Create a group for the whole cubicle
        const cubicleGroup = new THREE.Group();
        
        // Scale factor to easily adjust the overall size
        const scaleFactor = 2;

        // Floor - green carpet
        const floorGeometry = new THREE.BoxGeometry(7 * scaleFactor, 0.1 * scaleFactor, 7 * scaleFactor);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x2F5233, // Dark green for carpet
            roughness: 0.9,
            metalness: 0.1,
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.y = -0.05 * scaleFactor; // Slightly below the center
        cubicleGroup.add(floor);
        
        // Cubicle divider walls - create an L shape
        const dividerHeight = 1.8 * scaleFactor;
        const dividerThickness = 0.1 * scaleFactor;
        const dividerLength = 5 * scaleFactor;
        
        const dividerMaterial = new THREE.MeshStandardMaterial({
            color: 0x1E3B2C, // Dark green divider
            roughness: 0.7,
            metalness: 0.2,
        });
        
        // Back wall
        const backWallGeometry = new THREE.BoxGeometry(dividerLength, dividerHeight, dividerThickness);
        const backWall = new THREE.Mesh(backWallGeometry, dividerMaterial);
        backWall.position.set(0, dividerHeight/2, -dividerLength/2);
        cubicleGroup.add(backWall);
        
        // Side wall
        const sideWallGeometry = new THREE.BoxGeometry(dividerThickness, dividerHeight, dividerLength);
        const sideWall = new THREE.Mesh(sideWallGeometry, dividerMaterial);
        sideWall.position.set(-dividerLength/2, dividerHeight/2, 0);
        cubicleGroup.add(sideWall);
        
        // Desk
        const deskWidth = 4 * scaleFactor;
        const deskDepth = 2 * scaleFactor;
        const deskHeight = 0.1 * scaleFactor;
        const deskLegHeight = 0.7 * scaleFactor;
        
        const deskMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF, // White desk
            roughness: 0.3,
            metalness: 0.1,
        });
        
        // Desk top
        const deskTopGeometry = new THREE.BoxGeometry(deskWidth, deskHeight, deskDepth);
        const deskTop = new THREE.Mesh(deskTopGeometry, deskMaterial);
        deskTop.position.set(-0.5 * scaleFactor, 0.75 * scaleFactor, -dividerLength/2 + deskDepth/2 + 0.1 * scaleFactor);
        cubicleGroup.add(deskTop);
        
        // Desk drawers (simplified as a white box)
        const drawerWidth = 1 * scaleFactor;
        const drawerHeight = 0.6 * scaleFactor;
        const drawerDepth = deskDepth - 0.2 * scaleFactor;
        
        const drawerGeometry = new THREE.BoxGeometry(drawerWidth, drawerHeight, drawerDepth);
        const drawer = new THREE.Mesh(drawerGeometry, deskMaterial);
        drawer.position.set(-1.5 * scaleFactor, 0.4 * scaleFactor, -dividerLength/2 + deskDepth/2 + 0.1 * scaleFactor);
        cubicleGroup.add(drawer);
        
        // Computer monitor
        const monitorWidth = 1.2 * scaleFactor;
        const monitorHeight = 0.9 * scaleFactor;
        const monitorDepth = 0.1 * scaleFactor;
        const monitorStandWidth = 0.3 * scaleFactor;
        const monitorStandHeight = 0.2 * scaleFactor;
        const monitorStandDepth = 0.3 * scaleFactor;
        
        const monitorFrameMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333, // Dark gray
            roughness: 0.5,
            metalness: 0.8,
        });
        
        const screenMaterial = new THREE.MeshStandardMaterial({
            color: 0x0b45fb, // Black screen
            emissive: 0x222233, // Slight blue glow
            emissiveIntensity: 0.5,
            roughness: 0.1,
            metalness: 0.5,
        });
        
        // Monitor frame
        const monitorFrameGeometry = new THREE.BoxGeometry(monitorWidth, monitorHeight, monitorDepth);
        const monitorFrame = new THREE.Mesh(monitorFrameGeometry, monitorFrameMaterial);
        monitorFrame.position.set(-0.5 * scaleFactor, 0.75 * scaleFactor + monitorHeight/2 + 0.1 * scaleFactor, -dividerLength/2 + 0.5 * scaleFactor);
        cubicleGroup.add(monitorFrame);
        
        // Monitor screen (slightly inset from the frame)
        const screenInset = 0.08 * scaleFactor;
        const screenGeometry = new THREE.BoxGeometry(
            monitorWidth - screenInset * 2, 
            monitorHeight - screenInset * 2, 
            monitorDepth,
        );
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.set(
            monitorFrame.position.x, 
            monitorFrame.position.y, 
            monitorFrame.position.z + monitorDepth/2 - screenInset/2
        );
        cubicleGroup.add(screen);
        
        // Monitor stand
        const standGeometry = new THREE.BoxGeometry(monitorStandWidth, monitorStandHeight, monitorStandDepth);
        const stand = new THREE.Mesh(standGeometry, monitorFrameMaterial);
        stand.position.set(
            monitorFrame.position.x,
            0.75 * scaleFactor + monitorStandHeight/2,
            monitorFrame.position.z - monitorDepth/2 - monitorStandDepth/2 + 0.05 * scaleFactor
        );
        cubicleGroup.add(stand);
        
        // Keyboard
        const keyboardWidth = 1.2 * scaleFactor;
        const keyboardHeight = 0.05 * scaleFactor;
        const keyboardDepth = 0.4 * scaleFactor;
        
        const keyboardGeometry = new THREE.BoxGeometry(keyboardWidth, keyboardHeight, keyboardDepth);
        const keyboardMaterial = new THREE.MeshStandardMaterial({
            color: 0x6699CC, // Blue keyboard
            roughness: 0.5,
            metalness: 0.3,
        });
        const keyboard = new THREE.Mesh(keyboardGeometry, keyboardMaterial);
        keyboard.position.set(-0.5 * scaleFactor, 0.75 * scaleFactor + keyboardHeight, -dividerLength/2 + 1.2 * scaleFactor);
        cubicleGroup.add(keyboard);
        
        // Office chair (simplified)
        const chairSeatRadius = 0.5 * scaleFactor;
        const chairSeatHeight = 0.1 * scaleFactor;
        const chairBackHeight = 1 * scaleFactor;
        const chairBackWidth = 0.8 * scaleFactor;
        const chairBackThickness = 0.1 * scaleFactor;
        
        const chairMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111, // Black chair
            roughness: 0.8,
            metalness: 0.2,
        });
        
        // Chair seat
        const chairSeatGeometry = new THREE.CylinderGeometry(chairSeatRadius, chairSeatRadius, chairSeatHeight, 16);
        const chairSeat = new THREE.Mesh(chairSeatGeometry, chairMaterial);
        chairSeat.position.set(0, 0.5 * scaleFactor, -dividerLength/2 + 3 * scaleFactor);
        cubicleGroup.add(chairSeat);
        
        // Chair back
        const chairBackGeometry = new THREE.BoxGeometry(chairBackWidth, chairBackHeight, chairBackThickness);
        const chairBack = new THREE.Mesh(chairBackGeometry, chairMaterial);
        chairBack.position.set(
            chairSeat.position.x,
            chairSeat.position.y + chairBackHeight/2,
            chairSeat.position.z - chairSeatRadius
        );
        cubicleGroup.add(chairBack);
        
        // Add a box as a floor protector underneath the chair
        const floorProtectorGeometry = new THREE.BoxGeometry(1.2 * scaleFactor, 0.02 * scaleFactor, 1.2 * scaleFactor);
        const floorProtectorMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333, // Dark gray
            roughness: 0.9,
            metalness: 0.1,
        });
        const floorProtector = new THREE.Mesh(floorProtectorGeometry, floorProtectorMaterial);
        floorProtector.position.set(chairSeat.position.x, 0.01 * scaleFactor, chairSeat.position.z);
        cubicleGroup.add(floorProtector);
        
        // Small details - tissue box on desk
        const tissueBoxGeometry = new THREE.BoxGeometry(0.3 * scaleFactor, 0.1 * scaleFactor, 0.2 * scaleFactor);
        const tissueBoxMaterial = new THREE.MeshStandardMaterial({
            color: 0x88CCEE, // Light blue
            roughness: 0.5,
            metalness: 0.1,
        });
        const tissueBox = new THREE.Mesh(tissueBoxGeometry, tissueBoxMaterial);
        tissueBox.position.set(
            0.8 * scaleFactor,
            0.75 * scaleFactor + tissueBoxGeometry.parameters.height/2,
            -dividerLength/2 + 0.6 * scaleFactor
        );
        cubicleGroup.add(tissueBox);
        
        // Add a pencil holder
        const pencilHolderGeometry = new THREE.CylinderGeometry(
            0.1 * scaleFactor, 
            0.08 * scaleFactor, 
            0.2 * scaleFactor, 
            8
        );
        const pencilHolderMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF, // White
            roughness: 0.5,
            metalness: 0.1,
        });
        const pencilHolder = new THREE.Mesh(pencilHolderGeometry, pencilHolderMaterial);
        pencilHolder.position.set(
            0.5 * scaleFactor,
            0.75 * scaleFactor + pencilHolderGeometry.parameters.height/2,
            -dividerLength/2 + 0.6 * scaleFactor
        );
        cubicleGroup.add(pencilHolder);
        this.object = cubicleGroup;
        
        this.startFloatingAnimation();
    }

    async initialize() {
        console.log("Initializing cubicle...");
        await this.createCubicleModel();
        this.placeRandomly();
        this.initializeComputerScreenAnimation();
        
        // Load the background image
        this.loadBackgroundImage();
    }
    
    loadBackgroundImage() {
        // Create an Image object to load the Windows XP background
        this.backgroundImage = new Image();
        this.backgroundImage.src = 'assets/windowsXP.jpg';
        
        // Log a message when image is loaded successfully
        this.backgroundImage.onload = () => {
            console.log("Windows XP background image loaded successfully");
        };
        
        // Log an error if the image fails to load
        this.backgroundImage.onerror = (err) => {
            console.error("Error loading Windows XP background image:", err);
        };
    }
    
    placeRandomly() {
        if (!this.object) return;
        
        // Remove from scene if already added
        if (this.object.parent) {
            this.scene.remove(this.object);
        }
        
        // Find a random position on the map, not too close to the origin
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 60; // Between 20 and 60 units from center
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const y = this.getTerrainHeight(x, z);
        
        this.object.position.set(x, y + this.floatHeight, z); // Position slightly above terrain
        
        // Random rotation so it's not always facing the same way
        this.object.rotation.y = Math.random() * Math.PI * 2;
        
        this.scene.add(this.object);
        
        console.log(`Cubicle placed at position: ${x}, ${y + this.floatHeight}, ${z}`);
    }
    
    startFloatingAnimation() {
        // Base position
        const baseY = this.object.position.y;
        
        // Add animation properties - more subtle than the iPod
        this.animationParams = {
            speed: 0.2 + Math.random() * 0.2, // Slower speed
            amplitude: 0.1, // Smaller amplitude
            rotationSpeed: 0.05, // Very slow rotation
            time: Math.random() * Math.PI * 2 // Random starting phase
        };
    }
    
    update(deltaTime) {
        if (!this.object) return;
        
        // Handle floating animation - more subtle for a workplace object
        this.animationParams.time += deltaTime * this.animationParams.speed;
        
        // Gentle bob up and down
        const floatOffset = Math.sin(this.animationParams.time) * this.animationParams.amplitude;
        const baseY = this.getTerrainHeight(
            this.object.position.x, 
            this.object.position.z
        ) + this.floatHeight; // Base height above terrain
        
        this.object.position.y = baseY + floatOffset;

        // Check for player collision
        if (!this.cooldown) {
            const dx = this.player.position.x - this.object.position.x;
            const dy = this.player.position.y - this.object.position.y;
            const dz = this.player.position.z - this.object.position.z;
            
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (distance < this.detectionRadius) {
                this.onPlayerInteraction();
                this.startCooldown();
            }
        }
    }
    
    // Initialize the computer screen animation components
    initializeComputerScreenAnimation() {
        // Create the canvas container
        this.computerScreenContainer = document.createElement('div');
        this.computerScreenContainer.id = 'computer-screen-container';
        this.computerScreenContainer.style.position = 'fixed';
        this.computerScreenContainer.style.top = '0';
        this.computerScreenContainer.style.left = '0';
        this.computerScreenContainer.style.width = '100%';
        this.computerScreenContainer.style.height = '100%';
        this.computerScreenContainer.style.backgroundColor = 'black';
        this.computerScreenContainer.style.zIndex = '1000';
        this.computerScreenContainer.style.display = 'none';

        // Create the canvas for the animation
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'computer-screen';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.computerScreenContainer.appendChild(this.canvas);

        // Create a Windows 95/98 style dialog header
        const dialogHeader = document.createElement('div');
        dialogHeader.style.position = 'fixed';
        dialogHeader.style.top = '20px';
        dialogHeader.style.right = '40px';
        dialogHeader.style.width = '120px';
        dialogHeader.style.height = '22px';
        dialogHeader.style.backgroundColor = '#000080'; // Windows 95/98 blue
        dialogHeader.style.display = 'flex';
        dialogHeader.style.justifyContent = 'space-between';
        dialogHeader.style.alignItems = 'center';
        dialogHeader.style.padding = '20px';
        dialogHeader.style.zIndex = '1001';
        dialogHeader.style.borderTop = '1px solid #DFDFDF';
        dialogHeader.style.borderLeft = '1px solid #DFDFDF';
        dialogHeader.style.borderRight = '1px solid #000000';
        dialogHeader.style.borderBottom = '1px solid #000000';
        
        // Add "X" text
        const headerText = document.createElement('span');
        headerText.textContent = 'Return to game >>';
        headerText.style.color = 'white';
        headerText.style.fontFamily = 'Courier New, sans-serif';
        headerText.style.fontSize = '13px';
        dialogHeader.appendChild(headerText);
        
        // Create the exit button (X button)
        const exitButton = document.createElement('button');
        exitButton.id = 'exit-computer-button';
        exitButton.textContent = 'X';
        exitButton.style.width = '16px';
        exitButton.style.height = '16px';
        exitButton.style.display = 'flex';
        exitButton.style.justifyContent = 'center';
        exitButton.style.alignItems = 'center';
        exitButton.style.backgroundColor = '#C0C0C0'; // Windows 95/98 gray
        exitButton.style.color = 'black';
        exitButton.style.border = '1px solid #FFFFFF';
        exitButton.style.borderRight = '1px solid #848484';
        exitButton.style.borderBottom = '1px solid #848484';
        exitButton.style.cursor = 'pointer';
        exitButton.style.fontSize = '16px';
        exitButton.style.fontFamily = 'Courier New, sans-serif';
        exitButton.style.fontWeight = 'bold';
        exitButton.style.padding = '0';
        exitButton.style.zIndex = '1001';
        
        // Add the click event
        const self = this;
        exitButton.addEventListener('click', function() {
            self.exitComputerScreen();
        });
        
        dialogHeader.appendChild(exitButton);
        this.computerScreenContainer.appendChild(dialogHeader);

        // Add to document
        document.body.appendChild(this.computerScreenContainer);

        // Get the drawing context
        this.ctx = this.canvas.getContext('2d');
        
        // Add resize listener
        window.addEventListener('resize', this.resizeCanvas.bind(this));
    }
    
    // Start the computer screen animation
    startComputerScreenAnimation() {
        // Make the container visible
        this.computerScreenContainer.style.display = 'block';
        
        // Resize canvas to match window
        this.resizeCanvas();
        
        // Set animation as active
        this.animationActive = true;
        
        // Start the animation loop
        this.animateComputerScreen();
    }
    
    // Animate the computer screen
    animateComputerScreen() {
        if (!this.animationActive) return;
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw the Windows XP background image instead of black fill
        if (this.backgroundImage && this.backgroundImage.complete) {
            // Draw the image to fill the entire canvas
            this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Fallback to black if image isn't loaded
            this.ctx.fillStyle = 'black';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Update logo position
        this.logo.x += this.logo.dx;
        this.logo.y += this.logo.dy;
        
        // Check for collision with edges
        let collision = false;
        if (this.logo.x + this.logo.width > this.canvas.width || this.logo.x < 0) {
            this.logo.dx = -this.logo.dx;
            collision = true;
            
            // Correct position to prevent sticking to edges
            if (this.logo.x < 0) {
                this.logo.x = 0;
            } else if (this.logo.x + this.logo.width > this.canvas.width) {
                this.logo.x = this.canvas.width - this.logo.width;
            }
        }
        
        if (this.logo.y + this.logo.height > this.canvas.height || this.logo.y < 0) {
            this.logo.dy = -this.logo.dy;
            collision = true;
            
            // Correct position to prevent sticking to edges
            if (this.logo.y < 0) {
                this.logo.y = 0;
            } else if (this.logo.y + this.logo.height > this.canvas.height) {
                this.logo.y = this.canvas.height - this.logo.height;
            }
        }
        
        // Change color on collision
        if (collision) {
            const currentColorIndex = this.colors.indexOf(this.logo.color);
            const nextColorIndex = (currentColorIndex + 1) % this.colors.length;
            this.logo.color = this.colors[nextColorIndex];
        }
        
        // Draw the logo
        this.ctx.fillStyle = this.logo.color;
        
        // Draw the rounded rectangle for logo background
        this.roundRect(
            this.ctx, 
            this.logo.x, 
            this.logo.y, 
            this.logo.width, 
            this.logo.height, 
            10
        );
        
        // Draw the text
        this.ctx.fillStyle = 'black';
        this.ctx.font = 'bold 24px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            "RED PANDA VIBES 🐼",
            this.logo.x + this.logo.width / 2, 
            this.logo.y + this.logo.height / 2
        );
        
        // Request next frame
        const self = this;
        this.animationId = requestAnimationFrame(function() {
            self.animateComputerScreen();
        });
    }
    
    // Helper function to draw rounded rectangles
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }
    
    // Resize the canvas when window size changes
    resizeCanvas() {
        if (!this.canvas) return;
        
        // Make canvas match window size for crisp rendering
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Reset logo position to center if it's outside bounds
        if (this.logo.x + this.logo.width > this.canvas.width || 
            this.logo.x < 0) {
            this.logo.x = (this.canvas.width - this.logo.width) / 2;
        }
        if (this.logo.y + this.logo.height > this.canvas.height || 
            this.logo.y < 0) {
            this.logo.y = (this.canvas.height - this.logo.height) / 2;
        }
    }
    
    // Exit the computer screen animation
    exitComputerScreen() {
        // Hide the container
        this.computerScreenContainer.style.display = 'none';
        
        // Stop the animation
        this.animationActive = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Resume the game
        this.resumeGame();
        
        // Start the exit cooldown
        this.startExitCooldown();
    }
    
    startExitCooldown() {
        // Set cooldown flag
        this.cooldown = true;
        
        // Reset after the exit cooldown period
        setTimeout(() => {
            this.cooldown = false;
            console.log("Cubicle can be activated again");
        }, this.exitCooldownTime);
    }
    
    onPlayerInteraction() {
        console.log("Player touched the cubicle");
        
        // Get reference to the game state
        const gameState = window.gameState;
        
        // Pause the game
        if (gameState) {
            // Store the current animation frame ID
            this.previousGameAnimationId = gameState.animationId;
            
            // Cancel the current animation loop
            if (gameState.animationId) {
                cancelAnimationFrame(gameState.animationId);
                gameState.animationId = null;
            }
            
            // Set the game as paused
            gameState.gamePaused = true;
        }
        
        // Start the computer screen animation
        this.startComputerScreenAnimation();
    }
    
    resumeGame() {
        console.log("Resuming game after cubicle interaction");
        
        // Get reference to the game state
        const gameState = window.gameState;
        
        if (gameState) {
            // Unpause the game
            gameState.gamePaused = false;
            
            // Restart the animation loop
            if (!gameState.animationId) {
                window.lastTime = performance.now();
                gameState.animationId = requestAnimationFrame(window.animate);
            }
            
            // If sound system exists, unpause the music
            if (window.soundSystem && window.soundSystem.unpauseMusic) {
                window.soundSystem.unpauseMusic();
            }
        }
    }
    
    startCooldown() {
        this.cooldown = true;
        
        setTimeout(() => {
            this.cooldown = false;
        }, this.cooldownTime);
    }

    destroy() {
        // Remove resize event listener
        window.removeEventListener('resize', this.resizeCanvas.bind(this));
        
        // Remove the computer screen container if it exists
        if (this.computerScreenContainer && this.computerScreenContainer.parentNode) {
            this.computerScreenContainer.parentNode.removeChild(this.computerScreenContainer);
        }
        
        // Cancel any ongoing animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Remove the 3D object from the scene
        if (this.object && this.object.parent) {
            this.scene.remove(this.object);
        }
    }
}

// Export for use in game.js
window.Cubicle = Cubicle;