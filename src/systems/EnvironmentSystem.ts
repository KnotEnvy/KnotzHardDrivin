import * as THREE from 'three';

/**
 * Quality settings for environment rendering
 */
export interface EnvironmentQualitySettings {
  groundTextureResolution: number; // 512, 1024, 2048
  cloudCount: number; // 0, 50, 100, 200
  cloudDetailLevel: number; // 1 (low), 2 (medium), 3 (high)
  enableFog: boolean;
  fogDensity: number; // 0.0005 to 0.002
  skyDomeSegments: number; // 16, 32, 64
}

/**
 * Preset quality levels
 */
export const ENVIRONMENT_QUALITY_PRESETS = {
  LOW: {
    groundTextureResolution: 512,
    cloudCount: 0,
    cloudDetailLevel: 1,
    enableFog: true,
    fogDensity: 0.001,
    skyDomeSegments: 16,
  } as EnvironmentQualitySettings,

  MEDIUM: {
    groundTextureResolution: 1024,
    cloudCount: 50,
    cloudDetailLevel: 2,
    enableFog: true,
    fogDensity: 0.0008,
    skyDomeSegments: 32,
  } as EnvironmentQualitySettings,

  HIGH: {
    groundTextureResolution: 2048,
    cloudCount: 100,
    cloudDetailLevel: 3,
    enableFog: true,
    fogDensity: 0.0005,
    skyDomeSegments: 64,
  } as EnvironmentQualitySettings,
};

/**
 * EnvironmentSystem - Manages ground terrain and sky graphics
 *
 * Features:
 * - Procedurally textured ground plane with grass/dirt patterns
 * - Sky dome with gradient coloring (horizon to zenith)
 * - Volumetric cloud system (billboard sprites or 3D volumes)
 * - Atmospheric fog for depth perception
 * - Distance scenery (mountains, trees, buildings as low-poly models)
 * - Quality settings for performance scaling
 *
 * Performance targets:
 * - LOW: <1ms per frame (minimal clouds, simple ground)
 * - MEDIUM: <2ms per frame (50 clouds, detailed ground)
 * - HIGH: <3ms per frame (100 clouds, high-res ground)
 *
 * Coordinate system:
 * - Ground plane at Y=0
 * - Sky dome radius: 500 units (should exceed camera far plane)
 * - Ground extends to ±1000 units from origin
 */
