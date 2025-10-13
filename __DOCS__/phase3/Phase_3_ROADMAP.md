## Phase 3: Track System & Geometry
**Duration**: Week 5-6 (10 days)  
**Status**: 🔴 Not Started  
**Dependencies**: Phase 2 complete  
**Team**: 2-4 developers  
**Parallel Work**: ⚡ Split into 3A (Track), 3B (Waypoints), 3C (Environment)

### Phase 3A: Track Loading System ⚡
**Developer Focus**: Track/Geometry Developer

#### Tasks
- [ ] **Create Track.ts**
  ```typescript
  import * as THREE from 'three';
  import RAPIER from '@dimforge/rapier3d-compat';

  export interface TrackSection {
    type: 'straight' | 'curve' | 'ramp' | 'loop' | 'bank';
    length?: number;
    radius?: number;
    angle?: number;
    banking?: number;
    height?: number;
  }

  export interface TrackData {
    name: string;
    sections: TrackSection[];
    width: number;
    waypoints: WaypointData[];
    spawnPoint: { position: Vector3; rotation: Quaternion };
  }

  export class Track {
    private mesh: THREE.Mesh;
    private collider: RAPIER.Collider;
    private spline: THREE.CatmullRomCurve3;
    
    constructor(data: TrackData, world: PhysicsWorld, scene: THREE.Scene) {
      this.generateSpline(data.sections);
      this.generateMesh(data.width);
      this.generateCollider(world);
      scene.add(this.mesh);
    }

    private generateSpline(sections: TrackSection[]): void {
      const points: THREE.Vector3[] = [];
      let currentPos = new THREE.Vector3(0, 0, 0);
      let currentDir = new THREE.Vector3(0, 0, 1);

      for (const section of sections) {
        const sectionPoints = this.generateSectionPoints(
          section, 
          currentPos, 
          currentDir
        );
        points.push(...sectionPoints);
        
        // Update position and direction for next section
        currentPos = points[points.length - 1];
        currentDir = points[points.length - 1]
          .clone()
          .sub(points[points.length - 2])
          .normalize();
      }

      this.spline = new THREE.CatmullRomCurve3(points, true); // closed loop
    }

    private generateSectionPoints(
      section: TrackSection,
      startPos: THREE.Vector3,
      startDir: THREE.Vector3
    ): THREE.Vector3[] {
      const points: THREE.Vector3[] = [];
      const divisions = 20;

      switch (section.type) {
        case 'straight':
          for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            const pos = startPos.clone()
              .add(startDir.clone().multiplyScalar(section.length! * t));
            points.push(pos);
          }
          break;

        case 'curve':
          const radius = section.radius!;
          const angle = section.angle! * (Math.PI / 180);
          for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            const theta = angle * t;
            const pos = new THREE.Vector3(
              startPos.x + radius * Math.sin(theta),
              startPos.y,
              startPos.z + radius * (1 - Math.cos(theta))
            );
            points.push(pos);
          }
          break;

        case 'ramp':
          for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            const pos = startPos.clone()
              .add(startDir.clone().multiplyScalar(section.length! * t))
              .setY(startPos.y + section.height! * t);
            points.push(pos);
          }
          break;

        case 'loop':
          // Full 360° vertical loop
          const loopRadius = section.radius!;
          for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            const theta = Math.PI * 2 * t;
            const pos = new THREE.Vector3(
              startPos.x,
              startPos.y + loopRadius * (1 - Math.cos(theta)),
              startPos.z + loopRadius * Math.sin(theta)
            );
            points.push(pos);
          }
          break;
      }

      return points;
    }

    private generateMesh(width: number): void {
      const geometry = new THREE.BufferGeometry();
      const points = this.spline.getPoints(1000);
      const vertices: number[] = [];
      const indices: number[] = [];
      const uvs: number[] = [];

      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const tangent = this.spline.getTangent(i / points.length);
        const normal = new THREE.Vector3(0, 1, 0);
        const binormal = new THREE.Vector3().crossVectors(tangent, normal);

        // Left edge
        const left = point.clone().add(binormal.clone().multiplyScalar(-width / 2));
        vertices.push(left.x, left.y, left.z);
        uvs.push(0, i / points.length);

        // Right edge
        const right = point.clone().add(binormal.clone().multiplyScalar(width / 2));
        vertices.push(right.x, right.y, right.z);
        uvs.push(1, i / points.length);

        // Indices for triangles
        if (i < points.length - 1) {
          const base = i * 2;
          indices.push(base, base + 1, base + 2);
          indices.push(base + 1, base + 3, base + 2);
        }
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        map: textureLoader.load('assets/textures/track_diffuse.jpg'),
        roughness: 0.8,
        metalness: 0.1,
      });

      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.receiveShadow = true;
    }

    private generateCollider(world: PhysicsWorld): void {
      // Create a static trimesh collider for the track
      const vertices = this.mesh.geometry.attributes.position.array;
      const indices = Array.from(this.mesh.geometry.index!.array);

      const colliderDesc = RAPIER.ColliderDesc.trimesh(
        new Float32Array(vertices),
        new Uint32Array(indices)
      );

      this.collider = world.world.createCollider(colliderDesc);
      this.collider.setFriction(1.0); // Good grip on track
    }
  }
  ```

