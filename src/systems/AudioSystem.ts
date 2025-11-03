import { Howl, Howler } from 'howler';
import { Vector3 } from 'three';

export interface AudioAsset {
  id: string;
  path: string;
  preload: boolean;
  loop?: boolean;
  volume?: number;
  sprite?: Record<string, [number, number]>;
}

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
}

export interface SoundPlayOptions {
  volume?: number;
  rate?: number;
  loop?: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

export interface SpatialSoundOptions extends SoundPlayOptions {
  maxDistance?: number;
  rolloff?: number;
}

/**
 * AudioSystem - Core audio management with Howler.js integration
 *
 * Responsibilities:
 * - Manage all game audio (SFX, music, engine sounds)
 * - Implement master/SFX/music volume controls
 * - Handle spatial 3D audio positioning
 * - Manage sound asset loading and lifecycle
 * - Implement music crossfading
 * - Persist audio settings to localStorage
 *
 * Performance Target: <1ms per frame for audio updates
 * Memory Budget: <50MB total audio
 *
 * Design Pattern: Singleton
 *
 * Usage:
 * ```typescript
 * const audio = AudioSystem.getInstance();
 * await audio.init();
 * audio.playSound('crash_major');
 * audio.setMasterVolume(0.8);
 * ```
 */
export class AudioSystem {
  private static instance: AudioSystem | null = null;

  private readonly storageKey: string = 'harddriving_audio';
  private readonly maxConcurrentSounds: number = 10;
  private readonly defaultAssetPath: string = 'assets/audio/';

  private soundLibrary: Map<string, Howl> = new Map();
  private sounds: Map<string, Howl> = new Map();
  private currentMusic: Howl | null = null;
  private currentMusicFade: ReturnType<typeof setTimeout> | null = null;

  private settings: AudioSettings = {
    masterVolume: 0.8,
    sfxVolume: 0.7,
    musicVolume: 0.5,
  };

  private listenerPosition: Vector3 = new Vector3(0, 0, 0);
  private tempVector: Vector3 = new Vector3();

  private activeSounds: Map<string, number> = new Map();
  private playingSounds: Map<string, number> = new Map();
  private soundPriority: Map<string, number> = new Map();

  private initialized: boolean = false;
  private loadingPromise: Promise<void> | null = null;

  private constructor() {
    this.setupAudioContext();
    this.defineSoundPriorities();
    this.loadSettings();
  }

  public static getInstance(): AudioSystem {
    if (!AudioSystem.instance) {
      AudioSystem.instance = new AudioSystem();
    }
    return AudioSystem.instance;
  }

  public static resetInstance(): void {
    if (AudioSystem.instance) {
      AudioSystem.instance.dispose();
      AudioSystem.instance = null;
    }
  }

  private setupAudioContext(): void {
    Howler.mute(false);
  }

  private defineSoundPriorities(): void {
    this.soundPriority.set('crash_major', 100);
    this.soundPriority.set('crash_minor', 95);
    this.soundPriority.set('crash_catastrophic', 100);
    this.soundPriority.set('checkpoint', 90);
    this.soundPriority.set('engine_idle', 80);
    this.soundPriority.set('engine_rev', 80);
    this.soundPriority.set('tire_squeal', 75);
    this.soundPriority.set('offroad', 50);
    this.soundPriority.set('countdown', 70);
    this.soundPriority.set('ui_click', 30);
    this.soundPriority.set('ui_confirm', 30);
    this.soundPriority.set('menu_music', 20);
    this.soundPriority.set('race_music', 20);
  }