export class EnvironmentSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private settings: EnvironmentQualitySettings;

  // Ground components
  private groundMesh: THREE.Mesh | null = null;
  private groundTexture: THREE.Texture | null = null;

  // Sky components
  private skyDome: THREE.Mesh | null = null;
  private skyGradientTexture: THREE.Texture | null = null;

  // Cloud system
  private clouds: THREE.Group | null = null;
  private cloudMeshes: THREE.Mesh[] = [];

  // Fog
  private fog: THREE.Fog | null = null;

  // Distant scenery
  private sceneryGroup: THREE.Group | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    qualitySettings: EnvironmentQualitySettings = ENVIRONMENT_QUALITY_PRESETS.MEDIUM
  ) {
    this.scene = scene;
    this.camera = camera;
    this.settings = qualitySettings;
  }

  /**
   * Initialize the environment system
   * Creates ground, sky, clouds, and scenery
   *
   * Performance: ~2-5ms one-time initialization cost
   */
  async init(): Promise<void> {
    console.log('🌍 Initializing EnvironmentSystem...');
    const startTime = performance.now();

    // Initialize components in parallel where possible
    await Promise.all([
      this.createGround(),
      this.createSky(),
    ]);

    // Create clouds and scenery (these can be created after sky/ground)
    this.createClouds();
    this.createDistantScenery();
    this.setupFog();

    const initTime = performance.now() - startTime;
    console.log(`✅ EnvironmentSystem initialized in ${initTime.toFixed(2)}ms`);
    console.log(`   Ground texture: ${this.settings.groundTextureResolution}x${this.settings.groundTextureResolution}`);
    console.log(`   Clouds: ${this.settings.cloudCount}`);
    console.log(`   Sky segments: ${this.settings.skyDomeSegments}`);
  }

  /**
   * Create ground plane with procedural texture
   *
   * Features:
   * - Large plane extending beyond track boundaries
   * - Procedural grass/dirt texture with color variation
   * - Receives shadows from vehicles and scenery
   * - Uses LOD for distant portions (future enhancement)
   *
   * Performance: ~1-2ms render time depending on resolution
   */
  private async createGround(): Promise<void> {
    // Create large ground plane (2000x2000 units to extend well beyond tracks)
    const groundSize = 2000;
    const groundGeometry = new THREE.PlaneGeometry(
      groundSize,
      groundSize,
      64, // Width segments (for potential future height displacement)
      64  // Height segments
    );

    // Generate procedural ground texture
    this.groundTexture = this.createProceduralGroundTexture(
      this.settings.groundTextureResolution
    );

    // Create ground material with texture
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: this.groundTexture,
      roughness: 0.9, // Rough surface (grass/dirt)
      metalness: 0.0, // Non-metallic
      color: 0xaaaaaa, // Slight desaturation for realism

      // Texture tiling for detail
      // Each texture repeat covers 50 units, giving us 40x40 repetitions across the plane
      // This prevents texture stretching while maintaining detail
    });

    // Enable texture wrapping and set repeat
    this.groundTexture.wrapS = THREE.RepeatWrapping;
    this.groundTexture.wrapT = THREE.RepeatWrapping;
    this.groundTexture.repeat.set(40, 40); // Repeat 40 times in each direction

    // Create mesh
    this.groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    this.groundMesh.rotation.x = -Math.PI / 2; // Rotate to horizontal
    this.groundMesh.position.y = 0; // Ground plane at Y=0
    this.groundMesh.receiveShadow = true; // Receive shadows from vehicles
    this.groundMesh.name = 'ground';

    // Add to scene
    this.scene.add(this.groundMesh);

    console.log('✅ Ground plane created (2000x2000 units, 40x40 texture repeats)');
  }

  /**
   * Generate procedural ground texture
   *
   * Creates a canvas-based texture with:
   * - Base grass color (green with variation)
   * - Dirt patches (brown areas)
   * - Noise for organic look
   *
   * This is more performant than loading external textures and allows
   * for dynamic color schemes without asset management.
   *
   * Performance: ~5-20ms one-time generation cost (depending on resolution)
   */
  private createProceduralGroundTexture(resolution: number): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d')!;

    // Base grass color (green with slight brown tint)
    const grassColor = { r: 80, g: 120, b: 60 };
    const dirtColor = { r: 120, g: 90, b: 60 };

    // Create base layer
    const imageData = ctx.createImageData(resolution, resolution);
    const data = imageData.data;

    // Simple noise function (deterministic pseudo-random)
    const noise = (x: number, y: number): number => {
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      return n - Math.floor(n);
    };

    // Generate texture pixel by pixel
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const i = (y * resolution + x) * 4;

        // Normalized coordinates (0-1)
        const nx = x / resolution;
        const ny = y / resolution;

        // Multi-scale noise for organic variation
        const n1 = noise(nx * 5, ny * 5); // Large patches
        const n2 = noise(nx * 20, ny * 20); // Medium detail
        const n3 = noise(nx * 50, ny * 50); // Fine grain

        // Combine noise layers (weighted)
        const combinedNoise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

        // Determine if this pixel is grass or dirt based on noise
        const isDirt = combinedNoise > 0.6; // 40% grass, 60% dirt patches

        // Select base color
        const baseColor = isDirt ? dirtColor : grassColor;

        // Add color variation (±15%)
        const variation = (noise(nx * 100, ny * 100) - 0.5) * 0.3;

        data[i + 0] = Math.max(0, Math.min(255, baseColor.r * (1 + variation))); // R
        data[i + 1] = Math.max(0, Math.min(255, baseColor.g * (1 + variation))); // G
        data[i + 2] = Math.max(0, Math.min(255, baseColor.b * (1 + variation))); // B
        data[i + 3] = 255; // Alpha (fully opaque)
      }
    }

    // Put image data on canvas
    ctx.putImageData(imageData, 0, 0);

    // Create Three.js texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Use linear filtering for better quality
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // Generate mipmaps for distant rendering
    texture.generateMipmaps = true;

    return texture;
  }

  /**
   * Create sky dome with gradient
   *
   * Uses a hemisphere geometry with a gradient material that transitions
   * from horizon color (light blue/white) to zenith color (deep blue).
   *
   * Sky dome radius (500 units) should be large enough to enclose all
   * gameplay areas while staying within camera far plane.
   *
   * Performance: Negligible (~0.1ms) - single draw call for entire sky
   */
  private async createSky(): Promise<void> {
    const skyRadius = 500;

    // Create sky dome geometry (hemisphere)
    // phiStart: 0, phiLength: Math.PI creates only top half (dome)
    const skyGeometry = new THREE.SphereGeometry(
      skyRadius,
      this.settings.skyDomeSegments, // Width segments
      Math.floor(this.settings.skyDomeSegments / 2), // Height segments (half for dome)
      0, // phiStart
      Math.PI * 2, // phiLength (full circle)
      0, // thetaStart
      Math.PI / 2 // thetaLength (only top hemisphere)
    );

    // Create gradient texture for sky
    this.skyGradientTexture = this.createSkyGradientTexture();

    // Create sky material with gradient
    const skyMaterial = new THREE.MeshBasicMaterial({
      map: this.skyGradientTexture,
      side: THREE.BackSide, // Render inside of sphere
      fog: false, // Sky should not be affected by fog
    });

    // Create sky dome mesh
    this.skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
    this.skyDome.position.y = 0; // Center at ground level
    this.skyDome.name = 'sky-dome';

    // Add to scene
    this.scene.add(this.skyDome);

    console.log(`✅ Sky dome created (radius: ${skyRadius}, segments: ${this.settings.skyDomeSegments})`);
  }

  /**
   * Generate procedural sky gradient texture
   *
   * Creates a vertical gradient from horizon (bottom) to zenith (top):
   * - Bottom: Light blue/white (horizon haze)
   * - Middle: Medium blue (sky body)
   * - Top: Deep blue (zenith)
   *
   * Performance: ~1-2ms one-time generation
   */
  private createSkyGradientTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    const resolution = 256; // Low resolution is fine for smooth gradient
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d')!;

    // Create vertical gradient
    const gradient = ctx.createLinearGradient(0, resolution, 0, 0);

    // Color stops (bottom to top)
    gradient.addColorStop(0, '#e6f0ff'); // Horizon: Light blue/white
    gradient.addColorStop(0.4, '#87ceeb'); // Mid: Sky blue
    gradient.addColorStop(1, '#4a6fa5'); // Zenith: Deep blue

    // Fill canvas with gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, resolution, resolution);

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * Create cloud system
   *
   * Uses billboard sprites (always face camera) for performance.
   * Each cloud is a simple plane with alpha-mapped texture.
   *
   * Clouds are randomly positioned in a cylindrical volume around
   * the track area at various heights (100-250 units above ground).
   *
   * Performance: ~0.5-2ms depending on cloud count
   */
  private createClouds(): void {
    if (this.settings.cloudCount === 0) {
      console.log('⏭️  Clouds disabled (count: 0)');
      return;
    }

    this.clouds = new THREE.Group();
    this.clouds.name = 'clouds';

    // Create cloud texture (procedural)
    const cloudTexture = this.createCloudTexture(
      128, // Resolution (clouds are distant, low-res is fine)
      this.settings.cloudDetailLevel
    );

    // Cloud material (alpha-blended for soft edges)
    const cloudMaterial = new THREE.MeshBasicMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      fog: false, // Clouds should not be affected by fog
      depthWrite: false, // Prevent z-fighting with other clouds
    });

    // Generate clouds in random positions
    const cloudSpawnRadius = 600; // Cylindrical radius for cloud spawning
    const cloudHeightMin = 100;
    const cloudHeightMax = 250;

    for (let i = 0; i < this.settings.cloudCount; i++) {
      // Random position in cylinder
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * cloudSpawnRadius;
      const height = cloudHeightMin + Math.random() * (cloudHeightMax - cloudHeightMin);

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Random cloud size (20-50 units)
      const size = 20 + Math.random() * 30;

      // Create cloud mesh
      const cloudGeometry = new THREE.PlaneGeometry(size, size * 0.6); // Wider than tall
      const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);

      cloudMesh.position.set(x, height, z);

      // Random rotation around Y axis
      cloudMesh.rotation.y = Math.random() * Math.PI * 2;

      this.clouds.add(cloudMesh);
      this.cloudMeshes.push(cloudMesh);
    }

    this.scene.add(this.clouds);

    console.log(`✅ Cloud system created (${this.settings.cloudCount} clouds)`);
  }

  /**
   * Generate procedural cloud texture
   *
   * Creates a fuzzy circular cloud shape with alpha transparency.
   * Uses multiple noise layers for organic appearance.
   *
   * @param resolution - Texture size (power of 2)
   * @param detailLevel - 1 (simple), 2 (medium), 3 (complex noise)
   *
   * Performance: ~2-10ms per texture generation
   */
  private createCloudTexture(resolution: number, detailLevel: number): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d')!;

    const imageData = ctx.createImageData(resolution, resolution);
    const data = imageData.data;

    // Simple noise function
    const noise = (x: number, y: number): number => {
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      return n - Math.floor(n);
    };

    const center = resolution / 2;
    const cloudRadius = resolution * 0.4;

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const i = (y * resolution + x) * 4;

        // Distance from center (normalized)
        const dx = (x - center) / cloudRadius;
        const dy = (y - center) / cloudRadius;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Normalized coordinates for noise
        const nx = x / resolution;
        const ny = y / resolution;

        // Generate noise based on detail level
        let noiseValue = 0;
        if (detailLevel >= 1) {
          noiseValue += noise(nx * 3, ny * 3) * 0.5; // Large features
        }
        if (detailLevel >= 2) {
          noiseValue += noise(nx * 8, ny * 8) * 0.3; // Medium features
        }
        if (detailLevel >= 3) {
          noiseValue += noise(nx * 16, ny * 16) * 0.2; // Fine details
        }

        // Circular falloff with noise distortion
        const cloudShape = Math.max(0, 1 - dist + noiseValue * 0.5);

        // Cloud color (white with slight variation)
        const brightness = 240 + Math.floor(noiseValue * 15);

        data[i + 0] = brightness; // R
        data[i + 1] = brightness; // G
        data[i + 2] = brightness; // B
        data[i + 3] = Math.floor(cloudShape * 255); // Alpha (transparency)
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * Create distant scenery (mountains, trees, buildings)
   *
   * Low-poly models placed at the horizon to create depth.
   * These are static decorations that don't affect gameplay.
   *
   * Future enhancement: Load actual 3D models
   * Current implementation: Simple geometric shapes as placeholders
   *
   * Performance: ~0.5ms (few draw calls, low poly count)
   */
  private createDistantScenery(): void {
    this.sceneryGroup = new THREE.Group();
    this.sceneryGroup.name = 'distant-scenery';

    // Mountain range in the distance
    this.createMountains();

    // Tree line around track perimeter
    this.createTreeLine();

    this.scene.add(this.sceneryGroup);

    console.log('✅ Distant scenery created (mountains, trees)');
  }

  /**
   * Create simplified mountain range
   *
   * Uses low-poly cone geometries to simulate distant mountains.
   * Positioned at horizon distance (400-500 units from center).
   */
  private createMountains(): void {
    const mountainDistance = 450;
    const mountainCount = 8;

    // Simple mountain material (gray with slight variation)
    const mountainMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true, // Low-poly aesthetic
    });

    for (let i = 0; i < mountainCount; i++) {
      const angle = (i / mountainCount) * Math.PI * 2;
      const x = Math.cos(angle) * mountainDistance;
      const z = Math.sin(angle) * mountainDistance;

      // Varying mountain heights
      const height = 40 + Math.random() * 80;
      const radius = 30 + Math.random() * 40;

      // Create mountain (cone)
      const mountainGeometry = new THREE.ConeGeometry(radius, height, 6);
      const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);

      mountain.position.set(x, height / 2, z); // Base at ground level
      mountain.rotation.y = Math.random() * Math.PI * 2;

      this.sceneryGroup!.add(mountain);
    }
  }

  /**
   * Create tree line around track perimeter
   *
   * Simple cylindrical trees with cone tops.
   * Positioned in a circle around the track area.
   */
  private createTreeLine(): void {
    const treeDistance = 250; // Distance from center
    const treeCount = 24; // Trees around perimeter

    // Tree trunk material (brown)
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3c2a,
      roughness: 0.9,
      metalness: 0.0,
    });

    // Tree foliage material (green)
    const foliageMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5a2d,
      roughness: 0.8,
      metalness: 0.0,
    });

    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const x = Math.cos(angle) * treeDistance;
      const z = Math.sin(angle) * treeDistance;

      // Create tree trunk (cylinder)
      const trunkGeometry = new THREE.CylinderGeometry(1, 1, 8, 8);
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.set(x, 4, z);

      // Create tree foliage (cone)
      const foliageGeometry = new THREE.ConeGeometry(4, 10, 8);
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.set(x, 10, z);

      this.sceneryGroup!.add(trunk);
      this.sceneryGroup!.add(foliage);
    }
  }

  /**
   * Setup atmospheric fog
   *
   * Exponential fog creates depth perception by fading distant objects.
   * Fog color matches horizon sky color for seamless blending.
   *
   * Performance: Negligible (~0.05ms) - shader-based, applied per-pixel
   */
  private setupFog(): void {
    if (!this.settings.enableFog) {
      console.log('⏭️  Fog disabled');
      return;
    }

    // Fog color matches horizon color
    const fogColor = 0xe6f0ff; // Light blue/white

    // Exponential fog (density-based)
    // Lower density = fog starts further away
    this.fog = new THREE.Fog(fogColor, 200, 500);
    this.scene.fog = this.fog;

    console.log(`✅ Atmospheric fog enabled (density: ${this.settings.fogDensity})`);
  }

  /**
   * Update environment (called each frame)
   *
   * Tasks:
   * - Billboard clouds to face camera
   * - Animate cloud positions (slow drift)
   * - Update fog distance based on camera settings
   *
   * Performance: ~0.1-0.5ms depending on cloud count
   */
  update(deltaTime: number): void {
    // Billboard clouds to always face camera
    if (this.clouds && this.cloudMeshes.length > 0) {
      this.cloudMeshes.forEach(cloud => {
        cloud.lookAt(this.camera.position);
      });

      // Slow cloud drift (optional animation)
      // Uncomment for moving clouds:
      // this.clouds.rotation.y += deltaTime * 0.01; // Very slow rotation
    }
  }

  /**
   * Update quality settings and rebuild environment
   *
   * @param newSettings - New quality settings
   */
  async setQualitySettings(newSettings: EnvironmentQualitySettings): Promise<void> {
    console.log('🔄 Updating environment quality settings...');

    // Dispose old resources
    this.dispose();

    // Update settings
    this.settings = newSettings;

    // Rebuild environment
    await this.init();
  }

  /**
   * Get current quality settings
   */
  getQualitySettings(): EnvironmentQualitySettings {
    return { ...this.settings };
  }

  /**
   * Dispose of all environment resources
   *
   * Cleans up geometries, materials, and textures to prevent memory leaks.
   */
  dispose(): void {
    console.log('🧹 Disposing EnvironmentSystem resources...');

    // Dispose ground
    if (this.groundMesh) {
      this.groundMesh.geometry.dispose();
      if (this.groundMesh.material instanceof THREE.Material) {
        this.groundMesh.material.dispose();
      }
      if (this.groundTexture) {
        this.groundTexture.dispose();
      }
      this.scene.remove(this.groundMesh);
      this.groundMesh = null;
      this.groundTexture = null;
    }

    // Dispose sky dome
    if (this.skyDome) {
      this.skyDome.geometry.dispose();
      if (this.skyDome.material instanceof THREE.Material) {
        this.skyDome.material.dispose();
      }
      if (this.skyGradientTexture) {
        this.skyGradientTexture.dispose();
      }
      this.scene.remove(this.skyDome);
      this.skyDome = null;
      this.skyGradientTexture = null;
    }

    // Dispose clouds
    if (this.clouds) {
      this.cloudMeshes.forEach(cloud => {
        cloud.geometry.dispose();
        if (cloud.material instanceof THREE.Material) {
          cloud.material.dispose();
          // Check if material has map property (MeshBasicMaterial, MeshStandardMaterial, etc.)
          const material = cloud.material as any;
          if (material.map && material.map instanceof THREE.Texture) {
            material.map.dispose();
          }
        }
      });
      this.scene.remove(this.clouds);
      this.clouds = null;
      this.cloudMeshes = [];
    }

    // Dispose scenery
    if (this.sceneryGroup) {
      this.sceneryGroup.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });
      this.scene.remove(this.sceneryGroup);
      this.sceneryGroup = null;
    }

    // Remove fog
    if (this.fog) {
      this.scene.fog = null;
      this.fog = null;
    }

    console.log('✅ EnvironmentSystem disposed');
  }
}
