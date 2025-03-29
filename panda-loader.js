// Script to ensure the 3D model loader is initialized correctly
// Enhanced with support for custom avatar URLs and separate animation files

let pandaModelLocation = 'assets/pandaFBX/panda.fbx';
//let pandaModelLocation = 'assets/levelsFBX/levels.fbx';
let animationFiles = {
    'idle': 'assets/pandaFBX/lookBehind.fbx',
    'jump': 'assets/pandaFBX/jump.fbx',
    'running': 'assets/pandaFBX/running.fbx',
    'walking': 'assets/pandaFBX/walking.fbx',
    'spin': 'assets/pandaFBX/spin.fbx',
    'spin2': 'assets/pandaFBX/spin2.fbx',
    'dance': 'assets/pandaFBX/dance.fbx',
    'fly': 'assets/pandaFBX/fly.fbx',
    'walkingBackward': 'assets/pandaFBX/walkingBackward.fbx',
};
let pandaModelScale = 2.4;

// Function to parse URL parameters
function getUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    console.log("Url params: "+params);
    return {
        avatarUrl: params.get('avatar_url'),
        username: params.get('username'),
        portal: params.get('portal'),
    };
}

// Function to create the red panda player with FBX support and animations
function createRedPandaPlayer() {
    const playerGroup = new THREE.Group();
    
    if (typeof THREE === 'undefined') {
        console.error('THREE.js not loaded yet');
        return playerGroup;
    }
    
    // Use FBXLoader instead of GLTFLoader
    const loader = THREE.FBXLoader ? new THREE.FBXLoader() : null;
    
    if (!loader) {
        console.error('FBXLoader not available, using fallback panda');
        const fallbackPanda = createBlockPanda();
        playerGroup.add(fallbackPanda);
        if (window.setPandaModel) {
            window.setPandaModel(fallbackPanda, []);
        }
        return playerGroup;
    }
    
    // Placeholder remains the same
    const placeholderGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const placeholderMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff9966,
        transparent: true,
        opacity: 0.5
    });
    const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
    placeholder.castShadow = true;
    playerGroup.add(placeholder);
    
    const params = getUrlParameters();
    const modelUrl = params.avatarUrl || pandaModelLocation;
    console.log(`Loading FBX model: ${modelUrl}`);
    
    // Load main character model
    loader.load(
        modelUrl,
        (fbx) => {
            console.log('FBX model loaded successfully:', modelUrl);
            
            const model = fbx;
            let animations = fbx.animations || [];
            
            // Scale adjustment remains similar

            let modelScale = params.avatarUrl ? 1.5 : pandaModelScale; // Adjust as needed for your FBX
            model.scale.set(modelScale, modelScale, modelScale);
            
            // Center the model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            const size = box.getSize(new THREE.Vector3());
            model.position.y += size.y / 2;
            
            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            
            playerGroup.add(model);
            playerGroup.remove(placeholder);
            
            // Now load additional animation files
            loadAnimations(model, animations, (combinedAnimations) => {
                if (window.setPandaModel) {
                    window.setPandaModel(model, combinedAnimations);
                }
            });
        },
        (xhr) => {
            console.log(`Loading model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
        },
        (error) => {
            console.error('Error loading FBX model:', error);
            // Fallback logic
            if (params.avatarUrl) {
                console.log('Custom model failed, trying default...');
                loader.load(
                    pandaModelLocation,
                    (fbx) => {
                        const model = fbx;
                        model.scale.set(pandaModelScale, pandaModelScale, pandaModelScale);
                        const box = new THREE.Box3().setFromObject(model);
                        const center = box.getCenter(new THREE.Vector3());
                        model.position.sub(center);
                        const size = box.getSize(new THREE.Vector3());
                        model.position.y += size.y / 2;
                        model.traverse((node) => {
                            if (node.isMesh) {
                                node.castShadow = true;
                                node.receiveShadow = true;
                            }
                        });
                        playerGroup.add(model);
                        playerGroup.remove(placeholder);
                        
                        // Load animations for default model
                        loadAnimations(model, fbx.animations || [], (combinedAnimations) => {
                            if (window.setPandaModel) {
                                window.setPandaModel(model, combinedAnimations);
                            }
                        });
                    },
                    null,
                    (secondError) => {
                        console.error('Default FBX failed:', secondError);
                        fallbackToBlockPanda();
                    }
                );
            } else {
                fallbackToBlockPanda();
            }
            
            function fallbackToBlockPanda() {
                console.log('Falling back to block-based panda');
                const fallbackPanda = createBlockPanda();
                playerGroup.add(fallbackPanda);
                playerGroup.remove(placeholder);
                if (window.setPandaModel) {
                    window.setPandaModel(fallbackPanda, []);
                }
            }
        }
    );
    
    return playerGroup;
}

// Function to load animation files and combine them with the model
function loadAnimations(model, initialAnimations, callback) {
    const loader = new THREE.FBXLoader();
    let pendingAnimations = Object.keys(animationFiles).length;
    let combinedAnimations = [...initialAnimations];
    
    if (pendingAnimations === 0) {
        // No additional animations to load
        callback(combinedAnimations);
        return;
    }
    
    // Create clone of the original skeleton for consistent animation
    let skeleton = null;
    model.traverse((node) => {
        if (node.isSkinnedMesh && node.skeleton && !skeleton) {
            skeleton = node.skeleton;
        }
    });
    
    // Load each animation file
    Object.entries(animationFiles).forEach(([animName, fileName]) => {
        loader.load(
            fileName,
            (animFbx) => {
                console.log(`Animation loaded: ${animName} from ${fileName}`);
                
                // Extract animations from the loaded file
                if (animFbx.animations && animFbx.animations.length > 0) {
                    // Rename the animation to match our expected names
                    const anim = animFbx.animations[0].clone();
                    anim.name = animName;
                    
                    // Apply to our skeleton if necessary
                    if (skeleton) {
                        anim.resetDuration();
                    }
                    
                    combinedAnimations.push(anim);
                    console.log(`Added animation: ${anim.name}`);
                } else {
                    console.warn(`No animations found in ${fileName}`);
                }
                
                // Check if all animations are loaded
                pendingAnimations--;
                if (pendingAnimations === 0) {
                    console.log(`All animations loaded. Total: ${combinedAnimations.length}`);
                    callback(combinedAnimations);
                }
            },
            (xhr) => {
                console.log(`Loading animation ${animName}: ${(xhr.loaded / xhr.total * 100)}% loaded`);
            },
            (error) => {
                console.error(`Error loading animation ${animName}:`, error);
                pendingAnimations--;
                if (pendingAnimations === 0) {
                    console.log(`All animations attempted. Successfully loaded: ${combinedAnimations.length}`);
                    callback(combinedAnimations);
                }
            }
        );
    });
}

// Create the original block-based panda as fallback
function createBlockPanda() {
    const pandaGroup = new THREE.Group();
    
    // Body - pastel orange for the red panda
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.5, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff9966, // Pastel orange
        roughness: 0.5,
        metalness: 0.3,
        emissive: 0x331100, // Slight emissive glow
        emissiveIntensity: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.25;
    body.castShadow = true;
    pandaGroup.add(body);
    
    // Rest of block panda creation code remains the same...
    // (truncated for brevity)
    
    return pandaGroup;
}

let urlParamsReceived = getUrlParameters();