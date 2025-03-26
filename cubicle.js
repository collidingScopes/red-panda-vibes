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
        this.detectionRadius = 6; // How close player needs to be to interact
        this.floatHeight = 1; // Lower float height since it's a workplace object
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
    }
    
    placeRandomly() {
        if (!this.object) return;
        
        // Remove from scene if already added
        if (this.object.parent) {
            this.scene.remove(this.object);
        }
        
        // Find a random position on the map, not too close to the origin
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 40; // Between 20 and 60 units from center
        
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
    
    onPlayerInteraction() {
        // This function will be implemented later
        console.log("Player touched the cubicle");
        // For now, just log that the interaction happened
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

// Export for use in game.js
window.Cubicle = Cubicle;