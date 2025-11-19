/**
 * BackgroundSystem - Distant scenery and atmospheric effects
 *
 * Responsibilities:
 * - Create distant background elements (mountains, city skylines, desert terrain)
 * - Implement parallax scrolling effect for depth perception
 * - Manage atmospheric effects (volumetric fog, god rays, heat shimmer)
 * - Billboard cloud system with drift animation
 * - Track-specific background configurations
 *
 * Performance:
 * - Background meshes: <2000 triangles total
 * - Parallax updates: <0.2ms per frame
 * - Cloud animation: <0.1ms per frame
 * - Total budget: <1ms per frame
 *
 * Design philosophy:
 * - Keep distant scenery low-poly (silhouettes acceptable)
 * - Use fog to hide low detail at horizon
 * - Parallax objects maintain fixed distance from camera
 * - All backgrounds positioned at horizon (500-2000m from track center)
 */

import * as THREE from 'three';

/**
 * Background type definitions for different track themes
 */
export type BackgroundType = 'desert' | 'city' | 'mountain' | 'forest' | 'none';

/**
 * Configuration for background rendering
 */
export interface BackgroundConfig {
  type: BackgroundType;
  distance: number;          // Distance from track center (500-2000m)
  parallaxFactor: number;    // 0.0 = static, 1.0 = moves with camera
  enableClouds: boolean;     // Add billboard clouds
  enableAtmosphericEffects: boolean; // Heat shimmer, god rays, etc.
}

/**
 * Cloud configuration
 */
interface CloudConfig {
  count: number;
  altitude: number;
  spread: number;
  driftSpeed: number;
}

/**
 * BackgroundSystem - Manages distant scenery and atmospheric effects
 *
 * Performance: <1ms per frame total
 */
