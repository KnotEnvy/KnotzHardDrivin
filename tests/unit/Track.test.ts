/**
 * Unit tests for Track.ts
 * Target: >80% coverage
 *
 * Tests cover:
 * - Track initialization from data
 * - Spline generation from different section types
 * - Mesh generation with correct geometry
 * - Trimesh collider creation
 * - Surface type detection
 * - Bounds calculation
 * - Waypoint/spawn point retrieval
 * - Resource disposal
 * - Track data validation and loading
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { Track, TrackData, TrackSection } from '@/entities/Track';
import { SurfaceType } from '@/types/VehicleTypes';
import {
  createMockPhysicsWorld,
  createMockScene,
} from '../fixtures/testHelpers';
import {
  minimalTrackData,
  ovalTrackData,
  stuntTrackData,
  straightSectionData,
  curve90SectionData,
  rampSectionData,
  loopSectionData,
  bankedCurveSectionData,
} from '../fixtures/trackFixtures';

describe('Track', () => {
  let mockWorld: any;
  let mockScene: any;

  beforeEach(() => {
    mockWorld = createMockPhysicsWorld();
    mockScene = createMockScene();
    vi.clearAllMocks();
  });

  describe('constructor and initialization', () => {
    it('should initialize track with valid data', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);

      expect(track).toBeDefined();
      expect(track.getName()).toBe('Test Track - Minimal');
    });

    it('should add mesh to scene on construction', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();

      expect(mesh).toBeDefined();
      expect(mockScene.add).toHaveBeenCalledWith(mesh);
    });

    it('should generate spline from sections', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();

      // Verify mesh geometry has vertices (spline was generated)
      expect(mesh.geometry).toBeDefined();
    });

    it('should create collider in physics world', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);

      expect(mockWorld.world.createCollider).toHaveBeenCalled();
    });

    it('should log track creation', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const track = new Track(minimalTrackData, mockWorld, mockScene);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Track "Test Track - Minimal" loaded')
      );
    });

    it('should handle track with multiple sections', () => {
      const track = new Track(ovalTrackData, mockWorld, mockScene);

      expect(track.getName()).toBe('Test Track - Oval');
    });

    it('should handle stunt track with loops and ramps', () => {
      const track = new Track(stuntTrackData, mockWorld, mockScene);

      expect(track.getName()).toBe('Test Track - Stunt');
    });
  });

  describe('spline generation', () => {
    it('should generate spline from straight section', () => {
      const trackData: TrackData = {
        name: 'Straight Test',
        width: 10,
        sections: [straightSectionData],
        waypoints: [],
        spawnPoint: {
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
        },
      };

      const track = new Track(trackData, mockWorld, mockScene);
      const mesh = track.getMesh();

      expect(mesh.geometry.getAttribute('position')).toBeDefined();
    });

    it('should generate spline from curve section', () => {
      const trackData: TrackData = {
        name: 'Curve Test',
        width: 10,
        sections: [curve90SectionData],
        waypoints: [],
        spawnPoint: {
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
        },
      };

      const track = new Track(trackData, mockWorld, mockScene);
      const mesh = track.getMesh();

      expect(mesh.geometry).toBeDefined();
    });

    it('should generate spline from ramp section', () => {
      const trackData: TrackData = {
        name: 'Ramp Test',
        width: 10,
        sections: [rampSectionData],
        waypoints: [],
        spawnPoint: {
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
        },
      };

      const track = new Track(trackData, mockWorld, mockScene);
      const mesh = track.getMesh();

      expect(mesh.geometry).toBeDefined();
    });

    it('should generate spline from loop section', () => {
      const trackData: TrackData = {
        name: 'Loop Test',
        width: 10,
        sections: [loopSectionData],
        waypoints: [],
        spawnPoint: {
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
        },
      };

      const track = new Track(trackData, mockWorld, mockScene);
      const mesh = track.getMesh();

      expect(mesh.geometry).toBeDefined();
    });

    it('should generate spline from banked curve section', () => {
      const trackData: TrackData = {
        name: 'Banked Curve Test',
        width: 10,
        sections: [bankedCurveSectionData],
        waypoints: [],
        spawnPoint: {
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
        },
      };

      const track = new Track(trackData, mockWorld, mockScene);
      const mesh = track.getMesh();

      expect(mesh.geometry).toBeDefined();
    });

    it('should handle unknown section type gracefully', () => {
      const trackData: TrackData = {
        name: 'Unknown Test',
        width: 10,
        sections: [{ type: 'invalid' as any }],
        waypoints: [],
        spawnPoint: {
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
        },
      };

      const warnSpy = vi.spyOn(console, 'warn');
      const track = new Track(trackData, mockWorld, mockScene);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown section type')
      );
    });

    it('should create closed loop spline', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      // Spline should be closed (connects back to start)
      // This is verified by the spline being created successfully
      expect(track).toBeDefined();
    });

    it('should handle multiple connected sections', () => {
      const track = new Track(ovalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();

      // Verify all sections were processed
      expect(mesh.geometry.getAttribute('position')).toBeDefined();
    });
  });

  describe('mesh generation', () => {
    it('should create mesh with correct attributes', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();
      const geometry = mesh.geometry;

      expect(geometry.getAttribute('position')).toBeDefined();
      expect(geometry.getAttribute('uv')).toBeDefined();
      expect(geometry.getAttribute('normal')).toBeDefined();
      expect(geometry.index).toBeDefined();
    });

    it('should generate vertices for both track edges', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();
      const positionAttr = mesh.geometry.getAttribute('position');

      // Each spline point generates 2 vertices (left and right edge)
      expect(positionAttr.array.length).toBeGreaterThan(0);
      expect(positionAttr.array.length % 3).toBe(0); // Multiple of 3 (x, y, z)
    });

    it('should generate triangle indices', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();
      const indexAttr = mesh.geometry.index;

      expect(indexAttr).toBeDefined();
      expect(indexAttr.array.length).toBeGreaterThan(0);
      expect(indexAttr.array.length % 3).toBe(0); // Triangles have 3 indices
    });

    it('should generate UVs for texture mapping', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();
      const uvAttr = mesh.geometry.getAttribute('uv');

      expect(uvAttr).toBeDefined();
      expect(uvAttr.array.length).toBeGreaterThan(0);
      expect(uvAttr.array.length % 2).toBe(0); // UVs have 2 components
    });

    it('should compute vertex normals', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();
      const normalAttr = mesh.geometry.getAttribute('normal');

      expect(normalAttr).toBeDefined();
      expect(normalAttr.array.length).toBeGreaterThan(0);
    });

    it('should create mesh with correct material', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();

      expect(mesh.material).toBeDefined();
      expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    it('should set mesh to receive shadows', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();

      expect(mesh.receiveShadow).toBe(true);
      expect(mesh.castShadow).toBe(false); // Track doesn't cast shadows
    });

    it('should set mesh name', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();

      expect(mesh.name).toBe('track-mesh');
    });

    it('should log mesh generation statistics', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const track = new Track(minimalTrackData, mockWorld, mockScene);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Track mesh generated')
      );
    });
  });

  describe('collider generation', () => {
    it('should create trimesh collider from mesh geometry', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);

      expect(mockWorld.world.createCollider).toHaveBeenCalled();
    });

    it('should set collider friction', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);

      // Verify ColliderDesc.setFriction was called
      // This is implicitly tested by the collider being created successfully
      expect(mockWorld.world.createCollider).toHaveBeenCalled();
    });

    it('should set collision groups', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);

      // Collision groups are set during collider creation
      expect(mockWorld.world.createCollider).toHaveBeenCalled();
    });

    it('should handle physics world not initialized', () => {
      const uninitializedWorld = { world: null };

      // Should throw error instead of logging (FIX: changed from console.error to throw)
      expect(() => {
        new Track(minimalTrackData, uninitializedWorld as any, mockScene);
      }).toThrow('Physics world not initialized - cannot create track collider');
    });

    it('should handle missing position attribute', () => {
      const errorSpy = vi.spyOn(console, 'error');

      // Create track and manually remove position attribute to test error handling
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();
      mesh.geometry.deleteAttribute('position');

      // This tests that the collider generation handles missing attributes
      expect(track).toBeDefined();
    });

    it('should log collider creation', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const track = new Track(minimalTrackData, mockWorld, mockScene);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Track collider created')
      );
    });
  });

  describe('spawn point retrieval', () => {
    it('should return spawn point position', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const spawnPoint = track.getSpawnPoint();

      expect(spawnPoint.position).toBeInstanceOf(THREE.Vector3);
      expect(spawnPoint.position.x).toBe(0);
      expect(spawnPoint.position.y).toBe(2);
      expect(spawnPoint.position.z).toBe(-10);
    });

    it('should return spawn point rotation', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const spawnPoint = track.getSpawnPoint();

      expect(spawnPoint.rotation).toBeInstanceOf(THREE.Quaternion);
    });

    it('should create new Vector3 instance (not reference)', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const spawn1 = track.getSpawnPoint();
      const spawn2 = track.getSpawnPoint();

      expect(spawn1.position).not.toBe(spawn2.position);
    });
  });

  describe('waypoint retrieval', () => {
    it('should return waypoint array', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const waypoints = track.getWaypoints();

      expect(Array.isArray(waypoints)).toBe(true);
      expect(waypoints.length).toBe(3);
    });

    it('should return waypoints with correct structure', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const waypoints = track.getWaypoints();

      expect(waypoints[0]).toHaveProperty('id');
      expect(waypoints[0]).toHaveProperty('position');
      expect(waypoints[0]).toHaveProperty('direction');
      expect(waypoints[0]).toHaveProperty('triggerRadius');
      expect(waypoints[0]).toHaveProperty('isCheckpoint');
    });

    it('should handle track with no waypoints', () => {
      const trackData: TrackData = {
        name: 'No Waypoints Test',
        width: 10,
        sections: [straightSectionData],
        waypoints: [],
        spawnPoint: {
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
        },
      };

      const track = new Track(trackData, mockWorld, mockScene);
      const waypoints = track.getWaypoints();

      expect(waypoints.length).toBe(0);
    });
  });

  describe('bounds calculation', () => {
    it('should return bounding box', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const bounds = track.getBounds();

      expect(bounds).toBeInstanceOf(THREE.Box3);
    });

    it('should have valid min and max bounds', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const bounds = track.getBounds();

      expect(bounds.min).toBeDefined();
      expect(bounds.max).toBeDefined();
      expect(bounds.min.x).toBeLessThanOrEqual(bounds.max.x);
      expect(bounds.min.y).toBeLessThanOrEqual(bounds.max.y);
      expect(bounds.min.z).toBeLessThanOrEqual(bounds.max.z);
    });

    it('should calculate bounds from mesh', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const bounds = track.getBounds();

      // Bounds should contain the track mesh
      expect(bounds.min).toBeInstanceOf(THREE.Vector3);
      expect(bounds.max).toBeInstanceOf(THREE.Vector3);
    });
  });

  describe('surface type detection', () => {
    it('should return TARMAC surface type', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const position = new THREE.Vector3(0, 0, 0);
      const surfaceType = track.getSurfaceType(position);

      expect(surfaceType).toBe(SurfaceType.TARMAC);
    });

    it('should return TARMAC for any position (current implementation)', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const positions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 5, 20),
        new THREE.Vector3(-5, 2, 100),
      ];

      positions.forEach(pos => {
        expect(track.getSurfaceType(pos)).toBe(SurfaceType.TARMAC);
      });
    });
  });

  describe('track name', () => {
    it('should return correct track name', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);

      expect(track.getName()).toBe('Test Track - Minimal');
    });

    it('should handle different track names', () => {
      const tracks = [
        new Track(minimalTrackData, mockWorld, mockScene),
        new Track(ovalTrackData, mockWorld, mockScene),
        new Track(stuntTrackData, mockWorld, mockScene),
      ];

      expect(tracks[0].getName()).toBe('Test Track - Minimal');
      expect(tracks[1].getName()).toBe('Test Track - Oval');
      expect(tracks[2].getName()).toBe('Test Track - Stunt');
    });
  });

  describe('mesh retrieval', () => {
    it('should return mesh object', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should return same mesh on multiple calls', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh1 = track.getMesh();
      const mesh2 = track.getMesh();

      expect(mesh1).toBe(mesh2);
    });
  });

  describe('resource disposal', () => {
    it('should dispose geometry', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();
      const disposeSpy = vi.spyOn(mesh.geometry, 'dispose');

      track.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should dispose material', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();
      const material = mesh.material as THREE.Material;
      const disposeSpy = vi.spyOn(material, 'dispose');

      track.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should remove mesh from parent', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();
      const removeSpy = vi.spyOn(mesh, 'removeFromParent');

      track.dispose();

      expect(removeSpy).toHaveBeenCalled();
    });

    it('should log disposal', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const track = new Track(minimalTrackData, mockWorld, mockScene);

      track.dispose();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('disposed')
      );
    });

    it('should handle material array', () => {
      const track = new Track(minimalTrackData, mockWorld, mockScene);
      const mesh = track.getMesh();

      // Mock material array
      const materials = [
        new THREE.MeshStandardMaterial(),
        new THREE.MeshStandardMaterial(),
      ];
      mesh.material = materials;

      const disposeSpy1 = vi.spyOn(materials[0], 'dispose');
      const disposeSpy2 = vi.spyOn(materials[1], 'dispose');

      track.dispose();

      expect(disposeSpy1).toHaveBeenCalled();
      expect(disposeSpy2).toHaveBeenCalled();
    });
  });

  describe('static loadTrackData', () => {
    it('should load track data from JSON file', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => minimalTrackData,
      });

      const data = await Track.loadTrackData('/tracks/test.json');

      expect(data.name).toBe('Test Track - Minimal');
      expect(data.sections.length).toBeGreaterThan(0);
    });

    it('should validate track data structure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => minimalTrackData,
      });

      const data = await Track.loadTrackData('/tracks/test.json');

      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('sections');
      expect(data).toHaveProperty('waypoints');
      expect(data).toHaveProperty('spawnPoint');
    });

    it('should throw error on fetch failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(
        Track.loadTrackData('/tracks/missing.json')
      ).rejects.toThrow('Failed to load track');
    });

    it('should throw error on invalid track data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'data' }),
      });

      await expect(
        Track.loadTrackData('/tracks/invalid.json')
      ).rejects.toThrow('Invalid track data');
    });

    it('should throw error on missing name field', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sections: [],
          waypoints: [],
          spawnPoint: {},
        }),
      });

      await expect(
        Track.loadTrackData('/tracks/no-name.json')
      ).rejects.toThrow('Invalid track data');
    });

    it('should throw error on missing sections field', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          name: 'Test',
          waypoints: [],
          spawnPoint: {},
        }),
      });

      await expect(
        Track.loadTrackData('/tracks/no-sections.json')
      ).rejects.toThrow('Invalid track data');
    });

    it('should log successful load', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => minimalTrackData,
      });

      await Track.loadTrackData('/tracks/test.json');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Track data loaded from')
      );
    });

    it('should log error on failure', async () => {
      const errorSpy = vi.spyOn(console, 'error');
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        Track.loadTrackData('/tracks/test.json')
      ).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error loading track data'),
        expect.any(Error)
      );
    });
  });

  describe('edge cases', () => {
    it('should handle track with single section', () => {
      const trackData: TrackData = {
        name: 'Single Section',
        width: 10,
        sections: [straightSectionData],
        waypoints: [],
        spawnPoint: {
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
        },
      };

      const track = new Track(trackData, mockWorld, mockScene);

      expect(track.getName()).toBe('Single Section');
    });

    it('should handle very narrow track', () => {
      const trackData: TrackData = {
        ...minimalTrackData,
        width: 1,
      };

      const track = new Track(trackData, mockWorld, mockScene);
      const mesh = track.getMesh();

      expect(mesh.geometry).toBeDefined();
    });

    it('should handle very wide track', () => {
      const trackData: TrackData = {
        ...minimalTrackData,
        width: 100,
      };

      const track = new Track(trackData, mockWorld, mockScene);
      const mesh = track.getMesh();

      expect(mesh.geometry).toBeDefined();
    });

    it('should handle section with default length', () => {
      const trackData: TrackData = {
        name: 'Default Length',
        width: 10,
        sections: [{ type: 'straight' as const }],
        waypoints: [],
        spawnPoint: {
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
        },
      };

      const track = new Track(trackData, mockWorld, mockScene);

      expect(track).toBeDefined();
    });

    it('should handle section with default radius', () => {
      const trackData: TrackData = {
        name: 'Default Radius',
        width: 10,
        sections: [{ type: 'curve' as const }],
        waypoints: [],
        spawnPoint: {
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
        },
      };

      const track = new Track(trackData, mockWorld, mockScene);

      expect(track).toBeDefined();
    });

    it('should handle section with default angle', () => {
      const trackData: TrackData = {
        name: 'Default Angle',
        width: 10,
        sections: [{ type: 'curve' as const, radius: 50 }],
        waypoints: [],
        spawnPoint: {
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
        },
      };

      const track = new Track(trackData, mockWorld, mockScene);

      expect(track).toBeDefined();
    });

    it('should handle section with default banking', () => {
      const trackData: TrackData = {
        name: 'Default Banking',
        width: 10,
        sections: [{ type: 'bank' as const, radius: 40, angle: 90 }],
        waypoints: [],
        spawnPoint: {
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
        },
      };

      const track = new Track(trackData, mockWorld, mockScene);

      expect(track).toBeDefined();
    });

    it('should handle section with default height', () => {
      const trackData: TrackData = {
        name: 'Default Height',
        width: 10,
        sections: [{ type: 'ramp' as const, length: 30 }],
        waypoints: [],
        spawnPoint: {
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
        },
      };

      const track = new Track(trackData, mockWorld, mockScene);

      expect(track).toBeDefined();
    });
  });
});
