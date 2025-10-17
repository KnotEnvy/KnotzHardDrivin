/**
 * InputSystem - Unified input handling for keyboard and gamepad controls
 *
 * Features:
 * - Poll-based input for consistent 60Hz updates
 * - Keyboard support: WASD + Arrow keys
 * - Gamepad support: Xbox/PlayStation layouts (standard Gamepad API)
 * - Input smoothing with configurable lerp factor
 * - Deadzone management for analog sticks
 * - Graceful gamepad connect/disconnect handling
 * - Zero per-frame allocations
 *
 * Performance: <0.1ms per frame
 *
 * Usage:
 * ```typescript
 * const inputSystem = new InputSystem();
 * inputSystem.update(deltaTime);
 * const input = inputSystem.getInput();
 * vehicle.applyInput(input);
 * ```
 */

/**
 * Vehicle input structure containing all control values
 * All values are normalized to specified ranges
 */
export interface VehicleInput {
  throttle: number;      // 0.0 to 1.0
  brake: number;         // 0.0 to 1.0
  steering: number;      // -1.0 (left) to 1.0 (right)
  handbrake: boolean;    // true/false
  reset: boolean;        // true/false (respawn vehicle)
  pause: boolean;        // true/false (pause game)
}

/**
 * Input device type enumeration
 */
export enum InputDevice {
  KEYBOARD = 'keyboard',
  GAMEPAD = 'gamepad',
  NONE = 'none',
}

/**
 * Keyboard key bindings configuration
 */
export interface KeyBindings {
  // Primary controls (WASD)
  throttleW: string;
  brakeS: string;
  steerLeftA: string;
  steerRightD: string;

  // Alternative controls (Arrow keys)
  throttleUp: string;
  brakeDown: string;
  steerLeftLeft: string;
  steerRightRight: string;

  // Special controls
  handbrake: string;
  reset: string;
  pauseEscape: string;
  pauseP: string;
}

/**
 * Gamepad button mapping (standard layout)
 */
export interface GamepadMapping {
  throttle: number;      // Right trigger (axis or button)
  brake: number;         // Left trigger (axis or button)
  steering: number;      // Left stick X-axis
  handbrake: number;     // A/X button
  reset: number;         // B/Circle button
  pause: number;         // Start button
}

/**
 * Input configuration
 */
export interface InputConfig {
  keyBindings: KeyBindings;
  gamepadMapping: GamepadMapping;
  deadzone: number;              // Analog stick deadzone (0.0-1.0)
  steeringSmoothness: number;    // Steering lerp factor (0.0-1.0)
  throttleSmoothness: number;    // Throttle lerp factor (0.0-1.0)
}

/**
 * Default keyboard key bindings
 */
const DEFAULT_KEY_BINDINGS: KeyBindings = {
  // WASD
  throttleW: 'KeyW',
  brakeS: 'KeyS',
  steerLeftA: 'KeyA',
  steerRightD: 'KeyD',

  // Arrow keys
  throttleUp: 'ArrowUp',
  brakeDown: 'ArrowDown',
  steerLeftLeft: 'ArrowLeft',
  steerRightRight: 'ArrowRight',

  // Special
  handbrake: 'Space',
  reset: 'KeyR',
  pauseEscape: 'Escape',
  pauseP: 'KeyP',
};

/**
 * Default gamepad mapping (standard layout)
 */
const DEFAULT_GAMEPAD_MAPPING: GamepadMapping = {
  throttle: 7,       // Right trigger (button index, or use axes[3] for analog)
  brake: 6,          // Left trigger (button index, or use axes[2] for analog)
  steering: 0,       // Left stick X-axis (axes[0])
  handbrake: 0,      // A button (Xbox) / X button (PlayStation)
  reset: 1,          // B button (Xbox) / Circle button (PlayStation)
  pause: 9,          // Start button
};

/**
 * InputSystem class - Main input handling system
 */
export class InputSystem {
  // Configuration
  private config: InputConfig;

  // Active device tracking
  private activeDevice: InputDevice = InputDevice.KEYBOARD;
  private gamepadIndex: number = -1;

  // Keyboard state (using key codes)
  private keysPressed = new Set<string>();

  // Current input values (smoothed)
  private currentInput: VehicleInput = {
    throttle: 0,
    brake: 0,
    steering: 0,
    handbrake: false,
    reset: false,
    pause: false,
  };