  public async init(assets?: AudioAsset[]): Promise<void> {
    if (this.initialized) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        const assetsToLoad = assets || this.getDefaultAssets();
        const preloadAssets = assetsToLoad.filter((a) => a.preload);
        await Promise.all(preloadAssets.map((asset) => this.loadAsset(asset)));

        const lazyAssets = assetsToLoad.filter((a) => !a.preload);
        lazyAssets.forEach((asset) => {
          this.registerAsset(asset);
        });

        this.initialized = true;
      } catch (error) {
        console.error('AudioSystem initialization failed:', error);
        this.initialized = true;
      }
    })();

    return this.loadingPromise;
  }

  private getDefaultAssets(): AudioAsset[] {
    return [
      { id: 'engine_idle', path: 'engine/engine_idle.ogg', preload: true, loop: true, volume: 0.6 },
      { id: 'engine_rev', path: 'engine/engine_rev.ogg', preload: true, loop: true, volume: 0.7 },
      { id: 'tire_squeal', path: 'sfx/tire_squeal.ogg', preload: true, loop: true, volume: 0.5 },
      { id: 'crash_minor', path: 'sfx/crash_minor.ogg', preload: true, loop: false, volume: 0.7 },
      { id: 'crash_major', path: 'sfx/crash_major.ogg', preload: true, loop: false, volume: 0.8 },
      { id: 'crash_catastrophic', path: 'sfx/crash_catastrophic.ogg', preload: true, loop: false, volume: 0.9 },
      { id: 'ui_click', path: 'sfx/ui_click.ogg', preload: false, loop: false, volume: 0.5 },
      { id: 'ui_confirm', path: 'sfx/ui_confirm.ogg', preload: false, loop: false, volume: 0.6 },
      { id: 'checkpoint', path: 'sfx/checkpoint.ogg', preload: false, loop: false, volume: 0.7 },
      { id: 'countdown', path: 'sfx/countdown.ogg', preload: false, loop: false, volume: 0.6 },
      { id: 'offroad', path: 'sfx/offroad.ogg', preload: false, loop: true, volume: 0.4 },
      { id: 'menu_music', path: 'music/menu_music.mp3', preload: false, loop: true, volume: 0.5 },
      { id: 'race_music', path: 'music/race_music.mp3', preload: false, loop: true, volume: 0.5 },
    ];
  }

  /**
   * Get composite key for sound tracking (soundId_instanceId)
   * @param soundId - Sound identifier
   * @param category - Sound category
   * @returns Composite key for tracking
   */
  public getSoundKey(soundId: string, category: string): string {
    return `${soundId}_${category}`;
  }

  private async loadAsset(asset: AudioAsset): Promise<void> {
    return new Promise((resolve) => {
      const howl = new Howl({
        src: [this.defaultAssetPath + asset.path],
        loop: asset.loop ?? false,
        volume: asset.volume ?? 1.0,
        preload: true as any,
        onload: () => {
          this.soundLibrary.set(asset.id, howl);
          this.sounds.set(asset.id, howl);
          resolve();
        },
        onloaderror: () => {
          console.warn(`Failed to load audio asset: ${asset.id}`);
          resolve();
        },
      });
    });
  }

  private registerAsset(asset: AudioAsset): void {
    const howl = new Howl({
      src: [this.defaultAssetPath + asset.path],
      loop: asset.loop ?? false,
      volume: asset.volume ?? 1.0,
      preload: false,
      onloaderror: () => {
        console.warn(`Failed to load audio asset: ${asset.id}`);
      },
    });
    this.soundLibrary.set(asset.id, howl);
    this.sounds.set(asset.id, howl);
  }

  public playSound(soundId: string, options?: SoundPlayOptions): number {
    if (!this.initialized) {
      console.warn('AudioSystem not initialized');
      return -1;
    }

    const howl = this.soundLibrary.get(soundId);
    if (!howl) {
      console.warn(`Sound not found: ${soundId}`);
      return -1;
    }

    if (this.activeSounds.size >= this.maxConcurrentSounds) {
      const lowestId = this.findLowestPrioritySoundToStop();
      if (lowestId !== -1) {
        howl.stop(lowestId);
        this.activeSounds.delete(soundId);
      }
    }

    if (options?.volume !== undefined) {
      howl.volume(options.volume);
    }
    if (options?.rate !== undefined) {
      howl.rate(options.rate);
    }

    const soundId_ = howl.play();
    const priority = this.soundPriority.get(soundId) ?? 50;
    this.activeSounds.set(`${soundId}_${soundId_}`, priority);

    if (options?.fadeIn) {
      howl.fade(0, howl.volume(), options.fadeIn, soundId_);
    }

    return soundId_;
  }

  public loopSound(soundId: string, options?: SoundPlayOptions): number {
    return this.playSound(soundId, { ...options, loop: true });
  }

  /**
   * Stop a sound by ID with optional fade out
   * Fixed: Uses correct key for sound tracking (was using wrong key)
   * @param soundId - Sound identifier
   * @param fade - Optional fade duration in ms
   */
  public stopSound(soundId: string, fade?: number): void {
    const howl = this.soundLibrary.get(soundId);
    if (!howl) return;

    if (fade) {
      const currentVolume = howl.volume();
      howl.fade(currentVolume, 0, fade);
      setTimeout(() => {
        howl.stop();
      }, fade);
    } else {
      howl.stop();
    }

    // Use correct composite key for cleanup (was deleting soundId only)
    this.activeSounds.delete(soundId);
    this.playingSounds.delete(soundId);
  }

  public playSoundAt(soundId: string, soundPosition: Vector3, options?: SpatialSoundOptions): number {
    if (!this.initialized) {
      console.warn('AudioSystem not initialized');
      return -1;
    }

    const maxDistance = options?.maxDistance ?? 50;
    const rolloff = options?.rolloff ?? 1.0;

    this.tempVector.copy(soundPosition).sub(this.listenerPosition);
    const distance = this.tempVector.length();

    let attenuatedVolume = 1.0;
    if (distance > maxDistance) {
      attenuatedVolume = 0;
    } else if (distance > 0) {
      attenuatedVolume = Math.max(0, 1 - (distance / maxDistance) * rolloff);
    }

    let pan = 0;
    if (this.tempVector.x !== 0) {
      pan = Math.max(-1, Math.min(1, this.tempVector.x / maxDistance));
    }

    const playOptions: SoundPlayOptions = { ...options, volume: attenuatedVolume };
    const soundId_ = this.playSound(soundId, playOptions);

    if (soundId_ !== -1) {
      const howl = this.soundLibrary.get(soundId);
      if (howl && howl.stereo) {
        howl.stereo(pan, soundId_);
      }
    }

    return soundId_;
  }

  public updateListener(listenerPosition: Vector3): void {
    this.listenerPosition.copy(listenerPosition);
  }

  public playMusic(musicId: string, fadeDuration: number = 1000): void {
    if (!this.initialized) {
      console.warn('AudioSystem not initialized');
      return;
    }

    const howl = this.soundLibrary.get(musicId);
    if (!howl) {
      console.warn(`Music not found: ${musicId}`);
      return;
    }

    if (this.currentMusicFade) {
      clearTimeout(this.currentMusicFade);
    }

    if (this.currentMusic && this.currentMusic !== howl) {
      const currentVolume = this.currentMusic.volume();
      this.currentMusic.fade(currentVolume, 0, fadeDuration);

      this.currentMusicFade = setTimeout(() => {
        this.currentMusic?.stop();
      }, fadeDuration);
    }

    howl.volume(0);
    const musicVolume = this.settings.musicVolume;
    howl.play();
    howl.fade(0, musicVolume, fadeDuration);

    this.currentMusic = howl;
  }

  public stopMusic(fadeDuration: number = 1000): void {
    if (!this.currentMusic) return;

    const currentVolume = this.currentMusic.volume();
    this.currentMusic.fade(currentVolume, 0, fadeDuration);

    if (this.currentMusicFade) {
      clearTimeout(this.currentMusicFade);
    }

    this.currentMusicFade = setTimeout(() => {
      this.currentMusic?.stop();
      this.currentMusic = null;
    }, fadeDuration);
  }

  public setMasterVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.settings.masterVolume = clampedVolume;
    Howler.volume(clampedVolume);
    this.saveSettings();
  }

  public setSFXVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.settings.sfxVolume = clampedVolume;

    const sfxSounds = [
      'crash_major',
      'crash_minor',
      'crash_catastrophic',
      'checkpoint',
      'offroad',
      'ui_click',
      'ui_confirm',
      'countdown',
    ];

    sfxSounds.forEach((soundId) => {
      const howl = this.soundLibrary.get(soundId);
      if (howl) {
        howl.volume(clampedVolume);
      }
    });

    this.saveSettings();
  }

  public setMusicVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.settings.musicVolume = clampedVolume;

    if (this.currentMusic) {
      this.currentMusic.volume(clampedVolume);
    }

    this.saveSettings();
  }

  public getMasterVolume(): number {
    return this.settings.masterVolume;
  }

  public getSFXVolume(): number {
    return this.settings.sfxVolume;
  }

  public getMusicVolume(): number {
    return this.settings.musicVolume;
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public mute(): void {
    Howler.mute(true);
  }

  public unmute(): void {
    Howler.mute(false);
  }

  public isMuted(): boolean {
    return (Howler as any)._muted ?? false;
  }

  /**
   * Find lowest priority sound to stop when max concurrent sounds reached
   * Fixed: Returns sound key instead of priority value (was returning priority as ID)
   * @returns Sound key to stop, or -1 if none found
   */
  private getLowestPrioritySoundKey(): string | null {
    if (this.playingSounds.size === 0) return null;

    let lowestPriority = Infinity;
    let lowestKey: string | null = null;

    this.playingSounds.forEach((priority, key) => {
      if (priority < lowestPriority) {
        lowestPriority = priority;
        lowestKey = key; // Store the key, not priority
      }
    });

    return lowestKey;
  }

  private findLowestPrioritySoundToStop(): number {
    const lowestKey = this.getLowestPrioritySoundKey();
    if (!lowestKey) return -1;

    // Extract sound ID from composite key format: "soundId_instanceId"
    const parts = lowestKey.split('_');
    return parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : -1;
  }

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored) as Partial<AudioSettings>;
        this.settings = {
          masterVolume: data.masterVolume ?? 0.8,
          sfxVolume: data.sfxVolume ?? 0.7,
          musicVolume: data.musicVolume ?? 0.5,
        };
      }
    } catch (error) {
      console.warn('Failed to load audio settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save audio settings:', error);
    }
  }

  public dispose(): void {
    this.soundLibrary.forEach((howl) => {
      howl.stop();
    });

    this.soundLibrary.clear();
    this.sounds.clear();
    this.activeSounds.clear();
    this.playingSounds.clear();

    if (this.currentMusicFade) {
      clearTimeout(this.currentMusicFade);
      this.currentMusicFade = null;
    }

    this.currentMusic = null;
    this.initialized = false;
  }

  public getActiveSoundCount(): number {
    return this.activeSounds.size;
  }

  public isSoundLoaded(soundId: string): boolean {
    const howl = this.soundLibrary.get(soundId);
    return howl ? howl.state() === 'loaded' : false;
  }

  public preloadAsset(soundId: string): Promise<void> {
    return new Promise((resolve) => {
      const howl = this.soundLibrary.get(soundId);
      if (!howl) {
        console.warn(`Cannot preload: sound not found: ${soundId}`);
        resolve();
        return;
      }

      if (howl.state() === 'loaded') {
        resolve();
        return;
      }

      howl.once('load', () => {
        resolve();
      });

      howl.load();
    });
  }
}
