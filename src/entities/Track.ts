import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../core/PhysicsWorld';
import { SurfaceType } from '../types/VehicleTypes';
import { Obstacle, ObstacleType } from './Obstacle';
import { TrackScenerySystem, SceneryData } from '../systems/TrackScenerySystem';
import { BackgroundSystem, BackgroundType } from '../systems/BackgroundSystem';
import { MaterialLibrary } from '../systems/MaterialLibrary';

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
 * Obstacle data from track JSON.
 */
export interface ObstacleData {
  type: 'cone' | 'barrier' | 'tire_wall';
  position: [number, number, number];
}

/**
 * Complete track data loaded from JSON.
 * Waypoints are now optional - they will be auto-generated from section boundaries if not provided.
 */
export interface TrackData {
  name: string;
  sections: TrackSection[];
  width: number;
  waypoints?: WaypointData[]; // Optional - auto-generated from section boundaries if not provided
  spawnPoint: SpawnPointData;
  obstacles?: ObstacleData[];
  scenery?: SceneryData[]; // Optional - environmental scenery (grandstands, barriers, props)
  skybox?: string; // Optional - skybox type ('day', 'sunset', 'night', 'desert', 'city')
  timeOfDay?: string; // Optional - time of day ('day', 'sunset', 'night', 'dawn')
  background?: string; // Optional - distant background type ('desert', 'city', 'mountain', 'forest', 'none')
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
  private controlPoints!: THREE.Vector3[]; // Control points used to generate the spline
  private trackData: TrackData;
  private physicsWorld: PhysicsWorld; // Store reference for cleanup
  private scene: THREE.Scene; // Store reference for obstacle cleanup
  private obstacles: Obstacle[] = []; // Track obstacles
  private scenerySystem: TrackScenerySystem | null = null; // Track scenery system
  private backgroundSystem: BackgroundSystem | null = null; // Distant background system

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
   * @param camera - Camera for scenery LOD (optional)
   */
  constructor(data: TrackData, world: PhysicsWorld, scene: THREE.Scene, camera?: THREE.Camera) {
    // Generate track geometry
    this.generateSpline(data.sections);
    this.mesh = this.generateMesh(data.width);
    this.generateCollider(world);

    // Auto-generate waypoints if not provided
    const waypoints = data.waypoints || this.generateWaypoints(data.sections);

    // Store track data with generated waypoints
    this.trackData = {
      ...data,
      waypoints,
    };

    this.physicsWorld = world; // Store for cleanup
    this.scene = scene; // Store for obstacle cleanup

    // Add to scene
    scene.add(this.mesh);

    // Create obstacles
    this.createObstacles(data.obstacles, world, scene);

    // Create scenery if data provided
    if (data.scenery && data.scenery.length > 0 && camera) {
      this.scenerySystem = new TrackScenerySystem(scene, camera, world);
      this.scenerySystem.init(data.scenery);
      console.log(`Track scenery loaded: ${this.scenerySystem.getTriangleCount()} triangles`);
    }

    // Create background system if camera provided
    if (camera) {
      this.backgroundSystem = new BackgroundSystem(scene, camera);
      this.initializeBackground(data.background || 'none');
    }

    console.log(`Track "${this.trackData.name}" loaded: ${this.trackData.sections.length} sections, ${this.trackData.waypoints?.length || 0} waypoints, ${this.obstacles.length} obstacles`);
  }

  /**
   * Initialize background system based on track data
   *
   * @param backgroundType - Background type from track JSON
   */
  private async initializeBackground(backgroundType: string): Promise<void> {
    if (!this.backgroundSystem) return;

    // Map background string to BackgroundType
    const bgType = this.parseBackgroundType(backgroundType);

    // Configure based on track theme
    const config = this.getBackgroundConfig(bgType);

    await this.backgroundSystem.setBackground(bgType, config);
  }

  /**
   * Parse background type string from track JSON
   */
  private parseBackgroundType(type: string): BackgroundType {
    switch (type.toLowerCase()) {
      case 'desert':
        return 'desert';
      case 'city':
        return 'city';
      case 'mountain':
        return 'mountain';
      case 'forest':
        return 'forest';
      default:
        return 'none';
    }
  }