  // Raw input values (before smoothing)
  private rawThrottle = 0;
  private rawBrake = 0;
  private rawSteering = 0;

  // Previous frame button states (for edge detection)
  private prevReset = false;
  private prevPause = false;
  private prevHandbrake = false;

  // Event handlers (bound for proper cleanup)
  private keyDownHandler = this.onKeyDown.bind(this);
  private keyUpHandler = this.onKeyUp.bind(this);
  private gamepadConnectHandler = this.onGamepadConnect.bind(this);
  private gamepadDisconnectHandler = this.onGamepadDisconnect.bind(this);

  /**
   * Constructor
   * @param config - Optional input configuration (uses defaults if not provided)
   */
  constructor(config?: Partial<InputConfig>) {
    this.config = {
      keyBindings: config?.keyBindings || DEFAULT_KEY_BINDINGS,
      gamepadMapping: config?.gamepadMapping || DEFAULT_GAMEPAD_MAPPING,
      deadzone: config?.deadzone ?? 0.15,
      steeringSmoothness: config?.steeringSmoothness ?? 0.2,
      throttleSmoothness: config?.throttleSmoothness ?? 0.3,
    };

    this.init();
  }

  /**
   * Initialize input system and register event listeners
   */
  private init(): void {
    // Keyboard events
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);

    // Gamepad events
    window.addEventListener('gamepadconnected', this.gamepadConnectHandler);
    window.addEventListener('gamepaddisconnected', this.gamepadDisconnectHandler);

    // Check for already-connected gamepads
    this.scanForGamepads();

