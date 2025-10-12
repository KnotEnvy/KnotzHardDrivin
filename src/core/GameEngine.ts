import { SceneManager } from './SceneManager';
import { PhysicsWorld } from './PhysicsWorld';
import { StateManager } from './StateManager';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { Vehicle } from '../entities/Vehicle';
import { InputSystem } from '../systems/InputSystem';
import { CameraSystem } from '../systems/CameraSystem';
import { DEFAULT_VEHICLE_CONFIG } from '../config/PhysicsConfig';
import { Track, TrackData } from '../entities/Track';
import { WaypointSystem, WaypointData } from '../systems/WaypointSystem';
import * as THREE from 'three';

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

  // Phase 2: Vehicle and Input
  private vehicle?: Vehicle;
  private inputSystem?: InputSystem;
  private cameraSystem: CameraSystem;

  // Phase 3: Track and Waypoint System
  private track: Track | null = null;
  private waypointSystem: WaypointSystem | null = null;

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
    this.cameraSystem = new CameraSystem(this.sceneManager.camera);

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

        // Update vehicle physics (60Hz fixed timestep)
        if (this.vehicle && this.inputSystem && this.state === GameState.PLAYING) {
          const input = this.inputSystem.getInput();
          // Convert InputSystem's VehicleInput (handbrake: boolean) to Vehicle's expected format (handbrake: number)
          this.vehicle.setInput({
            ...input,
            handbrake: input.handbrake ? 1 : 0,
          });
          this.vehicle.update(this.fixedTimeStep);
        }
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
        if (this.inputSystem) {
          this.inputSystem.update(deltaTime);
          const input = this.inputSystem.getInput();

          // Handle reset
          if (input.reset && this.vehicle && this.track) {
            const spawnPoint = this.track.getSpawnPoint();
            this.vehicle.reset(spawnPoint.position, spawnPoint.rotation);
            if (this.waypointSystem) {
              this.waypointSystem.reset();
            }
            console.log('Vehicle reset to spawn point');
          }

          // Handle pause
          if (input.pause) {
            this.setState(GameState.PAUSED);
          }
        }

        // Update waypoint system
        if (this.waypointSystem && this.vehicle) {
          const transform = this.vehicle.getTransform();
          const vehiclePos = transform.position;
          const vehicleForward = transform.forward;
          const waypointResult = this.waypointSystem.update(vehiclePos, vehicleForward);

          // Log waypoint events
          if (waypointResult.waypointPassed) {
            console.log(`Waypoint ${waypointResult.waypointId} passed`);
            if (waypointResult.timeBonus) {
              console.log(`Time bonus: +${waypointResult.timeBonus}s`);
            }
          }

          if (waypointResult.lapCompleted) {
            console.log(`Lap ${waypointResult.currentLap} completed! Progress: ${(this.waypointSystem.getProgress() * 100).toFixed(1)}%`);
          }

          if (waypointResult.raceFinished) {
            console.log('Race finished! All laps completed!');
            // TODO: Transition to RESULTS state (Phase 7)
          }

          if (waypointResult.wrongWay) {
            console.log('WRONG WAY! Turn around!');
            // TODO: Show wrong-way indicator UI (Phase 7)
          }
        }
        break;
      case GameState.PAUSED:
        // Minimal updates when paused
        // Handle unpause
        if (this.inputSystem) {
          this.inputSystem.update(deltaTime);
          const input = this.inputSystem.getInput();
          if (input.pause) {
            this.setState(GameState.PLAYING);
          }
        }
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
    // Update camera to follow vehicle (if available)
    if (this.vehicle && this.state === GameState.PLAYING) {
      const transform = this.vehicle.getTransform();
      this.cameraSystem.update(0.016, {
        position: transform.position,
        quaternion: transform.rotation, // FIX: VehicleTransform has 'rotation', not 'quaternion'
        velocity: transform.linearVelocity,
      });
    }

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

        // Initialize track and vehicle asynchronously
        this.initializeRace().catch(error => {
          console.error('Failed to initialize race:', error);
        });
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
        // Clean up vehicle and input system
        if (this.vehicle) {
          this.vehicle.dispose();
          this.vehicle = undefined;
        }
        if (this.inputSystem) {
          this.inputSystem.dispose();
          this.inputSystem = undefined;
        }
        // Clean up track and waypoint system
        if (this.track) {
          this.track.dispose();
          this.track = null;
        }
        if (this.waypointSystem) {
          this.waypointSystem = null;
        }
        console.log('Race cleanup complete');
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
   * Gets the vehicle instance (Phase 2).
   */
  getVehicle(): Vehicle | undefined {
    return this.vehicle;
  }

  /**
   * Gets the input system instance (Phase 2).
   */
  getInputSystem(): InputSystem | undefined {
    return this.inputSystem;
  }

  /**
   * Gets the track instance (Phase 3).
   */
  getTrack(): Track | null {
    return this.track;
  }

  /**
   * Gets the waypoint system instance (Phase 3).
   */
  getWaypointSystem(): WaypointSystem | null {
    return this.waypointSystem;
  }

  /**
   * Gets the camera system instance.
   */
  getCameraSystem(): CameraSystem {
    return this.cameraSystem;
  }

  /**
   * Loads track data from JSON file and converts waypoint format.
   * @param path - Path to track JSON file
   * @returns Promise resolving to TrackData
   */
  private async loadTrackData(path: string): Promise<TrackData> {
    try {
      // Add cache-busting timestamp for development
      const cacheBustedPath = `${path}?t=${Date.now()}`;
      const response = await fetch(cacheBustedPath);
      if (!response.ok) {
        throw new Error(`Failed to load track: ${path} - ${response.statusText}`);
      }

      const data: TrackData = await response.json();

      // Validate required fields
      if (!data.name || !data.sections || !data.waypoints || !data.spawnPoint) {
        throw new Error('Invalid track data: missing required fields');
      }

      console.log(`Track data loaded: ${data.name} (${data.sections.length} sections, ${data.waypoints.length} waypoints)`);
      return data;
    } catch (error) {
      console.error(`Error loading track data from ${path}:`, error);
      throw error;
    }
  }

  /**
   * Converts track waypoint data to WaypointSystem format.
   * @param trackData - Track data with waypoints as arrays
   * @returns Array of WaypointData with THREE.Vector3 objects
   */
  private convertWaypoints(trackData: TrackData): WaypointData[] {
    return trackData.waypoints.map(wp => ({
      id: wp.id,
      position: new THREE.Vector3(wp.position[0], wp.position[1], wp.position[2]),
      direction: new THREE.Vector3(wp.direction[0], wp.direction[1], wp.direction[2]),
      triggerRadius: wp.triggerRadius,
      isCheckpoint: wp.isCheckpoint,
      timeBonus: wp.timeBonus,
    }));
  }

  /**
   * Initializes race by loading track, creating vehicle at spawn point, and setting up waypoint system.
   * Called when entering PLAYING state.
   */
  private async initializeRace(): Promise<void> {
    try {
      console.log('Initializing race...');

      // Load track data (with leading slash for Vite public folder)
      const trackData = await this.loadTrackData('/assets/tracks/track01.json');

      // FIX: Check if state changed during async operation to prevent race condition
      if (this.state !== GameState.PLAYING) {
        console.log('Race initialization cancelled - state changed during track loading');
        return;
      }

      // Create track with visual mesh and physics collider
      this.track = new Track(trackData, this.physicsWorld, this.sceneManager.scene);

      // Get spawn point from track
      const spawnPoint = this.track.getSpawnPoint();

      // Create vehicle at spawn position
      this.vehicle = new Vehicle(
        this.physicsWorld.world,
        DEFAULT_VEHICLE_CONFIG
      );

      await this.vehicle.init(
        spawnPoint.position,
        spawnPoint.rotation,
        this.sceneManager.scene
      );

      // FIX: Check state again after second async operation
      if (this.state !== GameState.PLAYING) {
        console.log('Race initialization cancelled - state changed during vehicle initialization');
        // Clean up partially initialized resources
        if (this.vehicle) {
          this.vehicle.dispose();
          this.vehicle = undefined;
        }
        if (this.track) {
          this.track.dispose();
          this.track = null;
        }
        return;
      }

      // Create input system
      this.inputSystem = new InputSystem();

      // Convert waypoints and create waypoint system
      const waypoints = this.convertWaypoints(trackData);
      this.waypointSystem = new WaypointSystem(waypoints);
      this.waypointSystem.setMaxLaps(2); // Default: 2 laps

      console.log('✅ Race initialized successfully!');
      console.log(`✅ Vehicle spawned at: (${spawnPoint.position.x.toFixed(2)}, ${spawnPoint.position.y.toFixed(2)}, ${spawnPoint.position.z.toFixed(2)})`);
      console.log(`✅ Track: ${trackData.name}, Waypoints: ${waypoints.length}, Max Laps: ${this.waypointSystem.getMaxLaps()}`);
      console.log(`✅ Track mesh has ${this.track.getMesh().geometry.attributes.position.count} vertices`);
      console.log('🎮 Game is ready to play!');
    } catch (error) {
      console.error('❌ CRITICAL ERROR: Failed to initialize race:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      // Don't rethrow - let the game continue with test scene
      alert(`Failed to load track: ${error instanceof Error ? error.message : String(error)}\n\nCheck console for details.`);
    }
  }

  /**
   * Stops the game loop and cleans up resources.
   */
  stop(): void {
    this.running = false;
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    // Cleanup Phase 2 systems
    if (this.vehicle) {
      this.vehicle.dispose();
    }
    if (this.inputSystem) {
      this.inputSystem.dispose();
    }

    // Cleanup Phase 3 systems
    if (this.track) {
      this.track.dispose();
      this.track = null;
    }
    if (this.waypointSystem) {
      this.waypointSystem = null;
    }
  }
}
