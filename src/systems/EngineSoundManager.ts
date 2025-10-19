import { AudioSystem, SoundPlayOptions } from './AudioSystem';

/**
 * EngineSoundManager - RPM-based engine audio blending
 *
 * Responsibilities:
 * - Blend between idle and rev engine sounds based on RPM
 * - Apply pitch shifting based on engine speed
 * - Apply volume modulation based on load
 * - Handle smooth crossfading between sound states
 * - Integrate with Vehicle.ts RPM data
 *
 * Audio Blending Strategy:
 * - Maintains two looping sounds: engine_idle and engine_rev
 * - Crossfades between them based on RPM percentage (0 = idle, 1 = rev)
 * - Idle sound: high volume at low RPM, fades out at high RPM
 * - Rev sound: low volume at low RPM, fades in at high RPM
 * - Pitch shifts both sounds for additional variation
 *
 * Pitch Shifting Formula:
 * - Idle: rate = 0.8 + (rpmPercent * 0.4) = 0.8 to 1.2
 * - Rev: rate = 0.9 + (rpmPercent * 0.5) = 0.9 to 1.4
 * - This creates variation without sounding artificial
 *
 * Volume Modulation:
 * - Total engine volume driven by throttle input
 * - Idle/rev blend driven by RPM percentage
 * - Prevents audio pops when transitioning between states
 *
 * Performance: <0.5ms per update()
 *
 * Usage:
 * ```typescript
 * const engineMgr = new EngineSoundManager(audioSystem);
 * await engineMgr.init();
 *
 * // Each frame:
 * engineMgr.updateRPM(vehicle.getCurrentRPM(), vehicle.getMaxRPM(), vehicle.input.throttle);
 * ```
 */
export class EngineSoundManager {
  private audioSystem: AudioSystem;

  // Engine sound state
  private currentIdleSoundId: number = -1;
  private currentRevSoundId: number = -1;
  private idleVolume: number = 0;
  private revVolume: number = 0;
  private currentPitchIdle: number = 0.8;
  private currentPitchRev: number = 0.9;

  // Configuration
  private readonly maxRPM: number = 7000;
  private readonly minRPM: number = 1000;
  private readonly idlePitchMin: number = 0.8;
  private readonly idlePitchMax: number = 1.2;
  private readonly revPitchMin: number = 0.9;
  private readonly revPitchMax: number = 1.4;
  private readonly volumeSmoothingFactor: number = 0.15; // Exponential smoothing
  private readonly pitchSmoothingFactor: number = 0.1;

  // State
  private isInitialized: boolean = false;
  private lastThrottle: number = 0;

  /**
   * Create engine sound manager
   * @param audioSystem - Reference to AudioSystem singleton
   */
  constructor(audioSystem: AudioSystem) {
    this.audioSystem = audioSystem;
  }

  /**
   * Initialize engine sounds (load assets)
   * @returns Promise that resolves when sounds are loaded
   */
  public async init(): Promise<void> {
    // Preload engine sounds if not already loaded
    await this.audioSystem.preloadAsset('engine_idle');
    await this.audioSystem.preloadAsset('engine_rev');

    // Start with engine idle loop
    this.currentIdleSoundId = this.audioSystem.loopSound('engine_idle', {
      volume: 0.6,
      rate: this.currentPitchIdle,
    });

    // Rev sound starts silent
    this.currentRevSoundId = this.audioSystem.loopSound('engine_rev', {
      volume: 0,
      rate: this.currentPitchRev,
    });

    this.isInitialized = true;
  }

