import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../core/PhysicsWorld';
import { SurfaceType } from '../types/VehicleTypes';

/**
 * Track section type definitions.
 * Determines how the section geometry is generated.
 */
export type TrackSectionType = 'straight' | 'curve' | 'ramp' | 'loop' | 'bank';

/**
 * Track section configuration.
 * Defines a single piece of track geometry.
 */
export interface TrackSection {
  type: TrackSectionType;
  length?: number;    // Length in meters (for straight, ramp)
  radius?: number;    // Radius in meters (for curve, loop)
  angle?: number;     // Angle in degrees (for curve, bank)
  banking?: number;   // Banking angle in degrees (for banked curves)
  height?: number;    // Height change in meters (for ramp)
}

/**
 * Waypoint data from track JSON.
 * Waypoints mark progress checkpoints on the track.
 */
export interface WaypointData {
  id: number;
  position: [number, number, number];
  direction: [number, number, number];
  triggerRadius: number;
  isCheckpoint: boolean;
  timeBonus?: number;
}

/**
 * Spawn point data from track JSON.
 */
export interface SpawnPointData {
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion [x, y, z, w]
}

/**
 * Complete track data loaded from JSON.
 */
export interface TrackData {
  name: string;
  sections: TrackSection[];
  width: number;
  waypoints: WaypointData[];
  spawnPoint: SpawnPointData;
}

/**
 * Track entity - generates and manages track geometry, collision, and waypoints.
 *
 * Generates smooth track geometry from spline curves defined by sections.
 * Creates visual mesh and physics collision mesh.
 *
 * Performance target: <5ms generation time, <2ms collision per frame
 */
export class Track {
  private mesh!: THREE.Mesh;
  private collider: RAPIER.Collider | null = null;
  private rigidBody: RAPIER.RigidBody | null = null; // Static rigid body for track
  private spline!: THREE.CatmullRomCurve3;
  private trackData: TrackData;
  private physicsWorld: PhysicsWorld; // Store reference for cleanup

  // Temp objects to avoid per-frame allocations
  private tempVec1 = new THREE.Vector3();
  private tempVec2 = new THREE.Vector3();
  private tempVec3 = new THREE.Vector3();

  /**
   * Creates a new track from track data.
   *
   * @param data - Track configuration data (from JSON)
   * @param world - Physics world for collision mesh
   * @param scene - Three.js scene to add visual mesh to
   */
  constructor(data: TrackData, world: PhysicsWorld, scene: THREE.Scene) {
    this.trackData = data;
    this.physicsWorld = world; // Store for cleanup

    // Generate track geometry
    this.generateSpline(data.sections);
    this.mesh = this.generateMesh(data.width);
    this.generateCollider(world);

    // Add to scene
    scene.add(this.mesh);

    console.log(`Track "${data.name}" loaded: ${data.sections.length} sections, ${data.waypoints.length} waypoints`);
  }

  /**
   * Generates a Catmull-Rom spline from track sections.
   *
   * Processes each section sequentially, generating control points
   * that define the track's centerline path.
   *
   * @param sections - Array of track section definitions
   */
  private generateSpline(sections: TrackSection[]): void {
    const points: THREE.Vector3[] = [];
    let currentPos = new THREE.Vector3(0, 0, 0);
    let currentDir = new THREE.Vector3(0, 0, 1); // Start facing +Z

    for (const section of sections) {
      const sectionPoints = this.generateSectionPoints(
        section,
        currentPos,
        currentDir
      );

      // Add all but the first point (to avoid duplicates)
      if (points.length === 0) {
        points.push(...sectionPoints);
      } else {
        points.push(...sectionPoints.slice(1));
      }

      // Update position and direction for next section
      if (sectionPoints.length > 1) {
        currentPos = sectionPoints[sectionPoints.length - 1].clone();
        currentDir = sectionPoints[sectionPoints.length - 1]
          .clone()
          .sub(sectionPoints[sectionPoints.length - 2])
          .normalize();
      } else if (sectionPoints.length === 1) {
        // Single point section - use that point but don't update direction
        currentPos = sectionPoints[0].clone();
        console.warn(`Track section generated only 1 point - direction not updated`);
      } else {
        throw new Error(`Track section generated 0 points - invalid track configuration`);
      }
    }

    // Create closed loop spline
    this.spline = new THREE.CatmullRomCurve3(points, true);
    console.log(`Spline generated with ${points.length} control points`);
  }

