// Enhanced Sound System for Red Panda Vibes
// Using Web Audio API for reliable sound effects and background music
let musicLevel = 0.7;
let soundEffectLevel = 0.9; 

class SoundSystem {
    constructor() {
        this.initialized = false;
        this.muted = false;
        this.audioContext = null;
        this.masterGain = null;
        this.hitSoundBuffer = null;

        // Sound effect properties
        this.lastJumpTime = 0;
        this.lastFootstepTime = 0;
        
        // Background music properties
        this.musicTracks = [
            { path: 'assets/song-0.mp3', audio: null, loaded: false },
            { path: 'assets/panda-rnb-2.mp3', audio: null, loaded: false },
            { path: 'assets/vibe-coding.mp3', audio: null, loaded: false },
            { path: 'assets/panda-rnb-1.mp3', audio: null, loaded: false },
            { path: 'assets/song-1.mp3', audio: null, loaded: false },
            { path: 'assets/song-2.mp3', audio: null, loaded: false },
            { path: 'assets/song-3.mp3', audio: null, loaded: false },
            { path: 'assets/bamboo-nomad.mp3', audio: null, loaded: false },
        ];
        this.currentTrackIndex = 0;
        this.musicLoaded = false;
        this.musicPlaying = false;
        this.musicGain = null;
        
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
            this.masterGain.gain.value = soundEffectLevel;
            this.masterGain.connect(this.audioContext.destination);
            
            // Create separate gain node for music
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = musicLevel; // Start with lower volume for music
            this.musicGain.connect(this.masterGain);
            
            this.initialized = true;
            this.createHitSound();
            console.log("Sound system initialized successfully");
            
            // Start loading background music
            this.preloadBackgroundMusic();
        } catch (error) {
            console.error("Failed to initialize sound system:", error);
        }
    }
    
    // Preload background music tracks
    preloadBackgroundMusic() {
        if (!this.initialized) return;
        
        console.log("Preloading background music...");
        
        // Track loading progress
        let tracksLoaded = 0;
        
        // Load each track
        this.musicTracks.forEach((track, index) => {
            // Create an Audio element for this track
            const audio = new Audio();
            
            // Set up event listeners
            audio.addEventListener('canplaythrough', () => {
                track.loaded = true;
                track.audio = audio;
                tracksLoaded++;
                
                console.log(`Loaded track ${index + 1}: ${track.path}`);
                
                // Check if all tracks are loaded
                if (tracksLoaded === this.musicTracks.length) {
                    this.musicLoaded = true;
                    console.log("All background music tracks loaded successfully");
                    
                    // Start playing music after all tracks are loaded, but only if panda is loaded too
                    this.checkAndStartBackgroundMusic();
                }
            });
            
            audio.addEventListener('error', (e) => {
                console.error(`Error loading track ${index + 1}: ${track.path}`, e);
            });
            
            // Start loading
            audio.src = track.path;
            audio.load();
        });
    }
    
    // Check if panda is loaded and start music if it is
    checkAndStartBackgroundMusic() {
        if (this.musicLoaded && window.gameState && window.gameState.pandaModelLoaded) {
            console.log("Panda model is loaded, starting background music");
            this.startBackgroundMusic();
        } else {
            // Check again in a moment
            setTimeout(() => this.checkAndStartBackgroundMusic(), 500);
        }
    }
    
    // Start playing background music
    startBackgroundMusic() {
        if (!this.initialized || !this.musicLoaded || this.musicPlaying || this.muted) return;
        
        try {
            console.log("Starting background music");
            this.playCurrentTrack();
            this.musicPlaying = true;
        } catch (error) {
            console.error("Error starting background music:", error);
        }
    }
    
    // Play the current track in the sequence
    playCurrentTrack() {
        const track = this.musicTracks[this.currentTrackIndex];
        
        if (!track || !track.loaded || !track.audio) {
            console.error("Current track not loaded properly");
            return;
        }
        
        console.log(`Playing track ${this.currentTrackIndex + 1}: ${track.path}`);
        
        // Connect track to Web Audio context for volume control
        if (!track.audioSource) {
            track.audioSource = this.audioContext.createMediaElementSource(track.audio);
            track.audioSource.connect(this.musicGain);
        }
        
        // Set up ended event to play next track
        track.audio.onended = () => {
            console.log(`Track ${this.currentTrackIndex + 1} ended`);
            this.playNextTrack();
        };
        
        // Start playback
        track.audio.currentTime = 0;
        track.audio.play()
            .catch(error => {
                console.error("Error playing track:", error);
                
                // If autoplay was blocked, set up a user interaction handler
                if (error.name === 'NotAllowedError') {
                    this.setupAutoplayFallback();
                }
            });
    }
    
    // Play the next track in the sequence
    playNextTrack() {
        // Stop current track if it's still playing
        const currentTrack = this.musicTracks[this.currentTrackIndex];
        if (currentTrack && currentTrack.audio) {
            currentTrack.audio.pause();
        }
        
        // Move to next track (loop back to first after the last)
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.musicTracks.length;
        console.log(`Advancing to track ${this.currentTrackIndex + 1}`);
        
        // Play the next track
        this.playCurrentTrack();
    }
    
    // Handle autoplay restrictions
    setupAutoplayFallback() {
        console.log("Autoplay blocked - setting up interaction handler");
        
        const handleUserInteraction = () => {
            if (!this.musicPlaying) {
                this.startBackgroundMusic();
            }
            
            // Remove the event listeners after first interaction
            document.removeEventListener('click', handleUserInteraction);
            document.removeEventListener('keydown', handleUserInteraction);
            document.removeEventListener('touchstart', handleUserInteraction);
        };
        
        // Add event listeners for user interaction
        document.addEventListener('click', handleUserInteraction);
        document.addEventListener('keydown', handleUserInteraction);
        document.addEventListener('touchstart', handleUserInteraction);
    }
    
    // Stop background music
    stopBackgroundMusic() {
        if (!this.initialized || !this.musicPlaying) return;
        
        try {
            // Stop the current track
            const currentTrack = this.musicTracks[this.currentTrackIndex];
            if (currentTrack && currentTrack.audio) {
                currentTrack.audio.pause();
            }
            
            this.musicPlaying = false;
            console.log("Background music stopped");
        } catch (error) {
            console.error("Failed to stop background music:", error);
        }
    }
    
    // Create sound UI elements
    createSoundUI() {
        let soundToggle = document.querySelector("#sound-toggle");
        
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
            this.masterGain.gain.value = this.muted ? 0 : soundEffectLevel;
        }
        
        // Update UI
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.textContent = this.muted ? "🔇" : "🔊";
        }
        
        // Handle background music based on mute state
        if (this.muted) {
            // If muting, pause any playing music
            if (this.musicPlaying) {
                const currentTrack = this.musicTracks[this.currentTrackIndex];
                if (currentTrack && currentTrack.audio) {
                    currentTrack.audio.pause();
                }
            }
        } else {
            // If unmuting, check if music should be playing
            if (this.initialized && this.musicLoaded) {
                if (this.musicPlaying) {
                    // Resume current track if music was already playing
                    const currentTrack = this.musicTracks[this.currentTrackIndex];
                    if (currentTrack && currentTrack.audio) {
                        currentTrack.audio.play().catch(err => console.error("Error resuming music:", err));
                    }
                } else if (window.gameState && window.gameState.pandaModelLoaded) {
                    // Start music if it wasn't playing but should be
                    console.log("Starting background music after unmute");
                    this.startBackgroundMusic();
                }
            }
        }
        
        console.log(`Sound ${this.muted ? 'muted' : 'unmuted'}`);
        return this.muted;
    }
    
    // Pause music when game is paused (preserves mute state)
    pauseMusic() {
        if (!this.initialized || !this.musicPlaying) return;
        console.log("pause music function");
        try {
            console.log("Pausing background music");
            
            // Store current music gain value to restore later
            this.previousMusicGainValue = this.musicGain.gain.value;
            
            // Fade out music
            if (this.musicGain) {
                // Smoothly transition volume to zero
                this.musicGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
            }
            
            // Don't actually stop or pause the track - just reduce volume to zero
            console.log("Music volume reduced to 0");
        } catch (error) {
            console.error("Failed to pause music:", error);
        }
    }
    
    // Unpause music when game resumes
    unpauseMusic() {
        if (!this.initialized || !this.musicPlaying || this.muted) return;
        
        try {
            console.log("Unpausing background music");
            
            // Restore previous music volume
            if (this.musicGain) {
                const targetVolume = this.previousMusicGainValue || musicLevel; // Default to 0.5 if no previous value
                
                // Smoothly transition back to previous volume
                this.musicGain.gain.setTargetAtTime(targetVolume, this.audioContext.currentTime, 0.1);
                
                console.log(`Music volume restored to ${targetVolume}`);
            }
            
            // Make sure the audio is playing
            const currentTrack = this.musicTracks[this.currentTrackIndex];
            if (currentTrack && currentTrack.audio && currentTrack.audio.paused) {
                currentTrack.audio.play().catch(err => console.error("Error resuming music:", err));
            }
        } catch (error) {
            console.error("Failed to unpause music:", error);
        }
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
        if (now - this.lastJumpTime < 500) return;
        this.lastJumpTime = now;
        
        let random = Math.random();
        let volume = 0.08;
        // "Boing" sound with pitch bend -- with variations
        if(random < 0.25){
            this.playTone(400, 0.3, 'sine', volume);
            this.playTone(600, 0.2, 'sine', volume, 0.1);
        } else if(random < 0.5){
            this.playTone(600, 0.3, 'sine', volume);
            this.playTone(800, 0.2, 'sine', volume, 0.1);
        } else if(random < 0.75){
            this.playTone(600, 0.3, 'sine', volume);
            this.playTone(400, 0.2, 'sine', volume, 0.1);
        } else if(random <= 1){
            this.playTone(800, 0.3, 'sine', volume);
            this.playTone(600, 0.2, 'sine', volume, 0.1);
        }
    }
    
    // Play footstep sound
    playFootstepSound() {
        if (!this.initialized || this.muted) return;
        
        // Prevent too frequent triggers
        const now = Date.now();
        if (now - this.lastFootstepTime < 100) return;
        this.lastFootstepTime = now;
        
        // Soft footstep sound
        this.playNoise(0.04, 0.015);
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
        this.playTone(150, 0.1, 'sine', 0.35);
        
        // Higher "splat" sound
        this.playTone(300, 0.2, 'sawtooth', 0.2, 0.15);
        
        // Add a noise burst for texture
        this.playNoise(0.1, 0.2, 0.25);
    }

    playWaterSplashSound(){
        if (!this.initialized || this.muted) return;

        // Create a splash sound using noise and filters
        try {
            // Noise burst for splash
            const bufferSize = this.audioContext.sampleRate * 0.3; // 300ms
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                // Exponential decay
                const decay = Math.exp(-4 * i / bufferSize);
                data[i] = (Math.random() * 2 - 1) * decay;
            }
            
            // Create buffer source
            const noise = this.audioContext.createBufferSource();
            noise.buffer = buffer;
            
            // Create bandpass filter to make it sound "watery"
            const filter = this.audioContext.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.value = 1200;
            filter.Q.value = 0.5;
            
            // Create gain node for volume
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0.2;
            
            // Connect nodes
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play sound
            noise.start();
        } catch (error) {
            console.error("Failed to play splash sound:", error);
        }
    }

    // === JETPACK SOUNDS ===
    
    // Play jetpack thrust sound - continuous sound while jetpack is active
    playJetpackSound() {
        if (!this.initialized || this.muted) return;
        
        // Create white noise for the base of the jetpack sound
        const noiseDuration = 0.2;  // Short duration that will loop
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * noiseDuration, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        
        // Fill with white noise
        for (let i = 0; i < noiseBuffer.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        
        // Create source and set to loop
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        
        // Create bandpass filter for "jet" sound
        const filter = this.audioContext.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 900;  // Center frequency
        filter.Q.value = 0.5;  // Width of the band
        
        // Create lowpass filter for "rumble"
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = 600;
        
        // Create gain node for volume control
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.55;  // Not too loud
        
        // Add some modulation for a more dynamic sound
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 8;  // 8 Hz modulation
        
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 100;  // Amount of frequency modulation
        
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        
        // Connect everything
        noiseSource.connect(filter);
        filter.connect(lowpass);
        lowpass.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Start the sound
        noiseSource.start();
        
        // Return controller object to allow stopping the sound
        return {
            isPlaying: true,
            stop: () => {
                if (noiseSource) {
                    // Fade out to avoid clicks
                    gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
                    
                    // Stop after fade
                    setTimeout(() => {
                        try {
                            noiseSource.stop();
                            lfo.stop();
                        } catch (e) {
                            // Ignore errors if already stopped
                        }
                    }, 200);
                }
                this.isPlaying = false;
            }
        };
    }
    
    // Play jetpack pickup sound
    playJetpackPickupSound() {
        if (!this.initialized || this.muted) return;
        
        // Playful ascending arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
        
        notes.forEach((note, index) => {
            // Higher volume than regular pickups
            this.playTone(note, 0.15, 'sine', 0.4, index * 0.08);
        });
        
        // Add a "whoosh" sound
        setTimeout(() => {
            this.playFilteredNoise(0.3, 0.2);
        }, 400);
    }
    
    // Play jetpack fuel empty sound
    playJetpackEmptySound() {
        if (!this.initialized || this.muted) return;
        
        // Descending pitchbend for power down effect
        const startFreq = 600;
        const endFreq = 200;
        const duration = 0.8;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(startFreq, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(
                endFreq, 
                this.audioContext.currentTime + duration
            );
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.001, 
                this.audioContext.currentTime + duration
            );
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + duration);
            
            // Add some noise for texture
            setTimeout(() => {
                this.playNoise(0.3, 0.1);
            }, 200);
            
        } catch (error) {
            console.error("Failed to play jetpack empty sound:", error);
        }
    }
    
    // Helper for filtered noise sounds (useful for whooshes)
    playFilteredNoise(duration, volume = 0.2) {
        if (!this.initialized || this.muted) return;
        
        try {
            // Create noise buffer
            const bufferSize = this.audioContext.sampleRate * duration;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                // Apply envelope to noise
                const position = i / bufferSize;
                const envelope = position < 0.3 ? 
                    position / 0.3 : // Attack
                    1 - ((position - 0.3) / 0.7); // Release
                
                data[i] = (Math.random() * 2 - 1) * envelope;
            }
            
            // Create source
            const noise = this.audioContext.createBufferSource();
            noise.buffer = buffer;
            
            // Create bandpass filter
            const filter = this.audioContext.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.value = 1500;
            filter.Q.value = 1.0;
            
            // Create gain node
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = volume;
            
            // Connect nodes
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play sound
            noise.start();
            
            return noise;
        } catch (error) {
            console.error("Failed to play filtered noise:", error);
            return null;
        }
    }

    // Create hit sound
    createHitSound() {
        if (!this.initialized) return;
        
        try {
            console.log("Creating hit sound");
            
            // Create buffer for sound
            const duration = 0.2; // Shorter duration for punchier sound
            const sampleRate = this.audioContext.sampleRate;
            const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);
            
            // Generate a distorted sine wave with quick decay for a retro 'hit' sound
            for (let i = 0; i < buffer.length; i++) {
                // Main tone
                const t = i / sampleRate;
                // Faster decay for punchier sound
                const decay = Math.pow(1 - t / duration, 2.5);
                // Higher frequencies for arcade-like sound
                const wave1 = Math.sin(2 * Math.PI * 440 * t); // Higher base frequency (was 220)
                const wave2 = Math.sin(2 * Math.PI * 880 * t) * 0.6; // Higher overtone (was 165)
                const wave3 = Math.sin(2 * Math.PI * 660 * t) * 0.4; // Mid-high tone (was 330)
                const wave4 = Math.sin(2 * Math.PI * 1200 * t) * 0.15; // Extra high frequency for brightness
                
                // Combine waves with more aggressive distortion
                data[i] = (wave1 + wave2 + wave3 + wave4) * decay;
                
                // Add more distortion for that classic arcade crunch
                if (data[i] > 0.2) data[i] = 0.2 + (data[i] - 0.2) * 0.7;
                if (data[i] < -0.2) data[i] = -0.2 + (data[i] + 0.2) * 0.7;
            }
            
            this.hitSoundBuffer = buffer;
            console.log("Hit sound created successfully");
        } catch (error) {
            console.error("Failed to create hit sound:", error);
        }
    }
    
    // Play hit sound
    playHitSound() {
        if (!this.initialized || this.muted || !this.hitSoundBuffer) return;
        
        try {
            console.log("Playing hit sound");
            
            const source = this.audioContext.createBufferSource();
            source.buffer = this.hitSoundBuffer;
            
            // Create gain node for volume control
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0.6;
            
            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play sound
            source.start();
        } catch (error) {
            console.error("Failed to play hit sound:", error);
        }
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
            soundSystem.initialize();
        });
    }
    
    // Alternative init method - initialize on first user interaction
    document.addEventListener('click', function initAudio() {
        soundSystem.initialize();
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
    
    // Set up a watcher for the panda model loading to start music
    if (gameState.pandaModelLoaded && soundSystem.initialized && soundSystem.musicLoaded) {
        soundSystem.startBackgroundMusic();
    } else {
        // Add an observer for the pandaModelLoaded property
        const checkPandaLoaded = setInterval(() => {
            if (gameState.pandaModelLoaded && soundSystem.initialized && soundSystem.musicLoaded) {
                soundSystem.startBackgroundMusic();
                clearInterval(checkPandaLoaded);
            }
        }, 500);
    }
    
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

window.playWaterSplashSound = function() {
    if (soundSystem) soundSystem.playWaterSplashSound();
};

// === JETPACK SOUND FUNCTIONS ===
window.playJetpackSound = function() {
    if (soundSystem) return soundSystem.playJetpackSound();
    return null;
};

window.playJetpackPickupSound = function() {
    if (soundSystem) soundSystem.playJetpackPickupSound();
};

window.playJetpackEmptySound = function() {
    if (soundSystem) soundSystem.playJetpackEmptySound();
};

window.playHitSound = function() {
    if (soundSystem) soundSystem.playHitSound();
};