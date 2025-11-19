/**
 * MaterialLibrary - PBR Material System for Hard Drivin'
 *
 * Implements physically based rendering (PBR) materials using metallic-roughness workflow.
 * Provides a centralized material library for consistent, high-quality visuals.
 *
 * Features:
 * - Metallic-roughness workflow (industry standard)
 * - Environment map reflections for metallic surfaces
 * - Material sharing to reduce memory usage
 * - Texture map support (albedo, normal, metalness, roughness, AO)
 * - Performance optimized (shared materials, mipmaps, compressed textures)
 *
 * Performance target:
 * - Material setup: One-time cost on load (<50ms total)
 * - Rendering: No additional per-frame cost (same as basic materials)
 * - Memory: <20MB for all materials and textures
 */

import * as THREE from 'three';

/**
 * PBR material configuration
 */
export interface PBRMaterialConfig {
  name: string;
  color: number;
  metalness: number;      // 0.0 = dielectric, 1.0 = metal
  roughness: number;      // 0.0 = mirror smooth, 1.0 = fully rough
  emissive?: number;      // Emissive color (glowing parts)
  emissiveIntensity?: number;
  envMapIntensity?: number; // Reflection intensity (0-2)
  normalScale?: number;   // Normal map strength
  aoMapIntensity?: number; // AO map strength
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;

  // Texture paths (optional)
  albedoMap?: string;
  normalMap?: string;
  metalnessMap?: string;
  roughnessMap?: string;
  aoMap?: string;
}

/**
 * Material categories for organization
 */
export enum MaterialCategory {
  VEHICLE = 'vehicle',
  TRACK = 'track',
  SCENERY = 'scenery',
  OBSTACLE = 'obstacle',
}

/**
 * MaterialLibrary - Centralized PBR material management
 *
 * Singleton pattern ensures one shared library instance across the game.
 */
export class MaterialLibrary {
  private static instance: MaterialLibrary | null = null;

  // Material storage
  private materials: Map<string, THREE.MeshStandardMaterial> = new Map();
  private textures: Map<string, THREE.Texture> = new Map();

  // Environment map for reflections
  private envMap: THREE.Texture | null = null;
  private scene: THREE.Scene | null = null;

  // Texture loader
  private textureLoader: THREE.TextureLoader;

