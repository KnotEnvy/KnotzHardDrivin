## Phase 6: AI Opponent (Phantom Photon)
**Duration**: Week 10 (5 days)  
**Status**: 🔴 Not Started  
**Dependencies**: Phase 5 complete  
**Team**: 2 developers  
**Parallel Work**: ⚡ Split into 6A (Recording) and 6B (Playback)

### Phase 6A: Ghost Recording ⚡
**Developer Focus**: Recording/Data Developer

#### Tasks
- [ ] **Create GhostRecorder.ts**
  ```typescript
  export interface GhostFrame {
    time: number;                 // Delta time since race start
    position: [number, number, number];
    rotation: [number, number, number, number]; // quaternion
    wheelRotations: number[];
    speed: number;
  }

  export interface GhostData {
    lapTime: number;
    trackId: string;
    frames: GhostFrame[];
    recordedAt: Date;
  }

  export class GhostRecorder {
    private frames: GhostFrame[] = [];
    private recording = false;
    private startTime = 0;

    startRecording(): void {
      this.frames = [];
      this.recording = true;
      this.startTime = performance.now();
      console.log('Ghost recording started');
    }

    recordFrame(vehicle: Vehicle): void {
      if (!this.recording) return;

      const frame: GhostFrame = {
        time: (performance.now() - this.startTime) / 1000, // seconds
        position: vehicle.getPosition().toArray(),
        rotation: vehicle.getRotation().toArray(),
        wheelRotations: vehicle.getWheelRotations(),
        speed: vehicle.getSpeed(),
      };

      this.frames.push(frame);
    }

    stopRecording(lapTime: number): GhostData {
      this.recording = false;

      const ghostData: GhostData = {
        lapTime,
        trackId: Track.getInstance().getId(),
        frames: this.optimizeFrames(this.frames),
        recordedAt: new Date(),
      };

      console.log(`Ghost recorded: ${this.frames.length} frames, ${lapTime}ms`);
      return ghostData;
    }

    private optimizeFrames(frames: GhostFrame[]): GhostFrame[] {
      // Use keyframe compression: only store frames when significant change occurs
      const optimized: GhostFrame[] = [frames[0]]; // Always keep first frame
      const threshold = {
        position: 0.1,   // meters
        rotation: 0.05,  // radians
        speed: 1.0,      // m/s
      };

      for (let i = 1; i < frames.length - 1; i++) {
        const prev = frames[i - 1];
        const curr = frames[i];

        const posChanged = this.vectorDistance(prev.position, curr.position) > threshold.position;
        const rotChanged = this.quaternionDistance(prev.rotation, curr.rotation) > threshold.rotation;
        const speedChanged = Math.abs(prev.speed - curr.speed) > threshold.speed;

        if (posChanged || rotChanged || speedChanged) {
          optimized.push(curr);
        }
      }

      optimized.push(frames[frames.length - 1]); // Always keep last frame

      console.log(`Ghost optimized: ${frames.length} → ${optimized.length} frames`);
      return optimized;
    }

    private vectorDistance(a: number[], b: number[]): number {
      return Math.sqrt(
        (a[0] - b[0]) ** 2 +
        (a[1] - b[1]) ** 2 +
        (a[2] - b[2]) ** 2
      );
    }

    private quaternionDistance(a: number[], b: number[]): number {
      // Angle between quaternions
      const dot = a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3];
      return Math.acos(2 * dot * dot - 1);
    }

    serialize(ghostData: GhostData): Uint8Array {
      // Compress ghost data for storage
      const json = JSON.stringify(ghostData);
      const encoder = new TextEncoder();
      return encoder.encode(json);
    }

    deserialize(data: Uint8Array): GhostData {
      const decoder = new TextDecoder();
      const json = decoder.decode(data);
      return JSON.parse(json);
    }
  }
  ```

- [ ] **Integrate with leaderboard**
  ```typescript
  // In race complete handler:
  const lapTime = TimerSystem.getInstance().getState().bestLapTime;

  if (LeaderboardSystem.getInstance().isTopTen(lapTime)) {
    // Record ghost
    const ghostData = GhostRecorder.getInstance().stopRecording(lapTime);
    const serialized = GhostRecorder.getInstance().serialize(ghostData);

    // Submit to leaderboard
    const playerName = await PromptPlayerName();
    LeaderboardSystem.getInstance().submitTime(playerName, lapTime, serialized);

    UISystem.getInstance().showTopTenMessage();
  }
  ```

### Phase 6B: Ghost Playback ⚡
**Developer Focus**: AI/Rendering Developer

