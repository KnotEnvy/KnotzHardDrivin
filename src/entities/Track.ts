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

// ---------------------------------------------------------------------------
// Frame-transport data structures
// ---------------------------------------------------------------------------

/**
 * A single oriented frame control point along the track centerline.
 *
 * forward, up, right form an orthonormal basis (right = cross(forward, up)).
 * banking stores the accumulated roll in radians so the mesh builder can
 * retrieve it per-point without recomputing.
 */
export interface FramePoint {
  /** World-space position of the centerline at this point. */
  position: THREE.Vector3;
  /** Unit tangent — direction of travel at this point. */
  forward: THREE.Vector3;
  /** Unit surface-normal of the track at this point (rolled by banking). */
  up: THREE.Vector3;
  /** Unit lateral axis: cross(forward, up). Pre-computed for the mesh builder. */
  right: THREE.Vector3;
  /** Accumulated banking angle in radians (positive = left-edge high). */
  banking: number;
}

/**
 * Running transport frame carried through section generators.
 * Always orthonormal.
 */
interface TransportFrame {
  position: THREE.Vector3;
  forward: THREE.Vector3; // unit
  up: THREE.Vector3;      // unit
  right: THREE.Vector3;   // unit = cross(forward, up)
}

// ---------------------------------------------------------------------------
/**
 * Re-orthogonalises a transport frame in-place.
 *
 * Convention: right = cross(up, forward).
 * For sections that keep right fixed (ramps), forward has already been updated.
 * We keep forward canonical and re-derive up from forward and right, then
 * re-derive right from up and forward to kill any accumulated drift.
 *
 * Call order matters: forward → up (cross(fwd,right)) → right (cross(up,fwd)).
 */
function reorthogonalise(frame: TransportFrame): void {
  frame.forward.normalize();
  // Re-derive up from forward and right (right is the rotation axis for ramps)
  frame.up.crossVectors(frame.forward, frame.right).normalize();
  // Re-derive right to kill drift: right = cross(up, forward)
  frame.right.crossVectors(frame.up, frame.forward).normalize();
}

/**
 * Track entity - generates and manages track geometry, collision, and waypoints.
 *
 * Uses a frame-transport approach: a running orthonormal frame {forward, up, right}
 * is carried through each section generator. This correctly handles ramps
 * (pitched forward/up about right), loops (full 360-degree pitch), and banked
 * curves (turn in local-horizontal plane plus roll about forward). The stored
 * per-point frame is then used directly in mesh generation so loops never
 * produce the degenerate worldUp x tangent = 0 case that the old code suffered.
 *
 * Performance target: <5ms generation time, <2ms collision per frame
 */
export class Track {
  private mesh!: THREE.Mesh;
  private collider: RAPIER.Collider | null = null;
  private wallCollider: RAPIER.Collider | null = null;       // Separate wall collider
  private rigidBody: RAPIER.RigidBody | null = null;          // Static rigid body for road
  private wallRigidBody: RAPIER.RigidBody | null = null;      // Static rigid body for walls
  private spline!: THREE.CatmullRomCurve3;
  private framePoints: FramePoint[] = [];  // Frame-transport control points
  private trackData: TrackData;
  private physicsWorld: PhysicsWorld; // Store reference for cleanup
  private scene: THREE.Scene; // Store reference for obstacle cleanup
  private obstacles: Obstacle[] = []; // Track obstacles
  private scenerySystem: TrackScenerySystem | null = null; // Track scenery system
  private backgroundSystem: BackgroundSystem | null = null; // Distant background system
  /** Whether the track's end point was detected to close back to its start. */
  private isClosed: boolean = false;

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
    // Generate track geometry via frame-transport
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

  // ---------------------------------------------------------------------------
  // Background system helpers (unchanged from previous version)
  // ---------------------------------------------------------------------------

  /**
   * Initialize background system based on track data
   */
  private async initializeBackground(backgroundType: string): Promise<void> {
    if (!this.backgroundSystem) return;
    const bgType = this.parseBackgroundType(backgroundType);
    const config = this.getBackgroundConfig(bgType);
    await this.backgroundSystem.setBackground(bgType, config);
  }

  private parseBackgroundType(type: string): BackgroundType {
    switch (type.toLowerCase()) {
      case 'desert':   return 'desert';
      case 'city':     return 'city';
      case 'mountain': return 'mountain';
      case 'forest':   return 'forest';
      default:         return 'none';
    }
  }

  private getBackgroundConfig(type: BackgroundType): Partial<{
    distance: number;
    parallaxFactor: number;
    enableClouds: boolean;
    enableAtmosphericEffects: boolean;
  }> {
    switch (type) {
      case 'desert':   return { distance: 1200, parallaxFactor: 0.25, enableClouds: false, enableAtmosphericEffects: true };
      case 'city':     return { distance:  800, parallaxFactor: 0.35, enableClouds: false, enableAtmosphericEffects: false };
      case 'mountain': return { distance: 1500, parallaxFactor: 0.20, enableClouds: true,  enableAtmosphericEffects: false };
      case 'forest':   return { distance: 1000, parallaxFactor: 0.30, enableClouds: true,  enableAtmosphericEffects: false };
      default:         return {};
    }
  }

  /**
   * Update background system (parallax and clouds).
   * Call from game loop for animated backgrounds. Performance: <0.3ms per frame.
   */
  updateBackground(deltaTime: number): void {
    if (this.backgroundSystem) {
      this.backgroundSystem.update(deltaTime);
    }
  }

  // ---------------------------------------------------------------------------
  // Frame-transport spline generation
  // ---------------------------------------------------------------------------

