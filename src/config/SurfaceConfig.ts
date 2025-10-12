/**
 * SurfaceConfig - Surface friction and tire grip configuration
 *
 * Defines friction values for different surface types.
 * Used by track collision detection and tire force calculations.
 *
 * @module config/SurfaceConfig
 */

import { SurfaceType } from '../types/VehicleTypes';

/**
 * Surface friction multipliers
 *
 * Values:
 * - 1.0 = Full grip (tarmac)
 * - 0.6 = Reduced grip (dirt)
 * - 0.4 = Low grip (grass)
 * - 0.2 = Very low grip (ice)
 */
export const SURFACE_FRICTION: Record<SurfaceType, number> = {
  [SurfaceType.TARMAC]: 1.0,
  [SurfaceType.DIRT]: 0.6,
  [SurfaceType.GRASS]: 0.4,
  [SurfaceType.ICE]: 0.2,
  [SurfaceType.SAND]: 0.5,
};

/**
 * Surface colors for visual feedback (minimap, debug rendering)
 */
export const SURFACE_COLORS: Record<SurfaceType, number> = {
  [SurfaceType.TARMAC]: 0x333333, // Dark gray
  [SurfaceType.DIRT]: 0x8B7355, // Brown
  [SurfaceType.GRASS]: 0x228B22, // Green
  [SurfaceType.ICE]: 0xADD8E6, // Light blue
  [SurfaceType.SAND]: 0xF4A460, // Sandy brown
};

/**
 * Surface audio effects (for future audio system integration)
 */
export const SURFACE_AUDIO: Record<SurfaceType, string> = {
  [SurfaceType.TARMAC]: 'tire_road',
  [SurfaceType.DIRT]: 'tire_dirt',
  [SurfaceType.GRASS]: 'tire_grass',
  [SurfaceType.ICE]: 'tire_ice',
  [SurfaceType.SAND]: 'tire_sand',
};

/**
 * Get friction multiplier for a surface type
 * @param surfaceType - Surface type
 * @returns Friction multiplier (0-1)
 */
export function getSurfaceFriction(surfaceType: SurfaceType): number {
  return SURFACE_FRICTION[surfaceType] ?? 1.0;
}

/**
 * Get color for a surface type
 * @param surfaceType - Surface type
 * @returns Hex color value
 */
export function getSurfaceColor(surfaceType: SurfaceType): number {
  return SURFACE_COLORS[surfaceType] ?? 0x888888;
}

/**
 * Get audio effect name for a surface type
 * @param surfaceType - Surface type
 * @returns Audio effect name
 */
export function getSurfaceAudio(surfaceType: SurfaceType): string {
  return SURFACE_AUDIO[surfaceType] ?? 'tire_road';
}

/**
 * Apply surface friction to Rapier collider
 * @param collider - Rapier collider
 * @param surfaceType - Surface type
 */
export function applySurfaceFriction(collider: any, surfaceType: SurfaceType): void {
  const friction = SURFACE_FRICTION[surfaceType];
  if (collider && collider.setFriction) {
    collider.setFriction(friction);
  }
}
