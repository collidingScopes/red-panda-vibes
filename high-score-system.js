// High Score System for Red Panda Explorer
class HighScoreSystem {
    constructor() {
        // Google Apps Script endpoint
        this.apiUrl = 'https://script.google.com/macros/s/AKfycbyOZIGC6vn3euZOQ_EiIWnIgJkekJ1ZC8HLO7LtohfMzXtWZe_OzCkYo8LjuULBpmIF/exec';
        
        // Cache for high scores to avoid unnecessary API calls
        this.highScores = null;
        this.percentileCache = null;
        
        // DOM elements
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.playAgainButton = document.getElementById('retry-button');
        
        // Check if username exists in localStorage
        this.username = localStorage.getItem('redPandaUsername');
        
        // Track user's personal best score
        this.personalBest = parseInt(localStorage.getItem('redPandaPersonalBest') || '0');
        
        // Modify the game over screen to add highscore elements
        this.setupGameOverScreen();
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
                <h3>Top 10 High Scores</h3>
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
                <button id="change-username-btn">Change Username</button>
                <button id="retry-button">Try Level Again</button>
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
        
        // Submit score if it's better than the player's personal best
        if (level > this.personalBest) {
            this.submitScore(this.username, level);
            // Update personal best
            this.personalBest = level;
            localStorage.setItem('redPandaPersonalBest', this.personalBest.toString());
            document.getElementById('personal-best').textContent = `Level ${this.personalBest}`;
        }
        
        // Fetch and display high scores
        this.fetchHighScores().then(() => {
            this.displayHighScores();
            this.displayPercentile(level);
        });
        
        // Show the game over screen
        this.gameOverScreen.classList.remove('hidden');
    }
    
    // Prompt the user for a username
    promptForUsername() {
        let newUsername = '';
        
        while (!newUsername || newUsername.trim() === '') {
            newUsername = prompt('Enter your username (max 20 characters):');
            
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
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: username,
                    level: level
                })
            });
            
            if (!response.ok) {
                console.error('Error submitting score:', response.statusText);
            }
        } catch (error) {
            console.error('Error submitting score:', error);
        }
    }
    
    // Fetch high scores from the Google Sheet
    async fetchHighScores() {
        try {
            const response = await fetch(`${this.apiUrl}?action=getScores`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            
            // Transform data to match the expected format
            this.highScores = data.scores.map(row => ({
                name: row[0],
                level: row[1],
                date: row[2]
            }));
            
            return this.highScores;
        } catch (error) {
            console.error('Error fetching high scores:', error);
            this.highScores = [];
            return [];
        }
    }
    
    // Display high scores in the table
    displayHighScores() {
        const tableBody = document.getElementById('high-scores-body');
        
        if (!this.highScores || this.highScores.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No high scores yet. Be the first!</td></tr>';
            return;
        }
        
        // Sort scores by level (descending) and then by date (ascending) if levels are tied
        const sortedScores = [...this.highScores].sort((a, b) => {
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
        
        // Create HTML for each score row
        tableBody.innerHTML = topScores.map((score, index) => {
            // Highlight the current user's score
            const isCurrentUser = score.name === this.username;
            const rowClass = isCurrentUser ? 'current-user' : '';
            
            return `
                <tr class="${rowClass}">
                    <td>${index + 1}</td>
                    <td>${this.escapeHtml(score.name)}</td>
                    <td>Level ${score.level}</td>
                </tr>
            `;
        }).join('');
    }
    
    // Display percentile message
    displayPercentile(level) {
        const percentileMsg = document.getElementById('percentile-msg');
        
        if (this.percentileCache && this.percentileCache[level]) {
            // Use cached percentile if available
            const percentile = this.percentileCache[level];
            percentileMsg.textContent = `Your level of ${level} is better than ${percentile}% of all players`;
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