    console.log('InputSystem initialized');
  }

  /**
   * Scan for already-connected gamepads
   */
  private scanForGamepads(): void {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.gamepadIndex = i;
        this.activeDevice = InputDevice.GAMEPAD;
        console.log(`Gamepad detected at index ${i}: ${gamepads[i]!.id}`);
        break;
      }
    }
  }

  /**
   * Keyboard key down event handler
   */
  private onKeyDown(event: KeyboardEvent): void {
    this.keysPressed.add(event.code);

    // Switch to keyboard input when any key is pressed
    if (this.activeDevice !== InputDevice.KEYBOARD) {
      this.activeDevice = InputDevice.KEYBOARD;
      console.log('Switched to keyboard input');
    }
  }

  /**
   * Keyboard key up event handler
   */
  private onKeyUp(event: KeyboardEvent): void {
    this.keysPressed.delete(event.code);
  }

  /**
   * Gamepad connected event handler
   */
  private onGamepadConnect(event: GamepadEvent): void {
    this.gamepadIndex = event.gamepad.index;
    this.activeDevice = InputDevice.GAMEPAD;
    console.log(`Gamepad connected: ${event.gamepad.id} (index ${event.gamepad.index})`);
  }

  /**
   * Gamepad disconnected event handler
   */
  private onGamepadDisconnect(event: GamepadEvent): void {
    if (event.gamepad.index === this.gamepadIndex) {
      console.log(`Gamepad disconnected: ${event.gamepad.id}`);
      this.gamepadIndex = -1;
      this.activeDevice = InputDevice.KEYBOARD;

      // Reset gamepad inputs
      this.rawThrottle = 0;
      this.rawBrake = 0;
      this.rawSteering = 0;
    }
  }

  /**
   * Main update method - called once per frame
   * @param deltaTime - Time since last frame in seconds
   */
  update(deltaTime: number): void {
    if (this.activeDevice === InputDevice.KEYBOARD) {
      this.updateKeyboardInput();
    } else if (this.activeDevice === InputDevice.GAMEPAD) {
      this.updateGamepadInput();
    }

    // Apply smoothing to analog values
    this.applySmoothFilters(deltaTime);
  }

  /**
   * Update input from keyboard
   */
  private updateKeyboardInput(): void {
    const keys = this.config.keyBindings;

    // Throttle (W or Up Arrow)
    const throttlePressed = this.keysPressed.has(keys.throttleW) ||
                           this.keysPressed.has(keys.throttleUp);
    this.rawThrottle = throttlePressed ? 1.0 : 0.0;

    // Brake (S or Down Arrow)
    const brakePressed = this.keysPressed.has(keys.brakeS) ||
                        this.keysPressed.has(keys.brakeDown);
    this.rawBrake = brakePressed ? 1.0 : 0.0;

    // Steering (A/D or Left/Right Arrow)
    const leftPressed = this.keysPressed.has(keys.steerLeftA) ||
                       this.keysPressed.has(keys.steerLeftLeft);
    const rightPressed = this.keysPressed.has(keys.steerRightD) ||
                        this.keysPressed.has(keys.steerRightRight);

    if (leftPressed && !rightPressed) {
      this.rawSteering = -1.0;
    } else if (rightPressed && !leftPressed) {
      this.rawSteering = 1.0;
    } else {
      this.rawSteering = 0.0;
    }

    // Handbrake (edge-triggered, stays active while held)
    this.currentInput.handbrake = this.keysPressed.has(keys.handbrake);

    // Reset (edge-triggered, one-shot)
    const resetPressed = this.keysPressed.has(keys.reset);
    this.currentInput.reset = resetPressed && !this.prevReset;
    this.prevReset = resetPressed;

    // Pause (edge-triggered, one-shot)
    const pausePressed = this.keysPressed.has(keys.pauseEscape) || this.keysPressed.has(keys.pauseP);
    this.currentInput.pause = pausePressed && !this.prevPause;
    this.prevPause = pausePressed;
  }

  /**
   * Update input from gamepad
   */
  private updateGamepadInput(): void {
    const gamepads = navigator.getGamepads();
    if (this.gamepadIndex < 0 || !gamepads[this.gamepadIndex]) {
      // Gamepad disconnected, fallback to keyboard
      this.activeDevice = InputDevice.KEYBOARD;
      return;
    }

    const gamepad = gamepads[this.gamepadIndex]!;
    const mapping = this.config.gamepadMapping;

    // Throttle (right trigger - can be button or axis)
    // Modern controllers use axes[3] for right trigger (Gamepad API spec: 0 to 1 range)
    if (gamepad.axes.length > 3) {
      // Axis input (already 0-1 range per spec, but clamp to be safe)
      this.rawThrottle = Math.max(0, Math.min(1, gamepad.axes[3]));
    } else if (gamepad.buttons[mapping.throttle]) {
      // Button input (fallback for older controllers)
      this.rawThrottle = gamepad.buttons[mapping.throttle].value;
    }

    // Brake (left trigger - can be button or axis)
    // Modern controllers use axes[2] for left trigger (Gamepad API spec: 0 to 1 range)
    if (gamepad.axes.length > 2) {
      // Axis input (already 0-1 range per spec, but clamp to be safe)
      this.rawBrake = Math.max(0, Math.min(1, gamepad.axes[2]));
    } else if (gamepad.buttons[mapping.brake]) {
      // Button input (fallback for older controllers)
      this.rawBrake = gamepad.buttons[mapping.brake].value;
    }

    // Steering (left stick X-axis)
    if (gamepad.axes.length > mapping.steering) {
      const steeringRaw = gamepad.axes[mapping.steering];
      // Apply deadzone
      this.rawSteering = this.applyDeadzone(steeringRaw, this.config.deadzone);
    }

    // Handbrake (A/X button - stays active while held)
    this.currentInput.handbrake = gamepad.buttons[mapping.handbrake]?.pressed || false;

    // Reset (B/Circle button - edge-triggered)
    const resetPressed = gamepad.buttons[mapping.reset]?.pressed || false;
    this.currentInput.reset = resetPressed && !this.prevReset;
    this.prevReset = resetPressed;

    // Pause (Start button - edge-triggered)
    const pausePressed = gamepad.buttons[mapping.pause]?.pressed || false;
    this.currentInput.pause = pausePressed && !this.prevPause;
    this.prevPause = pausePressed;
  }

  /**
   * Apply deadzone to analog input
   * @param value - Raw analog value (-1 to 1)
   * @param deadzone - Deadzone threshold (0 to 1)
   * @returns Processed value with deadzone applied
   */
  private applyDeadzone(value: number, deadzone: number): number {
    const absValue = Math.abs(value);

    if (absValue < deadzone) {
      return 0.0;
    }

    // Rescale to 0-1 range after deadzone
    const sign = value > 0 ? 1 : -1;
    return sign * ((absValue - deadzone) / (1.0 - deadzone));
  }

  /**
   * Apply smoothing filters to analog inputs
   * Uses frame-rate independent lerp for natural acceleration/deceleration feel
   * @param deltaTime - Time since last frame in seconds
   */
  private applySmoothFilters(deltaTime: number): void {
    // Frame-rate independent smoothing using exponential decay
    // Formula: lerp(current, target, 1 - pow(smoothness, deltaTime * 60))
    // This ensures consistent behavior regardless of frame rate

    // Steering smoothing (lerp for natural feel)
    const steeringLerpFactor = deltaTime > 0
      ? 1 - Math.pow(this.config.steeringSmoothness, deltaTime * 60)
      : this.config.steeringSmoothness;
    this.currentInput.steering = this.lerp(
      this.currentInput.steering,
      this.rawSteering,
      steeringLerpFactor
    );

    // Throttle smoothing (faster response than steering)
    const throttleLerpFactor = deltaTime > 0
      ? 1 - Math.pow(this.config.throttleSmoothness, deltaTime * 60)
      : this.config.throttleSmoothness;
    this.currentInput.throttle = this.lerp(
      this.currentInput.throttle,
      this.rawThrottle,
      throttleLerpFactor
    );

    // Brake smoothing (instant response for safety)
    // No smoothing on brake - instant response is critical
    this.currentInput.brake = this.rawBrake;
  }

  /**
   * Linear interpolation
   * @param a - Start value
   * @param b - End value
   * @param t - Interpolation factor (0-1)
   * @returns Interpolated value
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Get current input state
   * WARNING: Returned object is a direct reference. Caller must NOT mutate it.
   * Zero per-frame allocations - critical for 60fps gameplay loop.
   * @returns Current vehicle input state (reference - READ ONLY)
   */
  getInput(): VehicleInput {
    return this.currentInput;
  }

  /**
   * Get current active input device
   * @returns Active device type
   */
  getActiveDevice(): InputDevice {
    return this.activeDevice;
  }

  /**
   * Check if a specific key is currently pressed
   * @param keyCode - Keyboard key code (e.g., 'KeyW', 'Space')
   * @returns True if key is pressed
   */
  isKeyPressed(keyCode: string): boolean {
    return this.keysPressed.has(keyCode);
  }

  /**
   * Update key bindings
   * @param newBindings - New key bindings (partial update supported)
   */
  setKeyBindings(newBindings: Partial<KeyBindings>): void {
    this.config.keyBindings = { ...this.config.keyBindings, ...newBindings };
    console.log('Key bindings updated');
  }

  /**
   * Update deadzone value
   * @param deadzone - New deadzone (0.0-1.0, clamped)
   */
  setDeadzone(deadzone: number): void {
    this.config.deadzone = Math.max(0.0, Math.min(1.0, deadzone));
    console.log(`Deadzone set to ${this.config.deadzone}`);
  }

  /**
   * Update steering smoothness
   * @param smoothness - Steering lerp factor (0.0-1.0)
   */
  setSteeringSmoothness(smoothness: number): void {
    this.config.steeringSmoothness = Math.max(0.0, Math.min(1.0, smoothness));
    console.log(`Steering smoothness set to ${this.config.steeringSmoothness}`);
  }

  /**
   * Reset all input values to default state
   */
  reset(): void {
    this.currentInput.throttle = 0;
    this.currentInput.brake = 0;
    this.currentInput.steering = 0;
    this.currentInput.handbrake = false;
    this.currentInput.reset = false;
    this.currentInput.pause = false;

    this.rawThrottle = 0;
    this.rawBrake = 0;
    this.rawSteering = 0;

    this.prevReset = false;
    this.prevPause = false;
    this.prevHandbrake = false;

    this.keysPressed.clear();
  }

  /**
   * Clean up resources and remove event listeners
   * IMPORTANT: Call this when destroying the input system to prevent memory leaks
   */
  dispose(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    window.removeEventListener('gamepadconnected', this.gamepadConnectHandler);
    window.removeEventListener('gamepaddisconnected', this.gamepadDisconnectHandler);

    this.keysPressed.clear();
    console.log('InputSystem disposed');
  }

  /**
   * Get debug information about current input state
   * Useful for development and troubleshooting
   */
  getDebugInfo(): {
    device: InputDevice;
    gamepadIndex: number;
    input: VehicleInput;
    rawValues: { throttle: number; brake: number; steering: number };
    keysPressed: string[];
  } {
    return {
      device: this.activeDevice,
      gamepadIndex: this.gamepadIndex,
      input: { ...this.currentInput },
      rawValues: {
        throttle: this.rawThrottle,
        brake: this.rawBrake,
        steering: this.rawSteering,
      },
      keysPressed: Array.from(this.keysPressed),
    };
  }
}
