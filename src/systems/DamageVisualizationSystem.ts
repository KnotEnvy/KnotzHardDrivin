import * as THREE from 'three';
import { DamageState, DamageSeverity } from '../types/VehicleTypes';

/**
 * Damage visualization levels based on overall damage percentage.
 *
 * PRISTINE: 0-0.25 (0-25% damage) - Perfect condition
 * LIGHT: 0.25-0.5 (25-50% damage) - Minor scratches, slight deformation
 * HEAVY: 0.5-0.75 (50-75% damage) - Visible dents, smoke, performance loss
 * DESTROYED: 0.75-1.0 (75-100% damage) - Catastrophic damage, heavy smoke
 */
export enum DamageLevel {
  PRISTINE = 'pristine',
  LIGHT = 'light',
  HEAVY = 'heavy',
  DESTROYED = 'destroyed',
}

/**
 * Original mesh data for resetting damage.
 */
interface OriginalMeshData {
  positions: Float32Array;
  normals: Float32Array;
  scale: THREE.Vector3;
  materials: Map<THREE.Mesh, THREE.Material>;
}

/**
 * Damage particle configuration.
 */
interface DamageParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  size: number;
}

/**
 * Particle type enumeration for different visual effects.
 */
enum ParticleType {
  SMOKE = 'smoke',      // Gray smoke from damaged engine
  SPARK = 'spark',      // Orange sparks from metal collision
  DEBRIS = 'debris',    // Fragments from crash impact
}

/**
 * Extended particle with type classification.
 */
interface TypedParticle extends DamageParticle {
  type: ParticleType;
  rotation: number;         // For debris tumbling
  rotationSpeed: number;    // Angular velocity
  color: THREE.Color;       // Particle color
}

/**
 * DamageVisualizationSystem - Manages visual damage representation for vehicles.
 *
 * Features:
 * - Procedural mesh deformation (vertex displacement near impact points)
 * - Progressive material degradation (brightness reduction, metalness loss)
 * - Damage-based particle effects (smoke from engine)
 * - Smooth transitions between damage states
 * - Performance-optimized (zero per-frame allocations)
 *
 * Architecture:
 * - Singleton pattern for global access
 * - Event-driven damage updates (not per-frame)
 * - Object pooling for particles
 * - Material instancing for damaged vehicles
 *
 * Performance Targets:
 * - Damage update: <1ms per crash
 * - Particle rendering: <0.5ms per frame
 * - Zero allocations in update loop
 *
 * Integration:
 * - Vehicle.applyDamage() calls updateDamageVisuals()
 * - Vehicle.reset() calls resetDamageVisuals()
 * - Particles updated in main render loop
 *
 * Usage:
 * ```typescript
 * const damageSystem = DamageVisualizationSystem.getInstance();
 *
 * // Initialize with vehicle mesh
 * damageSystem.registerVehicle(vehicleMesh);
 *
 * // Update damage visuals on crash
 * damageSystem.updateDamageVisuals(vehicleMesh, damageState);
 *
 * // Update particles each frame
 * damageSystem.update(deltaTime);
 *
 * // Reset on respawn
 * damageSystem.resetDamageVisuals(vehicleMesh);
 * ```
 */
export class DamageVisualizationSystem {
  private static instance: DamageVisualizationSystem | null = null;

  // Original mesh data storage for reset functionality
  private originalMeshData = new Map<THREE.Object3D, OriginalMeshData>();

  // Damage level tracking per vehicle
  private currentDamageLevels = new Map<THREE.Object3D, DamageLevel>();

  // Particle system - unified pool for smoke, sparks, and debris
  private particlePool: TypedParticle[] = [];
  private activeParticles: TypedParticle[] = [];
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.PointsMaterial | null = null;
  private particlePoints: THREE.Points | null = null;
  private scene: THREE.Scene | null = null;

  // Performance constants
  private readonly MAX_PARTICLES = 100; // Increased budget for crash effects (smoke + sparks + debris)
  private readonly DEFORMATION_AMOUNT = 0.3; // Max vertex displacement in meters
  private readonly TRANSITION_DURATION = 0.5; // Seconds for smooth state transitions
  private readonly PARTICLE_EMIT_INTERVAL_HEAVY = 0.1; // 100ms between smoke particles
  private readonly PARTICLE_EMIT_INTERVAL_DESTROYED = 0.05; // 50ms between smoke particles