  /**
   * Generates control points for a single track section.
   *
   * @param section - Section configuration
   * @param startPos - Starting position in world space
   * @param startDir - Starting direction (unit vector)
   * @returns Array of Vector3 points defining the section
   */
  private generateSectionPoints(
    section: TrackSection,
    startPos: THREE.Vector3,
    startDir: THREE.Vector3
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const divisions = 20; // Points per section

    switch (section.type) {
      case 'straight': {
        const length = section.length || 50;
        for (let i = 0; i <= divisions; i++) {
          const t = i / divisions;
          const pos = startPos.clone().add(
            startDir.clone().multiplyScalar(length * t)
          );
          points.push(pos);
        }
        break;
      }

      case 'curve': {
        const radius = section.radius || 30;
        const angle = ((section.angle || 90) * Math.PI) / 180; // Convert to radians

        // Calculate curve center perpendicular to start direction
        const right = this.tempVec1.crossVectors(
          startDir,
          new THREE.Vector3(0, 1, 0)
        ).normalize();

        const center = startPos.clone().add(right.multiplyScalar(radius));

        for (let i = 0; i <= divisions; i++) {
          const t = i / divisions;
          const theta = angle * t;

          // Rotate around center
          const offset = this.tempVec2.set(
            -Math.sin(theta) * radius,
            0,
            Math.cos(theta) * radius
          );

          const pos = center.clone().add(offset);
          points.push(pos);
        }
        break;
      }

      case 'ramp': {
        const length = section.length || 30;
        const height = section.height || 5;

        for (let i = 0; i <= divisions; i++) {
          const t = i / divisions;
          const pos = startPos.clone()
            .add(startDir.clone().multiplyScalar(length * t))
            .setY(startPos.y + height * t);
          points.push(pos);
        }
        break;
      }

      case 'loop': {
        const loopRadius = section.radius || 15;

        // Full 360-degree vertical loop
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

      case 'bank': {
        // Banked curve - similar to curve but with banking angle
        const radius = section.radius || 40;
        const angle = ((section.angle || 90) * Math.PI) / 180;
        const banking = ((section.banking || 15) * Math.PI) / 180;

        const right = this.tempVec1.crossVectors(
          startDir,
          new THREE.Vector3(0, 1, 0)
        ).normalize();

        const center = startPos.clone().add(right.multiplyScalar(radius));

        for (let i = 0; i <= divisions; i++) {
          const t = i / divisions;
          const theta = angle * t;

          const offset = this.tempVec2.set(
            -Math.sin(theta) * radius,
            Math.sin(banking) * radius * t, // Apply banking
            Math.cos(theta) * radius
          );

          const pos = center.clone().add(offset);
          points.push(pos);
        }
        break;
      }

      default:
        console.warn(`Unknown section type: ${section.type}`);
        points.push(startPos.clone());
    }

    return points;
  }

  /**
   * Generates visual track mesh from spline.
   *
   * Creates a ribbon mesh following the spline with proper width.
   * Calculates UVs for texture mapping.
   *
   * @param width - Track width in meters
   * @returns THREE.Mesh ready for rendering
   */
  private generateMesh(width: number): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();
    const numPoints = 1000; // High tessellation for smoothness
    const points = this.spline.getPoints(numPoints);

    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const t = i / points.length;

      // Get tangent (direction along track)
      const tangent = this.spline.getTangent(t);

      // Calculate binormal (perpendicular to tangent in horizontal plane)
      const up = this.tempVec1.set(0, 1, 0);
      const binormal = this.tempVec2.crossVectors(tangent, up).normalize();

      // Create left and right edges
      const leftEdge = this.tempVec3.copy(point).add(
        binormal.clone().multiplyScalar(-width / 2)
      );
      const rightEdge = point.clone().add(
        binormal.clone().multiplyScalar(width / 2)
      );

      // Add vertices
      vertices.push(leftEdge.x, leftEdge.y, leftEdge.z);
      vertices.push(rightEdge.x, rightEdge.y, rightEdge.z);

      // Add UVs (for texture mapping)
      uvs.push(0, t * 10); // Left edge, tiled vertically
      uvs.push(1, t * 10); // Right edge

      // Add normals (pointing up)
      normals.push(0, 1, 0);
      normals.push(0, 1, 0);

      // Create triangles (skip last segment)
      if (i < points.length - 1) {
        const base = i * 2;

        // First triangle
        indices.push(base, base + 1, base + 2);

        // Second triangle
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    // Set geometry attributes
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(normals, 3)
    );
    geometry.setIndex(indices);

    // Compute vertex normals for smooth shading
    geometry.computeVertexNormals();

    // Create material (placeholder - will be replaced with textured material)
    const material = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false; // Track doesn't cast shadows
    mesh.name = 'track-mesh';

    console.log(
      `Track mesh generated: ${vertices.length / 3} vertices, ${indices.length / 3} triangles`
    );

    return mesh;
  }

