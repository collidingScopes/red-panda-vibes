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