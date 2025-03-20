// Simplified Sound System for Red Panda Vibes
// Using Web Audio API for reliable sound effects

class SoundSystem {
    constructor() {
        this.initialized = false;
        this.muted = false;
        this.audioContext = null;
        this.masterGain = null;
        
        // Sound effect properties
        this.lastJumpTime = 0;
        this.lastFootstepTime = 0;
        
        // Create UI controls
        this.createSoundUI();
        
        console.log("Sound system created");
    }
    
    // Initialize the audio system
    async initialize() {
        if (this.initialized) return;
        
        try {
            console.log("Initializing sound system...");
            
            // Create audio context - works on all modern browsers
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master volume control
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.audioContext.destination);
            
            // Initialize background music (soft ambient pad)
            this.initializeBackgroundMusic();
            
            this.initialized = true;
            console.log("Sound system initialized successfully");
        } catch (error) {
            console.error("Failed to initialize sound system:", error);
        }
    }
    
    // Create a simple background music pad
    initializeBackgroundMusic() {
        // Skip if not initialized
        if (!this.initialized) return;
        
        try {
            // Create oscillator for ambient pad sound
            const pad1 = this.audioContext.createOscillator();
            pad1.type = 'sine';
            pad1.frequency.value = 220; // A3
            
            const pad2 = this.audioContext.createOscillator();
            pad2.type = 'sine';
            pad2.frequency.value = 330; // E4
            
            const pad3 = this.audioContext.createOscillator();
            pad3.type = 'sine';
            pad3.frequency.value = 392; // G4
            
            // Create gain nodes for volume control and soft attack/release
            const pad1Gain = this.audioContext.createGain();
            const pad2Gain = this.audioContext.createGain();
            const pad3Gain = this.audioContext.createGain();
            
            // Set initial volume to zero for fade in
            pad1Gain.gain.value = 0;
            pad2Gain.gain.value = 0;
            pad3Gain.gain.value = 0;
            
            // Connect oscillators to their gain nodes
            pad1.connect(pad1Gain);
            pad2.connect(pad2Gain);
            pad3.connect(pad3Gain);
            
            // Connect gain nodes to master gain
            pad1Gain.connect(this.masterGain);
            pad2Gain.connect(this.masterGain);
            pad3Gain.connect(this.masterGain);
            
            // Store references
            this.backgroundMusic = {
                oscillators: [pad1, pad2, pad3],
                gainNodes: [pad1Gain, pad2Gain, pad3Gain],
                playing: false
            };
            
            console.log("Background music initialized");
        } catch (error) {
            console.error("Failed to initialize background music:", error);
        }
    }
    
    // Start playing background music
    startBackgroundMusic() {
        if (!this.initialized || !this.backgroundMusic || this.backgroundMusic.playing) return;
        
        try {
            const currentTime = this.audioContext.currentTime;
            const { oscillators, gainNodes } = this.backgroundMusic;
            
            // Start oscillators
            oscillators.forEach(osc => osc.start());
            
            // Fade in volumes gradually
            gainNodes[0].gain.setValueAtTime(0, currentTime);
            gainNodes[0].gain.linearRampToValueAtTime(0.1, currentTime + 3);
            
            gainNodes[1].gain.setValueAtTime(0, currentTime);
            gainNodes[1].gain.linearRampToValueAtTime(0.07, currentTime + 5);
            
            gainNodes[2].gain.setValueAtTime(0, currentTime);
            gainNodes[2].gain.linearRampToValueAtTime(0.06, currentTime + 4);
            
            this.backgroundMusic.playing = true;
            console.log("Background music started");
        } catch (error) {
            console.error("Failed to start background music:", error);
        }
    }
    
    // Stop background music
    stopBackgroundMusic() {
        if (!this.initialized || !this.backgroundMusic || !this.backgroundMusic.playing) return;
        
        try {
            const currentTime = this.audioContext.currentTime;
            const { oscillators, gainNodes } = this.backgroundMusic;
            
            // Fade out volumes
            gainNodes.forEach(gain => {
                gain.gain.setValueAtTime(gain.gain.value, currentTime);
                gain.gain.linearRampToValueAtTime(0, currentTime + 1);
            });
            
            // Stop oscillators after fade out
            oscillators.forEach(osc => {
                osc.stop(currentTime + 1.1);
            });
            
            this.backgroundMusic.playing = false;
            console.log("Background music stopped");
        } catch (error) {
            console.error("Failed to stop background music:", error);
        }
    }
    
    // Create sound UI elements
    createSoundUI() {
        const soundToggle = document.createElement('button');
        soundToggle.id = 'sound-toggle';
        soundToggle.textContent = "🔊";
        soundToggle.title = "Toggle Sound";
        
        // Style the button
        soundToggle.style.position = 'fixed';
        soundToggle.style.top = '10px';
        soundToggle.style.right = '70px';
        soundToggle.style.width = '40px';
        soundToggle.style.height = '40px';
        soundToggle.style.fontSize = '20px';
        soundToggle.style.zIndex = '150';
        soundToggle.style.borderRadius = '50%';
        soundToggle.style.background = 'rgba(0, 0, 0, 0.5)';
        soundToggle.style.color = '#84ffef';
        soundToggle.style.border = '1px solid #84ffef';
        
        // Add click event
        soundToggle.addEventListener('click', () => {
            this.toggleMute();
        });
        
        // Add to document when it's ready
        if (document.body) {
            document.body.appendChild(soundToggle);
        } else {
            window.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(soundToggle);
            });
        }
    }
    
    // Toggle mute state
    toggleMute() {
        this.muted = !this.muted;
        
        // Update master volume
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.5;
        }
        
        // Update UI
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.textContent = this.muted ? "🔇" : "🔊";
        }
        
        console.log(`Sound ${this.muted ? 'muted' : 'unmuted'}`);
        return this.muted;
    }
    
    // Helper to create a tone
    playTone(frequency, duration, type = 'sine', volume = 0.5, delay = 0) {
        if (!this.initialized || this.muted) return null;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = type;
            oscillator.frequency.value = frequency;
            
            gainNode.gain.value = volume;
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            const startTime = this.audioContext.currentTime + delay;
            const stopTime = startTime + duration;
            
            oscillator.start(startTime);
            oscillator.stop(stopTime);
            
            // Add fade out
            gainNode.gain.setValueAtTime(volume, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime);
            
            return oscillator;
        } catch (error) {
            console.error("Failed to play tone:", error);
            return null;
        }
    }
    
    // Helper to create a noise burst
    playNoise(duration, volume = 0.3, delay = 0) {
        if (!this.initialized || this.muted) return null;
        
        try {
            // Create buffer with random values (white noise)
            const bufferSize = this.audioContext.sampleRate * duration;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            // Create buffer source
            const noise = this.audioContext.createBufferSource();
            noise.buffer = buffer;
            
            // Create gain node for volume control
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = volume;
            
            // Connect nodes
            noise.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play noise
            const startTime = this.audioContext.currentTime + delay;
            noise.start(startTime);
            
            // Fade out
            gainNode.gain.setValueAtTime(volume, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            
            return noise;
        } catch (error) {
            console.error("Failed to play noise:", error);
            return null;
        }
    }
    
    // Sound Effects
    
    // Play jump sound
    playJumpSound() {
        if (!this.initialized || this.muted) return;
        
        // Prevent too frequent triggers
        const now = Date.now();
        if (now - this.lastJumpTime < 300) return;
        this.lastJumpTime = now;
        
        // "Boing" sound with pitch bend
        this.playTone(400, 0.3, 'triangle', 0.3);
        this.playTone(600, 0.2, 'triangle', 0.2, 0.1);
    }
    
    // Play footstep sound
    playFootstepSound() {
        if (!this.initialized || this.muted) return;
        
        // Prevent too frequent triggers
        const now = Date.now();
        if (now - this.lastFootstepTime < 250) return;
        this.lastFootstepTime = now;
        
        // Soft footstep sound
        this.playNoise(0.1, 0.05);
    }
    
    // Play goal reached sound
    playGoalSound() {
        if (!this.initialized || this.muted) return;
        
        // Play ascending notes
        this.playTone(523.25, 0.2, 'sine', 0.3); // C5
        this.playTone(659.25, 0.2, 'sine', 0.3, 0.2); // E5
        this.playTone(783.99, 0.4, 'sine', 0.3, 0.4); // G5
    }
    
    // Play enemy warning sound
    playEnemyWarningSound() {
        if (!this.initialized || this.muted) return;
        
        // Play warning sound
        this.playTone(220, 0.2, 'sawtooth', 0.2); // A3
        this.playTone(220, 0.2, 'sawtooth', 0.2, 0.3); // Repeat
    }
    
    // Play level up sound
    playLevelUpSound() {
        if (!this.initialized || this.muted) return;
        
        // Play ascending scale
        const notes = [523.25, 587.33, 659.25, 783.99, 1046.50]; // C5, D5, E5, G5, C6
        
        notes.forEach((note, index) => {
            this.playTone(note, 0.2, 'sine', 0.3, index * 0.1);
        });
    }
    
    // Play game over sound
    playGameOverSound() {
        if (!this.initialized || this.muted) return;
        
        // Play descending scale
        const notes = [440, 349.23, 261.63, 196, 130.81]; // A4, F4, C4, G3, C3
        
        notes.forEach((note, index) => {
            this.playTone(note, 0.3, 'sawtooth', 0.3, index * 0.2);
        });
    }

    playEnemyCrushSound() {
        if (!this.initialized || this.muted) return;
        
        // Create a "squish" sound for crushing enemies
        // A quick low tone followed by a higher pitch sound
        
        // Low frequency "thud"
        this.playTone(150, 0.1, 'sine', 0.3);
        
        // Higher "splat" sound
        this.playTone(300, 0.2, 'sawtooth', 0.2, 0.05);
        
        // Add a noise burst for texture
        this.playNoise(0.1, 0.2, 0.05);
    }
}

