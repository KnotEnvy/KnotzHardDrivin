/**
 * Unit tests for WaypointSystem.ts
 * Target: >80% coverage
 *
 * Tests cover:
 * - Waypoint initialization
 * - Waypoint triggering on proximity
 * - Sequential waypoint validation
 * - Lap counting and completion
 * - Wrong-way detection
 * - Progress calculation
 * - Race finish detection
 * - Checkpoint time bonuses
 * - System reset
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { WaypointSystem, WaypointData } from '@/systems/WaypointSystem';
import {
  fullLapWaypoints,
  standardWaypoint,
  checkpointWaypoint,
  elevatedWaypoint,
  tightWaypoint,
} from '../fixtures/trackFixtures';
import { generatePathPositions } from '../fixtures/testHelpers';

describe('WaypointSystem', () => {
  let waypointSystem: WaypointSystem;
  let waypointData: WaypointData[];

  beforeEach(() => {
    waypointData = [
      {
        id: 0,
        position: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(0, 0, 1),
        triggerRadius: 5,
        isCheckpoint: false,
      },
      {
        id: 1,
        position: new THREE.Vector3(0, 0, 100),
        direction: new THREE.Vector3(0, 0, 1),
        triggerRadius: 5,
        isCheckpoint: true,
        timeBonus: 30,
      },
      {
        id: 2,
        position: new THREE.Vector3(0, 0, 200),
        direction: new THREE.Vector3(0, 0, 1),
        triggerRadius: 5,
        isCheckpoint: false,
      },
    ];

    waypointSystem = new WaypointSystem(waypointData);
  });

  describe('constructor and initialization', () => {
    it('should initialize with waypoint data', () => {
      expect(waypointSystem).toBeDefined();
    });

    it('should start at waypoint 0', () => {
      expect(waypointSystem.getCurrentWaypointIndex()).toBe(0);
    });

    it('should start at lap 0', () => {
      expect(waypointSystem.getCurrentLap()).toBe(0);
    });

    it('should have default max laps of 2', () => {
      expect(waypointSystem.getMaxLaps()).toBe(2);
    });

    it('should return correct total waypoint count', () => {
      expect(waypointSystem.getTotalWaypoints()).toBe(3);
    });

    it('should handle single waypoint', () => {
      const singleWaypoint = new WaypointSystem([standardWaypoint]);

      expect(singleWaypoint.getTotalWaypoints()).toBe(1);
    });

    it('should handle many waypoints', () => {
      const manyWaypoints = new WaypointSystem(fullLapWaypoints);

      expect(manyWaypoints.getTotalWaypoints()).toBe(5);
    });
  });

  describe('waypoint triggering', () => {
    it('should trigger waypoint when vehicle is within radius', () => {
      const vehiclePosition = new THREE.Vector3(0, 0, 0);
      const result = waypointSystem.update(vehiclePosition);

      expect(result.waypointPassed).toBe(true);
      expect(result.waypointId).toBe(0);
    });

    it('should not trigger waypoint when vehicle is outside radius', () => {
      const vehiclePosition = new THREE.Vector3(0, 0, 50);
      const result = waypointSystem.update(vehiclePosition);

      expect(result.waypointPassed).toBeUndefined();
    });

    it('should not trigger on exact trigger radius boundary (exclusive)', () => {
      const vehiclePosition = new THREE.Vector3(5, 0, 0); // Exactly at radius (boundary)
      const result = waypointSystem.update(vehiclePosition);

      // Implementation uses < not <=, so boundary is not triggered
      expect(result.waypointPassed).toBeUndefined();
    });

    it('should trigger waypoint in 3D space (with Y offset)', () => {
      const vehiclePosition = new THREE.Vector3(0, 1, 0);
      const result = waypointSystem.update(vehiclePosition);

      expect(result.waypointPassed).toBe(true);
    });

    it('should advance to next waypoint after trigger', () => {
      const pos1 = new THREE.Vector3(0, 0, 0);
      waypointSystem.update(pos1);

      expect(waypointSystem.getCurrentWaypointIndex()).toBe(1);
    });

    it('should handle tight trigger radius', () => {
      const tightSystem = new WaypointSystem([tightWaypoint]);
      const insideRadius = new THREE.Vector3(0, 0, 201); // Within 2m
      const outsideRadius = new THREE.Vector3(0, 0, 203); // Outside 2m

      const result1 = tightSystem.update(insideRadius);
      expect(result1.waypointPassed).toBe(true);

      tightSystem.reset();

      const result2 = tightSystem.update(outsideRadius);
      expect(result2.waypointPassed).toBeUndefined();
    });
  });

  describe('sequential waypoint validation', () => {
    it('should require waypoints to be passed in order', () => {
      // Try to trigger waypoint 2 without passing 0 and 1 first
      const pos2 = new THREE.Vector3(0, 0, 200);
      const result = waypointSystem.update(pos2);

      // Waypoint 2 should not trigger (we're still on waypoint 0)
      expect(result.waypointPassed).toBeUndefined();
    });

    it('should progress through waypoints sequentially', () => {
      const pos0 = new THREE.Vector3(0, 0, 0);
      const pos1 = new THREE.Vector3(0, 0, 100);
      const pos2 = new THREE.Vector3(0, 0, 200);

      waypointSystem.update(pos0);
      expect(waypointSystem.getCurrentWaypointIndex()).toBe(1);

      waypointSystem.update(pos1);
      expect(waypointSystem.getCurrentWaypointIndex()).toBe(2);

      waypointSystem.update(pos2);
      expect(waypointSystem.getCurrentWaypointIndex()).toBe(0); // Wrapped to 0
    });

    it('should not skip waypoints', () => {
      const pos0 = new THREE.Vector3(0, 0, 0);
      const pos2 = new THREE.Vector3(0, 0, 200);

      waypointSystem.update(pos0); // Pass waypoint 0
      waypointSystem.update(pos2); // Try to pass waypoint 2 (skipping 1)

      // Should still be on waypoint 1, not 2
      expect(waypointSystem.getCurrentWaypointIndex()).toBe(1);
    });
  });

  describe('lap counting', () => {
    it('should complete lap when passing all waypoints', () => {
      const positions = [
        new THREE.Vector3(0, 0, 0),   // Waypoint 0
        new THREE.Vector3(0, 0, 100), // Waypoint 1
        new THREE.Vector3(0, 0, 200), // Waypoint 2
      ];

      let lapCompleted = false;

      positions.forEach(pos => {
        const result = waypointSystem.update(pos);
        if (result.lapCompleted) {
          lapCompleted = true;
        }
      });

      expect(lapCompleted).toBe(true);
    });

    it('should increment lap count on lap completion', () => {
      const positions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 100),
        new THREE.Vector3(0, 0, 200),
      ];

      positions.forEach(pos => waypointSystem.update(pos));

      expect(waypointSystem.getCurrentLap()).toBe(1);
    });

    it('should return current lap in lap completion result', () => {
      const positions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 100),
        new THREE.Vector3(0, 0, 200),
      ];

      let currentLap = 0;

      positions.forEach(pos => {
        const result = waypointSystem.update(pos);
        if (result.currentLap !== undefined) {
          currentLap = result.currentLap;
        }
      });

      expect(currentLap).toBe(1);
    });

    it('should wrap waypoint index to 0 after lap completion', () => {
      const positions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 100),
        new THREE.Vector3(0, 0, 200),
      ];

      positions.forEach(pos => waypointSystem.update(pos));

      expect(waypointSystem.getCurrentWaypointIndex()).toBe(0);
    });

    it('should handle multiple laps', () => {
      const positions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 100),
        new THREE.Vector3(0, 0, 200),
      ];

      // Complete 2 laps
      for (let i = 0; i < 2; i++) {
        positions.forEach(pos => waypointSystem.update(pos));
      }

      expect(waypointSystem.getCurrentLap()).toBe(2);
    });
  });

  describe('race finish detection', () => {
    it('should detect race finish when max laps reached', () => {
      const positions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 100),
        new THREE.Vector3(0, 0, 200),
      ];

      let raceFinished = false;

      // Complete 2 laps (max laps)
      for (let i = 0; i < 2; i++) {
        positions.forEach(pos => {
          const result = waypointSystem.update(pos);
          if (result.raceFinished) {
            raceFinished = true;
          }
        });
      }

      expect(raceFinished).toBe(true);
    });

    it('should not finish race before max laps', () => {
      const positions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 100),
        new THREE.Vector3(0, 0, 200),
      ];

      let raceFinished = false;

      // Complete only 1 lap
      positions.forEach(pos => {
        const result = waypointSystem.update(pos);
        if (result.raceFinished) {
          raceFinished = true;
        }
      });

      expect(raceFinished).toBe(false);
    });

    it('should finish race on exact max lap count', () => {
      waypointSystem.setMaxLaps(1);

      const positions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 100),
        new THREE.Vector3(0, 0, 200),
      ];

      let raceFinished = false;

      positions.forEach(pos => {
        const result = waypointSystem.update(pos);
        if (result.raceFinished) {
          raceFinished = true;
        }
      });

      expect(raceFinished).toBe(true);
    });
  });

  describe('wrong-way detection', () => {
    it('should detect wrong way when vehicle is past waypoint facing backwards', () => {
      // Vehicle is far ahead of waypoint 0 (past all waypoints)
      // Vehicle facing backwards (away from waypoint)
      const vehiclePosition = new THREE.Vector3(0, 0, 250);
      const vehicleForward = new THREE.Vector3(0, 0, 1); // Facing forward (+Z), but waypoint is behind at -Z
      const result = waypointSystem.update(vehiclePosition, vehicleForward);

      expect(result.wrongWay).toBe(true);
    });

    it('should not detect wrong way when moving toward waypoint', () => {
      // Vehicle moving toward waypoint 0
      const vehiclePosition = new THREE.Vector3(0, 0, -10);
      const result = waypointSystem.update(vehiclePosition);

      expect(result.wrongWay).toBeUndefined();
    });

    it('should use dot product threshold of -0.5', () => {
      // Vehicle at 90 degrees to waypoint direction (dot product = 0)
      // Should not trigger wrong-way (only triggers at < -0.5)
      const vehiclePosition = new THREE.Vector3(10, 0, 0);
      const result = waypointSystem.update(vehiclePosition);

      // At 90 degrees, dot product is 0, which is > -0.5, so not wrong way
      expect(result.wrongWay).toBeUndefined();
    });

    it('should calculate dot product correctly', () => {
      // Vehicle ahead of waypoint, facing away from it
      const vehiclePosition = new THREE.Vector3(0, 0, 250);
      const vehicleForward = new THREE.Vector3(0, 0, 1); // Facing +Z, waypoint at (0,0,0) is behind
      const result = waypointSystem.update(vehiclePosition, vehicleForward);

      expect(result.wrongWay).toBe(true);
    });
  });

  describe('checkpoint time bonuses', () => {
    it('should return time bonus for checkpoint waypoint', () => {
      // Pass waypoint 0, then waypoint 1 (checkpoint with bonus)
      waypointSystem.update(new THREE.Vector3(0, 0, 0));
      const result = waypointSystem.update(new THREE.Vector3(0, 0, 100));

      expect(result.timeBonus).toBe(30);
    });

    it('should not return time bonus for non-checkpoint waypoint', () => {
      const result = waypointSystem.update(new THREE.Vector3(0, 0, 0));

      expect(result.timeBonus).toBeUndefined();
    });

    it('should use default time bonus if not specified', () => {
      const waypointWithoutBonus: WaypointData = {
        id: 0,
        position: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(0, 0, 1),
        triggerRadius: 5,
        isCheckpoint: true,
        // No timeBonus specified
      };

      const system = new WaypointSystem([waypointWithoutBonus]);
      const result = system.update(new THREE.Vector3(0, 0, 0));

      expect(result.timeBonus).toBe(30); // Default value
    });

    it('should use custom time bonus if specified', () => {
      const waypointWithCustomBonus: WaypointData = {
        id: 0,
        position: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(0, 0, 1),
        triggerRadius: 5,
        isCheckpoint: true,
        timeBonus: 50,
      };

      const system = new WaypointSystem([waypointWithCustomBonus]);
      const result = system.update(new THREE.Vector3(0, 0, 0));

      expect(result.timeBonus).toBe(50);
    });
  });

  describe('progress calculation', () => {
    it('should calculate progress from 0.0 to 1.0', () => {
      const progress = waypointSystem.getProgress();

      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });

    it('should return 0 progress at start', () => {
      const progress = waypointSystem.getProgress();

      expect(progress).toBe(0);
    });

    it('should increase progress as waypoints are passed', () => {
      const progress1 = waypointSystem.getProgress();

      waypointSystem.update(new THREE.Vector3(0, 0, 0)); // Pass waypoint 0

      const progress2 = waypointSystem.getProgress();

      expect(progress2).toBeGreaterThan(progress1);
    });

    it('should return 1.0 progress at race finish', () => {
      const positions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 100),
        new THREE.Vector3(0, 0, 200),
      ];

      // Complete 2 laps (max laps)
      for (let i = 0; i < 2; i++) {
        positions.forEach(pos => waypointSystem.update(pos));
      }

      const progress = waypointSystem.getProgress();

      expect(progress).toBe(1.0);
    });

    it('should return progress in update result when not passing waypoint', () => {
      // Vehicle approaching waypoint 0 from behind (not triggering, not wrong-way)
      // Waypoint 0 is at (0,0,0) with radius 5
      // Vehicle at (0,0,-20) is behind it, moving toward it
      // toWaypoint = (0,0,0) - (0,0,-20) = (0,0,20) → normalized to (0,0,1)
      // dot = (0,0,1) · (0,0,1) = 1 (correct direction, not wrong-way)
      const vehiclePosition = new THREE.Vector3(0, 0, -20);
      const result = waypointSystem.update(vehiclePosition);

      // Progress is returned when not passing waypoint and not going wrong-way
      expect(result.progress).toBeDefined();
      expect(result.progress!).toBeGreaterThanOrEqual(0);
      expect(result.progress!).toBeLessThanOrEqual(1);
    });

    it('should calculate progress correctly at mid-lap', () => {
      // Pass waypoint 0 (1/3 of lap 1)
      waypointSystem.update(new THREE.Vector3(0, 0, 0));

      const progress = waypointSystem.getProgress();

      // Progress = (currentWaypoint + lapCount * totalWaypoints) / (totalWaypoints * maxLaps)
      // = (1 + 0 * 3) / (3 * 2) = 1/6 ≈ 0.167
      expect(progress).toBeCloseTo(1 / 6, 2);
    });

    it('should calculate progress correctly at lap boundary', () => {
      const positions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 100),
        new THREE.Vector3(0, 0, 200),
      ];

      // Complete 1 lap
      positions.forEach(pos => waypointSystem.update(pos));

      const progress = waypointSystem.getProgress();

      // Progress after 1 lap = 1/2 = 0.5 (with maxLaps = 2)
      expect(progress).toBeCloseTo(0.5, 2);
    });
  });

  describe('next waypoint position', () => {
    it('should return position of current waypoint', () => {
      const nextPos = waypointSystem.getNextWaypointPosition();

      expect(nextPos).toBeInstanceOf(THREE.Vector3);
      expect(nextPos.x).toBe(0);
      expect(nextPos.y).toBe(0);
      expect(nextPos.z).toBe(0);
    });

    it('should update after waypoint is passed', () => {
      waypointSystem.update(new THREE.Vector3(0, 0, 0)); // Pass waypoint 0

      const nextPos = waypointSystem.getNextWaypointPosition();

      expect(nextPos.z).toBe(100); // Now pointing to waypoint 1
    });

    it('should return temp vector reference (caller must copy if persistence needed)', () => {
      const pos1 = waypointSystem.getNextWaypointPosition();
      const pos2 = waypointSystem.getNextWaypointPosition();

      // Both return same reference to temp vector (zero-alloc optimization)
      expect(pos1).toBe(pos2);

      // If caller needs persistent copy, they should copy it
      const pos1Copy = pos1.clone();
      waypointSystem.update(new THREE.Vector3(0, 0, 0)); // Move to next waypoint
      const pos2Value = waypointSystem.getNextWaypointPosition();

      // Original copy should be unchanged, but referenced temp vector will change
      expect(pos1Copy).not.toEqual(pos2Value);
    });

    it('should handle wrap-around at lap boundary', () => {
      const positions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 100),
        new THREE.Vector3(0, 0, 200),
      ];

      // Complete 1 lap
      positions.forEach(pos => waypointSystem.update(pos));

      const nextPos = waypointSystem.getNextWaypointPosition();

      // Should wrap back to waypoint 0
      expect(nextPos.z).toBe(0);
    });
  });

  describe('system reset', () => {
    it('should reset to initial state', () => {
      // Progress through some waypoints
      waypointSystem.update(new THREE.Vector3(0, 0, 0));
      waypointSystem.update(new THREE.Vector3(0, 0, 100));

      waypointSystem.reset();

      expect(waypointSystem.getCurrentWaypointIndex()).toBe(0);
      expect(waypointSystem.getCurrentLap()).toBe(0);
    });

    it('should reset progress to 0', () => {
      waypointSystem.update(new THREE.Vector3(0, 0, 0));
      waypointSystem.reset();

      const progress = waypointSystem.getProgress();

      expect(progress).toBe(0);
    });

    it('should allow re-running race after reset', () => {
      // Complete a lap
      const positions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 100),
        new THREE.Vector3(0, 0, 200),
      ];

      positions.forEach(pos => waypointSystem.update(pos));
      waypointSystem.reset();

      // Should be able to pass waypoint 0 again
      const result = waypointSystem.update(new THREE.Vector3(0, 0, 0));

      expect(result.waypointPassed).toBe(true);
      expect(result.waypointId).toBe(0);
    });
  });

  describe('max laps configuration', () => {
    it('should set custom max laps', () => {
      waypointSystem.setMaxLaps(3);

      expect(waypointSystem.getMaxLaps()).toBe(3);
    });

    it('should enforce minimum of 1 lap', () => {
      waypointSystem.setMaxLaps(0);

      expect(waypointSystem.getMaxLaps()).toBe(1);
    });

    it('should handle negative max laps', () => {
      waypointSystem.setMaxLaps(-5);

      expect(waypointSystem.getMaxLaps()).toBe(1);
    });

    it('should update progress calculation with new max laps', () => {
      waypointSystem.setMaxLaps(1);

      // Pass waypoint 0
      waypointSystem.update(new THREE.Vector3(0, 0, 0));

      const progress = waypointSystem.getProgress();

      // Progress = 1/3 (1 waypoint out of 3, with 1 max lap)
      expect(progress).toBeCloseTo(1 / 3, 2);
    });
  });

  describe('getters', () => {
    it('should get current waypoint index', () => {
      const index = waypointSystem.getCurrentWaypointIndex();

      expect(index).toBe(0);
    });

    it('should get current lap count', () => {
      const lap = waypointSystem.getCurrentLap();

      expect(lap).toBe(0);
    });

    it('should get max laps', () => {
      const maxLaps = waypointSystem.getMaxLaps();

      expect(maxLaps).toBe(2);
    });

    it('should get total waypoints', () => {
      const total = waypointSystem.getTotalWaypoints();

      expect(total).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle vehicle at exact waypoint position', () => {
      const result = waypointSystem.update(new THREE.Vector3(0, 0, 0));

      expect(result.waypointPassed).toBe(true);
    });

    it('should handle vehicle very close to waypoint', () => {
      const result = waypointSystem.update(new THREE.Vector3(0.1, 0.1, 0.1));

      expect(result.waypointPassed).toBe(true);
    });

    it('should handle vehicle just outside trigger radius', () => {
      const result = waypointSystem.update(new THREE.Vector3(5.1, 0, 0));

      expect(result.waypointPassed).toBeUndefined();
    });

    it('should handle elevated waypoint', () => {
      const elevatedSystem = new WaypointSystem([elevatedWaypoint]);
      const result = elevatedSystem.update(new THREE.Vector3(0, 10, 150));

      expect(result.waypointPassed).toBe(true);
    });

    it('should handle very large distances', () => {
      const farPosition = new THREE.Vector3(1000, 1000, 1000);
      const vehicleForward = new THREE.Vector3(1, 1, 1).normalize(); // Facing away from waypoint at origin
      const result = waypointSystem.update(farPosition, vehicleForward);

      expect(result.waypointPassed).toBeUndefined();
      expect(result.wrongWay).toBe(true);
    });

    it('should handle negative positions', () => {
      const result = waypointSystem.update(new THREE.Vector3(-50, -10, -100));

      expect(result).toBeDefined();
    });

    it('should handle zero vector', () => {
      const result = waypointSystem.update(new THREE.Vector3(0, 0, 0));

      expect(result.waypointPassed).toBe(true);
    });
  });

  describe('performance', () => {
    it('should handle many waypoints efficiently', () => {
      const manyWaypoints: WaypointData[] = [];

      for (let i = 0; i < 100; i++) {
        manyWaypoints.push({
          id: i,
          position: new THREE.Vector3(0, 0, i * 10),
          direction: new THREE.Vector3(0, 0, 1),
          triggerRadius: 5,
          isCheckpoint: i % 5 === 0,
          timeBonus: 30,
        });
      }

      const system = new WaypointSystem(manyWaypoints);

      expect(system.getTotalWaypoints()).toBe(100);
    });

    it('should update quickly', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        waypointSystem.update(new THREE.Vector3(0, 0, 50));
      }

      const end = performance.now();
      const avgTime = (end - start) / 1000;

      expect(avgTime).toBeLessThan(0.1); // < 0.1ms per update
    });
  });
});
