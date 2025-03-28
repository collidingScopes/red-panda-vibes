class ChangingRoom {
    constructor(scene, player, getTerrainHeight) {
        this.scene = scene;
        this.player = player;
        this.getTerrainHeight = getTerrainHeight;
        this.changingRoomMesh = null;
        this.isPlayerInside = false;
        this.lastModelChange = 0;
        this.cooldownTime = 1800; // Cooldown in milliseconds
        this.modelOptions = [
            { name: "Red Panda", path: 'assets/pandaFBX/panda.fbx' }, // Original panda model
            { name: "Levels", path: 'assets/levelsFBX/levels.fbx' }   // Target model
        ];
        this.currentModelIndex = 0; // Start with Red Panda
        this.loader = null;
        this.preloadedModels = {}; // For storing model paths that have been preloaded
    }

    initialize() {
        this.createChangingRoom();
        this.placeRandomly();
        
        // Initialize FBX loader
        if (THREE && THREE.FBXLoader) {
            this.loader = new THREE.FBXLoader();
            console.log("FBX Loader initialized for changing room");
            
            // Start preloading the Levels model
            this.preloadLevelsModel();
        } else {
            console.error("THREE.FBXLoader not available for changing room");
        }
    }

    // Preload just the Levels model to ensure it loads quickly when needed
    preloadLevelsModel() {
        if (!this.loader) {
            console.error("Cannot preload models: FBX Loader not available");
            return;
        }

        // Only preload the Levels model (index 1)
        const levelsModel = this.modelOptions[1];
        console.log(`Preloading model: ${levelsModel.name} from ${levelsModel.path}`);
        
        // Mark this model path as "being preloaded"
        this.preloadedModels[levelsModel.path] = true;
        
        // Load the model file but don't store the actual model object
        this.loader.load(
            levelsModel.path,
            (fbx) => {
                console.log(`Successfully preloaded ${levelsModel.name} model`);
                // Simply mark that the model has been preloaded, but don't keep the model instance
                this.preloadedModels[levelsModel.path] = true;
            },
            (xhr) => {
                // Progress callback
                const progress = Math.round(xhr.loaded / xhr.total * 100);
                console.log(`Preloading ${levelsModel.name}: ${progress}% loaded`);
            },
            (error) => {
                console.error(`Error preloading ${levelsModel.name} model:`, error);
                // Mark preloading failed
                this.preloadedModels[levelsModel.path] = false;
            }
        );
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
        const boundingBoxGeometry = new THREE.BoxGeometry(8, 9, 8);
        const boundingBoxMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF0000,
            transparent: true,
            opacity: 0.0
        });
        this.boundingBox = new THREE.Mesh(boundingBoxGeometry, boundingBoxMaterial);
        this.boundingBox.position.y = 4.5;
        cabinetGroup.add(this.boundingBox);

        // Store mesh and add to scene
        this.changingRoomMesh = cabinetGroup;
        this.scene.add(this.changingRoomMesh);
    }

    // Place the changing room at a random location on the terrain
    placeRandomly() {
        // Define placement area boundaries (adjust based on your map)
        let maxRadius = 100;
        const minX = -maxRadius;
        const maxX = maxRadius;
        const minZ = -maxRadius;
        const maxZ = maxRadius;
        
        // Generate random position
        const x = minX + Math.random() * (maxX - minX);
        const z = minZ + Math.random() * (maxZ - minZ);
        
        // Get terrain height at this position
        const y = this.getTerrainHeight(x, z);
        
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

    onPlayerEnter() {
        console.log("Player entered changing room");
        const now = Date.now();
        if (now - this.lastModelChange > this.cooldownTime) {
            this.changePlayerModel();
            this.lastModelChange = now;
        }
    }

    onPlayerExit() {
        console.log("Player left changing room");
    }

    changePlayerModel() {
        // Check if we can load models
        if (!this.loader) {
            console.error("FBX Loader not available for model change");
            return;
        }
        
        // Save current animation state before model change
        const wasJumping = window.animationController ? window.animationController.isJumping : false;
        const wasRunning = window.animationController ? window.animationController.isRunning : false;
        const jumpStarted = window.animationController ? window.animationController.jumpStarted : false;
        
        // Reset animation controller state before changing model
        if (window.animationController) {
            window.animationController.stopCurrentAnimation();
        }
        
        // Advance to next model (toggle between Red Panda and Levels)
        this.currentModelIndex = (this.currentModelIndex === 0) ? 1 : 0;
        const newModel = this.modelOptions[this.currentModelIndex];
        
        console.log(`Loading model: ${newModel.name} from ${newModel.path}`);
        
        // Show loading notification
        this.showNotification(`Changing into: ${newModel.name}...`);
        
        // Use the FBX loader directly, as in the original code
        this.loader.load(
            newModel.path,
            (fbx) => {
                console.log(`Successfully loaded ${newModel.name} model`);
                
                // Remove existing model from player
                while (this.player.children.length > 0) {
                    const child = this.player.children[0];
                    this.player.remove(child);
                    this.disposeModel(child);
                }
                
                // Configure the new model based on which one it is
                if (newModel.name === "Levels") {
                    // Scale adjustment for levels model
                    fbx.scale.set(0.035, 0.035, 0.035);
                    
                    // Center the model
                    const box = new THREE.Box3().setFromObject(fbx);
                    const center = box.getCenter(new THREE.Vector3());
                    fbx.position.sub(center);
                    fbx.position.y = 2.5; // Ground level
                } else {
                    // Configure Red Panda model using parameters from panda-loader.js
                    // Apply the panda model scale from panda-loader.js
                    const pandaModelScale = 2.0; // Same as in panda-loader.js
                    fbx.scale.set(pandaModelScale, pandaModelScale, pandaModelScale);
                    
                    // Center the model and adjust height properly
                    const box = new THREE.Box3().setFromObject(fbx);
                    const center = box.getCenter(new THREE.Vector3());
                    fbx.position.sub(center); // Center horizontally
                    
                    // Get the size for proper vertical positioning
                    const size = box.getSize(new THREE.Vector3());
                    fbx.position.y += size.y / 2; // Position at proper height like in panda-loader.js
                }
                
                // Apply shadows to all meshes
                fbx.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });
                
                // Add the model to the player
                this.player.add(fbx);
                
                // Update the global panda model reference if it exists
                if (window.setPandaModel) {
                    window.setPandaModel(fbx, fbx.animations || []);
                    
                    // Reset jump state flags to allow jumping again
                    // We create a short delay to ensure the animations are properly loaded
                    setTimeout(() => {
                        if (window.animationController) {
                            // Ensure animation controller state is reset properly
                            window.animationController.isJumping = false;
                            window.animationController.jumpStarted = false;
                            
                            // Play appropriate animation based on previous state
                            if (wasRunning) {
                                window.animationController.playAnimation('running');
                            } else {
                                window.animationController.playAnimation('idle');
                            }
                        }
                    }, 100);
                }
                
                // Show success notification
                this.showNotification(`Changed into: ${newModel.name}!`);
            },
            (xhr) => {
                console.log(`Loading ${newModel.name}: ${(xhr.loaded / xhr.total * 100)}% loaded`);
            },
            (error) => {
                console.error(`Error loading ${newModel.name} model:`, error);
                this.showNotification(`Failed to change model: ${error.message}`, true);
                // Revert the index since we failed
                this.currentModelIndex = (this.currentModelIndex === 0) ? 1 : 0;
            }
        );
    }

    showNotification(message, isError = false) {
        // Remove any existing notifications
        document.querySelectorAll('.model-change-notification').forEach(el => {
            el.parentNode.removeChild(el);
        });
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = 'level-warning model-change-notification';
        if (isError) notification.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remove after delay unless it's a loading message
        if (!message.includes('...')) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }
    }

    disposeModel(model) {
        model.traverse((node) => {
            if (node.isMesh) {
                if (node.geometry) node.geometry.dispose();
                if (node.material) {
                    if (Array.isArray(node.material)) {
                        node.material.forEach(mat => {
                            if (mat.map) mat.map.dispose();
                            mat.dispose();
                        });
                    } else {
                        if (node.material.map) node.material.map.dispose();
                        node.material.dispose();
                    }
                }
            }
        });
    }
}

window.ChangingRoom = ChangingRoom;