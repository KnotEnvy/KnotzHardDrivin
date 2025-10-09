import { SceneManager } from './SceneManager';
import { PhysicsWorld } from './PhysicsWorld';
import { StateManager } from './StateManager';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

/**
 * Game state enumeration representing all possible states the game can be in.
 */
export enum GameState {
  LOADING = 'loading',
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  CRASHED = 'crashed',
  REPLAY = 'replay',
  RESULTS = 'results',
}

/**
 * Core game engine that orchestrates the main game loop with fixed timestep physics
 * and variable timestep rendering. Manages all core systems and state transitions.
 */
export class GameEngine {
  private sceneManager: SceneManager;
  private physicsWorld: PhysicsWorld;
  private stateManager: StateManager;
  private performanceMonitor: PerformanceMonitor;

  private state: GameState = GameState.LOADING;
  private lastTime = 0;
  private running = false;

  // Fixed timestep for physics (60Hz)
  private readonly fixedTimeStep = 1 / 60;
  private accumulator = 0;

  // Maximum delta time to prevent spiral of death
  private readonly maxDeltaTime = 0.1; // 100ms cap

  // State change callbacks
  private stateChangeCallbacks: Map<GameState, Array<(newState: GameState) => void>> = new Map();

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element with id "game-canvas" not found');
    }

    this.sceneManager = new SceneManager(canvas);
    this.physicsWorld = new PhysicsWorld();
    this.stateManager = new StateManager();
    this.performanceMonitor = new PerformanceMonitor();

    // Handle window resize
    window.addEventListener('resize', this.handleResize);

    // Handle tab visibility changes to prevent physics explosion
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Initializes the game engine and starts the game loop.
   */
  async start(): Promise<void> {
    try {
      await this.physicsWorld.init();
      this.running = true;
      this.lastTime = performance.now();

      // Transition from LOADING to MENU
      this.setState(GameState.MENU);

      this.gameLoop();
    } catch (error) {
      console.error('Failed to start game engine:', error);
      throw error;
    }
  }

  /**
   * Main game loop using fixed timestep for physics and variable timestep for rendering.
   * Implements the accumulator pattern for frame-rate independence.
   */
  private gameLoop = (): void => {
    if (!this.running) return;

    const currentTime = performance.now();
    let deltaTime = Math.min((currentTime - this.lastTime) / 1000, this.maxDeltaTime);
    this.lastTime = currentTime;

    // Record frame for performance monitoring
    this.performanceMonitor.recordFrame(deltaTime);

    // Fixed timestep physics updates
    this.accumulator += deltaTime;

    while (this.accumulator >= this.fixedTimeStep) {
      // Only step physics when in states that need it
      if (this.shouldUpdatePhysics()) {
        this.physicsWorld.step(this.fixedTimeStep);
      }
      this.accumulator -= this.fixedTimeStep;
    }

    // Variable timestep game logic update
    this.update(deltaTime);

    // Render
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  /**
   * Determines if physics should be updated based on current game state.
   */
  private shouldUpdatePhysics(): boolean {
    return this.state === GameState.PLAYING ||
           this.state === GameState.CRASHED ||
           this.state === GameState.REPLAY;
  }

  /**
   * Updates game logic (non-physics) with variable timestep.
   */
  private update(deltaTime: number): void {
    // Update systems based on current state
    switch (this.state) {
      case GameState.MENU:
        // Update menu animations
        break;
      case GameState.PLAYING:
        // Update gameplay systems
        break;
      case GameState.PAUSED:
        // Minimal updates when paused
        break;
      case GameState.CRASHED:
        // Update crash effects
        break;
      case GameState.REPLAY:
        // Update replay playback
        break;
      case GameState.RESULTS:
        // Update results screen animations
        break;
    }
  }

  /**
   * Renders the current frame.
   */
  private render(): void {
    this.sceneManager.render();
  }

  /**
   * Transitions to a new game state with validation.
   * @param newState - The state to transition to
   * @throws Error if transition is invalid
   */
  setState(newState: GameState): void {
    if (!this.stateManager.canTransition(this.state, newState)) {
      console.warn(`Invalid state transition: ${this.state} -> ${newState}`);
      return;
    }

    const oldState = this.state;
    console.log(`State transition: ${oldState} -> ${newState}`);

    // Exit current state
    this.onStateExit(oldState);

    // Update state
    this.state = newState;

    // Enter new state
    this.onStateEnter(newState);

    // Trigger callbacks
    this.onStateChange(newState);
  }

  /**
   * Gets the current game state.
   */
  getState(): GameState {
    return this.state;
  }

  /**
   * Called when entering a new state.
   */
  private onStateEnter(state: GameState): void {
    switch (state) {
      case GameState.LOADING:
        // Initialize loading screen
        break;
      case GameState.MENU:
        // Setup menu
        break;
      case GameState.PLAYING:
        // Start race timer, enable input
        this.accumulator = 0; // Reset accumulator
        break;
      case GameState.PAUSED:
        // Show pause menu
        break;
      case GameState.CRASHED:
        // Trigger crash effects
        break;
      case GameState.REPLAY:
        // Start replay playback
        break;
      case GameState.RESULTS:
        // Display results
        break;
    }
  }

  /**
   * Called when exiting a state.
   */
  private onStateExit(state: GameState): void {
    switch (state) {
      case GameState.LOADING:
        // Cleanup loading screen
        break;
      case GameState.MENU:
        // Cleanup menu
        break;
      case GameState.PLAYING:
        // Pause timers
        break;
      case GameState.PAUSED:
        // Hide pause menu
        break;
      case GameState.CRASHED:
        // Cleanup crash effects
        break;
      case GameState.REPLAY:
        // Stop replay
        break;
      case GameState.RESULTS:
        // Cleanup results screen
        break;
    }
  }

  /**
   * Notifies registered callbacks of state changes.
   */
  private onStateChange(newState: GameState): void {
    const callbacks = this.stateChangeCallbacks.get(newState);
    if (callbacks) {
      callbacks.forEach(callback => callback(newState));
    }
  }

  /**
   * Registers a callback to be called when entering a specific state.
   * @param state - The state to listen for
   * @param callback - The callback function
   */
  onStateEnterCallback(state: GameState, callback: (newState: GameState) => void): void {
    if (!this.stateChangeCallbacks.has(state)) {
      this.stateChangeCallbacks.set(state, []);
    }
    this.stateChangeCallbacks.get(state)!.push(callback);
  }

  /**
   * Handles window resize events.
   * Note: SceneManager already handles its own resize internally
   */
  private handleResize = (): void => {
    // SceneManager has its own resize listener, so this is a no-op
    // Kept here for potential future use by other systems
  };

  /**
   * Handles tab visibility changes to prevent physics explosion when tab is inactive.
   */
  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // Reset lastTime when tab becomes hidden to prevent large delta
      console.log('Tab hidden - pausing time tracking');
    } else {
      // Reset time tracking when tab becomes visible
      this.lastTime = performance.now();
      this.accumulator = 0; // Reset accumulator to prevent physics catch-up
      console.log('Tab visible - resuming');
    }
  };

  /**
   * Gets the performance monitor for FPS and frame time data.
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor;
  }

  /**
   * Gets the scene manager (for external access).
   */
  getSceneManager(): SceneManager {
    return this.sceneManager;
  }

  /**
   * Gets the state manager (for external access).
   */
  getStateManager(): StateManager {
    return this.stateManager;
  }

  /**
   * Stops the game loop and cleans up resources.
   */
  stop(): void {
    this.running = false;
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}
