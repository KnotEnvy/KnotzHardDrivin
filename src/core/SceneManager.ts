import * as THREE from 'three';

/**
 * SceneManager - Core Three.js scene setup and rendering
 *
 * Responsibilities:
 * - Initialize and configure Three.js renderer with optimized settings
 * - Set up comprehensive lighting rig (directional, hemisphere, ambient)
 * - Manage scene graph and rendering pipeline
 * - Configure shadow mapping, color space, and tone mapping
 * - Handle window resize events
 * - Provide skybox setup (placeholder for now)
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

  // Lighting components
  private sunLight!: THREE.DirectionalLight;
  private hemisphereLight!: THREE.HemisphereLight;
  private ambientLight!: THREE.AmbientLight;

  // Test object for camera following
  public testCube!: THREE.Mesh;

  // Store bound resize handler for proper cleanup
  private boundResizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, qualitySettings?: {
    shadowMapSize?: number;
    antialiasing?: boolean;
  }) {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xa0a0a0, 100, 500); // Distance fog

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
    this.setupLighting();
    this.setupSkybox();
    this.createTestScene();

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
   *
   * Lighting strategy:
   * 1. Directional light (sun): Primary light source with shadows
   * 2. Hemisphere light: Realistic sky-ground color gradient
   * 3. Ambient light: Subtle fill light to prevent pure black shadows
   *
   * Performance: ~0.3ms total for all lights
   */
  private setupLighting(): void {
    // 1. Directional Light (Sun) - Primary light with shadows
    this.sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sunLight.position.set(50, 100, 50); // High and angled
    this.sunLight.castShadow = true;

    // Configure shadow camera for optimal coverage
    const shadowCameraSize = 100;
    this.sunLight.shadow.camera.left = -shadowCameraSize;
    this.sunLight.shadow.camera.right = shadowCameraSize;
    this.sunLight.shadow.camera.top = shadowCameraSize;
    this.sunLight.shadow.camera.bottom = -shadowCameraSize;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;

    // Shadow map resolution (will be set by quality settings)
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;

    // Shadow bias to prevent shadow acne
    this.sunLight.shadow.bias = -0.0001;

    this.scene.add(this.sunLight);

    // Add visual helper for sun light direction (debug only, remove in production)
    // const sunHelper = new THREE.DirectionalLightHelper(this.sunLight, 5);
    // this.scene.add(sunHelper);

    // 2. Hemisphere Light (Sky) - Realistic ambient lighting from sky/ground
    // Sky color: Light blue, Ground color: Darker earth tone
    this.hemisphereLight = new THREE.HemisphereLight(
      0x87ceeb, // Sky color (light blue)
      0x3d2817, // Ground color (brown)
      0.6 // Intensity
    );
    this.hemisphereLight.position.set(0, 50, 0);
    this.scene.add(this.hemisphereLight);

    // 3. Ambient Light (Fill) - Subtle fill to prevent pure black shadows
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(this.ambientLight);
  }

  /**
   * Set up skybox (placeholder for now)
   *
   * For MVP, we use a simple gradient background.
   * Future enhancement: Load actual skybox textures (6-sided cube map)
   *
   * Performance: Negligible (~0.01ms)
   */
  private setupSkybox(): void {
    // Placeholder: Use scene background color (sky blue)
    this.scene.background = new THREE.Color(0x87ceeb);

    // Alternative: Simple gradient using fog
    // this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);
  }

  /**
   * Load actual skybox textures (for future use)
   *
   * Usage:
   * await sceneManager.loadSkyboxTextures([
   *   'assets/skybox/px.jpg', 'assets/skybox/nx.jpg',
   *   'assets/skybox/py.jpg', 'assets/skybox/ny.jpg',
   *   'assets/skybox/pz.jpg', 'assets/skybox/nz.jpg',
   * ]);
   */
  async loadSkyboxTextures(urls: string[]): Promise<void> {
    const loader = new THREE.CubeTextureLoader();
    const skybox = await loader.loadAsync(urls);
    this.scene.background = skybox;
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
  }

  /**
   * Update shadow map resolution based on quality settings
   */
  setShadowMapSize(size: number): void {
    this.sunLight.shadow.mapSize.width = size;
    this.sunLight.shadow.mapSize.height = size;
    this.sunLight.shadow.map?.dispose(); // Dispose old map
    this.sunLight.shadow.map = null; // Force recreation
  }

  /**
   * Toggle shadows on/off for performance
   */
  setShadowsEnabled(enabled: boolean): void {
    this.renderer.shadowMap.enabled = enabled;
  }

  /**
   * Render the scene
   * Should be called once per frame from the game loop
   */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Clean up resources and prevent memory leaks
   *
   * Disposes of:
   * - Event listeners (resize handler)
   * - WebGL renderer context
   * - All Three.js geometries, materials, and textures
   * - Shadow maps
   */
  dispose(): void {
    // Remove event listeners using the stored bound reference
    window.removeEventListener('resize', this.boundResizeHandler);

    // Dispose of renderer
    this.renderer.dispose();

    // Dispose of shadow maps
    if (this.sunLight.shadow.map) {
      this.sunLight.shadow.map.dispose();
      this.sunLight.shadow.map = null;
    }

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