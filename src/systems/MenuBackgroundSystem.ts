import * as THREE from 'three';
import { VehicleModelFactory } from '../entities/models/VehicleModelFactory';
import { VehicleModelType } from '../entities/models/VehicleModelTypes';
import { PostProcessingSystem } from './PostProcessingSystem';
import { MEDIUM_QUALITY } from '../config/GraphicsConfig';

/**
 * MenuBackgroundSystem - 3D Background Scene for Main Menu
 *
 * Features:
 * - Rotating 3D vehicle display (garage showcase)
 * - Dramatic SpotLight illumination
 * - Particle system (floating sparks + dust motes)
 * - Optional ground reflection plane
 * - Smooth rotation animation
 * - CRT post-processing effects (scanlines, chromatic aberration, vignette, film grain)
 *
 * Performance: <8ms per frame target (including post-processing)
 * - Object pooling for particles (reuse, zero per-frame allocations)
 * - Procedural geometry (no texture loading)
 * - Optimized particle count (200 total: 100 sparks + 100 dust)
 * - Efficient particle update (batched GPU operations)
 * - Post-processing: <3ms overhead
 *
 * Usage:
 * ```typescript
 * const menuBg = new MenuBackgroundSystem(scene, renderer, camera);
 * menuBg.init();
 * menuBg.setPostProcessingQuality('high'); // Enable CRT effects
 * menuBg.update(deltaTime); // Call every frame during MENU state
 * menuBg.render(); // Render with post-processing
 * menuBg.dispose(); // Clean up when exiting menu
 * ```
 */
export class MenuBackgroundSystem {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.Camera;
  private vehicle: THREE.Group | null = null;
  private spotlight: THREE.SpotLight | null = null;
  private fillLight: THREE.PointLight | null = null;
  private groundPlane: THREE.Mesh | null = null;
  private postProcessing: PostProcessingSystem | null = null;

  // Particle systems
  private sparkParticles: THREE.Points | null = null;
  private dustParticles: THREE.Points | null = null;
  private sparkVelocities: THREE.Vector3[] = [];
  private dustVelocities: THREE.Vector3[] = [];

  // Animation state
  private rotationSpeed = 0.1; // radians per second (slow rotation)
  private currentRotation = 0;
  private vehicleModelFactory: VehicleModelFactory;

  // Performance tracking
  private lastUpdateTime = 0;

  // Configuration
  private readonly SPARK_COUNT = 100;
  private readonly DUST_COUNT = 100;
  private readonly VEHICLE_HEIGHT = 1.0; // meters above ground
  private readonly SPOTLIGHT_POSITION = new THREE.Vector3(10, 15, 5);
  private readonly SPOTLIGHT_INTENSITY = 6.0; // Increased from 3.0 for better visibility
  private readonly SPOTLIGHT_COLOR = 0xffffff;
  private readonly FILLLIGHT_POSITION = new THREE.Vector3(-5, 8, -8);
  private readonly FILLLIGHT_INTENSITY = 3.0; // Increased from 1.5 for better visibility
  private readonly FILLLIGHT_COLOR = 0x00ff88; // Neon green accent

