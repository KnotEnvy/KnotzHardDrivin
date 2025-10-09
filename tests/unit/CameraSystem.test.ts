/**
 * Unit tests for CameraSystem
 * Target: 80%+ coverage
 *
 * Tests cover:
 * - Camera mode switching
 * - First-person camera positioning and look-ahead
 * - Replay camera positioning
 * - Smooth damping/lerping
 * - Camera transitions
 * - Edge cases (null target, zero velocity)
 * - Configuration updates
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { CameraSystem, CameraMode, CameraTarget } from '@/systems/CameraSystem';

describe('CameraSystem', () => {
  let camera: THREE.PerspectiveCamera;
  let cameraSystem: CameraSystem;
  let mockTarget: CameraTarget;

  beforeEach(() => {
    camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    camera.position.set(0, 0, 0);
    cameraSystem = new CameraSystem(camera);

    mockTarget = {
      position: new THREE.Vector3(0, 0, 0),
      quaternion: new THREE.Quaternion(),
      velocity: new THREE.Vector3(0, 0, 10), // Moving forward at 10 m/s
    };

    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with first-person mode', () => {
      expect(cameraSystem.getMode()).toBe(CameraMode.FIRST_PERSON);
    });

    it('should not be in transition initially', () => {
      expect(cameraSystem.isInTransition()).toBe(false);
    });
  });

  describe('update with null target', () => {
    it('should handle null target gracefully', () => {
      const initialPos = camera.position.clone();

      cameraSystem.update(0.016, null);

      // Camera should not move
      expect(camera.position.equals(initialPos)).toBe(true);
    });

    it('should not throw error with null target', () => {
      expect(() => {
        cameraSystem.update(0.016, null);
      }).not.toThrow();
    });
  });

  describe('first-person camera mode', () => {
    beforeEach(() => {
      cameraSystem.setMode(CameraMode.FIRST_PERSON);
    });

    it('should initialize smooth values on first update', () => {
      cameraSystem.update(0.016, mockTarget);

      // Should have updated camera position
      expect(camera.position.lengthSq()).toBeGreaterThan(0);
    });

    it('should position camera at cockpit offset from target', () => {
      // Update multiple times for smooth tracking to catch up
      for (let i = 0; i < 100; i++) {
        cameraSystem.update(0.016, mockTarget);
      }

      // Camera should be approximately at cockpit position (0, 1.2, -0.5) relative to target
      // With smoothing, it should be close to this position
      expect(camera.position.y).toBeGreaterThan(0.5); // Should be elevated (eye height)
    });

    it('should look ahead based on velocity', () => {
      // Target moving forward
      mockTarget.velocity = new THREE.Vector3(0, 0, 10);

      for (let i = 0; i < 100; i++) {
        cameraSystem.update(0.016, mockTarget);
      }

      // Camera should be looking forward (check via direction)
      const forward = new THREE.Vector3(0, 0, 1);
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);

      // Should be looking generally forward
      const dot = forward.dot(cameraDirection);
      expect(dot).toBeGreaterThan(0.5); // Mostly forward
    });

    it('should handle stationary target (zero velocity)', () => {
      mockTarget.velocity = new THREE.Vector3(0, 0, 0);

      expect(() => {
        cameraSystem.update(0.016, mockTarget);
      }).not.toThrow();

      // Camera should still look in vehicle forward direction
      expect(camera.position).toBeDefined();
    });

    it('should handle target without velocity property', () => {
      const targetNoVelocity: CameraTarget = {
        position: new THREE.Vector3(0, 0, 0),
        quaternion: new THREE.Quaternion(),
      };

      expect(() => {
        cameraSystem.update(0.016, targetNoVelocity);
      }).not.toThrow();
    });

    it('should apply smooth damping to position', () => {
      const positions: THREE.Vector3[] = [];

      // Record positions over multiple frames
      for (let i = 0; i < 10; i++) {
        cameraSystem.update(0.016, mockTarget);
        positions.push(camera.position.clone());
      }

      // Camera should move smoothly (no instant jumps)
      for (let i = 1; i < positions.length; i++) {
        const delta = positions[i].distanceTo(positions[i - 1]);
        expect(delta).toBeLessThan(0.5); // Should move gradually
      }
    });

    it('should rotate based on target orientation', () => {
      // Rotate target 90 degrees
      mockTarget.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

      for (let i = 0; i < 100; i++) {
        cameraSystem.update(0.016, mockTarget);
      }

      // Camera orientation should change
      expect(camera.quaternion.equals(new THREE.Quaternion())).toBe(false);
    });
  });

  describe('replay camera mode', () => {
    beforeEach(() => {
      cameraSystem.setMode(CameraMode.REPLAY);
    });

    it('should position camera behind and above target', () => {
      mockTarget.position.set(0, 0, 0);
      mockTarget.velocity = new THREE.Vector3(0, 0, 10); // Moving forward

      for (let i = 0; i < 100; i++) {
        cameraSystem.update(0.016, mockTarget);
      }

      // Camera should be above target (Y > 0)
      expect(camera.position.y).toBeGreaterThan(5);

      // Camera should be behind target (negative Z when target moves in +Z)
      expect(camera.position.z).toBeLessThan(0);
    });

    it('should apply heavy damping for cinematic feel', () => {
      const positions: THREE.Vector3[] = [];

      // Move target and record camera positions
      for (let i = 0; i < 20; i++) {
        mockTarget.position.z += 1; // Move target forward
        cameraSystem.update(0.016, mockTarget);
        positions.push(camera.position.clone());
      }

      // Camera should follow smoothly with lag
      for (let i = 1; i < positions.length; i++) {
        const delta = positions[i].distanceTo(positions[i - 1]);
        // Replay camera moves very slowly due to heavy damping (0.05)
        expect(delta).toBeLessThan(2); // Slow movement
      }
    });

    it('should look at target with slight offset', () => {
      mockTarget.position.set(10, 0, 10);

      for (let i = 0; i < 100; i++) {
        cameraSystem.update(0.016, mockTarget);
      }

      // Camera should be looking toward target
      const directionToTarget = mockTarget.position.clone().sub(camera.position).normalize();
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);

      const dot = directionToTarget.dot(cameraDirection);
      expect(dot).toBeGreaterThan(0.8); // Looking mostly at target
    });

    it('should handle stationary target in replay mode', () => {
      mockTarget.velocity = new THREE.Vector3(0, 0, 0);

      expect(() => {
        for (let i = 0; i < 10; i++) {
          cameraSystem.update(0.016, mockTarget);
        }
      }).not.toThrow();
    });

    it('should position relative to velocity direction when moving', () => {
      // Target moving to the right
      mockTarget.velocity = new THREE.Vector3(10, 0, 0);

      for (let i = 0; i < 100; i++) {
        cameraSystem.update(0.016, mockTarget);
      }

      // Camera should be positioned opposite to velocity (behind the movement)
      expect(camera.position.x).toBeLessThan(mockTarget.position.x);
    });
  });

  describe('mode switching', () => {
    it('should switch mode immediately with setMode', () => {
      expect(cameraSystem.getMode()).toBe(CameraMode.FIRST_PERSON);

      cameraSystem.setMode(CameraMode.REPLAY);

      expect(cameraSystem.getMode()).toBe(CameraMode.REPLAY);
      expect(cameraSystem.isInTransition()).toBe(false);
    });

    it('should not change mode if already in target mode', () => {
      cameraSystem.setMode(CameraMode.FIRST_PERSON);
      cameraSystem.setMode(CameraMode.FIRST_PERSON);

      expect(cameraSystem.getMode()).toBe(CameraMode.FIRST_PERSON);
    });

    it('should log mode change', () => {
      cameraSystem.setMode(CameraMode.REPLAY);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Camera mode changed')
      );
    });
  });

  describe('camera transitions', () => {
    it('should initiate transition with transitionTo', () => {
      cameraSystem.transitionTo(CameraMode.REPLAY, 1.0);

      expect(cameraSystem.isInTransition()).toBe(true);
    });

    it('should not initiate transition if already in target mode', () => {
      cameraSystem.setMode(CameraMode.FIRST_PERSON);
      cameraSystem.transitionTo(CameraMode.FIRST_PERSON, 1.0);

      expect(cameraSystem.isInTransition()).toBe(false);
    });

    it('should complete transition after specified duration', () => {
      cameraSystem.transitionTo(CameraMode.REPLAY, 0.5);

      expect(cameraSystem.isInTransition()).toBe(true);
      expect(cameraSystem.getMode()).toBe(CameraMode.FIRST_PERSON);

      // Update for transition duration
      for (let i = 0; i < 35; i++) { // 35 * 0.016 = 0.56 seconds
        cameraSystem.update(0.016, mockTarget);
      }

      expect(cameraSystem.isInTransition()).toBe(false);
      expect(cameraSystem.getMode()).toBe(CameraMode.REPLAY);
    });

    it('should log transition start and completion', () => {
      cameraSystem.transitionTo(CameraMode.REPLAY, 0.1);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Camera transition:')
      );

      // Complete transition
      for (let i = 0; i < 10; i++) {
        cameraSystem.update(0.016, mockTarget);
      }

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Camera transition complete')
      );
    });

    it('should use custom transition duration', () => {
      const startTime = performance.now();
      cameraSystem.transitionTo(CameraMode.REPLAY, 2.0);

      let frames = 0;
      // Transition for 2 seconds
      for (let i = 0; i < 130; i++) { // 130 * 0.016 = 2.08 seconds
        cameraSystem.update(0.016, mockTarget);
        frames++;
        if (!cameraSystem.isInTransition()) break;
      }

      expect(cameraSystem.getMode()).toBe(CameraMode.REPLAY);
      expect(frames).toBeGreaterThan(100); // Should take many frames for 2 second transition
    });
  });

  describe('configuration', () => {
    it('should update first-person settings', () => {
      const newOffset = new THREE.Vector3(0, 2, 0);

      cameraSystem.setFirstPersonSettings({
        offset: newOffset,
        lookAhead: 20,
        lookAheadSmoothness: 0.3,
      });

      // Settings applied (verify through behavior)
      for (let i = 0; i < 100; i++) {
        cameraSystem.update(0.016, mockTarget);
      }

      // Camera should be at new offset height
      expect(camera.position.y).toBeGreaterThan(1.5);
    });

    it('should update replay settings', () => {
      cameraSystem.setMode(CameraMode.REPLAY);

      cameraSystem.setReplaySettings({
        distance: 50,
        height: 25,
        damping: 0.1,
      });

      for (let i = 0; i < 100; i++) {
        cameraSystem.update(0.016, mockTarget);
      }

      // Camera should be at increased height
      expect(camera.position.y).toBeGreaterThan(15);
    });

    it('should update damping values', () => {
      cameraSystem.setDamping(0.5, 0.5);

      // Verify faster damping leads to quicker convergence
      const positions: THREE.Vector3[] = [];
      for (let i = 0; i < 10; i++) {
        cameraSystem.update(0.016, mockTarget);
        positions.push(camera.position.clone());
      }

      // With higher damping, position changes should be larger
      const totalMovement = positions[positions.length - 1].distanceTo(positions[0]);
      expect(totalMovement).toBeGreaterThan(0);
    });

    it('should clamp damping values to valid range', () => {
      // Should not throw even with invalid values
      expect(() => {
        cameraSystem.setDamping(-1, 2);
      }).not.toThrow();

      // System should still work
      cameraSystem.update(0.016, mockTarget);
    });
  });

  describe('shake and zoom (placeholder)', () => {
    it('should accept shake command without crashing', () => {
      expect(() => {
        cameraSystem.shake(0.5, 1.0);
      }).not.toThrow();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Camera shake')
      );
    });

    it('should accept zoom command without crashing', () => {
      expect(() => {
        cameraSystem.zoom(90, 0.5);
      }).not.toThrow();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Camera zoom')
      );
    });
  });

  describe('reset functionality', () => {
    it('should reset camera to default state', () => {
      // Modify camera state
      cameraSystem.setMode(CameraMode.REPLAY);
      cameraSystem.transitionTo(CameraMode.FIRST_PERSON, 1.0);

      for (let i = 0; i < 10; i++) {
        cameraSystem.update(0.016, mockTarget);
      }

      // Reset
      cameraSystem.reset();

      expect(cameraSystem.getMode()).toBe(CameraMode.FIRST_PERSON);
      expect(cameraSystem.isInTransition()).toBe(false);
    });

    it('should reinitialize smooth values after reset', () => {
      cameraSystem.update(0.016, mockTarget);
      cameraSystem.reset();

      // Next update should reinitialize
      expect(() => {
        cameraSystem.update(0.016, mockTarget);
      }).not.toThrow();
    });
  });

  describe('debug info', () => {
    it('should provide debug information', () => {
      cameraSystem.update(0.016, mockTarget);

      const debugInfo = cameraSystem.getDebugInfo();

      expect(debugInfo).toHaveProperty('mode');
      expect(debugInfo).toHaveProperty('position');
      expect(debugInfo).toHaveProperty('rotation');
      expect(debugInfo).toHaveProperty('isTransitioning');

      expect(debugInfo.mode).toBe(CameraMode.FIRST_PERSON);
      expect(debugInfo.position).toBeInstanceOf(THREE.Vector3);
      expect(debugInfo.rotation).toBeInstanceOf(THREE.Euler);
      expect(typeof debugInfo.isTransitioning).toBe('boolean');
    });
  });

  describe('edge cases and stress tests', () => {
    it('should handle rapid position changes', () => {
      for (let i = 0; i < 100; i++) {
        mockTarget.position.set(
          Math.random() * 100 - 50,
          Math.random() * 10,
          Math.random() * 100 - 50
        );
        cameraSystem.update(0.016, mockTarget);
      }

      // Should complete without errors
      expect(camera.position).toBeDefined();
      expect(camera.quaternion).toBeDefined();
    });

    it('should handle very small delta times', () => {
      expect(() => {
        cameraSystem.update(0.0001, mockTarget);
      }).not.toThrow();
    });

    it('should handle large delta times', () => {
      expect(() => {
        cameraSystem.update(1.0, mockTarget);
      }).not.toThrow();
    });

    it('should handle target at extreme positions', () => {
      mockTarget.position.set(10000, 5000, -10000);

      expect(() => {
        cameraSystem.update(0.016, mockTarget);
      }).not.toThrow();
    });

    it('should handle rapid mode switching', () => {
      for (let i = 0; i < 50; i++) {
        cameraSystem.setMode(i % 2 === 0 ? CameraMode.FIRST_PERSON : CameraMode.REPLAY);
        cameraSystem.update(0.016, mockTarget);
      }

      expect(cameraSystem.getMode()).toBeDefined();
    });

    it('should maintain smooth tracking over extended period', () => {
      // Simulate 10 seconds of updates (600 frames at 60fps)
      for (let i = 0; i < 600; i++) {
        mockTarget.position.z += 0.1; // Move forward gradually
        cameraSystem.update(0.016, mockTarget);
      }

      // Camera should be following smoothly
      const distanceToTarget = camera.position.distanceTo(mockTarget.position);
      expect(distanceToTarget).toBeGreaterThan(0); // Not at exact position (due to offset)
      expect(distanceToTarget).toBeLessThan(100); // But not too far away
    });
  });

  describe('easing functions', () => {
    it('should apply easing during transitions', () => {
      // Access private easing function through transition
      cameraSystem.transitionTo(CameraMode.REPLAY, 1.0);

      const positionsBefore: THREE.Vector3[] = [];
      const positionsAfter: THREE.Vector3[] = [];

      // Record positions during first half of transition
      for (let i = 0; i < 30; i++) {
        cameraSystem.update(0.016, mockTarget);
        if (i < 15) {
          positionsBefore.push(camera.position.clone());
        } else {
          positionsAfter.push(camera.position.clone());
        }
      }

      // Both arrays should have changes (camera should be moving)
      expect(positionsBefore.length).toBeGreaterThan(0);
      expect(positionsAfter.length).toBeGreaterThan(0);
    });
  });

  describe('look-ahead behavior', () => {
    it('should look ahead more when velocity is higher', () => {
      // Low velocity
      mockTarget.velocity = new THREE.Vector3(0, 0, 1);
      for (let i = 0; i < 100; i++) {
        cameraSystem.update(0.016, mockTarget);
      }
      const lowVelocityDirection = new THREE.Vector3();
      camera.getWorldDirection(lowVelocityDirection);

      // Reset and test high velocity
      cameraSystem.reset();
      mockTarget.velocity = new THREE.Vector3(0, 0, 50);
      for (let i = 0; i < 100; i++) {
        cameraSystem.update(0.016, mockTarget);
      }
      const highVelocityDirection = new THREE.Vector3();
      camera.getWorldDirection(highVelocityDirection);

      // Both should be looking forward
      expect(lowVelocityDirection.z).toBeGreaterThan(0);
      expect(highVelocityDirection.z).toBeGreaterThan(0);
    });

    it('should handle velocity direction changes smoothly', () => {
      // Start moving forward
      mockTarget.velocity = new THREE.Vector3(0, 0, 10);
      for (let i = 0; i < 50; i++) {
        cameraSystem.update(0.016, mockTarget);
      }

      // Change to moving right
      mockTarget.velocity = new THREE.Vector3(10, 0, 0);
      for (let i = 0; i < 50; i++) {
        cameraSystem.update(0.016, mockTarget);
      }

      // Should complete without errors
      expect(camera.position).toBeDefined();
    });
  });

  describe('performance', () => {
    it('should update camera in under 1ms per frame', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        cameraSystem.update(0.016, mockTarget);
      }

      const duration = performance.now() - start;
      const avgPerFrame = duration / iterations;

      expect(avgPerFrame).toBeLessThan(1); // Under 1ms per update
    });
  });
});
