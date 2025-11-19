# Campaign Progression Summary

**Status**: Complete - 8 Track Campaign Implemented
**Date**: November 17, 2025
**System**: CareerProgressionSystem.ts

---

## Campaign Overview

**Total Tracks**: 8
**Total Possible Stars**: 24 (3 per track)
**Progression Type**: Linear unlock chain
**Difficulty Range**: 1 (Easy) to 5 (Extreme)

---

## Track Roster

### Track 1: Thunder Speedway Oval
- **ID**: `track01`
- **Difficulty**: 1 (Easy)
- **Unlock**: Always unlocked (starter track)
- **Description**: A classic oval track perfect for learning the basics. Wide roads, gentle curves, and no obstacles.
- **Star Thresholds**:
  - Bronze: 3:00.000 (180s)
  - Silver: 2:00.000 (120s)
  - Gold: 1:30.000 (90s)
- **Design Focus**: Tutorial track, beginner-friendly, teaches basic driving mechanics

---

### Track 2: Speed Loop Challenge
- **ID**: `track02`
- **Difficulty**: 2 (Easy-Medium)
- **Unlock**: Complete Track 1
- **Description**: Your first taste of stunts! Navigate a single loop-de-loop and prove your courage.
- **Star Thresholds**:
  - Bronze: 3:15.000 (195s)
  - Silver: 2:36.000 (156s)
  - Gold: 2:10.000 (130s)
- **Design Focus**: Introduces stunt mechanics, single loop, confidence builder

---

### Track 3: Canyon Twister
- **ID**: `track03`
- **Difficulty**: 3 (Medium)
- **Unlock**: Complete Track 2
- **Description**: Tight hairpin turns carved into canyon walls. One mistake and you're tumbling into the ravine.
- **Star Thresholds**:
  - Bronze: 3:45.000 (225s)
  - Silver: 3:00.000 (180s)
  - Gold: 2:30.000 (150s)
- **Design Focus**: Technical cornering, precision driving, punishes mistakes

---

### Track 4: Elevation Madness
- **ID**: `track04`
- **Difficulty**: 3 (Medium)
- **Unlock**: Complete Track 3
- **Description**: Massive jumps and stomach-dropping elevation changes. Keep your wheels on the ground!
- **Star Thresholds**:
  - Bronze: 4:00.000 (240s)
  - Silver: 3:12.000 (192s)
  - Gold: 2:40.000 (160s)
- **Design Focus**: Jump mechanics, air control, landing precision

---

### Track 5: Devil's Corkscrew
- **ID**: `track05`
- **Difficulty**: 4 (Hard)
- **Unlock**: Complete Track 4
- **Description**: A hellish combination of loops, corkscrews, and banked turns. Only the skilled survive.
- **Star Thresholds**:
  - Bronze: 4:30.000 (270s)
  - Silver: 3:36.000 (216s)
  - Gold: 3:00.000 (180s)
- **Design Focus**: Complex stunt sequences, multiple loop types, advanced skills required

---

### Track 6: Stadium Gauntlet
- **ID**: `track06`
- **Difficulty**: 4 (Very Hard)
- **Unlock**: Complete Track 5
- **Description**: Navigate obstacle courses, slalom gates, and precision jumps in front of roaring crowds.
- **Star Thresholds**:
  - Bronze: 5:00.000 (300s)
  - Silver: 4:00.000 (240s)
  - Gold: 3:20.000 (200s)
- **Design Focus**: Precision driving, obstacle navigation, technical mastery

---

### Track 7: Midnight Mountain Run
- **ID**: `track07`
- **Difficulty**: 5 (Very Hard)
- **Unlock**: Complete Track 6
- **Description**: Race through treacherous mountain roads at night. Limited visibility, maximum danger.
- **Star Thresholds**:
  - Bronze: 5:30.000 (330s)
  - Silver: 4:24.000 (264s)
  - Gold: 3:40.000 (220s)
- **Design Focus**: Night racing, memorization, extreme challenge, environmental hazard

---

### Track 8: The Annihilator
- **ID**: `track08`
- **Difficulty**: 5 (Extreme - FINAL BOSS)
- **Unlock**: Complete Track 7
- **Description**: The ultimate test. Every stunt, every obstacle, every challenge combined. Are you worthy?
- **Star Thresholds**:
  - Bronze: 6:15.000 (375s)
  - Silver: 5:00.000 (300s)
  - Gold: 4:10.000 (250s)
- **Design Focus**: Ultimate challenge, all mechanics combined, championship test

---

## Progression Chain Visualization

```
Track 1 (Diff 1) → Track 2 (Diff 2) → Track 3 (Diff 3) → Track 4 (Diff 3)
  [UNLOCKED]         [LOCKED]          [LOCKED]          [LOCKED]
                           ↓                 ↓                 ↓
                   Track 5 (Diff 4) → Track 6 (Diff 4) → Track 7 (Diff 5) → Track 8 (Diff 5)
                      [LOCKED]          [LOCKED]          [LOCKED]          [LOCKED]
```

**Unlock Rule**: Each track unlocks when the previous track is completed (any star rating).

---

## Star Threshold Design Philosophy

### Formula Applied
- **Bronze**: baseTime × 1.5 (50% slower than gold)
- **Silver**: baseTime × 1.2 (20% slower than gold)
- **Gold**: baseTime × 1.0 (target time - requires mastery)

