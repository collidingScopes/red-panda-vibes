// High Score System for Red Panda Explorer
class HighScoreSystem {
    constructor() {
        // Google Apps Script endpoint
        this.apiUrl = 'https://script.google.com/macros/s/AKfycbyOZIGC6vn3euZOQ_EiIWnIgJkekJ1ZC8HLO7LtohfMzXtWZe_OzCkYo8LjuULBpmIF/exec';
        
        // Cache for high scores to avoid unnecessary API calls
        this.highScores = null;
        this.percentileCache = null;
        this.isLoadingScores = false;
        
        // DOM elements
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.playAgainButton = document.getElementById('retry-button');
        
        // Check if username exists in localStorage
        this.username = localStorage.getItem('redPandaUsername');
        
        // Track user's personal best score
        this.personalBest = parseInt(localStorage.getItem('redPandaPersonalBest') || '0');
        
        // Modify the game over screen to add highscore elements
        this.setupGameOverScreen();
        
        // Pre-load high scores when the game starts
        this.preloadHighScores();
    }
    
    // Pre-load high scores when the game initializes
    preloadHighScores() {
        console.log('Pre-loading high scores...');
        this.fetchHighScores()
            .then(() => console.log('High scores pre-loaded successfully'))
            .catch(error => console.error('Error pre-loading high scores:', error));
    }
    
    // Set up the modified game over screen
    setupGameOverScreen() {
        // Rebuild the game over screen with new format
        this.gameOverScreen.innerHTML = `
            <h2>Game Over!</h2>
            <div class="game-over-stats">
                <div class="stat-row">
                    <span>Final Level:</span>
                    <span id="final-level">Level 1</span>
                </div>
                <div class="stat-row">
                    <span>Personal Best:</span>
                    <span id="personal-best">Level ${this.personalBest}</span>
                </div>
            </div>
            
            <div class="high-score-table">
                <h3>Global Top 10</h3>
                <div class="table-container">
                    <table id="high-scores-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Player</th>
                                <th>Level</th>
                            </tr>
                        </thead>
                        <tbody id="high-scores-body">
                            <tr><td colspan="3">Loading scores...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div id="percentile-msg" class="percentile-message">
                Your score of 0 is better than 0% of all players
            </div>
            
            <div class="game-over-buttons">
                <button id="retry-button">Try Level Again</button>
                <button id="change-username-btn">Change Username</button>
            </div>
        `;

        // Add event listener for username change
        this.gameOverScreen.addEventListener('click', (e) => {
            if (e.target.id === 'change-username-btn') {
                this.changeUsername();
            }
        });

        // Add event listener for retry button
        document.getElementById('retry-button').addEventListener('click', () => {
            resetGame(); // This function is defined in game.js
        });
    }
    
    // Show the game over screen with high scores
    displayGameOver(level, killCount) {
        // Prompt for username if not already set
        if (!this.username) {
            this.username = this.promptForUsername();
            localStorage.setItem('redPandaUsername', this.username);
        }
        
        // Update the display with current level and score
        document.getElementById('final-level').textContent = `Level ${level}`;
        document.getElementById('personal-best').textContent = `Level ${this.personalBest}`;
        
        // Create a temporary score object for current player
        const currentPlayerScore = {
            name: this.username,
            level: level,
            date: new Date(),
            isCurrentPlayer: true
        };
        
        // Submit score if it's better than the player's personal best
        if (level > this.personalBest) {
            this.submitScore(this.username, level);
            // Update personal best
            this.personalBest = level;
            localStorage.setItem('redPandaPersonalBest', this.personalBest.toString());
            document.getElementById('personal-best').textContent = `Level ${this.personalBest}`;
        }
        
        // If we already have high scores cached, display them immediately with the current score
        if (this.highScores && this.highScores.length > 0) {
            // Create a combined array with the current player's score
            const combinedScores = [...this.highScores, currentPlayerScore];
            this.displayHighScores(combinedScores, level);
            this.displayPercentile(level);
            
            // Then fetch fresh scores in the background to update if needed
            this.fetchHighScores().then(() => {
                this.displayHighScores(null, level);
                this.displayPercentile(level);
            });
        } else {
            // If no cached scores, show loading and fetch them
            document.getElementById('high-scores-body').innerHTML = '<tr><td colspan="3">Loading scores...</td></tr>';
            this.fetchHighScores().then(() => {
                this.displayHighScores(null, level);
                this.displayPercentile(level);
            });
        }
        
        // Show the game over screen
        this.gameOverScreen.classList.remove('hidden');
    }
    
    // Prompt the user for a username
    promptForUsername() {
        let newUsername = '';
        
        while (!newUsername || newUsername.trim() === '') {
            newUsername = prompt('Game Over! Enter your username (max 20 chars):');
            
            // If user cancels the prompt, generate a random username
            if (newUsername === null) {
                newUsername = this.generateUsername();
                break;
            }
            
            newUsername = newUsername.trim();
        }
        
        // Limit to 20 characters
        return newUsername.substring(0, 20);
    }
    
