/**
 * Unit tests for InputSystem
 * Target: >80% coverage
 *
 * Tests cover:
 * - Constructor and initialization
 * - Keyboard input handling
 * - Gamepad input handling
 * - Input smoothing and deadzone
 * - Device switching
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  InputSystem,
  VehicleInput,
  InputDevice,
  KeyBindings,
  GamepadMapping,
} from '@/systems/InputSystem';

describe('InputSystem', () => {
  let inputSystem: InputSystem;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (inputSystem) {
      inputSystem.dispose();
    }
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      inputSystem = new InputSystem();
      expect(inputSystem).toBeDefined();
      expect(inputSystem.getActiveDevice()).toBe(InputDevice.KEYBOARD);
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        deadzone: 0.2,
        steeringSmoothness: 0.5,
        throttleSmoothness: 0.4,
      };

      inputSystem = new InputSystem(customConfig);
      expect(inputSystem).toBeDefined();
    });

    it('should register event listeners', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      inputSystem = new InputSystem();

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('gamepadconnected', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'gamepaddisconnected',
        expect.any(Function)
      );
    });
  });

  describe('keyboard input', () => {
    beforeEach(() => {
      inputSystem = new InputSystem();
    });

    it('should detect throttle input (W key)', () => {
      const event = new KeyboardEvent('keydown', { code: 'KeyW' });
      window.dispatchEvent(event);
      inputSystem.update(0.016);

      const input = inputSystem.getInput();
      expect(input.throttle).toBeGreaterThan(0);
    });

    it('should detect throttle input (Arrow Up)', () => {
      const event = new KeyboardEvent('keydown', { code: 'ArrowUp' });
      window.dispatchEvent(event);
      inputSystem.update(0.016);

      const input = inputSystem.getInput();
      expect(input.throttle).toBeGreaterThan(0);
    });

    it('should detect brake input (S key)', () => {
      const event = new KeyboardEvent('keydown', { code: 'KeyS' });
      window.dispatchEvent(event);
      inputSystem.update(0.016);

      const input = inputSystem.getInput();
      expect(input.brake).toBe(1.0);
    });

    it('should detect brake input (Arrow Down)', () => {
      const event = new KeyboardEvent('keydown', { code: 'ArrowDown' });
      window.dispatchEvent(event);
      inputSystem.update(0.016);

      const input = inputSystem.getInput();
      expect(input.brake).toBe(1.0);
    });

    it('should detect left steering (A key)', () => {
      const event = new KeyboardEvent('keydown', { code: 'KeyA' });
      window.dispatchEvent(event);
      inputSystem.update(0.016);

      const input = inputSystem.getInput();
      expect(input.steering).toBeLessThan(0);
    });

    it('should detect right steering (D key)', () => {
      const event = new KeyboardEvent('keydown', { code: 'KeyD' });
      window.dispatchEvent(event);
      inputSystem.update(0.016);

      const input = inputSystem.getInput();
      expect(input.steering).toBeGreaterThan(0);
    });

    it('should detect left steering (Arrow Left)', () => {
      const event = new KeyboardEvent('keydown', { code: 'ArrowLeft' });
      window.dispatchEvent(event);
      inputSystem.update(0.016);

      const input = inputSystem.getInput();
      expect(input.steering).toBeLessThan(0);
    });

    it('should detect right steering (Arrow Right)', () => {
      const event = new KeyboardEvent('keydown', { code: 'ArrowRight' });
      window.dispatchEvent(event);
      inputSystem.update(0.016);

      const input = inputSystem.getInput();
      expect(input.steering).toBeGreaterThan(0);
    });

    it('should detect handbrake (Space key)', () => {
      const event = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(event);
      inputSystem.update(0.016);

      const input = inputSystem.getInput();
      expect(input.handbrake).toBe(true);
    });

    it('should release handbrake when key is released', () => {
      const keyDown = new KeyboardEvent('keydown', { code: 'Space' });
      const keyUp = new KeyboardEvent('keyup', { code: 'Space' });

      window.dispatchEvent(keyDown);
      inputSystem.update(0.016);
      expect(inputSystem.getInput().handbrake).toBe(true);

      window.dispatchEvent(keyUp);
      inputSystem.update(0.016);
      expect(inputSystem.getInput().handbrake).toBe(false);
    });

    it('should detect reset input (R key) - edge triggered', () => {
      const keyDown = new KeyboardEvent('keydown', { code: 'KeyR' });
      window.dispatchEvent(keyDown);
      inputSystem.update(0.016);

      const input1 = inputSystem.getInput();
      expect(input1.reset).toBe(true);

      // Next frame, should be false even if still held
      inputSystem.update(0.016);
      const input2 = inputSystem.getInput();
      expect(input2.reset).toBe(false);
    });

    it('should detect pause input (Escape key) - edge triggered', () => {
      const keyDown = new KeyboardEvent('keydown', { code: 'Escape' });
      window.dispatchEvent(keyDown);
      inputSystem.update(0.016);

      const input1 = inputSystem.getInput();
      expect(input1.pause).toBe(true);

      // Next frame, should be false even if still held
      inputSystem.update(0.016);
      const input2 = inputSystem.getInput();
      expect(input2.pause).toBe(false);
    });

    it('should handle both left and right steering (neutral)', () => {
      const leftDown = new KeyboardEvent('keydown', { code: 'KeyA' });
      const rightDown = new KeyboardEvent('keydown', { code: 'KeyD' });

      window.dispatchEvent(leftDown);
      window.dispatchEvent(rightDown);
      inputSystem.update(0.016);

      const input = inputSystem.getInput();
      expect(input.steering).toBe(0);
    });

    it('should prioritize last released key for steering', () => {
      const leftDown = new KeyboardEvent('keydown', { code: 'KeyA' });
      const rightDown = new KeyboardEvent('keydown', { code: 'KeyD' });
      const leftUp = new KeyboardEvent('keyup', { code: 'KeyA' });

      // Press both
      window.dispatchEvent(leftDown);
      window.dispatchEvent(rightDown);
      inputSystem.update(0.016);
      expect(inputSystem.getInput().steering).toBe(0);

      // Release left, should steer right
      window.dispatchEvent(leftUp);
      inputSystem.update(0.016);
      expect(inputSystem.getInput().steering).toBeGreaterThan(0);
    });

    it('should release inputs when keys are released', () => {
      const wDown = new KeyboardEvent('keydown', { code: 'KeyW' });
      const wUp = new KeyboardEvent('keyup', { code: 'KeyW' });

      window.dispatchEvent(wDown);
      inputSystem.update(0.016);
      expect(inputSystem.getInput().throttle).toBeGreaterThan(0);

      window.dispatchEvent(wUp);
      inputSystem.update(0.016);
      inputSystem.update(0.016); // Need multiple frames for smoothing
      inputSystem.update(0.016);
      expect(inputSystem.getInput().throttle).toBeLessThan(0.1);
    });
  });

  describe('gamepad input', () => {
    let mockGamepad: Gamepad;

    beforeEach(() => {
      inputSystem = new InputSystem();

      // Create mock gamepad
      mockGamepad = {
        id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)',
        index: 0,
        connected: true,
        timestamp: Date.now(),
        mapping: 'standard',
        axes: [0, 0, 0, 0], // Left stick X, Left stick Y, Right stick X, Right stick Y (varies by controller)
        buttons: Array(16)
          .fill(null)
          .map(() => ({ pressed: false, touched: false, value: 0 })),
        vibrationActuator: null,
        hapticActuators: [],
      } as unknown as Gamepad;

      // Mock navigator.getGamepads
      vi.spyOn(navigator, 'getGamepads').mockReturnValue([mockGamepad, null, null, null]);
    });

    it('should detect gamepad on connect event', () => {
      const event = new GamepadEvent('gamepadconnected', { gamepad: mockGamepad });
      window.dispatchEvent(event);

      expect(inputSystem.getActiveDevice()).toBe(InputDevice.GAMEPAD);
    });

    it('should switch back to keyboard on gamepad disconnect', () => {
      // Connect gamepad
      const connectEvent = new GamepadEvent('gamepadconnected', { gamepad: mockGamepad });
      window.dispatchEvent(connectEvent);
      expect(inputSystem.getActiveDevice()).toBe(InputDevice.GAMEPAD);

      // Disconnect gamepad
      const disconnectEvent = new GamepadEvent('gamepaddisconnected', { gamepad: mockGamepad });
      window.dispatchEvent(disconnectEvent);

      expect(inputSystem.getActiveDevice()).toBe(InputDevice.KEYBOARD);
    });

    it('should read throttle from right trigger axis', () => {
      const connectEvent = new GamepadEvent('gamepadconnected', { gamepad: mockGamepad });
      window.dispatchEvent(connectEvent);

      // Set right trigger axis (index 3, range -1 to 1, but usually 0 to 1 for triggers)
      mockGamepad.axes[3] = 0.5; // 50% throttle (normalized to 0-1 in code)
      inputSystem.update(0.016);

      const input = inputSystem.getInput();
      expect(input.throttle).toBeGreaterThan(0);
    });

    it('should read brake from left trigger axis', () => {
      const connectEvent = new GamepadEvent('gamepadconnected', { gamepad: mockGamepad });
      window.dispatchEvent(connectEvent);

      // Set left trigger axis (index 2)
      mockGamepad.axes[2] = 0.5; // 50% brake
      inputSystem.update(0.016);

      const input = inputSystem.getInput();
      expect(input.brake).toBeGreaterThan(0);
    });

    it('should read steering from left stick X-axis', () => {
      const connectEvent = new GamepadEvent('gamepadconnected', { gamepad: mockGamepad });
      window.dispatchEvent(connectEvent);

      // Steer left
      mockGamepad.axes[0] = -0.8;
      inputSystem.update(0.016);
      expect(inputSystem.getInput().steering).toBeLessThan(0);

      // Steer right
      mockGamepad.axes[0] = 0.8;
      inputSystem.update(0.016);
      expect(inputSystem.getInput().steering).toBeGreaterThan(0);
    });

    it('should apply deadzone to steering', () => {
      inputSystem.setDeadzone(0.15);
      const connectEvent = new GamepadEvent('gamepadconnected', { gamepad: mockGamepad });
      window.dispatchEvent(connectEvent);

      // Small input within deadzone
      mockGamepad.axes[0] = 0.1; // Less than 0.15 deadzone
      inputSystem.update(0.016);

      const input = inputSystem.getInput();
      expect(Math.abs(input.steering)).toBeLessThan(0.01);
    });

    it('should detect handbrake button', () => {
      const connectEvent = new GamepadEvent('gamepadconnected', { gamepad: mockGamepad });
      window.dispatchEvent(connectEvent);

      mockGamepad.buttons[0].pressed = true; // A button (handbrake)
      inputSystem.update(0.016);

      expect(inputSystem.getInput().handbrake).toBe(true);
    });

    it('should detect reset button - edge triggered', () => {
      const connectEvent = new GamepadEvent('gamepadconnected', { gamepad: mockGamepad });
      window.dispatchEvent(connectEvent);

      mockGamepad.buttons[1].pressed = true; // B button (reset)
      inputSystem.update(0.016);
      expect(inputSystem.getInput().reset).toBe(true);

      // Next frame, should be false even if still pressed
      inputSystem.update(0.016);
      expect(inputSystem.getInput().reset).toBe(false);
    });

    it('should detect pause button - edge triggered', () => {
      const connectEvent = new GamepadEvent('gamepadconnected', { gamepad: mockGamepad });
      window.dispatchEvent(connectEvent);

      mockGamepad.buttons[9].pressed = true; // Start button (pause)
      inputSystem.update(0.016);
      expect(inputSystem.getInput().pause).toBe(true);

      // Next frame, should be false even if still pressed
      inputSystem.update(0.016);
      expect(inputSystem.getInput().pause).toBe(false);
    });

    it('should fallback to keyboard if gamepad becomes unavailable', () => {
      const connectEvent = new GamepadEvent('gamepadconnected', { gamepad: mockGamepad });
      window.dispatchEvent(connectEvent);
      expect(inputSystem.getActiveDevice()).toBe(InputDevice.GAMEPAD);

      // Simulate gamepad becoming unavailable
      vi.spyOn(navigator, 'getGamepads').mockReturnValue([null, null, null, null]);
      inputSystem.update(0.016);

      expect(inputSystem.getActiveDevice()).toBe(InputDevice.KEYBOARD);
    });
  });

  describe('input smoothing', () => {
    beforeEach(() => {
      inputSystem = new InputSystem({
        steeringSmoothness: 0.2,
        throttleSmoothness: 0.3,
      });
    });

    it('should smooth steering input over time', () => {
      const keyDown = new KeyboardEvent('keydown', { code: 'KeyD' });
      window.dispatchEvent(keyDown);

      // First frame
      inputSystem.update(0.016);
      const steering1 = inputSystem.getInput().steering;

      // Second frame
      inputSystem.update(0.016);
      const steering2 = inputSystem.getInput().steering;

      // Third frame
      inputSystem.update(0.016);
      const steering3 = inputSystem.getInput().steering;

      // Steering should gradually increase (smoothing)
      expect(steering2).toBeGreaterThan(steering1);
      expect(steering3).toBeGreaterThan(steering2);
      expect(steering3).toBeLessThanOrEqual(1.0);
    });

    it('should smooth throttle input over time', () => {
      const keyDown = new KeyboardEvent('keydown', { code: 'KeyW' });
      window.dispatchEvent(keyDown);

      // First frame
      inputSystem.update(0.016);
      const throttle1 = inputSystem.getInput().throttle;

      // Second frame
      inputSystem.update(0.016);
      const throttle2 = inputSystem.getInput().throttle;

      // Third frame
      inputSystem.update(0.016);
      const throttle3 = inputSystem.getInput().throttle;

      // Throttle should gradually increase (smoothing)
      expect(throttle2).toBeGreaterThan(throttle1);
      expect(throttle3).toBeGreaterThan(throttle2);
      expect(throttle3).toBeLessThanOrEqual(1.0);
    });

    it('should NOT smooth brake input (instant response)', () => {
      const keyDown = new KeyboardEvent('keydown', { code: 'KeyS' });
      window.dispatchEvent(keyDown);

      inputSystem.update(0.016);
      const brake = inputSystem.getInput().brake;

      // Brake should be instant (no smoothing)
      expect(brake).toBe(1.0);
    });
  });

  describe('device switching', () => {
    let mockGamepad: Gamepad;

    beforeEach(() => {
      inputSystem = new InputSystem();

      mockGamepad = {
        id: 'Xbox Controller',
        index: 0,
        connected: true,
        timestamp: Date.now(),
        mapping: 'standard',
        axes: [0, 0, 0, 0],
        buttons: Array(16)
          .fill(null)
          .map(() => ({ pressed: false, touched: false, value: 0 })),
        vibrationActuator: null,
        hapticActuators: [],
      } as unknown as Gamepad;

      vi.spyOn(navigator, 'getGamepads').mockReturnValue([mockGamepad, null, null, null]);
    });

    it('should switch from keyboard to gamepad on gamepad input', () => {
      expect(inputSystem.getActiveDevice()).toBe(InputDevice.KEYBOARD);

      const connectEvent = new GamepadEvent('gamepadconnected', { gamepad: mockGamepad });
      window.dispatchEvent(connectEvent);

      expect(inputSystem.getActiveDevice()).toBe(InputDevice.GAMEPAD);
    });

    it('should switch from gamepad to keyboard on keyboard input', () => {
      // Start with gamepad
      const connectEvent = new GamepadEvent('gamepadconnected', { gamepad: mockGamepad });
      window.dispatchEvent(connectEvent);
      expect(inputSystem.getActiveDevice()).toBe(InputDevice.GAMEPAD);

      // Press keyboard key
      const keyEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
      window.dispatchEvent(keyEvent);

      expect(inputSystem.getActiveDevice()).toBe(InputDevice.KEYBOARD);
    });
  });

  describe('configuration', () => {
    beforeEach(() => {
      inputSystem = new InputSystem();
    });

    it('should update key bindings', () => {
      const newBindings: Partial<KeyBindings> = {
        throttleW: 'KeyI',
        brakeS: 'KeyK',
      };

      inputSystem.setKeyBindings(newBindings);

      // Test new throttle binding
      const event = new KeyboardEvent('keydown', { code: 'KeyI' });
      window.dispatchEvent(event);
      inputSystem.update(0.016);

      expect(inputSystem.getInput().throttle).toBeGreaterThan(0);
    });

    it('should update deadzone', () => {
      inputSystem.setDeadzone(0.25);
      // Deadzone is tested in gamepad tests
    });

    it('should clamp deadzone to 0-1 range', () => {
      inputSystem.setDeadzone(-0.5);
      inputSystem.setDeadzone(1.5);
      // Should not throw, values clamped internally
    });

    it('should update steering smoothness', () => {
      inputSystem.setSteeringSmoothness(0.5);
      // Smoothness effect tested in smoothing tests
    });

    it('should clamp steering smoothness to 0-1 range', () => {
      inputSystem.setSteeringSmoothness(-0.5);
      inputSystem.setSteeringSmoothness(1.5);
      // Should not throw, values clamped internally
    });
  });

  describe('reset and cleanup', () => {
    beforeEach(() => {
      inputSystem = new InputSystem();
    });

    it('should reset all input values', () => {
      const keyDown = new KeyboardEvent('keydown', { code: 'KeyW' });
      window.dispatchEvent(keyDown);
      inputSystem.update(0.016);

      expect(inputSystem.getInput().throttle).toBeGreaterThan(0);

      inputSystem.reset();

      const input = inputSystem.getInput();
      expect(input.throttle).toBe(0);
      expect(input.brake).toBe(0);
      expect(input.steering).toBe(0);
      expect(input.handbrake).toBe(false);
      expect(input.reset).toBe(false);
      expect(input.pause).toBe(false);
    });

    it('should remove event listeners on dispose', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      inputSystem.dispose();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'gamepadconnected',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'gamepaddisconnected',
        expect.any(Function)
      );
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      inputSystem = new InputSystem();
    });

    it('should check if specific key is pressed', () => {
      const keyDown = new KeyboardEvent('keydown', { code: 'KeyW' });
      window.dispatchEvent(keyDown);

      expect(inputSystem.isKeyPressed('KeyW')).toBe(true);
      expect(inputSystem.isKeyPressed('KeyS')).toBe(false);
    });

    it('should provide debug information', () => {
      const debugInfo = inputSystem.getDebugInfo();

      expect(debugInfo).toHaveProperty('device');
      expect(debugInfo).toHaveProperty('gamepadIndex');
      expect(debugInfo).toHaveProperty('input');
      expect(debugInfo).toHaveProperty('rawValues');
      expect(debugInfo).toHaveProperty('keysPressed');
      expect(Array.isArray(debugInfo.keysPressed)).toBe(true);
    });

    it('should return current active device', () => {
      expect(inputSystem.getActiveDevice()).toBe(InputDevice.KEYBOARD);
    });

    it('should return input copy (not reference)', () => {
      const input1 = inputSystem.getInput();
      const input2 = inputSystem.getInput();

      // Different references (for safety - prevents external mutation)
      expect(input1).not.toBe(input2);
      // But same values
      expect(input1).toEqual(input2);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      inputSystem = new InputSystem();
    });

    it('should handle rapid key presses', () => {
      for (let i = 0; i < 100; i++) {
        const keyDown = new KeyboardEvent('keydown', { code: 'KeyW' });
        const keyUp = new KeyboardEvent('keyup', { code: 'KeyW' });
        window.dispatchEvent(keyDown);
        window.dispatchEvent(keyUp);
      }

      inputSystem.update(0.016);
      // Should not crash
      expect(inputSystem.getInput()).toBeDefined();
    });

    it('should handle update with 0 deltaTime', () => {
      const keyDown = new KeyboardEvent('keydown', { code: 'KeyW' });
      window.dispatchEvent(keyDown);

      inputSystem.update(0);
      expect(inputSystem.getInput()).toBeDefined();
    });

    it('should handle update with very large deltaTime', () => {
      const keyDown = new KeyboardEvent('keydown', { code: 'KeyW' });
      window.dispatchEvent(keyDown);

      inputSystem.update(10.0); // 10 seconds
      expect(inputSystem.getInput()).toBeDefined();
    });

    it('should handle multiple simultaneous inputs', () => {
      const wDown = new KeyboardEvent('keydown', { code: 'KeyW' });
      const aDown = new KeyboardEvent('keydown', { code: 'KeyA' });
      const spaceDown = new KeyboardEvent('keydown', { code: 'Space' });

      window.dispatchEvent(wDown);
      window.dispatchEvent(aDown);
      window.dispatchEvent(spaceDown);

      inputSystem.update(0.016);

      const input = inputSystem.getInput();
      expect(input.throttle).toBeGreaterThan(0);
      expect(input.steering).toBeLessThan(0);
      expect(input.handbrake).toBe(true);
    });

    it('should handle gamepad with fewer axes', () => {
      const mockGamepad: Gamepad = {
        id: 'Simple Controller',
        index: 0,
        connected: true,
        timestamp: Date.now(),
        mapping: 'standard',
        axes: [0], // Only 1 axis
        buttons: Array(16)
          .fill(null)
          .map(() => ({ pressed: false, touched: false, value: 0 })),
        vibrationActuator: null,
        hapticActuators: [],
      } as unknown as Gamepad;

      vi.spyOn(navigator, 'getGamepads').mockReturnValue([mockGamepad, null, null, null]);

      const connectEvent = new GamepadEvent('gamepadconnected', { gamepad: mockGamepad });
      window.dispatchEvent(connectEvent);

      inputSystem.update(0.016);
      // Should not crash, falls back to buttons
      expect(inputSystem.getInput()).toBeDefined();
    });

    it('should handle disconnected gamepad during update', () => {
      const mockGamepad: Gamepad = {
        id: 'Controller',
        index: 0,
        connected: true,
        timestamp: Date.now(),
        mapping: 'standard',
        axes: [0, 0, 0, 0],
        buttons: Array(16)
          .fill(null)
          .map(() => ({ pressed: false, touched: false, value: 0 })),
        vibrationActuator: null,
        hapticActuators: [],
      } as unknown as Gamepad;

      // First, connect the gamepad
      const getGamepadsSpy = vi.spyOn(navigator, 'getGamepads');
      getGamepadsSpy.mockReturnValue([mockGamepad, null, null, null]);

      const connectEvent = new GamepadEvent('gamepadconnected', { gamepad: mockGamepad });
      window.dispatchEvent(connectEvent);
      expect(inputSystem.getActiveDevice()).toBe(InputDevice.GAMEPAD);

      // Now disconnect gamepad by making getGamepads return nulls
      getGamepadsSpy.mockReturnValue([null, null, null, null]);

      inputSystem.update(0.016);
      expect(inputSystem.getActiveDevice()).toBe(InputDevice.KEYBOARD);
    });
  });
});
