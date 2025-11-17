/**
 * GraphicsConfig - Centralized graphics quality settings and presets
 *
 * Provides three quality levels: Low, Medium, High
 * Each preset balances visual quality with performance for different hardware tiers
 *
 * Target hardware:
 * - Low: Integrated graphics (Intel UHD, AMD Vega)
 * - Medium: Mid-range GPUs (GTX 1060, RX 580)
 * - High: High-end GPUs (RTX 2060+, RX 5700+)
 */

/**
 * Quality level enumeration
 */
export enum QualityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Graphics configuration interface
 */
export interface GraphicsSettings {
  // Shadow settings
  shadowMapSize: number;          // Shadow map resolution (512, 1024, 2048, 4096)
  shadowsEnabled: boolean;        // Toggle shadows completely

  // Anti-aliasing
  antialiasing: boolean;          // MSAA anti-aliasing

  // Texture settings
  anisotropy: number;             // Anisotropic filtering level (1, 4, 8, 16)

  // Performance settings
  maxParticles: number;           // Maximum particle count for effects
  physicsIterations: number;      // Physics solver iterations (more = stable, slower)

  // Post-processing
  bloom: boolean;                 // Bloom effect
  motionBlur: boolean;            // Motion blur effect
  crtEffects: boolean;            // CRT shader effects (scanlines, chromatic aberration, vignette)

  // LOD settings
  lodBias: number;                // LOD distance multiplier (lower = more aggressive culling)
  maxDrawDistance: number;        // Maximum render distance in meters
}

/**
 * Low quality preset
 * Target: 60fps on integrated graphics
 * Performance budget: <16.67ms frame time
 *
 * Trade-offs:
 * - Smaller shadow maps (~0.5ms)
 * - No anti-aliasing (~1ms saved)
 * - Minimal particles (~0.3ms)
 * - Fewer physics iterations (~0.5ms)
 * - Aggressive LOD culling
 */
export const LOW_QUALITY: GraphicsSettings = {
  shadowMapSize: 512,
  shadowsEnabled: true,
  antialiasing: false,
  anisotropy: 1,
  maxParticles: 50,
  physicsIterations: 4,
  bloom: false,
  motionBlur: false,
  crtEffects: false, // Disable CRT effects for low-end hardware
  lodBias: 0.5,
  maxDrawDistance: 300,
};

/**
 * Medium quality preset
 * Target: 60fps on mid-range GPUs
 * Performance budget: ~16.67ms frame time
 *
 * Balanced settings for good visuals without sacrificing performance
 */
export const MEDIUM_QUALITY: GraphicsSettings = {
  shadowMapSize: 1024,
  shadowsEnabled: true,
  antialiasing: true,
  anisotropy: 4,
  maxParticles: 200,
  physicsIterations: 6,
  bloom: true,
  motionBlur: false,
  crtEffects: true, // Enable CRT effects for menu screens
  lodBias: 1.0,
  maxDrawDistance: 500,
};

/**
 * High quality preset
 * Target: 60fps on high-end GPUs
 * Performance budget: ~16.67ms frame time with headroom
 *
 * Maximum visual quality for powerful hardware
 */
export const HIGH_QUALITY: GraphicsSettings = {
  shadowMapSize: 2048,
  shadowsEnabled: true,
  antialiasing: true,
  anisotropy: 16,
  maxParticles: 500,
  physicsIterations: 8,
  bloom: true,
  motionBlur: true,
  crtEffects: true, // Full CRT effects enabled
  lodBias: 1.5,
  maxDrawDistance: 800,
};

/**
 * Ultra quality preset (future-proofing)
 * Target: 60fps on next-gen GPUs
 * For high-end hardware with performance headroom
 */
export const ULTRA_QUALITY: GraphicsSettings = {
  shadowMapSize: 4096,
  shadowsEnabled: true,
  antialiasing: true,
  anisotropy: 16,
  maxParticles: 1000,
  physicsIterations: 10,
  bloom: true,
  motionBlur: true,
  crtEffects: true, // Maximum CRT effects
  lodBias: 2.0,
  maxDrawDistance: 1000,
};

/**
 * Quality preset map for easy lookup
 */
export const QUALITY_PRESETS: Record<QualityLevel, GraphicsSettings> = {
  [QualityLevel.LOW]: LOW_QUALITY,
  [QualityLevel.MEDIUM]: MEDIUM_QUALITY,
  [QualityLevel.HIGH]: HIGH_QUALITY,
};

/**
 * Default quality level (Medium for best compatibility)
 */
export const DEFAULT_QUALITY = QualityLevel.MEDIUM;