  /**
   * Generates the track centerline using frame transport.
   *
   * A running orthonormal frame {forward, up, right} is carried through every
   * section. Each section emits FramePoint records that store both the 3-D
   * position AND the complete orientation at that point. This makes the mesh
   * builder section-type-agnostic: it simply reads the stored frame.
   *
   * After all sections are processed a closure check determines whether
   * CatmullRomCurve3 should be created with closed=true.
   *
   * @param sections - Array of track section definitions (JSON schema unchanged)
   */
  private generateSpline(sections: TrackSection[]): void {
    // Initial frame: start at Y=0.5 (avoids Z-fighting with ground), face +Z.
    // Convention: right = cross(up, forward) = cross(Y, Z) = X (world right)
    let frame: TransportFrame = {
      position: new THREE.Vector3(0, 0.5, 0),
      forward:  new THREE.Vector3(0, 0, 1),
      up:       new THREE.Vector3(0, 1, 0),
      right:    new THREE.Vector3(1, 0, 0), // cross(up,fwd) = cross(Y,Z) = X ✓
    };

    const allFramePoints: FramePoint[] = [];

    for (const section of sections) {
      const sectionPoints = this.generateSectionFramePoints(section, frame);

      // Append: skip the duplicate start point on sections after the first
      if (allFramePoints.length === 0) {
        allFramePoints.push(...sectionPoints);
      } else {
        allFramePoints.push(...sectionPoints.slice(1));
      }

      // Advance the running frame to the end of this section
      if (sectionPoints.length > 0) {
        const last = sectionPoints[sectionPoints.length - 1];
        frame = {
          position: last.position.clone(),
          forward:  last.forward.clone(),
          up:       last.up.clone(),
          right:    last.right.clone(),
        };
      }
    }

    this.framePoints = allFramePoints;

    // Detect closure: end ≈ start (within 1 m) AND headings aligned (dot > 0.99)
    const CLOSURE_DIST_SQ = 1.0 * 1.0; // 1 metre squared
    const CLOSURE_DOT     = 0.99;
    const firstFP = allFramePoints[0];
    const lastFP  = allFramePoints[allFramePoints.length - 1];
    const distSq  = firstFP.position.distanceToSquared(lastFP.position);
    const dot     = firstFP.forward.dot(lastFP.forward);
    this.isClosed = distSq < CLOSURE_DIST_SQ && dot > CLOSURE_DOT;

    // Build CatmullRomCurve3 from the centerline positions only
    const splinePositions = allFramePoints.map(fp => fp.position.clone());
    this.spline = new THREE.CatmullRomCurve3(splinePositions, this.isClosed);

    console.log(
      `Spline generated: ${allFramePoints.length} frame-points, ` +
      `closed=${this.isClosed} (distSq=${distSq.toFixed(2)}, dot=${dot.toFixed(3)})`
    );
  }