#### Tasks
- [ ] **Create Ghost.ts entity**
  ```typescript
  export class Ghost {
    private mesh: THREE.Mesh;
    private ghostData: GhostData;
    private playbackTime = 0;
    private currentFrame = 0;
    private material: THREE.ShaderMaterial;

    constructor(ghostData: GhostData, scene: THREE.Scene) {
      this.ghostData = ghostData;
      this.createMesh();
      this.createGhostShader();
      scene.add(this.mesh);
    }

    private createMesh(): void {
      // Clone vehicle model
      const vehicleModel = AssetLoader.getModel('vehicle').clone();
      
      // Create ghost material
      this.material = this.createGhostShader();
      
      vehicleModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = this.material;
        }
      });

      this.mesh = vehicleModel;
      this.mesh.name = 'phantom-photon';
    }

    private createGhostShader(): THREE.ShaderMaterial {
      return new THREE.ShaderMaterial({
        uniforms: {
          baseColor: { value: new THREE.Color(0x00ffff) },
          glowColor: { value: new THREE.Color(0xff00ff) },
          opacity: { value: 0.6 },
          time: { value: 0 },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;

          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 baseColor;
          uniform vec3 glowColor;
          uniform float opacity;
          uniform float time;
          varying vec3 vNormal;
          varying vec3 vPosition;

          void main() {
            // Fresnel effect for glow
            vec3 viewDir = normalize(cameraPosition - vPosition);
            float fresnel = pow(1.0 - dot(vNormal, viewDir), 3.0);
            
            // Pulsing glow
            float pulse = 0.5 + 0.5 * sin(time * 2.0);
            vec3 glow = glowColor * fresnel * pulse;
            
            vec3 finalColor = baseColor + glow;
            
            gl_FragColor = vec4(finalColor, opacity);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    }

    update(deltaTime: number): void {
      this.playbackTime += deltaTime;

      // Update shader time for pulsing effect
      this.material.uniforms.time.value = this.playbackTime;

      // Find current and next frame
      while (
        this.currentFrame < this.ghostData.frames.length - 1 &&
        this.ghostData.frames[this.currentFrame + 1].time < this.playbackTime
      ) {
        this.currentFrame++;
      }

      const currentFrame = this.ghostData.frames[this.currentFrame];
      const nextFrame = this.ghostData.frames[this.currentFrame + 1];

      if (!nextFrame) {
        // Finished playback, loop back
        this.playbackTime = 0;
        this.currentFrame = 0;
        return;
      }

      // Interpolate between frames
      const t = (this.playbackTime - currentFrame.time) /
                (nextFrame.time - currentFrame.time);

      const pos = new THREE.Vector3().fromArray(currentFrame.position)
        .lerp(new THREE.Vector3().fromArray(nextFrame.position), t);

      const rot = new THREE.Quaternion().fromArray(currentFrame.rotation)
        .slerp(new THREE.Quaternion().fromArray(nextFrame.rotation), t);

      this.mesh.position.copy(pos);
      this.mesh.quaternion.copy(rot);
    }

    dispose(): void {
      this.material.dispose();
      this.mesh.removeFromParent();
    }
  }
  ```

- [ ] **Create GhostManager.ts**
  ```typescript
  export class GhostManager {
    private ghost: Ghost | null = null;
    private shouldSpawn = false;

    checkSpawnConditions(): void {
      const playerBestTime = TimerSystem.getInstance().getState().bestLapTime;
      this.shouldSpawn = LeaderboardSystem.getInstance().isTopTen(playerBestTime);
    }

    spawnGhost(scene: THREE.Scene): void {
      if (!this.shouldSpawn) return;

      // Load best ghost from leaderboard
      const leaderboard = LeaderboardSystem.getInstance().getLeaderboard();
      if (leaderboard.length === 0) return;

      const bestEntry = leaderboard[0]; // #1 ranked ghost
      if (!bestEntry.ghostData) return;

      const ghostData = GhostRecorder.getInstance().deserialize(bestEntry.ghostData);
      this.ghost = new Ghost(ghostData, scene);

      console.log(`Phantom Photon spawned! Chasing ${bestEntry.playerName}'s time: ${TimerSystem.formatTime(bestEntry.lapTime)}`);
      
      UISystem.getInstance().showPhantomPhotonMessage(bestEntry.playerName);
    }

    update(deltaTime: number): void {
      if (this.ghost) {
        this.ghost.update(deltaTime);
      }
    }

    despawn(): void {
      if (this.ghost) {
        this.ghost.dispose();
        this.ghost = null;
      }
    }
  }
  ```

- [ ] **Add particle trail effect**
  ```typescript
  export class GhostTrailEffect {
    private particles: THREE.Points;
    private particlePositions: THREE.Vector3[] = [];
    private maxParticles = 100;

    constructor(scene: THREE.Scene) {
      this.createParticleSystem();
      scene.add(this.particles);
    }

    private createParticleSystem(): void {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(this.maxParticles * 3);
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        color: 0x00ffff,
        size: 0.5,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });

      this.particles = new THREE.Points(geometry, material);
    }

    addParticle(position: THREE.Vector3): void {
      this.particlePositions.push(position.clone());
      
      if (this.particlePositions.length > this.maxParticles) {
        this.particlePositions.shift();
      }

      this.updateGeometry();
    }

    private updateGeometry(): void {
      const positions = this.particles.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < this.particlePositions.length; i++) {
        const pos = this.particlePositions[i];
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
      }

      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }
  ```

### Testing Criteria
- [x] **Ghost records on top 10 time**
- [x] **Ghost data serializes/deserializes** correctly
- [x] **Ghost spawns at race start** when conditions met
- [x] **Ghost follows recorded path** accurately
- [x] **Ghost interpolation smooth** (no jerky movement)
- [x] **Ghost shader looks good** (transparent, glowing)
- [x] **No collision with ghost** (passes through player)
- [x] **Ghost loops correctly** after finishing lap
- [x] **Particle trail renders** (optional)
- [x] **Performance: <2ms overhead** for ghost system
- [x] **Ghost data <500KB** per recording

### Deliverables
- ✅ Ghost recording system
- ✅ Ghost playback with interpolation
- ✅ Phantom Photon visual effects
- ✅ Ghost spawn conditions
- ✅ Particle trail (optional enhancement)

### Performance Targets
- Ghost playback: <1ms per frame
- Memory: <10MB for ghost data
- Visual quality: Matches vehicle model

---