  private constructor() {
    this.textureLoader = new THREE.TextureLoader();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MaterialLibrary {
    if (!MaterialLibrary.instance) {
      MaterialLibrary.instance = new MaterialLibrary();
    }
    return MaterialLibrary.instance;
  }

  /**
   * Initialize material library with scene reference
   *
   * @param scene - Three.js scene (needed for environment map)
   */
  init(scene: THREE.Scene): void {
    this.scene = scene;

    // Generate environment map from scene background
    this.generateEnvironmentMap();

    // Create all predefined materials
    this.createVehicleMaterials();
    this.createTrackMaterials();
    this.createSceneryMaterials();
    this.createObstacleMaterials();

    console.log(`[MaterialLibrary] Initialized with ${this.materials.size} materials`);
  }

  /**
   * Generate environment map for reflections
   *
   * Uses scene background or generates a simple gradient map
   */
  private generateEnvironmentMap(): void {
    if (!this.scene) return;

    // Option 1: Use scene background if it's a texture
    if (this.scene.background instanceof THREE.Texture) {
      this.envMap = this.scene.background;
      console.log('[MaterialLibrary] Using scene background as environment map');
      return;
    }

    // Option 2: Generate simple cube map for reflections
    const pmremGenerator = new THREE.PMREMGenerator(new THREE.WebGLRenderer());
    pmremGenerator.compileEquirectangularShader();

    // Create simple gradient environment
    const renderTarget = pmremGenerator.fromScene(this.scene, 0.04);
    this.envMap = renderTarget.texture;

    pmremGenerator.dispose();
    console.log('[MaterialLibrary] Generated environment map for reflections');
  }

  /**
   * Create a PBR material from configuration
   *
   * @param config - Material configuration
   * @returns MeshStandardMaterial with PBR properties
   */
  private createMaterial(config: PBRMaterialConfig): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      name: config.name,
      color: config.color,
      metalness: config.metalness,
      roughness: config.roughness,

      // Environment map for reflections (only affects metallic surfaces)
      envMap: this.envMap,
      envMapIntensity: config.envMapIntensity ?? 1.0,

      // Emissive (glowing) properties
      emissive: config.emissive ?? 0x000000,
      emissiveIntensity: config.emissiveIntensity ?? 0.0,

      // Transparency
      transparent: config.transparent ?? false,
      opacity: config.opacity ?? 1.0,

      // Rendering options
      side: config.side ?? THREE.FrontSide,
      flatShading: false, // Always use smooth shading for PBR
    });

    // Load textures if paths provided
    if (config.albedoMap) {
      material.map = this.loadTexture(config.albedoMap);
    }

    if (config.normalMap) {
      material.normalMap = this.loadTexture(config.normalMap);
      material.normalScale = new THREE.Vector2(
        config.normalScale ?? 1.0,
        config.normalScale ?? 1.0
      );
    }

    if (config.metalnessMap) {
      material.metalnessMap = this.loadTexture(config.metalnessMap);
    }

    if (config.roughnessMap) {
      material.roughnessMap = this.loadTexture(config.roughnessMap);
    }

    if (config.aoMap) {
      material.aoMap = this.loadTexture(config.aoMap);
      material.aoMapIntensity = config.aoMapIntensity ?? 1.0;
    }

    return material;
  }

  /**
   * Load texture with caching and optimization
   *
   * @param path - Texture file path
   * @returns Cached texture
   */
  private loadTexture(path: string): THREE.Texture {
    // Check cache first
    if (this.textures.has(path)) {
      return this.textures.get(path)!;
    }

    // Load texture
    const texture = this.textureLoader.load(path);

    // Optimize texture
    texture.colorSpace = THREE.SRGBColorSpace; // Proper color space for albedo
    texture.generateMipmaps = true; // Enable mipmaps for better quality at distance
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 4; // Moderate anisotropic filtering (4x)

    // Cache texture
    this.textures.set(path, texture);

    return texture;
  }

  /**
   * Create vehicle materials
   *
   * Materials for car body, chrome trim, glass, tires
   */
  private createVehicleMaterials(): void {
    // Car paint - High metalness, low roughness (glossy finish)
    // Reflective car paint with environment reflections
    this.materials.set('car_paint_red', this.createMaterial({
      name: 'car_paint_red',
      color: 0xcc0000,
      metalness: 0.9,  // Very metallic
      roughness: 0.15, // Glossy finish
      envMapIntensity: 1.2, // Strong reflections
    }));

    this.materials.set('car_paint_blue', this.createMaterial({
      name: 'car_paint_blue',
      color: 0x0044cc,
      metalness: 0.9,
      roughness: 0.15,
      envMapIntensity: 1.2,
    }));

    this.materials.set('car_paint_yellow', this.createMaterial({
      name: 'car_paint_yellow',
      color: 0xffcc00,
      metalness: 0.9,
      roughness: 0.15,
      envMapIntensity: 1.2,
    }));

    this.materials.set('car_paint_black', this.createMaterial({
      name: 'car_paint_black',
      color: 0x0a0a0a,
      metalness: 0.9,
      roughness: 0.12,
      envMapIntensity: 1.5, // Extra reflective for black paint
    }));

    // Chrome trim - Full metalness, very low roughness (mirror-like)
    this.materials.set('chrome', this.createMaterial({
      name: 'chrome',
      color: 0xcccccc,
      metalness: 1.0,  // Pure metal
      roughness: 0.05, // Nearly mirror smooth
      envMapIntensity: 1.8, // Very strong reflections
    }));

    // Glass windows - Transparent, low roughness
    this.materials.set('glass', this.createMaterial({
      name: 'glass',
      color: 0x88ccff,
      metalness: 0.0,  // Dielectric (glass is not metal)
      roughness: 0.1,  // Slightly rough glass
      transparent: true,
      opacity: 0.3,
      envMapIntensity: 1.0,
    }));

    // Tire rubber - Low metalness, high roughness (matte black)
    this.materials.set('tire', this.createMaterial({
      name: 'tire',
      color: 0x0a0a0a,
      metalness: 0.0,  // Rubber is non-metallic
      roughness: 0.95, // Very rough surface
      envMapIntensity: 0.2, // Minimal reflections
    }));

    // Headlight glass - Emissive when active
    this.materials.set('headlight', this.createMaterial({
      name: 'headlight',
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
      emissive: 0xffffcc,
      emissiveIntensity: 0.5,
    }));

    // Taillight glass - Red emissive
    this.materials.set('taillight', this.createMaterial({
      name: 'taillight',
      color: 0xff0000,
      metalness: 0.0,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
      emissive: 0xff0000,
      emissiveIntensity: 0.3,
    }));
  }

  /**
   * Create track materials
   *
   * Materials for asphalt, concrete, barriers, painted lines
   */
  private createTrackMaterials(): void {
    // Asphalt - Dark, rough surface
    this.materials.set('asphalt', this.createMaterial({
      name: 'asphalt',
      color: 0x2a2a2a,
      metalness: 0.0,  // Asphalt is non-metallic
      roughness: 0.85, // Rough surface
      envMapIntensity: 0.1,
    }));

    // Concrete - Light gray, moderate roughness
    this.materials.set('concrete', this.createMaterial({
      name: 'concrete',
      color: 0x999999,
      metalness: 0.0,
      roughness: 0.7,
      envMapIntensity: 0.15,
    }));

    // Concrete barrier - Jersey barrier style
    this.materials.set('concrete_barrier', this.createMaterial({
      name: 'concrete_barrier',
      color: 0xcccccc,
      metalness: 0.0,
      roughness: 0.9,
      envMapIntensity: 0.1,
    }));

    // Metal barrier - Galvanized steel
    this.materials.set('metal_barrier', this.createMaterial({
      name: 'metal_barrier',
      color: 0x888888,
      metalness: 0.8,  // Metallic
      roughness: 0.4,  // Moderately rough (weathered metal)
      envMapIntensity: 0.7,
    }));

    // Painted line - White line markings
    this.materials.set('painted_line_white', this.createMaterial({
      name: 'painted_line_white',
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.6,
      emissive: 0xffffff,
      emissiveIntensity: 0.1, // Slight glow for visibility
    }));

    // Painted line - Yellow center line
    this.materials.set('painted_line_yellow', this.createMaterial({
      name: 'painted_line_yellow',
      color: 0xffff00,
      metalness: 0.0,
      roughness: 0.6,
      emissive: 0xffff00,
      emissiveIntensity: 0.1,
    }));

    // Grass/dirt offtrack - Green, very rough
    this.materials.set('grass', this.createMaterial({
      name: 'grass',
      color: 0x2d5016,
      metalness: 0.0,
      roughness: 0.95,
      envMapIntensity: 0.05,
    }));

    this.materials.set('dirt', this.createMaterial({
      name: 'dirt',
      color: 0x6b4423,
      metalness: 0.0,
      roughness: 0.9,
      envMapIntensity: 0.1,
    }));
  }

  /**
   * Create scenery materials
   *
   * Materials for grandstands, buildings, trees, rocks
   */
  private createSceneryMaterials(): void {
    // Grandstand structure - Steel frame
    this.materials.set('grandstand_frame', this.createMaterial({
      name: 'grandstand_frame',
      color: 0x4a4a4a,
      metalness: 0.7,
      roughness: 0.5,
      envMapIntensity: 0.6,
    }));

    // Grandstand seats - Plastic
    this.materials.set('grandstand_seats', this.createMaterial({
      name: 'grandstand_seats',
      color: 0x2266cc,
      metalness: 0.0,
      roughness: 0.4,
      envMapIntensity: 0.3,
    }));

    // Building exterior - Concrete/brick
    this.materials.set('building_exterior', this.createMaterial({
      name: 'building_exterior',
      color: 0x808080,
      metalness: 0.0,
      roughness: 0.8,
      envMapIntensity: 0.2,
    }));

    // Building windows - Reflective glass
    this.materials.set('building_windows', this.createMaterial({
      name: 'building_windows',
      color: 0x88ccff,
      metalness: 0.0,
      roughness: 0.05,
      transparent: true,
      opacity: 0.4,
      envMapIntensity: 1.5,
    }));

    // Tree trunk - Bark
    this.materials.set('tree_trunk', this.createMaterial({
      name: 'tree_trunk',
      color: 0x4a2511,
      metalness: 0.0,
      roughness: 0.95,
      envMapIntensity: 0.05,
    }));

    // Tree foliage - Leaves
    this.materials.set('tree_foliage', this.createMaterial({
      name: 'tree_foliage',
      color: 0x2d5016,
      metalness: 0.0,
      roughness: 0.9,
      envMapIntensity: 0.1,
    }));

    // Rock - Gray stone
    this.materials.set('rock', this.createMaterial({
      name: 'rock',
      color: 0x666666,
      metalness: 0.0,
      roughness: 0.95,
      envMapIntensity: 0.1,
    }));

    // Flag pole - Aluminum
    this.materials.set('flag_pole', this.createMaterial({
      name: 'flag_pole',
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.3,
      envMapIntensity: 0.8,
    }));

    // Flag fabric - Cloth
    this.materials.set('flag_fabric', this.createMaterial({
      name: 'flag_fabric',
      color: 0xff0000,
      metalness: 0.0,
      roughness: 0.8,
      side: THREE.DoubleSide,
      envMapIntensity: 0.2,
    }));
  }

  /**
   * Create obstacle materials
   *
   * Materials for cones, barriers, tire walls
   */
  private createObstacleMaterials(): void {
    // Traffic cone - Orange plastic
    this.materials.set('cone_orange', this.createMaterial({
      name: 'cone_orange',
      color: 0xff6600,
      metalness: 0.0,
      roughness: 0.5,
      envMapIntensity: 0.3,
    }));

    // Traffic cone - White stripes
    this.materials.set('cone_white', this.createMaterial({
      name: 'cone_white',
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.5,
      envMapIntensity: 0.3,
    }));

    // Tire wall - Black rubber
    this.materials.set('tire_wall', this.createMaterial({
      name: 'tire_wall',
      color: 0x1a1a1a,
      metalness: 0.0,
      roughness: 0.95,
      envMapIntensity: 0.15,
    }));

    // Safety barrier - Orange and white
    this.materials.set('barrier_orange', this.createMaterial({
      name: 'barrier_orange',
      color: 0xff6600,
      metalness: 0.1,
      roughness: 0.6,
      envMapIntensity: 0.3,
    }));

    this.materials.set('barrier_white', this.createMaterial({
      name: 'barrier_white',
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.6,
      envMapIntensity: 0.3,
    }));
  }

  /**
   * Get material by name
   *
   * @param name - Material name
   * @returns Material or null if not found
   */
  getMaterial(name: string): THREE.MeshStandardMaterial | null {
    return this.materials.get(name) || null;
  }

  /**
   * Create variant of existing material with different color
   *
   * @param baseMaterialName - Base material to clone
   * @param color - New color
   * @param variantName - Name for variant
   * @returns New material variant
   */
  createColorVariant(
    baseMaterialName: string,
    color: number,
    variantName: string
  ): THREE.MeshStandardMaterial | null {
    const baseMaterial = this.materials.get(baseMaterialName);
    if (!baseMaterial) {
      console.warn(`[MaterialLibrary] Base material '${baseMaterialName}' not found`);
      return null;
    }

    // Clone material and change color
    const variant = baseMaterial.clone();
    variant.name = variantName;
    variant.color.setHex(color);

    // Cache variant
    this.materials.set(variantName, variant);

    return variant;
  }

  /**
   * Update environment map (e.g., when skybox changes)
   *
   * @param envMap - New environment map texture
   */
  updateEnvironmentMap(envMap: THREE.Texture): void {
    this.envMap = envMap;

    // Update all materials with new environment map
    for (const material of this.materials.values()) {
      material.envMap = envMap;
      material.needsUpdate = true;
    }

    console.log('[MaterialLibrary] Updated environment map for all materials');
  }

  /**
   * Get material statistics
   *
   * @returns Material and texture counts
   */
  getStats(): { materialCount: number; textureCount: number; memoryEstimate: string } {
    const materialCount = this.materials.size;
    const textureCount = this.textures.size;

    // Rough memory estimate (assuming average texture size)
    const avgTextureSize = 1; // 1MB per texture (rough estimate)
    const memoryMB = textureCount * avgTextureSize + materialCount * 0.01; // Materials are tiny

    return {
      materialCount,
      textureCount,
      memoryEstimate: `~${memoryMB.toFixed(1)}MB`,
    };
  }

  /**
   * Dispose of all materials and textures
   *
   * Call this when shutting down the game to prevent memory leaks
   */
  dispose(): void {
    // Dispose all materials
    for (const material of this.materials.values()) {
      material.dispose();
    }
    this.materials.clear();

    // Dispose all textures
    for (const texture of this.textures.values()) {
      texture.dispose();
    }
    this.textures.clear();

    // Clear environment map
    this.envMap = null;
    this.scene = null;

    console.log('[MaterialLibrary] Disposed all materials and textures');
  }
}
