// Control System Loader
// This script coordinates loading the appropriate control system
// based on whether the device is mobile or desktop

// Execute on page load
window.addEventListener('load', function() {
    // Delay initialization slightly to ensure other scripts have loaded
    setTimeout(initializeControlSystem, 200);
});

function initializeControlSystem() {
    console.log("Initializing the appropriate control system");
    
    // Check if we're on mobile
    const isMobileDevice = (function() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(userAgent);
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        
        return isIOS || isAndroid || isMobileUA || isTouchDevice;
    })();
    
    // Store device type
    window.isRunningOnMobile = isMobileDevice;
    
    if (isMobileDevice) {
        console.log("Mobile device detected - loading auto-runner control system");
        loadMobileAutoRunnerSystem();
    } else {
        console.log("Desktop device detected - using standard controls");
        // Desktop uses the default control system
        // No need to load anything special
    }
}

function loadMobileAutoRunnerSystem() {
    // Add mobile device class to body
    document.body.classList.add('mobile-device');
    
    // Add iOS specific class if needed
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        document.body.classList.add('ios-device');
        
        // iOS-specific optimizations
        optimizeForIOS();
    }
    
    // Handle control system switching
    // We'll wait for the auto-runner system to be initialized
    const checkInterval = setInterval(function() {
        if (window.autoRunnerControls) {
            clearInterval(checkInterval);
            console.log("Auto-runner control system loaded successfully");
            
            // Make sure we patch the gameState
            ensureGameStateAccessible();
        }
    }, 100);
}

function optimizeForIOS() {
    // Add iOS-specific viewport meta tag
    let metaViewport = document.querySelector('meta[name=viewport]');
    if (metaViewport) {
        metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
    } else {
        metaViewport = document.createElement('meta');
        metaViewport.name = 'viewport';
        metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
        document.head.appendChild(metaViewport);
    }
    
    // Prevent scrolling on iOS
    document.addEventListener('touchmove', function(e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && 
            e.target.tagName !== 'BUTTON') {
            e.preventDefault();
        }
    }, { passive: false });
}

function ensureGameStateAccessible() {
    // We need to ensure gameState is accessible to our controls
    if (typeof gameState !== 'undefined' && !window.gameState) {
        window.gameState = gameState;
        console.log("Exposed gameState to window object");
    }
    
    // Hook into the game's update loop to ensure controls work correctly
    if (window.gameState) {
        console.log("gameState is properly accessible");
    } else {
        console.warn("gameState is not accessible - mobile controls may not work properly");
    }
}