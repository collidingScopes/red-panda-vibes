class GrassSystem {
    constructor(scene, player, getTerrainHeightFunc) {
        this.scene = scene;
        this.player = player;
        this.getTerrainHeight = getTerrainHeightFunc;
        this.grassMesh = null;
        this.clock = new THREE.Clock();
        this.instanceNumber = isMobile ? 150000 : 200000;
        this.grassArea = 400; // Size of area covered by grass
        this.maxGrassHeight = 1.0; // Maximum terrain height for grass to appear
        
        // View distance parameters
        this.renderDistance = 120; // Distance from player to render grass (adjust as needed)
        this.cullingDistance = 170; // Distance at which grass fades out (slightly higher than renderDistance)
        
        // Storage for all potential grass positions
        this.allGrassPositions = [];
        this.grassMatrices = [];
        this.activeInstances = 0;
        this.lastUpdatePosition = new THREE.Vector3();
        this.updateFrequency = 0.2; // Update visible grass every X seconds
        this.timeSinceLastUpdate = 0;
        
        // Get current palette from global variable
        this.currentPalette = window.selectedPalette || selectedPalette;
        
        this.initialize();
    }
    
    initialize() {
        // Convert hex palette colors to vec3 format for shader
        const paletteColors = this.getPaletteColorVectors();
        
        // Create grass shader material with distance-based fading
        const vertexShader = `
            varying vec2 vUv;
            varying float vDistance;
            uniform float time;
            uniform vec3 playerPosition;
            uniform float cullingDistance;
            
            void main() {
                vUv = uv;
                
                // VERTEX POSITION
                vec4 mvPosition = vec4(position, 1.0);
                #ifdef USE_INSTANCING
                    mvPosition = instanceMatrix * mvPosition;
                #endif
                
                // Calculate distance to player for fading
                vDistance = distance(mvPosition.xyz, playerPosition);
                
                // DISPLACEMENT
                // Wind effect, stronger on blade tips
                float dispPower = 1.0 - cos(uv.y * 3.1416 / 2.0);
                
                // Use different frequencies for more natural movement
                float displacement = sin(mvPosition.z + time * 5.0) * (0.1 * dispPower);
                displacement += cos(mvPosition.x + time * 3.0) * (0.05 * dispPower);
                mvPosition.z += displacement;
                
                vec4 modelViewPosition = modelViewMatrix * mvPosition;
                gl_Position = projectionMatrix * modelViewPosition;
            }
        `;
        
        const fragmentShader = `
            varying vec2 vUv;
            varying float vDistance;
            uniform vec3 colorBottom;
            uniform vec3 colorTop;
            uniform float cullingDistance;
            
            void main() {
                // Interpolate between bottom and top color based on blade height
                vec3 finalColor = mix(colorBottom, colorTop, vUv.y);
                float clarity = (vUv.y * 0.5) + 0.5;
                
                // Calculate alpha based on distance from player
                float alpha = 1.0 - smoothstep(cullingDistance - 30.0, cullingDistance, vDistance);
                
                gl_FragColor = vec4(finalColor * clarity, alpha);
            }
        `;
        
        const uniforms = {
            time: { value: 0 },
            playerPosition: { value: new THREE.Vector3(0, 0, 0) },
            cullingDistance: { value: this.cullingDistance },
            colorBottom: { value: new THREE.Vector3(paletteColors[0].x, paletteColors[0].y, paletteColors[0].z) },
            colorTop: { value: new THREE.Vector3(paletteColors[1].x, paletteColors[1].y, paletteColors[1].z) }
        };
        
        const leavesMaterial = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms,
            side: THREE.DoubleSide,
            transparent: true
        });
        
        // Create grass geometry - thin blades
        const geometry = new THREE.PlaneGeometry(0.1, 1, 1, 4);
        geometry.translate(0, 0.5, 0); // Move grass blade geometry lowest point to 0
        
        // Create instanced mesh with enough instances for the view area
        this.grassMesh = new THREE.InstancedMesh(geometry, leavesMaterial, this.instanceNumber);
        this.scene.add(this.grassMesh);
        
        // Generate all potential grass positions
        this.generateGrassPositions();
        
        // Initial update of visible grass
        this.updateVisibleGrass();
    }
    
    // Convert hex palette colors to normalized RGB vectors for shader
    getPaletteColorVectors() {
        const vectors = [];
        
        // Select 2-3 colors from the palette that work well for grass
        // Use the first and second colors from the palette, usually good for ground/foliage
        const baseColors = [
            this.currentPalette[1], // Darker color for bottom of grass
            this.currentPalette[2]  // Lighter color for top of grass
        ];
        
        baseColors.forEach(colorHex => {
            // Convert hex color to normalized RGB values
            const color = new THREE.Color(colorHex);
            vectors.push(new THREE.Vector3(color.r, color.g, color.b));
        });
        
        return vectors;
    }
    
    // Pre-generate all possible grass positions across the terrain
    generateGrassPositions() {
        console.log("Generating grass positions...");
        const dummy = new THREE.Object3D();
        const halfGrassArea = this.grassArea / 2;
        
        // We'll generate more positions than we'll ever show at once
        const totalPositions = this.instanceNumber * 4;
        
        for (let i = 0; i < totalPositions; i++) {
            // Generate random position within grass area
            const x = (Math.random() * this.grassArea) - halfGrassArea;
            const z = (Math.random() * this.grassArea) - halfGrassArea;
            
            // Get terrain height at this position
            const terrainHeight = this.getTerrainHeight(x, z);
            
            // Only include positions where terrain height is below threshold
            if (terrainHeight <= this.maxGrassHeight) {
                // Position grass on terrain
                dummy.position.set(x, terrainHeight, z);
                
                // Random scale variation for natural look
                const scale = 0.2 + Math.random() * 1.6;
                dummy.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);
                
                // Random rotation for variation
                dummy.rotation.y = Math.random() * Math.PI * 2;
                
                // Store position and matrix
                dummy.updateMatrix();
                this.allGrassPositions.push(new THREE.Vector3(x, terrainHeight, z));
                this.grassMatrices.push(dummy.matrix.clone());
            }
            
            // Stop if we have enough positions
            if (this.allGrassPositions.length >= this.instanceNumber * 3) {
                break;
            }
        }
        
        console.log(`Generated ${this.allGrassPositions.length} potential grass positions`);
    }
    
    // Update which grass blades are visible based on player position
    updateVisibleGrass() {
        // Update player position in shader
        if (this.grassMesh && this.grassMesh.material) {
            this.grassMesh.material.uniforms.playerPosition.value.copy(this.player.position);
        }
        
        // Track when player has moved enough to warrant a full update
        const playerMoved = this.player.position.distanceTo(this.lastUpdatePosition) > 5;
        
        // Only do a full visibility update when necessary
        if (playerMoved) {
            // Copy current player position
            this.lastUpdatePosition.copy(this.player.position);
            
            // Reset active instance count
            this.activeInstances = 0;
            
            // Update visible grass based on distance to player
            const squaredRenderDistance = this.renderDistance * this.renderDistance;
            
            // Go through all potential positions and select those within render distance
            for (let i = 0; i < this.allGrassPositions.length; i++) {
                const position = this.allGrassPositions[i];
                
                // Calculate squared distance (faster than using .distanceTo())
                const dx = position.x - this.player.position.x;
                const dz = position.z - this.player.position.z;
                const squaredDist = dx * dx + dz * dz;
                
                if (squaredDist <= squaredRenderDistance) {
                    // Within render distance, add to visible instances
                    this.grassMesh.setMatrixAt(this.activeInstances, this.grassMatrices[i]);
                    this.activeInstances++;
                    
                    // Stop if we've reached maximum instance count
                    if (this.activeInstances >= this.instanceNumber) {
                        break;
                    }
                }
            }
            
            // Update instance count and matrices
            this.grassMesh.count = this.activeInstances;
            this.grassMesh.instanceMatrix.needsUpdate = true;
            
            console.log(`Rendering ${this.activeInstances} grass blades near player`);
        }
    }
    
    // Method to update colors when palette changes
    updateColors(newPalette) {
        if (this.grassMesh && this.grassMesh.material && this.grassMesh.material.uniforms) {
            this.currentPalette = newPalette;
            const paletteColors = this.getPaletteColorVectors();
            
            // Update shader uniforms with new colors
            this.grassMesh.material.uniforms.colorBottom.value = paletteColors[0];
            this.grassMesh.material.uniforms.colorTop.value = paletteColors[1];
            this.grassMesh.material.uniformsNeedUpdate = true;
        }
    }
    
    update(deltaTime) {
        if (this.grassMesh && this.grassMesh.material && this.grassMesh.material.uniforms) {
            // Update time uniform for wind animation
            this.grassMesh.material.uniforms.time.value += deltaTime;
            
            // Update player position in shader for distance calculations
            this.grassMesh.material.uniforms.playerPosition.value.copy(this.player.position);
            
            this.grassMesh.material.uniformsNeedUpdate = true;
            
            // Check if palette has changed by comparing with global selectedPalette
            if (window.selectedPalette && window.selectedPalette !== this.currentPalette) {
                this.updateColors(window.selectedPalette);
            }
            
            // Only update visible grass occasionally to improve performance
            this.timeSinceLastUpdate += deltaTime;
            if (this.timeSinceLastUpdate >= this.updateFrequency) {
                this.updateVisibleGrass();
                this.timeSinceLastUpdate = 0;
            }
        }
    }
    
    dispose() {
        if (this.grassMesh) {
            this.scene.remove(this.grassMesh);
            this.grassMesh.geometry.dispose();
            this.grassMesh.material.dispose();
            this.grassMesh = null;
        }
        
        // Clear arrays
        this.allGrassPositions = [];
        this.grassMatrices = [];
    }
}