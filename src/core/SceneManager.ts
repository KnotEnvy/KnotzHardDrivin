import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { EnvironmentSystem, ENVIRONMENT_QUALITY_PRESETS, EnvironmentQualitySettings } from '../systems/EnvironmentSystem';
import { SkyboxSystem } from '../systems/SkyboxSystem';
import { MaterialLibrary } from '../systems/MaterialLibrary';
import type { TimeOfDay, SkyboxType } from '../types/SkyboxTypes';

/**
 * SceneManager - Core Three.js scene setup and rendering
 *
 * Responsibilities:
 * - Initialize and configure Three.js renderer with optimized settings
 * - Set up comprehensive lighting rig (directional, hemisphere, ambient)
 * - Manage scene graph and rendering pipeline
 * - Configure shadow mapping, color space, and tone mapping
 * - Handle window resize events
 * - Manage environment system (ground, sky, clouds, scenery)
 *
 * Performance considerations:
 * - Shadow map size configurable via quality settings
 * - Uses PCFSoftShadowMap for smooth shadows with minimal performance cost
 * - ACESFilmic tone mapping for cinematic color grading
 * - SRGB color space for accurate color reproduction
 */
export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  // Environment system
  private environmentSystem!: EnvironmentSystem;
  private environmentInitialized: boolean = false;

  // Skybox system
  private skyboxSystem!: SkyboxSystem;
  private skyboxEnabled: boolean = true;

  // Test object for camera following
  public testCube!: THREE.Mesh;

  // Store bound resize handler for proper cleanup
  private boundResizeHandler: () => void;

  // Optional resize callback for external systems (e.g., MenuBackgroundSystem)
  private onResizeCallback?: (width: number, height: number) => void;

  constructor(canvas: HTMLCanvasElement, qualitySettings?: {
    shadowMapSize?: number;
    antialiasing?: boolean;
    environmentQuality?: 'low' | 'medium' | 'high';
    skyboxEnabled?: boolean;
  }) {
    // Initialize scene
    this.scene = new THREE.Scene();

    // Initialize camera (will be managed by CameraSystem, but needs to exist)
    this.camera = new THREE.PerspectiveCamera(
      75, // FOV
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near clip plane
      1000 // Far clip plane
    );
    this.camera.position.set(0, 2, 5);

    // Initialize renderer with optimized settings
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: qualitySettings?.antialiasing ?? true,
      powerPreference: 'high-performance',
      stencil: false, // We don't need stencil buffer, saves memory
    });

    this.setupRenderer(qualitySettings?.shadowMapSize ?? 2048);
    this.createTestScene();

    // Initialize PBR Material Library
    const materialLib = MaterialLibrary.getInstance();
    materialLib.init(this.scene);
    console.log('✅ PBR Material Library initialized:', materialLib.getStats());

    // Initialize environment system asynchronously
    const envQuality = qualitySettings?.environmentQuality ?? 'medium';
    const envSettings = envQuality === 'low' ? ENVIRONMENT_QUALITY_PRESETS.LOW :
      envQuality === 'high' ? ENVIRONMENT_QUALITY_PRESETS.HIGH :
        ENVIRONMENT_QUALITY_PRESETS.MEDIUM;

    this.environmentSystem = new EnvironmentSystem(this.scene, this.camera, envSettings);
    this.initializeEnvironment();

    // Initialize skybox system
    this.skyboxEnabled = qualitySettings?.skyboxEnabled ?? true;
    this.skyboxSystem = new SkyboxSystem(this.scene, this.renderer);
    this.initializeSkybox();

    // Handle window resize - store bound reference for cleanup
    this.boundResizeHandler = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.boundResizeHandler);
  }

  /**
   * Configure renderer settings for optimal performance and quality
   *
   * Performance impact:
   * - Shadow map size: 512 (~0.5ms), 1024 (~1ms), 2048 (~2ms), 4096 (~4ms)
   * - PCFSoftShadowMap: Good quality-to-performance ratio
   * - ACESFilmic tone mapping: ~0.1ms overhead, worth it for visual quality
   */
  private setupRenderer(shadowMapSize: number): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance

    // Enable shadow mapping with soft shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Smooth shadows, good performance

    // Configure color space (SRGB for accurate colors)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Set tone mapping for realistic lighting (ACESFilmic is cinematic)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Shadow map resolution (configurable via quality settings)
    this.renderer.shadowMap.autoUpdate = true;
  }

  /**
   * Set up comprehensive lighting rig
   * Note: Fully delegated to SkyboxSystem now.
   */

  /**
   * Initialize environment system (ground, sky, clouds, scenery)
   *
   * Called asynchronously during construction to avoid blocking renderer setup.
   */
  private async initializeEnvironment(): Promise<void> {
    try {
      await this.environmentSystem.init();
      this.environmentInitialized = true;
      console.log('✅ Scene environment ready');
    } catch (error) {
      console.error('❌ Failed to initialize environment:', error);
    }
  }

  /**
   * Initialize skybox system with default settings
   *
   * Called asynchronously during construction.
   */
  private async initializeSkybox(): Promise<void> {
    if (!this.skyboxEnabled) {
      console.log('⏭️ Skybox disabled by quality settings');
      return;
    }

    try {
      // Set default time of day and skybox
      await this.skyboxSystem.setSkybox('day');
      this.skyboxSystem.setTimeOfDay('day');
      console.log('✅ Skybox system ready');
    } catch (error) {
      console.error('❌ Failed to initialize skybox:', error);
    }
  }

  /**
   * Set skybox type for the scene
   *
   * @param skyboxType - Skybox preset to use
   */
  async setSkybox(skyboxType: SkyboxType): Promise<void> {
    if (!this.skyboxEnabled) {
      console.warn('⚠️ Skybox disabled by quality settings');
      return;
    }
    await this.skyboxSystem.setSkybox(skyboxType);
  }

  /**
   * Set time of day and update lighting
   *
   * @param timeOfDay - Time of day preset
   */
  setTimeOfDay(timeOfDay: TimeOfDay): void {
    this.skyboxSystem.setTimeOfDay(timeOfDay);
  }

  /**
   * Get skybox system for external access
   */
  getSkyboxSystem(): SkyboxSystem {
    return this.skyboxSystem;
  }

  /**
   * Create test scene for camera testing
   *
   * Creates a moving cube that the camera system can follow.
   * This will be removed once vehicle system is implemented.
   */
  private createTestScene(): void {
    // Ground plane (commented out - track provides ground now)
    // const groundGeometry = new THREE.PlaneGeometry(200, 200);
    // const groundMaterial = new THREE.MeshStandardMaterial({
    //   color: 0x808080,
    //   roughness: 0.8,
    //   metalness: 0.2,
    // });
    // const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    // ground.rotation.x = -Math.PI / 2;
    // ground.receiveShadow = true;
    // this.scene.add(ground);

    // Test cube (commented out - vehicle replaces this)
    // const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
    // const cubeMaterial = new THREE.MeshStandardMaterial({
    //   color: 0x00ff00,
    //   roughness: 0.5,
    //   metalness: 0.5,
    // });
    // this.testCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    // this.testCube.position.set(0, 1, 0);
    // this.testCube.castShadow = true;
    // this.testCube.receiveShadow = true;
    // this.scene.add(this.testCube);

    // Add some reference objects for spatial awareness
    this.createReferenceGrid();
  }

  /**
   * Create reference grid for spatial awareness during testing
   */
  private createReferenceGrid(): void {
    const gridHelper = new THREE.GridHelper(200, 40, 0x444444, 0x222222);
    this.scene.add(gridHelper);

    // Axes helper (red = X, green = Y, blue = Z)
    const axesHelper = new THREE.AxesHelper(10);
    this.scene.add(axesHelper);
  }

  /**
   * Handle window resize events
   * Updates camera aspect ratio and renderer size
   */
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Notify external systems (e.g., post-processing)
    if (this.onResizeCallback) {
      this.onResizeCallback(window.innerWidth, window.innerHeight);
    }
  }

  /**
   * Set resize callback for external systems
   * Used by MenuBackgroundSystem to update post-processing render targets
   */
  setResizeCallback(callback: (width: number, height: number) => void): void {
    this.onResizeCallback = callback;
  }

  /**
   * Clear resize callback
   */
  clearResizeCallback(): void {
    this.onResizeCallback = undefined;
  }

  setShadowMapSize(size: number): void {
    // Delegate to skybox system for shadow management
    this.skyboxSystem.setShadowMapSize(size);
  }

  /**
   * Toggle shadows on/off for performance
   */
  setShadowsEnabled(enabled: boolean): void {
    this.renderer.shadowMap.enabled = enabled;
    this.skyboxSystem.setShadowsEnabled(enabled);
  }

  /**
   * Update environment quality settings
   * @param quality - 'low', 'medium', or 'high'
   */
  async setEnvironmentQuality(quality: 'low' | 'medium' | 'high'): Promise<void> {
    const settings = quality === 'low' ? ENVIRONMENT_QUALITY_PRESETS.LOW :
      quality === 'high' ? ENVIRONMENT_QUALITY_PRESETS.HIGH :
        ENVIRONMENT_QUALITY_PRESETS.MEDIUM;

    if (this.environmentInitialized) {
      await this.environmentSystem.setQualitySettings(settings);
    }
  }

  /**
   * Get environment system instance
   */
  getEnvironmentSystem(): EnvironmentSystem {
    return this.environmentSystem;
  }

  /**
   * Update scene systems (called each frame)
   * @param deltaTime - Time since last frame in seconds
   */
  update(deltaTime: number): void {
    if (this.environmentInitialized) {
      this.environmentSystem.update(deltaTime);
    }
  }

  /**
   * Render the scene
   * Should be called once per frame from the game loop
   */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Create ground physics collider
   *
   * Must be called AFTER physics world is initialized.
   * Delegates to EnvironmentSystem to create a large static box collider.
   *
   * @param physicsWorld - Rapier physics world instance
   */
  public createGroundCollider(physicsWorld: RAPIER.World): void {
    this.environmentSystem.createGroundCollider(physicsWorld);
  }

  /**
   * Clean up resources and prevent memory leaks
   *
   * Disposes of:
   * - Event listeners (resize handler)
   * - WebGL renderer context
   * - All Three.js geometries, materials, and textures
   * - Shadow maps
   * - Environment system
   * - Skybox system
   * - Material library
   */
  dispose(): void {
    // Remove event listeners using the stored bound reference
    window.removeEventListener('resize', this.boundResizeHandler);

    // Dispose of material library
    const materialLib = MaterialLibrary.getInstance();
    materialLib.dispose();

    // Dispose of environment system
    if (this.environmentInitialized) {
      this.environmentSystem.dispose();
    }

    // Dispose of skybox system
    if (this.skyboxSystem) {
      this.skyboxSystem.dispose();
    }

    // Dispose of renderer
    this.renderer.dispose();

    // Dispose of test scene geometries and materials
    if (this.testCube) {
      this.testCube.geometry.dispose();
      if (Array.isArray(this.testCube.material)) {
        this.testCube.material.forEach(mat => mat.dispose());
      } else {
        this.testCube.material.dispose();
      }
    }

    // Dispose of ground plane (first child after lights/helpers)
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });

    // Clear the scene
    this.scene.clear();
  }
}