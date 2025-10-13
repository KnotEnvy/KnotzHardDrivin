/**
 * Track metadata configuration
 * Contains display information for each track including name, description, difficulty, etc.
 */

export interface TrackMetadata {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  length: string;
  turns: number;
  icon: string;
  bestTime?: string;
}

/**
 * Track metadata registry
 * Maps track IDs to their display information
 */
export const TRACK_METADATA: Record<string, TrackMetadata> = {
  track01: {
    id: 'track01',
    name: 'Thunder Speedway Oval',
    description: 'A classic high-speed oval circuit with banked turns. Perfect for beginners to master basic racing fundamentals and achieve top speeds.',
    difficulty: 'easy',
    length: '0.48 km',
    turns: 2,
    icon: '🏁',
  },
  track02: {
    id: 'track02',
    name: 'Alpine Figure-8 Circuit',
    description: 'A challenging mountain course featuring elevation changes, sharp curves, and dramatic jumps. Test your skills on this technical track.',
    difficulty: 'hard',
    length: '0.82 km',
    turns: 9,
    icon: '🏔️',
  },
};

/**
 * Gets metadata for a specific track
 * @param trackId - Track identifier (e.g., 'track01')
 * @returns Track metadata or undefined if not found
 */
export function getTrackMetadata(trackId: string): TrackMetadata | undefined {
  return TRACK_METADATA[trackId];
}

/**
 * Gets all available track metadata
 * @returns Array of all track metadata
 */
export function getAllTracks(): TrackMetadata[] {
  return Object.values(TRACK_METADATA);
}
