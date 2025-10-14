import * as THREE from 'three';

/**
 * Vehicle model types available in the game.
 */
export enum VehicleModelType {
  CORVETTE = 'corvette',
  CYBERTRUCK = 'cybertruck',
}

/**
 * Interface for vehicle model builders.
 * Each vehicle type implements this to create its specific geometry.
 */
export interface IVehicleModelBuilder {
  /**
   * Build the complete vehicle visual mesh group.
   * @returns THREE.Group containing all vehicle parts
   */
  buildModel(): THREE.Group;

  /**
   * Get the vehicle display name.
   */
  getDisplayName(): string;

  /**
   * Get the recommended camera offset for this vehicle.
   * @returns Vector3 offset from vehicle center
   */
  getCameraOffset(): THREE.Vector3;
}

/**
 * Vehicle model configuration options.
 */
export interface VehicleModelConfig {
  /**
   * Primary body color.
   */
  bodyColor: number;

  /**
   * Metalness value (0-1) for PBR material.
   */
  metalness: number;

  /**
   * Roughness value (0-1) for PBR material.
   */
  roughness: number;

  /**
   * Secondary accent color (for trim, details).
   */
  accentColor?: number;
}

/**
 * Default model configurations for each vehicle type.
 */
export const DEFAULT_MODEL_CONFIGS: Record<VehicleModelType, VehicleModelConfig> = {
  [VehicleModelType.CORVETTE]: {
    bodyColor: 0xff0000, // Red
    metalness: 0.8,
    roughness: 0.2,
    accentColor: 0x000000, // Black trim
  },
  [VehicleModelType.CYBERTRUCK]: {
    bodyColor: 0xc0c0c0, // Stainless steel
    metalness: 0.9,
    roughness: 0.3,
    accentColor: 0x222222, // Dark gray accents
  },
};
