/**
 * Unit tests for SurfaceConfig.ts
 * Target: >80% coverage
 *
 * Tests cover:
 * - Surface friction values for all types
 * - Surface color values for all types
 * - Surface audio effect names for all types
 * - Getter functions
 * - Apply friction to collider
 * - Edge cases and error handling
 */

import { describe, it, expect, vi } from 'vitest';
import { SurfaceType } from '@/types/VehicleTypes';
import {
  SURFACE_FRICTION,
  SURFACE_COLORS,
  SURFACE_AUDIO,
  getSurfaceFriction,
  getSurfaceColor,
  getSurfaceAudio,
  applySurfaceFriction,
} from '@/config/SurfaceConfig';

describe('SurfaceConfig', () => {
  describe('SURFACE_FRICTION constants', () => {
    it('should have friction value for TARMAC', () => {
      expect(SURFACE_FRICTION[SurfaceType.TARMAC]).toBeDefined();
      expect(SURFACE_FRICTION[SurfaceType.TARMAC]).toBe(1.0);
    });

    it('should have friction value for DIRT', () => {
      expect(SURFACE_FRICTION[SurfaceType.DIRT]).toBeDefined();
      expect(SURFACE_FRICTION[SurfaceType.DIRT]).toBe(0.6);
    });

    it('should have friction value for GRASS', () => {
      expect(SURFACE_FRICTION[SurfaceType.GRASS]).toBeDefined();
      expect(SURFACE_FRICTION[SurfaceType.GRASS]).toBe(0.4);
    });

    it('should have friction value for ICE', () => {
      expect(SURFACE_FRICTION[SurfaceType.ICE]).toBeDefined();
      expect(SURFACE_FRICTION[SurfaceType.ICE]).toBe(0.2);
    });

    it('should have friction value for SAND', () => {
      expect(SURFACE_FRICTION[SurfaceType.SAND]).toBeDefined();
      expect(SURFACE_FRICTION[SurfaceType.SAND]).toBe(0.5);
    });

    it('should have all friction values in valid range (0-1)', () => {
      Object.values(SURFACE_FRICTION).forEach(friction => {
        expect(friction).toBeGreaterThanOrEqual(0);
        expect(friction).toBeLessThanOrEqual(1);
      });
    });

    it('should have friction values in correct order (most to least grip)', () => {
      expect(SURFACE_FRICTION[SurfaceType.TARMAC]).toBeGreaterThan(
        SURFACE_FRICTION[SurfaceType.DIRT]
      );
      expect(SURFACE_FRICTION[SurfaceType.DIRT]).toBeGreaterThan(
        SURFACE_FRICTION[SurfaceType.SAND]
      );
      expect(SURFACE_FRICTION[SurfaceType.SAND]).toBeGreaterThan(
        SURFACE_FRICTION[SurfaceType.GRASS]
      );
      expect(SURFACE_FRICTION[SurfaceType.GRASS]).toBeGreaterThan(
        SURFACE_FRICTION[SurfaceType.ICE]
      );
    });

    it('should cover all surface types', () => {
      const surfaceTypes = [
        SurfaceType.TARMAC,
        SurfaceType.DIRT,
        SurfaceType.GRASS,
        SurfaceType.ICE,
        SurfaceType.SAND,
      ];

      surfaceTypes.forEach(type => {
        expect(SURFACE_FRICTION[type]).toBeDefined();
      });
    });
  });

  describe('SURFACE_COLORS constants', () => {
    it('should have color value for TARMAC', () => {
      expect(SURFACE_COLORS[SurfaceType.TARMAC]).toBeDefined();
      expect(SURFACE_COLORS[SurfaceType.TARMAC]).toBe(0x333333);
    });

    it('should have color value for DIRT', () => {
      expect(SURFACE_COLORS[SurfaceType.DIRT]).toBeDefined();
      expect(SURFACE_COLORS[SurfaceType.DIRT]).toBe(0x8b7355);
    });

    it('should have color value for GRASS', () => {
      expect(SURFACE_COLORS[SurfaceType.GRASS]).toBeDefined();
      expect(SURFACE_COLORS[SurfaceType.GRASS]).toBe(0x228b22);
    });

    it('should have color value for ICE', () => {
      expect(SURFACE_COLORS[SurfaceType.ICE]).toBeDefined();
      expect(SURFACE_COLORS[SurfaceType.ICE]).toBe(0xadd8e6);
    });

    it('should have color value for SAND', () => {
      expect(SURFACE_COLORS[SurfaceType.SAND]).toBeDefined();
      expect(SURFACE_COLORS[SurfaceType.SAND]).toBe(0xf4a460);
    });

    it('should have all colors as valid hex values', () => {
      Object.values(SURFACE_COLORS).forEach(color => {
        expect(color).toBeGreaterThanOrEqual(0);
        expect(color).toBeLessThanOrEqual(0xffffff);
      });
    });

    it('should cover all surface types', () => {
      const surfaceTypes = [
        SurfaceType.TARMAC,
        SurfaceType.DIRT,
        SurfaceType.GRASS,
        SurfaceType.ICE,
        SurfaceType.SAND,
      ];

      surfaceTypes.forEach(type => {
        expect(SURFACE_COLORS[type]).toBeDefined();
      });
    });
  });

  describe('SURFACE_AUDIO constants', () => {
    it('should have audio effect for TARMAC', () => {
      expect(SURFACE_AUDIO[SurfaceType.TARMAC]).toBeDefined();
      expect(SURFACE_AUDIO[SurfaceType.TARMAC]).toBe('tire_road');
    });

    it('should have audio effect for DIRT', () => {
      expect(SURFACE_AUDIO[SurfaceType.DIRT]).toBeDefined();
      expect(SURFACE_AUDIO[SurfaceType.DIRT]).toBe('tire_dirt');
    });

    it('should have audio effect for GRASS', () => {
      expect(SURFACE_AUDIO[SurfaceType.GRASS]).toBeDefined();
      expect(SURFACE_AUDIO[SurfaceType.GRASS]).toBe('tire_grass');
    });

    it('should have audio effect for ICE', () => {
      expect(SURFACE_AUDIO[SurfaceType.ICE]).toBeDefined();
      expect(SURFACE_AUDIO[SurfaceType.ICE]).toBe('tire_ice');
    });

    it('should have audio effect for SAND', () => {
      expect(SURFACE_AUDIO[SurfaceType.SAND]).toBeDefined();
      expect(SURFACE_AUDIO[SurfaceType.SAND]).toBe('tire_sand');
    });

    it('should have all audio effects as non-empty strings', () => {
      Object.values(SURFACE_AUDIO).forEach(audio => {
        expect(typeof audio).toBe('string');
        expect(audio.length).toBeGreaterThan(0);
      });
    });

    it('should cover all surface types', () => {
      const surfaceTypes = [
        SurfaceType.TARMAC,
        SurfaceType.DIRT,
        SurfaceType.GRASS,
        SurfaceType.ICE,
        SurfaceType.SAND,
      ];

      surfaceTypes.forEach(type => {
        expect(SURFACE_AUDIO[type]).toBeDefined();
      });
    });
  });

  describe('getSurfaceFriction function', () => {
    it('should return friction for TARMAC', () => {
      const friction = getSurfaceFriction(SurfaceType.TARMAC);
      expect(friction).toBe(1.0);
    });

    it('should return friction for DIRT', () => {
      const friction = getSurfaceFriction(SurfaceType.DIRT);
      expect(friction).toBe(0.6);
    });

    it('should return friction for GRASS', () => {
      const friction = getSurfaceFriction(SurfaceType.GRASS);
      expect(friction).toBe(0.4);
    });

    it('should return friction for ICE', () => {
      const friction = getSurfaceFriction(SurfaceType.ICE);
      expect(friction).toBe(0.2);
    });

    it('should return friction for SAND', () => {
      const friction = getSurfaceFriction(SurfaceType.SAND);
      expect(friction).toBe(0.5);
    });

    it('should return default friction (1.0) for invalid surface type', () => {
      const friction = getSurfaceFriction('invalid' as any);
      expect(friction).toBe(1.0);
    });

    it('should return default friction for undefined', () => {
      const friction = getSurfaceFriction(undefined as any);
      expect(friction).toBe(1.0);
    });

    it('should return default friction for null', () => {
      const friction = getSurfaceFriction(null as any);
      expect(friction).toBe(1.0);
    });

    it('should handle all valid surface types', () => {
      const surfaceTypes = [
        SurfaceType.TARMAC,
        SurfaceType.DIRT,
        SurfaceType.GRASS,
        SurfaceType.ICE,
        SurfaceType.SAND,
      ];

      surfaceTypes.forEach(type => {
        const friction = getSurfaceFriction(type);
        expect(friction).toBeGreaterThan(0);
        expect(friction).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('getSurfaceColor function', () => {
    it('should return color for TARMAC', () => {
      const color = getSurfaceColor(SurfaceType.TARMAC);
      expect(color).toBe(0x333333);
    });

    it('should return color for DIRT', () => {
      const color = getSurfaceColor(SurfaceType.DIRT);
      expect(color).toBe(0x8b7355);
    });

    it('should return color for GRASS', () => {
      const color = getSurfaceColor(SurfaceType.GRASS);
      expect(color).toBe(0x228b22);
    });

    it('should return color for ICE', () => {
      const color = getSurfaceColor(SurfaceType.ICE);
      expect(color).toBe(0xadd8e6);
    });

    it('should return color for SAND', () => {
      const color = getSurfaceColor(SurfaceType.SAND);
      expect(color).toBe(0xf4a460);
    });

    it('should return default color (0x888888) for invalid surface type', () => {
      const color = getSurfaceColor('invalid' as any);
      expect(color).toBe(0x888888);
    });

    it('should return default color for undefined', () => {
      const color = getSurfaceColor(undefined as any);
      expect(color).toBe(0x888888);
    });

    it('should return default color for null', () => {
      const color = getSurfaceColor(null as any);
      expect(color).toBe(0x888888);
    });

    it('should handle all valid surface types', () => {
      const surfaceTypes = [
        SurfaceType.TARMAC,
        SurfaceType.DIRT,
        SurfaceType.GRASS,
        SurfaceType.ICE,
        SurfaceType.SAND,
      ];

      surfaceTypes.forEach(type => {
        const color = getSurfaceColor(type);
        expect(color).toBeGreaterThanOrEqual(0);
        expect(color).toBeLessThanOrEqual(0xffffff);
      });
    });
  });

  describe('getSurfaceAudio function', () => {
    it('should return audio effect for TARMAC', () => {
      const audio = getSurfaceAudio(SurfaceType.TARMAC);
      expect(audio).toBe('tire_road');
    });

    it('should return audio effect for DIRT', () => {
      const audio = getSurfaceAudio(SurfaceType.DIRT);
      expect(audio).toBe('tire_dirt');
    });

    it('should return audio effect for GRASS', () => {
      const audio = getSurfaceAudio(SurfaceType.GRASS);
      expect(audio).toBe('tire_grass');
    });

    it('should return audio effect for ICE', () => {
      const audio = getSurfaceAudio(SurfaceType.ICE);
      expect(audio).toBe('tire_ice');
    });

    it('should return audio effect for SAND', () => {
      const audio = getSurfaceAudio(SurfaceType.SAND);
      expect(audio).toBe('tire_sand');
    });

    it('should return default audio effect (tire_road) for invalid surface type', () => {
      const audio = getSurfaceAudio('invalid' as any);
      expect(audio).toBe('tire_road');
    });

    it('should return default audio effect for undefined', () => {
      const audio = getSurfaceAudio(undefined as any);
      expect(audio).toBe('tire_road');
    });

    it('should return default audio effect for null', () => {
      const audio = getSurfaceAudio(null as any);
      expect(audio).toBe('tire_road');
    });

    it('should handle all valid surface types', () => {
      const surfaceTypes = [
        SurfaceType.TARMAC,
        SurfaceType.DIRT,
        SurfaceType.GRASS,
        SurfaceType.ICE,
        SurfaceType.SAND,
      ];

      surfaceTypes.forEach(type => {
        const audio = getSurfaceAudio(type);
        expect(typeof audio).toBe('string');
        expect(audio.length).toBeGreaterThan(0);
      });
    });
  });

  describe('applySurfaceFriction function', () => {
    it('should set friction on collider for TARMAC', () => {
      const mockCollider = {
        setFriction: vi.fn(),
      };

      applySurfaceFriction(mockCollider, SurfaceType.TARMAC);

      expect(mockCollider.setFriction).toHaveBeenCalledWith(1.0);
    });

    it('should set friction on collider for DIRT', () => {
      const mockCollider = {
        setFriction: vi.fn(),
      };

      applySurfaceFriction(mockCollider, SurfaceType.DIRT);

      expect(mockCollider.setFriction).toHaveBeenCalledWith(0.6);
    });

    it('should set friction on collider for GRASS', () => {
      const mockCollider = {
        setFriction: vi.fn(),
      };

      applySurfaceFriction(mockCollider, SurfaceType.GRASS);

      expect(mockCollider.setFriction).toHaveBeenCalledWith(0.4);
    });

    it('should set friction on collider for ICE', () => {
      const mockCollider = {
        setFriction: vi.fn(),
      };

      applySurfaceFriction(mockCollider, SurfaceType.ICE);

      expect(mockCollider.setFriction).toHaveBeenCalledWith(0.2);
    });

    it('should set friction on collider for SAND', () => {
      const mockCollider = {
        setFriction: vi.fn(),
      };

      applySurfaceFriction(mockCollider, SurfaceType.SAND);

      expect(mockCollider.setFriction).toHaveBeenCalledWith(0.5);
    });

    it('should handle null collider gracefully', () => {
      expect(() => {
        applySurfaceFriction(null, SurfaceType.TARMAC);
      }).not.toThrow();
    });

    it('should handle undefined collider gracefully', () => {
      expect(() => {
        applySurfaceFriction(undefined, SurfaceType.TARMAC);
      }).not.toThrow();
    });

    it('should handle collider without setFriction method', () => {
      const mockCollider = {};

      expect(() => {
        applySurfaceFriction(mockCollider as any, SurfaceType.TARMAC);
      }).not.toThrow();
    });

    it('should not call setFriction on invalid collider', () => {
      const mockCollider = {
        setFriction: vi.fn(),
      };

      applySurfaceFriction(null, SurfaceType.TARMAC);

      expect(mockCollider.setFriction).not.toHaveBeenCalled();
    });

    it('should handle all surface types', () => {
      const surfaceTypes = [
        SurfaceType.TARMAC,
        SurfaceType.DIRT,
        SurfaceType.GRASS,
        SurfaceType.ICE,
        SurfaceType.SAND,
      ];

      surfaceTypes.forEach(type => {
        const mockCollider = {
          setFriction: vi.fn(),
        };

        applySurfaceFriction(mockCollider, type);

        expect(mockCollider.setFriction).toHaveBeenCalled();
      });
    });

    it('should use correct friction value from SURFACE_FRICTION', () => {
      const mockCollider = {
        setFriction: vi.fn(),
      };

      applySurfaceFriction(mockCollider, SurfaceType.DIRT);

      expect(mockCollider.setFriction).toHaveBeenCalledWith(
        SURFACE_FRICTION[SurfaceType.DIRT]
      );
    });
  });

  describe('surface type relationships', () => {
    it('should have consistent data across all config objects', () => {
      const surfaceTypes = [
        SurfaceType.TARMAC,
        SurfaceType.DIRT,
        SurfaceType.GRASS,
        SurfaceType.ICE,
        SurfaceType.SAND,
      ];

      surfaceTypes.forEach(type => {
        expect(SURFACE_FRICTION[type]).toBeDefined();
        expect(SURFACE_COLORS[type]).toBeDefined();
        expect(SURFACE_AUDIO[type]).toBeDefined();
      });
    });

    it('should have matching surface types in all configs', () => {
      const frictionKeys = Object.keys(SURFACE_FRICTION);
      const colorKeys = Object.keys(SURFACE_COLORS);
      const audioKeys = Object.keys(SURFACE_AUDIO);

      expect(frictionKeys.sort()).toEqual(colorKeys.sort());
      expect(colorKeys.sort()).toEqual(audioKeys.sort());
    });

    it('should have same number of surface types in all configs', () => {
      expect(Object.keys(SURFACE_FRICTION).length).toBe(5);
      expect(Object.keys(SURFACE_COLORS).length).toBe(5);
      expect(Object.keys(SURFACE_AUDIO).length).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle numeric surface type', () => {
      const friction = getSurfaceFriction(0 as any);
      expect(friction).toBe(1.0); // Default
    });

    it('should handle empty string surface type', () => {
      const friction = getSurfaceFriction('' as any);
      expect(friction).toBe(1.0); // Default
    });

    it('should handle object as surface type', () => {
      const friction = getSurfaceFriction({} as any);
      expect(friction).toBe(1.0); // Default
    });

    it('should handle array as surface type', () => {
      const friction = getSurfaceFriction([] as any);
      expect(friction).toBe(1.0); // Default
    });
  });

  describe('performance', () => {
    it('should retrieve friction values quickly', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        getSurfaceFriction(SurfaceType.TARMAC);
        getSurfaceFriction(SurfaceType.DIRT);
        getSurfaceFriction(SurfaceType.GRASS);
      }

      const end = performance.now();
      const avgTime = (end - start) / 30000;

      expect(avgTime).toBeLessThan(0.001); // < 0.001ms per lookup
    });

    it('should retrieve color values quickly', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        getSurfaceColor(SurfaceType.TARMAC);
        getSurfaceColor(SurfaceType.DIRT);
        getSurfaceColor(SurfaceType.GRASS);
      }

      const end = performance.now();
      const avgTime = (end - start) / 30000;

      expect(avgTime).toBeLessThan(0.001); // < 0.001ms per lookup
    });

    it('should apply friction quickly', () => {
      const mockCollider = {
        setFriction: vi.fn(),
      };

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        applySurfaceFriction(mockCollider, SurfaceType.TARMAC);
      }

      const end = performance.now();
      const avgTime = (end - start) / 10000;

      expect(avgTime).toBeLessThan(0.01); // < 0.01ms per call
    });
  });
});