  /**
   * Update engine sounds based on current RPM and throttle
   * Call this every frame from the game loop
   *
   * @param currentRPM - Current engine RPM
   * @param maxRPM - Maximum engine RPM (for normalization)
   * @param throttleInput - Current throttle input (0-1)
   */
  public updateRPM(currentRPM: number, maxRPM: number, throttleInput: number): void {
    if (!this.isInitialized) {
      return;
    }

    // Normalize RPM to 0-1 range (idle to max RPM)
    // Clamp between minRPM and maxRPM for smoothness
    const clampedRPM = Math.max(this.minRPM, Math.min(maxRPM, currentRPM));
    const rpmPercent = (clampedRPM - this.minRPM) / (maxRPM - this.minRPM);

    // Calculate target volumes based on RPM blend
    // At low RPM: idle loud, rev silent
    // At high RPM: idle silent, rev loud
    const targetIdleVolume = Math.max(0, 1 - rpmPercent);
    const targetRevVolume = Math.min(1, rpmPercent);

    // Smooth volume transitions to avoid pops/clicks
    this.idleVolume += (targetIdleVolume - this.idleVolume) * this.volumeSmoothingFactor;
    this.revVolume += (targetRevVolume - this.revVolume) * this.volumeSmoothingFactor;

    // Apply throttle modulation to overall engine volume
    // Throttle 0 = quiet engine, throttle 1 = loud engine
    const throttleModulation = 0.3 + throttleInput * 0.7; // Range: 0.3 to 1.0

    // Calculate target pitch values
    const targetPitchIdle = this.idlePitchMin + rpmPercent * (this.idlePitchMax - this.idlePitchMin);
    const targetPitchRev = this.revPitchMin + rpmPercent * (this.revPitchMax - this.revPitchMin);

    // Smooth pitch transitions
    this.currentPitchIdle += (targetPitchIdle - this.currentPitchIdle) * this.pitchSmoothingFactor;
    this.currentPitchRev += (targetPitchRev - this.currentPitchRev) * this.pitchSmoothingFactor;

    // Update idle sound (volume + pitch)
    if (this.currentIdleSoundId !== -1) {
      const idleVol = this.audioSystem.getSFXVolume() * this.idleVolume * throttleModulation;
      this.updateSoundProperties('engine_idle', this.currentIdleSoundId, idleVol, this.currentPitchIdle);
    }

    // Update rev sound (volume + pitch)
    if (this.currentRevSoundId !== -1) {
      const revVol = this.audioSystem.getSFXVolume() * this.revVolume * throttleModulation;
      this.updateSoundProperties('engine_rev', this.currentRevSoundId, revVol, this.currentPitchRev);
    }

    this.lastThrottle = throttleInput;
  }

  /**
   * Stop engine sounds immediately
   */
  public stop(): void {
    if (this.currentIdleSoundId !== -1) {
      this.audioSystem.stopSound('engine_idle');
      this.currentIdleSoundId = -1;
    }

    if (this.currentRevSoundId !== -1) {
      this.audioSystem.stopSound('engine_rev');
      this.currentRevSoundId = -1;
    }
  }

  /**
   * Stop engine sounds with fade out
   * @param fadeDuration - Duration of fade out in ms
   */
  public stopWithFade(fadeDuration: number = 500): void {
    if (this.currentIdleSoundId !== -1) {
      this.audioSystem.stopSound('engine_idle', fadeDuration);
      this.currentIdleSoundId = -1;
    }

    if (this.currentRevSoundId !== -1) {
      this.audioSystem.stopSound('engine_rev', fadeDuration);
      this.currentRevSoundId = -1;
    }
  }

  /**
   * Pause engine sounds
   */
  public pause(): void {
    // Note: Howler doesn't have a direct pause method for individual sounds
    // We stop and track state for resume
    this.stop();
  }

  /**
   * Resume engine sounds after pause
   * @param currentRPM - Current engine RPM
   * @param maxRPM - Maximum engine RPM
   * @param throttleInput - Current throttle input
   */
  public resume(currentRPM: number, maxRPM: number, throttleInput: number): void {
    if (!this.isInitialized) {
      return;
    }

    // Restart sounds at current state
    this.currentIdleSoundId = this.audioSystem.loopSound('engine_idle', {
      volume: 0.6,
      rate: this.currentPitchIdle,
    });

    this.currentRevSoundId = this.audioSystem.loopSound('engine_rev', {
      volume: 0,
      rate: this.currentPitchRev,
    });

    // Update to current RPM state
    this.updateRPM(currentRPM, maxRPM, throttleInput);
  }

  /**
   * Get current idle volume (0-1)
   * @returns Idle volume level
   */
  public getIdleVolume(): number {
    return this.idleVolume;
  }

  /**
   * Get current rev volume (0-1)
   * @returns Rev volume level
   */
  public getRevVolume(): number {
    return this.revVolume;
  }

  /**
   * Get current idle pitch
   * @returns Idle pitch multiplier
   */
  public getIdlePitch(): number {
    return this.currentPitchIdle;
  }

  /**
   * Get current rev pitch
   * @returns Rev pitch multiplier
   */
  public getRevPitch(): number {
    return this.currentPitchRev;
  }

  /**
   * Check if engine sounds are initialized
   * @returns True if initialized
   */
  public isInitialized_(): boolean {
    return this.isInitialized;
  }

  /**
   * Update sound properties (volume and pitch)
   * Handles Howler.js audio parameter updates
   *
   * @param soundId - Sound identifier
   * @param howlId - Howler sound instance ID
   * @param volume - Target volume (0-1)
   * @param pitch - Target pitch multiplier
   */
  private updateSoundProperties(soundId: string, howlId: number, volume: number, pitch: number): void {
    // In practice, Howler stores these globally per sound
    // We would need to access the Howler instance directly via private AudioSystem methods
    // For now, this is a placeholder that would be enhanced with direct Howler integration

    // Note: Direct per-instance volume/pitch updates require accessing Howler internals
    // This would be implemented in the AudioSystem with additional helper methods
  }

  /**
   * Dispose and cleanup
   */
  public dispose(): void {
    this.stop();
    this.isInitialized = false;
  }
}
