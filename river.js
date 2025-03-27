let waterShaderTime = 0; // Global variable for water animation

window.createRiver = function() {
    console.log("Generating smooth river with flow animation...");
    
    const riverGroup = new THREE.Group();
    const riverWidth = 15.0;
    const riverDepth = -0.7;
    const curveSegments = 80;
    const curveResolution = 80;
    const mapRadius = 225;
    
    const generateRiverPath = () => {
        const startAngle = Math.random() * Math.PI * 2;
        const startX = Math.cos(startAngle) * mapRadius * 0.9;
        const startZ = Math.sin(startAngle) * mapRadius * 0.9;
        
        const points = [new THREE.Vector3(startX, 0, startZ)];
        const endAngle = startAngle + Math.PI + (Math.random() * Math.PI/2 - Math.PI/4);
        const targetX = Math.cos(endAngle) * mapRadius * 0.9;
        const targetZ = Math.sin(endAngle) * mapRadius * 0.9;
        
        const numControlPoints = 4;
        for (let i = 1; i <= numControlPoints; i++) {
            const t = i / (numControlPoints + 1);
            const baseX = startX + (targetX - startX) * t;
            const baseZ = startZ + (targetZ - startZ) * t;
            const randomFactor = (1 - t) * 0.5;
            const offsetX = (Math.random() * 2 - 1) * mapRadius * randomFactor;
            const offsetZ = (Math.random() * 2 - 1) * mapRadius * randomFactor;
            const distFromCenter = Math.sqrt(baseX * baseX + baseZ * baseZ);
            const centerPull = Math.max(0, (distFromCenter - mapRadius * 0.4) / mapRadius);
            const toCenterX = -baseX * centerPull * 0.3;
            const toCenterZ = -baseZ * centerPull * 0.3;
            
            points.push(new THREE.Vector3(
                baseX + offsetX + toCenterX,
                0,
                baseZ + offsetZ + toCenterZ
            ));
        }
        points.push(new THREE.Vector3(targetX, 0, targetZ));
        return new THREE.CatmullRomCurve3(points, false, "centripetal", 0.5);
    };
    
    const riverCurve = generateRiverPath();
    const riverPath = [];
    
    const waterMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: waterShaderTime },
            uFlowSpeed: { value: 0.5 },
            uSwirlIntensity: { value: 0.3 },
            uBaseColor: { value: new THREE.Color(0x04e7e7) },
            uFoamColor: { value: new THREE.Color(0xba04e7) },
            uWaveHeight: { value: 0.2 },
            uNormalStrength: { value: 0.6 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            uniform float uTime;
            uniform float uWaveHeight;
            
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                float wave = sin(position.x * 4.0 + uTime) * cos(position.z * 4.0 + uTime) * uWaveHeight;
                vec3 newPosition = position + normal * wave;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uFlowSpeed;
            uniform float uSwirlIntensity;
            uniform vec3 uBaseColor;
            uniform vec3 uFoamColor;
            uniform float uNormalStrength;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            float noise(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            
            float smoothNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(noise(i + vec2(0.0, 0.0)), noise(i + vec2(1.0, 0.0)), u.x),
                    mix(noise(i + vec2(0.0, 1.0)), noise(i + vec2(1.0, 1.0)), u.x),
                    u.y
                );
            }
            
            vec2 flowDirection(vec2 uv) {
                float t = uTime * uFlowSpeed;
                vec2 flow = vec2(
                    smoothNoise(uv + vec2(t, 0.0)) - 0.5,
                    smoothNoise(uv + vec2(0.0, t)) - 0.5
                );
                return normalize(flow) * uSwirlIntensity;
            }
            
            void main() {
                vec2 flowUV = vUv + flowDirection(vUv) * uTime*3.4;
                float swirl = smoothNoise(flowUV * 4.0);
                float turbulence = smoothNoise(flowUV * 1.0 + vec2(uTime * 1.5));
                vec3 normalPerturb = vec3(
                    smoothNoise(flowUV + vec2(0.1, 0.0)) - smoothNoise(flowUV - vec2(0.1, 0.0)),
                    smoothNoise(flowUV + vec2(0.0, 0.1)) - smoothNoise(flowUV - vec2(0.0, 0.1)),
                    1.0
                );
                vec3 perturbedNormal = normalize(vNormal + normalPerturb * uNormalStrength);
                vec3 color = uBaseColor * (0.6 + swirl * 0.6);
                float foamFactor = smoothstep(0.7, 1.0, turbulence);
                color = mix(color, uFoamColor, foamFactor * 0.7);
                vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
                float diff = max(dot(perturbedNormal, lightDir), 0.0);
                color *= (0.5 + diff * 0.5);
                vec3 viewDir = normalize(-vPosition);
                vec3 reflectDir = reflect(-lightDir, perturbedNormal);
                float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
                color += vec3(spec * 0.5);
                gl_FragColor = vec4(color, 0.85);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const createRiverMesh = () => {
        const samples = riverCurve.getPoints(curveResolution);
        samples.forEach(point => {
            const terrainHeight = getTerrainHeight(point.x, point.z);
            riverPath.push({
                x: point.x,
                z: point.z,
                y: terrainHeight - riverDepth,
            });
        });
        
        const frames = riverCurve.computeFrenetFrames(curveSegments, false);
        const riverGeometry = new THREE.BufferGeometry();
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        
        for (let i = 0; i <= curveSegments; i++) {
            const t = i / curveSegments;
            const point = riverCurve.getPoint(t);
            const normal = frames.normals[Math.min(i, curveSegments - 1)];
            const binormal = frames.binormals[Math.min(i, curveSegments - 1)];
            const terrainHeight = getTerrainHeight(point.x, point.z);
            point.y = terrainHeight - riverDepth;
            
            for (let j = 0; j <= 1; j++) {
                const side = j === 0 ? -1 : 1;
                const width = riverWidth / 2;
                const vx = point.x + binormal.x * width * side;
                const vy = point.y;
                const vz = point.z + binormal.z * width * side;
                vertices.push(vx, vy, vz);
                normals.push(0, 1, 0);
                uvs.push(j, t * 10);
            }
        }
        
        const vertexCount = vertices.length / 3;
        for (let i = 0; i < vertexCount; i++) {
            const idx = i * 3 + 1;
            vertices[idx] += (Math.random() * 0.1 - 0.05);
        }
        
        for (let i = 0; i < curveSegments; i++) {
            const base = i * 2;
            indices.push(
                base, base + 1, base + 2,
                base + 2, base + 1, base + 3
            );
        }
        
        riverGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        riverGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        riverGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        riverGeometry.setIndex(indices);
        
        const riverMesh = new THREE.Mesh(riverGeometry, waterMaterial);
        riverMesh.receiveShadow = true;
        return riverMesh;
    };
    
    const riverMesh = createRiverMesh();
    riverGroup.add(riverMesh);
    addRiverRocks(riverGroup, riverCurve, riverWidth);
    scene.add(riverGroup);
    
    setupWaterAnimation(riverMesh);
    
    if (window.gameState) {
        window.gameState.riverPath = riverPath;
        window.gameState.riverWidth = riverWidth;
        window.gameState.riverCurve = riverCurve;
        window.gameState.riverMesh = riverMesh;
    }
    
    return riverGroup;
};

