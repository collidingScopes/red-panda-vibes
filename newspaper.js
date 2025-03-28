// Newspaper Class
// Creates a low-poly 3D newspaper that floats in the game

class Newspaper {
    constructor(scene, player, getTerrainHeight) {
        this.scene = scene;
        this.player = player;
        this.getTerrainHeight = getTerrainHeight;
        this.object = null;
        this.cooldown = false;
        this.cooldownTime = 2000; // 2 seconds cooldown between interactions
        this.detectionRadius = 5; // How close player needs to be to interact
        this.floatHeight = 5;
        this.font = null; // Store the loaded font
        // Colors
        this.paperColor = 0xf5f5dc; // Beige/off-white for newspaper
        this.textColor = 0x000000; // Black text
        this.headlineColor = 0x000000; // Black headlines
        this.glow = null; // Store glow effect reference
        this.pandaImage = null; // Store panda image
        
        // Hacker News overlay variables
        this.overlayActive = false;
        this.overlay = null;
        this.articles = [];
        this.reading = false;
        this.activeCooldown = false;
    }

    // Method to load font
    loadFont() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.FontLoader();
            loader.load(
                'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
                (font) => {
                    this.font = font;
                    console.log("Font loaded successfully for newspaper");
                    resolve();
                },
                undefined,
                (error) => {
                    console.error('Error loading font for newspaper:', error);
                    reject(error);
                }
            );
        });
    }

    // Method to load panda image
    loadPandaImage() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            // Try multiple possible paths for the image
            const imagePaths = [
                './assets/reading-panda.webp',
                '/assets/reading-panda.webp',
                'assets/reading-panda.webp',
                'reading-panda.webp',
                './reading-panda.webp',
                '/reading-panda.webp'
            ];
            
            // Function to try loading with the next path
            const tryNextPath = (index) => {
                // If we've tried all paths, resolve without an image
                if (index >= imagePaths.length) {
                    console.warn('Could not load panda image, will use placeholder instead');
                    resolve();
                    return;
                }
                
                // Try to load the image
                console.log(`Trying to load panda image from: ${imagePaths[index]}`);
                loader.load(
                    imagePaths[index],
                    (texture) => {
                        this.pandaImage = texture;
                        console.log(`Panda image loaded successfully from: ${imagePaths[index]}`);
                        resolve();
                    },
                    undefined,
                    (error) => {
                        console.warn(`Failed to load panda image from: ${imagePaths[index]}`);
                        // Try the next path
                        tryNextPath(index + 1);
                    }
                );
            };
            
            // Start trying with the first path
            tryNextPath(0);
        });
    }

    async createNewspaperModel() {
        // Create a group for the newspaper
        const newspaperGroup = new THREE.Group();
        
        // Scale factor to adjust overall size
        const scaleFactor = 1.7;

        // Create newspaper page - thin box
        const pageGeometry = new THREE.BoxGeometry(4 * scaleFactor, 5 * scaleFactor, 0.1 * scaleFactor);
        const pageMaterial = new THREE.MeshStandardMaterial({
            color: this.paperColor,
            roughness: 0.8,
            metalness: 0.1,
        });
        
        const page = new THREE.Mesh(pageGeometry, pageMaterial);
        newspaperGroup.add(page);
        
        // Wait for font to load before creating text
        if (!this.font) {
            await this.loadFont();
        }

        // Wait for panda image to load
        if (!this.pandaImage) {
            await this.loadPandaImage();
        }

        // Create materials for newspaper texture (front and back are identical)
        const frontTexture = this.createNewspaperTexture();
        const frontMaterial = new THREE.MeshBasicMaterial({ map: frontTexture });
        
        // Create two planes for front and back of newspaper with the texture
        const planeGeometry = new THREE.PlaneGeometry(4 * scaleFactor, 5 * scaleFactor);
        
        const frontPlane = new THREE.Mesh(planeGeometry, frontMaterial);
        frontPlane.position.z = 0.06 * scaleFactor; // Slightly in front of the box
        newspaperGroup.add(frontPlane);
        
        const backPlane = new THREE.Mesh(planeGeometry, frontMaterial.clone());
        backPlane.position.z = -0.06 * scaleFactor; // Slightly behind the box
        backPlane.rotation.y = Math.PI; // Rotate to face backward
        newspaperGroup.add(backPlane);
        
        // Add glow effect to make the newspaper more visible
        const glowMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFAA,
            transparent: true,
            opacity: 0.3,
            emissive: 0xFFFFAA,
            emissiveIntensity: 0.3
        });
        
        const glowGeometry = new THREE.BoxGeometry(4.2 * scaleFactor, 5.2 * scaleFactor, 0.2 * scaleFactor);
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(0, 0, 0);
        newspaperGroup.add(glow);
        
        this.glow = glow;
        
        // Set initial rotation
        newspaperGroup.rotation.x = -Math.PI / 22;
        this.object = newspaperGroup;
        
        this.startFloatingAnimation();
    }

    createNewspaperTexture() {
        // Create a canvas to draw the newspaper texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 640;
        const context = canvas.getContext('2d');
        
        // Fill background
        context.fillStyle = '#f5f5dc';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add newspaper border
        context.strokeStyle = '#000000';
        context.lineWidth = 2;
        context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        
        // Add header with "Breaking News"
        context.fillStyle = '#000000';
        context.font = 'bold 48px Times New Roman';
        context.textAlign = 'center';
        context.fillText("BREAKING NEWS", canvas.width / 2, 60);
        
        // Add masthead line
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(20, 75);
        context.lineTo(canvas.width - 20, 75);
        context.stroke();
        
        // Add date
        context.font = '16px Times New Roman';
        context.textAlign = 'right';
        context.fillText("MARCH 26, 2025", canvas.width - 25, 100);
        
        // Add main headline
        context.font = 'bold 36px Times New Roman';
        context.textAlign = 'center';
        context.fillText("RED PANDA LEARNS", canvas.width / 2, 150);
        context.fillText("... TO READ!", canvas.width / 2, 190);
        
        // Add subheadline
        context.font = 'italic 18px Times New Roman';
        context.fillText("Players worldwide applaud", canvas.width / 2, 220);
        
        // Add panda image if loaded, otherwise use placeholder
        if (this.pandaImage && this.pandaImage.image) {
            // Use panda image
            try {
                const imageX = canvas.width / 4;
                const imageY = 240;
                const imageWidth = canvas.width / 2;
                const imageHeight = canvas.width / 2;
                
                // Draw image
                context.drawImage(this.pandaImage.image, imageX, imageY, imageWidth, imageHeight);
                
                // Add border around image
                context.strokeStyle = '#000000';
                context.lineWidth = 2;
                context.strokeRect(imageX, imageY, imageWidth, imageHeight);
            } catch (error) {
                console.error('Error drawing panda image on newspaper:', error);
                // Fallback to placeholder if drawing fails
                context.fillStyle = '#cccccc';
                context.fillRect(canvas.width / 4, 240, canvas.width / 2, canvas.width / 2);
                context.strokeRect(canvas.width / 4, 240, canvas.width / 2, canvas.width / 2);
            }
        } else {
            // Use placeholder rectangle if image not loaded
            context.fillStyle = '#cccccc';
            context.fillRect(canvas.width / 4, 240, canvas.width / 2, canvas.width / 2);
            context.strokeRect(canvas.width / 4, 240, canvas.width / 2, canvas.width / 2);
        }
        
        // Add text columns
        context.fillStyle = '#000000';
        context.font = '10px Times New Roman';
        context.textAlign = 'left';
        
        // Create column text lines (just gray lines to simulate text)
        for (let y = 420; y < 600; y += 12) {
            // Left column
            context.fillStyle = '#555555';
            for (let x = 30; x < 240; x += 4) {
                context.fillRect(x, y, 3, 2);
            }
            
            // Right column
            for (let x = 270; x < 480; x += 4) {
                context.fillRect(x, y, 3, 2);
            }
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    async initialize() {
        console.log("Initializing newspaper...");
        await this.createNewspaperModel();
        this.placeRandomly();
        // Create the overlay element in the DOM but keep it hidden
        this.createOverlay();
    }
    
    placeRandomly() {
        if (!this.object) return;
        
        // Remove from scene if already added
        if (this.object.parent) {
            this.scene.remove(this.object);
        }
        
        // Find a random position on the map, not too close to the origin
        const angle = Math.random() * Math.PI * 2;
        const distance = 45 + Math.random() * 60;
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const y = this.getTerrainHeight(x, z);
        
        this.object.position.set(x, y + this.floatHeight, z); // Position above terrain
        this.scene.add(this.object);
        
        console.log(`Newspaper placed at position: ${x}, ${y + this.floatHeight}, ${z}`);
    }
    
    startFloatingAnimation() {
        // Base position
        const baseY = this.object.position.y;
        
        // Add animation properties
        this.animationParams = {
            speed: 0.5 + Math.random() * 0.5,
            amplitude: 0.3,
            rotationSpeed: 0.25,
            time: Math.random() * Math.PI * 2 // Random starting phase
        };
    }
    
    update(deltaTime) {
        if (!this.object) return;
        
        // Only update floating animation if we're not reading
        if (!this.reading) {
            // Handle floating animation
            this.animationParams.time += deltaTime * this.animationParams.speed;
            
            // Bob up and down
            const floatOffset = Math.sin(this.animationParams.time) * this.animationParams.amplitude;
            const baseY = this.getTerrainHeight(
                this.object.position.x, 
                this.object.position.z
            ) + this.floatHeight; // Base height above terrain
            
            this.object.position.y = baseY + floatOffset;
            
            // Gentle rotation around Y axis
            this.object.rotation.y += deltaTime * this.animationParams.rotationSpeed;
            
            // Pulse the glow
            if (this.glow) {
                const pulseScale = 1 + Math.sin(this.animationParams.time * 1.5) * 0.05;
                this.glow.scale.set(pulseScale, pulseScale, pulseScale);
            }
            
            // Check for player collision
            if (!this.cooldown && !this.activeCooldown) {
                const dx = this.player.position.x - this.object.position.x;
                const dy = this.player.position.y - this.object.position.y;
                const dz = this.player.position.z - this.object.position.z;
                
                const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                if (distance < this.detectionRadius) {
                    this.onInteract();
                    this.startCooldown();
                }
            }
        }
    }
    
    onInteract() {
        console.log("Player interacted with newspaper");
        
        // Pause the game
        if (window.gameState && !window.gameState.gamePaused) {
            // Store the current animation ID to be able to resume later
            if (window.gameState.animationId) {
                // Store the running animation ID
                this.savedAnimationId = window.gameState.animationId;
                
                // Cancel the current animation frame
                cancelAnimationFrame(window.gameState.animationId);
                window.gameState.animationId = null;
            }
            
            window.gameState.gamePaused = true;
            
            // Mark as reading
            this.reading = true;
            
            // Show the overlay with Hacker News content
            this.showOverlay();
        }
    }
    
    createOverlay() {
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'newspaper-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = '#000';
        overlay.style.zIndex = '1000';
        overlay.style.display = 'none';
        overlay.style.fontFamily = 'monospace';
        overlay.style.color = '#FF6600'; // Evangelion orange color
        overlay.style.overflow = 'hidden';
        overlay.style.backgroundImage = 'linear-gradient(rgba(0, 10, 20, 0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 10, 20, 0.8) 1px, transparent 1px)';
        overlay.style.backgroundSize = '20px 20px, 20px 20px';
        overlay.style.boxShadow = 'inset 0 0 150px rgba(0, 50, 100, 0.5)';
        
        // Check if we're on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Create left side marker lines - hide on mobile to save space
        const sideMarkers = document.createElement('div');
        sideMarkers.style.position = 'absolute';
        sideMarkers.style.left = '35px';
        sideMarkers.style.top = '0';
        sideMarkers.style.bottom = '0';
        sideMarkers.style.width = '30px';
        sideMarkers.style.display = 'flex';
        sideMarkers.style.flexDirection = 'column';
        sideMarkers.style.justifyContent = 'center';
        
        // Hide side markers on mobile
        if (isMobile) {
            sideMarkers.style.display = 'none';
        }
        
        // Create markers
        for (let i = 6; i >= 1; i--) {
            const marker = document.createElement('div');
            marker.style.width = '100%';
            marker.style.height = '2px';
            marker.style.marginBottom = '40px';
            marker.style.backgroundColor = '#00FFFF'; // Cyan color for markers
            
            const label = document.createElement('div');
            label.textContent = `+0${i}`;
            label.style.color = '#00FFFF';
            label.style.fontSize = '12px';
            label.style.position = 'relative';
            label.style.top = '-8px';
            
            sideMarkers.appendChild(label);
            sideMarkers.appendChild(marker);
        }
        
        // Create "BORDER LINE" indicator - simplify on mobile
        const borderLine = document.createElement('div');
        borderLine.style.position = 'absolute';
        borderLine.style.left = '0';
        borderLine.style.right = '0';
        borderLine.style.bottom = isMobile ? '70px' : '100px'; // Move up on mobile
        borderLine.style.height = '2px';
        borderLine.style.backgroundColor = '#00FFFF';
        borderLine.style.display = 'flex';
        borderLine.style.justifyContent = 'center';
        borderLine.style.alignItems = 'center';

        // Create header with title panel - adjust for mobile
        const header = document.createElement('div');
        header.style.padding = isMobile ? '15px 15px 10px 15px' : '25px 80px 15px 80px';
        header.style.display = 'flex';
        header.style.flexDirection = isMobile ? 'column' : 'column';
        header.style.alignItems = 'flex-start';
        
        // Main title in Evangelion style - smaller on mobile
        const titlePanel = document.createElement('div');
        titlePanel.style.backgroundColor = 'rgba(0,0,0,0.7)';
        titlePanel.style.border = '2px solid #FF6600';
        titlePanel.style.padding = isMobile ? '5px 10px' : '10px 20px';
        titlePanel.style.marginBottom = '15px';
        titlePanel.style.width = isMobile ? 'calc(100% - 22px)' : 'auto'; // Full width minus padding and border
        
        const title = document.createElement('div');
        title.textContent = 'PANDA HACKER NEWS 🐼';
        title.style.fontSize = isMobile ? '18px' : '24px';
        title.style.fontWeight = 'bold';
        title.style.letterSpacing = '1px';
        title.style.textAlign = isMobile ? 'center' : 'left';
        
        titlePanel.appendChild(title);
        
        // System status panel - hide on small mobile
        const statusPanel = document.createElement('div');
        statusPanel.style.backgroundColor = 'rgba(0,0,0,0.7)';
        statusPanel.style.border = '2px solid #FF6600';
        statusPanel.style.padding = '6px 15px';
        statusPanel.style.marginLeft = isMobile ? '0' : '20px';
        statusPanel.style.marginTop = isMobile ? '5px' : '0';
        statusPanel.style.width = isMobile ? 'calc(100% - 32px)' : 'auto'; // Full width minus padding and border
        
        // Hide on very small screens
        if (isMobile && window.innerWidth < 360) {
            statusPanel.style.display = 'none';
        }
        
        const status = document.createElement('div');
        status.textContent = 'FEED STATUS: ACTIVE';
        status.style.fontSize = isMobile ? '12px' : '14px';
        status.style.letterSpacing = '1px';
        status.style.textAlign = isMobile ? 'center' : 'left';
        
        statusPanel.appendChild(status);
        
        header.appendChild(titlePanel);
        header.appendChild(statusPanel);
        
        // Date display in top right - smaller on mobile
        const datePanel = document.createElement('div');
        datePanel.style.position = 'absolute';
        datePanel.style.top = '0px';
        datePanel.style.right = '0px';
        datePanel.style.backgroundColor = 'rgba(0,0,0,0.7)';
        datePanel.style.border = '1px solid #00FFFF';
        datePanel.style.padding = isMobile ? '3px 5px' : '5px 10px';
        datePanel.style.color = '#00FFFF';
        datePanel.style.fontSize = isMobile ? '9px' : '11px';
        
        // Hide on very small screens
        if (isMobile && window.innerWidth < 360) {
            datePanel.style.display = 'none';
        }
        
        const date = document.createElement('div');
        date.textContent = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
        datePanel.appendChild(date);
        
        // Create content area - adjust padding for mobile
        const content = document.createElement('div');
        content.style.padding = isMobile ? '0 15px' : '0 80px';
        content.style.maxHeight = isMobile ? 'calc(100% - 180px)' : 'calc(100% - 230px)';
        content.style.overflowY = 'auto';
        content.style.webkitOverflowScrolling = 'touch'; // Smooth scrolling on iOS
        content.style.position = 'relative';
        content.style.scrollbarWidth = 'thin';
        content.style.scrollbarColor = '#FF6600 #000';
        
        // Enable touch scrolling explicitly
        content.style.touchAction = 'pan-y';
        
        // Custom scrollbar for Webkit browsers
        content.style.cssText += `
            ::-webkit-scrollbar {
                width: 8px;
            }
            
            ::-webkit-scrollbar-track {
                background: #000; 
            }
            
            ::-webkit-scrollbar-thumb {
                background: #FF6600; 
            }
        `;
        
        // Create table for posts
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'separate';
        table.style.borderSpacing = '0 8px';
        
        // Create table header - simplified for mobile
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Simplified header for mobile
        const headers = isMobile ? ['#', 'STORIES'] : ['SEC.', 'DATA ENTRY', 'TIME INDEX'];
        headers.forEach((headerText, index) => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.style.padding = isMobile ? '5px' : '8px 15px';
            th.style.textAlign = 'left';
            th.style.color = '#00FFFF';
            th.style.fontSize = isMobile ? '12px' : '14px';
            th.style.fontWeight = 'normal';
            th.style.letterSpacing = isMobile ? '0px' : '1px';
            
            if (isMobile) {
                // Adjust widths for mobile
                if (index === 0) {
                    th.style.width = '30px'; // Narrow column for numbers
                }
            } else {
                if (index === 0) {
                    th.style.width = '10%';
                } else if (index === 2) {
                    th.style.width = '20%';
                }
            }
            
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        tbody.id = 'news-table-body';
        table.appendChild(tbody);
        
        content.appendChild(table);
        
        // Add loading indicator
        const loading = document.createElement('div');
        loading.id = 'news-loading';
        loading.textContent = 'ESTABLISHING DATA CONNECTION...';
        loading.style.textAlign = 'center';
        loading.style.padding = isMobile ? '20px' : '30px';
        loading.style.fontSize = isMobile ? '14px' : '18px';
        loading.style.color = '#FF6600';
        loading.style.letterSpacing = isMobile ? '1px' : '2px';
        loading.style.animation = 'pulse 1.5s infinite';
        
        // Add loading animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        content.appendChild(loading);
        
        // Create footer with exit button - adjust for mobile
        const footer = document.createElement('div');
        footer.style.position = 'absolute';
        footer.style.bottom = isMobile ? '10px' : '20px';
        footer.style.left = isMobile ? '50%' : '20px';
        footer.style.transform = isMobile ? 'translateX(-50%)' : 'none'; // Center on mobile
        footer.style.padding = '0';
        footer.style.width = isMobile ? '100%' : 'auto';
        footer.style.textAlign = isMobile ? 'center' : 'left';
        
        const exitButton = document.createElement('button');
        exitButton.textContent = isMobile ? '🐼 EXIT' : '🐼 RETURN TO GAME';
        exitButton.style.padding = isMobile ? '10px 30px' : '8px 20px';
        exitButton.style.backgroundColor = 'transparent';
        exitButton.style.color = '#FF6600';
        exitButton.style.border = '2px solid #FF6600';
        exitButton.style.cursor = 'pointer';
        exitButton.style.fontSize = isMobile ? '18px' : '16px'; // Larger on mobile for touch
        exitButton.style.fontFamily = 'monospace';
        exitButton.style.letterSpacing = isMobile ? '1px' : '2px';
        exitButton.style.boxShadow = '0 0 15px rgba(255, 102, 0, 0.7)';
        exitButton.style.transition = 'all 0.3s ease';
        
        // Add touch-specific hover effect
        if (isMobile) {
            exitButton.addEventListener('touchstart', () => {
                exitButton.style.backgroundColor = 'rgba(255, 102, 0, 0.2)';
                exitButton.style.boxShadow = '0 0 20px rgba(255, 102, 0, 0.9)';
            });
            
            exitButton.addEventListener('touchend', () => {
                exitButton.style.backgroundColor = 'transparent';
                exitButton.style.boxShadow = '0 0 15px rgba(255, 102, 0, 0.7)';
            });
        } else {
            exitButton.onmouseover = () => {
                exitButton.style.backgroundColor = 'rgba(255, 102, 0, 0.2)';
                exitButton.style.boxShadow = '0 0 20px rgba(255, 102, 0, 0.9)';
            };
            exitButton.onmouseout = () => {
                exitButton.style.backgroundColor = 'transparent';
                exitButton.style.boxShadow = '0 0 15px rgba(255, 102, 0, 0.7)';
            };
        }
        
        exitButton.onclick = () => this.hideOverlay();
        
        footer.appendChild(exitButton);
                
        // Assemble overlay
        overlay.appendChild(sideMarkers);
        overlay.appendChild(borderLine);
        overlay.appendChild(header);
        overlay.appendChild(datePanel);
        overlay.appendChild(content);
        overlay.appendChild(footer);
        
        // Add to document
        document.body.appendChild(overlay);
        
        this.overlay = overlay;
    }
    
    async fetchHackerNews() {
        try {
            // Get top story IDs
            const topStoriesResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
            const storyIds = await topStoriesResponse.json();
            
            // Get details for top 20 stories
            const top10Ids = storyIds.slice(0, 20);
            const storyPromises = top10Ids.map(id => 
                fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
                    .then(response => response.json())
            );
            
            const stories = await Promise.all(storyPromises);
            return stories;
        } catch (error) {
            console.error('Error fetching Hacker News:', error);
            return [];
        }
    }
    
    async showOverlay() {
        if (!this.overlay) {
            this.createOverlay();
        }
        
        // Show overlay
        this.overlay.style.display = 'block';
        
        // Show loading indicator
        document.getElementById('news-loading').style.display = 'block';
        document.getElementById('news-table-body').innerHTML = '';
        
        // Fetch news
        const stories = await this.fetchHackerNews();
        
        // Hide loading indicator
        document.getElementById('news-loading').style.display = 'none';
        
        // Populate table
        const tbody = document.getElementById('news-table-body');
        
        // Check if mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        stories.forEach((story, index) => {
            const row = document.createElement('tr');
            
            if (isMobile) {
                // MOBILE LAYOUT - Simplified for smaller screens
                
                // Create the story container panel (mobile optimized)
                const storyContainer = document.createElement('td');
                storyContainer.colSpan = 2; // Just 2 columns on mobile
                storyContainer.style.padding = '0';
                
                const storyPanel = document.createElement('div');
                storyPanel.style.display = 'flex';
                storyPanel.style.backgroundColor = 'rgba(0,0,0,0.7)';
                storyPanel.style.border = '2px solid #FF6600';
                storyPanel.style.borderLeft = '5px solid #FF6600'; // Thinner on mobile
                storyPanel.style.marginBottom = '8px';
                storyPanel.style.boxShadow = '0 0 10px rgba(255, 102, 0, 0.5)';
                
                // Number column (simplified)
                const numContainer = document.createElement('div');
                numContainer.style.width = '30px';
                numContainer.style.textAlign = 'center';
                numContainer.style.padding = '10px 5px';
                numContainer.style.fontSize = '14px';
                numContainer.style.color = '#FF6600';
                numContainer.style.fontWeight = 'bold';
                numContainer.textContent = `${index + 1}`;
                
                // Story content
                const contentContainer = document.createElement('div');
                contentContainer.style.flex = '1';
                contentContainer.style.padding = '10px 5px 10px 5px';
                contentContainer.style.display = 'flex';
                contentContainer.style.flexDirection = 'column';
                
                // Title with link - LARGER touch targets
                const link = document.createElement('a');
                link.textContent = story.title;
                link.href = story.url || `https://news.ycombinator.com/item?id=${story.id}`;
                link.target = '_blank';
                link.style.color = '#ffd166';
                link.style.textDecoration = 'none';
                link.style.fontSize = '14px';
                link.style.fontWeight = 'bold';
                link.style.display = 'block';
                link.style.marginBottom = '5px';
                link.style.padding = '5px 0'; // Larger tap target
                
                // Add time info in a smaller font below the title
                const timeInfo = document.createElement('div');
                const postTime = new Date(story.time * 1000);
                const now = new Date();
                const diffInHours = Math.floor((now - postTime) / (1000 * 60 * 60));
                
                if (diffInHours < 1) {
                    timeInfo.textContent = '< 1 hour ago';
                } else if (diffInHours === 1) {
                    timeInfo.textContent = '1 hour ago';
                } else if (diffInHours < 24) {
                    timeInfo.textContent = `${diffInHours} hours ago`;
                } else {
                    const days = Math.floor(diffInHours / 24);
                    timeInfo.textContent = `${days} day${days > 1 ? 's' : ''} ago`;
                }
                
                timeInfo.style.color = '#00FFFF';
                timeInfo.style.fontSize = '10px';
                
                contentContainer.appendChild(link);
                contentContainer.appendChild(timeInfo);
                
                // Assemble the mobile panel
                storyPanel.appendChild(numContainer);
                storyPanel.appendChild(contentContainer);
                
                storyContainer.appendChild(storyPanel);
                row.appendChild(storyContainer);
                
            } else {
                // DESKTOP LAYOUT - Original with more details
                
                // Create the story container panel (Evangelion style)
                const storyContainer = document.createElement('td');
                storyContainer.colSpan = 3;
                storyContainer.style.padding = '0';
                storyContainer.style.position = 'relative';
                
                const storyPanel = document.createElement('div');
                storyPanel.style.display = 'flex';
                storyPanel.style.alignItems = 'center';
                storyPanel.style.backgroundColor = 'rgba(0,0,0,0.7)';
                storyPanel.style.border = '2px solid #FF6600';
                storyPanel.style.borderLeft = '10px solid #FF6600';
                storyPanel.style.marginBottom = '8px';
                storyPanel.style.transition = 'all 0.3s ease';
                
                // Hover effect for the entire panel
                storyPanel.onmouseover = () => {
                    storyPanel.style.boxShadow = '0 0 15px rgba(255, 102, 0, 0.8)';
                    storyPanel.style.backgroundColor = 'rgba(20,10,0,0.8)';
                };
                storyPanel.onmouseout = () => {
                    storyPanel.style.boxShadow = '0 0 10px rgba(255, 102, 0, 0.5)';
                    storyPanel.style.backgroundColor = 'rgba(0,0,0,0.7)';
                };
                
                // Rank column with Evangelion style section label
                const rankContainer = document.createElement('div');
                rankContainer.style.width = '80px';
                rankContainer.style.textAlign = 'center';
                rankContainer.style.padding = '12px 5px';
                
                const rankLabel = document.createElement('div');
                rankLabel.textContent = `SEC.${index + 1}`;
                rankLabel.style.color = '#FF6600';
                rankLabel.style.fontSize = '16px';
                rankLabel.style.fontWeight = 'bold';
                
                const rankMarker = document.createElement('div');
                rankMarker.style.width = '50px';
                rankMarker.style.height = '5px';
                rankMarker.style.backgroundColor = '#FF6600';
                rankMarker.style.margin = '5px auto';
                
                rankContainer.appendChild(rankLabel);
                rankContainer.appendChild(rankMarker);
                
                // Title column with link
                const titleContainer = document.createElement('div');
                titleContainer.style.flex = '1';
                titleContainer.style.padding = '12px 15px';
                
                const link = document.createElement('a');
                link.textContent = story.title;
                link.href = story.url || `https://news.ycombinator.com/item?id=${story.id}`;
                link.target = '_blank';
                link.style.color = '#ffd166';
                link.style.textDecoration = 'none';
                link.style.fontSize = '14px';
                link.style.fontWeight = 'bold';
                link.style.display = 'block';
                link.style.letterSpacing = '0.5px';
                link.onmouseover = () => { 
                    link.style.textDecoration = 'underline'; 
                    link.style.textShadow = '0 0 5px rgba(255, 102, 0, 0.8)';
                };
                link.onmouseout = () => { 
                    link.style.textDecoration = 'none'; 
                    link.style.textShadow = 'none';
                };
                
                titleContainer.appendChild(link);
                
                // Posted time with Evangelion style
                const timeContainer = document.createElement('div');
                timeContainer.style.width = '150px';
                timeContainer.style.padding = '12px 20px 12px 0';
                timeContainer.style.textAlign = 'right';
                
                // Convert timestamp to relative time
                const postTime = new Date(story.time * 1000);
                const now = new Date();
                const diffInHours = Math.floor((now - postTime) / (1000 * 60 * 60));
                
                const timeInfo = document.createElement('div');
                
                if (diffInHours < 1) {
                    timeInfo.textContent = 'T-MINUS: <1 HOUR';
                } else if (diffInHours === 1) {
                    timeInfo.textContent = 'T-MINUS: 1 HOUR';
                } else if (diffInHours < 24) {
                    timeInfo.textContent = `T-MINUS: ${diffInHours} HOURS`;
                } else {
                    const days = Math.floor(diffInHours / 24);
                    timeInfo.textContent = `T-MINUS: ${days} DAY${days > 1 ? 'S' : ''}`;
                }
                
                timeInfo.style.color = '#00FFFF';
                timeInfo.style.fontSize = '12px';
                timeInfo.style.letterSpacing = '1px';
                
                timeContainer.appendChild(timeInfo);
                
                // Assemble the story panel
                storyPanel.appendChild(rankContainer);
                storyPanel.appendChild(titleContainer);
                storyPanel.appendChild(timeContainer);
                
                storyContainer.appendChild(storyPanel);
                row.appendChild(storyContainer);
            }
            
            tbody.appendChild(row);
        });
        
        // Handle error case when no stories are loaded
        if (stories.length === 0) {
            // Show error message if no stories loaded
            const errorRow = document.createElement('tr');
            const errorContainer = document.createElement('td');
            errorContainer.colSpan = isMobile ? 2 : 3;
            
            const errorPanel = document.createElement('div');
            errorPanel.style.backgroundColor = 'rgba(40,0,0,0.7)';
            errorPanel.style.border = '2px solid #FF0000';
            errorPanel.style.padding = isMobile ? '15px' : '20px';
            errorPanel.style.textAlign = 'center';
            errorPanel.style.margin = '20px 0';
            errorPanel.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.7)';
            
            const errorTitle = document.createElement('div');
            errorTitle.textContent = 'CONNECTION ERROR';
            errorTitle.style.color = '#FF0000';
            errorTitle.style.fontSize = isMobile ? '16px' : '18px';
            errorTitle.style.fontWeight = 'bold';
            errorTitle.style.letterSpacing = isMobile ? '1px' : '2px';
            errorTitle.style.marginBottom = '10px';
            
            const errorMessage = document.createElement('div');
            errorMessage.textContent = isMobile ? 'DATA FEED UNAVAILABLE' : 'DATA FEED UNAVAILABLE. RETRY SYSTEM INITIALIZATION.';
            errorMessage.style.color = '#FF6600';
            errorMessage.style.fontSize = isMobile ? '12px' : '14px';
            errorMessage.style.letterSpacing = '1px';
            
            errorPanel.appendChild(errorTitle);
            errorPanel.appendChild(errorMessage);
            errorContainer.appendChild(errorPanel);
            errorRow.appendChild(errorContainer);
            
            tbody.appendChild(errorRow);
        }
        
        // Add event listener to enhance touch scrolling for mobile
        if (isMobile) {
            const contentArea = this.overlay.querySelector('div[style*="overflow-y: auto"]');
            if (contentArea) {
                let startY = 0;
                let startScrollTop = 0;
                let touchInProgress = false;
                
                contentArea.addEventListener('touchstart', (e) => {
                    startY = e.touches[0].pageY;
                    startScrollTop = contentArea.scrollTop;
                    touchInProgress = true;
                }, { passive: true });
                
                contentArea.addEventListener('touchmove', (e) => {
                    if (!touchInProgress) return;
                    
                    const deltaY = startY - e.touches[0].pageY;
                    contentArea.scrollTop = startScrollTop + deltaY;
                }, { passive: true });
                
                contentArea.addEventListener('touchend', () => {
                    touchInProgress = false;
                }, { passive: true });
            }
        }
    }
    
    hideOverlay() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
        
        // Resume the game
        if (window.gameState) {
            // Only restart animation if it was cancelled
            if (!window.gameState.animationId) {
                const now = performance.now();
                window.gameState.animationId = requestAnimationFrame(window.animate);
                window.lastTime = now; // Update lastTime to avoid large deltaTime
            }
            
            window.gameState.gamePaused = false;
            
            // End reading state
            this.reading = false;
            
            // Start the activation cooldown (5 seconds)
            this.startActivationCooldown();
        }
    }
    
    startCooldown() {
        this.cooldown = true;
        
        setTimeout(() => {
            this.cooldown = false;
        }, this.cooldownTime);
    }
    
    startActivationCooldown() {
        // Add visual indicator to newspaper that it's in cooldown
        if (this.glow) {
            this.glow.material.color.set(0x888888); // Gray during cooldown
            this.glow.material.emissive.set(0x444444);
        }
        
        this.activeCooldown = true;
        
        // Reset glow after cooldown
        setTimeout(() => {
            this.activeCooldown = false;
            // Reset glow color
            if (this.glow) {
                this.glow.material.color.set(0xFFFFAA);
                this.glow.material.emissive.set(0xFFFFAA);
            }
        }, 5000); // 5 second cooldown
    }

    destroy() {
        if (this.object && this.object.parent) {
            this.scene.remove(this.object);
        }
        
        // Remove overlay from DOM if it exists
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
    }
}

// Export for use in game.js
window.Newspaper = Newspaper;