### Time Progression by Difficulty
- **Difficulty 1**: 90-120s base (Thunder Speedway: 90s gold)
- **Difficulty 2**: 120-150s base (Speed Loop: 130s gold)
- **Difficulty 3**: 150-180s base (Canyon/Elevation: 150-160s gold)
- **Difficulty 4**: 180-240s base (Devil's/Stadium: 180-200s gold)
- **Difficulty 5**: 220-250s base (Midnight/Annihilator: 220-250s gold)

### Balancing Notes
- Bronze thresholds are forgiving to ensure progression isn't blocked
- Silver thresholds require solid performance and technique
- Gold thresholds demand mastery and near-perfect runs
- Difficulty 5 tracks have generous bronze times (5:30-6:15) to prevent frustration
- Final boss track (The Annihilator) has the longest times to match its complexity

---

## Championship Scoring System

### Rank Progression
Based on total stars earned across all tracks:

| Rank      | Stars Required | Percentage | Description                            |
|-----------|----------------|------------|----------------------------------------|
| ROOKIE    | 0-5 stars      | 0-24%      | Just getting started                   |
| ADVANCED  | 6-11 stars     | 25-49%     | Improving driver with potential        |
| EXPERT    | 12-17 stars    | 50-74%     | Skilled racer with consistent perf.    |
| MASTER    | 18-21 stars    | 75-89%     | Advanced driver with proven record     |
| CHAMPION  | 22-23 stars    | 90-95%     | Elite racer with exceptional skills    |
| LEGEND    | 24 stars       | 100%       | Perfect mastery of all tracks          |

### Completion Percentage Calculation
- **50% Weight**: Track completion (number of tracks completed)
- **50% Weight**: Star completion (total stars earned)

Example:
- 4 tracks completed (50% of 8) = 25% progress
- 8 stars earned (33% of 24) = 16.5% progress
- **Total**: 25% + 16.5% = 41.5% completion

---

## New API Methods

### Championship Tracking
```typescript
// Get total stars earned
system.getTotalStarsEarned(): number  // 0-24

// Get maximum possible stars
system.getMaxPossibleStars(): number  // Always 24 (3 × 8 tracks)

// Get completion percentage
system.getCompletionPercentage(): number  // 0-100

// Get current rank
system.getChampionshipRank(): {
  rank: string;
  description: string;
  starsRequired: number;
}

// Get next rank info
system.getNextRank(): {
  rank: string;
  starsNeeded: number;
} | null
```

### Enhanced Career Stats
```typescript
system.getCareerStats(): {
  totalRaces: number;
  totalCrashes: number;
  totalPlayTime: number;
  tracksUnlocked: number;
  tracksCompleted: number;
  totalTracks: number;
  totalStars: number;           // NEW
  maxStars: number;              // NEW
  completionPercentage: number;  // NEW
  averageStarsPerTrack: string;  // NEW
}
```

---

## Track Themes & Design Guidelines

### Track 1-2: Introduction
- **Purpose**: Teach mechanics, build confidence
- **Features**: Wide roads, simple layouts, forgiving times
- **Aesthetic**: Classic racing (oval, basic loop)

### Track 3-4: Skill Development
- **Purpose**: Introduce technical challenges
- **Features**: Tighter turns, jumps, elevation changes
- **Aesthetic**: Natural environments (canyon, mountains)

### Track 5-6: Advanced Techniques
- **Purpose**: Test mastery of mechanics
- **Features**: Complex stunts, obstacles, precision sections
- **Aesthetic**: Dramatic settings (devil-themed, stadium)

### Track 7-8: Championship Challenge
- **Purpose**: Ultimate tests of skill
- **Features**: All mechanics combined, extreme difficulty
- **Aesthetic**: Epic, intense (night racing, "Annihilator" final boss)

---

## Implementation Details

### File Modified
- `src/systems/CareerProgressionSystem.ts`

### Lines Changed
- Track Registry: Lines 71-210 (expanded from 2 to 8 tracks)
- Championship Methods: Lines 470-583 (new methods added)

### Storage Impact
- Track metadata is static (no runtime cost)
- Save data stores completion records in localStorage
- Zero performance impact on gameplay

### Testing Notes
- All 8 tracks will appear in track selection UI
- Only Track 1 unlocked initially
- Completing tracks unlocks next in sequence
- Star ratings persist across sessions
- Championship rank updates in real-time

---

## Future Track Development

### Track Asset Creation (Separate Task)
The following track JSON files need to be created:
- `/assets/tracks/track03.json` - Canyon Twister
- `/assets/tracks/track04.json` - Elevation Madness
- `/assets/tracks/track05.json` - Devil's Corkscrew
- `/assets/tracks/track06.json` - Stadium Gauntlet
- `/assets/tracks/track07.json` - Midnight Mountain Run
- `/assets/tracks/track08.json` - The Annihilator

**Note**: These are placeholder paths. Actual track geometry will be created in future sprints.

---

## Success Metrics

- 8 unique tracks with distinct identities
- Clear difficulty progression (1 → 5)
- Balanced star thresholds (achievable bronze, challenging gold)
- Rewarding championship system (6 ranks)
- Complete progression chain
- Zero performance impact
- Full localStorage persistence

---

## Status Summary

**Campaign Expansion**: COMPLETE
**Track Metadata**: COMPLETE (8 tracks defined)
**Progression Chain**: COMPLETE (linear unlock system)
**Star Thresholds**: COMPLETE (balanced for all difficulties)
**Championship System**: COMPLETE (rank progression, completion %)
**Type Safety**: COMPLETE (type check passes)

**Ready for**: Track selection UI integration, track asset creation

---

**Next Steps**:
1. UI integration - Display all tracks in selection screen
2. Track geometry creation - Build actual track layouts for tracks 3-8
3. Championship UI - Show rank badges and progression bars
4. Unlock animations - Visual feedback when new tracks unlock
