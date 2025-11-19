import * as THREE from 'three';
import {
  VehicleModelType,
  IVehicleModelBuilder,
  VehicleModelConfig,
  DEFAULT_MODEL_CONFIGS,
} from './VehicleModelTypes';
import { CorvetteModel } from './CorvetteModel';
import { CybertruckModel } from './CybertruckModel';
import { MaterialLibrary } from '../../systems/MaterialLibrary';

/**
 * VehicleModelFactory - Creates 3D vehicle models
 *
 * Responsibilities:
 * - Instantiate appropriate model builder based on vehicle type
 * - Manage model configuration (colors, materials)
 * - Create wheel meshes that match the vehicle style
 * - Provide default configurations
 *
 * Usage:
 * ```typescript
 * const factory = new VehicleModelFactory();
 * const carMesh = factory.createVehicleMesh(VehicleModelType.CORVETTE);
 * const wheelMeshes = factory.createWheelMeshes(VehicleModelType.CORVETTE, wheelConfigs);
 * scene.add(carMesh);
 * ```
 *
 * Performance:
 * - Models are procedurally generated (no texture loading)
 * - Low poly counts (~150-200 triangles per vehicle)
 * - PBR materials for realistic lighting
 * - Single draw call per material type
 */
export class VehicleModelFactory {
  /**
   * Create a complete vehicle mesh group.
   *
   * @param modelType - Type of vehicle to create
   * @param config - Optional custom configuration (uses defaults if not provided)
   * @returns THREE.Group containing all vehicle parts
   */
  createVehicleMesh(
    modelType: VehicleModelType,
    config?: Partial<VehicleModelConfig>
  ): THREE.Group {
    // Get default config and merge with custom config
    const defaultConfig = DEFAULT_MODEL_CONFIGS[modelType];
    const finalConfig: VehicleModelConfig = {
      ...defaultConfig,
      ...config,
    };

    // Create appropriate model builder
    const builder = this.createModelBuilder(modelType, finalConfig);

    // Build and return the model
    return builder.buildModel();
  }

  /**
   * Create wheel meshes for a specific vehicle type.
   *
   * Wheels are styled to match the vehicle aesthetic.
   *
   * @param modelType - Type of vehicle (affects wheel style)
   * @param wheelConfigs - Wheel configuration from VehicleConfig
   * @returns Array of 4 wheel meshes
   */
  createWheelMeshes(
    modelType: VehicleModelType,
    wheelConfigs: Array<{ radius: number; width: number }>
  ): THREE.Mesh[] {
    const wheelMeshes: THREE.Mesh[] = [];

    // Create material based on vehicle type
    const wheelMaterial = this.createWheelMaterial(modelType);

    for (let i = 0; i < 4; i++) {
      const config = wheelConfigs[i];
      const wheelGeometry = new THREE.CylinderGeometry(
        config.radius,
        config.radius,
        config.width,
        modelType === VehicleModelType.CYBERTRUCK ? 8 : 16 // Fewer segments for Cybertruck
      );

      // Rotate cylinder to align with X-axis (cylinders default to Y-axis)
      wheelGeometry.rotateZ(Math.PI / 2);

      const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheelMesh.castShadow = true;
      wheelMesh.receiveShadow = true;

      wheelMeshes.push(wheelMesh);
    }

    return wheelMeshes;
  }

  /**
   * Get vehicle display name.
   *
   * @param modelType - Type of vehicle
   * @returns Human-readable vehicle name
   */
  getDisplayName(modelType: VehicleModelType): string {
    const config = DEFAULT_MODEL_CONFIGS[modelType];
    const builder = this.createModelBuilder(modelType, config);
    return builder.getDisplayName();
  }

  /**
   * Get recommended camera offset for a vehicle type.
   *
   * @param modelType - Type of vehicle
   * @returns Camera offset vector
   */
  getCameraOffset(modelType: VehicleModelType): THREE.Vector3 {
    const config = DEFAULT_MODEL_CONFIGS[modelType];
    const builder = this.createModelBuilder(modelType, config);
    return builder.getCameraOffset();
  }

  /**
   * Get list of all available vehicle types.
   *
   * @returns Array of vehicle model types
   */
  getAvailableVehicles(): VehicleModelType[] {
    return Object.values(VehicleModelType);
  }

  /**
   * Create appropriate model builder based on type.
   *
   * @private
   */
  private createModelBuilder(
    modelType: VehicleModelType,
    config: VehicleModelConfig
  ): IVehicleModelBuilder {
    switch (modelType) {
      case VehicleModelType.CORVETTE:
        return new CorvetteModel(config);
      case VehicleModelType.CYBERTRUCK:
        return new CybertruckModel(config);
      default:
        // Fallback to Corvette
        console.warn(`Unknown vehicle type: ${modelType}, defaulting to Corvette`);
        return new CorvetteModel(config);
    }
  }

  /**
   * Create wheel material based on vehicle type using PBR Material Library.
   *
   * @private
   */
  private createWheelMaterial(modelType: VehicleModelType): THREE.Material {
    const materialLib = MaterialLibrary.getInstance();

    // Try to get tire material from library first
    const tireMaterial = materialLib.getMaterial('tire');
    if (tireMaterial) {
      return tireMaterial;
    }

    // Fallback to basic material if library not initialized
    switch (modelType) {
      case VehicleModelType.CORVETTE:
        // Sport wheels - glossy black with some metallic shine
        return new THREE.MeshStandardMaterial({
          color: 0x111111,
          metalness: 0.6,
          roughness: 0.4,
        });

      case VehicleModelType.CYBERTRUCK:
        // Rugged wheels - matte gray
        return new THREE.MeshStandardMaterial({
          color: 0x444444,
          metalness: 0.3,
          roughness: 0.8,
        });

      default:
        return new THREE.MeshStandardMaterial({
          color: 0x333333,
          metalness: 0.3,
          roughness: 0.7,
        });
    }
  }
}