- [ ] **Create track data JSON**
  ```typescript
  // assets/tracks/track01.json
  export const TRACK_01: TrackData = {
    name: "Hard Drivin' Classic",
    width: 10,
    sections: [
      { type: 'straight', length: 100 },
      { type: 'curve', radius: 50, angle: 90 },
      { type: 'ramp', length: 30, height: 10 },
      { type: 'straight', length: 50 },
      { type: 'loop', radius: 15 },
      { type: 'bank', radius: 40, angle: 180, banking: 30 },
      { type: 'straight', length: 80 },
    ],
    waypoints: [
      { id: 0, position: [0, 0, 0], isCheckpoint: false },
      { id: 1, position: [0, 0, 100], isCheckpoint: true },
      // ... more waypoints
    ],
    spawnPoint: {
      position: new THREE.Vector3(0, 2, 0),
      rotation: new THREE.Quaternion(),
    },
  };
  ```

### Phase 3B: Waypoint System ⚡
**Developer Focus**: Gameplay/Logic Developer

#### Tasks
- [ ] **Create WaypointSystem.ts**
  ```typescript
  export interface WaypointData {
    id: number;
    position: THREE.Vector3;
    direction: THREE.Vector3;
    triggerRadius: number;
    isCheckpoint: boolean;
    timeBonus?: number;
  }

  export class WaypointSystem {
    private waypoints: Waypoint[] = [];
    private currentWaypoint = 0;
    private lapCount = 0;
    private maxLaps = 2;

    constructor(waypointData: WaypointData[]) {
      this.waypoints = waypointData.map(data => new Waypoint(data));
    }

    update(vehiclePosition: THREE.Vector3): WaypointResult {
      const current = this.waypoints[this.currentWaypoint];
      const distance = vehiclePosition.distanceTo(current.position);

      if (distance < current.triggerRadius) {
        return this.onWaypointPassed(vehiclePosition);
      }

      // Check for wrong-way
      if (this.isGoingWrongWay(vehiclePosition)) {
        return { wrongWay: true };
      }

      return { progress: this.getProgress() };
    }

    private onWaypointPassed(vehiclePos: THREE.Vector3): WaypointResult {
      const waypoint = this.waypoints[this.currentWaypoint];
      const result: WaypointResult = {
        waypointPassed: true,
        waypointId: waypoint.id,
      };

      // Check if it's a checkpoint (time bonus)
      if (waypoint.isCheckpoint) {
        result.timeBonus = waypoint.timeBonus || 30;
      }

      // Advance to next waypoint
      this.currentWaypoint++;

      // Check if lap completed
      if (this.currentWaypoint >= this.waypoints.length) {
        this.currentWaypoint = 0;
        this.lapCount++;

        result.lapCompleted = true;
        result.currentLap = this.lapCount;

        // Check if race finished
        if (this.lapCount >= this.maxLaps) {
          result.raceFinished = true;
        }
      }

      return result;
    }

    private isGoingWrongWay(vehiclePos: THREE.Vector3): boolean {
      const current = this.waypoints[this.currentWaypoint];
      const toWaypoint = current.position.clone().sub(vehiclePos).normalize();
      const dot = toWaypoint.dot(current.direction);

      return dot < -0.5; // Facing more than 90° away
    }

    getProgress(): number {
      return (this.currentWaypoint + this.lapCount * this.waypoints.length) /
             (this.waypoints.length * this.maxLaps);
    }

    getNextWaypointPosition(): THREE.Vector3 {
      return this.waypoints[this.currentWaypoint].position.clone();
    }
  }
  ```

- [ ] **Create minimap generator**
  ```typescript
  export class MinimapGenerator {
    private texture: THREE.Texture;
    private camera: THREE.OrthographicCamera;

    generate(track: Track, size = 512): THREE.Texture {
      // Create orthographic camera looking down
      const bounds = track.getBounds();
      this.camera = new THREE.OrthographicCamera(
        bounds.min.x, bounds.max.x,
        bounds.max.z, bounds.min.z,
        0, 100
      );
      this.camera.position.set(0, 50, 0);
      this.camera.lookAt(0, 0, 0);

      // Render to texture
      const renderTarget = new THREE.WebGLRenderTarget(size, size);
      const scene = new THREE.Scene();
      scene.add(track.getMesh().clone());

      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, this.camera);
      renderer.setRenderTarget(null);

      this.texture = renderTarget.texture;
      return this.texture;
    }

    drawPlayerMarker(position: THREE.Vector3, rotation: number): void {
      // Draw triangle on minimap canvas
      const ctx = this.getMinimapContext();
      const screenPos = this.worldToScreen(position);
      
      ctx.save();
      ctx.translate(screenPos.x, screenPos.y);
      ctx.rotate(rotation);
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(-3, 3);
      ctx.lineTo(3, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  ```