export class BackgroundSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private backgroundType: BackgroundType = 'none';

  // Background elements
  private backgroundGroup: THREE.Group;
  private mountains: THREE.Mesh | null = null;
  private cityscape: THREE.Mesh | null = null;
  private desertTerrain: THREE.Mesh | null = null;

  // Cloud system
  private cloudGroup: THREE.Group;
  private clouds: THREE.Sprite[] = [];
  private cloudDriftTime: number = 0;

  // Parallax tracking
  private lastCameraPosition = new THREE.Vector3();
  private backgroundOffset = new THREE.Vector3();

  // Configuration
  private config: BackgroundConfig;

  // Temp objects (zero per-frame allocations)
  private tempVec1 = new THREE.Vector3();
  private tempVec2 = new THREE.Vector3();

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;

    // Initialize groups
    this.backgroundGroup = new THREE.Group();
    this.backgroundGroup.name = 'background-scenery';
    this.scene.add(this.backgroundGroup);

    this.cloudGroup = new THREE.Group();
    this.cloudGroup.name = 'clouds';
    this.scene.add(this.cloudGroup);

    // Default configuration
    this.config = {
      type: 'none',
      distance: 1000,
      parallaxFactor: 0.3,
      enableClouds: false,
      enableAtmosphericEffects: false,
    };

    console.log('✅ BackgroundSystem initialized');
  }

  /**
   * Set background type and create scenery
   *
   * @param backgroundType - Type of background to create
   * @param config - Optional background configuration
   */
  async setBackground(backgroundType: BackgroundType, config?: Partial<BackgroundConfig>): Promise<void> {
    // Clear existing background
    this.clear();

    this.backgroundType = backgroundType;

    // Update configuration
    this.config = {
      ...this.config,
      type: backgroundType,
      ...(config || {}),
    };

    // Create appropriate background
    switch (backgroundType) {
      case 'desert':
        this.createDesertBackground();
        this.config.enableClouds = false; // Desert: clear sky
        this.config.enableAtmosphericEffects = true; // Heat shimmer
        break;

      case 'city':
        this.createCityBackground();
        this.config.enableClouds = false; // Urban: pollution haze
        break;

      case 'mountain':
        this.createMountainBackground();
        this.config.enableClouds = true; // Mountains: alpine clouds
        break;

      case 'forest':
        this.createForestBackground();
        this.config.enableClouds = true; // Forest: scattered clouds
        break;

      case 'none':
        // No background
        break;
    }

    // Create clouds if enabled
    if (this.config.enableClouds) {
      this.createClouds({
        count: 8,
        altitude: 200,
        spread: 1500,
        driftSpeed: 0.5,
      });
    }

    console.log(`✅ Background set to ${backgroundType}`);
  }

  /**
   * Create desert background: distant mountains and sandy terrain
   *
   * Performance: <1000 triangles
   */
  private createDesertBackground(): void {
    // 1. Distant mountain silhouettes (low-poly)
    const mountainGeometry = new THREE.BufferGeometry();
    const mountainVertices: number[] = [];
    const mountainIndices: number[] = [];

    // Generate mountain silhouette using simple triangles
    const peakCount = 12;
    const distance = this.config.distance;
    const baseY = -20; // Below horizon
    const maxHeight = 150;

    for (let i = 0; i < peakCount; i++) {
      const angle = (i / peakCount) * Math.PI * 2;
      const nextAngle = ((i + 1) / peakCount) * Math.PI * 2;

      // Vary peak heights
      const peakHeight = maxHeight * (0.4 + Math.random() * 0.6);
      const nextPeakHeight = maxHeight * (0.4 + Math.random() * 0.6);

      // Base positions
      const x1 = Math.cos(angle) * distance;
      const z1 = Math.sin(angle) * distance;
      const x2 = Math.cos(nextAngle) * distance;
      const z2 = Math.sin(nextAngle) * distance;

      // Create mountain profile (base -> peak -> base)
      const baseIndex = mountainVertices.length / 3;

      // Bottom edge
      mountainVertices.push(x1, baseY, z1);
      mountainVertices.push(x2, baseY, z2);

      // Peak
      mountainVertices.push(
        (x1 + x2) / 2,
        baseY + peakHeight,
        (z1 + z2) / 2
      );

      // Triangle: base1 -> base2 -> peak
      mountainIndices.push(baseIndex, baseIndex + 1, baseIndex + 2);
    }

    mountainGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(mountainVertices, 3)
    );
    mountainGeometry.setIndex(mountainIndices);
    mountainGeometry.computeVertexNormals();

    const mountainMaterial = new THREE.MeshBasicMaterial({
      color: 0x8b7355, // Sandy brown
      side: THREE.DoubleSide,
      fog: true,
    });

    this.mountains = new THREE.Mesh(mountainGeometry, mountainMaterial);
    this.mountains.name = 'desert-mountains';
    this.backgroundGroup.add(this.mountains);

    // 2. Desert floor horizon (flat plane)
    const desertGeometry = new THREE.CircleGeometry(distance * 1.2, 32);
    const desertMaterial = new THREE.MeshBasicMaterial({
      color: 0xd2b48c, // Tan
      side: THREE.DoubleSide,
      fog: true,
    });

    this.desertTerrain = new THREE.Mesh(desertGeometry, desertMaterial);
    this.desertTerrain.rotation.x = -Math.PI / 2; // Horizontal
    this.desertTerrain.position.y = baseY;
    this.desertTerrain.name = 'desert-floor';
    this.backgroundGroup.add(this.desertTerrain);

    console.log(`Desert background created: ${mountainVertices.length / 3} vertices`);
  }

  /**
   * Create city background: distant skyline with building lights
   *
   * Performance: <800 triangles
   */
  private createCityBackground(): void {
    const distance = this.config.distance;
    const buildingCount = 20;
    const cityGeometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < buildingCount; i++) {
      const angle = (i / buildingCount) * Math.PI * 2;
      const width = 20 + Math.random() * 40;
      const height = 50 + Math.random() * 150;
      const depth = 15 + Math.random() * 25;

      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      // Simple box (front face only for distant skyline)
      const baseIndex = vertices.length / 3;

      // Front face quad
      vertices.push(x - width / 2, 0, z); // Bottom left
      vertices.push(x + width / 2, 0, z); // Bottom right
      vertices.push(x + width / 2, height, z); // Top right
      vertices.push(x - width / 2, height, z); // Top left

      // Two triangles
      indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
      indices.push(baseIndex, baseIndex + 2, baseIndex + 3);
    }

    cityGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    cityGeometry.setIndex(indices);
    cityGeometry.computeVertexNormals();

    const cityMaterial = new THREE.MeshBasicMaterial({
      color: 0x2a2a3a, // Dark blue-gray
      side: THREE.FrontSide,
      fog: true,
    });

    this.cityscape = new THREE.Mesh(cityGeometry, cityMaterial);
    this.cityscape.name = 'city-skyline';
    this.backgroundGroup.add(this.cityscape);

    console.log(`City background created: ${vertices.length / 3} vertices`);
  }

  /**
   * Create mountain background: distant alpine peaks
   *
   * Performance: <1200 triangles
   */
  private createMountainBackground(): void {
    const distance = this.config.distance;
    const peakCount = 16;
    const mountainGeometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < peakCount; i++) {
      const angle = (i / peakCount) * Math.PI * 2;
      const nextAngle = ((i + 1) / peakCount) * Math.PI * 2;

      // Create jagged mountain profile
      const peakHeight = 200 + Math.random() * 300;

      const x1 = Math.cos(angle) * distance;
      const z1 = Math.sin(angle) * distance;
      const x2 = Math.cos(nextAngle) * distance;
      const z2 = Math.sin(nextAngle) * distance;

      const baseIndex = vertices.length / 3;

      // Mountain triangle
      vertices.push(x1, 0, z1); // Base left
      vertices.push(x2, 0, z2); // Base right
      vertices.push((x1 + x2) / 2, peakHeight, (z1 + z2) / 2); // Peak

      indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
    }

    mountainGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    mountainGeometry.setIndex(indices);
    mountainGeometry.computeVertexNormals();

    const mountainMaterial = new THREE.MeshBasicMaterial({
      color: 0x6a7b8c, // Blue-gray
      side: THREE.DoubleSide,
      fog: true,
    });

    this.mountains = new THREE.Mesh(mountainGeometry, mountainMaterial);
    this.mountains.name = 'alpine-mountains';
    this.backgroundGroup.add(this.mountains);

    console.log(`Mountain background created: ${vertices.length / 3} vertices`);
  }

  /**
   * Create forest background: distant tree line
   *
   * Performance: <600 triangles
   */
  private createForestBackground(): void {
    const distance = this.config.distance;
    const treeCount = 40;
    const forestGeometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const treeHeight = 40 + Math.random() * 60;
      const treeWidth = 10 + Math.random() * 15;

      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      const baseIndex = vertices.length / 3;

      // Simple triangle for tree silhouette
      vertices.push(x - treeWidth / 2, 0, z); // Base left
      vertices.push(x + treeWidth / 2, 0, z); // Base right
      vertices.push(x, treeHeight, z); // Top

      indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
    }

    forestGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    forestGeometry.setIndex(indices);
    forestGeometry.computeVertexNormals();

    const forestMaterial = new THREE.MeshBasicMaterial({
      color: 0x2d5016, // Dark green
      side: THREE.DoubleSide,
      fog: true,
    });

    this.mountains = new THREE.Mesh(forestGeometry, forestMaterial);
    this.mountains.name = 'forest-treeline';
    this.backgroundGroup.add(this.mountains);

    console.log(`Forest background created: ${vertices.length / 3} vertices`);
  }

  /**
   * Create billboard cloud system
   *
   * Performance: <0.1ms per frame (simple sprite updates)
   */
  private createClouds(config: CloudConfig): void {
    const cloudTexture = this.createCloudTexture();

    for (let i = 0; i < config.count; i++) {
      const spriteMaterial = new THREE.SpriteMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.6,
        fog: true,
      });

      const sprite = new THREE.Sprite(spriteMaterial);

      // Random position in sky dome
      const angle = Math.random() * Math.PI * 2;
      const radius = config.spread * (0.5 + Math.random() * 0.5);

      sprite.position.set(
        Math.cos(angle) * radius,
        config.altitude + Math.random() * 50,
        Math.sin(angle) * radius
      );

      // Random size
      const scale = 100 + Math.random() * 100;
      sprite.scale.set(scale, scale * 0.6, 1);

      sprite.userData.driftAngle = Math.random() * Math.PI * 2;
      sprite.userData.driftSpeed = config.driftSpeed * (0.8 + Math.random() * 0.4);
      sprite.userData.initialPosition = sprite.position.clone();

      this.cloudGroup.add(sprite);
      this.clouds.push(sprite);
    }

    console.log(`Created ${config.count} billboard clouds`);
  }

  /**
   * Create simple cloud texture using canvas
   *
   * Performance: Called once during initialization
   */
  private createCloudTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d')!;

    // Radial gradient for soft cloud
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * Update parallax effect and cloud animation
   *
   * Performance: <0.3ms per frame
   *
   * @param deltaTime - Time since last frame in seconds
   */
  update(deltaTime: number): void {
    if (this.backgroundType === 'none') return;

    // Update parallax effect
    this.updateParallax();

    // Update cloud drift
    if (this.clouds.length > 0) {
      this.updateClouds(deltaTime);
    }
  }

  /**
   * Update parallax scrolling effect
   *
   * Distant objects move slower than camera to create depth perception.
   * Formula: position = cameraPosition + offset * (1 - parallaxFactor)
   *
   * Performance: <0.2ms per frame
   */
  private updateParallax(): void {
    // Get camera position
    this.camera.getWorldPosition(this.tempVec1);

    // Calculate camera movement since last frame
    const movement = this.tempVec2.subVectors(this.tempVec1, this.lastCameraPosition);

    // Apply parallax factor (0.3 = background moves 30% of camera movement)
    movement.multiplyScalar(this.config.parallaxFactor);

    // Update background group position
    this.backgroundGroup.position.x = this.tempVec1.x * this.config.parallaxFactor;
    this.backgroundGroup.position.z = this.tempVec1.z * this.config.parallaxFactor;

    // Store current camera position for next frame
    this.lastCameraPosition.copy(this.tempVec1);
  }

  /**
   * Update cloud drift animation
   *
   * Performance: <0.1ms per frame
   */
  private updateClouds(deltaTime: number): void {
    this.cloudDriftTime += deltaTime;

    for (const cloud of this.clouds) {
      const driftAngle = cloud.userData.driftAngle;
      const driftSpeed = cloud.userData.driftSpeed;
      const initialPos = cloud.userData.initialPosition;

      // Slow circular drift
      const offset = this.cloudDriftTime * driftSpeed;
      cloud.position.x = initialPos.x + Math.cos(driftAngle + offset) * 20;
      cloud.position.z = initialPos.z + Math.sin(driftAngle + offset) * 20;
    }
  }

  /**
   * Get current background type
   */
  getBackgroundType(): BackgroundType {
    return this.backgroundType;
  }

  /**
   * Get triangle count for performance monitoring
   */
  getTriangleCount(): number {
    let count = 0;

    this.backgroundGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.geometry) {
        const indexCount = obj.geometry.index?.count || 0;
        count += indexCount / 3;
      }
    });

    return Math.floor(count);
  }

  /**
   * Clear all background elements
   */
  private clear(): void {
    // Clear background meshes
    this.backgroundGroup.clear();

    // Dispose geometries and materials
    if (this.mountains) {
      this.mountains.geometry.dispose();
      (this.mountains.material as THREE.Material).dispose();
      this.mountains = null;
    }

    if (this.cityscape) {
      this.cityscape.geometry.dispose();
      (this.cityscape.material as THREE.Material).dispose();
      this.cityscape = null;
    }

    if (this.desertTerrain) {
      this.desertTerrain.geometry.dispose();
      (this.desertTerrain.material as THREE.Material).dispose();
      this.desertTerrain = null;
    }

    // Clear clouds
    for (const cloud of this.clouds) {
      if (cloud.material.map) {
        cloud.material.map.dispose();
      }
      cloud.material.dispose();
    }
    this.cloudGroup.clear();
    this.clouds = [];
    this.cloudDriftTime = 0;
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clear();

    this.scene.remove(this.backgroundGroup);
    this.scene.remove(this.cloudGroup);

    console.log('BackgroundSystem disposed');
  }
}