    // Submit a new score to the Google Sheet
    async submitScore(username, level) {
        try {
            // Convert level to a number to ensure proper comparison in Apps Script
            const numericLevel = parseInt(level);
            
            // Log what we're about to send for debugging
            console.log('Submitting score:', {
                name: username,
                level: numericLevel
            });
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                mode: 'no-cors', // Important for cross-origin requests to GAS
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: username,
                    level: numericLevel
                })
            });
            
            console.log('Score submitted successfully');
            
            // Add the new score to the local cache optimistically
            if (this.highScores) {
                const newScore = {
                    name: username,
                    level: numericLevel,
                    date: new Date().toISOString(),
                    isCurrentPlayer: true
                };
                
                // Add the new score to the existing scores
                this.highScores.push(newScore);
            }
            
            // Schedule a refresh of high scores after submission (after a delay to allow server processing)
            setTimeout(() => {
                this.highScores = null; // Clear cache to force a fresh fetch
                this.fetchHighScores();
            }, 1000);
            
        } catch (error) {
            console.error('Error submitting score:', error);
        }
    }
    
    // Fetch high scores from the Google Sheet
    async fetchHighScores() {
        // If already loading scores, return the existing promise
        if (this.isLoadingScores) {
            console.log('Already loading scores, waiting for completion...');
            return this.highScores || [];
        }
        
        this.isLoadingScores = true;
        
        try {
            console.log('Fetching high scores...');
            const response = await fetch(`${this.apiUrl}?action=getScores&t=${Date.now()}`); // Add timestamp to prevent caching
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            console.log('Fetched scores data:', data);
            
            // Transform data to match the expected format
            this.highScores = data.scores.map(row => ({
                name: row[0],
                level: parseInt(row[1]), // Ensure level is a number
                date: row[2],
                isCurrentPlayer: false
            }));
            
            this.isLoadingScores = false;
            return this.highScores;
        } catch (error) {
            console.error('Error fetching high scores:', error);
            this.highScores = this.highScores || []; // Keep existing scores on error
            this.isLoadingScores = false;
            return this.highScores;
        }
    }
    
    // Display high scores in the table
    displayHighScores(scoresOverride = null, currentLevel = null) {
        const tableBody = document.getElementById('high-scores-body');
        
        // Use provided scores or the cached high scores
        const scores = scoresOverride || this.highScores;
        
        if (!scores || scores.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No high scores yet. Be the first!</td></tr>';
            return;
        }
        
        // Sort scores by level (descending) and then by date (ascending) if levels are tied
        const sortedScores = [...scores].sort((a, b) => {
            // First sort by level (descending)
            if (b.level !== a.level) {
                return b.level - a.level;
            }
            // If date is a string, convert to Date
            const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
            const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
            return dateA - dateB;
        });
        
        // Take only top 10
        const topScores = sortedScores.slice(0, 10);
        
        // Track if the current player is in the top 10
        let currentPlayerInTop10 = false;
        
        // Check if current player is in top 10
        if (currentLevel !== null) {
            currentPlayerInTop10 = topScores.some(score => 
                //(score.isCurrentPlayer === true) || 
                (score.name === this.username && score.level === currentLevel)
            );
        }
        
        // Create HTML for each score row
        tableBody.innerHTML = topScores.map((score, index) => {
            // Check if this is the current user's score
            const isCurrentUser = score.isCurrentPlayer === true || 
                                 (score.name === this.username && 
                                  (score.level === currentLevel || (!currentLevel && score.level === this.personalBest)));
            
            // Apply special styling for current user
            const rowClass = isCurrentUser ? 'current-user' : '';
            
            // Apply vibrant pink styling for current user in top 10
            const nameStyle = isCurrentUser ? 'color: #FF1493; font-weight: bold;' : '';
            
            return `
                <tr class="${rowClass}">
                    <td>${index + 1}</td>
                    <td style="${nameStyle}">${this.escapeHtml(score.name)}</td>
                    <td style="${nameStyle}">Level ${score.level}</td>
                </tr>
            `;
        }).join('');
        
        // Add CSS for the current-user class if not already added
        if (!document.getElementById('highscore-styles')) {
            const styleTag = document.createElement('style');
            styleTag.id = 'highscore-styles';
            styleTag.textContent = `
                .current-user {
                    background-color: rgba(255, 20, 147, 0.1);
                }
            `;
            document.head.appendChild(styleTag);
        }
    }
    
    // Display percentile message
    displayPercentile(level) {
        const percentileMsg = document.getElementById('percentile-msg');
        
        if (this.percentileCache && this.percentileCache[level]) {
            // Use cached percentile if available
            const percentile = this.percentileCache[level];
            percentileMsg.textContent = `Your level is better than ${percentile}% of all players`;
        } else {
            // Calculate percentile if not cached
            this.calculatePercentile(level).then(percentile => {
                percentileMsg.textContent = `Your level of ${level} is better than ${percentile}% of all players`;
            });
        }
    }
    
    // Calculate percentile for a given level
    async calculatePercentile(level) {
        // If we already have high scores, calculate locally
        if (this.highScores && this.highScores.length > 0) {
            const totalPlayers = this.highScores.length;
            const playersBelow = this.highScores.filter(score => score.level < level).length;
            const percentile = Math.round((playersBelow / totalPlayers) * 100);
            return percentile;
        }
        return 0; // Default return if no scores are available
    }
    
    // Generate a random username
    generateUsername() {
        const adjectives = ['Happy', 'Lucky', 'Speedy', 'Bouncy', 'Swift', 'Fluffy', 'Snazzy', 'Zippy'];
        const nouns = ['Panda', 'Explorer', 'Runner', 'Jumper', 'Hero', 'Warrior', 'Ninja', 'Champion'];
        
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        
        return `${randomAdjective}${randomNoun}${Math.floor(Math.random() * 100)}`;
    }
    
    // Allow player to change username
    changeUsername() {
        const newUsername = prompt('Enter your username (max 20 characters):', this.username);
        
        if (newUsername && newUsername.trim() !== '') {
            // Limit to 20 characters
            this.username = newUsername.trim().substring(0, 20);
            localStorage.setItem('redPandaUsername', this.username);
            
            // Update any displayed usernames
            this.displayHighScores();
        }
    }
    
    // Helper method to escape HTML special characters
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export the high score system for use in game.js
window.HighScoreSystem = HighScoreSystem;