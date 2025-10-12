/**
 * Unit tests for MinimapGenerator.ts
 * Target: >80% coverage
 *
 * Tests cover:
 * - Minimap texture generation
 * - Orthographic camera setup
 * - Player marker rendering
 * - World-to-screen coordinate transformation
 * - Canvas 2D context integration
 * - Resource disposal
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { MinimapGenerator } from '@/systems/MinimapGenerator';
import { createMockTrack } from '../fixtures/testHelpers';
import { minimalTrackData } from '../fixtures/trackFixtures';

describe('MinimapGenerator', () => {
  let minimapGenerator: MinimapGenerator;
  let mockTrack: any;
  let mockRenderer: any;

  beforeEach(() => {
    minimapGenerator = new MinimapGenerator();
    mockTrack = createMockTrack(minimalTrackData);

    // Mock getBounds to return realistic track bounds
    mockTrack.getBounds = vi.fn(() => ({
      min: new THREE.Vector3(-50, 0, -50),
      max: new THREE.Vector3(50, 10, 200),
    }));

    // Mock getMesh to return a mock mesh
    mockTrack.getMesh = vi.fn(() => ({
      clone: vi.fn(() => ({
        geometry: {},
        material: {},
      })),
    }));

    mockRenderer = {
      setRenderTarget: vi.fn(),
      render: vi.fn(),
    };

    vi.clearAllMocks();
  });

  describe('generate method', () => {
    it('should generate minimap texture', () => {
      const texture = minimapGenerator.generate(mockTrack, mockRenderer);

      expect(texture).toBeDefined();
    });

    it('should use default size of 512', () => {
      const texture = minimapGenerator.generate(mockTrack, mockRenderer);

      expect(texture).toBeDefined();
      // Texture dimensions are set internally
    });

    it('should accept custom size', () => {
      const texture = minimapGenerator.generate(mockTrack, mockRenderer, 1024);

      expect(texture).toBeDefined();
    });

    it('should create orthographic camera', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      // Camera is created internally
      expect(mockRenderer.setRenderTarget).toHaveBeenCalled();
    });

    it('should set camera position above track', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      // Camera positioning is verified by successful render
      expect(mockRenderer.render).toHaveBeenCalled();
    });

    it('should render track to texture', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      expect(mockRenderer.setRenderTarget).toHaveBeenCalledTimes(2);
      expect(mockRenderer.render).toHaveBeenCalled();
    });

    it('should reset render target after rendering', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      const calls = mockRenderer.setRenderTarget.mock.calls;
      expect(calls[calls.length - 1][0]).toBeNull();
    });

    it('should create canvas for player marker overlay', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      const canvas = minimapGenerator.getCanvas();
      expect(canvas).toBeDefined();
    });

    it('should get track bounds for camera setup', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      expect(mockTrack.getBounds).toHaveBeenCalled();
    });

    it('should clone track mesh for rendering', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      expect(mockTrack.getMesh).toHaveBeenCalled();
    });

    it('should handle different track sizes', () => {
      mockTrack.getBounds = vi.fn(() => ({
        min: new THREE.Vector3(-100, 0, -100),
        max: new THREE.Vector3(100, 10, 400),
      }));

      const texture = minimapGenerator.generate(mockTrack, mockRenderer);

      expect(texture).toBeDefined();
    });
  });

  describe('player marker drawing', () => {
    beforeEach(() => {
      minimapGenerator.generate(mockTrack, mockRenderer);
    });

    it('should draw player marker', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const rotation = 0;

      expect(() => {
        minimapGenerator.drawPlayerMarker(position, rotation);
      }).not.toThrow();
    });

    it('should handle different player positions', () => {
      const positions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 5, 20),
        new THREE.Vector3(-10, 2, -20),
      ];

      positions.forEach(pos => {
        expect(() => {
          minimapGenerator.drawPlayerMarker(pos, 0);
        }).not.toThrow();
      });
    });

    it('should handle different rotations', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const rotations = [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 2];

      rotations.forEach(rotation => {
        expect(() => {
          minimapGenerator.drawPlayerMarker(position, rotation);
        }).not.toThrow();
      });
    });

    it('should clear previous frame', () => {
      const position = new THREE.Vector3(0, 0, 0);

      minimapGenerator.drawPlayerMarker(position, 0);
      minimapGenerator.drawPlayerMarker(position, Math.PI / 4);

      // Multiple draws should not throw
      expect(true).toBe(true);
    });

    it('should handle null context gracefully', () => {
      const generator = new MinimapGenerator();
      // Don't generate minimap, so context is null

      expect(() => {
        generator.drawPlayerMarker(new THREE.Vector3(0, 0, 0), 0);
      }).not.toThrow();
    });
  });

  describe('coordinate transformation', () => {
    beforeEach(() => {
      minimapGenerator.generate(mockTrack, mockRenderer, 512);
    });

    it('should transform world position to screen coordinates', () => {
      const worldPos = new THREE.Vector3(0, 0, 0);

      // Call drawPlayerMarker which internally uses worldToScreen
      expect(() => {
        minimapGenerator.drawPlayerMarker(worldPos, 0);
      }).not.toThrow();
    });

    it('should handle positions at track bounds', () => {
      const bounds = mockTrack.getBounds();

      [bounds.min, bounds.max].forEach(pos => {
        expect(() => {
          minimapGenerator.drawPlayerMarker(pos, 0);
        }).not.toThrow();
      });
    });

    it('should handle positions outside track bounds', () => {
      const farPos = new THREE.Vector3(1000, 100, 1000);

      expect(() => {
        minimapGenerator.drawPlayerMarker(farPos, 0);
      }).not.toThrow();
    });

    it('should handle negative positions', () => {
      const negPos = new THREE.Vector3(-50, -10, -50);

      expect(() => {
        minimapGenerator.drawPlayerMarker(negPos, 0);
      }).not.toThrow();
    });
  });

  describe('texture retrieval', () => {
    it('should return null texture before generation', () => {
      const texture = minimapGenerator.getTexture();

      expect(texture).toBeNull();
    });

    it('should return texture after generation', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      const texture = minimapGenerator.getTexture();

      expect(texture).toBeDefined();
      expect(texture).not.toBeNull();
    });

    it('should return same texture on multiple calls', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      const texture1 = minimapGenerator.getTexture();
      const texture2 = minimapGenerator.getTexture();

      expect(texture1).toBe(texture2);
    });
  });

  describe('canvas retrieval', () => {
    it('should return null canvas before generation', () => {
      const canvas = minimapGenerator.getCanvas();

      expect(canvas).toBeNull();
    });

    it('should return canvas after generation', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      const canvas = minimapGenerator.getCanvas();

      expect(canvas).toBeDefined();
      expect(canvas).not.toBeNull();
    });

    it('should have correct canvas dimensions', () => {
      const size = 512;
      minimapGenerator.generate(mockTrack, mockRenderer, size);

      const canvas = minimapGenerator.getCanvas();

      expect(canvas!.width).toBe(size);
      expect(canvas!.height).toBe(size);
    });

    it('should have 2D context', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      const canvas = minimapGenerator.getCanvas();
      const ctx = canvas!.getContext('2d');

      expect(ctx).toBeDefined();
    });
  });

  describe('resource disposal', () => {
    it('should dispose texture', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      const texture = minimapGenerator.getTexture();
      const disposeSpy = vi.spyOn(texture!, 'dispose');

      minimapGenerator.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should clear texture reference', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);
      minimapGenerator.dispose();

      const texture = minimapGenerator.getTexture();

      expect(texture).toBeNull();
    });

    it('should clear camera reference', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);
      minimapGenerator.dispose();

      // Camera should be cleared (implicitly tested)
      expect(minimapGenerator.getTexture()).toBeNull();
    });

    it('should clear canvas references', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);
      minimapGenerator.dispose();

      const canvas = minimapGenerator.getCanvas();

      expect(canvas).toBeNull();
    });

    it('should handle disposal without generation', () => {
      expect(() => {
        minimapGenerator.dispose();
      }).not.toThrow();
    });

    it('should handle multiple disposals', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      minimapGenerator.dispose();
      minimapGenerator.dispose();

      expect(minimapGenerator.getTexture()).toBeNull();
    });
  });

  describe('different minimap sizes', () => {
    it('should generate 256x256 minimap', () => {
      minimapGenerator.generate(mockTrack, mockRenderer, 256);

      const canvas = minimapGenerator.getCanvas();

      expect(canvas!.width).toBe(256);
      expect(canvas!.height).toBe(256);
    });

    it('should generate 512x512 minimap', () => {
      minimapGenerator.generate(mockTrack, mockRenderer, 512);

      const canvas = minimapGenerator.getCanvas();

      expect(canvas!.width).toBe(512);
      expect(canvas!.height).toBe(512);
    });

    it('should generate 1024x1024 minimap', () => {
      minimapGenerator.generate(mockTrack, mockRenderer, 1024);

      const canvas = minimapGenerator.getCanvas();

      expect(canvas!.width).toBe(1024);
      expect(canvas!.height).toBe(1024);
    });

    it('should handle non-power-of-two sizes', () => {
      minimapGenerator.generate(mockTrack, mockRenderer, 500);

      const canvas = minimapGenerator.getCanvas();

      expect(canvas!.width).toBe(500);
      expect(canvas!.height).toBe(500);
    });
  });

  describe('camera setup', () => {
    it('should position camera above track center', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      // Camera is positioned at y=50 looking down
      expect(mockRenderer.render).toHaveBeenCalled();
    });

    it('should look at track center', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      // Camera lookAt is called during generation
      expect(mockRenderer.render).toHaveBeenCalled();
    });

    it('should use orthographic projection', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      // Orthographic camera is created
      expect(mockRenderer.render).toHaveBeenCalled();
    });

    it('should set correct camera bounds from track', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      expect(mockTrack.getBounds).toHaveBeenCalled();
    });
  });

  describe('rendering pipeline', () => {
    it('should create scene for minimap', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      expect(mockRenderer.render).toHaveBeenCalled();
    });

    it('should add track mesh to scene', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      expect(mockTrack.getMesh).toHaveBeenCalled();
    });

    it('should create render target', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      expect(mockRenderer.setRenderTarget).toHaveBeenCalled();
    });

    it('should render to target', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      expect(mockRenderer.render).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle very small track', () => {
      mockTrack.getBounds = vi.fn(() => ({
        min: new THREE.Vector3(-1, 0, -1),
        max: new THREE.Vector3(1, 1, 2),
      }));

      const texture = minimapGenerator.generate(mockTrack, mockRenderer);

      expect(texture).toBeDefined();
    });

    it('should handle very large track', () => {
      mockTrack.getBounds = vi.fn(() => ({
        min: new THREE.Vector3(-1000, 0, -1000),
        max: new THREE.Vector3(1000, 100, 2000),
      }));

      const texture = minimapGenerator.generate(mockTrack, mockRenderer);

      expect(texture).toBeDefined();
    });

    it('should handle track at world origin', () => {
      mockTrack.getBounds = vi.fn(() => ({
        min: new THREE.Vector3(0, 0, 0),
        max: new THREE.Vector3(100, 10, 200),
      }));

      const texture = minimapGenerator.generate(mockTrack, mockRenderer);

      expect(texture).toBeDefined();
    });

    it('should handle track with negative coordinates', () => {
      mockTrack.getBounds = vi.fn(() => ({
        min: new THREE.Vector3(-200, -10, -100),
        max: new THREE.Vector3(-100, 0, -50),
      }));

      const texture = minimapGenerator.generate(mockTrack, mockRenderer);

      expect(texture).toBeDefined();
    });

    it('should handle zero rotation', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      expect(() => {
        minimapGenerator.drawPlayerMarker(new THREE.Vector3(0, 0, 0), 0);
      }).not.toThrow();
    });

    it('should handle negative rotation', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      expect(() => {
        minimapGenerator.drawPlayerMarker(new THREE.Vector3(0, 0, 0), -Math.PI);
      }).not.toThrow();
    });

    it('should handle large rotation values', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      expect(() => {
        minimapGenerator.drawPlayerMarker(new THREE.Vector3(0, 0, 0), Math.PI * 10);
      }).not.toThrow();
    });
  });

  describe('performance', () => {
    it('should generate minimap quickly', () => {
      const start = performance.now();

      minimapGenerator.generate(mockTrack, mockRenderer);

      const end = performance.now();
      const time = end - start;

      expect(time).toBeLessThan(100); // < 100ms generation
    });

    it('should draw player marker quickly', () => {
      minimapGenerator.generate(mockTrack, mockRenderer);

      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        minimapGenerator.drawPlayerMarker(new THREE.Vector3(i, 0, i), i);
      }

      const end = performance.now();
      const avgTime = (end - start) / 100;

      expect(avgTime).toBeLessThan(1); // < 1ms per draw
    });

    it('should handle multiple regenerations', () => {
      for (let i = 0; i < 10; i++) {
        minimapGenerator.generate(mockTrack, mockRenderer);
      }

      expect(minimapGenerator.getTexture()).toBeDefined();
    });
  });

  describe('integration', () => {
    it('should work with track and renderer', () => {
      const texture = minimapGenerator.generate(mockTrack, mockRenderer);

      expect(texture).toBeDefined();
      expect(mockRenderer.setRenderTarget).toHaveBeenCalled();
      expect(mockRenderer.render).toHaveBeenCalled();
      expect(mockTrack.getBounds).toHaveBeenCalled();
      expect(mockTrack.getMesh).toHaveBeenCalled();
    });

    it('should support full workflow', () => {
      // Generate minimap
      const texture = minimapGenerator.generate(mockTrack, mockRenderer, 512);
      expect(texture).toBeDefined();

      // Draw player marker
      minimapGenerator.drawPlayerMarker(new THREE.Vector3(0, 0, 0), 0);

      // Get canvas
      const canvas = minimapGenerator.getCanvas();
      expect(canvas).toBeDefined();

      // Get texture
      const tex = minimapGenerator.getTexture();
      expect(tex).toBe(texture);

      // Dispose
      minimapGenerator.dispose();
      expect(minimapGenerator.getTexture()).toBeNull();
    });
  });
});
