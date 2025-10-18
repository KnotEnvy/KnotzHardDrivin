import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LeaderboardSystem,
  LeaderboardEntry,
} from '../../src/systems/LeaderboardSystem';

describe('LeaderboardSystem', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset singleton instance
    LeaderboardSystem.resetInstance();
  });

  afterEach(() => {
    // Cleanup after each test
    localStorage.clear();
    LeaderboardSystem.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = LeaderboardSystem.getInstance();
      const instance2 = LeaderboardSystem.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after resetInstance', () => {
      const instance1 = LeaderboardSystem.getInstance();
      LeaderboardSystem.resetInstance();
      const instance2 = LeaderboardSystem.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('submitTime', () => {
    it('should add entry when leaderboard is empty', () => {
      const board = LeaderboardSystem.getInstance();
      const result = board.submitTime('Alice', 45000);

      expect(result).toBe(true);
      expect(board.getEntryCount()).toBe(1);
    });

    it('should add multiple entries up to max (10)', () => {
      const board = LeaderboardSystem.getInstance();

      for (let i = 0; i < 10; i++) {
        const result = board.submitTime(`Player${i}`, 50000 + i * 1000);
        expect(result).toBe(true);
      }

      expect(board.getEntryCount()).toBe(10);
    });

    it('should reject 11th entry if slower than 10th', () => {
      const board = LeaderboardSystem.getInstance();

      // Add 10 entries with ascending times
      for (let i = 0; i < 10; i++) {
        board.submitTime(`Player${i}`, 40000 + i * 1000);
      }

      // Try to add 11th entry that's slower than 10th
      const result = board.submitTime('Player10', 60000);
      expect(result).toBe(false);
      expect(board.getEntryCount()).toBe(10);
    });

    it('should accept 11th entry if faster than 10th', () => {
      const board = LeaderboardSystem.getInstance();

      // Add 10 entries with ascending times
      for (let i = 0; i < 10; i++) {
        board.submitTime(`Player${i}`, 40000 + i * 1000);
      }

      // Add faster entry
      const result = board.submitTime('FastPlayer', 35000);
      expect(result).toBe(true);
      expect(board.getEntryCount()).toBe(10);
    });

    it('should sort entries by lap time (ascending)', () => {
      const board = LeaderboardSystem.getInstance();

      // Add entries in random order
      board.submitTime('Slow', 60000);
      board.submitTime('Fast', 40000);
      board.submitTime('Medium', 50000);

      const leaderboard = board.getLeaderboard();
      expect(leaderboard[0].lapTime).toBe(40000); // Fast
      expect(leaderboard[1].lapTime).toBe(50000); // Medium
      expect(leaderboard[2].lapTime).toBe(60000); // Slow
    });

    it('should update ranks correctly', () => {
      const board = LeaderboardSystem.getInstance();

      board.submitTime('Slow', 60000);
      board.submitTime('Fast', 40000);
      board.submitTime('Medium', 50000);

      const leaderboard = board.getLeaderboard();
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[1].rank).toBe(2);
      expect(leaderboard[2].rank).toBe(3);
    });

    it('should trim player name to 20 characters', () => {
      const board = LeaderboardSystem.getInstance();
      const longName = 'ThisIsAVeryLongPlayerNameThatExceeds20Chars';

      board.submitTime(longName, 45000);

      const leaderboard = board.getLeaderboard();
      expect(leaderboard[0].playerName.length).toBeLessThanOrEqual(20);
    });

    it('should trim whitespace from player name', () => {
      const board = LeaderboardSystem.getInstance();
      board.submitTime('  Alice  ', 45000);

      const leaderboard = board.getLeaderboard();
      expect(leaderboard[0].playerName).toBe('Alice');
    });

    it('should reject entry with invalid player name', () => {
      const board = LeaderboardSystem.getInstance();
      const result = board.submitTime('', 45000);

      expect(result).toBe(false);
      expect(board.getEntryCount()).toBe(0);
    });

    it('should reject entry with invalid lap time', () => {
      const board = LeaderboardSystem.getInstance();
      const result = board.submitTime('Alice', -100);

      expect(result).toBe(false);
      expect(board.getEntryCount()).toBe(0);
    });

    it('should store ghost data when provided', () => {
      const board = LeaderboardSystem.getInstance();
      const ghostData = new Uint8Array([1, 2, 3, 4, 5]);

      board.submitTime('Alice', 45000, ghostData);

      const leaderboard = board.getLeaderboard();
      expect(leaderboard[0].ghostData).toBeDefined();
      expect(leaderboard[0].ghostData).toEqual(ghostData);
    });

    it('should store entry without ghost data', () => {
      const board = LeaderboardSystem.getInstance();
      board.submitTime('Alice', 45000);

      const leaderboard = board.getLeaderboard();
      expect(leaderboard[0].ghostData).toBeUndefined();
    });
  });

  describe('getLeaderboard', () => {
    it('should return empty array when no entries', () => {
      const board = LeaderboardSystem.getInstance();
      const leaderboard = board.getLeaderboard();

      expect(leaderboard).toEqual([]);
    });

    it('should return copy of entries (not reference)', () => {
      const board = LeaderboardSystem.getInstance();
      board.submitTime('Alice', 45000);

      const leaderboard1 = board.getLeaderboard();
      const leaderboard2 = board.getLeaderboard();

      expect(leaderboard1).toEqual(leaderboard2);
      expect(leaderboard1).not.toBe(leaderboard2);
    });

    it('should not allow modification of returned array', () => {
      const board = LeaderboardSystem.getInstance();
      board.submitTime('Alice', 45000);

      const leaderboard = board.getLeaderboard();
      leaderboard.pop();

      const leaderboard2 = board.getLeaderboard();
      expect(leaderboard2.length).toBe(1);
    });

    it('should create new Date instances in returned entries', () => {
      const board = LeaderboardSystem.getInstance();
      board.submitTime('Alice', 45000);

      const leaderboard1 = board.getLeaderboard();
      const leaderboard2 = board.getLeaderboard();

      expect(leaderboard1[0].timestamp).toEqual(leaderboard2[0].timestamp);
      expect(leaderboard1[0].timestamp).not.toBe(leaderboard2[0].timestamp);
    });
  });

  describe('getGhostData', () => {
    it('should return ghost data for valid rank', () => {
      const board = LeaderboardSystem.getInstance();
      const ghostData = new Uint8Array([1, 2, 3, 4, 5]);
      board.submitTime('Alice', 45000, ghostData);

      const retrieved = board.getGhostData(1);
      expect(retrieved).toEqual(ghostData);
    });

    it('should return null for rank without ghost data', () => {
      const board = LeaderboardSystem.getInstance();
      board.submitTime('Alice', 45000);

      const retrieved = board.getGhostData(1);
      expect(retrieved).toBeNull();
    });

    it('should return null for invalid rank (0)', () => {
      const board = LeaderboardSystem.getInstance();
      const retrieved = board.getGhostData(0);

      expect(retrieved).toBeNull();
    });

    it('should return null for invalid rank (> 10)', () => {
      const board = LeaderboardSystem.getInstance();
      const retrieved = board.getGhostData(11);

      expect(retrieved).toBeNull();
    });

    it('should return copy of ghost data', () => {
      const board = LeaderboardSystem.getInstance();
      const ghostData = new Uint8Array([1, 2, 3, 4, 5]);
      board.submitTime('Alice', 45000, ghostData);

      const retrieved1 = board.getGhostData(1);
      const retrieved2 = board.getGhostData(1);

      expect(retrieved1).toEqual(retrieved2);
      expect(retrieved1).not.toBe(retrieved2);
    });
  });

  describe('isTopTen', () => {
    it('should return true when leaderboard is empty', () => {
      const board = LeaderboardSystem.getInstance();
      expect(board.isTopTen(50000)).toBe(true);
    });

    it('should return true when leaderboard has less than 10 entries', () => {
      const board = LeaderboardSystem.getInstance();
      board.submitTime('Player1', 40000);
      board.submitTime('Player2', 50000);

      expect(board.isTopTen(60000)).toBe(true);
    });

    it('should return true when time is faster than 10th entry', () => {
      const board = LeaderboardSystem.getInstance();

      for (let i = 0; i < 10; i++) {
        board.submitTime(`Player${i}`, 40000 + i * 1000);
      }

      expect(board.isTopTen(35000)).toBe(true);
    });

    it('should return false when time is slower than 10th entry', () => {
      const board = LeaderboardSystem.getInstance();

      for (let i = 0; i < 10; i++) {
        board.submitTime(`Player${i}`, 40000 + i * 1000);
      }

      expect(board.isTopTen(65000)).toBe(false);
    });

    it('should return false when time equals 10th entry', () => {
      const board = LeaderboardSystem.getInstance();

      for (let i = 0; i < 10; i++) {
        board.submitTime(`Player${i}`, 40000 + i * 1000);
      }

      // 10th entry time is 49000, equal times don't qualify
      expect(board.isTopTen(49000)).toBe(false);
    });
  });

  describe('localStorage Persistence', () => {
    it('should save entries to localStorage', () => {
      const board = LeaderboardSystem.getInstance();
      board.submitTime('Alice', 45000);

      const stored = localStorage.getItem('harddriving_leaderboard');
      expect(stored).toBeDefined();
      expect(stored).toContain('Alice');
    });

    it('should load entries from localStorage on creation', () => {
      const board1 = LeaderboardSystem.getInstance();
      board1.submitTime('Alice', 45000);

      // Create new instance (simulating page reload)
      LeaderboardSystem.resetInstance();
      const board2 = LeaderboardSystem.getInstance();

      expect(board2.getEntryCount()).toBe(1);
      const entries = board2.getLeaderboard();
      expect(entries[0].playerName).toBe('Alice');
    });

    it('should persist multiple entries across sessions', () => {
      const board1 = LeaderboardSystem.getInstance();
      board1.submitTime('Alice', 40000);
      board1.submitTime('Bob', 50000);
      board1.submitTime('Charlie', 30000);

      // Simulate page reload
      LeaderboardSystem.resetInstance();
      const board2 = LeaderboardSystem.getInstance();

      expect(board2.getEntryCount()).toBe(3);
      const entries = board2.getLeaderboard();
      expect(entries[0].playerName).toBe('Charlie');
      expect(entries[1].playerName).toBe('Alice');
      expect(entries[2].playerName).toBe('Bob');
    });

    it('should serialize and deserialize dates correctly', () => {
      const board1 = LeaderboardSystem.getInstance();
      const before = new Date();
      board1.submitTime('Alice', 45000);
      const after = new Date();

      LeaderboardSystem.resetInstance();
      const board2 = LeaderboardSystem.getInstance();

      const entries = board2.getLeaderboard();
      const timestamp = entries[0].timestamp;

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should serialize and deserialize ghost data correctly', () => {
      const board1 = LeaderboardSystem.getInstance();
      const ghostData = new Uint8Array([10, 20, 30, 40, 50]);
      board1.submitTime('Alice', 45000, ghostData);

      LeaderboardSystem.resetInstance();
      const board2 = LeaderboardSystem.getInstance();

      const ghost = board2.getGhostData(1);
      expect(ghost).toEqual(ghostData);
    });

    it('should handle corrupted JSON gracefully', () => {
      localStorage.setItem('harddriving_leaderboard', 'invalid json {');

      const board = LeaderboardSystem.getInstance();
      expect(board.getEntryCount()).toBe(0);
    });

    it('should handle missing data gracefully', () => {
      localStorage.removeItem('harddriving_leaderboard');

      const board = LeaderboardSystem.getInstance();
      expect(board.getEntryCount()).toBe(0);
    });

    it('should re-sort entries after loading', () => {
      const board1 = LeaderboardSystem.getInstance();
      board1.submitTime('Slow', 50000);
      board1.submitTime('Fast', 40000);

      LeaderboardSystem.resetInstance();
      const board2 = LeaderboardSystem.getInstance();

      const entries = board2.getLeaderboard();
      expect(entries[0].lapTime).toBe(40000);
      expect(entries[1].lapTime).toBe(50000);
    });

    it('should recalculate ranks after loading', () => {
      const board1 = LeaderboardSystem.getInstance();
      board1.submitTime('Slow', 50000);
      board1.submitTime('Fast', 40000);

      LeaderboardSystem.resetInstance();
      const board2 = LeaderboardSystem.getInstance();

      const entries = board2.getLeaderboard();
      expect(entries[0].rank).toBe(1);
      expect(entries[1].rank).toBe(2);
    });
  });

  describe('clearLeaderboard', () => {
    it('should clear all entries', () => {
      const board = LeaderboardSystem.getInstance();
      board.submitTime('Alice', 45000);
      board.submitTime('Bob', 50000);

      board.clearLeaderboard();

      expect(board.getEntryCount()).toBe(0);
      expect(board.getLeaderboard()).toEqual([]);
    });

    it('should persist clear to localStorage', () => {
      const board1 = LeaderboardSystem.getInstance();
      board1.submitTime('Alice', 45000);
      board1.clearLeaderboard();

      LeaderboardSystem.resetInstance();
      const board2 = LeaderboardSystem.getInstance();

      expect(board2.getEntryCount()).toBe(0);
    });
  });

  describe('getEntryCount', () => {
    it('should return correct count', () => {
      const board = LeaderboardSystem.getInstance();

      expect(board.getEntryCount()).toBe(0);

      board.submitTime('Alice', 45000);
      expect(board.getEntryCount()).toBe(1);

      board.submitTime('Bob', 50000);
      expect(board.getEntryCount()).toBe(2);
    });

    it('should not exceed max entries', () => {
      const board = LeaderboardSystem.getInstance();

      for (let i = 0; i < 15; i++) {
        board.submitTime(`Player${i}`, 40000 + i * 100);
      }

      expect(board.getEntryCount()).toBeLessThanOrEqual(10);
    });
  });

  describe('getTimeAtRank', () => {
    it('should return time for valid rank', () => {
      const board = LeaderboardSystem.getInstance();
      board.submitTime('Alice', 45000);
      board.submitTime('Bob', 50000);

      expect(board.getTimeAtRank(1)).toBe(45000);
      expect(board.getTimeAtRank(2)).toBe(50000);
    });

    it('should return Infinity for invalid rank', () => {
      const board = LeaderboardSystem.getInstance();
      board.submitTime('Alice', 45000);

      expect(board.getTimeAtRank(0)).toBe(Infinity);
      expect(board.getTimeAtRank(11)).toBe(Infinity);
      expect(board.getTimeAtRank(2)).toBe(Infinity);
    });
  });

  describe('dispose', () => {
    it('should clear entries on dispose', () => {
      const board = LeaderboardSystem.getInstance();
      board.submitTime('Alice', 45000);

      board.dispose();

      expect(board.getEntryCount()).toBe(0);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle very fast lap times', () => {
      const board = LeaderboardSystem.getInstance();
      board.submitTime('SuperFast', 1000); // 1 second

      const entries = board.getLeaderboard();
      expect(entries[0].lapTime).toBe(1000);
    });

    it('should handle very slow lap times', () => {
      const board = LeaderboardSystem.getInstance();
      board.submitTime('SuperSlow', 600000); // 10 minutes

      const entries = board.getLeaderboard();
      expect(entries[0].lapTime).toBe(600000);
    });

    it('should handle duplicate names', () => {
      const board = LeaderboardSystem.getInstance();
      board.submitTime('Alice', 40000);
      board.submitTime('Alice', 50000);

      expect(board.getEntryCount()).toBe(2);
    });

    it('should handle rapid successive submissions', () => {
      const board = LeaderboardSystem.getInstance();

      for (let i = 0; i < 20; i++) {
        board.submitTime(`Player${i}`, 40000 + i * 100);
      }

      expect(board.getEntryCount()).toBe(10);
      // Verify sorted order
      const entries = board.getLeaderboard();
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].lapTime).toBeGreaterThanOrEqual(
          entries[i - 1].lapTime
        );
      }
    });

    it('should handle large ghost data', () => {
      const board = LeaderboardSystem.getInstance();
      const largeGhost = new Uint8Array(100000); // 100KB
      largeGhost[0] = 1;
      largeGhost[99999] = 255;

      board.submitTime('Alice', 45000, largeGhost);

      const retrieved = board.getGhostData(1);
      expect(retrieved).toBeDefined();
      expect(retrieved![0]).toBe(1);
      expect(retrieved![99999]).toBe(255);
    });
  });
});