// Initialize sound system when the document is ready
let soundSystem = null;

function initializeSoundSystem() {
    if (soundSystem) return; // Already initialized
    
    console.log("Creating sound system");
    soundSystem = new SoundSystem();
    window.soundSystem = soundSystem;
    
    // Set up events to initialize audio on user interaction
    const startButton = document.getElementById('start-game-button');
    if (startButton) {
        startButton.addEventListener('click', () => {
            soundSystem.initialize().then(() => {
                soundSystem.startBackgroundMusic();
            });
        });
    }
    
    // Alternative init method - initialize on first user interaction
    document.addEventListener('click', function initAudio() {
        soundSystem.initialize().then(() => {
            soundSystem.startBackgroundMusic();
        });
        document.removeEventListener('click', initAudio);
    }, { once: true });
}

// Connect sound system to game events
function connectSoundsToGameEvents() {
    if (!window.gameState || !soundSystem) {
        // Try again later if game state or sound system isn't ready
        setTimeout(connectSoundsToGameEvents, 500);
        return;
    }
    
    const gameState = window.gameState;
    
    // Add property to track last footstep time
    gameState.lastFootstepTime = 0;
    
    console.log("Sound system connected to game events");
}

// Initialize when the document is fully loaded
window.addEventListener('load', () => {
    initializeSoundSystem();
    
    // Connect to game events after a delay to ensure game is initialized
    setTimeout(connectSoundsToGameEvents, 1000);
});

// Expose key functions to ensure they're available to the game
window.playJumpSound = function() {
    if (soundSystem) soundSystem.playJumpSound();
};

window.playFootstepSound = function() {
    if (soundSystem) soundSystem.playFootstepSound();
};

window.playGoalSound = function() {
    if (soundSystem) soundSystem.playGoalSound();
};

window.playEnemyWarningSound = function() {
    if (soundSystem) soundSystem.playEnemyWarningSound();
};

window.playLevelUpSound = function() {
    if (soundSystem) soundSystem.playLevelUpSound();
};

window.playGameOverSound = function() {
    if (soundSystem) soundSystem.playGameOverSound();
};

window.playEnemyCrushSound = function() {
    if (soundSystem) soundSystem.playEnemyCrushSound();
};