  /**
   * Generates FramePoint records for one track section.
   *
   * Each section type transforms the incoming transport frame and emits a
   * sequence of FramePoints with C1-continuous tangent directions.
   *
   * @param section - Section configuration
   * @param startFrame - Incoming transport frame (orthonormal)
   * @returns Array of FramePoints including the start point
   */
  private generateSectionFramePoints(
    section: TrackSection,
    startFrame: TransportFrame
  ): FramePoint[] {

    const frameToPoint = (f: TransportFrame, banking: number): FramePoint => ({
      position: f.position.clone(),
      forward:  f.forward.clone(),
      up:       f.up.clone(),
      right:    f.right.clone(),
      banking,
    });

    switch (section.type) {

      // ------------------------------------------------------------------
      // STRAIGHT: step along current forward, frame unchanged
      // ------------------------------------------------------------------
      case 'straight': {
        const length    = section.length || 50;
        const divisions = Math.max(2, Math.round(length / 10)); // ~1 point per 10 m
        const points: FramePoint[] = [];

        // Clone to avoid mutating the caller's frame
        const f: TransportFrame = {
          position: startFrame.position.clone(),
          forward:  startFrame.forward.clone(),
          up:       startFrame.up.clone(),
          right:    startFrame.right.clone(),
        };

        for (let i = 0; i <= divisions; i++) {
          points.push(frameToPoint(f, 0));
          if (i < divisions) {
            const step = length / divisions;
            f.position.addScaledVector(f.forward, step);
          }
        }
        return points;
      }

      // ------------------------------------------------------------------
      // CURVE: rotate forward (and right) about the frame's UP axis.
      // This means the turn follows the local-horizontal plane, so an
      // incoming pitched frame will curve along a banked surface correctly.
      // ------------------------------------------------------------------
      case 'curve': {
        const radius    = section.radius || 30;
        const angleDeg  = section.angle  || 90;
        const angleRad  = (angleDeg * Math.PI) / 180;
        const divisions = Math.max(20, Math.round(Math.abs(angleDeg) * 0.4));
        return this.buildArcFramePoints(startFrame, radius, angleRad, divisions, 0);
      }

      // ------------------------------------------------------------------
      // BANK: like CURVE but additionally rolls up/right about forward.
      // Banking is eased in the first 25%, held through middle, eased out
      // in the last 25% (preserving the original easing intent).
      //
      // Convention: positive angle = LEFT turn.
      // For a left banked curve, the left edge should be higher (bank tilts
      // the road surface toward the turn centre, which is to the left).
      // The maxBanking sign: positive maxBanking tilts the road surface so
      // the left edge (at -right) is higher → up vector tilts toward +right.
      // ------------------------------------------------------------------
      case 'bank': {
        const radius     = section.radius  || 40;
        const angleDeg   = section.angle   || 90;
        const angleRad   = (angleDeg * Math.PI) / 180;
        const maxBankDeg = section.banking || 15;
        const maxBankRad = (maxBankDeg * Math.PI) / 180;
        const divisions  = Math.max(20, Math.round(Math.abs(angleDeg) * 0.4));

        return this.buildArcFramePoints(
          startFrame, radius, angleRad, divisions,
          maxBankRad
        );
      }

      // ------------------------------------------------------------------
      // RAMP: pitch the frame forward/up about the RIGHT axis.
      // Uses a sine-eased height profile for C1 continuity at entry/exit.
      // The pitch is derived from the slope at each step, so the forward
      // vector always points along the ramp surface and carries correctly
      // into the next section.
      // ------------------------------------------------------------------
      case 'ramp': {
        const length    = section.length || 30;
        const height    = section.height || 5;
        const divisions = Math.max(8, Math.round(length / 5));
        const points: FramePoint[] = [];

        // The ramp is traced in the local forward/up plane.
        // We compute the height at each parameter using a smooth sine curve:
        //   h(t) = height * 0.5 * (1 - cos(π * t))
        // This gives h(0)=0, h(1)=height with zero first-derivative at both
        // ends — matching whatever pitch the incoming frame has.

        // Direct placement avoids elevation drift: each point's HORIZONTAL distance
        // is exactly length*t and its HEIGHT is exactly h(t), so the ramp climbs by
        // precisely `height` and never over-counts elevation. (The previous approach
        // advanced along the PITCHED forward by horizontalStep AND added dh, which
        // double-counted height and leaked tens of metres of climb into the long
        // banks that follow.)  h(t)=height*0.5*(1-cos(πt)): h(0)=0, h(1)=height, flat ends.
        const startPos = startFrame.position.clone();
        const horizFwd = new THREE.Vector3(startFrame.forward.x, 0, startFrame.forward.z);
        if (horizFwd.lengthSq() < 1e-6) horizFwd.copy(startFrame.forward);
        horizFwd.normalize();
        const right = startFrame.right.clone();
        const WORLD_UP = new THREE.Vector3(0, 1, 0);
        const heightAt = (t: number) => height * 0.5 * (1 - Math.cos(Math.PI * t));

        let prevPos = startPos.clone();
        for (let i = 0; i <= divisions; i++) {
          const t = i / divisions;
          const pos = startPos.clone()
            .addScaledVector(horizFwd, length * t)
            .addScaledVector(WORLD_UP, heightAt(t));

          // Forward = surface tangent (finite difference); flat at the ends.
          const forward = i === 0 ? horizFwd.clone() : pos.clone().sub(prevPos).normalize();
          // up = cross(forward, right) keeps the convention right = cross(up, forward).
          const up = new THREE.Vector3().crossVectors(forward, right).normalize();
          points.push({ position: pos, forward, up, right: right.clone(), banking: 0 });
          prevPos = pos.clone();
        }

        // Force the exit exactly level so following sections (esp. long banks) don't
        // inherit residual pitch. Net elevation change is unaffected.
        const exit = points[points.length - 1];
        exit.forward.copy(horizFwd);
        exit.up.copy(WORLD_UP);
        exit.right.crossVectors(exit.up, exit.forward).normalize();
        return points;
      }

      // ------------------------------------------------------------------
      // LOOP: full 360-degree vertical circle traced about the RIGHT axis.
      // The frame returns to its original orientation after the loop.
      // This is the case that broke the old Frenet code when tangent ≈ up.
      // Frame transport handles it naturally: we just keep pitching forward/up
      // about right by equal angular increments.
      // ------------------------------------------------------------------
      case 'loop': {
        const loopRadius = section.radius || 15;
        const divisions  = 36; // 10 degrees per step — smooth enough
        const fullAngle  = Math.PI * 2;
        const points: FramePoint[] = [];

        // The loop center is above the entry point along the frame's UP axis
        // (at the start the vehicle is at the bottom of the loop).
        // Loop center = position + up * loopRadius
        const loopCenter = new THREE.Vector3()
          .copy(startFrame.position)
          .addScaledVector(startFrame.up, loopRadius);

        const f: TransportFrame = {
          position: startFrame.position.clone(),
          forward:  startFrame.forward.clone(),
          up:       startFrame.up.clone(),
          right:    startFrame.right.clone(),
        };

        // Pitch quaternion per step: rotate about RIGHT by dAngle
        const dAngle = fullAngle / divisions;

        for (let i = 0; i <= divisions; i++) {
          // Compute position on the loop circle
          const theta = dAngle * i;
          // From center, go -up * radius at theta=0 (bottom), then rotate
          const sinT = Math.sin(theta);
          const cosT = Math.cos(theta);

          // Position = loopCenter - up*R*cosT + forward*R*sinT
          // (at theta=0: pos = loopCenter - up*R = startPos ✓)
          const pos = new THREE.Vector3()
            .copy(loopCenter)
            .addScaledVector(startFrame.up, -loopRadius * cosT)
            .addScaledVector(startFrame.forward, loopRadius * sinT);

          // Forward direction: derivative of position w.r.t. theta, normalised
          // d/dtheta(loopCenter - up*R*cosT + forward*R*sinT)
          //   = up*R*sinT + forward*R*cosT
          const fwd = new THREE.Vector3()
            .copy(startFrame.up).multiplyScalar(sinT)
            .addScaledVector(startFrame.forward, cosT)
            .normalize();

          // Up direction: points FROM the car's position TOWARD the loop center
          // (inward radial = centripetal direction = the car's local "up" as it
          // traverses the loop). This is the direction the suspension pushes:
          //   - theta=0 (bottom): upLoop = +startFrame.up  (matches the flat straight)
          //   - theta=180 (top):  upLoop = -startFrame.up  (car is inverted)
          //
          // PREVIOUS BUG: used (pos - loopCenter) which is the OUTWARD radial, causing
          // the track surface normal to flip 180° at the loop entry (straight→loop
          // junction) and producing an inside-out collision mesh that ejected the car.
          const upLoop = new THREE.Vector3().subVectors(loopCenter, pos).normalize();

          // right = cross(up, forward) — consistent convention throughout Track.ts.
          // At theta=0: right = cross(+Y, +Z) = (+X) ✓ matches the entry frame.
          const right = new THREE.Vector3().crossVectors(upLoop, fwd).normalize();

          points.push({
            position: pos,
            forward:  fwd,
            up:       upLoop,
            right:    right,
            banking:  0,
          });
        }

        // Update the running frame to the end-of-loop orientation
        // (should match startFrame — loop returns to original)
        void f; // f was declared but we directly computed each point above
        return points;
      }

      default:
        console.warn(`Unknown section type: ${section.type}`);
        return [{
          position: startFrame.position.clone(),
          forward:  startFrame.forward.clone(),
          up:       startFrame.up.clone(),
          right:    startFrame.right.clone(),
          banking:  0,
        }];
    }
  }