  /**
   * Get background configuration based on type
   */
  private getBackgroundConfig(type: BackgroundType): Partial<{
    distance: number;
    parallaxFactor: number;
    enableClouds: boolean;
    enableAtmosphericEffects: boolean;
  }> {
    switch (type) {
      case 'desert':
        return {
          distance: 1200,
          parallaxFactor: 0.25,
          enableClouds: false,
          enableAtmosphericEffects: true,
        };
      case 'city':
        return {
          distance: 800,
          parallaxFactor: 0.35,
          enableClouds: false,
          enableAtmosphericEffects: false,
        };
      case 'mountain':
        return {
          distance: 1500,
          parallaxFactor: 0.2,
          enableClouds: true,
          enableAtmosphericEffects: false,
        };
      case 'forest':
        return {
          distance: 1000,
          parallaxFactor: 0.3,
          enableClouds: true,
          enableAtmosphericEffects: false,
        };
      default:
        return {};
    }
  }

  /**
   * Update background system (parallax and clouds)
   *
   * Call this from game loop for animated backgrounds.
   * Performance: <0.3ms per frame
   *
   * @param deltaTime - Time since last frame in seconds
   */
  updateBackground(deltaTime: number): void {
    if (this.backgroundSystem) {
      this.backgroundSystem.update(deltaTime);
    }
  }

  /**
   * Generates a Catmull-Rom spline from track sections.
   *
   * Processes each section sequentially, generating control points
   * that define the track's centerline path. Also tracks banking angles
   * per control point for proper mesh generation.
   *
   * @param sections - Array of track section definitions
   */
  private generateSpline(sections: TrackSection[]): void {
    const points: THREE.Vector3[] = [];
    const bankingAngles: number[] = [];

    // FIX: Elevate track 0.5m above ground to prevent clipping (ground is at Y=0)
    let currentPos = new THREE.Vector3(0, 0.5, 0);
    let currentDir = new THREE.Vector3(0, 0, 1); // Start facing +Z

    for (const section of sections) {
      const result = this.generateSectionPoints(
        section,
        currentPos,
        currentDir
      );

      // Add all but the first point (to avoid duplicates)
      if (points.length === 0) {
        points.push(...result.points);
        bankingAngles.push(...result.bankingAngles);
      } else {
        points.push(...result.points.slice(1));
        bankingAngles.push(...result.bankingAngles.slice(1));
      }

      // Update position and direction for next section
      if (result.points.length > 1) {
        currentPos = result.points[result.points.length - 1].clone();
        currentDir = result.points[result.points.length - 1]
          .clone()
          .sub(result.points[result.points.length - 2])
          .normalize();
      } else if (result.points.length === 1) {
        // Single point section - use that point but don't update direction
        currentPos = result.points[0].clone();
        console.warn(`Track section generated only 1 point - direction not updated`);
      } else {
        throw new Error(`Track section generated 0 points - invalid track configuration`);
      }
    }

    // Store control points and banking data for later reference
    this.controlPoints = points;
    this.controlPointBanking = bankingAngles;

    // Create closed loop spline
    this.spline = new THREE.CatmullRomCurve3(points, true);
    console.log(`Spline generated with ${points.length} control points, ${bankingAngles.length} banking angles`);
  }

