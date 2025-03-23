class SnowSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        
        // Snow settings
        this.COUNT = 900;      // Number of snowflakes
        this.AREA_SIZE = 80;    // Area around player to show snow
        this.FALL_SPEED = 3;    // How fast snow falls
        this.DRIFT_SPEED = 0.6; // How much snow drifts horizontally
        this.MIN_SIZE = 0.01;    // Minimum snowflake size
        this.MAX_SIZE = 0.01;    // Maximum snowflake size

        this.initialize();
    }
    
    initialize() {
        // Create geometry for snow particles
        const positions = new Float32Array(this.COUNT * 3);
        const sizes = new Float32Array(this.COUNT);
        
        for (let i = 0; i < this.COUNT; i++) {
            positions[i * 3] = (Math.random() - 0.5) * this.AREA_SIZE;     // x
            positions[i * 3 + 1] = Math.random() * this.AREA_SIZE;         // y (height)
            positions[i * 3 + 2] = (Math.random() - 0.5) * this.AREA_SIZE; // z
            
            sizes[i] = this.MIN_SIZE + Math.random() * (this.MAX_SIZE - this.MIN_SIZE);
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.2,
            opacity: 0.65,
            transparent: true,
            sizeAttenuation: true,
            depthWrite: false,
            alphaTest: 0.1
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
        
        this.timeOffsets = new Float32Array(this.COUNT);
        for (let i = 0; i < this.COUNT; i++) {
            this.timeOffsets[i] = Math.random() * Math.PI * 2;
        }
        
        console.log("Snow system initialized with", this.COUNT, "particles");
    }
    
    update(deltaTime) {
        if (!this.particles) return;
        
        const playerPos = this.player.position;
        const positions = this.particles.geometry.attributes.position.array;
        
        for (let i = 0; i < this.COUNT; i++) {
            const idx = i * 3;
            
            // Move snowflake down
            positions[idx + 1] -= this.FALL_SPEED * deltaTime;
            
            // Add slight horizontal drift
            const timeOffset = this.timeOffsets[i];
            positions[idx] += Math.sin(timeOffset + performance.now() * 0.001) * this.DRIFT_SPEED * deltaTime;
            positions[idx + 2] += Math.cos(timeOffset + performance.now() * 0.001) * this.DRIFT_SPEED * deltaTime;
            
            // Reset snowflake if it falls below the terrain
            const snowflakeX = positions[idx] + playerPos.x;
            const snowflakeZ = positions[idx + 2] + playerPos.z;
            const terrainHeight = getTerrainHeight(snowflakeX, snowflakeZ);
            
            if (positions[idx + 1] + playerPos.y < terrainHeight + 0.5) {
                positions[idx] = (Math.random() - 0.5) * this.AREA_SIZE;
                positions[idx + 1] = this.AREA_SIZE;
                positions[idx + 2] = (Math.random() - 0.5) * this.AREA_SIZE;
            }
            
            // If snowflake is too far from player, reset it
            if (Math.abs(positions[idx]) > this.AREA_SIZE/2 || 
                Math.abs(positions[idx + 2]) > this.AREA_SIZE/2) {
                positions[idx] = (Math.random() - 0.5) * this.AREA_SIZE;
                positions[idx + 1] = Math.random() * this.AREA_SIZE; 
                positions[idx + 2] = (Math.random() - 0.5) * this.AREA_SIZE;
            }
        }
        
        // Update particle system position to center around player
        this.particles.position.copy(playerPos);
        
        // Mark attributes as needing update
        this.particles.geometry.attributes.position.needsUpdate = true;
    }
    
    dispose() {
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
            this.particles = null;
        }
    }
}