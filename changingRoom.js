// Changing room implementation for Red Panda Vibes
// This creates a changing room that lets the player switch between 3D models

class ChangingRoom {
    constructor(scene, player, getTerrainHeight) {
        this.scene = scene;
        this.player = player;
        this.getTerrainHeight = getTerrainHeight;
        this.changingRoomMesh = null;
        this.isPlayerInside = false;
        this.lastModelChange = 0;
        this.cooldownTime = 2000; // 2 seconds cooldown between model changes
        this.modelOptions = [
            { name: "Red Panda", path: pandaModelLocation },
            { name: "Bernie", path: 'assets/bernie4.glb' },
            { name: "Levels", path: 'assets/levels3.glb' },
            { name: "Pixar", path: 'assets/pixar4.glb' },
        ];
        this.currentModelIndex = 0;
    }

    // Initialize the changing room
    initialize() {
        this.createChangingRoom();
        this.placeRandomly();
    }

    // Create the changing room mesh
    createChangingRoom() {
        // Create the main cabinet structure
        const cabinetGroup = new THREE.Group();

        // Cabinet body - MUCH LARGER SIZE
        let cabinetHeight = 8;
        const cabinetGeometry = new THREE.BoxGeometry(7, cabinetHeight, 7);
        const cabinetMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 }); // Gray
        const cabinet = new THREE.Mesh(cabinetGeometry, cabinetMaterial);
        cabinet.position.y = cabinetHeight/2; // Half the height
        cabinet.castShadow = true;
        cabinet.receiveShadow = true;
        cabinetGroup.add(cabinet);

        // Cabinet feet - LARGER FEET
        const footGeometry = new THREE.BoxGeometry(1.2, 1, 1.2);
        const footMaterial = new THREE.MeshStandardMaterial({ color: 0x404040 }); // Dark gray
        
        // Place four feet at the corners
        const footPositions = [
            { x: -3.3, z: -3.3 },
            { x: 3.3, z: -3.3 },
            { x: -3.3, z: 3.3 },
            { x: 3.3, z: 3.3 }
        ];
        
        footPositions.forEach(pos => {
            const foot = new THREE.Mesh(footGeometry, footMaterial);
            foot.position.set(pos.x, 0.5, pos.z); // Position at bottom of cabinet
            foot.castShadow = true;
            foot.receiveShadow = true;
            cabinetGroup.add(foot);
        });

        // Top trim - LARGER
        const trimGeometry = new THREE.BoxGeometry(7.4, 0.4, 7.4);
        const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x505050 });
        const topTrim = new THREE.Mesh(trimGeometry, trimMaterial);
        topTrim.position.y = cabinetHeight+0.2; // Just above the cabinet
        cabinetGroup.add(topTrim);

        // Create curtain - ONLY ON FRONT SIDE, FIXED TO APPEAR PROPERLY
        const curtainWidth = 6.8;
        const curtainHeight = cabinetHeight+0.5;
        
        // Single front curtain with proper material settings
        const curtainGeometry = new THREE.PlaneGeometry(curtainWidth, curtainHeight);
        const curtainMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFF3333, // Bright red curtain
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95,
            emissive: 0xFF0000,
            emissiveIntensity: 0.2
        });
        
        // Create a curtain that looks like it's parted in the middle (two separate meshes)
        const leftCurtainWidth = curtainWidth * 0.45;
        const leftCurtainGeometry = new THREE.PlaneGeometry(leftCurtainWidth, curtainHeight);
        const leftCurtain = new THREE.Mesh(leftCurtainGeometry, curtainMaterial);
        leftCurtain.position.set(-curtainWidth/4 - 0.2, cabinetHeight/2, 4.2); // Positioned at front, offset left
        cabinetGroup.add(leftCurtain);
        
        const rightCurtainWidth = curtainWidth * 0.45;
        const rightCurtainGeometry = new THREE.PlaneGeometry(rightCurtainWidth, curtainHeight);
        const rightCurtain = new THREE.Mesh(rightCurtainGeometry, curtainMaterial);
        rightCurtain.position.set(curtainWidth/4 + 0.2, cabinetHeight/2, 4.2); // Positioned at front, offset right
        cabinetGroup.add(rightCurtain);
        
        // Curtain rod
        const rodGeometry = new THREE.CylinderGeometry(0.20, 0.20, 7.2, 8);
        const rodMaterial = new THREE.MeshStandardMaterial({ color: 0x505050 });
        
        // Front rod
        const frontRod = new THREE.Mesh(rodGeometry, rodMaterial);
        frontRod.rotation.z = Math.PI / 2;
        frontRod.position.set(0, cabinetHeight+0.4, 4.2);
        cabinetGroup.add(frontRod);
        
        // Create much larger hanging sign with bigger text
        const signGeometry = new THREE.PlaneGeometry(12, 4);
        const signMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xF5F5DC, // Beige color
            side: THREE.DoubleSide
        });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(0, cabinetHeight+1.5, 4.0);
        sign.rotation.x = Math.PI * 0.05; // Slightly tilted forward
        cabinetGroup.add(sign);
        
        // Add text to the sign - MUCH LARGER TEXT
        const canvas = document.createElement('canvas');
        canvas.width = 240; // Higher resolution
        canvas.height = 80;
        const context = canvas.getContext('2d');
        
        // Clear background
        context.fillStyle = '#FFFFFF'; // Beige
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add border
        context.strokeStyle = 'black';
        context.lineWidth = 8;
        context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
        
        // Add text with much bigger font
        context.font = 'bold 28px Helvetica, Arial'; // MUCH LARGER FONT
        context.fillStyle = 'black';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('Changing Room', canvas.width / 2, canvas.height / 2);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        sign.material.map = texture;
        sign.material.needsUpdate = true;
        
        // Boundary box for collision detection (much larger than visual model)
        const boundingBoxGeometry = new THREE.BoxGeometry(8, 13, 8);
        const boundingBoxMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF0000,
            transparent: true,
            opacity: 0.0
        });
        this.boundingBox = new THREE.Mesh(boundingBoxGeometry, boundingBoxMaterial);
        this.boundingBox.position.y = 6.5;
        cabinetGroup.add(this.boundingBox);

        // Store mesh and add to scene
        this.changingRoomMesh = cabinetGroup;
        this.scene.add(this.changingRoomMesh);
    }


    // Place the changing room at a random location on the terrain
    placeRandomly() {
        // Define placement area boundaries (adjust based on your map)
        const minX = -125;
        const maxX = 125;
        const minZ = -125;
        const maxZ = 125;
        
        // Generate random position
        const x = minX + Math.random() * (maxX - minX);
        const z = minZ + Math.random() * (maxZ - minZ);
        
        // Get terrain height at this position
        const y = getTerrainHeight(x, z);
        
        // Set position
        this.changingRoomMesh.position.set(x, y, z);
        
        // Randomly rotate for variety
        this.changingRoomMesh.rotation.y = Math.random() * Math.PI * 2;
        
        console.log(`Placed changing room at: ${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`);
    }

    // Update function called each frame
    update(deltaTime) {
        if (!this.changingRoomMesh) return;
        
        // Detect player collision with changing room
        this.checkPlayerCollision();
        
        // Animate particles if player is inside
        if (this.isPlayerInside) {
            // Rotate particles for effect
            if (this.particles) {
                this.particles.rotation.y += deltaTime * 0.5;
                this.particles.rotation.x += deltaTime * 0.2;
            }
        }
    }

    // Check if player is inside changing room
    checkPlayerCollision() {
        // Get bounding box world position
        const boundingBoxWorldPos = new THREE.Vector3();
        this.boundingBox.getWorldPosition(boundingBoxWorldPos);
        
        // Calculate distance from player to changing room center (horizontal only)
        const dx = this.player.position.x - boundingBoxWorldPos.x;
        const dz = this.player.position.z - boundingBoxWorldPos.z;
        const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
        
        // Check vertical position too (player should be inside the y-bounds)
        const isInYRange = 
            this.player.position.y > boundingBoxWorldPos.y - 6.5 && 
            this.player.position.y < boundingBoxWorldPos.y + 6.5;
        
        // If player is within bounding box - increased radius for larger changing room
        const wasInside = this.isPlayerInside;
        this.isPlayerInside = horizontalDistance < 3.5 && isInYRange;
        
        // If player just entered
        if (!wasInside && this.isPlayerInside) {
            this.onPlayerEnter();
        }
        
        // If player just left
        if (wasInside && !this.isPlayerInside) {
            this.onPlayerExit();
        }
    }

    // Called when player enters changing room
    onPlayerEnter() {
        console.log("Player entered changing room");
        
        // Show particles
        if (this.particles) {
            this.particles.visible = true;
        }
        
        // Change player model after cooldown check
        const now = Date.now();
        if (now - this.lastModelChange > this.cooldownTime) {
            this.changePlayerModel();
            this.lastModelChange = now;
        }

        // Show changing message
        this.showChangingMessage();
    }

    // Called when player exits changing room
    onPlayerExit() {
        console.log("Player left changing room");

        // Hide message
        this.hideChangingMessage();
    }

    // Change player 3D model
    changePlayerModel() {
        // Cycle to next model
        this.currentModelIndex = (this.currentModelIndex + 1) % this.modelOptions.length;
        const newModel = this.modelOptions[this.currentModelIndex];
        
        console.log(`Changing player model to: ${newModel.name}`);
        
        // Remove current model from player group
        if (gameState.pandaModel) {
            this.player.remove(gameState.pandaModel);
        }
        
        // Load and set new model
        const loader = new THREE.GLTFLoader();
        loader.load(
            newModel.path,
            (gltf) => {
                console.log(`Successfully loaded model: ${newModel.name}`);
                
                const model = gltf.scene;
                const animations = gltf.animations || [];
                
                // Scale and position the model appropriately
                model.scale.set(1.5, 1.5, 1.5);
                
                // Center the model
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                model.position.sub(center);
                
                // Adjust the y-position so model stands on ground
                const size = box.getSize(new THREE.Vector3());
                model.position.y += size.y / 2;
                
                // Setup shadows
                model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });
                
                // Add to player group
                this.player.add(model);
                
                // Update game state reference
                if (window.setPandaModel) {
                    window.setPandaModel(model, animations);
                }
                
                // Update message with current character
                this.updateChangingMessage(newModel.name);
            },
            (error) => {
                console.error('Error loading model:', error);
            }
        );
    }
    
    // Create and show changing room message
    showChangingMessage() {
        // Check if message already exists
        if (!this.changingMessage) {
            this.changingMessage = document.createElement('div');
            this.changingMessage.className = 'level-warning';

            // Initial message
            const currentModel = this.modelOptions[this.currentModelIndex];
            this.changingMessage.textContent = `Changed into: ${currentModel.name}`;
            
            document.body.appendChild(this.changingMessage);
        }
        
        // Show message
        this.changingMessage.style.display = 'block';
        
        // Clear any existing hide timeout
        if (this.hideMessageTimeout) {
            clearTimeout(this.hideMessageTimeout);
        }
    }
    
    // Update message with current character
    updateChangingMessage(characterName) {
        if (this.changingMessage) {
            this.changingMessage.textContent = `Changed into: ${characterName}`;
        }
    }
    
    // Hide changing room message
    hideChangingMessage() {
        if (this.changingMessage) {
            // Set timeout to hide message after 2 seconds
            this.hideMessageTimeout = setTimeout(() => {
                this.changingMessage.style.display = 'none';
            }, 2000);
        }
    }
}

// Export the changing room class
window.ChangingRoom = ChangingRoom;