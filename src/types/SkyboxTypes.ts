/**
 * SkyboxTypes - Type definitions for skybox and lighting system
 *
 * Defines time-of-day presets, skybox configurations, and lighting parameters
 */

/**
 * Time of day settings for track lighting and atmosphere
 */
export type TimeOfDay = 'day' | 'sunset' | 'night' | 'dawn';

/**
 * Available skybox presets
 */
export type SkyboxType = 'day' | 'sunset' | 'night' | 'desert' | 'city' | 'procedural';

/**
 * Lighting configuration for a time of day
 */
export interface LightingConfig {
  // Sun/directional light
  sunColor: number;
  sunIntensity: number;
  sunPosition: [number, number, number];

  // Hemisphere light (sky/ground ambient)
  skyColor: number;
  groundColor: number;
  hemisphereIntensity: number;

  // Ambient fill light
  ambientColor: number;
  ambientIntensity: number;

  // Optional point lights (for night scenes)
  pointLights?: Array<{
    position: [number, number, number];
    color: number;
    intensity: number;
    distance: number;
  }>;

  // Fog settings
  fogEnabled: boolean;
  fogColor: number;
  fogNear: number;
  fogFar: number;

  // Shadow settings
  shadowBias: number;
  shadowNormalBias: number;
}

/**
 * Skybox configuration
 */
export interface SkyboxConfig {
  type: SkyboxType;

  // For cube texture skyboxes
  urls?: string[];

  // For procedural sky
  procedural?: {
    turbidity: number;
    rayleigh: number;
    mieCoefficient: number;
    mieDirectionalG: number;
    sunElevation: number;
    sunAzimuth: number;
  };

  // Rotation (in radians)
  rotation?: number;
}