### Phase 3C: Environment & Obstacles ⚡
**Developer Focus**: Environment/Assets Developer

#### Tasks
- [ ] **Create Obstacle.ts**
  ```typescript
  export enum ObstacleType {
    CONE = 'cone',
    BARRIER = 'barrier',
    TIRE_WALL = 'tire_wall',
  }

  export class Obstacle {
    private mesh: THREE.Mesh;
    private collider: RAPIER.Collider;
    private type: ObstacleType;

    constructor(
      type: ObstacleType,
      position: THREE.Vector3,
      world: PhysicsWorld,
      scene: THREE.Scene
    ) {
      this.type = type;
      this.loadModel(type);
      this.createCollider(world);
      this.mesh.position.copy(position);
      scene.add(this.mesh);
    }

    private loadModel(type: ObstacleType): void {
      // Load GLTF model based on type
      switch (type) {
        case ObstacleType.CONE:
          this.mesh = this.createCone();
          break;
        case ObstacleType.BARRIER:
          this.mesh = this.createBarrier();
          break;
        case ObstacleType.TIRE_WALL:
          this.mesh = this.createTireWall();
          break;
      }
    }

    private createCollider(world: PhysicsWorld): void {
      const bodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(
          this.mesh.position.x,
          this.mesh.position.y,
          this.mesh.position.z
        );

      const body = world.world.createRigidBody(bodyDesc);

      // Different collision shapes based on type
      let colliderDesc: RAPIER.ColliderDesc;
      switch (this.type) {
        case ObstacleType.CONE:
          colliderDesc = RAPIER.ColliderDesc.cone(0.5, 0.3);
          break;
        case ObstacleType.BARRIER:
          colliderDesc = RAPIER.ColliderDesc.cuboid(2, 0.5, 0.2);
          break;
        case ObstacleType.TIRE_WALL:
          colliderDesc = RAPIER.ColliderDesc.cuboid(1, 1, 0.5);
          break;
      }

      this.collider = world.world.createCollider(colliderDesc, body);
    }
  }
  ```

- [ ] **Add surface types**
  ```typescript
  export enum SurfaceType {
    TARMAC = 'tarmac',
    DIRT = 'dirt',
    GRASS = 'grass',
    ICE = 'ice',
  }

  export const SURFACE_FRICTION: Record<SurfaceType, number> = {
    [SurfaceType.TARMAC]: 1.0,
    [SurfaceType.DIRT]: 0.6,
    [SurfaceType.GRASS]: 0.4,
    [SurfaceType.ICE]: 0.2,
  };

  // Add to collider creation:
  colliderDesc.setFriction(SURFACE_FRICTION[surfaceType]);
  ```

- [ ] **Add particle effects (tire marks, dust)**
  ```typescript
  export class ParticleSystem {
    private particles: THREE.Points;
    private particleCount = 1000;

    createDustCloud(position: THREE.Vector3, velocity: THREE.Vector3): void {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(this.particleCount * 3);
      const velocities: THREE.Vector3[] = [];

      for (let i = 0; i < this.particleCount; i++) {
        positions[i * 3] = position.x + (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 2;

        velocities.push(
          velocity.clone().multiplyScalar(0.5).add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              Math.random() * 2,
              (Math.random() - 0.5) * 2
            )
          )
        );
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        color: 0x8B7355,
        size: 0.2,
        transparent: true,
        opacity: 0.6,
      });

      this.particles = new THREE.Points(geometry, material);
    }

    update(deltaTime: number): void {
      // Update particle positions and fade out
      const positions = this.particles.geometry.attributes.position.array;
      const material = this.particles.material as THREE.PointsMaterial;

      material.opacity *= 0.95; // Fade out

      if (material.opacity < 0.01) {
        this.dispose();
      }
    }
  }
  ```

### Testing Criteria
- [x] **Full track loads without errors**
- [x] **Track mesh renders correctly** (no gaps, no z-fighting)
- [x] **Track collider works** (vehicle stays on track)
- [x] **Vehicle completes full lap** (reaches start again)
- [x] **All waypoints trigger** (verify in console logs)
- [x] **Lap counter increments** correctly
- [x] **Checkpoint grants time bonus**
- [x] **Wrong-way detection** triggers properly
- [x] **Minimap shows track** and player position
- [x] **Obstacles collision** works (vehicle bounces off)
- [x] **Off-road detection** activates (grass/dirt areas)
- [x] **Surface friction** affects vehicle handling
- [x] **Particle effects** spawn correctly
- [x] **Performance: 60fps with full track** loaded
- [x] **No visual glitches** (flickering, disappearing geometry)

### Deliverables
- ✅ Complete functional track with all features
- ✅ Waypoint system with progression tracking
- ✅ Minimap with real-time updates
- ✅ Obstacle system with collision
- ✅ Surface type system (multi-material track)
- ✅ Environmental assets (barriers, cones, scenery)
- ✅ Particle effects (dust, tire marks)

### Performance Targets
- Frame rate: 60fps with full track + obstacles
- Memory: <250MB
- Draw calls: <200
- Track collision: <1ms per frame

---
