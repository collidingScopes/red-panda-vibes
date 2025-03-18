// Level warning messages system
// This handles displaying warning messages at the start of specific levels

class LevelWarnings {
    constructor() {
        // Create the warning message element
        this.createWarningElement();
        
        // Warning messages for specific levels
        this.warnings = {
            2: "☣️ Warning: avoid the evil bubble monsters 🫧",
            3: "⏫ Each level brings more monsters and a harder flag to find 📈"
        };
        
        // Track whether we've shown warnings for specific levels
        this.shownWarnings = {};
    }
    
    // Create the warning message element
    createWarningElement() {
        // Create the element if it doesn't exist
        if (!document.getElementById('level-warning')) {
            const warningEl = document.createElement('div');
            warningEl.id = 'level-warning';
            warningEl.classList.add('level-warning');
            // Start hidden
            warningEl.classList.add('hidden');
            document.body.appendChild(warningEl);
        }
    }
    
    // Show warning for a specific level
    showWarningForLevel(level) {
        // Check if we have a warning for this level and haven't shown it yet
        if (this.warnings[level] && !this.shownWarnings[level]) {
            const warningEl = document.getElementById('level-warning');
            
            // Set the message
            warningEl.textContent = this.warnings[level];
            
            // Show the message
            warningEl.classList.remove('hidden');
            warningEl.classList.remove('fade-out');
            
            // Mark as shown
            this.shownWarnings[level] = true;
            
            // Auto-hide after 4 seconds
            setTimeout(() => {
                warningEl.classList.add('fade-out');
                
                // Remove from DOM after animation completes
                setTimeout(() => {
                    warningEl.classList.add('hidden');
                }, 1000);
            }, 4000);
        }
    }
    
    // Reset shown warnings (for game restart)
    reset() {
        this.shownWarnings = {};
    }
}

// Create global instance
window.levelWarnings = new LevelWarnings();