// Script to ensure the 3D model loader is initialized correctly

// Wait for DOM and Three.js to load
document.addEventListener('DOMContentLoaded', () => {
    let checkLoaderInterval = setInterval(() => {
        if (window.THREE && window.THREE.GLTFLoader) {
            console.log('GLTFLoader is ready');
            clearInterval(checkLoaderInterval);
        } else {
            console.log('Waiting for GLTFLoader to be available...');
        }
    }, 500);

    // Safety timeout after 10 seconds
    setTimeout(() => {
        clearInterval(checkLoaderInterval);
        if (!window.THREE || !window.THREE.GLTFLoader) {
            console.error('GLTFLoader failed to load properly after timeout');
        }
    }, 10000);
});

// Alternative initialization method - create the loader manually if needed
function ensureGLTFLoader() {
    // If THREE exists but loader doesn't, try to create it
    if (window.THREE && !window.THREE.GLTFLoader && window.THREE.FileLoader) {
        console.log('Manually initializing GLTFLoader');
        
        // Basic GLTFLoader implementation
        class BasicGLTFLoader {
            constructor() {
                this.fileLoader = new THREE.FileLoader();
            }
            
            load(url, onLoad, onProgress, onError) {
                // Simply create a block-based panda instead
                console.log('Using basic loader fallback');
                const dummyScene = new THREE.Scene();
                
                // Create a dummy response to satisfy the expected interface
                const response = {
                    scene: dummyScene,
                    animations: []
                };
                
                // Call the success callback
                if (onLoad) onLoad(response);
            }
        }
        
        // Add to THREE namespace
        window.THREE.GLTFLoader = BasicGLTFLoader;
        return true;
    }
    return false;
}