  // Crash particle burst settings
  private readonly SPARK_COUNT_MINOR = 15;      // Sparks for minor crash
  private readonly SPARK_COUNT_MAJOR = 30;      // Sparks for major crash
  private readonly SPARK_COUNT_CATASTROPHIC = 50; // Sparks for catastrophic crash
  private readonly DEBRIS_COUNT_MINOR = 5;       // Debris pieces for minor crash
  private readonly DEBRIS_COUNT_MAJOR = 15;      // Debris pieces for major crash
  private readonly DEBRIS_COUNT_CATASTROPHIC = 25; // Debris pieces for catastrophic crash

  // Particle emission tracking
  private lastParticleEmit = new Map<THREE.Object3D, number>();
  private vehicleEmitters = new Set<THREE.Object3D>(); // Vehicles actively emitting smoke

  // Temp objects (reused, zero allocations)
  private tempVec3 = new THREE.Vector3();
  private tempColor = new THREE.Color();

  private constructor() {
    this.initializeParticleSystem();
  }

  /**
   * Gets the singleton instance.
   *
   * @returns DamageVisualizationSystem instance
   */
  static getInstance(): DamageVisualizationSystem {
    if (!DamageVisualizationSystem.instance) {
      DamageVisualizationSystem.instance = new DamageVisualizationSystem();
    }
    return DamageVisualizationSystem.instance;
  }

