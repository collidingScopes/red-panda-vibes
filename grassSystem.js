class GrassSystem {
    constructor(scene, player, getTerrainHeightFunc) {
        this.scene = scene;
        this.player = player;
        this.getTerrainHeight = getTerrainHeightFunc;
        this.grassMesh = null;
        this.clock = new THREE.Clock();
        this.instanceNumber = isMobile ? 200000 : 250000;
        this.grassArea = 400; // Size of area covered by grass
        this.maxGrassHeight = 1.0; // Maximum terrain height for grass to appear
        
        // Storage for all potential grass positions
        this.allGrassPositions = [];
        this.grassMatrices = [];
        this.activeInstances = 0;
        
        // Clumping parameters
        this.clusterCount = 80; // Number of cluster centers
        this.clusterRadius = 20; // Maximum radius of each cluster
        this.clusterDensityFalloff = 0.95; // How quickly density falls off from cluster center (0-1)
        this.noiseScale = 0.03; // Scale of the noise function for additional variation
        this.clusterCenters = []; // Will store cluster center positions
        
        // Get current palette from global variable
        this.currentPalette = window.selectedPalette || selectedPalette;
        
        this.initialize();
    }
    
    initialize() {
        // Convert hex palette colors to vec3 format for shader
        const paletteColors = this.getPaletteColorVectors();
        
        // Create grass shader material without distance-based fading
        const vertexShader = `
            varying vec2 vUv;
            varying float vHeight;
            uniform float time;
            uniform vec3 playerPosition;
            
            void main() {
                vUv = uv;
                
                // VERTEX POSITION
                vec4 mvPosition = vec4(position, 1.0);
                #ifdef USE_INSTANCING
                    mvPosition = instanceMatrix * mvPosition;
                #endif
                
                // Store blade height for animation variation based on instance
                vHeight = mvPosition.y;
                
                // DISPLACEMENT
                // Wind effect, stronger on blade tips
                float dispPower = 1.0 - cos(uv.y * 3.1416 / 2.0);
                
                // Use different frequencies for more natural movement
                // Add instance-based variation for less uniform movement
                float offset = float(gl_InstanceID) * 0.05;
                float displacement = sin(mvPosition.z + time * (4.0 + sin(offset)) + offset) * (0.1 * dispPower);
                displacement += cos(mvPosition.x + time * (3.0 + cos(offset * 0.5)) + offset) * (0.05 * dispPower);
                
                // Stronger movement for taller blades
                displacement *= (0.8 + vHeight * 0.5);
                
                mvPosition.z += displacement;
                mvPosition.x += displacement * 0.3;
                
                vec4 modelViewPosition = modelViewMatrix * mvPosition;
                gl_Position = projectionMatrix * modelViewPosition;
            }
        `;
        
        const fragmentShader = `
            varying vec2 vUv;
            varying float vHeight;
            uniform vec3 colorBottom;
            uniform vec3 colorTop;
            
            void main() {
                // Interpolate between bottom and top color based on blade height
                vec3 finalColor = mix(colorBottom, colorTop, vUv.y);
                
                // Add slight variation to color based on instance height
                float colorVariation = vHeight * 0.2;
                finalColor = mix(finalColor, finalColor * (1.0 + colorVariation), 0.2);
                
                float clarity = (vUv.y * 0.5) + 0.5;
                
                gl_FragColor = vec4(finalColor * clarity, 1.0);
            }
        `;
        
        const uniforms = {
            time: { value: 0 },
            playerPosition: { value: new THREE.Vector3(0, 0, 0) },
            colorBottom: { value: new THREE.Vector3(paletteColors[0].x, paletteColors[0].y, paletteColors[0].z) },
            colorTop: { value: new THREE.Vector3(paletteColors[1].x, paletteColors[1].y, paletteColors[1].z) }
        };
        
        const leavesMaterial = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms,
            side: THREE.DoubleSide,
            transparent: false
        });
        
        // Create grass geometry - thin blades
        const geometry = new THREE.PlaneGeometry(0.1, 1, 1, 4);
        geometry.translate(0, 0.5, 0); // Move grass blade geometry lowest point to 0
        
        // Create instanced mesh with enough instances for the view area
        this.grassMesh = new THREE.InstancedMesh(geometry, leavesMaterial, this.instanceNumber);
        this.scene.add(this.grassMesh);
        
        // Generate all potential grass positions with clumping
        this.generateClusterCenters();
        this.generateGrassPositions();
        
        // Set all grass instances
        this.setAllGrassInstances();
    }
    
    // Generate random cluster centers across the terrain
    generateClusterCenters() {
        const halfGrassArea = this.grassArea / 2;
        
        for (let i = 0; i < this.clusterCount; i++) {
            // Generate random position within grass area
            const x = (Math.random() * this.grassArea) - halfGrassArea;
            const z = (Math.random() * this.grassArea) - halfGrassArea;
            
            // Get terrain height at this position
            const terrainHeight = this.getTerrainHeight(x, z);
            
            // Only place clusters below the max height threshold
            if (terrainHeight <= this.maxGrassHeight) {
                // Store cluster center
                this.clusterCenters.push(new THREE.Vector3(x, terrainHeight, z));
            }
        }
        
        console.log(`Generated ${this.clusterCenters.length} grass cluster centers`);
    }
    
    // Simplex noise function (simplified for this example - you might want to use a proper noise library)
    noise(x, z) {
        // Simple pseudo-noise function
        return 0.5 * (Math.sin(x * 13.74 + z * 8.91) + Math.cos(x * 7.23 - z * 4.32));
    }
    
    // Calculate grass density at a given position based on clusters
    getGrassDensityAtPosition(x, z) {
        let closestDist = Infinity;
        let density = 0;
        
        // Find distance to closest cluster center
        for (const center of this.clusterCenters) {
            const dx = x - center.x;
            const dz = z - center.z;
            const distSq = dx * dx + dz * dz;
            
            if (distSq < closestDist) {
                closestDist = distSq;
            }
            
            // Add density contribution from this cluster
            const dist = Math.sqrt(distSq);
            if (dist < this.clusterRadius) {
                // Density falls off with distance from cluster center
                const normalizedDist = dist / this.clusterRadius;
                const clusterContribution = Math.pow(1 - normalizedDist, this.clusterDensityFalloff);
                density += clusterContribution;
            }
        }
        
        // Add noise variation to make boundaries less perfect
        const noiseValue = this.noise(x * this.noiseScale, z * this.noiseScale);
        density = density * (0.7 + noiseValue * 0.3);
        
        // Ensure density is between 0 and 1
        return Math.min(Math.max(density, 0), 1);
    }
    
    // Convert hex palette colors to normalized RGB vectors for shader
    getPaletteColorVectors() {
        const vectors = [];
        
        // Select 2-3 colors from the palette that work well for grass
        // Use the first and second colors from the palette, usually good for ground/foliage
        const baseColors = [
            this.currentPalette[2], // Darker color for bottom of grass
            this.currentPalette[4]  // Lighter color for top of grass
        ];
        
        baseColors.forEach(colorHex => {
            // Convert hex color to normalized RGB values
            const color = new THREE.Color(colorHex);
            vectors.push(new THREE.Vector3(color.r, color.g, color.b));
        });
        
        return vectors;
    }
    
    // Pre-generate all possible grass positions across the terrain with clumping
    generateGrassPositions() {
        console.log("Generating clumped grass positions...");
        const dummy = new THREE.Object3D();
        const halfGrassArea = this.grassArea / 2;
        
        // We'll generate more positions than we'll ever show at once
        const totalAttempts = this.instanceNumber * 8; // Need more attempts since many positions will have low density
        let positionsGenerated = 0;
        
        for (let i = 0; i < totalAttempts; i++) {
            // Generate random position within grass area
            const x = (Math.random() * this.grassArea) - halfGrassArea;
            const z = (Math.random() * this.grassArea) - halfGrassArea;
            
            // Get density at this position
            const density = this.getGrassDensityAtPosition(x, z);
            
            // Only place grass based on density (probabilistic)
            if (Math.random() < density) {
                // Get terrain height at this position
                const terrainHeight = this.getTerrainHeight(x, z);
                
                // Only include positions where terrain height is below threshold
                if (terrainHeight <= this.maxGrassHeight) {
                    // Position grass on terrain
                    dummy.position.set(x, terrainHeight, z);
                    
                    // Random scale variation for natural look - taller in dense areas
                    const heightFactor = 0.7 + (density * 0.6); // Taller grass in denser areas
                    const scale = (0.2 + Math.random() * 1.6) * heightFactor;
                    dummy.scale.set(
                        scale * (0.8 + Math.random() * 0.4), // Width variation
                        scale * (0.4 + Math.random() * 0.8), // Height variation
                        scale
                    );
                    
                    // Random rotation for variation
                    dummy.rotation.y = Math.random() * Math.PI * 2;
                    
                    // Store position and matrix
                    dummy.updateMatrix();
                    this.allGrassPositions.push(new THREE.Vector3(x, terrainHeight, z));
                    this.grassMatrices.push(dummy.matrix.clone());
                    
                    positionsGenerated++;
                    
                    // Stop if we have enough positions
                    if (positionsGenerated >= this.instanceNumber) {
                        break;
                    }
                }
            }
        }
        
        console.log(`Generated ${this.allGrassPositions.length} clumped grass positions`);
    }
    
    // Set all grass instances at once
    setAllGrassInstances() {
        // Use all available grass positions up to instanceNumber
        const numInstances = Math.min(this.allGrassPositions.length, this.instanceNumber);
        
        for (let i = 0; i < numInstances; i++) {
            this.grassMesh.setMatrixAt(i, this.grassMatrices[i]);
        }
        
        // Set the active instance count
        this.activeInstances = numInstances;
        this.grassMesh.count = numInstances;
        this.grassMesh.instanceMatrix.needsUpdate = true;
        
        console.log(`Rendering ${numInstances} grass blades`);
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
            
            // Update player position in shader for wind animation variation
            this.grassMesh.material.uniforms.playerPosition.value.copy(this.player.position);
            
            this.grassMesh.material.uniformsNeedUpdate = true;
            
            // Check if palette has changed by comparing with global selectedPalette
            if (window.selectedPalette && window.selectedPalette !== this.currentPalette) {
                this.updateColors(window.selectedPalette);
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
        this.clusterCenters = [];
    }
}