  /**
   * Generates control points for a single track section.
   *
   * @param section - Section configuration
   * @param startPos - Starting position in world space
   * @param startDir - Starting direction (unit vector)
   * @returns Object containing points and banking angles for the section
   */
  private generateSectionPoints(
    section: TrackSection,
    startPos: THREE.Vector3,
    startDir: THREE.Vector3
  ): { points: THREE.Vector3[]; bankingAngles: number[] } {
    const points: THREE.Vector3[] = [];
    const bankingAngles: number[] = [];

    // Use appropriate divisions based on section type
    // Straights need minimal points, curves need more for smoothness
    let divisions: number;
    switch (section.type) {
      case 'straight':
        divisions = 1; // Only start and end points for straight lines
        break;
      case 'curve':
      case 'bank':
        divisions = 20; // Smooth curves need more points
        break;
      case 'loop':
        divisions = 30; // Loops need even more for smoothness
        break;
      case 'ramp':
        divisions = 8; // Ramps need enough points for smooth elevation
        break;
      default:
        divisions = 10;
    }

    switch (section.type) {
      case 'straight': {
        const length = section.length || 50;
        for (let i = 0; i <= divisions; i++) {
          const t = i / divisions;
          const pos = startPos.clone().add(
            startDir.clone().multiplyScalar(length * t)
          );
          points.push(pos);
          bankingAngles.push(0); // No banking on straights
        }
        break;
      }

      case 'curve': {
        const radius = section.radius || 30;
        const angle = ((section.angle || 90) * Math.PI) / 180; // Convert to radians
        const isLeftTurn = angle > 0;

        // Calculate curve center perpendicular to start direction
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(startDir, up).normalize();

        // For positive angle, turn right (center is to the right)
        // For negative angle, turn left (center is to the left)
        const turnDirection = isLeftTurn ? -1 : 1;
        const center = startPos.clone().add(right.multiplyScalar(radius * turnDirection));

        // Calculate initial angle offset from center
        const initialOffset = new THREE.Vector3().subVectors(startPos, center);
        const initialAngle = Math.atan2(initialOffset.z, initialOffset.x);

        for (let i = 0; i <= divisions; i++) {
          const t = i / divisions;
          const theta = initialAngle + angle * t;

          // Calculate position on arc
          const pos = new THREE.Vector3(
            center.x + Math.cos(theta) * radius,
            startPos.y, // Maintain elevation (for now - will be overridden by ramps)
            center.z + Math.sin(theta) * radius
          );

          points.push(pos);
          bankingAngles.push(0); // Regular curves have no banking (use 'bank' type for that)
        }
        break;
      }

      case 'ramp': {
        const length = section.length || 30;
        const height = section.height || 5;

        for (let i = 0; i <= divisions; i++) {
          const t = i / divisions;
          // Smooth ease-in/ease-out curve for height transition
          const heightCurve = t < 0.5
            ? 2 * t * t // Ease in
            : 1 - Math.pow(-2 * t + 2, 2) / 2; // Ease out

          const pos = startPos.clone()
            .add(startDir.clone().multiplyScalar(length * t))
            .setY(startPos.y + height * heightCurve);

          points.push(pos);
          bankingAngles.push(0); // No banking on ramps
        }
        break;
      }

      case 'loop': {
        const loopRadius = section.radius || 15;

        // Full 360-degree vertical loop
        // The loop is oriented perpendicular to the start direction
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(startDir, up).normalize();

        for (let i = 0; i <= divisions; i++) {
          const t = i / divisions;
          const theta = Math.PI * 2 * t; // Full 360 degrees

          // Calculate position on vertical loop
          // Start at bottom, go around
          const verticalOffset = loopRadius * (1 - Math.cos(theta));
          const forwardOffset = loopRadius * Math.sin(theta);

          const pos = startPos.clone()
            .add(up.clone().multiplyScalar(verticalOffset))
            .add(startDir.clone().multiplyScalar(forwardOffset));

          points.push(pos);
          bankingAngles.push(0); // Loops handle their own geometry
        }
        break;
      }

      case 'bank': {
        // Banked curve - curve with progressive banking
        const radius = section.radius || 40;
        const angle = ((section.angle || 90) * Math.PI) / 180;
        const maxBanking = ((section.banking || 15) * Math.PI) / 180;
        const isLeftTurn = angle > 0;

        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(startDir, up).normalize();

        const turnDirection = isLeftTurn ? -1 : 1;
        const center = startPos.clone().add(right.multiplyScalar(radius * turnDirection));

        // Calculate initial angle offset
        const initialOffset = new THREE.Vector3().subVectors(startPos, center);
        const initialAngle = Math.atan2(initialOffset.z, initialOffset.x);

        for (let i = 0; i <= divisions; i++) {
          const t = i / divisions;
          const theta = initialAngle + angle * t;

          // Progressive banking: ease in, full bank in middle, ease out
          let bankingProgress: number;
          if (t < 0.25) {
            // Ease in over first 25%
            bankingProgress = (t / 0.25);
          } else if (t > 0.75) {
            // Ease out over last 25%
            bankingProgress = ((1 - t) / 0.25);
          } else {
            // Full banking in middle 50%
            bankingProgress = 1.0;
          }

          const currentBanking = maxBanking * bankingProgress * turnDirection;

          // Calculate position on arc (no elevation change from banking itself)
          const pos = new THREE.Vector3(
            center.x + Math.cos(theta) * radius,
            startPos.y,
            center.z + Math.sin(theta) * radius
          );

          points.push(pos);
          bankingAngles.push(currentBanking);
        }
        break;
      }

      default:
        console.warn(`Unknown section type: ${section.type}`);
        points.push(startPos.clone());
        bankingAngles.push(0);
    }

    return { points, bankingAngles };
  }

