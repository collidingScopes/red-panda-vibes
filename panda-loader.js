// Script to ensure the 3D model loader is initialized correctly
// Enhanced with support for GLB and FBX models with separate animation files

let pandaModelLocation = 'assets/pandaFBX/panda.fbx';
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
let glbModelScale = 2.0; // Default scale for GLB models

// Function to parse URL parameters
function getUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    console.log("Url params: " + params);
    return {
        avatarUrl: params.get('avatar_url'),
        username: params.get('username'),
        portal: params.get('portal'),
    };
}

// Function to determine if a URL is a GLB file
function isGlbFile(url) {
    return url && url.toLowerCase().endsWith('.glb');
}

// Function to create the player with support for both GLB and FBX models
function createRedPandaPlayer() {
    const playerGroup = new THREE.Group();
    
    if (typeof THREE === 'undefined') {
        console.error('THREE.js not loaded yet');
        return playerGroup;
    }
    
    // Create placeholder while loading
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
    let avatarUrl = params.avatarUrl;
    
    // Determine which loader to use based on avatar URL
    if(avatarUrl && avatarUrl.includes("yacht") ){
        console.log("use custom yacht glb model");
        avatarUrl = "https://collidingScopes.github.io/red-panda-vibes/assets/customGLB/yacht.glb";
        loadGlbModel(avatarUrl, playerGroup, placeholder);
    } else if (avatarUrl && isGlbFile(avatarUrl)) {
        // Use GLTFLoader for GLB files
        loadGlbModel(avatarUrl, playerGroup, placeholder);
    } else {
        // Use FBXLoader for FBX files (or fallback)
        loadFbxModel(avatarUrl || pandaModelLocation, playerGroup, placeholder);
    }
    
    return playerGroup;
}

// Function to load GLB model using GLTFLoader
function loadGlbModel(modelUrl, playerGroup, placeholder) {
    // Check if GLTFLoader is available
    if (!THREE.GLTFLoader) {
        console.error('GLTFLoader not available, falling back to FBX');
        loadFbxModel(pandaModelLocation, playerGroup, placeholder);
        return;
    }
    
    const loader = new THREE.GLTFLoader();
    console.log(`Loading GLB model: ${modelUrl}`);
    
    loader.load(
        modelUrl,
        (gltf) => {
            console.log('GLB model loaded successfully:', modelUrl);
            
            const model = gltf.scene;
            let animations = gltf.animations || [];
            
            // Apply scale to the model
            if(modelUrl.includes("yacht")){
                glbModelScale = 0.25;
            }
            model.scale.set(glbModelScale, glbModelScale, glbModelScale);
            
            // Center the model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            const size = box.getSize(new THREE.Vector3());
            model.position.y += size.y / 2;
            
            // Apply shadows
            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            
            playerGroup.add(model);
            playerGroup.remove(placeholder);
            
            // Set the model in the game with its animations
            if (window.setPandaModel) {
                window.setPandaModel(model, animations);
            }
        },
        (xhr) => {
            console.log(`Loading GLB model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
        },
        (error) => {
            console.error('Error loading GLB model:', error);
            console.log('GLB model failed, falling back to FBX model');
            loadFbxModel(pandaModelLocation, playerGroup, placeholder);
        }
    );
}

// Function to load FBX model using FBXLoader
function loadFbxModel(modelUrl, playerGroup, placeholder) {
    // Check if FBXLoader is available
    if (!THREE.FBXLoader) {
        console.error('FBXLoader not available, using fallback panda');
        const fallbackPanda = createBlockPanda();
        playerGroup.add(fallbackPanda);
        playerGroup.remove(placeholder);
        if (window.setPandaModel) {
            window.setPandaModel(fallbackPanda, []);
        }
        return;
    }
    
    const loader = new THREE.FBXLoader();
    console.log(`Loading FBX model: ${modelUrl}`);
    
    // Load main character model
    loader.load(
        modelUrl,
        (fbx) => {
            console.log('FBX model loaded successfully:', modelUrl);
            
            const model = fbx;
            let animations = fbx.animations || [];
            
            // Scale adjustment
            const isCustomModel = modelUrl !== pandaModelLocation;
            let modelScale = isCustomModel ? 1.5 : pandaModelScale;
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
            console.log(`Loading FBX model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
        },
        (error) => {
            console.error('Error loading FBX model:', error);
            
            // If the custom model failed, try the default
            if (modelUrl !== pandaModelLocation) {
                console.log('Custom FBX model failed, trying default panda...');
                loadFbxModel(pandaModelLocation, playerGroup, placeholder);
            } else {
                // If even the default model fails, use block panda
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

// Execute on script load
let urlParamsReceived = getUrlParameters();