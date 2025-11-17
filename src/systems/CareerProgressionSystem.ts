import { TrackData } from '../entities/Track';

/**
 * Track metadata for career progression
 */
export interface TrackMetadata {
  id: string;               // Unique track identifier (e.g., 'track01')
  name: string;             // Display name
  description: string;      // Track description
  difficulty: number;       // 1-5 difficulty rating
  path: string;             // Path to track JSON file
  unlocked: boolean;        // Whether track is unlocked
  unlockRequirement?: string; // ID of track that must be completed to unlock this one
}

/**
 * Statistics for a completed track
 */
export interface TrackCompletion {
  trackId: string;
  bestTime: number;         // Best lap time in milliseconds
  bestRaceTime: number;     // Best race completion time
  completionCount: number;  // Number of times completed
  totalCrashes: number;     // Total crashes on this track
  lastPlayed: number;       // Timestamp of last play
}

/**
 * Career progression save data
 */
export interface CareerProgress {
  version: number;          // Save format version
  unlockedTracks: string[]; // Array of unlocked track IDs
  completedTracks: Map<string, TrackCompletion>;
  currentTrack: string;     // Currently selected track ID
  totalRaces: number;       // Total races across all tracks
  totalCrashes: number;     // Total crashes across all tracks
  totalPlayTime: number;    // Total play time in milliseconds
}

/**
 * Career Progression System
 *
 * Manages track unlocking, progression, and save/load functionality.
 * Provides linear track progression with unlock requirements.
 *
 * Features:
 * - Track unlock management
 * - Career progression save/load
 * - Track completion statistics
 * - Next track determination
 */
export class CareerProgressionSystem {
  private static instance: CareerProgressionSystem;
  private tracks: Map<string, TrackMetadata> = new Map();
  private progress: CareerProgress;
  private readonly STORAGE_KEY = 'hardDrivin_careerProgress';
  private readonly SAVE_VERSION = 1;

  /**
   * Track registry - defines all tracks and unlock requirements
   */
  private readonly TRACK_REGISTRY: TrackMetadata[] = [
    {
      id: 'track01',
      name: 'Thunder Speedway Oval',
      description: 'A classic oval track perfect for learning the basics',
      difficulty: 1,
      path: '/assets/tracks/track01.json',
      unlocked: true, // First track always unlocked
    },
    {
      id: 'track02',
      name: 'Speed Loop Challenge',
      description: 'Test your skills on this advanced stunt track',
      difficulty: 3,
      path: '/assets/tracks/track02.json',
      unlocked: false,
      unlockRequirement: 'track01', // Must complete track01 to unlock
    },
    // Future tracks can be added here with unlock chains
    // {
    //   id: 'track03',
    //   name: 'Desert Canyon',
    //   description: 'Navigate treacherous canyon roads',
    //   difficulty: 4,
    //   path: '/assets/tracks/track03.json',
    //   unlocked: false,
    //   unlockRequirement: 'track02',
    // },
  ];

