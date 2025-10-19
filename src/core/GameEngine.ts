import { SceneManager } from './SceneManager';
import { PhysicsWorld } from './PhysicsWorld';
import { StateManager } from './StateManager';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { Vehicle } from '../entities/Vehicle';
import { InputSystem } from '../systems/InputSystem';
import { CameraSystem } from '../systems/CameraSystem';
import { TimerSystem, TimerEvent } from '../systems/TimerSystem';
import { LeaderboardSystem } from '../systems/LeaderboardSystem';
import { StatisticsSystem } from '../systems/StatisticsSystem';
import { DEFAULT_VEHICLE_CONFIG } from '../config/PhysicsConfig';
import { Track, TrackData } from '../entities/Track';
import { WaypointSystem, WaypointData } from '../systems/WaypointSystem';
import { CrashManager, CrashEvent } from '../systems/CrashManager';
import { ReplayRecorder } from '../systems/ReplayRecorder';
import { ReplayPlayer } from '../systems/ReplayPlayer';
import { GhostRecorder } from '../systems/GhostRecorder';
import { GhostManager } from '../systems/GhostManager';
import { AudioSystem } from '../systems/AudioSystem';
import { EngineSoundManager } from '../systems/EngineSoundManager';
import { UISystem, UIPanel } from '../systems/UISystem';
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

  // Phase 4: Crash and Replay System
  private crashManager: CrashManager | null = null;
  private replayRecorder: ReplayRecorder | null = null;
  private replayPlayer: ReplayPlayer | null = null;

  // Phase 5A: Timer System
  private timerSystem: TimerSystem;

  // Phase 5B: Leaderboard and Statistics
  private leaderboardSystem: LeaderboardSystem;
  private statisticsSystem: StatisticsSystem;

  // Phase 6: Ghost AI System
  private ghostRecorder: GhostRecorder | null = null;
  private ghostManager: GhostManager | null = null;

  // Phase 7A: UI System
  private uiSystem: UISystem | null = null;

  // Phase 7B: Audio System
  private audioSystem: AudioSystem | null = null;
  private engineSoundManager: EngineSoundManager | null = null;

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
    this.timerSystem = TimerSystem.getInstance();
    this.leaderboardSystem = LeaderboardSystem.getInstance();
    this.statisticsSystem = StatisticsSystem.getInstance();

    // Subscribe to timer events
    this.timerSystem.subscribe((event: TimerEvent, data?: any) => {
      this.handleTimerEvent(event, data);
    });

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

      // Phase 7B: Initialize Audio System
      this.audioSystem = AudioSystem.getInstance();
      await this.audioSystem.init();
      this.engineSoundManager = new EngineSoundManager(this.audioSystem);
      await this.engineSoundManager.init();
      console.log('✅ Audio system initialized');

      // Phase 7A: Initialize UI System
      this.uiSystem = UISystem.getInstance();
      this.uiSystem.init();
      this.setupUIEventHandlers();
      console.log('✅ UI system initialized');

      this.running = true;
      this.lastTime = performance.now();

      // Transition from LOADING to MENU
      this.setState(GameState.MENU);

      // Show main menu
      if (this.uiSystem) {
        this.uiSystem.showPanel(UIPanel.MAIN_MENU);
      }

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

          // Handle pause input
          if (input.pause) {
            this.setState(GameState.PAUSED);
            this.uiSystem?.showPanel(UIPanel.PAUSE_MENU);
          }

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
   * Handles crash replay trigger event from CrashManager.
   * Sets up replay playback with appropriate timing and camera mode.
   *
   * @param crashEvent - Crash event that triggered the replay
   */
  private handleCrashReplayTrigger(crashEvent: CrashEvent): void {
    if (!this.replayRecorder) {
      console.warn('Cannot trigger replay: recorder not initialized');
      return;
    }

    // Get the replay buffer (all recorded frames so far)
    const frames = this.replayRecorder.getReplayBuffer();
    if (frames.length === 0) {
      console.warn('Cannot trigger replay: no frames recorded');
      return;
    }

    // Create replay player with recorded frames
    this.replayPlayer = new ReplayPlayer(frames);

    // Calculate start time for replay (try to show last 10 seconds, or from start)
    const replayDuration = this.replayRecorder.getReplayDuration();
    const lookbackSeconds = Math.min(10, replayDuration);
    const replayStartTime = Math.max(0, replayDuration - lookbackSeconds);

    // Start playback from calculated time
    this.replayPlayer.startPlayback();

    // Switch camera to crash replay mode
    // Adapt CrashManager's CrashEvent to CameraSystem's CrashEvent format
    // Map CrashSeverity enum to string severity for camera system
    const cameraCrashEvent = {
      timestamp: crashEvent.timestamp,
      position: crashEvent.position,
      velocity: crashEvent.velocity,
      impactForce: crashEvent.impactForce,
      severity: crashEvent.severity === 'minor' || crashEvent.severity === 'major' || crashEvent.severity === 'catastrophic'
        ? (crashEvent.severity as 'minor' | 'major' | 'catastrophic')
        : 'major', // Default to 'major' if severity doesn't match
    };

    this.cameraSystem.startCrashReplay(cameraCrashEvent);

    // Disable crash detection during replay
    if (this.crashManager) {
      this.crashManager.setEnabled(false);
    }

    console.log(`Replay triggered: ${frames.length} frames (${replayDuration.toFixed(1)}s), starting from ${replayStartTime.toFixed(1)}s`);
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

        // Update crash detection (Phase 4)
        if (this.crashManager && this.vehicle) {
          const elapsedTime = this.getElapsedTime();
          this.crashManager.update(deltaTime, elapsedTime);
        }

        // Record frame for replay (Phase 4)
        if (this.replayRecorder && this.vehicle) {
          this.replayRecorder.recordFrame(this.vehicle, this.sceneManager.camera, deltaTime);
        }

        // Update Ghost AI (Phase 6)
        if (this.ghostRecorder && this.vehicle) {
          this.ghostRecorder.recordFrame(this.vehicle);
        }
        if (this.ghostManager) {
          this.ghostManager.update(deltaTime);
        }

        // Update Engine Sound (Phase 7B)
        if (this.engineSoundManager && this.vehicle) {
          const telemetry = this.vehicle.getTelemetry();
          const input = this.inputSystem?.getInput();
          this.engineSoundManager.updateRPM(
            telemetry.rpm, // Fixed: rpm not engineRPM
            7000, // Max RPM
            input?.throttle || 0
          );
        }

        // Update HUD (Phase 7A)
        if (this.uiSystem && this.vehicle && this.state === GameState.PLAYING) {
          const telemetry = this.vehicle.getTelemetry();
          const damageState = this.vehicle.getDamageState();
          const maxLaps = this.waypointSystem?.getMaxLaps() || 3;

          this.uiSystem.updateHUD({
            speed: telemetry.speedMph,
            lapTime: this.timerSystem.getFormattedRaceTime(),
            currentLap: this.timerSystem.getCurrentLap(),
            maxLaps,
            position: 1, // TODO: Get from race position system
            damage: damageState.overallDamage,
          });
        }

        // Update waypoint system (BEFORE timer system)
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
              // Integrate with Timer System (Phase 5A)
              this.timerSystem.onCheckpointPassed(waypointResult.timeBonus);
            }
          }

          if (waypointResult.lapCompleted) {
            console.log(`Lap ${waypointResult.currentLap} completed! Progress: ${(this.waypointSystem.getProgress() * 100).toFixed(1)}%`);
            // Integrate with Timer System (Phase 5A)
            this.timerSystem.onLapCompleted();
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

        // Update timer system (Phase 5A) - AFTER waypoint system
        this.timerSystem.update(deltaTime);

        // Update statistics system (Phase 5B)
        if (this.vehicle) {
          const transform = this.vehicle.getTransform();
          const speed = transform.linearVelocity.length();
          this.statisticsSystem.recordSpeed(speed);
        }
        this.statisticsSystem.recordPlayTime(deltaTime);

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
        // Transition from CRASHED to REPLAY happens in handleCrashReplayTrigger
        // This state is brief and mainly used for state machine flow
        break;
      case GameState.REPLAY:
        // Update replay playback (Phase 4)
        if (this.replayPlayer && this.vehicle) {
          const interpolatedFrame = this.replayPlayer.update(deltaTime);

          if (interpolatedFrame) {
            // Apply interpolated frame to vehicle (kinematic mode)
            this.vehicle.applyReplayFrame(interpolatedFrame);
          } else {
            // Replay finished - respawn vehicle and return to playing
            if (this.crashManager) {
              this.crashManager.respawnVehicle();
              this.crashManager.setEnabled(true); // Re-enable crash detection
            }

            // Clean up replay player
            if (this.replayPlayer) {
              this.replayPlayer.dispose();
              this.replayPlayer = null;
            }

            // Stop crash replay camera and return to normal
            this.cameraSystem.stopCrashReplay();

            // Transition back to PLAYING state
            this.setState(GameState.PLAYING);
          }
        }

        // Handle skip replay input
        if (this.inputSystem) {
          this.inputSystem.update(deltaTime);
          const input = this.inputSystem.getInput();
          if (input.skipReplay) {
            // Skip remaining replay
            if (this.replayPlayer) {
              this.replayPlayer.skip();
            }

            // Clean up
            if (this.replayPlayer) {
              this.replayPlayer.dispose();
              this.replayPlayer = null;
            }

            // Re-enable crash detection and respawn
            if (this.crashManager) {
              this.crashManager.respawnVehicle();
              this.crashManager.setEnabled(true);
            }

            // Stop replay camera
            this.cameraSystem.stopCrashReplay();

            // Return to playing
            this.setState(GameState.PLAYING);
          }
        }
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
        quaternion: transform.rotation,
        velocity: transform.linearVelocity,
      });
    }

    // CRITICAL FIX: Update environment system (clouds, scenery) before rendering
    this.sceneManager.update(0.016);

    // Render the scene
    this.sceneManager.render();
  }

  /**
   * Handles timer system events and coordinates state transitions
   * @param event - TimerEvent type
   * @param data - Optional event data
   */
  private handleTimerEvent(event: TimerEvent, data?: any): void {
    switch (event) {
      case TimerEvent.TIME_EXPIRED:
        // Transition to results when time runs out
        console.log('Time expired! Transitioning to results screen.');
        this.setState(GameState.RESULTS);
        break;
      case TimerEvent.CHECKPOINT_BONUS:
        console.log(`Checkpoint bonus: +${data?.timeBonus}s`);
        break;
      case TimerEvent.LAP_COMPLETE:
        console.log(`Lap complete: ${this.timerSystem.formatTime(data?.lapTime)}`);
        break;
      case TimerEvent.PENALTY_APPLIED:
        console.log(`Penalty applied: -${data?.penaltySeconds}s`);
        break;
      case TimerEvent.RACE_STARTED:
      case TimerEvent.RACE_PAUSED:
      case TimerEvent.RACE_RESUMED:
        // These are logged but don't require state changes
        break;
    }
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
   * Gets elapsed time since game start in seconds.
   * Used for crash detection timing and other time-sensitive systems.
   */
  private getElapsedTime(): number {
    return (performance.now() - (this.lastTime - (performance.now() - this.lastTime))) / 1000;
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

        // Start or resume timer (Phase 5A)
        if (this.timerSystem.isPaused()) {
          this.timerSystem.resume();
        } else {
          this.timerSystem.start();
        }

        // Initialize track and vehicle asynchronously
        this.initializeRace().catch(error => {
          console.error('Failed to initialize race:', error);
        });
        break;
      case GameState.PAUSED:
        // Show pause menu
        // Pause timer (Phase 5A)
        this.timerSystem.pause();
        break;
      case GameState.CRASHED:
        // Trigger crash effects
        // Note: State transition to REPLAY happens in CrashManager via handleCrashReplayTrigger
        break;
      case GameState.REPLAY:
        // Replay playback is already started in handleCrashReplayTrigger
        // This state handler manages playback loop updates
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
        // Stop and reset timer (Phase 5A)
        this.timerSystem.stop();

        // Clean up Phase 4 systems (Crash & Replay)
        if (this.crashManager) {
          this.crashManager.dispose();
          this.crashManager = null;
        }
        if (this.replayRecorder) {
          this.replayRecorder.dispose();
          this.replayRecorder = null;
        }
        if (this.replayPlayer) {
          this.replayPlayer.dispose();
          this.replayPlayer = null;
        }

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
        // Cleanup crash effects (brief state, most cleanup happens in REPLAY state)
        break;
      case GameState.REPLAY:
        // Stop replay
        if (this.replayPlayer) {
          this.replayPlayer.dispose();
          this.replayPlayer = null;
        }
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
   * Sets up UI event handlers for buttons and interactions
   */
  private setupUIEventHandlers(): void {
    if (!this.uiSystem) return;

    // Main Menu - Start button
    this.uiSystem.onButtonClick('btn-start', async () => {
      console.log('Start button clicked');
      await this.initializeRace();
      this.setState(GameState.PLAYING);
      this.uiSystem?.showPanel(UIPanel.HUD);
    });

    // Keyboard shortcut: SPACE to start from menu
    window.addEventListener('keydown', async (e) => {
      if (e.code === 'Space' && this.state === GameState.MENU) {
        e.preventDefault();
        console.log('Space pressed - starting race');
        await this.initializeRace();
        this.setState(GameState.PLAYING);
        this.uiSystem?.showPanel(UIPanel.HUD);
      }
    });

    // Main Menu - Leaderboard button
    this.uiSystem.onButtonClick('btn-leaderboard', () => {
      console.log('Leaderboard button clicked');
      // TODO: Show leaderboard panel
    });

    // Main Menu - Settings button
    this.uiSystem.onButtonClick('btn-settings', () => {
      console.log('Settings button clicked');
      // TODO: Show settings panel
    });

    // Pause Menu - Resume button
    this.uiSystem.onButtonClick('btn-resume', () => {
      console.log('Resume button clicked');
      this.setState(GameState.PLAYING);
      this.uiSystem?.showPanel(UIPanel.HUD);
    });

    // Pause Menu - Restart button
    this.uiSystem.onButtonClick('btn-restart', async () => {
      console.log('Restart button clicked');
      await this.initializeRace();
      this.setState(GameState.PLAYING);
      this.uiSystem?.showPanel(UIPanel.HUD);
    });

    // Pause Menu - Quit button
    this.uiSystem.onButtonClick('btn-quit', () => {
      console.log('Quit button clicked');
      this.setState(GameState.MENU);
      this.uiSystem?.showPanel(UIPanel.MAIN_MENU);
    });

    // Results - Race Again button
    this.uiSystem.onButtonClick('btn-race-again', async () => {
      console.log('Race again button clicked');
      await this.initializeRace();
      this.setState(GameState.PLAYING);
      this.uiSystem?.showPanel(UIPanel.HUD);
    });

    // Results - Main Menu button
    this.uiSystem.onButtonClick('btn-main-menu', () => {
      console.log('Main menu button clicked');
      this.setState(GameState.MENU);
      this.uiSystem?.showPanel(UIPanel.MAIN_MENU);
    });

    console.log('UI event handlers set up');
  }

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
   * Gets the crash manager instance (Phase 4).
   */
  getCrashManager(): CrashManager | null {
    return this.crashManager;
  }

  /**
   * Gets the replay recorder instance (Phase 4).
   */
  getReplayRecorder(): ReplayRecorder | null {
    return this.replayRecorder;
  }

  /**
   * Gets the replay player instance (Phase 4).
   */
  getReplayPlayer(): ReplayPlayer | null {
    return this.replayPlayer;
  }

  /**
   * Gets the timer system instance (Phase 5A).
   */
  getTimerSystem(): TimerSystem {
    return this.timerSystem;
  }

  /**
   * Gets the LeaderboardSystem singleton instance
   * @returns The LeaderboardSystem
   */
  getLeaderboardSystem(): LeaderboardSystem {
    return this.leaderboardSystem;
  }

  /**
   * Gets the StatisticsSystem singleton instance
   * @returns The StatisticsSystem
   */
  getStatisticsSystem(): StatisticsSystem {
    return this.statisticsSystem;
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

      // Phase 4: Initialize crash and replay systems
      this.crashManager = new CrashManager();
      this.crashManager.init(
        this.vehicle,
        this.track,
        (state: GameState) => this.setState(state)
      );

      // Wire up crash event listener for replay triggering
      this.crashManager.onReplayTrigger((crashEvent: CrashEvent) => {
        this.handleCrashReplayTrigger(crashEvent);
      });

      // Initialize replay recorder
      this.replayRecorder = new ReplayRecorder();
      this.replayRecorder.startRecording();

      // Phase 6: Initialize Ghost AI System
      this.ghostRecorder = GhostRecorder.getInstance();
      this.ghostRecorder.startRecording('track01'); // TODO: Use dynamic track ID

      this.ghostManager = GhostManager.getInstance();
      // Load best lap ghost from leaderboard if available
      const ghostData = this.leaderboardSystem.getGhostData(1); // Rank 1 = best time
      if (ghostData) {
        // Spawn ghost for rank 1
        this.ghostManager.spawnGhosts(this.sceneManager.scene, [1]);
        console.log('✅ Loaded ghost for rank 1');
      }

      console.log('✅ Race initialized successfully!');
      console.log(`✅ Vehicle spawned at: (${spawnPoint.position.x.toFixed(2)}, ${spawnPoint.position.y.toFixed(2)}, ${spawnPoint.position.z.toFixed(2)})`);
      console.log(`✅ Track: ${trackData.name}, Waypoints: ${waypoints.length}, Max Laps: ${this.waypointSystem.getMaxLaps()}`);
      console.log(`✅ Track mesh has ${this.track.getMesh().geometry.attributes.position.count} vertices`);
      console.log('✅ Crash & Replay systems initialized!');
      console.log('Game is ready to play!');
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

    // Cleanup Phase 7B: Audio systems
    if (this.engineSoundManager) {
      this.engineSoundManager.dispose();
      this.engineSoundManager = null;
    }
    if (this.audioSystem) {
      this.audioSystem.dispose();
      this.audioSystem = null;
    }

    // Cleanup Phase 7A: UI system
    if (this.uiSystem) {
      this.uiSystem.dispose();
      this.uiSystem = null;
    }

    // Cleanup Phase 6: Ghost systems
    if (this.ghostManager) {
      this.ghostManager.disposeAllGhosts();
      // Note: Don't set to null since it's a singleton
    }
    if (this.ghostRecorder) {
      this.ghostRecorder.clear();
      // Note: Don't set to null since it's a singleton
    }

    // Cleanup Phase 4 systems
    if (this.crashManager) {
      this.crashManager.dispose();
      this.crashManager = null;
    }
    if (this.replayRecorder) {
      this.replayRecorder.dispose();
      this.replayRecorder = null;
    }
    if (this.replayPlayer) {
      this.replayPlayer.dispose();
      this.replayPlayer = null;
    }

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
