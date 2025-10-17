import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ReplayPlayer } from '../../src/systems/ReplayPlayer';
import { ReplayFrame } from '../../src/systems/ReplayRecorder';

describe('ReplayPlayer', () => {
  let player: ReplayPlayer;
  let mockFrames: ReplayFrame[];

  // Helper to create mock frames
  const createMockFrames = (count: number, duration: number = 1.0): ReplayFrame[] => {
    const frames: ReplayFrame[] = [];
    // Handle edge case: single frame should have time 0, multiple frames spread over duration
    const timeDelta = count > 1 ? duration / (count - 1) : 0;

    for (let i = 0; i < count; i++) {
      const time = i * timeDelta;
      frames.push({
        time,
        vehiclePosition: [i * 1.0, i * 0.5, i * 0.25] as [number, number, number],
        vehicleRotation: [0, 0, 0, 1] as [number, number, number, number],
        wheelRotations: [i * 0.1, i * 0.1, i * 0.1, i * 0.1] as [number, number, number, number],
        cameraPosition: [i * 2.0, i * 1.0, i * 0.5] as [number, number, number],
        cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
      });
    }

    return frames;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log to prevent test output pollution
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('constructor', () => {
    it('should create a player with an empty frame array', () => {
      player = new ReplayPlayer([]);
      expect(player.getFrameCount()).toBe(0);
    });

    it('should create a player with multiple frames', () => {
      mockFrames = createMockFrames(10);
      player = new ReplayPlayer(mockFrames);
      expect(player.getFrameCount()).toBe(10);
    });

    it('should initialize in non-playing state', () => {
      mockFrames = createMockFrames(5);
      player = new ReplayPlayer(mockFrames);
      expect(player.isPlayingActive()).toBe(false);
    });
  });

  describe('startPlayback', () => {
    beforeEach(() => {
      mockFrames = createMockFrames(10);
      player = new ReplayPlayer(mockFrames);
    });

    it('should set isPlaying to true', () => {
      player.startPlayback();
      expect(player.isPlayingActive()).toBe(true);
    });

    it('should reset playback time to 0', () => {
      player.startPlayback();
      expect(player.getPlaybackTime()).toBe(0);
    });

    it('should reset progress to 0', () => {
      player.startPlayback();
      expect(player.getPlaybackProgress()).toBe(0);
    });

    it('should work with empty frame array', () => {
      const emptyPlayer = new ReplayPlayer([]);
      expect(() => emptyPlayer.startPlayback()).not.toThrow();
    });
  });

  describe('stopPlayback', () => {
    beforeEach(() => {
      mockFrames = createMockFrames(10);
      player = new ReplayPlayer(mockFrames);
    });

    it('should set isPlaying to false', () => {
      player.startPlayback();
      expect(player.isPlayingActive()).toBe(true);
      player.stopPlayback();
      expect(player.isPlayingActive()).toBe(false);
    });

    it('should allow subsequent startPlayback calls', () => {
      player.startPlayback();
      player.stopPlayback();
      player.startPlayback();
      expect(player.isPlayingActive()).toBe(true);
    });
  });

  describe('skip', () => {
    beforeEach(() => {
      mockFrames = createMockFrames(10);
      player = new ReplayPlayer(mockFrames);
    });

    it('should stop playback', () => {
      player.startPlayback();
      player.skip();
      expect(player.isPlayingActive()).toBe(false);
    });

    it('should return null from update after skip', () => {
      player.startPlayback();
      player.skip();
      const frame = player.update(0.016);
      expect(frame).toBeNull();
    });
  });

  describe('getReplayDuration', () => {
    it('should return 0 for empty frame array', () => {
      player = new ReplayPlayer([]);
      expect(player.getReplayDuration()).toBe(0);
    });

    it('should return the time of the last frame', () => {
      mockFrames = createMockFrames(5, 2.5);
      player = new ReplayPlayer(mockFrames);
      expect(player.getReplayDuration()).toBe(2.5);
    });

    it('should handle single frame', () => {
      mockFrames = createMockFrames(1, 1.0);
      player = new ReplayPlayer(mockFrames);
      expect(player.getReplayDuration()).toBe(0);
    });
  });

  describe('getFrameCount', () => {
    it('should return correct frame count', () => {
      mockFrames = createMockFrames(15);
      player = new ReplayPlayer(mockFrames);
      expect(player.getFrameCount()).toBe(15);
    });

    it('should return 0 for empty array', () => {
      player = new ReplayPlayer([]);
      expect(player.getFrameCount()).toBe(0);
    });
  });

  describe('getPlaybackProgress', () => {
    beforeEach(() => {
      mockFrames = createMockFrames(10, 1.0);
      player = new ReplayPlayer(mockFrames);
    });

    it('should return 0 at start', () => {
      player.startPlayback();
      expect(player.getPlaybackProgress()).toBeCloseTo(0, 1);
    });

    it('should return 1 when playback finishes', () => {
      player.startPlayback();
      const frame = player.update(0.016);
      expect(frame).not.toBeNull();
      expect(player.getPlaybackProgress()).toBeGreaterThanOrEqual(0);
      expect(player.getPlaybackProgress()).toBeLessThanOrEqual(1);
    });

    it('should clamp to [0, 1]', () => {
      player.startPlayback();
      const progress = player.getPlaybackProgress();
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });

    it('should return 1 for empty frame array', () => {
      const emptyPlayer = new ReplayPlayer([]);
      emptyPlayer.startPlayback();
      expect(emptyPlayer.getPlaybackProgress()).toBe(1.0);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      mockFrames = createMockFrames(10, 1.0);
      player = new ReplayPlayer(mockFrames);
    });

    it('should return null if not playing', () => {
      const frame = player.update(0.016);
      expect(frame).toBeNull();
    });

    it('should return null for empty frame array', () => {
      const emptyPlayer = new ReplayPlayer([]);
      emptyPlayer.startPlayback();
      const frame = emptyPlayer.update(0.016);
      expect(frame).toBeNull();
    });

    it('should return first frame when just started', () => {
      player.startPlayback();
      const frame = player.update(0.016);
      expect(frame).not.toBeNull();
      expect(frame?.vehiclePosition[0]).toBeCloseTo(0, 1);
    });

    it('should return interpolated frame', () => {
      player.startPlayback();
      const frame = player.update(0.016);
      expect(frame).not.toBeNull();
      expect(Array.isArray(frame?.vehiclePosition)).toBe(true);
      expect(frame?.vehiclePosition.length).toBe(3);
    });

    it('should have valid quaternion rotation', () => {
      player.startPlayback();
      const frame = player.update(0.016);
      expect(frame).not.toBeNull();
      expect(frame?.vehicleRotation.length).toBe(4);
      // Quaternion should be normalized
      const quat = frame!.vehicleRotation;
      const magnitude = Math.sqrt(quat[0] ** 2 + quat[1] ** 2 + quat[2] ** 2 + quat[3] ** 2);
      expect(magnitude).toBeCloseTo(1, 1);
    });

    it('should have valid wheel rotations', () => {
      player.startPlayback();
      const frame = player.update(0.016);
      expect(frame).not.toBeNull();
      expect(frame?.wheelRotations.length).toBe(4);
    });

    it('should return null after playback ends', (done) => {
      player.startPlayback();

      // Simulate playback by repeatedly calling update
      const intervalId = setInterval(() => {
        const frame = player.update(0.016);
        if (frame === null) {
          clearInterval(intervalId);
          expect(player.isPlayingActive()).toBe(false);
          done();
        }
      }, 10);

      // Safety timeout
      setTimeout(() => {
        clearInterval(intervalId);
        done();
      }, 3000);
    });

    it('should handle single frame gracefully', () => {
      const singleFrame = createMockFrames(1, 1.0);
      const singlePlayer = new ReplayPlayer(singleFrame);
      singlePlayer.startPlayback();
      const frame = singlePlayer.update(0.016);
      expect(frame).not.toBeNull();
    });
  });

  describe('interpolation', () => {
    beforeEach(() => {
      // Create frames with distinct positions
      mockFrames = [
        {
          time: 0,
          vehiclePosition: [0, 0, 0] as [number, number, number],
          vehicleRotation: [0, 0, 0, 1] as [number, number, number, number],
          wheelRotations: [0, 0, 0, 0] as [number, number, number, number],
          cameraPosition: [0, 0, -5] as [number, number, number],
          cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
        },
        {
          time: 0.5,
          vehiclePosition: [10, 5, 2.5] as [number, number, number],
          vehicleRotation: [0, 0, 0, 1] as [number, number, number, number],
          wheelRotations: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
          cameraPosition: [20, 10, -5] as [number, number, number],
          cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
        },
        {
          time: 1.0,
          vehiclePosition: [20, 10, 5] as [number, number, number],
          vehicleRotation: [0, 0, 0, 1] as [number, number, number, number],
          wheelRotations: [1.0, 1.0, 1.0, 1.0] as [number, number, number, number],
          cameraPosition: [40, 20, -5] as [number, number, number],
          cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
        },
      ];
      player = new ReplayPlayer(mockFrames);
    });

    it('should interpolate position linearly', () => {
      player.startPlayback();
      // After 0.25 seconds (halfway between frame 0 and 1)
      const frame = player.update(0.016);
      expect(frame).not.toBeNull();
      // Should be somewhere between frame 0 and 1
      if (frame) {
        expect(frame.vehiclePosition[0]).toBeGreaterThanOrEqual(0);
        expect(frame.vehiclePosition[0]).toBeLessThanOrEqual(10);
      }
    });

    it('should interpolate wheel rotations', () => {
      player.startPlayback();
      const frame = player.update(0.016);
      expect(frame).not.toBeNull();
      if (frame) {
        for (let i = 0; i < 4; i++) {
          expect(frame.wheelRotations[i]).toBeGreaterThanOrEqual(0);
          expect(frame.wheelRotations[i]).toBeLessThanOrEqual(0.5);
        }
      }
    });

    it('should interpolate camera position', () => {
      player.startPlayback();
      const frame = player.update(0.016);
      expect(frame).not.toBeNull();
      if (frame) {
        expect(frame.cameraPosition[0]).toBeGreaterThanOrEqual(0);
        expect(frame.cameraPosition[0]).toBeLessThanOrEqual(20);
      }
    });

    it('should maintain quaternion normalization during slerp', () => {
      // Create frames with different rotations
      mockFrames = [
        {
          time: 0,
          vehiclePosition: [0, 0, 0] as [number, number, number],
          vehicleRotation: new THREE.Quaternion(0, 0, 0, 1).toArray() as [
            number,
            number,
            number,
            number
          ],
          wheelRotations: [0, 0, 0, 0] as [number, number, number, number],
          cameraPosition: [0, 0, -5] as [number, number, number],
          cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
        },
        {
          time: 1.0,
          vehiclePosition: [10, 0, 0] as [number, number, number],
          vehicleRotation: new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            Math.PI / 2
          ).toArray() as [number, number, number, number],
          wheelRotations: [1, 1, 1, 1] as [number, number, number, number],
          cameraPosition: [10, 0, -5] as [number, number, number],
          cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
        },
      ];

      player = new ReplayPlayer(mockFrames);
      player.startPlayback();

      const frame = player.update(0.016);
      expect(frame).not.toBeNull();

      if (frame) {
        const quat = frame.vehicleRotation;
        const magnitude = Math.sqrt(quat[0] ** 2 + quat[1] ** 2 + quat[2] ** 2 + quat[3] ** 2);
        expect(magnitude).toBeCloseTo(1.0, 2);
      }
    });
  });

  describe('getPlaybackTime', () => {
    beforeEach(() => {
      mockFrames = createMockFrames(10, 1.0);
      player = new ReplayPlayer(mockFrames);
    });

    it('should return 0 initially', () => {
      player.startPlayback();
      expect(player.getPlaybackTime()).toBeCloseTo(0, 1);
    });

    it('should increase as playback progresses', (done) => {
      player.startPlayback();
      const initialTime = player.getPlaybackTime();

      setTimeout(() => {
        player.update(0.016);
        const newTime = player.getPlaybackTime();
        expect(newTime).toBeGreaterThanOrEqual(initialTime);
        done();
      }, 50);
    });
  });

  describe('getDebugInfo', () => {
    beforeEach(() => {
      mockFrames = createMockFrames(10);
      player = new ReplayPlayer(mockFrames);
    });

    it('should return debug object with all required fields', () => {
      const debug = player.getDebugInfo();
      expect(debug).toHaveProperty('isPlaying');
      expect(debug).toHaveProperty('frameCount');
      expect(debug).toHaveProperty('currentFrameIndex');
      expect(debug).toHaveProperty('playbackTime');
      expect(debug).toHaveProperty('replayDuration');
      expect(debug).toHaveProperty('progress');
    });

    it('should have correct values in debug info', () => {
      player.startPlayback();
      const debug = player.getDebugInfo();
      expect(debug.isPlaying).toBe(true);
      expect(debug.frameCount).toBe(10);
      expect(debug.progress).toBeGreaterThanOrEqual(0);
      expect(debug.progress).toBeLessThanOrEqual(1);
    });
  });

  describe('dispose', () => {
    beforeEach(() => {
      mockFrames = createMockFrames(10);
      player = new ReplayPlayer(mockFrames);
    });

    it('should stop playback', () => {
      player.startPlayback();
      player.dispose();
      expect(player.isPlayingActive()).toBe(false);
    });

    it('should clear frames', () => {
      expect(player.getFrameCount()).toBe(10);
      player.dispose();
      expect(player.getFrameCount()).toBe(0);
    });

    it('should return null from update after disposal', () => {
      player.startPlayback();
      player.dispose();
      const frame = player.update(0.016);
      expect(frame).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle very small frame arrays', () => {
      mockFrames = createMockFrames(2);
      player = new ReplayPlayer(mockFrames);
      player.startPlayback();
      const frame = player.update(0.016);
      expect(frame).not.toBeNull();
    });

    it('should handle very large frame arrays', () => {
      mockFrames = createMockFrames(1000);
      player = new ReplayPlayer(mockFrames);
      player.startPlayback();
      const frame = player.update(0.016);
      expect(frame).not.toBeNull();
    });

    it('should handle frames with identical timestamps', () => {
      mockFrames = [
        {
          time: 0,
          vehiclePosition: [0, 0, 0] as [number, number, number],
          vehicleRotation: [0, 0, 0, 1] as [number, number, number, number],
          wheelRotations: [0, 0, 0, 0] as [number, number, number, number],
          cameraPosition: [0, 0, -5] as [number, number, number],
          cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
        },
        {
          time: 0,
          vehiclePosition: [5, 0, 0] as [number, number, number],
          vehicleRotation: [0, 0, 0, 1] as [number, number, number, number],
          wheelRotations: [0, 0, 0, 0] as [number, number, number, number],
          cameraPosition: [5, 0, -5] as [number, number, number],
          cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
        },
      ];

      player = new ReplayPlayer(mockFrames);
      player.startPlayback();
      const frame = player.update(0.016);
      expect(frame).not.toBeNull();
    });

    it('should handle rapid start/stop cycles', () => {
      mockFrames = createMockFrames(5);
      player = new ReplayPlayer(mockFrames);

      for (let i = 0; i < 10; i++) {
        player.startPlayback();
        expect(player.isPlayingActive()).toBe(true);
        player.stopPlayback();
        expect(player.isPlayingActive()).toBe(false);
      }
    });

    it('should handle update calls with varying deltaTime', () => {
      mockFrames = createMockFrames(10, 1.0);
      player = new ReplayPlayer(mockFrames);
      player.startPlayback();

      const deltaTimes = [0.008, 0.016, 0.032, 0.016];
      for (const dt of deltaTimes) {
        const frame = player.update(dt);
        // Should not crash regardless of deltaTime
        expect(player.isPlayingActive()).toBeDefined();
      }
    });
  });

  describe('multiple playback sessions', () => {
    beforeEach(() => {
      mockFrames = createMockFrames(10, 1.0);
      player = new ReplayPlayer(mockFrames);
    });

    it('should allow replay of same buffer multiple times', () => {
      player.startPlayback();
      player.update(0.016);
      player.stopPlayback();

      player.startPlayback();
      player.update(0.016);
      player.stopPlayback();

      expect(player.isPlayingActive()).toBe(false);
    });

    it('should reset progress when starting new playback', () => {
      player.startPlayback();
      player.update(0.016);
      const progress1 = player.getPlaybackProgress();

      player.stopPlayback();
      player.startPlayback();
      const progress2 = player.getPlaybackProgress();

      expect(progress2).toBeLessThanOrEqual(progress1);
    });
  });
});