  /**
   * Generates visual track mesh from spline.
   *
   * Creates a ribbon mesh following the spline with proper width.
   * Calculates UVs for texture mapping with smooth, continuous texturing.
   * Supports banking angles and elevation changes for realistic track geometry.
   *
   * UV Mapping Strategy:
   * - U coordinate (0-1): Maps across track width from left to right
   * - V coordinate: Accumulates distance along track centerline for continuous tiling
   * - Texture repeats approximately every 2 units of track distance
   * - No visible banding or seams at tessellation boundaries
   *
   * Banking Support:
   * - Rotates track surface around tangent vector (track direction)
   * - Banking metadata stored per control point for smooth interpolation
   * - Preserves proper normal vectors for lighting and collision
   *
   * Closed Loop Handling:
   * - For closed loops, properly connects last segment back to first
   * - Handles UV wrapping at seam to prevent visible discontinuities
   * - Eliminates duplicate geometry at loop closure
   *
   * @param width - Track width in meters
   * @returns THREE.Mesh ready for rendering
   */
  private generateMesh(width: number): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();

    // Calculate tessellation based on track complexity
    // For simple tracks (like our oval), we don't need 1000 points
    // Use control points as a guide: each control point gets interpolated
    // Straights need minimal points, curves need more for smoothness
    const controlPointCount = this.controlPoints.length;

    // For a simple oval (43 control points), this gives ~129 points total
    // For complex tracks with more control points, scales appropriately
    const pointsPerControlPoint = 3; // Interpolate 3 points between each control point
    const numPoints = Math.max(controlPointCount * pointsPerControlPoint, 100);

