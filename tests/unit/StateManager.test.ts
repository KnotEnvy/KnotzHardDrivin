/**
 * Unit tests for StateManager
 * Target: 100% coverage
 *
 * Tests cover:
 * - Valid state transitions
 * - Invalid state transitions
 * - Same-state transitions (no-op)
 * - getValidTransitions()
 * - getStateDescription()
 * - validateStateMachine()
 * - State machine diagram generation
 * - State machine logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '@/core/StateManager';
import { GameState } from '@/core/GameEngine';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
    vi.clearAllMocks();
  });

  describe('canTransition', () => {
    describe('valid transitions', () => {
      it('should allow LOADING -> MENU', () => {
        const result = stateManager.canTransition(GameState.LOADING, GameState.MENU);
        expect(result).toBe(true);
      });

      it('should allow MENU -> PLAYING', () => {
        const result = stateManager.canTransition(GameState.MENU, GameState.PLAYING);
        expect(result).toBe(true);
      });

      it('should allow PLAYING -> PAUSED', () => {
        const result = stateManager.canTransition(GameState.PLAYING, GameState.PAUSED);
        expect(result).toBe(true);
      });

      it('should allow PLAYING -> CRASHED', () => {
        const result = stateManager.canTransition(GameState.PLAYING, GameState.CRASHED);
        expect(result).toBe(true);
      });

      it('should allow PLAYING -> RESULTS', () => {
        const result = stateManager.canTransition(GameState.PLAYING, GameState.RESULTS);
        expect(result).toBe(true);
      });

      it('should allow PAUSED -> PLAYING', () => {
        const result = stateManager.canTransition(GameState.PAUSED, GameState.PLAYING);
        expect(result).toBe(true);
      });

      it('should allow PAUSED -> MENU', () => {
        const result = stateManager.canTransition(GameState.PAUSED, GameState.MENU);
        expect(result).toBe(true);
      });

      it('should allow CRASHED -> REPLAY', () => {
        const result = stateManager.canTransition(GameState.CRASHED, GameState.REPLAY);
        expect(result).toBe(true);
      });

      it('should allow REPLAY -> PLAYING', () => {
        const result = stateManager.canTransition(GameState.REPLAY, GameState.PLAYING);
        expect(result).toBe(true);
      });

      it('should allow RESULTS -> MENU', () => {
        const result = stateManager.canTransition(GameState.RESULTS, GameState.MENU);
        expect(result).toBe(true);
      });

      it('should allow RESULTS -> PLAYING (retry)', () => {
        const result = stateManager.canTransition(GameState.RESULTS, GameState.PLAYING);
        expect(result).toBe(true);
      });
    });

    describe('invalid transitions', () => {
      it('should reject LOADING -> PLAYING (must go through MENU)', () => {
        const result = stateManager.canTransition(GameState.LOADING, GameState.PLAYING);
        expect(result).toBe(false);
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Invalid transition attempt: loading -> playing')
        );
      });

      it('should reject MENU -> PAUSED (must be playing first)', () => {
        const result = stateManager.canTransition(GameState.MENU, GameState.PAUSED);
        expect(result).toBe(false);
      });

      it('should reject CRASHED -> MENU (must go through REPLAY -> PLAYING)', () => {
        const result = stateManager.canTransition(GameState.CRASHED, GameState.MENU);
        expect(result).toBe(false);
      });

      it('should reject CRASHED -> PLAYING (must go through REPLAY first)', () => {
        const result = stateManager.canTransition(GameState.CRASHED, GameState.PLAYING);
        expect(result).toBe(false);
      });

      it('should allow REPLAY -> MENU (quit to main menu)', () => {
        const result = stateManager.canTransition(GameState.REPLAY, GameState.MENU);
        expect(result).toBe(true);
      });

      it('should reject PLAYING -> MENU (must pause or finish first)', () => {
        const result = stateManager.canTransition(GameState.PLAYING, GameState.MENU);
        expect(result).toBe(false);
      });

      it('should reject PAUSED -> CRASHED (only playing can crash)', () => {
        const result = stateManager.canTransition(GameState.PAUSED, GameState.CRASHED);
        expect(result).toBe(false);
      });

      it('should reject RESULTS -> CRASHED (race is over)', () => {
        const result = stateManager.canTransition(GameState.RESULTS, GameState.CRASHED);
        expect(result).toBe(false);
      });
    });

    describe('same-state transitions', () => {
      it('should allow LOADING -> LOADING (no-op)', () => {
        const result = stateManager.canTransition(GameState.LOADING, GameState.LOADING);
        expect(result).toBe(true);
      });

      it('should allow MENU -> MENU (no-op)', () => {
        const result = stateManager.canTransition(GameState.MENU, GameState.MENU);
        expect(result).toBe(true);
      });

      it('should allow PLAYING -> PLAYING (no-op)', () => {
        const result = stateManager.canTransition(GameState.PLAYING, GameState.PLAYING);
        expect(result).toBe(true);
      });

      it('should allow PAUSED -> PAUSED (no-op)', () => {
        const result = stateManager.canTransition(GameState.PAUSED, GameState.PAUSED);
        expect(result).toBe(true);
      });
    });
  });

  describe('getValidTransitions', () => {
    it('should return correct transitions for LOADING state', () => {
      const transitions = stateManager.getValidTransitions(GameState.LOADING);
      expect(transitions).toEqual([GameState.MENU]);
    });

    it('should return correct transitions for MENU state', () => {
      const transitions = stateManager.getValidTransitions(GameState.MENU);
      expect(transitions).toEqual([GameState.PLAYING]);
    });

    it('should return correct transitions for PLAYING state', () => {
      const transitions = stateManager.getValidTransitions(GameState.PLAYING);
      expect(transitions).toEqual([
        GameState.PAUSED,
        GameState.CRASHED,
        GameState.RESULTS,
      ]);
      expect(transitions).toHaveLength(3);
    });

    it('should return correct transitions for PAUSED state', () => {
      const transitions = stateManager.getValidTransitions(GameState.PAUSED);
      expect(transitions).toEqual([GameState.PLAYING, GameState.MENU]);
    });

    it('should return correct transitions for CRASHED state', () => {
      const transitions = stateManager.getValidTransitions(GameState.CRASHED);
      expect(transitions).toEqual([GameState.REPLAY]);
    });

    it('should return correct transitions for REPLAY state', () => {
      const transitions = stateManager.getValidTransitions(GameState.REPLAY);
      expect(transitions).toEqual([GameState.PLAYING, GameState.MENU]);
    });

    it('should return correct transitions for RESULTS state', () => {
      const transitions = stateManager.getValidTransitions(GameState.RESULTS);
      expect(transitions).toEqual([GameState.MENU, GameState.PLAYING]);
    });

    it('should return empty array for undefined state', () => {
      const transitions = stateManager.getValidTransitions('INVALID_STATE' as GameState);
      expect(transitions).toEqual([]);
    });
  });

  describe('getStateDescription', () => {
    it('should return correct description for LOADING state', () => {
      const description = stateManager.getStateDescription(GameState.LOADING);
      expect(description).toBe('Loading game assets and initializing systems');
    });

    it('should return correct description for MENU state', () => {
      const description = stateManager.getStateDescription(GameState.MENU);
      expect(description).toBe('Main menu - player can start race or adjust settings');
    });

    it('should return correct description for PLAYING state', () => {
      const description = stateManager.getStateDescription(GameState.PLAYING);
      expect(description).toBe('Active race - player is driving');
    });

    it('should return correct description for PAUSED state', () => {
      const description = stateManager.getStateDescription(GameState.PAUSED);
      expect(description).toBe('Race paused - awaiting player input to resume or quit');
    });

    it('should return correct description for CRASHED state', () => {
      const description = stateManager.getStateDescription(GameState.CRASHED);
      expect(description).toBe('Vehicle crashed - preparing replay');
    });

    it('should return correct description for REPLAY state', () => {
      const description = stateManager.getStateDescription(GameState.REPLAY);
      expect(description).toBe('Showing crash replay - player can skip or wait');
    });

    it('should return correct description for RESULTS state', () => {
      const description = stateManager.getStateDescription(GameState.RESULTS);
      expect(description).toBe('Race finished - displaying results and statistics');
    });

    it('should return "Unknown state" for invalid state', () => {
      const description = stateManager.getStateDescription('INVALID_STATE' as GameState);
      expect(description).toBe('Unknown state');
    });
  });

  describe('validateStateMachine', () => {
    it('should validate that all states have defined transitions', () => {
      const result = stateManager.validateStateMachine();
      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        'State machine validation passed. All states have defined transitions.'
      );
    });

    it('should detect missing state transitions', () => {
      // Create a state manager with incomplete transitions
      const incompleteStateManager = new StateManager();
      // Access private property for testing
      (incompleteStateManager as any).transitions = {
        [GameState.LOADING]: [GameState.MENU],
        // Missing other states
      };

      const result = incompleteStateManager.validateStateMachine();
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('State machine validation failed')
      );
    });
  });

  describe('getStateMachineDiagram', () => {
    it('should return a formatted state machine diagram', () => {
      const diagram = stateManager.getStateMachineDiagram();
      expect(diagram).toContain('State Machine Diagram');
      expect(diagram).toContain('LOADING');
      expect(diagram).toContain('MENU');
      expect(diagram).toContain('PLAYING');
      expect(typeof diagram).toBe('string');
      expect(diagram.length).toBeGreaterThan(0);
    });
  });

  describe('logStateMachine', () => {
    it('should log the complete state machine configuration', () => {
      stateManager.logStateMachine();

      // Verify console.log was called multiple times
      expect(console.log).toHaveBeenCalled();

      // Check for key log messages
      expect(console.log).toHaveBeenCalledWith('State Machine Configuration:');
      expect(console.log).toHaveBeenCalledWith('============================');

      // Verify state transitions are logged
      const logCalls = (console.log as any).mock.calls.map((call: any) => call[0]);
      expect(logCalls.some((msg: string) => msg && msg.includes('loading ->'))).toBe(true);
      expect(logCalls.some((msg: string) => msg && msg.includes('menu ->'))).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid state transition checks', () => {
      // Test performance with many rapid checks
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        stateManager.canTransition(GameState.PLAYING, GameState.PAUSED);
        stateManager.canTransition(GameState.PAUSED, GameState.PLAYING);
      }

      const duration = performance.now() - start;
      // Should complete 2000 checks in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should maintain consistency across multiple instances', () => {
      const sm1 = new StateManager();
      const sm2 = new StateManager();

      // Both instances should have identical behavior
      expect(sm1.canTransition(GameState.LOADING, GameState.MENU)).toBe(
        sm2.canTransition(GameState.LOADING, GameState.MENU)
      );
      expect(sm1.getValidTransitions(GameState.PLAYING)).toEqual(
        sm2.getValidTransitions(GameState.PLAYING)
      );
    });
  });

  describe('complete state flow scenarios', () => {
    it('should validate normal game flow: LOADING -> MENU -> PLAYING -> RESULTS -> MENU', () => {
      expect(stateManager.canTransition(GameState.LOADING, GameState.MENU)).toBe(true);
      expect(stateManager.canTransition(GameState.MENU, GameState.PLAYING)).toBe(true);
      expect(stateManager.canTransition(GameState.PLAYING, GameState.RESULTS)).toBe(true);
      expect(stateManager.canTransition(GameState.RESULTS, GameState.MENU)).toBe(true);
    });

    it('should validate crash flow: PLAYING -> CRASHED -> REPLAY -> PLAYING', () => {
      expect(stateManager.canTransition(GameState.PLAYING, GameState.CRASHED)).toBe(true);
      expect(stateManager.canTransition(GameState.CRASHED, GameState.REPLAY)).toBe(true);
      expect(stateManager.canTransition(GameState.REPLAY, GameState.PLAYING)).toBe(true);
    });

    it('should validate pause flow: PLAYING -> PAUSED -> PLAYING', () => {
      expect(stateManager.canTransition(GameState.PLAYING, GameState.PAUSED)).toBe(true);
      expect(stateManager.canTransition(GameState.PAUSED, GameState.PLAYING)).toBe(true);
    });

    it('should validate quit from pause: PLAYING -> PAUSED -> MENU', () => {
      expect(stateManager.canTransition(GameState.PLAYING, GameState.PAUSED)).toBe(true);
      expect(stateManager.canTransition(GameState.PAUSED, GameState.MENU)).toBe(true);
    });

    it('should validate retry from results: RESULTS -> PLAYING', () => {
      expect(stateManager.canTransition(GameState.RESULTS, GameState.PLAYING)).toBe(true);
    });
  });
});