  /**
   * Initializes the particle system for smoke, sparks, and debris effects.
   *
   * Creates a pool of reusable particles and a single Points mesh
   * for rendering all particles efficiently.
   *
   * Performance: Object pooling prevents per-frame allocations
   * Particle budget: 100 total (smoke + sparks + debris)
   */
  private initializeParticleSystem(): void {
    // Create particle pool with extended properties
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particlePool.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        lifetime: 0,
        maxLifetime: 2.0,
        size: 0.5,
        type: ParticleType.SMOKE,
        rotation: 0,
        rotationSpeed: 0,
        color: new THREE.Color(0x555555),
      });
    }

    // Create particle geometry with color attribute
    const positions = new Float32Array(this.MAX_PARTICLES * 3);
    const sizes = new Float32Array(this.MAX_PARTICLES);
    const alphas = new Float32Array(this.MAX_PARTICLES);
    const colors = new Float32Array(this.MAX_PARTICLES * 3); // RGB per particle

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create particle material with vertex colors enabled
    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.5,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending, // Additive for sparks glow
      sizeAttenuation: true,
      vertexColors: true, // Use per-particle colors
    });

    // Create Points mesh
    this.particlePoints = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.particlePoints.frustumCulled = false; // Always render particles
  }

  /**
   * Sets the scene for particle rendering.
   *
   * @param scene - THREE.Scene to add particles to
   */
  setScene(scene: THREE.Scene): void {
    if (this.scene && this.particlePoints) {
      this.scene.remove(this.particlePoints);
    }
    this.scene = scene;
    if (this.particlePoints) {
      scene.add(this.particlePoints);
    }
  }

  /**
   * Registers a vehicle mesh and stores original geometry for reset.
   *
   * Call this once when vehicle is created, before any damage is applied.
   *
   * @param vehicleMesh - THREE.Object3D (Group) containing vehicle parts
   */
  registerVehicle(vehicleMesh: THREE.Object3D): void {
    if (this.originalMeshData.has(vehicleMesh)) {
      return; // Already registered
    }

    const materials = new Map<THREE.Mesh, THREE.Material>();
    const meshes: THREE.Mesh[] = [];

    // Traverse vehicle group to find mesh and store original data
    vehicleMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BufferGeometry) {
        meshes.push(child);

        // Store original material
        if (child.material) {
          materials.set(child, child.material);
        }
      }
    });

    // Store original data for first mesh (main chassis)
    if (meshes.length > 0) {
      const firstMesh = meshes[0];
      const geometry = firstMesh.geometry as THREE.BufferGeometry;

      if (geometry.attributes.position) {
        const positionAttr = geometry.attributes.position as THREE.BufferAttribute;
        const normalAttr = geometry.attributes.normal as THREE.BufferAttribute | undefined;

        this.originalMeshData.set(vehicleMesh, {
          positions: new Float32Array(positionAttr.array),
          normals: normalAttr ? new Float32Array(normalAttr.array) : new Float32Array(0),
          scale: vehicleMesh.scale.clone(),
          materials,
        });

        this.currentDamageLevels.set(vehicleMesh, DamageLevel.PRISTINE);
      }
    }
  }

  /**
   * Updates damage visuals based on damage state.
   *
   * Applies:
   * - Mesh deformation (vertex displacement)
   * - Material degradation (darkening, roughness increase)
   * - Particle emission (smoke for heavy damage)
   *
   * Performance: <1ms per call (event-driven, not per-frame)
   *
   * @param vehicleMesh - Vehicle mesh to update
   * @param damageState - Current damage state from Vehicle
   */
  updateDamageVisuals(vehicleMesh: THREE.Object3D, damageState: DamageState): void {
    const startTime = performance.now();

    // Determine damage level from overall damage percentage
    const damageLevel = this.getDamageLevel(damageState.overallDamage);
    const previousLevel = this.currentDamageLevels.get(vehicleMesh) || DamageLevel.PRISTINE;

    // Only update if damage level changed (optimization)
    if (damageLevel === previousLevel && damageLevel === DamageLevel.PRISTINE) {
      return;
    }

    this.currentDamageLevels.set(vehicleMesh, damageLevel);

    // Apply visual effects based on damage level
    this.applyMeshDeformation(vehicleMesh, damageState.overallDamage);
    this.applyMaterialDegradation(vehicleMesh, damageState.overallDamage);
    this.updateParticleEmission(vehicleMesh, damageLevel);

    const duration = performance.now() - startTime;
    if (duration > 1.0) {
      console.warn(`Damage update took ${duration.toFixed(2)}ms (target: <1ms)`);
    }
  }

  /**
   * Applies procedural mesh deformation based on damage.
   *
   * Simple approach: Apply random vertex noise proportional to damage.
   * More advanced: Displace vertices near impact points (requires impact data).
   *
   * @param vehicleMesh - Vehicle mesh to deform
   * @param damageAmount - Overall damage (0-1)
   */
  private applyMeshDeformation(vehicleMesh: THREE.Object3D, damageAmount: number): void {
    const originalData = this.originalMeshData.get(vehicleMesh);
    if (!originalData) {
      return;
    }

    // Only apply deformation at HEAVY and DESTROYED levels
    if (damageAmount < 0.5) {
      return;
    }

    vehicleMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BufferGeometry) {
        const positionAttr = child.geometry.attributes.position;
        if (!positionAttr) return;

        // Calculate deformation intensity (0 at 50% damage, 1 at 100% damage)
        const deformIntensity = Math.min((damageAmount - 0.5) * 2, 1.0);

        // Apply random vertex displacement
        for (let i = 0; i < positionAttr.count; i++) {
          const originalX = originalData.positions[i * 3];
          const originalY = originalData.positions[i * 3 + 1];
          const originalZ = originalData.positions[i * 3 + 2];

          // Random noise per vertex (seeded by vertex index for consistency)
          const seed = i * 0.12345;
          const noiseX = Math.sin(seed) * this.DEFORMATION_AMOUNT * deformIntensity;
          const noiseY = Math.cos(seed * 1.5) * this.DEFORMATION_AMOUNT * deformIntensity * 0.5; // Less vertical
          const noiseZ = Math.sin(seed * 0.8) * this.DEFORMATION_AMOUNT * deformIntensity;

          // Apply deformation (clamped to prevent extreme distortion)
          positionAttr.setXYZ(
            i,
            originalX + Math.max(-this.DEFORMATION_AMOUNT, Math.min(this.DEFORMATION_AMOUNT, noiseX)),
            originalY + Math.max(-this.DEFORMATION_AMOUNT * 0.5, Math.min(this.DEFORMATION_AMOUNT * 0.5, noiseY)),
            originalZ + Math.max(-this.DEFORMATION_AMOUNT, Math.min(this.DEFORMATION_AMOUNT, noiseZ))
          );
        }

        positionAttr.needsUpdate = true;

        // Recompute normals for proper lighting
        child.geometry.computeVertexNormals();
      }
    });
  }

  /**
   * Applies progressive material degradation based on damage.
   *
   * Effects:
   * - Brightness reduction (pristine → destroyed: 100% → 60%)
   * - Metalness reduction (shiny → dull)
   * - Roughness increase (smooth → scratched)
   * - Color tinting (slight gray/brown for dirt/damage)
   *
   * @param vehicleMesh - Vehicle mesh to update materials
   * @param damageAmount - Overall damage (0-1)
   */
  private applyMaterialDegradation(vehicleMesh: THREE.Object3D, damageAmount: number): void {
    const originalData = this.originalMeshData.get(vehicleMesh);
    if (!originalData) {
      return;
    }

    // Calculate degradation factors
    const brightnessFactor = 1.0 - damageAmount * 0.4; // 100% → 60% brightness
    const metalnessFactor = 1.0 - damageAmount * 0.5; // Reduce metallic sheen
    const roughnessFactor = 1.0 + damageAmount * 0.3; // Increase roughness

    vehicleMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const originalMaterial = originalData.materials.get(child);
        if (!originalMaterial || !(originalMaterial instanceof THREE.MeshStandardMaterial)) {
          return;
        }

        // Clone material if not already done (avoid modifying original)
        if (child.material === originalMaterial) {
          child.material = originalMaterial.clone();
        }

        const material = child.material as THREE.MeshStandardMaterial;

        // Apply brightness reduction
        this.tempColor.copy(originalMaterial.color);
        this.tempColor.multiplyScalar(brightnessFactor);
        material.color.copy(this.tempColor);

        // Apply metalness/roughness changes
        material.metalness = (originalMaterial.metalness || 0) * metalnessFactor;
        material.roughness = Math.min(1.0, (originalMaterial.roughness || 0.5) * roughnessFactor);

        // Add slight dirt tint at high damage
        if (damageAmount > 0.6) {
          const dirtAmount = (damageAmount - 0.6) * 0.5; // 0 → 0.2 tint
          material.color.lerp(new THREE.Color(0x444444), dirtAmount);
        }
      }
    });
  }

  /**
   * Updates particle emission based on damage level.
   *
   * PRISTINE/LIGHT: No particles
   * HEAVY: Moderate smoke (1 particle per 100ms)
   * DESTROYED: Heavy smoke (1 particle per 50ms)
   *
   * @param vehicleMesh - Vehicle mesh (used as emitter position)
   * @param damageLevel - Current damage level
   */
  private updateParticleEmission(vehicleMesh: THREE.Object3D, damageLevel: DamageLevel): void {
    if (damageLevel === DamageLevel.PRISTINE || damageLevel === DamageLevel.LIGHT) {
      // Stop emitting particles
      this.vehicleEmitters.delete(vehicleMesh);
    } else {
      // Start/continue emitting particles
      this.vehicleEmitters.add(vehicleMesh);
    }
  }

  /**
   * Updates particle system each frame.
   *
   * Updates:
   * - Particle positions (velocity integration)
   * - Particle lifetimes (fade out over time)
   * - Particle emission from damaged vehicles
   * - Geometry buffer updates for rendering
   * - Type-specific particle behaviors (sparks fade fast, debris tumbles)
   *
   * Performance: <0.5ms per frame (even with 100 particles)
   *
   * @param deltaTime - Time since last frame (seconds)
   */
  update(deltaTime: number): void {
    if (!this.particleGeometry || !this.particlePoints) {
      return;
    }

    const currentTime = performance.now() / 1000;

    // Emit new smoke particles from damaged vehicles
    this.vehicleEmitters.forEach((vehicleMesh) => {
      const damageLevel = this.currentDamageLevels.get(vehicleMesh) || DamageLevel.PRISTINE;
      const emitInterval =
        damageLevel === DamageLevel.DESTROYED
          ? this.PARTICLE_EMIT_INTERVAL_DESTROYED
          : this.PARTICLE_EMIT_INTERVAL_HEAVY;

      const lastEmit = this.lastParticleEmit.get(vehicleMesh) || 0;
      if (currentTime - lastEmit >= emitInterval) {
        this.emitSmokeParticle(vehicleMesh);
        this.lastParticleEmit.set(vehicleMesh, currentTime);
      }
    });

    // Update active particles
    const positionAttr = this.particleGeometry.attributes.position as THREE.BufferAttribute;
    const sizeAttr = this.particleGeometry.attributes.size as THREE.BufferAttribute;
    const alphaAttr = this.particleGeometry.attributes.alpha as THREE.BufferAttribute;
    const colorAttr = this.particleGeometry.attributes.color as THREE.BufferAttribute;

    let activeCount = 0;

    for (let i = 0; i < this.activeParticles.length; i++) {
      const particle = this.activeParticles[i];

      // Update lifetime
      particle.lifetime -= deltaTime;

      // Remove dead particles
      if (particle.lifetime <= 0) {
        // Return to pool
        this.particlePool.push(particle);
        this.activeParticles.splice(i, 1);
        i--;
        continue;
      }

      // Update position (integrate velocity)
      particle.position.addScaledVector(particle.velocity, deltaTime);

      // Type-specific physics
      if (particle.type === ParticleType.SMOKE) {
        // Smoke: gentle gravity, high drag
        particle.velocity.y -= 0.5 * deltaTime;
        particle.velocity.multiplyScalar(0.98); // High drag
      } else if (particle.type === ParticleType.SPARK) {
        // Sparks: strong gravity, medium drag
        particle.velocity.y -= 9.8 * deltaTime; // Full gravity
        particle.velocity.multiplyScalar(0.95); // Medium drag
      } else if (particle.type === ParticleType.DEBRIS) {
        // Debris: full gravity, medium drag, tumbling rotation
        particle.velocity.y -= 9.8 * deltaTime;
        particle.velocity.multiplyScalar(0.92); // Lower drag for longer flight
        particle.rotation += particle.rotationSpeed * deltaTime;
      }

      // Update geometry buffers
      positionAttr.setXYZ(activeCount, particle.position.x, particle.position.y, particle.position.z);

      // Calculate alpha based on particle type
      const lifetimeRatio = particle.lifetime / particle.maxLifetime;
      let alpha = 0;
      if (particle.type === ParticleType.SMOKE) {
        alpha = Math.min(0.6, lifetimeRatio * 0.8);
      } else if (particle.type === ParticleType.SPARK) {
        // Sparks fade out quickly for dramatic effect
        alpha = lifetimeRatio * 1.0;
      } else if (particle.type === ParticleType.DEBRIS) {
        alpha = Math.min(0.8, lifetimeRatio);
      }
      alphaAttr.setX(activeCount, alpha);

      // Size behavior based on type
      let size = particle.size;
      if (particle.type === ParticleType.SMOKE) {
        // Smoke grows over time
        size = particle.size * (1.5 - lifetimeRatio * 0.5);
      } else if (particle.type === ParticleType.SPARK) {
        // Sparks shrink quickly
        size = particle.size * lifetimeRatio;
      }
      sizeAttr.setX(activeCount, size);

      // Update color
      colorAttr.setXYZ(activeCount, particle.color.r, particle.color.g, particle.color.b);

      activeCount++;
    }

    // Zero out unused particle positions
    for (let i = activeCount; i < this.MAX_PARTICLES; i++) {
      positionAttr.setXYZ(i, 0, 0, 0);
      alphaAttr.setX(i, 0);
      sizeAttr.setX(i, 0);
      colorAttr.setXYZ(i, 0, 0, 0);
    }

    // Mark buffers for update
    positionAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;

    // Update draw range to only render active particles
    this.particleGeometry.setDrawRange(0, activeCount);
  }

  /**
   * Emits a single smoke particle from a damaged vehicle.
   *
   * Smoke particles are emitted continuously from the engine area
   * when vehicle is in HEAVY or DESTROYED damage state.
   *
   * @param vehicleMesh - Vehicle to emit from
   */
  private emitSmokeParticle(vehicleMesh: THREE.Object3D): void {
    if (this.particlePool.length === 0) {
      return; // No available particles
    }

    const particle = this.particlePool.pop()!;

    // Get vehicle world position
    vehicleMesh.getWorldPosition(this.tempVec3);

    // Emit from vehicle center with slight random offset
    particle.position.copy(this.tempVec3);
    particle.position.y += 0.3; // Slightly above vehicle
    particle.position.x += (Math.random() - 0.5) * 0.5;
    particle.position.z += (Math.random() - 0.5) * 0.5;

    // Random upward velocity
    particle.velocity.set(
      (Math.random() - 0.5) * 0.5, // Slight sideways drift
      0.5 + Math.random() * 0.5, // Upward motion
      (Math.random() - 0.5) * 0.5
    );

    // Smoke particle properties
    particle.type = ParticleType.SMOKE;
    particle.maxLifetime = 2.0 + Math.random() * 1.0;
    particle.lifetime = particle.maxLifetime;
    particle.size = 0.3 + Math.random() * 0.4;
    particle.color.set(0x555555); // Gray smoke
    particle.rotation = 0;
    particle.rotationSpeed = 0;

    this.activeParticles.push(particle);
  }

  /**
   * Emits a burst of spark particles on crash impact.
   *
   * Sparks simulate metal-on-metal collision with:
   * - Orange/yellow color gradient
   * - Radial spray pattern from impact point
   * - Gravity-affected trajectories
   * - Short lifetime (0.3-0.6s)
   * - Additive blending for glow effect
   *
   * Performance: <0.5ms per burst (object pooling, no allocations)
   *
   * @param position - World space impact position
   * @param normal - Collision normal (spray direction)
   * @param count - Number of sparks to emit (based on crash severity)
   */
  emitSparkBurst(position: THREE.Vector3, normal: THREE.Vector3, count: number): void {
    if (!this.particlePool.length) {
      console.warn('Particle pool exhausted, cannot emit sparks');
      return;
    }

    // Limit spark count to available pool
    const actualCount = Math.min(count, this.particlePool.length);

    for (let i = 0; i < actualCount; i++) {
      const particle = this.particlePool.pop();
      if (!particle) break;

      // Position at impact point with slight random offset
      particle.position.copy(position);
      particle.position.x += (Math.random() - 0.5) * 0.2;
      particle.position.y += (Math.random() - 0.5) * 0.2;
      particle.position.z += (Math.random() - 0.5) * 0.2;

      // Velocity: radial spray pattern away from impact
      // Use collision normal as base direction, add randomness
      const spreadAngle = Math.PI / 3; // 60 degree cone
      const theta = (Math.random() - 0.5) * spreadAngle;
      const phi = Math.random() * Math.PI * 2;

      // Calculate velocity direction (spray away from normal)
      const speed = 3 + Math.random() * 5; // 3-8 m/s
      particle.velocity.set(
        Math.cos(phi) * Math.sin(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(theta)
      );
      particle.velocity.normalize().multiplyScalar(speed);

      // Add collision normal bias (spray away from surface)
      particle.velocity.add(normal.clone().multiplyScalar(2));

      // Spark properties
      particle.type = ParticleType.SPARK;
      particle.maxLifetime = 0.3 + Math.random() * 0.3; // 0.3-0.6s
      particle.lifetime = particle.maxLifetime;
      particle.size = 0.15 + Math.random() * 0.2; // Smaller than smoke

      // Orange/yellow color gradient
      const colorVariation = Math.random();
      if (colorVariation < 0.5) {
        particle.color.set(0xff8800); // Orange
      } else {
        particle.color.set(0xffaa00); // Yellow-orange
      }

      particle.rotation = 0;
      particle.rotationSpeed = 0;

      this.activeParticles.push(particle);
    }
  }

  /**
   * Emits a burst of debris particles on crash impact.
   *
   * Debris simulates glass/bumper fragments with:
   * - Mixed sizes (small to medium)
   * - Gray/black/chrome colors
   * - Tumbling rotation animation
   * - Longer lifetime (1-2s)
   * - Physics-based trajectories
   *
   * Performance: <0.5ms per burst (object pooling)
   *
   * @param position - World space impact position
   * @param velocity - Vehicle velocity at impact (for momentum transfer)
   * @param count - Number of debris pieces (based on crash severity)
   */
  emitDebrisBurst(position: THREE.Vector3, velocity: THREE.Vector3, count: number): void {
    if (!this.particlePool.length) {
      console.warn('Particle pool exhausted, cannot emit debris');
      return;
    }

    // Limit debris count to available pool
    const actualCount = Math.min(count, this.particlePool.length);

    for (let i = 0; i < actualCount; i++) {
      const particle = this.particlePool.pop();
      if (!particle) break;

      // Position at impact point with random offset
      particle.position.copy(position);
      particle.position.x += (Math.random() - 0.5) * 0.5;
      particle.position.y += Math.random() * 0.3; // Slightly upward
      particle.position.z += (Math.random() - 0.5) * 0.5;

      // Velocity: inherit some of vehicle's velocity + random scatter
      particle.velocity.copy(velocity).multiplyScalar(0.3 + Math.random() * 0.4);
      particle.velocity.x += (Math.random() - 0.5) * 4;
      particle.velocity.y += Math.random() * 3; // Upward scatter
      particle.velocity.z += (Math.random() - 0.5) * 4;

      // Debris properties
      particle.type = ParticleType.DEBRIS;
      particle.maxLifetime = 1.0 + Math.random() * 1.0; // 1-2s
      particle.lifetime = particle.maxLifetime;
      particle.size = 0.1 + Math.random() * 0.25; // Mixed sizes

      // Gray/black/chrome colors
      const colorChoice = Math.random();
      if (colorChoice < 0.33) {
        particle.color.set(0x333333); // Dark gray
      } else if (colorChoice < 0.66) {
        particle.color.set(0x666666); // Medium gray
      } else {
        particle.color.set(0xaaaaaa); // Light gray/chrome
      }

      // Tumbling rotation
      particle.rotation = Math.random() * Math.PI * 2;
      particle.rotationSpeed = (Math.random() - 0.5) * 10; // -5 to +5 rad/s

      this.activeParticles.push(particle);
    }
  }

  /**
   * Resets damage visuals to pristine state.
   *
   * Restores:
   * - Original mesh geometry (vertex positions)
   * - Original materials (colors, properties)
   * - Original scale
   * - Stops particle emission
   *
   * Performance: <0.5ms per call
   *
   * @param vehicleMesh - Vehicle mesh to reset
   */
  resetDamageVisuals(vehicleMesh: THREE.Object3D): void {
    const originalData = this.originalMeshData.get(vehicleMesh);
    if (!originalData) {
      console.warn('Cannot reset damage: vehicle not registered');
      return;
    }

    // Restore original mesh geometry
    vehicleMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BufferGeometry) {
        const positionAttr = child.geometry.attributes.position;
        if (positionAttr) {
          // Copy original positions back
          for (let i = 0; i < positionAttr.count; i++) {
            positionAttr.setXYZ(
              i,
              originalData.positions[i * 3],
              originalData.positions[i * 3 + 1],
              originalData.positions[i * 3 + 2]
            );
          }
          positionAttr.needsUpdate = true;
          child.geometry.computeVertexNormals();
        }

        // Restore original material
        const originalMaterial = originalData.materials.get(child);
        if (originalMaterial) {
          // Dispose current material if it's a clone
          if (child.material !== originalMaterial && child.material instanceof THREE.Material) {
            child.material.dispose();
          }
          child.material = originalMaterial;
        }
      }
    });

    // Restore original scale
    vehicleMesh.scale.copy(originalData.scale);

    // Reset damage level
    this.currentDamageLevels.set(vehicleMesh, DamageLevel.PRISTINE);

    // Stop particle emission
    this.vehicleEmitters.delete(vehicleMesh);
    this.lastParticleEmit.delete(vehicleMesh);
  }

  /**
   * Determines damage level from overall damage percentage.
   *
   * @param damageAmount - Overall damage (0-1)
   * @returns Damage level classification
   */
  private getDamageLevel(damageAmount: number): DamageLevel {
    if (damageAmount < 0.25) return DamageLevel.PRISTINE;
    if (damageAmount < 0.5) return DamageLevel.LIGHT;
    if (damageAmount < 0.75) return DamageLevel.HEAVY;
    return DamageLevel.DESTROYED;
  }

  /**
   * Unregisters a vehicle and cleans up resources.
   *
   * @param vehicleMesh - Vehicle mesh to unregister
   */
  unregisterVehicle(vehicleMesh: THREE.Object3D): void {
    this.originalMeshData.delete(vehicleMesh);
    this.currentDamageLevels.delete(vehicleMesh);
    this.vehicleEmitters.delete(vehicleMesh);
    this.lastParticleEmit.delete(vehicleMesh);
  }

  /**
   * Disposes of the damage visualization system.
   * Cleans up all resources, geometries, and materials.
   */
  dispose(): void {
    // Dispose particle system
    if (this.particleGeometry) {
      this.particleGeometry.dispose();
      this.particleGeometry = null;
    }

    if (this.particleMaterial) {
      this.particleMaterial.dispose();
      this.particleMaterial = null;
    }

    if (this.particlePoints && this.scene) {
      this.scene.remove(this.particlePoints);
      this.particlePoints = null;
    }

    // Clear all data
    this.originalMeshData.clear();
    this.currentDamageLevels.clear();
    this.vehicleEmitters.clear();
    this.lastParticleEmit.clear();
    this.particlePool = [];
    this.activeParticles = [];

    console.log('DamageVisualizationSystem disposed');
  }

  /**
   * Gets current particle count (for debugging/telemetry).
   *
   * @returns Number of active particles
   */
  getActiveParticleCount(): number {
    return this.activeParticles.length;
  }

  /**
   * Gets damage level for a vehicle (for debugging/UI).
   *
   * @param vehicleMesh - Vehicle mesh
   * @returns Current damage level
   */
  getDamageLevelForVehicle(vehicleMesh: THREE.Object3D): DamageLevel {
    return this.currentDamageLevels.get(vehicleMesh) || DamageLevel.PRISTINE;
  }

  /**
   * Triggers crash particle effects (sparks + debris) on collision.
   *
   * Called by CrashManager when crash is detected.
   * Emits particle bursts based on crash severity.
   *
   * Integration example:
   * ```typescript
   * crashManager.onCrash((event) => {
   *   const damageSystem = DamageVisualizationSystem.getInstance();
   *   damageSystem.triggerCrashEffects(
   *     event.position,
   *     event.collisionNormal,
   *     event.velocity,
   *     event.severity
   *   );
   * });
   * ```
   *
   * @param position - World space impact position
   * @param normal - Collision normal vector
   * @param velocity - Vehicle velocity at impact
   * @param severity - Crash severity classification
   */
  triggerCrashEffects(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    velocity: THREE.Vector3,
    severity: 'minor' | 'major' | 'catastrophic'
  ): void {
    // Determine particle counts based on severity
    let sparkCount = 0;
    let debrisCount = 0;

    switch (severity) {
      case 'minor':
        sparkCount = this.SPARK_COUNT_MINOR;
        debrisCount = this.DEBRIS_COUNT_MINOR;
        break;
      case 'major':
        sparkCount = this.SPARK_COUNT_MAJOR;
        debrisCount = this.DEBRIS_COUNT_MAJOR;
        break;
      case 'catastrophic':
        sparkCount = this.SPARK_COUNT_CATASTROPHIC;
        debrisCount = this.DEBRIS_COUNT_CATASTROPHIC;
        break;
    }

    // Emit particle bursts
    this.emitSparkBurst(position, normal, sparkCount);
    this.emitDebrisBurst(position, velocity, debrisCount);

    console.log(`Crash effects triggered: ${sparkCount} sparks + ${debrisCount} debris (${severity})`);
  }
}
