/**
 * Phase 3 Performance Validation Tests
 *
 * Validates that track loading and waypoint system meet performance targets:
 * - Track loading: <100ms
 * - Waypoint update: <0.5ms
 * - Total frame time: <16.67ms (60fps)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Track, TrackData } from '../../src/entities/Track';
import { WaypointSystem, WaypointData } from '../../src/systems/WaypointSystem';
import { PhysicsWorld } from '../../src/core/PhysicsWorld';
import * as THREE from 'three';

// Mock track data (simple track for testing)
const mockTrackData: TrackData = {
  name: 'Performance Test Track',
  width: 10,
  sections: [
    { type: 'straight', length: 100 },
    { type: 'curve', radius: 50, angle: 90 },
    { type: 'straight', length: 50 },
  ],
  waypoints: [
    {
      id: 0,
      position: [0, 0, 0],
      direction: [0, 0, 1],
      triggerRadius: 10,
      isCheckpoint: false,
    },
    {
      id: 1,
      position: [0, 0, 100],
      direction: [0, 0, 1],
      triggerRadius: 10,
      isCheckpoint: true,
      timeBonus: 30,
    },
    {
      id: 2,
      position: [50, 0, 150],
      direction: [1, 0, 0],
      triggerRadius: 10,
      isCheckpoint: false,
    },
  ],
  spawnPoint: {
    position: [0, 2, -10],
    rotation: [0, 0, 0, 1],
  },
};

// Convert waypoint data to WaypointSystem format
const convertWaypoints = (trackData: TrackData): WaypointData[] => {
  return trackData.waypoints.map(wp => ({
    id: wp.id,
    position: new THREE.Vector3(wp.position[0], wp.position[1], wp.position[2]),
    direction: new THREE.Vector3(wp.direction[0], wp.direction[1], wp.direction[2]),
    triggerRadius: wp.triggerRadius,
    isCheckpoint: wp.isCheckpoint,
    timeBonus: wp.timeBonus,
  }));
};

describe('Phase 3 Performance Tests', () => {
  let physicsWorld: PhysicsWorld;
  let scene: THREE.Scene;

  beforeEach(async () => {
    physicsWorld = new PhysicsWorld();
    await physicsWorld.init();
    scene = new THREE.Scene();
  });

  afterEach(() => {
    // Cleanup
    if (scene) {
      scene.clear();
    }
  });

  describe('Track Loading Performance', () => {
    it('should load track in less than 100ms', () => {
      const startTime = performance.now();

      const track = new Track(mockTrackData, physicsWorld, scene);

      const loadTime = performance.now() - startTime;

      console.log(`Track loading time: ${loadTime.toFixed(2)}ms`);
      expect(loadTime).toBeLessThan(100);

      // Cleanup
      track.dispose();
    });

    it('should create track mesh with reasonable vertex count', () => {
      const track = new Track(mockTrackData, physicsWorld, scene);
      const mesh = track.getMesh();

      const vertexCount = mesh.geometry.attributes.position.count;
      const indexCount = mesh.geometry.index?.count || 0;
      const triangleCount = indexCount / 3;

      console.log(`Track mesh: ${vertexCount} vertices, ${triangleCount} triangles`);

      // Expect around 2000 vertices for 1000-point spline (left + right edges)
      expect(vertexCount).toBeGreaterThan(1000);
      expect(vertexCount).toBeLessThan(5000);

      // Expect around 4000 triangles (2 per segment)
      expect(triangleCount).toBeGreaterThan(1000);
      expect(triangleCount).toBeLessThan(10000);

      track.dispose();
    });

    it('should have acceptable memory footprint', () => {
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const track = new Track(mockTrackData, physicsWorld, scene);

      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = (endMemory - startMemory) / (1024 * 1024); // Convert to MB

      console.log(`Track memory increase: ${memoryIncrease.toFixed(2)} MB`);

      // Track should use less than 20MB
      if (startMemory > 0) {
        expect(memoryIncrease).toBeLessThan(20);
      }

      track.dispose();
    });
  });

  describe('Waypoint System Performance', () => {
    it('should update waypoint system in less than 0.5ms', () => {
      const waypoints = convertWaypoints(mockTrackData);
      const waypointSystem = new WaypointSystem(waypoints);
      const vehiclePosition = new THREE.Vector3(0, 0, 50);

      // Warm up
      for (let i = 0; i < 10; i++) {
        waypointSystem.update(vehiclePosition);
      }

      // Benchmark
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        waypointSystem.update(vehiclePosition);
      }

      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / iterations;

      console.log(`Waypoint update time: ${avgTime.toFixed(4)}ms per update`);
      expect(avgTime).toBeLessThan(0.5);
    });

    it('should not allocate memory per frame', () => {
      const waypoints = convertWaypoints(mockTrackData);
      const waypointSystem = new WaypointSystem(waypoints);
      const vehiclePosition = new THREE.Vector3(0, 0, 50);

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Run 10,000 updates (simulating ~2.5 minutes at 60fps)
      for (let i = 0; i < 10000; i++) {
        waypointSystem.update(vehiclePosition);
      }

      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = (endMemory - startMemory) / (1024 * 1024); // MB

      console.log(`Memory increase after 10k updates: ${memoryIncrease.toFixed(2)} MB`);

      // Should have minimal memory increase (< 1MB for 10k updates)
      if (startMemory > 0) {
        expect(memoryIncrease).toBeLessThan(1);
      }
    });
  });

  describe('Integrated Performance', () => {
    it('should maintain acceptable frame time with track and waypoints', () => {
      const track = new Track(mockTrackData, physicsWorld, scene);
      const waypoints = convertWaypoints(mockTrackData);
      const waypointSystem = new WaypointSystem(waypoints);
      const vehiclePosition = new THREE.Vector3(0, 0, 50);

      // Simulate 60 frames of updates
      const frameTimes: number[] = [];

      for (let frame = 0; frame < 60; frame++) {
        const frameStart = performance.now();

        // Simulate frame operations
        waypointSystem.update(vehiclePosition);

        // Move vehicle slightly
        vehiclePosition.z += 1;

        const frameTime = performance.now() - frameStart;
        frameTimes.push(frameTime);
      }

      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const maxFrameTime = Math.max(...frameTimes);

      console.log(`Average frame time: ${avgFrameTime.toFixed(4)}ms`);
      console.log(`Max frame time: ${maxFrameTime.toFixed(4)}ms`);

      // Frame time should be well under 16.67ms budget
      // (Note: This is just waypoint system, full game has more overhead)
      expect(avgFrameTime).toBeLessThan(1);
      expect(maxFrameTime).toBeLessThan(2);

      track.dispose();
    });
  });

  describe('Performance Regression Detection', () => {
    it('should complete 1000 waypoint checks in less than 100ms', () => {
      const waypoints = convertWaypoints(mockTrackData);
      const waypointSystem = new WaypointSystem(waypoints);
      const vehiclePosition = new THREE.Vector3(0, 0, 50);

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        waypointSystem.update(vehiclePosition);
      }

      const totalTime = performance.now() - startTime;

      console.log(`1000 waypoint checks: ${totalTime.toFixed(2)}ms`);
      expect(totalTime).toBeLessThan(100);
    });
  });
});