function setupWaterAnimation(riverMesh) {
    if (window.riverAnimationSetup) return;
    window.riverAnimationSetup = true;
    
    let lastTime = 0;
    
    const animateWater = (time) => {
        const deltaTime = (time - lastTime) / 1000;
        lastTime = time;
        
        waterShaderTime += deltaTime * 0.3;
        
        if (riverMesh && riverMesh.material && riverMesh.material.uniforms) {
            riverMesh.material.uniforms.uTime.value = waterShaderTime;
        }
        
        requestAnimationFrame(animateWater);
    };
    
    requestAnimationFrame(animateWater);
    
    const originalUpdateScene = window.updateScene || function(){};
    window.updateScene = function(deltaTime) {
        originalUpdateScene(deltaTime);
        if (riverMesh && riverMesh.material && riverMesh.material.uniforms) {
            riverMesh.material.uniforms.uTime.value = waterShaderTime;
        }
    };
}

function addRiverRocks(riverGroup, riverCurve, riverWidth) {
    const rocksCount = 25;
    const rocksGroup = new THREE.Group();
    const rockMaterials = [
        new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 }),
        new THREE.MeshStandardMaterial({ color: 0x705040, roughness: 0.8 }),
        new THREE.MeshStandardMaterial({ color: 0x606060, roughness: 0.7 })
    ];
    const rockPositions = [];
    
    for (let i = 0; i < rocksCount; i++) {
        const t = 0.1 + Math.random() * 0.8;
        const point = riverCurve.getPoint(t);
        const tangent = riverCurve.getTangent(t);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        const riverPos = (Math.random() * 0.8 - 0.4) * 0.8;
        const x = point.x + normal.x * (riverWidth / 2) * riverPos;
        const z = point.z + normal.z * (riverWidth / 2) * riverPos;
        const terrainHeight = getTerrainHeight(x, z);
        const y = terrainHeight - 0.3;
        
        const rockCluster = createRockCluster(x, y, z);
        rocksGroup.add(rockCluster);
        
        rockPositions.push({
            position: new THREE.Vector3(x, y, z),
            t: t,
            flowDirection: tangent.clone(),
            normal: normal.clone(),
            radius: 3 + Math.random() * 3
        });
    }
    
    if (window.gameState) {
        window.gameState.rockPositions = rockPositions;
    }
    
    riverGroup.add(rocksGroup);
    
    function createRockCluster(x, y, z) {
        const cluster = new THREE.Group();
        const clusterSize = 1 + Math.random() * 2;
        const rocksInCluster = 1 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < rocksInCluster; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * clusterSize;
            const rockX = x + Math.cos(angle) * distance * 0.5;
            const rockZ = z + Math.sin(angle) * distance * 0.5;
            const rockSize = 0.5 + Math.random() * 3.5;
            let rockGeometry;
            const rockType = Math.floor(Math.random() * 3);
            
            if (rockType === 0) {
                rockGeometry = new THREE.ConeGeometry(rockSize, rockSize * 2, 5 + Math.floor(Math.random() * 3));
                rockGeometry.rotateX((Math.random() * 0.3) * Math.PI);
                rockGeometry.rotateZ((Math.random() * 0.3) * Math.PI);
            } else if (rockType === 1) {
                rockGeometry = new THREE.SphereGeometry(
                    rockSize,
                    6 + Math.floor(Math.random() * 3),
                    6 + Math.floor(Math.random() * 3)
                );
                rockGeometry.scale(1, 0.7 + Math.random() * 0.3, 1);
            } else {
                rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
                rockGeometry.rotateX(Math.random() * Math.PI);
                rockGeometry.rotateY(Math.random() * Math.PI);
                rockGeometry.rotateZ(Math.random() * Math.PI);
            }
            
            const rockMaterial = rockMaterials[Math.floor(Math.random() * rockMaterials.length)];
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            rock.position.set(rockX, y + rockSize * 0.1 * Math.random(), rockZ);
            cluster.add(rock);
        }
        return cluster;
    }
}