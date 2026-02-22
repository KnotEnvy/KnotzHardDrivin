import { TrackData } from '../entities/Track';

/**
 * Star rating time thresholds (in milliseconds)
 */
export interface StarThresholds {
  bronze: number;  // 1 star threshold
  silver: number;  // 2 star threshold
  gold: number;    // 3 star threshold
}

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
  starThresholds: StarThresholds; // Time thresholds for Bronze/Silver/Gold ratings
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
  stars: number;            // Best star rating achieved (0-3)
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
   *
   * Progression Chain:
   * Track 1 (Easy) → Track 2 (Easy-Medium) → Track 3 (Medium) → Track 4 (Medium-Hard)
   * → Track 5 (Hard) → Track 6 (Very Hard) → Track 7 (Very Hard) → Track 8 (Extreme)
   *
   * Star Threshold Formula:
   * - Bronze: baseTime * 1.5 (50% slower than target)
   * - Silver: baseTime * 1.2 (20% slower than target)
   * - Gold: baseTime * 1.0 (target time - requires mastery)
   */
  private readonly TRACK_REGISTRY: TrackMetadata[] = [
    // === DIFFICULTY 1: BEGINNER TRACKS ===
    {
      id: 'oval',
      name: 'Super Speedway Oval',
      description: 'A massive high-speed oval circuit with 15-degree banked turns. Designed for absolute top speeds and learning the basics of handling.',
      difficulty: 1,
      path: '/assets/tracks/oval.json',
      unlocked: true,
      starThresholds: {
        bronze: 120000,
        silver: 90000,
        gold: 75000,
      },
    },

    // === DIFFICULTY 2: EASY-MEDIUM TRACKS ===
    {
      id: 'track01',
      name: 'Thunder Speedway Short Oval',
      description: 'A classic short oval track perfect for practicing your turning radius.',
      difficulty: 1,
      path: '/assets/tracks/track01.json',
      unlocked: false,
      unlockRequirement: 'oval',
      starThresholds: {
        bronze: 180000,  // 3:00.000 - Easy to achieve for first track
        silver: 120000,  // 2:00.000 - Moderate challenge
        gold: 90000,     // 1:30.000 - Requires skill and clean racing
      },
    },

    // === DIFFICULTY 2: EASY-MEDIUM TRACKS ===
    {
      id: 'track02',
      name: 'Speed Loop Challenge',
      description: 'Your first taste of stunts! Navigate a single loop-de-loop and prove your courage.',
      difficulty: 2,
      path: '/assets/tracks/track02.json',
      unlocked: false,
      unlockRequirement: 'track01', // Must complete track01 to unlock
      starThresholds: {
        bronze: 195000,  // 3:15.000 - Beginner-friendly stunt introduction
        silver: 156000,  // 2:36.000 - Smooth stunt execution
        gold: 130000,    // 2:10.000 - Clean loop navigation
      },
    },

    // === DIFFICULTY 3: MEDIUM TRACKS ===
    {
      id: 'track03',
      name: 'Canyon Twister',
      description: 'Tight hairpin turns carved into canyon walls. One mistake and you\'re tumbling into the ravine.',
      difficulty: 3,
      path: '/assets/tracks/track03.json',
      unlocked: false,
      unlockRequirement: 'track02',
      starThresholds: {
        bronze: 225000,  // 3:45.000 - Forgiving for technical track
        silver: 180000,  // 3:00.000 - Solid cornering skills
        gold: 150000,    // 2:30.000 - Apex mastery required
      },
    },

    // === DIFFICULTY 3: MEDIUM TRACKS ===
    {
      id: 'track04',
      name: 'Elevation Madness',
      description: 'Massive jumps and stomach-dropping elevation changes. Keep your wheels on the ground!',
      difficulty: 3,
      path: '/assets/tracks/track04.json',
      unlocked: false,
      unlockRequirement: 'track03',
      starThresholds: {
        bronze: 240000,  // 4:00.000 - Jump-heavy track needs practice
        silver: 192000,  // 3:12.000 - Controlled air time
        gold: 160000,    // 2:40.000 - Perfect landing execution
      },
    },

    // === DIFFICULTY 4: HARD TRACKS ===
    {
      id: 'track05',
      name: 'Devil\'s Corkscrew',
      description: 'A hellish combination of loops, corkscrews, and banked turns. Only the skilled survive.',
      difficulty: 4,
      path: '/assets/tracks/track05.json',
      unlocked: false,
      unlockRequirement: 'track04',
      starThresholds: {
        bronze: 270000,  // 4:30.000 - Complex stunt sequence
        silver: 216000,  // 3:36.000 - Consistent stunt performance
        gold: 180000,    // 3:00.000 - Flawless execution
      },
    },

    // === DIFFICULTY 4: VERY HARD TRACKS ===
    {
      id: 'track06',
      name: 'Stadium Gauntlet',
      description: 'Navigate obstacle courses, slalom gates, and precision jumps in front of roaring crowds.',
      difficulty: 4,
      path: '/assets/tracks/track06.json',
      unlocked: false,
      unlockRequirement: 'track05',
      starThresholds: {
        bronze: 300000,  // 5:00.000 - Technical precision track
        silver: 240000,  // 4:00.000 - Clean gate navigation
        gold: 200000,    // 3:20.000 - Perfect precision run
      },
    },

    // === DIFFICULTY 5: VERY HARD TRACKS ===
    {
      id: 'track07',
      name: 'Midnight Mountain Run',
      description: 'Race through treacherous mountain roads at night. Limited visibility, maximum danger.',
      difficulty: 5,
      path: '/assets/tracks/track07.json',
      unlocked: false,
      unlockRequirement: 'track06',
      starThresholds: {
        bronze: 330000,  // 5:30.000 - Challenging night visibility
        silver: 264000,  // 4:24.000 - Memorized racing lines
        gold: 220000,    // 3:40.000 - Night racing mastery
      },
    },

    // === DIFFICULTY 5: EXTREME (FINAL BOSS) ===
    {
      id: 'track08',
      name: 'The Annihilator',
      description: 'The ultimate test. Every stunt, every obstacle, every challenge combined. Are you worthy?',
      difficulty: 5,
      path: '/assets/tracks/track08.json',
      unlocked: false,
      unlockRequirement: 'track07',
      starThresholds: {
        bronze: 375000,  // 6:15.000 - Final boss track (very lenient bronze)
        silver: 300000,  // 5:00.000 - Strong completion
        gold: 250000,    // 4:10.000 - Champion-level performance
      },
    },
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
   * Calculate star rating based on race time and track thresholds
   * @param trackId - Track identifier
   * @param completionTime - Race completion time in milliseconds
   * @returns Star rating: 0 (no stars), 1 (bronze), 2 (silver), 3 (gold)
   */
  public calculateStarRating(trackId: string, completionTime: number): 0 | 1 | 2 | 3 {
    const track = this.tracks.get(trackId);
    if (!track) {
      console.warn('[CareerProgressionSystem] Cannot calculate stars for unknown track:', trackId);
      return 0;
    }

    const thresholds = track.starThresholds;

    // Gold (3 stars) - fastest threshold
    if (completionTime <= thresholds.gold) {
      return 3;
    }

    // Silver (2 stars)
    if (completionTime <= thresholds.silver) {
      return 2;
    }

    // Bronze (1 star)
    if (completionTime <= thresholds.bronze) {
      return 1;
    }

    // Completed but over bronze time (0 stars)
    return 0;
  }

  /**
   * Record track completion
   * Unlocks next track if requirements met
   * @returns Object containing unlocked status and star rating achieved
   */
  public recordCompletion(
    trackId: string,
    lapTime: number,
    raceTime: number,
    crashes: number
  ): { unlocked: boolean; stars: number } {
    const track = this.tracks.get(trackId);
    if (!track || !track.unlocked) {
      console.warn('[CareerProgressionSystem] Cannot record completion for locked track:', trackId);
      return { unlocked: false, stars: 0 };
    }

    // Calculate star rating based on race time
    const newStars = this.calculateStarRating(trackId, raceTime);

    // Update or create completion record
    const existingCompletion = this.progress.completedTracks.get(trackId);

    // Best stars achieved (upgrade if beaten)
    const bestStars = existingCompletion
      ? Math.max(existingCompletion.stars, newStars)
      : newStars;

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
      stars: bestStars, // Store best star rating achieved
    };

    this.progress.completedTracks.set(trackId, completion);
    this.progress.totalRaces++;
    this.progress.totalCrashes += crashes;

    // Check if we should unlock next track
    const unlocked = this.unlockNextTrack(trackId);

    // Save progress
    this.saveProgress();

    console.log('[CareerProgressionSystem] Recorded completion for', trackId);
    console.log('[CareerProgressionSystem] Stars earned:', newStars, '(Best:', bestStars, ')');
    if (unlocked) {
      console.log('[CareerProgressionSystem] Unlocked next track!');
    }

    return { unlocked, stars: newStars };
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
    const totalStars = this.getTotalStarsEarned();
    const maxStars = this.getMaxPossibleStars();
    const completionPercentage = this.getCompletionPercentage();

    return {
      totalRaces: this.progress.totalRaces,
      totalCrashes: this.progress.totalCrashes,
      totalPlayTime: this.progress.totalPlayTime,
      tracksUnlocked: this.progress.unlockedTracks.length,
      tracksCompleted: this.progress.completedTracks.size,
      totalTracks: this.tracks.size,
      totalStars,
      maxStars,
      completionPercentage,
      averageStarsPerTrack: this.progress.completedTracks.size > 0
        ? (totalStars / this.progress.completedTracks.size).toFixed(2)
        : '0.00',
    };
  }

  /**
   * Calculate total stars earned across all tracks
   * @returns Total number of stars earned (0-24 for 8 tracks)
   */
  public getTotalStarsEarned(): number {
    let total = 0;
    this.progress.completedTracks.forEach(completion => {
      total += completion.stars;
    });
    return total;
  }

  /**
   * Get maximum possible stars (3 per track)
   * @returns Maximum number of stars possible
   */
  public getMaxPossibleStars(): number {
    return this.tracks.size * 3; // 3 stars per track
  }

  /**
   * Calculate overall campaign completion percentage
   * Based on tracks completed and stars earned
   * @returns Completion percentage (0-100)
   */
  public getCompletionPercentage(): number {
    const totalTracks = this.tracks.size;
    const completedTracks = this.progress.completedTracks.size;
    const totalStars = this.getTotalStarsEarned();
    const maxStars = this.getMaxPossibleStars();

    // Weight: 50% track completion, 50% star completion
    const trackProgress = (completedTracks / totalTracks) * 50;
    const starProgress = (totalStars / maxStars) * 50;

    return Math.round(trackProgress + starProgress);
  }

  /**
   * Get championship rank based on total stars
   * @returns Rank name and description
   */
  public getChampionshipRank(): { rank: string; description: string; starsRequired: number } {
    const totalStars = this.getTotalStarsEarned();
    const maxStars = this.getMaxPossibleStars();

    if (totalStars >= maxStars) {
      return {
        rank: 'LEGEND',
        description: 'Perfect mastery of all tracks',
        starsRequired: maxStars,
      };
    } else if (totalStars >= maxStars * 0.9) {
      return {
        rank: 'CHAMPION',
        description: 'Elite racer with exceptional skills',
        starsRequired: Math.ceil(maxStars * 0.9),
      };
    } else if (totalStars >= maxStars * 0.75) {
      return {
        rank: 'MASTER',
        description: 'Advanced driver with proven track record',
        starsRequired: Math.ceil(maxStars * 0.75),
      };
    } else if (totalStars >= maxStars * 0.5) {
      return {
        rank: 'EXPERT',
        description: 'Skilled racer with consistent performance',
        starsRequired: Math.ceil(maxStars * 0.5),
      };
    } else if (totalStars >= maxStars * 0.25) {
      return {
        rank: 'ADVANCED',
        description: 'Improving driver with potential',
        starsRequired: Math.ceil(maxStars * 0.25),
      };
    } else {
      return {
        rank: 'ROOKIE',
        description: 'Just getting started',
        starsRequired: 0,
      };
    }
  }

  /**
   * Get next rank and stars needed to achieve it
   * @returns Next rank info or null if already max rank
   */
  public getNextRank(): { rank: string; starsNeeded: number } | null {
    const totalStars = this.getTotalStarsEarned();
    const maxStars = this.getMaxPossibleStars();

    const ranks = [
      { threshold: 0, name: 'ROOKIE' },
      { threshold: maxStars * 0.25, name: 'ADVANCED' },
      { threshold: maxStars * 0.5, name: 'EXPERT' },
      { threshold: maxStars * 0.75, name: 'MASTER' },
      { threshold: maxStars * 0.9, name: 'CHAMPION' },
      { threshold: maxStars, name: 'LEGEND' },
    ];

    // Find next rank
    for (let i = 0; i < ranks.length; i++) {
      if (totalStars < Math.ceil(ranks[i].threshold)) {
        return {
          rank: ranks[i].name,
          starsNeeded: Math.ceil(ranks[i].threshold) - totalStars,
        };
      }
    }

    return null; // Already max rank
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
      unlockedTracks: ['oval'], // First track always unlocked
      completedTracks: new Map(),
      currentTrack: 'oval',
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

      // Reconstruct Map from saved data and migrate old format
      const completedTracksArray = data.completedTracks
        ? Object.entries(data.completedTracks)
        : [];

      // Migrate old data format: add stars field if missing
      const completedTracks = new Map<string, TrackCompletion>();
      completedTracksArray.forEach(([trackId, completion]: [string, any]) => {
        // Ensure stars field exists (default to 0 for old saves)
        if (completion.stars === undefined) {
          completion.stars = 0;
          console.log('[CareerProgressionSystem] Migrated old save data for track:', trackId);
        }
        completedTracks.set(trackId, completion as TrackCompletion);
      });

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