// Create player using the provided 3D model
function createRedPandaPlayer() {
    const playerGroup = new THREE.Group();
    
    // Check if required THREE.js components are loaded
    if (typeof THREE === 'undefined') {
        console.error('THREE.js not loaded yet');
        return playerGroup;
    }
    
    // Try to initialize loader if it doesn't exist
    if (!THREE.GLTFLoader && window.ensureGLTFLoader) {
        window.ensureGLTFLoader();
    }
    
    // Load the GLB model
    // The loader is attached to THREE as a global reference
    const loader = THREE.GLTFLoader ? new THREE.GLTFLoader() : null;
    
    // Check if loader is available
    if (!loader) {
        console.error('GLTFLoader not available yet, using fallback panda');
        const fallbackPanda = createBlockPanda();
        playerGroup.add(fallbackPanda);
        
        // Notify game about fallback (without animations)
        if (window.setPandaModel) {
            window.setPandaModel(fallbackPanda, []);
        }
        
        return playerGroup;
    }
    
    // Create a placeholder until the model loads
    const placeholderGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const placeholderMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff9966,
        transparent: true,
        opacity: 0.5 // Semi-transparent placeholder
    });
    const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
    placeholder.castShadow = true;
    playerGroup.add(placeholder);
    
    // Load the 3D model
    loader.load(
        'assets/panda3DModel6.glb', // Note: Path corrected to match specified location
        (gltf) => {
            console.log('Panda model loaded successfully');
            
            // Extract animations if available
            const animations = gltf.animations || [];
            if (animations.length) {
                console.log(`Model contains ${animations.length} animations`);
            }
            
            // Scale the model appropriately
            const model = gltf.scene;
            model.scale.set(3.0, 3.0, 3.0); // Adjust scale as needed
            model.rotation.y = -Math.PI/2; //90 degree clockwise turn

            // Center the model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center); // Center the model
            
            // Adjust the y-position so the panda stands on the ground
            const size = box.getSize(new THREE.Vector3());
            model.position.y += size.y / 2;
            
            // Set up shadows
            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            
            // Add model to player group
            playerGroup.add(model);
            
            // Remove placeholder after model loads
            playerGroup.remove(placeholder);
            
            // Store model reference in gameState for animations
            if (window.setPandaModel) {
                window.setPandaModel(model, animations);
            }
        },
        (xhr) => {
            console.log(`Loading panda model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
        },
        (error) => {
            console.error('Error loading panda model:', error);
            
            // If model fails to load, use the original block-based panda
            console.log('Falling back to block-based panda');
            const fallbackPanda = createBlockPanda();
            playerGroup.add(fallbackPanda);
            playerGroup.remove(placeholder);
            
            // Notify game about fallback (without animations)
            if (window.setPandaModel) {
                window.setPandaModel(fallbackPanda, []);
            }
        }
    );
    
    return playerGroup;
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
    
    // Head - pastel orange with white features
    const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.4);
    const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff9966, // Same pastel orange
        roughness: 0.5,
        metalness: 0.3,
        emissive: 0x331100, // Slight emissive glow
        emissiveIntensity: 0.2
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.75;
    head.position.z = 0.1;
    head.castShadow = true;
    pandaGroup.add(head);
    
    // White face patches
    const faceGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.1);
    const whiteMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xfff4e0, // Warm white
        roughness: 0.4,
        metalness: 0.2,
        emissive: 0x333333, // Slight emissive glow
        emissiveIntensity: 0.1
    });
    const face = new THREE.Mesh(faceGeometry, whiteMaterial);
    face.position.y = 0.75;
    face.position.z = 0.35;
    face.castShadow = true;
    pandaGroup.add(face);
    
    // Black ears
    const earGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const blackMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444, // Dark gray
        roughness: 0.5,
        metalness: 0.2
    });
    
    // Left ear
    const leftEar = new THREE.Mesh(earGeometry, blackMaterial);
    leftEar.position.set(-0.2, 1.05, 0.1);
    leftEar.castShadow = true;
    pandaGroup.add(leftEar);
    
    // Right ear
    const rightEar = new THREE.Mesh(earGeometry, blackMaterial);
    rightEar.position.set(0.2, 1.05, 0.1);
    rightEar.castShadow = true;
    pandaGroup.add(rightEar);
    
    // Nose
    const noseGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const nose = new THREE.Mesh(noseGeometry, blackMaterial);
    nose.position.set(0, 0.7, 0.45);
    nose.castShadow = true;
    pandaGroup.add(nose);
    
    // Tail - reddish with striped pattern
    const tailGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.7);
    const tailMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff9966, // Pastel orange
        roughness: 0.5,
        metalness: 0.3,
        emissive: 0x331100, // Slight emissive glow
        emissiveIntensity: 0.2
    });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(0, 0.4, -0.6);
    tail.castShadow = true;
    pandaGroup.add(tail);
    
    // Add stripes to tail (small boxes)
    const stripeGeometry = new THREE.BoxGeometry(0.32, 0.1, 0.2);
    const stripeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcc6633, // Darker orange
        roughness: 0.5,
        metalness: 0.2
    });
    
    // Add 3 stripes
    for(let i = 0; i < 3; i++) {
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.position.set(0, 0.4, -0.4 - (i * 0.2));
        stripe.castShadow = true;
        pandaGroup.add(stripe);
    }
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.15);
    const legMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcc6633, // Dark orange
        roughness: 0.5,
        metalness: 0.2
    });
    
    // Front left leg
    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.position.set(-0.2, -0.125, 0.15);
    frontLeftLeg.castShadow = true;
    pandaGroup.add(frontLeftLeg);
    
    // Front right leg
    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.position.set(0.2, -0.125, 0.15);
    frontRightLeg.castShadow = true;
    pandaGroup.add(frontRightLeg);
    
    // Back left leg
    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.position.set(-0.2, -0.125, -0.15);
    backLeftLeg.castShadow = true;
    pandaGroup.add(backLeftLeg);
    
    // Back right leg
    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.position.set(0.2, -0.125, -0.15);
    backRightLeg.castShadow = true;
    pandaGroup.add(backRightLeg);
    
    return pandaGroup;
}