  /**
   * Generates physics collision mesh for the track.
   *
   * Creates a static trimesh collider in Rapier.js using the visual mesh geometry.
   * Simplified from visual mesh for better performance.
   *
   * @param world - Physics world to create collider in
   * @throws {Error} If physics world not initialized or mesh geometry invalid
   */
  private generateCollider(world: PhysicsWorld): void {
    if (!world.world) {
      throw new Error('Physics world not initialized - cannot create track collider');
    }

    // Extract vertex and index data from mesh
    const positionAttr = this.mesh.geometry.attributes.position;
    const indexAttr = this.mesh.geometry.index;

    if (!positionAttr || !indexAttr) {
      throw new Error('Track mesh missing position or index attributes - cannot create collider');
    }

    if (!positionAttr.array || !indexAttr.array) {
      throw new Error('Track mesh attributes have no data - cannot create collider');
    }

    const vertices = new Float32Array(positionAttr.array);
    const indices = new Uint32Array(indexAttr.array);

    // Create static rigid body for track (required for raycast detection)
    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(0, 0, 0);
    this.rigidBody = world.world.createRigidBody(rigidBodyDesc);

    console.log(`Track rigid body created: isFixed=${this.rigidBody.isFixed()}, isDynamic=${this.rigidBody.isDynamic()}`);

    // Create static trimesh collider attached to rigid body
    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);

    // Set friction for good grip on tarmac
    colliderDesc.setFriction(1.0);

    // Use default collision groups so vehicle raycasts can hit it
    // colliderDesc.setCollisionGroups(0x00010001); // REMOVED - was blocking raycasts

    // Create collider attached to static rigid body (allows raycast hits)
    this.collider = world.world.createCollider(colliderDesc, this.rigidBody);

    console.log(
      `Track collider created: ${vertices.length / 3} vertices, ${indices.length / 3} triangles, isSensor=${this.collider.isSensor()}, handle=${this.collider.handle}`
    );
  }

  /**
   * Gets the track's spawn point for the player vehicle.
   *
   * @returns Object with position and rotation
   */
  getSpawnPoint(): { position: THREE.Vector3; rotation: THREE.Quaternion } {
    const spawn = this.trackData.spawnPoint;

    return {
      position: new THREE.Vector3(
        spawn.position[0],
        spawn.position[1],
        spawn.position[2]
      ),
      rotation: new THREE.Quaternion(
        spawn.rotation[0],
        spawn.rotation[1],
        spawn.rotation[2],
        spawn.rotation[3]
      ),
    };
  }

  /**
   * Gets track waypoint data.
   *
   * @returns Array of waypoint configurations
   */
  getWaypoints(): WaypointData[] {
    return this.trackData.waypoints;
  }

  /**
   * Gets the track name.
   *
   * @returns Track name string
   */
  getName(): string {
    return this.trackData.name;
  }

  /**
   * Gets the track's visual mesh.
   *
   * @returns THREE.Mesh for rendering
   */
  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  /**
   * Gets the bounding box of the track (for minimap generation).
   *
   * @returns THREE.Box3 containing entire track
   */
  getBounds(): THREE.Box3 {
    const box = new THREE.Box3();
    box.setFromObject(this.mesh);
    return box;
  }

  /**
   * Gets surface type at a given position (for tire grip calculation).
   *
   * Currently returns TARMAC for all positions.
   * Future: Ray cast to determine surface material.
   *
   * @param _position - Position to query (unused for now)
   * @returns Surface type at position
   */
  getSurfaceType(_position: THREE.Vector3): SurfaceType {
    // TODO: Implement multi-material surface detection
    // For now, entire track is tarmac
    return SurfaceType.TARMAC;
  }

  /**
   * Cleans up track resources.
   * Call this when removing the track from the scene.
   */
  dispose(): void {
    // Dispose geometry
    this.mesh.geometry.dispose();

    // Dispose material
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((mat) => mat.dispose());
    } else {
      this.mesh.material.dispose();
    }

    // Remove from scene
    this.mesh.removeFromParent();

    // Remove collider and rigid body from physics world
    if (this.collider && this.physicsWorld.world) {
      this.physicsWorld.world.removeCollider(this.collider, false);
      this.collider = null;
    }

    if (this.rigidBody && this.physicsWorld.world) {
      this.physicsWorld.world.removeRigidBody(this.rigidBody);
      this.rigidBody = null;
    }

    console.log(`Track "${this.trackData.name}" disposed`);
  }

  /**
   * Loads track data from JSON file.
   *
   * @param path - Path to track JSON file
   * @returns Promise resolving to TrackData
   */
  static async loadTrackData(path: string): Promise<TrackData> {
    try {
      const response = await fetch(path);

      if (!response.ok) {
        throw new Error(`Failed to load track: ${response.statusText}`);
      }

      const data: TrackData = await response.json();

      // Validate track data
      if (!data.name || !data.sections || !data.waypoints || !data.spawnPoint) {
        throw new Error('Invalid track data: missing required fields');
      }

      console.log(`Track data loaded from ${path}: ${data.name}`);
      return data;
    } catch (error) {
      console.error(`Error loading track data from ${path}:`, error);
      throw error;
    }
  }
}