    console.log(`Tessellating track: ${controlPointCount} control points → ${numPoints} mesh points`);
    const points = this.spline.getPoints(numPoints);

    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];

    // Pre-calculate accumulated distance along spline for V coordinate
    const distanceAccum: number[] = [0];
    for (let i = 1; i < points.length; i++) {
      const segmentDistance = points[i].distanceTo(points[i - 1]);
      distanceAccum.push(distanceAccum[distanceAccum.length - 1] + segmentDistance);
    }
    const totalDistance = distanceAccum[distanceAccum.length - 1];

    // Texture tiling: repeats texture every ~2 units for consistent appearance
    const textureScale = 2.0;

    // Generate vertices for all spline points
    // For closed loops, we'll handle the wraparound in the index generation
    const numSegments = points.length - 1; // Don't create duplicate vertex at loop end

    for (let i = 0; i < numSegments; i++) {
      const point = points[i];
      // Use normalized parameter that respects the actual segment count
      const t = i / numSegments;

      // Get tangent (direction along track)
      const tangent = this.spline.getTangent(t).normalize();

      // Calculate banking angle at this point (interpolate from control point metadata)
      const bankingAngle = this.getBankingAtParameter(t);

      // Create proper coordinate frame for the track cross-section
      // 1. Start with world up vector
      const worldUp = this.tempVec1.set(0, 1, 0);

      // 2. Calculate binormal (perpendicular to tangent, initially in horizontal plane)
      let binormal = this.tempVec2.crossVectors(worldUp, tangent).normalize();

      // Handle case where tangent is parallel to world up (vertical sections)
      if (binormal.lengthSq() < 0.001) {
        // Use a fallback binormal for vertical sections
        binormal.set(1, 0, 0);
      }

      // 3. Calculate proper normal (perpendicular to both tangent and binormal)
      const normal = this.tempVec3.crossVectors(tangent, binormal).normalize();

      // 4. Apply banking rotation around the tangent vector
      if (Math.abs(bankingAngle) > 0.001) {
        // Rotate binormal and normal around tangent by banking angle
        const cosBank = Math.cos(bankingAngle);
        const sinBank = Math.sin(bankingAngle);

        const binormalBanked = new THREE.Vector3()
          .copy(binormal).multiplyScalar(cosBank)
          .add(normal.clone().multiplyScalar(sinBank));

        const normalBanked = new THREE.Vector3()
          .copy(normal).multiplyScalar(cosBank)
          .sub(binormal.clone().multiplyScalar(sinBank));

        binormal.copy(binormalBanked).normalize();
        normal.copy(normalBanked).normalize();
      }

      // Create left and right edges using banked binormal
      const leftEdge = new THREE.Vector3().copy(point).add(
        binormal.clone().multiplyScalar(-width / 2)
      );
      const rightEdge = new THREE.Vector3().copy(point).add(
        binormal.clone().multiplyScalar(width / 2)
      );

      // Add vertices
      vertices.push(leftEdge.x, leftEdge.y, leftEdge.z);
      vertices.push(rightEdge.x, rightEdge.y, rightEdge.z);

      // Calculate UV coordinates using accumulated distance
      // V: continuous distance-based coordinate that repeats smoothly
      // Divide accumulated distance by textureScale to create regular tiling
      // This creates texture repetition every textureScale units of track distance
      const vCoord = distanceAccum[i] / textureScale;

      // U: left edge at 0, right edge at 1 for proper width mapping
      uvs.push(0, vCoord); // Left edge
      uvs.push(1, vCoord); // Right edge

      // Add normals (use calculated normal for proper lighting on banked sections)
      normals.push(normal.x, normal.y, normal.z);
      normals.push(normal.x, normal.y, normal.z);
    }

    // Generate indices to create triangle pairs
    // For closed loops, the last segment wraps back to the first
    for (let i = 0; i < numSegments; i++) {
      const base = i * 2;

      // Calculate indices for the next segment, wrapping around for closed loops
      const nextBase = ((i + 1) % numSegments) * 2;

      // First triangle (left edge of current, right edge of current, left edge of next)
      indices.push(base, base + 1, nextBase);

      // Second triangle (right edge of current, right edge of next, left edge of next)
      indices.push(base + 1, nextBase + 1, nextBase);
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

    // Create material using PBR Material Library
    const materialLib = MaterialLibrary.getInstance();
    let material = materialLib.getMaterial('asphalt');

    // Fallback to basic material if library not initialized
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a, // Dark asphalt
        roughness: 0.85, // Rough asphalt surface
        metalness: 0.0, // Non-metallic
        side: THREE.FrontSide,
        flatShading: false,
        wireframe: false,
      });
    }

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
   * Metadata for tracking banking angles per control point.
   * Index corresponds to control point index.
   */
  private controlPointBanking: number[] = [];

  /**
   * Gets banking angle at a given spline parameter (0-1).
   * Interpolates between control points for smooth banking transitions.
   *
   * @param t - Spline parameter (0-1)
   * @returns Banking angle in radians
   */
  private getBankingAtParameter(t: number): number {
    if (this.controlPointBanking.length === 0) {
      return 0; // No banking data
    }

    // Map spline parameter to control point indices
    const floatIndex = t * (this.controlPointBanking.length - 1);
    const index1 = Math.floor(floatIndex);
    const index2 = Math.ceil(floatIndex);
    const fraction = floatIndex - index1;

    // Clamp indices to valid range
    const clampedIndex1 = Math.max(0, Math.min(this.controlPointBanking.length - 1, index1));
    const clampedIndex2 = Math.max(0, Math.min(this.controlPointBanking.length - 1, index2));

    // Linear interpolation between banking angles
    const banking1 = this.controlPointBanking[clampedIndex1] || 0;
    const banking2 = this.controlPointBanking[clampedIndex2] || 0;

    return banking1 + (banking2 - banking1) * fraction;
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
   * Creates a debug visualization of the collision mesh.
   * Renders the physics trimesh as a wireframe overlay to identify collision issues.
   *
   * @param scene - Three.js scene to add debug mesh to
   * @returns Debug mesh (can be toggled on/off)
   */
  public createCollisionDebugMesh(scene: THREE.Scene): THREE.LineSegments {
    console.log('[TRACK DEBUG] Creating collision debug visualization...');

    if (!this.collider) {
      throw new Error('Cannot create debug mesh - collider not initialized');
    }

    // Get the same geometry used for collision
    const positionAttr = this.mesh.geometry.attributes.position;
    const indexAttr = this.mesh.geometry.index;

    if (!positionAttr || !indexAttr) {
      throw new Error('Mesh missing attributes for debug visualization');
    }

    // Create wireframe geometry from the collision mesh
    const wireframeGeometry = new THREE.BufferGeometry();
    wireframeGeometry.setAttribute('position', positionAttr.clone());
    wireframeGeometry.setIndex(indexAttr.clone());

    // Create bright green wireframe material (easy to see)
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00, // Bright green
      linewidth: 2,
      transparent: true,
      opacity: 0.6,
      depthTest: true,
    });

    // Create edges geometry for cleaner visualization
    const edgesGeometry = new THREE.EdgesGeometry(wireframeGeometry, 15); // 15 degree threshold
    const debugMesh = new THREE.LineSegments(edgesGeometry, wireframeMaterial);

    // Offset slightly above track surface to avoid z-fighting
    debugMesh.position.y = 0.05;
    debugMesh.name = 'track-collision-debug';

    scene.add(debugMesh);
    console.log('[TRACK DEBUG] Collision debug mesh created and added to scene');
    console.log(`[TRACK DEBUG] Collision mesh has ${positionAttr.count} vertices, ${indexAttr.count / 3} triangles`);

    return debugMesh;
  }

  /**
   * Automatically generates waypoints from track section boundaries.
   *
   * Places one waypoint at the end of each section, calculated from the spline.
   * The first waypoint is marked as a checkpoint with a time bonus.
   * All waypoints have a trigger radius of 18 meters for an oval track.
   *
   * Waypoint generation process:
   * 1. Calculate the cumulative length of each section (how far along the spline)
   * 2. For each section end, find the spline parameter t that corresponds to that distance
   * 3. Use spline.getPoint(t) to get the 3D position on the centerline
   * 4. Use spline.getTangent(t) to get the forward direction at that point
   * 5. Place waypoint at Y=0.5 (above track surface) with the calculated direction
   *
   * Performance: Computed once during track initialization, zero per-frame cost
   *
   * @param sections - Array of track section definitions
   * @returns Array of generated WaypointData
   */
  private generateWaypoints(sections: TrackSection[]): WaypointData[] {
    // First pass: calculate section boundaries and total track length
    const sectionLengths: number[] = [];
    const sectionStartDistances: number[] = [0];
    let totalDistance = 0;

    for (const section of sections) {
      let sectionLength = 0;

      switch (section.type) {
        case 'straight':
          sectionLength = section.length || 50;
          break;
        case 'curve': {
          const radius = section.radius || 30;
          const angle = ((section.angle || 90) * Math.PI) / 180;
          sectionLength = radius * angle; // Arc length = radius * angle
          break;
        }
        case 'ramp': {
          const length = section.length || 30;
          const height = section.height || 5;
          // Arc length of ramp (approximation using Euclidean distance)
          sectionLength = Math.sqrt(length * length + height * height);
          break;
        }
        case 'loop': {
          const loopRadius = section.radius || 15;
          sectionLength = Math.PI * 2 * loopRadius; // Full circle circumference
          break;
        }
        case 'bank': {
          const radius = section.radius || 40;
          const angle = ((section.angle || 90) * Math.PI) / 180;
          sectionLength = radius * angle; // Arc length
          break;
        }
        default:
          sectionLength = 50;
      }

      sectionLengths.push(sectionLength);
      totalDistance += sectionLength;
      sectionStartDistances.push(totalDistance);
    }

    // Second pass: generate waypoints at section boundaries
    const waypoints: WaypointData[] = [];

    for (let i = 0; i < sections.length; i++) {
      // Distance at the end of this section
      const sectionEndDistance = sectionStartDistances[i + 1];

      // Convert distance to spline parameter (0-1, where 1 is the full loop)
      const t = sectionEndDistance / totalDistance;

      // Clamp to valid range in case of floating point issues
      const tClamped = Math.max(0, Math.min(1, t));

      // Get position and direction from spline
      const position = this.spline.getPoint(tClamped);
      const tangent = this.spline.getTangent(tClamped);

      // Normalize tangent to get direction
      tangent.normalize();

      // Create waypoint with position at Y=0.5 (above track surface)
      const waypoint: WaypointData = {
        id: i,
        position: [position.x, 0.5, position.z],
        direction: [tangent.x, 0, tangent.z],
        triggerRadius: 18,
        isCheckpoint: i === 0, // First waypoint is the checkpoint
        timeBonus: i === 0 ? 30 : undefined,
      };

      waypoints.push(waypoint);
    }

    console.log(`Auto-generated ${waypoints.length} waypoints from ${sections.length} sections`);

    return waypoints;
  }

  /**
   * Creates obstacles from track data.
   *
   * @param obstacleData - Array of obstacle configurations
   * @param world - Physics world for collision
   * @param scene - Three.js scene to add obstacles to
   */
  private createObstacles(obstacleData: ObstacleData[] | undefined, world: PhysicsWorld, scene: THREE.Scene): void {
    if (!obstacleData || obstacleData.length === 0) {
      return;
    }

    for (const data of obstacleData) {
      const position = new THREE.Vector3(data.position[0], data.position[1], data.position[2]);
      const obstacleType = data.type === 'cone' ? ObstacleType.CONE :
                          data.type === 'barrier' ? ObstacleType.BARRIER :
                          ObstacleType.TIRE_WALL;

      const obstacle = new Obstacle(obstacleType, position, world, scene);
      this.obstacles.push(obstacle);
    }

    console.log(`Created ${this.obstacles.length} obstacles`);
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
   * Returns auto-generated waypoints if none were provided in track data.
   *
   * @returns Array of waypoint configurations
   */
  getWaypoints(): WaypointData[] {
    return this.trackData.waypoints || [];
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

    // Dispose all obstacles
    for (const obstacle of this.obstacles) {
      obstacle.dispose(this.physicsWorld, this.scene);
    }
    this.obstacles = [];

    // Dispose scenery system
    if (this.scenerySystem) {
      this.scenerySystem.dispose();
      this.scenerySystem = null;
    }

    // Dispose background system
    if (this.backgroundSystem) {
      this.backgroundSystem.dispose();
      this.backgroundSystem = null;
    }

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
   * Waypoints are optional in the JSON file - they will be auto-generated from
   * section boundaries if not provided. Only name, sections, and spawnPoint
   * are required.
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

      // Validate track data (waypoints optional, will be auto-generated if missing)
      if (!data.name || !data.sections || !data.spawnPoint) {
        throw new Error('Invalid track data: missing required fields (name, sections, spawnPoint)');
      }

      console.log(`Track data loaded from ${path}: ${data.name}`);
      return data;
    } catch (error) {
      console.error(`Error loading track data from ${path}:`, error);
      throw error;
    }
  }
}