  /**
   * Builds FramePoints for a circular arc in the local-horizontal plane.
   *
   * Convention (matching the original track code):
   *   positive angleRad → LEFT turn (arc center is to the LOCAL LEFT = -right direction)
   *   negative angleRad → RIGHT turn (arc center is to the LOCAL RIGHT = +right direction)
   *
   * This means `right = cross(up, forward)` so that the initial frame at start of the
   * arc has `spoke0 = right` and the tangent formula gives `forward` at theta=0.
   *
   * Spoke rotation: CCW about `up` by `angleRad` (positive = CCW = left turn viewed from above).
   *   spoke(theta) = spoke0*cos(theta) + cross(up, spoke0)*sin(theta)
   * Tangent (= forward):
   *   fwd(theta) = d(spoke)/dtheta = (-spoke0*sin + cross(up,spoke0)*cos).normalize()
   *
   * Optional banking rolls up about forward using ease-in/mid/ease-out profile.
   *
   * @param startFrame   - Incoming transport frame (right = cross(up, forward))
   * @param radius       - Arc radius in metres (always positive)
   * @param angleRad     - Signed arc angle in radians (positive=left, negative=right)
   * @param divisions    - Number of arc steps
   * @param maxBanking   - Maximum roll in radians at centre of arc (0 = no banking)
   */
  private buildArcFramePoints(
    startFrame: TransportFrame,
    radius: number,
    angleRad: number,
    divisions: number,
    maxBanking: number
  ): FramePoint[] {
    const points: FramePoint[] = [];
    const dAngle = angleRad / divisions;

    // Convention: positive angleRad = LEFT turn (matching original JSON angle convention).
    // Arc center is to the LOCAL LEFT: center = startPos - right * radius.
    // In local 2D coordinates {right=R, forward=F}:
    //   center_local = (-R, 0)
    //   spoke at arc_angle_i: (cos(arc_angle_i), sin(arc_angle_i))
    //   pos_local_i = center_local + R*(cos(arc_angle_i), sin(arc_angle_i))
    //     at i=0: (0, 0) = startPos ✓
    //   forward_local_i = (-sin(arc_angle_i), cos(arc_angle_i)) — tangent of arc
    //     at i=0: (0, 1) = forward ✓  at i=full: rotated by angleRad ✓
    const center = new THREE.Vector3()
      .copy(startFrame.position)
      .addScaledVector(startFrame.right, -radius);

    // Pre-cache the frame axes (they don't change per step)
    const sf_right   = startFrame.right.clone();
    const sf_forward = startFrame.forward.clone();

    for (let i = 0; i <= divisions; i++) {
      const t = i / divisions;

      // 2D local arc parameterisation in {right, forward} coordinates:
      //   arc_angle increases from 0 to angleRad (positive = left turn, CCW from above)
      //   spoke_local = (cos(arc_angle), sin(arc_angle))  → starts at (1,0) = right ✓
      //   fwd_local   = (-sin(arc_angle), cos(arc_angle)) → starts at (0,1) = fwd ✓
      const arcAngle    = dAngle * i;
      const localSpokeR = Math.cos(arcAngle); // component along right
      const localSpokeF = Math.sin(arcAngle); // component along forward
      const localFwdR   = -Math.sin(arcAngle); // forward component along right
      const localFwdF   =  Math.cos(arcAngle); // forward component along forward

      // World position: center + right*localSpokeR*R + fwd*localSpokeF*R
      const posW = new THREE.Vector3()
        .copy(center)
        .addScaledVector(sf_right,   localSpokeR * radius)
        .addScaledVector(sf_forward, localSpokeF * radius);

      // World forward: right*localFwdR + fwd*localFwdF (already unit length — no normalize needed
      // but we do it anyway to kill any floating-point drift)
      const fwdW = new THREE.Vector3()
        .copy(sf_right).multiplyScalar(localFwdR)
        .addScaledVector(sf_forward, localFwdF)
        .normalize();

      // Start with the incoming up (no banking yet)
      let up = startFrame.up.clone();

      // Apply banking: ease-in 0–25%, full 25–75%, ease-out 75–100%
      let bankingProgress: number;
      if (t < 0.25) {
        bankingProgress = t / 0.25;
      } else if (t > 0.75) {
        bankingProgress = (1 - t) / 0.25;
      } else {
        bankingProgress = 1.0;
      }
      const banking = maxBanking * bankingProgress;

      if (Math.abs(banking) > 1e-5) {
        // Roll up about forward by banking angle.
        // Rodrigues (fwd·up = 0):  up' = up*cosB + (fwd × up)*sinB
        const cosB = Math.cos(banking);
        const sinB = Math.sin(banking);
        const crossFwd = new THREE.Vector3().crossVectors(fwdW, up);
        up = new THREE.Vector3()
          .copy(up).multiplyScalar(cosB)
          .addScaledVector(crossFwd, sinB)
          .normalize();
      }

      // right = cross(up, fwd) — convention throughout
      const rightW = new THREE.Vector3().crossVectors(up, fwdW).normalize();

      points.push({ position: posW, forward: fwdW, up, right: rightW, banking });
    }

    return points;
  }