  private constructor() {
    // Initialize track registry
    this.TRACK_REGISTRY.forEach(track => {
      this.tracks.set(track.id, { ...track });
    });

    // Load or initialize progress
    this.progress = this.loadProgress();

    // Apply unlocked tracks from save data
    this.applyUnlockedTracks();

    console.log('[CareerProgressionSystem] Initialized with', this.tracks.size, 'tracks');
    console.log('[CareerProgressionSystem] Unlocked tracks:', this.progress.unlockedTracks);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CareerProgressionSystem {
    if (!CareerProgressionSystem.instance) {
      CareerProgressionSystem.instance = new CareerProgressionSystem();
    }
    return CareerProgressionSystem.instance;
  }

  /**
   * Get all tracks
   */
  public getAllTracks(): TrackMetadata[] {
    return Array.from(this.tracks.values());
  }

  /**
   * Get unlocked tracks only
   */
  public getUnlockedTracks(): TrackMetadata[] {
    return Array.from(this.tracks.values()).filter(track => track.unlocked);
  }

  /**
   * Get track by ID
   */
  public getTrack(trackId: string): TrackMetadata | undefined {
    return this.tracks.get(trackId);
  }

  /**
   * Check if track is unlocked
   */
  public isTrackUnlocked(trackId: string): boolean {
    const track = this.tracks.get(trackId);
    return track?.unlocked ?? false;
  }

  /**
   * Get current track
   */
  public getCurrentTrack(): TrackMetadata | undefined {
    return this.tracks.get(this.progress.currentTrack);
  }

  /**
   * Set current track
   */
  public setCurrentTrack(trackId: string): boolean {
    const track = this.tracks.get(trackId);
    if (!track || !track.unlocked) {
      console.warn('[CareerProgressionSystem] Cannot set locked track as current:', trackId);
      return false;
    }
    this.progress.currentTrack = trackId;
    this.saveProgress();
    return true;
  }

  /**
   * Get next track in progression
   * Returns null if no next track or next track is locked
   */
  public getNextTrack(): TrackMetadata | null {
    const currentIndex = this.TRACK_REGISTRY.findIndex(t => t.id === this.progress.currentTrack);
    if (currentIndex === -1 || currentIndex >= this.TRACK_REGISTRY.length - 1) {
      return null; // No next track
    }

    const nextTrack = this.TRACK_REGISTRY[currentIndex + 1];
    const trackMetadata = this.tracks.get(nextTrack.id);

    return trackMetadata && trackMetadata.unlocked ? trackMetadata : null;
  }

  /**
   * Record track completion
   * Unlocks next track if requirements met
   */
  public recordCompletion(trackId: string, lapTime: number, raceTime: number, crashes: number): boolean {
    const track = this.tracks.get(trackId);
    if (!track || !track.unlocked) {
      console.warn('[CareerProgressionSystem] Cannot record completion for locked track:', trackId);
      return false;
    }

    // Update or create completion record
    const existingCompletion = this.progress.completedTracks.get(trackId);
    const completion: TrackCompletion = {
      trackId,
      bestTime: existingCompletion
        ? Math.min(existingCompletion.bestTime, lapTime)
        : lapTime,
      bestRaceTime: existingCompletion
        ? Math.min(existingCompletion.bestRaceTime, raceTime)
        : raceTime,
      completionCount: (existingCompletion?.completionCount ?? 0) + 1,
      totalCrashes: (existingCompletion?.totalCrashes ?? 0) + crashes,
      lastPlayed: Date.now(),
    };

    this.progress.completedTracks.set(trackId, completion);
    this.progress.totalRaces++;
    this.progress.totalCrashes += crashes;

    // Check if we should unlock next track
    const unlocked = this.unlockNextTrack(trackId);

    // Save progress
    this.saveProgress();

    console.log('[CareerProgressionSystem] Recorded completion for', trackId);
    if (unlocked) {
      console.log('[CareerProgressionSystem] Unlocked next track!');
    }

    return unlocked;
  }

  /**
   * Unlock next track in sequence if current track is completed
   */
  private unlockNextTrack(completedTrackId: string): boolean {
    // Find tracks that require this track to be unlocked
    const tracksToUnlock = this.TRACK_REGISTRY.filter(
      track => track.unlockRequirement === completedTrackId && !track.unlocked
    );

    if (tracksToUnlock.length === 0) {
      return false; // No tracks to unlock
    }

    // Unlock all tracks that had this as a requirement
    tracksToUnlock.forEach(track => {
      const trackMetadata = this.tracks.get(track.id);
      if (trackMetadata) {
        trackMetadata.unlocked = true;
        if (!this.progress.unlockedTracks.includes(track.id)) {
          this.progress.unlockedTracks.push(track.id);
        }
        console.log('[CareerProgressionSystem] Unlocked track:', track.id, '-', track.name);
      }
    });

    return true;
  }

  /**
   * Apply unlocked tracks from save data
   */
  private applyUnlockedTracks(): void {
    this.progress.unlockedTracks.forEach(trackId => {
      const track = this.tracks.get(trackId);
      if (track) {
        track.unlocked = true;
      }
    });
  }

  /**
   * Get completion stats for a track
   */
  public getTrackCompletion(trackId: string): TrackCompletion | undefined {
    return this.progress.completedTracks.get(trackId);
  }

  /**
   * Get overall career statistics
   */
  public getCareerStats() {
    return {
      totalRaces: this.progress.totalRaces,
      totalCrashes: this.progress.totalCrashes,
      totalPlayTime: this.progress.totalPlayTime,
      tracksUnlocked: this.progress.unlockedTracks.length,
      tracksCompleted: this.progress.completedTracks.size,
      totalTracks: this.tracks.size,
    };
  }

  /**
   * Reset career progression (for debugging or new game)
   */
  public resetProgress(): void {
    this.progress = this.createNewProgress();
    this.applyUnlockedTracks();
    this.saveProgress();
    console.log('[CareerProgressionSystem] Progress reset');
  }

  /**
   * Create new progress data
   */
  private createNewProgress(): CareerProgress {
    return {
      version: this.SAVE_VERSION,
      unlockedTracks: ['track01'], // First track always unlocked
      completedTracks: new Map(),
      currentTrack: 'track01',
      totalRaces: 0,
      totalCrashes: 0,
      totalPlayTime: 0,
    };
  }

  /**
   * Load progress from LocalStorage
   */
  private loadProgress(): CareerProgress {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) {
        console.log('[CareerProgressionSystem] No saved progress found, creating new');
        return this.createNewProgress();
      }

      const data = JSON.parse(saved);

      // Validate version
      if (data.version !== this.SAVE_VERSION) {
        console.warn('[CareerProgressionSystem] Save version mismatch, creating new progress');
        return this.createNewProgress();
      }

      // Reconstruct Map from saved data
      const completedTracks = new Map<string, TrackCompletion>(
        data.completedTracks ? Object.entries(data.completedTracks) : []
      );

      console.log('[CareerProgressionSystem] Loaded progress from storage');
      return {
        ...data,
        completedTracks,
      };
    } catch (error) {
      console.error('[CareerProgressionSystem] Error loading progress:', error);
      return this.createNewProgress();
    }
  }

  /**
   * Save progress to LocalStorage
   */
  private saveProgress(): void {
    try {
      // Convert Map to object for JSON serialization
      const completedTracksObj = Object.fromEntries(this.progress.completedTracks);

      const data = {
        ...this.progress,
        completedTracks: completedTracksObj,
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log('[CareerProgressionSystem] Progress saved');
    } catch (error) {
      console.error('[CareerProgressionSystem] Error saving progress:', error);
    }
  }

  /**
   * Update play time
   */
  public addPlayTime(milliseconds: number): void {
    this.progress.totalPlayTime += milliseconds;
    // Don't save on every update to avoid excessive LocalStorage writes
    // Save will happen on completion or when switching tracks
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.saveProgress();
    console.log('[CareerProgressionSystem] Destroyed');
  }
}