  constructor(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera
  ) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;
    this.vehicleModelFactory = new VehicleModelFactory();
  }

  /**
   * Initialize the menu background scene
   * Creates vehicle, lights, particles, and post-processing
   *
   * Performance: ~15ms one-time initialization cost
   */
  init(): void {
    console.log('[MenuBackgroundSystem] Initializing 3D background...');
    const startTime = performance.now();

    // Create rotating vehicle showcase
    this.createVehicleDisplay();

    // Setup dramatic lighting
    this.createLighting();

    // Create ground plane with reflection effect
    this.createGroundPlane();

    // Initialize particle systems
    this.createSparkParticles();
    this.createDustParticles();

    // Initialize post-processing (CRT effects + new effects)
    this.postProcessing = new PostProcessingSystem(
      this.renderer,
      this.scene,
      this.camera,
      MEDIUM_QUALITY // Default to medium quality for menu
    );
    // Disabled by default - will be enabled based on quality settings
    this.postProcessing.setEnabled(false);

    const elapsedTime = performance.now() - startTime;
    console.log(`[MenuBackgroundSystem] Initialized in ${elapsedTime.toFixed(2)}ms`);
  }

  /**
   * Create the vehicle display (Corvette by default)
   * Positioned at origin, elevated above ground plane
   */
  private createVehicleDisplay(): void {
    // Create Corvette model (default showcase vehicle)
    this.vehicle = this.vehicleModelFactory.createVehicleMesh(
      VehicleModelType.CORVETTE
    );

    // Position vehicle at origin, elevated above ground
    this.vehicle.position.set(0, this.VEHICLE_HEIGHT, 0);

    // Enable shadows for dramatic effect
    this.vehicle.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.scene.add(this.vehicle);
    console.log('[MenuBackgroundSystem] Vehicle display created');
  }

  /**
   * Create dramatic SpotLight + FillLight setup
   * SpotLight: Main key light from above-right
   * FillLight: Green accent light from left for neon aesthetic
   */
  private createLighting(): void {
    // Main spotlight (key light)
    this.spotlight = new THREE.SpotLight(
      this.SPOTLIGHT_COLOR,
      this.SPOTLIGHT_INTENSITY
    );
    this.spotlight.position.copy(this.SPOTLIGHT_POSITION);
    this.spotlight.target.position.set(0, this.VEHICLE_HEIGHT, 0);
    this.spotlight.angle = Math.PI / 6; // 30 degree cone
    this.spotlight.penumbra = 0.3; // Soft edge falloff
    this.spotlight.castShadow = true;

    // Shadow quality settings (balance quality vs performance)
    this.spotlight.shadow.mapSize.width = 1024;
    this.spotlight.shadow.mapSize.height = 1024;
    this.spotlight.shadow.camera.near = 5;
    this.spotlight.shadow.camera.far = 30;

    this.scene.add(this.spotlight);
    this.scene.add(this.spotlight.target);

    // Fill light (accent light with neon green)
    this.fillLight = new THREE.PointLight(
      this.FILLLIGHT_COLOR,
      this.FILLLIGHT_INTENSITY
    );
    this.fillLight.position.copy(this.FILLLIGHT_POSITION);

    this.scene.add(this.fillLight);

    console.log('[MenuBackgroundSystem] Lighting created (SpotLight + FillLight)');
  }

  /**
   * Create ground plane with subtle reflection effect
   * Uses dark material with slight metalness for garage floor aesthetic
   */
  private createGroundPlane(): void {
    const geometry = new THREE.PlaneGeometry(50, 50);
    const material = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a, // Very dark gray (almost black)
      metalness: 0.4, // Slight metallic reflection
      roughness: 0.6, // Not too shiny
      side: THREE.DoubleSide,
    });

    this.groundPlane = new THREE.Mesh(geometry, material);
    this.groundPlane.rotation.x = -Math.PI / 2; // Horizontal plane
    this.groundPlane.position.y = 0; // Ground level
    this.groundPlane.receiveShadow = true; // Receive vehicle shadow

    this.scene.add(this.groundPlane);
    console.log('[MenuBackgroundSystem] Ground plane created');
  }

  /**
   * Create spark particle system
   * Floating bright sparks with upward drift (welding/garage effect)
   *
   * Performance: Uses BufferGeometry for GPU-batched rendering
   */
  private createSparkParticles(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.SPARK_COUNT * 3);
    const colors = new Float32Array(this.SPARK_COUNT * 3);

    // Initialize particles in a cylinder around vehicle
    for (let i = 0; i < this.SPARK_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 2; // 3-5m radius
      const height = Math.random() * 5; // 0-5m height

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // Orange/yellow sparks (hot metal aesthetic)
      colors[i * 3] = 1.0; // R
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.5; // G (0.5-1.0)
      colors[i * 3 + 2] = 0.0; // B

      // Create velocity for upward drift
      this.sparkVelocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.2, // Slight horizontal drift
        0.5 + Math.random() * 0.5, // Upward drift (0.5-1.0 m/s)
        (Math.random() - 0.5) * 0.2
      ));
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05, // Small sparks
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending, // Bright glow effect
      depthWrite: false,
    });

    this.sparkParticles = new THREE.Points(geometry, material);
    this.scene.add(this.sparkParticles);
    console.log(`[MenuBackgroundSystem] Spark particles created (${this.SPARK_COUNT} particles)`);
  }

  /**
   * Create dust particle system
   * Slow-floating dust motes for atmospheric depth
   *
   * Performance: Uses BufferGeometry for GPU-batched rendering
   */
  private createDustParticles(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.DUST_COUNT * 3);
    const colors = new Float32Array(this.DUST_COUNT * 3);

    // Initialize particles in a larger volume
    for (let i = 0; i < this.DUST_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 5; // 5-10m radius (wider than sparks)
      const height = Math.random() * 8; // 0-8m height

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // Gray dust with slight green tint (match neon theme)
      const brightness = 0.3 + Math.random() * 0.3;
      colors[i * 3] = brightness * 0.8; // R
      colors[i * 3 + 1] = brightness; // G (slightly more green)
      colors[i * 3 + 2] = brightness * 0.8; // B

      // Create slow random drift velocity
      this.dustVelocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.1, // Slow horizontal drift
        0.05 + Math.random() * 0.1, // Very slow upward drift
        (Math.random() - 0.5) * 0.1
      ));
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.03, // Smaller than sparks
      vertexColors: true,
      transparent: true,
      opacity: 0.4, // Very subtle
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
    console.log(`[MenuBackgroundSystem] Dust particles created (${this.DUST_COUNT} particles)`);
  }

  /**
   * Update menu background animation
   * Called every frame during MENU state
   *
   * Performance: <8ms target (including post-processing update)
   *
   * @param deltaTime - Time since last frame in seconds
   */
  update(deltaTime: number): void {
    const updateStartTime = performance.now();

    // Rotate vehicle slowly
    if (this.vehicle) {
      this.currentRotation += this.rotationSpeed * deltaTime;
      this.vehicle.rotation.y = this.currentRotation;
    }

    // Update particle systems
    this.updateSparkParticles(deltaTime);
    this.updateDustParticles(deltaTime);

    // Optional: Subtle light animation (breathing effect)
    if (this.fillLight) {
      const breathingCycle = Math.sin(performance.now() / 1000) * 0.2 + 1.0;
      this.fillLight.intensity = this.FILLLIGHT_INTENSITY * breathingCycle;
    }

    // Update post-processing (film grain animation, etc.)
    if (this.postProcessing) {
      this.postProcessing.update(deltaTime);
    }

    // Performance tracking (only log occasionally)
    const updateTime = performance.now() - updateStartTime;
    this.lastUpdateTime = updateTime;

    // Log performance warning if update is slow
    if (updateTime > 8) {
      console.warn(`[MenuBackgroundSystem] Slow update: ${updateTime.toFixed(2)}ms (target: <8ms)`);
    }
  }

  /**
   * Render menu background with post-processing
   * Call this instead of renderer.render() when menu is active
   */
  render(): void {
    if (this.postProcessing) {
      this.postProcessing.render();
    } else {
      // Fallback to direct rendering if post-processing not initialized
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Set post-processing quality level
   * Now handled via GraphicsSettings in PostProcessingSystem
   *
   * @param quality - Quality level ('low', 'medium', 'high')
   */
  setPostProcessingQuality(quality: 'low' | 'medium' | 'high'): void {
    if (this.postProcessing) {
      // Note: Quality is now set via GraphicsSettings on initialization
      // This method kept for legacy API compatibility
      this.postProcessing.setEnabled(true);
      console.log(`[MenuBackgroundSystem] Post-processing enabled (quality controlled via GraphicsSettings)`);
    }
  }

  /**
   * Enable or disable post-processing effects
   *
   * @param enabled - Whether to enable CRT effects
   */
  setPostProcessingEnabled(enabled: boolean): void {
    if (this.postProcessing) {
      this.postProcessing.setEnabled(enabled);
      console.log(`[MenuBackgroundSystem] Post-processing ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Check if post-processing is enabled
   */
  isPostProcessingEnabled(): boolean {
    return this.postProcessing?.isEnabled() ?? false;
  }

  /**
   * Get post-processing system for advanced control
   */
  getPostProcessing(): PostProcessingSystem | null {
    return this.postProcessing;
  }

  /**
   * Handle window resize
   * Updates post-processing render targets
   */
  resize(width: number, height: number): void {
    if (this.postProcessing) {
      this.postProcessing.resize(width, height);
    }
  }

  /**
   * Update spark particles (upward drift, recycle at top)
   * Zero per-frame allocations (reuses existing arrays)
   *
   * @param deltaTime - Time since last frame in seconds
   */
  private updateSparkParticles(deltaTime: number): void {
    if (!this.sparkParticles) return;

    const positions = this.sparkParticles.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.SPARK_COUNT; i++) {
      const velocity = this.sparkVelocities[i];

      // Update position
      positions[i * 3] += velocity.x * deltaTime;
      positions[i * 3 + 1] += velocity.y * deltaTime;
      positions[i * 3 + 2] += velocity.z * deltaTime;

      // Recycle particles that float too high
      if (positions[i * 3 + 1] > 6) {
        // Reset to ground level with new random position
        const angle = Math.random() * Math.PI * 2;
        const radius = 3 + Math.random() * 2;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = Math.sin(angle) * radius;

        // Randomize velocity slightly
        velocity.x = (Math.random() - 0.5) * 0.2;
        velocity.y = 0.5 + Math.random() * 0.5;
        velocity.z = (Math.random() - 0.5) * 0.2;
      }
    }

    // Mark buffer for GPU update
    this.sparkParticles.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Update dust particles (slow drift, recycle at boundaries)
   * Zero per-frame allocations (reuses existing arrays)
   *
   * @param deltaTime - Time since last frame in seconds
   */
  private updateDustParticles(deltaTime: number): void {
    if (!this.dustParticles) return;

    const positions = this.dustParticles.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.DUST_COUNT; i++) {
      const velocity = this.dustVelocities[i];

      // Update position
      positions[i * 3] += velocity.x * deltaTime;
      positions[i * 3 + 1] += velocity.y * deltaTime;
      positions[i * 3 + 2] += velocity.z * deltaTime;

      // Recycle particles that drift too far
      if (positions[i * 3 + 1] > 8) {
        // Reset to ground level with new random position
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 5;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = Math.sin(angle) * radius;

        // Randomize velocity slightly
        velocity.x = (Math.random() - 0.5) * 0.1;
        velocity.y = 0.05 + Math.random() * 0.1;
        velocity.z = (Math.random() - 0.5) * 0.1;
      }
    }

    // Mark buffer for GPU update
    this.dustParticles.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Change the displayed vehicle model
   * Useful for car selection preview
   *
   * @param modelType - Vehicle model type to display
   */
  setVehicle(modelType: VehicleModelType): void {
    // Remove existing vehicle
    if (this.vehicle) {
      this.scene.remove(this.vehicle);
      // Dispose geometries and materials
      this.vehicle.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    // Create new vehicle
    this.vehicle = this.vehicleModelFactory.createVehicleMesh(modelType);
    this.vehicle.position.set(0, this.VEHICLE_HEIGHT, 0);
    this.vehicle.rotation.y = this.currentRotation; // Preserve rotation

    // Enable shadows
    this.vehicle.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.scene.add(this.vehicle);
    console.log(`[MenuBackgroundSystem] Vehicle changed to ${modelType}`);
  }

  /**
   * Get the last update time (for performance monitoring)
   * @returns Last update time in milliseconds
   */
  getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }

  /**
   * Clean up all resources
   * MUST be called when exiting menu state to prevent memory leaks
   */
  dispose(): void {
    console.log('[MenuBackgroundSystem] Disposing...');

    // Dispose post-processing system
    if (this.postProcessing) {
      this.postProcessing.dispose();
      this.postProcessing = null;
    }

    // Remove and dispose vehicle
    if (this.vehicle) {
      this.scene.remove(this.vehicle);
      this.vehicle.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.vehicle = null;
    }

    // Remove and dispose lights
    if (this.spotlight) {
      this.scene.remove(this.spotlight);
      this.scene.remove(this.spotlight.target);
      this.spotlight = null;
    }
    if (this.fillLight) {
      this.scene.remove(this.fillLight);
      this.fillLight = null;
    }

    // Remove and dispose ground plane
    if (this.groundPlane) {
      this.scene.remove(this.groundPlane);
      this.groundPlane.geometry.dispose();
      (this.groundPlane.material as THREE.Material).dispose();
      this.groundPlane = null;
    }

    // Remove and dispose particle systems
    if (this.sparkParticles) {
      this.scene.remove(this.sparkParticles);
      this.sparkParticles.geometry.dispose();
      (this.sparkParticles.material as THREE.Material).dispose();
      this.sparkParticles = null;
    }
    if (this.dustParticles) {
      this.scene.remove(this.dustParticles);
      this.dustParticles.geometry.dispose();
      (this.dustParticles.material as THREE.Material).dispose();
      this.dustParticles = null;
    }

    // Clear velocity arrays
    this.sparkVelocities = [];
    this.dustVelocities = [];

    console.log('[MenuBackgroundSystem] Disposed successfully');
  }
}