  // ---------------------------------------------------------------------------
  // Mesh generation
  // ---------------------------------------------------------------------------

  /**
   * Generates visual track mesh from the stored FramePoints.
   *
   * Cross-sections are built from the stored per-point {right, up} axes.
   * This avoids the worldUp×tangent degeneracy that broke loops in the old code.
   *
   * UV Mapping:
   *   U (0–1): across track width from left to right per profile entry
   *   V: accumulated arc-length along centerline, tiled every 2 m
   *
   * The road surface (profile indices 3–5) and walls (profile indices 0–2, 6–8)
   * are kept in separate material groups (same mesh). The road-only collider
   * uses only the road-surface triangle index range so wheel raycasts never
   * catch wall edges.
   *
   * @param width - Track width in metres
   * @returns THREE.Mesh ready for rendering
   */
  private generateMesh(width: number): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();

    // Resample the spline to get uniformly-spaced positions for rendering.
    // We use ~3 points per stored frame-point for smooth visual geometry.
    const controlPointCount = this.framePoints.length;
    const numPoints = Math.max(controlPointCount * 3, 100);

    console.log(`Tessellating track: ${controlPointCount} frame-points → ${numPoints} mesh points`);
    const splinePoints = this.spline.getPoints(numPoints);

    const vertices: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];

    // Accumulate arc-length for V texture coordinate
    const distanceAccum: number[] = [0];
    for (let i = 1; i < splinePoints.length; i++) {
      distanceAccum.push(
        distanceAccum[distanceAccum.length - 1] +
        splinePoints[i].distanceTo(splinePoints[i - 1])
      );
    }

    const textureScale = 2.0; // Texture repeats every 2 m

    // Track cross-section profile (left to right).
    // mat: 0=asphalt, 1=white line, 2=yellow line, 3=concrete, 4=wall
    // isRoad: true for the drivable surface (road collider), false for walls
    const profile = [
      { x: -width / 2 - 1.5, y: 1.5, u: 0.00, mat: 4, isRoad: false }, // 0: Left Wall Top
      { x: -width / 2 - 1.5, y: 0.0, u: 0.10, mat: 3, isRoad: false }, // 1: Left Wall Base
      { x: -width / 2 - 0.2, y: 0.0, u: 0.20, mat: 1, isRoad: false }, // 2: Left Apron Edge
      { x: -width / 2,       y: 0.0, u: 0.25, mat: 0, isRoad: true  }, // 3: Left White Line
      { x: 0,                y: 0.0, u: 0.50, mat: 0, isRoad: true  }, // 4: Center
      { x:  width / 2,       y: 0.0, u: 0.75, mat: 1, isRoad: true  }, // 5: Right White Line
      { x:  width / 2 + 0.2, y: 0.0, u: 0.80, mat: 3, isRoad: false }, // 6: Right Apron Edge
      { x:  width / 2 + 1.5, y: 0.0, u: 0.90, mat: 4, isRoad: false }, // 7: Right Wall Base
      { x:  width / 2 + 1.5, y: 1.5, u: 1.00, mat: -1,isRoad: false }, // 8: Right Wall Top
    ];

    // Number of material groups (5: asphalt, white_line, yellow_line, concrete, wall)
    const indicesByMaterial: number[][] = [[], [], [], [], []];

    // We only emit vertices for the segment range, not the last wrap-around vertex.
    const numSegments = splinePoints.length - 1;

    for (let i = 0; i < numSegments; i++) {
      const point = splinePoints[i];

      // Retrieve the frame at this parameter via interpolation from stored FramePoints.
      // The parameter t maps linearly into the framePoints array.
      const { fwdI, upI } = this.getFrameAtSplineIndex(i, numSegments);

      const vCoord = distanceAccum[i] / textureScale;

      // right = cross(up, forward) — convention throughout; recompute per ring from interpolated frame
      const rightI = this.tempVec3.crossVectors(upI, fwdI).normalize();

      for (const p of profile) {
        // Cross-section vertex: offset along right (lateral) and up (normal)
        const wx = point.x + rightI.x * p.x + upI.x * p.y;
        const wy = point.y + rightI.y * p.x + upI.y * p.y;
        const wz = point.z + rightI.z * p.x + upI.z * p.y;

        vertices.push(wx, wy, wz);
        uvs.push(p.u, vCoord);

        // Surface normal: upward component of the local frame
        if (p.y > 0 && p.x < 0) {
          // Left wall: normal faces right (inward)
          normals.push(rightI.x, rightI.y, rightI.z);
        } else if (p.y > 0 && p.x > 0) {
          // Right wall: normal faces left (inward)
          normals.push(-rightI.x, -rightI.y, -rightI.z);
        } else {
          // Road surface: normal is the track up vector
          normals.push(upI.x, upI.y, upI.z);
        }
      }
    }

    // Generate triangle indices (quad strips per profile span)
    for (let i = 0; i < numSegments; i++) {
      const base     = i * profile.length;
      const nextBase = ((i + 1) % numSegments) * profile.length;

      for (let j = 0; j < profile.length - 1; j++) {
        const mat = profile[j].mat;
        if (mat >= 0) {
          // Triangle 1
          indicesByMaterial[mat].push(base + j,     base + j + 1,     nextBase + j);
          // Triangle 2
          indicesByMaterial[mat].push(base + j + 1, nextBase + j + 1, nextBase + j);
        }
      }
    }

    // Flatten indices
    const allIndices: number[] = [];
    const materialLib = MaterialLibrary.getInstance();
    const defaultMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.FrontSide,
    });

    const materials = [
      materialLib.getMaterial('asphalt')           || defaultMat,
      materialLib.getMaterial('painted_line_white') || defaultMat,
      materialLib.getMaterial('painted_line_yellow')|| defaultMat,
      materialLib.getMaterial('concrete')           || defaultMat,
      materialLib.getMaterial('concrete_barrier')   || defaultMat,
    ];

    for (let m = 0; m < materials.length; m++) {
      const start = allIndices.length;
      const count = indicesByMaterial[m].length;
      allIndices.push(...indicesByMaterial[m]);
      if (count > 0) {
        geometry.addGroup(start, count, m);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,      2));
    geometry.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,  3));
    geometry.setIndex(allIndices);

    geometry.computeVertexNormals(); // Smooth shading

    const mesh = new THREE.Mesh(geometry, materials);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = 'track-mesh';

    console.log(
      `Track mesh generated: ${vertices.length / 3} vertices, ${allIndices.length / 3} triangles`
    );

    return mesh;
  }

  /**
   * Interpolates the transport frame at a given spline sample index.
   *
   * Maps the linear spline-sample index back into the FramePoints array
   * and linearly interpolates forward and up between neighbouring frames.
   *
   * @param sampleIndex  - Index into the spline sample array (0 … numSegments-1)
   * @param numSegments  - Total number of spline segments
   * @returns Interpolated {fwdI, upI} unit vectors
   */
  private getFrameAtSplineIndex(
    sampleIndex: number,
    numSegments: number
  ): { fwdI: THREE.Vector3; upI: THREE.Vector3 } {
    const n = this.framePoints.length;
    if (n === 0) {
      return { fwdI: new THREE.Vector3(0, 0, 1), upI: new THREE.Vector3(0, 1, 0) };
    }

    const t = sampleIndex / numSegments;
    const rawIdx = t * (n - 1);
    const i0 = Math.max(0, Math.min(n - 2, Math.floor(rawIdx)));
    const i1 = i0 + 1;
    const frac = rawIdx - i0;

    const fp0 = this.framePoints[i0];
    const fp1 = this.framePoints[i1 < n ? i1 : n - 1];

    const fwdI = new THREE.Vector3().lerpVectors(fp0.forward, fp1.forward, frac).normalize();
    const upI  = new THREE.Vector3().lerpVectors(fp0.up,      fp1.up,      frac).normalize();

    return { fwdI, upI };
  }

  // ---------------------------------------------------------------------------
  // Collider generation — road surface + walls as separate colliders
  // ---------------------------------------------------------------------------

  /**
   * Generates physics collision geometry for the track.
   *
   * Creates TWO Rapier colliders attached to separate static rigid bodies:
   *   1. Road-surface collider — only the drivable ribbon (profile entries where
   *      isRoad=true). Wheel raycasts hit this. No wall edges to catch on.
   *   2. Wall collider — the raised barrier quads. Stops the chassis but
   *      downward wheel rays cannot reach it.
   *
   * Degenerate triangles (zero-area, cross-product length < 1e-8) are dropped
   * before submitting to Rapier, preventing silent grip loss in the vehicle code.
   *
   * @param world - Physics world to create colliders in
   */
  private generateCollider(world: PhysicsWorld): void {
    if (!world.world) {
      throw new Error('Physics world not initialized - cannot create track collider');
    }

    const positionAttr = this.mesh.geometry.attributes.position;
    const indexAttr    = this.mesh.geometry.index;

    if (!positionAttr || !indexAttr) {
      throw new Error('Track mesh missing position or index attributes - cannot create collider');
    }
    if (!positionAttr.array || !indexAttr.array) {
      throw new Error('Track mesh attributes have no data - cannot create collider');
    }

    // ---- Split indices into road-surface and wall sets ----
    // Profile layout (9 entries per cross-section ring):
    //   0=LeftWallTop, 1=LeftWallBase, 2=LeftApronEdge — wall (non-road)
    //   3=LeftWhiteLine, 4=Center, 5=RightWhiteLine     — road
    //   6=RightApronEdge, 7=RightWallBase, 8=RightWallTop — wall (non-road)
    //
    // The material groups set in generateMesh map:
    //   mat 0 (asphalt): profile j=3 and j=4 → road
    //   mat 1 (white_line): profile j=2 and j=5 — j=2 is apron (wall), j=5 is road
    //   mat 3 (concrete): profile j=1 and j=6 → wall
    //   mat 4 (wall/concrete_barrier): profile j=0 and j=7 → wall
    //
    // Rather than reconstructing from material groups we take a simpler approach:
    // read all triangles from the index buffer and classify them by which
    // profile strip they came from. Profile strip j covers vertices [base+j, base+j+1]
    // across consecutive rings. Strip j is "road" when profile[j].isRoad is true.
    //
    // Profile isRoad flags (indices 0–8): F F F T T T F F F (F=false, T=true)
    // Strip j=3 (left white line → center): road
    // Strip j=4 (center → right white line): road
    // All others: wall

    const PROFILE_LENGTH = 9;
    const ROAD_STRIP_MIN = 3; // inclusive
    const ROAD_STRIP_MAX = 5; // exclusive (strips 3 and 4 are road)

    const verts   = new Float32Array(positionAttr.array);
    const indices = Array.from(indexAttr.array) as number[];
    const numSegments = Math.round(verts.length / (3 * PROFILE_LENGTH));

    // Classify each triangle as road or wall based on which profile strip it belongs to.
    // A quad strip for ring i, strip j is formed by vertices:
    //   (i*PROFILE_LENGTH + j), (i*PROFILE_LENGTH + j+1),
    //   ((i+1)%numSegments*PROFILE_LENGTH + j), ...
    // We classify by finding the minimum vertex index modulo PROFILE_LENGTH.
    const roadIndices: number[] = [];
    const wallIndices: number[] = [];

    const triangleCount = indices.length / 3;

    for (let tri = 0; tri < triangleCount; tri++) {
      const a = indices[tri * 3 + 0];
      const b = indices[tri * 3 + 1];
      const c = indices[tri * 3 + 2];

      // Skip degenerate triangles: check area via cross product
      const ax = verts[a * 3],     ay = verts[a * 3 + 1], az = verts[a * 3 + 2];
      const bx = verts[b * 3],     by = verts[b * 3 + 1], bz = verts[b * 3 + 2];
      const cx = verts[c * 3],     cy = verts[c * 3 + 1], cz = verts[c * 3 + 2];

      const ex = bx - ax, ey = by - ay, ez = bz - az;
      const fx = cx - ax, fy = cy - ay, fz = cz - az;
      const crossX = ey * fz - ez * fy;
      const crossY = ez * fx - ex * fz;
      const crossZ = ex * fy - ey * fx;
      const areaSq = crossX * crossX + crossY * crossY + crossZ * crossZ;

      if (areaSq < 1e-14) continue; // degenerate — drop

      // Determine which profile strip: minimum local vertex index (mod PROFILE_LENGTH)
      const localA = a % PROFILE_LENGTH;
      const localB = b % PROFILE_LENGTH;
      const localC = c % PROFILE_LENGTH;
      const minLocal = Math.min(localA, localB, localC);

      // Profile strip j spans local indices j and j+1
      // A triangle is road if its strip j falls in [ROAD_STRIP_MIN, ROAD_STRIP_MAX)
      const isRoadStrip = minLocal >= ROAD_STRIP_MIN && minLocal < ROAD_STRIP_MAX;

      if (isRoadStrip) {
        roadIndices.push(a, b, c);
      } else {
        wallIndices.push(a, b, c);
      }
    }

    // Create static rigid body for road surface
    const roadRbDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0);
    this.rigidBody = world.world.createRigidBody(roadRbDesc);

    if (roadIndices.length >= 3) {
      const roadColliderDesc = RAPIER.ColliderDesc.trimesh(
        verts,
        new Uint32Array(roadIndices)
      );
      roadColliderDesc.setFriction(1.0);
      // Collision group: membership = groups 0+1 (0x0003), filter = group 0 only (0x0001).
      //
      // The vehicle's wheel RAYCASTs use filter=0xffff0001 (detect group 0), so they still
      // detect the road surface for suspension forces — this is unchanged.
      //
      // The vehicle CHASSIS BOX collider is set to membership=group1 (0x0002), filter=0x0001.
      // road_filter (0x0001) & chassis_membership (0x0002) = 0 → road does NOT generate
      // chassis contacts. This prevents the loop's curved road surface from decelerating
      // the car through unwanted chassis-road collisions (the loop backward-section road
      // at ~1–2 m height would otherwise block the car mid-approach).
      //
      // Wall and ground colliders retain default groups and still stop the chassis normally.
      roadColliderDesc.setCollisionGroups(0x00030001);
      this.collider = world.world.createCollider(roadColliderDesc, this.rigidBody);
    }

    // Create separate static rigid body for walls
    if (wallIndices.length >= 3) {
      const wallRbDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0);
      this.wallRigidBody = world.world.createRigidBody(wallRbDesc);

      const wallColliderDesc = RAPIER.ColliderDesc.trimesh(
        verts,
        new Uint32Array(wallIndices)
      );
      wallColliderDesc.setFriction(0.5);
      this.wallCollider = world.world.createCollider(wallColliderDesc, this.wallRigidBody);
    }

    const roadTriCount = roadIndices.length / 3;
    const wallTriCount = wallIndices.length / 3;
    console.log(
      `Track collider created: ${verts.length / 3} vertices, ` +
      `${roadTriCount} road triangles, ${wallTriCount} wall triangles, ` +
      `isSensor=${this.collider?.isSensor?.() ?? false}, ` +
      `handle=${this.collider?.handle ?? 'none'}`
    );
  }

  // ---------------------------------------------------------------------------
  // Debug mesh (unchanged public API)
  // ---------------------------------------------------------------------------

  /**
   * Creates a debug wireframe overlay of the collision mesh.
   *
   * @param scene - Three.js scene to add debug mesh to
   * @returns Debug mesh (toggle visibility to show/hide)
   */
  public createCollisionDebugMesh(scene: THREE.Scene): THREE.LineSegments {
    console.log('[TRACK DEBUG] Creating collision debug visualization...');

    if (!this.collider) {
      throw new Error('Cannot create debug mesh - collider not initialized');
    }

    const positionAttr = this.mesh.geometry.attributes.position;
    const indexAttr    = this.mesh.geometry.index;

    if (!positionAttr || !indexAttr) {
      throw new Error('Mesh missing attributes for debug visualization');
    }

    const wireframeGeometry = new THREE.BufferGeometry();
    wireframeGeometry.setAttribute('position', positionAttr.clone());
    wireframeGeometry.setIndex(indexAttr.clone());

    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      linewidth: 2,
      transparent: true,
      opacity: 0.6,
      depthTest: true,
    });

    const edgesGeometry = new THREE.EdgesGeometry(wireframeGeometry, 15);
    const debugMesh = new THREE.LineSegments(edgesGeometry, wireframeMaterial);
    debugMesh.position.y = 0.05;
    debugMesh.name = 'track-collision-debug';

    scene.add(debugMesh);
    console.log('[TRACK DEBUG] Collision debug mesh created and added to scene');
    console.log(`[TRACK DEBUG] Collision mesh has ${positionAttr.count} vertices, ${indexAttr.count / 3} triangles`);

    return debugMesh;
  }

  // ---------------------------------------------------------------------------
  // Waypoint auto-generation
  // ---------------------------------------------------------------------------

  /**
   * Automatically generates waypoints at section boundaries.
   *
   * Uses the same arc-length estimation as before so the waypoint positions
   * land on the actual spline. The first waypoint is the checkpoint.
   *
   * @param sections - Array of track section definitions
   * @returns Generated WaypointData array
   */
  private generateWaypoints(sections: TrackSection[]): WaypointData[] {
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
          const angle  = ((section.angle || 90) * Math.PI) / 180;
          sectionLength = radius * Math.abs(angle);
          break;
        }
        case 'ramp': {
          const length = section.length || 30;
          const height = section.height || 5;
          sectionLength = Math.sqrt(length * length + height * height);
          break;
        }
        case 'loop': {
          const loopRadius = section.radius || 15;
          sectionLength = Math.PI * 2 * loopRadius;
          break;
        }
        case 'bank': {
          const radius = section.radius || 40;
          const angle  = ((section.angle || 90) * Math.PI) / 180;
          sectionLength = radius * Math.abs(angle);
          break;
        }
        default:
          sectionLength = 50;
      }
      sectionLengths.push(sectionLength);
      totalDistance += sectionLength;
      sectionStartDistances.push(totalDistance);
    }

    const waypoints: WaypointData[] = [];

    for (let i = 0; i < sections.length; i++) {
      const sectionEndDistance = sectionStartDistances[i + 1];
      const t = Math.max(0, Math.min(1, sectionEndDistance / totalDistance));

      const position = this.spline.getPoint(t);
      const tangent  = this.spline.getTangent(t).normalize();

      waypoints.push({
        id: i,
        position:    [position.x, position.y + 0.5, position.z],
        direction:   [tangent.x, 0, tangent.z],
        triggerRadius: 18,
        isCheckpoint: i === 0,
        timeBonus:   i === 0 ? 30 : undefined,
      });
    }

    console.log(`Auto-generated ${waypoints.length} waypoints from ${sections.length} sections`);
    return waypoints;
  }

  // ---------------------------------------------------------------------------
  // Obstacle creation
  // ---------------------------------------------------------------------------

  private createObstacles(
    obstacleData: ObstacleData[] | undefined,
    world: PhysicsWorld,
    scene: THREE.Scene
  ): void {
    if (!obstacleData || obstacleData.length === 0) return;

    for (const data of obstacleData) {
      const position = new THREE.Vector3(data.position[0], data.position[1], data.position[2]);
      const obstacleType =
        data.type === 'cone'      ? ObstacleType.CONE :
        data.type === 'barrier'   ? ObstacleType.BARRIER :
                                    ObstacleType.TIRE_WALL;

      const obstacle = new Obstacle(obstacleType, position, world, scene);
      this.obstacles.push(obstacle);
    }

    console.log(`Created ${this.obstacles.length} obstacles`);
  }

  // ---------------------------------------------------------------------------
  // Public API (stable signatures, unchanged)
  // ---------------------------------------------------------------------------

  /**
   * Gets the track's spawn point for the player vehicle.
   */
  getSpawnPoint(): { position: THREE.Vector3; rotation: THREE.Quaternion } {
    const spawn = this.trackData.spawnPoint;
    return {
      position: new THREE.Vector3(spawn.position[0], spawn.position[1], spawn.position[2]),
      rotation: new THREE.Quaternion(spawn.rotation[0], spawn.rotation[1], spawn.rotation[2], spawn.rotation[3]),
    };
  }

  /**
   * Gets track waypoint data.
   */
  getWaypoints(): WaypointData[] {
    return this.trackData.waypoints || [];
  }

  /** Gets the track name. */
  getName(): string {
    return this.trackData.name;
  }

  /** Gets the track's visual mesh. */
  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  /**
   * Gets the bounding box of the track (for minimap generation).
   */
  getBounds(): THREE.Box3 {
    const box = new THREE.Box3();
    box.setFromObject(this.mesh);
    return box;
  }

  /**
   * Gets surface type at a given position (for tire grip calculation).
   * Currently returns TARMAC for all positions.
   */
  getSurfaceType(_position: THREE.Vector3): SurfaceType {
    return SurfaceType.TARMAC;
  }

  /**
   * Returns whether the track was detected as a closed loop.
   * Useful for camera/minimap systems.
   */
  getIsClosed(): boolean {
    return this.isClosed;
  }

  /**
   * Returns the stored frame points (for camera/chase-cam orientation queries).
   * Read-only — do not mutate.
   */
  getFramePoints(): ReadonlyArray<Readonly<FramePoint>> {
    return this.framePoints;
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

    // Remove road collider + rigid body
    if (this.collider && this.physicsWorld.world) {
      this.physicsWorld.world.removeCollider(this.collider, false);
      this.collider = null;
    }
    if (this.rigidBody && this.physicsWorld.world) {
      this.physicsWorld.world.removeRigidBody(this.rigidBody);
      this.rigidBody = null;
    }

    // Remove wall collider + rigid body
    if (this.wallCollider && this.physicsWorld.world) {
      this.physicsWorld.world.removeCollider(this.wallCollider, false);
      this.wallCollider = null;
    }
    if (this.wallRigidBody && this.physicsWorld.world) {
      this.physicsWorld.world.removeRigidBody(this.wallRigidBody);
      this.wallRigidBody = null;
    }

    console.log(`Track "${this.trackData.name}" disposed`);
  }

  /**
   * Loads track data from JSON file.
   *
   * Only name, sections, and spawnPoint are required; waypoints are optional
   * and will be auto-generated if absent.
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
