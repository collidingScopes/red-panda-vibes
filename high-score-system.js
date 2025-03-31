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
        
        // Initialize username based on priority ranking
        this.initializeUsername();
        
        // Track user's personal best score
        this.personalBest = parseInt(localStorage.getItem('redPandaPersonalBest') || '0');
        
        // Modify the game over screen to add highscore elements
        this.setupGameOverScreen();
        
        // Pre-load high scores when the game starts
        this.preloadHighScores();
    }
    
    // Initialize username based on priority ranking
    initializeUsername() {
        // 1: Check localStorage first
        this.username = localStorage.getItem('redPandaUsername');
        
        // 2: If not in localStorage, check URL parameters
        if (!this.username && urlParamsReceived && urlParamsReceived.username) {
            this.username = window.urlParamsReceived.username;
            // Save to localStorage for future use
            localStorage.setItem('redPandaUsername', this.username);
        }
        
        // 3: Username will be generated randomly at game over if still null
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

        // Add event listener for retry button
        document.getElementById('retry-button').addEventListener('click', () => {
            resetGame(); // This function is defined in game.js
        });

        document.getElementById('restart-button').addEventListener('click', () => {
            gameState.currentLevel = 1;
            document.querySelector("#level-indicator").innerHTML = "Level 1";
            resetGame();
        });
    }
    
    // Show the game over screen with high scores
    async displayGameOver(level) {
        // Get username using the new async method
        const username = await this.promptForUsername();
        this.username = username;
        localStorage.setItem('redPandaUsername', username);
        
        // Update the display with current level and score
        if(gameState.levelsCompleted > 0) {
            document.getElementById('final-level').textContent = `Level ${level-1}`;
        } else {
            document.getElementById('final-level').textContent = `n/a`;
        }
        document.getElementById('personal-best').textContent = `Level ${this.personalBest}`;
        
        // Calculate the completed level (current level - 1)
        // If player is on level 1, they haven't completed any levels yet
        const completedLevel = level > 1 ? level - 1 : 0;
    
        // Create a temporary score object for current player
        const currentPlayerScore = {
            name: this.username,
            level: completedLevel,
            date: new Date(),
            isCurrentPlayer: true
        };
        
        // Check if we need to submit the score
        const shouldSubmitScore = 
            completedLevel > 0 && 
            gameState.levelsCompleted > 0 && 
            this.shouldSubmitHighScore(completedLevel);
        
        if (shouldSubmitScore) {
            this.submitScore(this.username, completedLevel);
            
            // Update personal best if necessary - using completedLevel
            if (completedLevel > this.personalBest) {
                this.personalBest = completedLevel;
                localStorage.setItem('redPandaPersonalBest', this.personalBest.toString());
                document.getElementById('personal-best').textContent = `Level ${this.personalBest}`;
            }
        }
        
        // If we already have high scores cached, display them immediately with the current score
        if (this.highScores && this.highScores.length > 0) {
            // Mark this run's score in the cached scores if it exists
            for (const score of this.highScores) {
                if (score.name === this.username && score.level === completedLevel) {
                    score.isCurrentPlayer = true;
                }
            }
            
            // Create a combined array with the current player's score
            const combinedScores = [...this.highScores];
            
            // Only add the current score if it's not already in the high scores
            // AND if it should be submitted
            const scoreExists = combinedScores.some(s => 
                s.name === this.username && s.level === completedLevel
            );
            
            if (!scoreExists && shouldSubmitScore) {
                combinedScores.push(currentPlayerScore);
            }
            
            this.displayHighScores(combinedScores, completedLevel);
            this.displayPercentile(completedLevel);
        } else {
            // If no cached scores, show loading and fetch them
            document.getElementById('high-scores-body').innerHTML = '<tr><td colspan="3">Loading scores...</td></tr>';
            this.fetchHighScores().then(() => {
                // After fetching, mark this run's score
                for (const score of this.highScores) {
                    if (score.name === this.username && score.level === completedLevel) {
                        score.isCurrentPlayer = true;
                    }
                }
                this.displayHighScores(null, completedLevel);
                this.displayPercentile(completedLevel);
            });
        }
        
        // Show the game over screen
        this.gameOverScreen.classList.remove('hidden');
    }
    
    // FIXED: Updated to consider completedLevel
    shouldSubmitHighScore(level) {
        // Submit if better than personal best
        if (level > this.personalBest) {
            return true;
        }
        
        // Submit if would rank in top 10
        if (this.highScores && this.highScores.length > 0) {
            // If we have fewer than 10 scores, always submit
            if (this.highScores.length < 10) {
                return true;
            }
            
            // Check if score would make it into top 10
            const lowestTopScore = this.highScores
                .sort((a, b) => b.level - a.level)
                .slice(0, 10)
                .reduce((min, score) => Math.min(min, score.level), Infinity);
            
            return level >= lowestTopScore;
        }
        
        // If no scores loaded yet, submit anyway to be safe
        return true;
    }
    
    // Prompt the user for a username with pre-filled value
    promptForUsername() {
        resetAllKeyStates();
        
        // Generate a suggested username using the existing priority logic
        let suggestedUsername = '';
        
        if(localStorage.getItem('redPandaUsername')){
            suggestedUsername = localStorage.getItem('redPandaUsername');
        } else if (window.urlParamsReceived && window.urlParamsReceived.username) {
            suggestedUsername = window.urlParamsReceived.username;
        } else {
            suggestedUsername = this.generateUsername();
        }
        
        // Create a promise that will resolve when the user submits the form
        return new Promise(resolve => {
            // Create the custom prompt container
            const promptOverlay = document.createElement('div');
            promptOverlay.style.position = 'fixed';
            promptOverlay.style.top = '50%';
            promptOverlay.style.left = '50%';
            promptOverlay.style.transform = 'translate(-50%, -50%)';
            promptOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
            promptOverlay.style.padding = '25px';
            promptOverlay.style.border = '3px solid #ffee84'; // Neon yellow
            promptOverlay.style.borderRadius = '10px';
            promptOverlay.style.textAlign = 'center';
            promptOverlay.style.zIndex = '999';
            promptOverlay.style.boxShadow = '0 0 25px rgba(255, 238, 132, 0.7)'; // Yellow glow
            promptOverlay.style.backdropFilter = 'blur(5px)';
            promptOverlay.style.maxWidth = '400px';
            promptOverlay.style.fontFamily = "'Courier New', monospace";
            
            // Create the HTML content
            promptOverlay.innerHTML = `
                <h3 style="color: #84ffef; margin-top: 0; font-size: 24px; text-shadow: 0 0 8px #84ffef;">GAME OVER</h3>
                <p style="color: #ffee84; margin-bottom: 5px;">Enter your username:</p>
                <input type="text" id="username-input" maxlength="20" value="${suggestedUsername}" 
                       style="background: rgba(0, 0, 0, 0.5); 
                              color: #84ffef; 
                              border: 2px solid rgb(255, 132, 239); 
                              padding: 8px 2px; 
                              font-family: 'Courier New', monospace; 
                              font-size: 16px; 
                              width: 100%; 
                              margin-bottom: 10px;
                              max-width: 175px;
                              text-align: center;
                              outline: none;
                              border-radius: 5px;">
                <div style="display: flex; justify-content: center;">
                    <button id="submit-username" 
                            style="background: rgba(0, 0, 0, 0.5); 
                                   color: #84ffef; 
                                   border: 2px solid #84ffef; 
                                   padding: 8px 16px; 
                                   font-family: 'Courier New', monospace; 
                                   cursor: pointer;
                                   width: 100%; 
                                   max-width: 125px;
                                   flex: 1;
                                   border-radius: 5px;
                                   transition: all 0.2s;">High Scores 🏆</button>
                </div>
            `;
            
            // Add the prompt to the document
            document.body.appendChild(promptOverlay);
            
            // Focus the input field
            const inputField = document.getElementById('username-input');
            inputField.focus();
            inputField.select();
            
            // Add button hover effects
            const submitButton = document.getElementById('submit-username');
            
            submitButton.addEventListener('mouseover', () => {
                submitButton.style.backgroundColor = 'rgba(132, 255, 239, 0.2)';
                submitButton.style.boxShadow = '0 0 10px rgba(132, 255, 239, 0.7)';
            });
            
            submitButton.addEventListener('mouseout', () => {
                submitButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                submitButton.style.boxShadow = 'none';
            });
            
            // Handle form submission
            submitButton.addEventListener('click', () => {
                let username = inputField.value.trim();
                if(username === '') {
                    username = suggestedUsername;
                }
                document.body.removeChild(promptOverlay);
                resolve(username.substring(0, 20));
            });
                        
            // Allow pressing Enter to submit
            inputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    let username = inputField.value.trim();
                    if(username === '') {
                        username = suggestedUsername;
                    }
                    document.body.removeChild(promptOverlay);
                    resolve(username.substring(0, 20));
                }
            });
            
            // Prevent keyboard events from propagating to the game
            inputField.addEventListener('keydown', (e) => {
                e.stopPropagation();
            });
            promptOverlay.addEventListener('keydown', (e) => {
                e.stopPropagation();
            });
        });
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
                
                // Sort the high scores immediately so it appears in the right place
                this.highScores.sort((a, b) => {
                    // First sort by level (descending)
                    if (b.level !== a.level) {
                        return b.level - a.level;
                    }
                    // If date is a string, convert to Date
                    const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
                    const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
                    return dateA - dateB;
                });
            }
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
            
            // Store any current player flags before refreshing
            const currentPlayerScores = [];
            if (this.highScores) {
                for (const score of this.highScores) {
                    if (score.isCurrentPlayer) {
                        currentPlayerScores.push({
                            name: score.name,
                            level: score.level
                        });
                    }
                }
            }
            
            // Transform data to match the expected format
            this.highScores = data.scores.map(row => ({
                name: row[0],
                level: parseInt(row[1]), // Ensure level is a number
                date: row[2],
                isCurrentPlayer: false
            }));
            
            // Restore current player flags
            for (const playerScore of currentPlayerScores) {
                for (const score of this.highScores) {
                    if (score.name === playerScore.name && score.level === playerScore.level) {
                        score.isCurrentPlayer = true;
                    }
                }
            }
            
            // Also mark scores that match the current username and personal best
            if (this.username) {
                for (const score of this.highScores) {
                    if (score.name === this.username && score.level === this.personalBest) {
                        score.isCurrentPlayer = true;
                    }
                }
            }
            
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
        
        if(gameState.levelsCompleted > 0){
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
        } else {
            percentileMsg.textContent = '';
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
    
    // Helper method to escape HTML special characters
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export the high score system for use in game.js
window.HighScoreSystem = HighScoreSystem;