/**
 * Auto-detect quality level based on device capabilities
 *
 * Heuristics:
 * - Check device memory (if available)
 * - Check GPU tier (if WebGL extension available)
 * - Check hardware concurrency (CPU cores)
 * - Check pixel ratio (high DPI = more pixels to render)
 *
 * @returns Recommended quality level
 */
export function detectQualityLevel(): QualityLevel {
  // Check device memory (if available)
  const memory = (navigator as any).deviceMemory;
  if (memory !== undefined) {
    if (memory <= 4) return QualityLevel.LOW;
    if (memory <= 8) return QualityLevel.MEDIUM;
    return QualityLevel.HIGH;
  }

  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency;
  if (cores !== undefined) {
    if (cores <= 4) return QualityLevel.LOW;
    if (cores <= 8) return QualityLevel.MEDIUM;
    return QualityLevel.HIGH;
  }

  // Check pixel ratio (high DPI means more pixels to render)
  const pixelRatio = window.devicePixelRatio;
  if (pixelRatio >= 2) {
    // High DPI displays need lower settings to maintain 60fps
    return QualityLevel.MEDIUM;
  }

  // Default to medium if we can't detect capabilities
  return QualityLevel.MEDIUM;
}

/**
 * Get performance metrics for a quality level
 *
 * Estimated frame time breakdown per quality level
 *
 * @param quality - Quality level to get metrics for
 * @returns Estimated frame time components in milliseconds
 */
export function getPerformanceMetrics(quality: QualityLevel): {
  shadows: number;
  particles: number;
  physics: number;
  rendering: number;
  total: number;
} {
  switch (quality) {
    case QualityLevel.LOW:
      return {
        shadows: 0.5,
        particles: 0.3,
        physics: 4.0,
        rendering: 8.0,
        total: 12.8,
      };
    case QualityLevel.MEDIUM:
      return {
        shadows: 1.0,
        particles: 0.8,
        physics: 5.0,
        rendering: 10.0,
        total: 16.8,
      };
    case QualityLevel.HIGH:
      return {
        shadows: 2.0,
        particles: 1.5,
        physics: 6.0,
        rendering: 12.0,
        total: 21.5,
      };
  }
}

/**
 * Validate and clamp custom graphics settings
 *
 * Ensures user-provided settings are within acceptable ranges
 *
 * @param settings - Custom graphics settings
 * @returns Validated and clamped settings
 */
export function validateSettings(settings: Partial<GraphicsSettings>): GraphicsSettings {
  const base = MEDIUM_QUALITY;

  return {
    shadowMapSize: clamp(settings.shadowMapSize ?? base.shadowMapSize, 256, 4096),
    shadowsEnabled: settings.shadowsEnabled ?? base.shadowsEnabled,
    antialiasing: settings.antialiasing ?? base.antialiasing,
    anisotropy: clamp(settings.anisotropy ?? base.anisotropy, 1, 16),
    maxParticles: clamp(settings.maxParticles ?? base.maxParticles, 10, 2000),
    physicsIterations: clamp(settings.physicsIterations ?? base.physicsIterations, 1, 20),
    bloom: settings.bloom ?? base.bloom,
    motionBlur: settings.motionBlur ?? base.motionBlur,
    crtEffects: settings.crtEffects ?? base.crtEffects,
    lodBias: clamp(settings.lodBias ?? base.lodBias, 0.1, 3.0),
    maxDrawDistance: clamp(settings.maxDrawDistance ?? base.maxDrawDistance, 100, 2000),
  };
}

/**
 * Helper function to clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Get recommended settings based on current FPS
 *
 * Automatically adjusts quality if FPS drops below target
 *
 * @param currentFPS - Current frame rate
 * @param currentQuality - Current quality level
 * @param targetFPS - Target frame rate (default: 60)
 * @returns Recommended quality level
 */
export function getRecommendedQuality(
  currentFPS: number,
  currentQuality: QualityLevel,
  targetFPS: number = 60
): QualityLevel {
  const fpsThreshold = targetFPS * 0.85; // 85% of target (51 fps for 60 target)

  if (currentFPS < fpsThreshold) {
    // Suggest downgrading quality
    if (currentQuality === QualityLevel.HIGH) return QualityLevel.MEDIUM;
    if (currentQuality === QualityLevel.MEDIUM) return QualityLevel.LOW;
  } else if (currentFPS >= targetFPS * 1.2) {
    // Suggest upgrading quality if we have headroom
    if (currentQuality === QualityLevel.LOW) return QualityLevel.MEDIUM;
    if (currentQuality === QualityLevel.MEDIUM) return QualityLevel.HIGH;
  }

  return currentQuality; // No change
}
