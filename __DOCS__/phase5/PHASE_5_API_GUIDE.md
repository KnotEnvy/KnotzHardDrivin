# Phase 5 API Guide: Timing & Scoring System

**Project**: Hard Drivin' Remake
**Phase**: 5 - Timing & Scoring System
**Document Version**: 1.0
**Date**: October 18, 2025

This guide provides practical usage examples for the three systems implemented in Phase 5: TimerSystem, LeaderboardSystem, and StatisticsSystem.

---

## TimerSystem API

The TimerSystem manages race timing, lap tracking, and time-based game mechanics.

### Quick Start

```typescript
import { TimerSystem, TimerEvent } from '@systems/TimerSystem';

// Get singleton instance
const timer = TimerSystem.getInstance();

// Start race
timer.start();

// Update each frame from GameEngine
timer.update(deltaTime);

// Subscribe to events
timer.subscribe((event, data) => {
  if (event === TimerEvent.TIME_EXPIRED) {
    console.log('Race ended!', data.finalTime);
  }
});
```

### Starting and Stopping

```typescript
// Start race (called when entering PLAYING state)
timer.start();

// Update each frame
if (this.gameState === GameState.PLAYING) {
  timer.update(deltaTime);
}

// Pause race (called when entering PAUSED state)
timer.pause();

// Resume race (called when returning to PLAYING from PAUSED)
timer.resume();

// Stop race (called when exiting game)
timer.stop();

// Reset timer (called before new race)
timer.reset();
```

### Lap Tracking

```typescript
// Called when vehicle crosses lap finish line
onLapFinish(): void {
  this.timer.onLapCompleted();
}

// Get current lap number
const currentLap = timer.getCurrentLap(); // 1-based

// Get completed laps count
const completed = timer.getCompletedLaps();

// Get all lap times
const lapTimes = timer.getLapTimes(); // milliseconds

// Get best lap
const bestLap = timer.getBestLapTime();
const formatted = timer.getFormattedBestLapTime(); // "01:23.45"
```

### Checkpoint Bonuses

```typescript
// Called when vehicle passes through checkpoint (from WaypointSystem)
onCheckpointPassed(checkpointData: CheckpointData): void {
  const CHECKPOINT_BONUS = 30; // seconds
  this.timer.onCheckpointPassed(CHECKPOINT_BONUS);
}

// Subscribe to bonus events
timer.subscribe((event, data) => {
  if (event === TimerEvent.CHECKPOINT_BONUS) {
    console.log(`+${data.timeBonus}s bonus!`);
    console.log(`Total remaining: ${data.totalRemaining}ms`);
  }
});
```

### Time Penalties

```typescript
// Apply penalty based on crash severity (called from CrashManager)
onCrash(severity: CrashSeverity): void {
  const penaltyMap = {
    [CrashSeverity.MINOR]: 5,          // -5 seconds
    [CrashSeverity.MAJOR]: 10,         // -10 seconds
    [CrashSeverity.CATASTROPHIC]: 15,  // -15 seconds
  };

  const penalty = penaltyMap[severity];
  this.timer.applyPenalty(penalty);
}

// Subscribe to penalty events
timer.subscribe((event, data) => {
  if (event === TimerEvent.PENALTY_APPLIED) {
    console.log(`-${data.penaltySeconds}s penalty!`);
    console.log(`Time remaining: ${data.totalRemaining}ms`);
    this.showPenaltyEffect(); // Visual feedback
  }
});
```

### Time Expiration

```typescript
// Subscribe to time expiration
timer.subscribe((event, data) => {
  if (event === TimerEvent.TIME_EXPIRED) {
    console.log(`Final time: ${data.finalTime}ms`);
    console.log(`Laps completed: ${data.finalLap}`);

    // Transition to results screen
    this.gameEngine.setState(GameState.RESULTS);
  }
});
```

### Getting Race Time

```typescript
// Get current state snapshot (immutable)
const state = timer.getState();
console.log(`Race time: ${state.raceTime}ms`);
console.log(`Remaining: ${state.remainingTime}ms`);
console.log(`Current lap: ${state.currentLap}`);
console.log(`Best lap: ${state.bestLapTime}ms`);

// Get formatted strings for display
const raceTime = timer.getFormattedRaceTime();     // "01:23.45"
const remaining = timer.getFormattedRemainingTime(); // "00:45.67"
const bestLap = timer.getFormattedBestLapTime();   // "01:15.32"
```

### HUD Integration Example

```typescript
// In UISystem.update()
const timer = TimerSystem.getInstance();
const state = timer.getState();

// Update HUD display
this.updateHUDElements({
  raceTime: timer.getFormattedRaceTime(),
  remainingTime: timer.getFormattedRemainingTime(),
  lapNumber: state.currentLap,
  lapProgress: state.lapTimes.length,
  bestLapTime: timer.getFormattedBestLapTime(),
});
```

### Event Types

```typescript
enum TimerEvent {
  RACE_STARTED = 'race_started',
  RACE_PAUSED = 'race_paused',
  RACE_RESUMED = 'race_resumed',
  CHECKPOINT_BONUS = 'checkpoint_bonus',
  LAP_COMPLETE = 'lap_complete',
  PENALTY_APPLIED = 'penalty_applied',
  TIME_EXPIRED = 'time_expired',
}
```

### Configuration

```typescript
// Set custom race duration (default: 120 seconds)
const timer = TimerSystem.getInstance();
timer.setInitialTime(180000); // 180 seconds in milliseconds

// Minimum 10 seconds, maximum recommended 300 seconds
```

### Testing

```typescript
// Reset singleton for testing
TimerSystem.resetInstance();

// Create fresh instance
const timer = TimerSystem.getInstance();

// Use normally
timer.start();
timer.update(0.016);
```

---

## LeaderboardSystem API

The LeaderboardSystem manages the top 10 leaderboard with persistent storage.

### Quick Start

```typescript
import { LeaderboardSystem } from '@systems/LeaderboardSystem';

// Get singleton instance
const leaderboard = LeaderboardSystem.getInstance();

// Check if time qualifies
if (leaderboard.isTopTen(lapTime)) {
  // Prompt player for name
  const submitted = leaderboard.submitTime('PlayerName', lapTime, ghostData);
  if (submitted) {
    console.log('Added to leaderboard!');
  }
}

// Display leaderboard
const entries = leaderboard.getLeaderboard();
for (const entry of entries) {
  console.log(`${entry.rank}. ${entry.playerName} - ${entry.lapTime}ms`);
}
```

### Submitting Times

```typescript
// Check if time qualifies before showing name entry UI
if (leaderboard.isTopTen(bestLapTime)) {
  // Show name entry dialog
  const playerName = await this.showNameEntryDialog();

  // Get ghost data from ReplayRecorder (optional)
  const ghostData = this.replayRecorder.serializeBuffer();

  // Submit time
  const added = leaderboard.submitTime(playerName, bestLapTime, ghostData);

  if (added) {
    // Show leaderboard entry notification
    const entry = leaderboard.getLeaderboard()[0];
    this.showLeaderboardEntryNotification(entry);
  }
}

// Validation
const result1 = leaderboard.submitTime('', 45000);        // false (empty name)
const result2 = leaderboard.submitTime('Player', 0);      // false (invalid time)
const result3 = leaderboard.submitTime('Player', -100);   // false (negative time)
const result4 = leaderboard.submitTime('Player', 45000);  // true/false (depends on top 10)
```

### Retrieving Leaderboard

```typescript
// Get full leaderboard (sorted by rank)
const entries = leaderboard.getLeaderboard();

entries.forEach(entry => {
  console.log(`${entry.rank}. ${entry.playerName}`);
  console.log(`   Time: ${entry.lapTime}ms`);
  console.log(`   Date: ${entry.timestamp.toLocaleString()}`);
  console.log(`   Has ghost: ${entry.ghostData ? 'Yes' : 'No'}`);
});

// Get entry count (0-10)
const count = leaderboard.getEntryCount();
console.log(`Leaderboard has ${count} entries`);

// Get time at specific rank
const rank5Time = leaderboard.getTimeAtRank(5); // milliseconds or Infinity
if (rank5Time === Infinity) {
  console.log('Less than 5 entries on leaderboard');
}
```

### Ghost Data Management

```typescript
// When submitting time with ghost data
const ghostData = this.replayRecorder.serializeBuffer();
leaderboard.submitTime(playerName, lapTime, ghostData);

// Later, retrieve ghost data for specific rank
const ghost = leaderboard.getGhostData(1); // Get rank 1 ghost

if (ghost) {
  // Load ghost for playback
  this.replayRecorder.loadFromBuffer(ghost);
} else {
  console.log('No ghost data available for this rank');
}
```

### Leaderboard Display Example

```typescript
// Component to display leaderboard
class LeaderboardUI {
  render(): void {
    const leaderboard = LeaderboardSystem.getInstance();
    const entries = leaderboard.getLeaderboard();

    if (entries.length === 0) {
      this.showEmptyState();
      return;
    }

    // Render entries
    entries.forEach(entry => {
      const rankColor = entry.rank === 1 ? 'gold' : 'silver';
      this.renderEntry(
        entry.rank,
        entry.playerName,
        this.formatTime(entry.lapTime),
        entry.ghostData ? 'GHOST' : '',
        rankColor
      );
    });

    // Show next time needed to qualify
    if (entries.length >= 10) {
      const timeToQualify = entries[9].lapTime;
      this.showTimeToQualify(timeToQualify);
    }
  }

  private formatTime(ms: number): string {
    const timer = TimerSystem.getInstance();
    return timer.formatTime(ms);
  }
}
```

### Results Screen Integration

```typescript
// On race completion (GameEngine results state)
async onRaceComplete(bestLapTime: number, ghostData?: Uint8Array): Promise<void> {
  const leaderboard = LeaderboardSystem.getInstance();

  // Check qualification
  if (leaderboard.isTopTen(bestLapTime)) {
    // Show "Top 10!" notification
    this.showTopTenNotification();

    // Prompt for name
    const playerName = await this.showNameEntryDialog();
    if (playerName) {
      // Submit time
      const added = leaderboard.submitTime(playerName, bestLapTime, ghostData);

      if (added) {
        // Get rank
        const entries = leaderboard.getLeaderboard();
        const entry = entries.find(e => e.playerName === playerName);
        this.showRankNotification(entry?.rank || 0);
      }
    }
  } else {
    // Show close call message
    const entries = leaderboard.getLeaderboard();
    if (entries.length >= 10) {
      const lastTime = entries[9].lapTime;
      const diff = bestLapTime - lastTime;
      this.showMissNotification(diff);
    }
  }

  // Display full leaderboard
  this.displayLeaderboard();
}
```

### Clearing and Testing

```typescript
// Clear all entries (for testing or reset)
leaderboard.clearLeaderboard();

// Reset singleton for testing
LeaderboardSystem.resetInstance();
```

### Storage Details

```typescript
// Leaderboard persists to localStorage automatically
// Storage key: 'harddriving_leaderboard'
// Data format: JSON with version 1

// If localStorage quota exceeded:
// - System removes oldest entry and retries
// - Graceful degradation (game continues)

// If corrupted data on load:
// - System logs warning
// - Initializes with empty state
// - No errors thrown
```

---

## StatisticsSystem API

The StatisticsSystem tracks cumulative game statistics across sessions.

### Quick Start

```typescript
import { StatisticsSystem } from '@systems/StatisticsSystem';

// Get singleton instance
const stats = StatisticsSystem.getInstance();

// Record race completion
stats.recordRaceComplete(lapTime, crashCount, distanceTraveled);

// Record speed samples (called every frame during PLAYING)
stats.recordSpeed(currentVelocity.length());

// Record play time (called every frame from GameEngine)
stats.recordPlayTime(deltaTime);

// Get statistics
const allStats = stats.getStats();
console.log(`Total races: ${allStats.totalRaces}`);
console.log(`Best lap: ${allStats.bestLapTime}ms`);
```

### Recording Race Completion

```typescript
// Called when race ends (GameEngine RESULTS state)
onRaceComplete(
  bestLapTime: number,
  totalCrashes: number,
  totalDistance: number
): void {
  const stats = StatisticsSystem.getInstance();
  stats.recordRaceComplete(bestLapTime, totalCrashes, totalDistance);
}

// Example values
stats.recordRaceComplete(
  45230,    // Best lap in this race (milliseconds)
  2,        // Crashes during race
  1500      // Distance traveled (meters)
);
```

### Recording Speed

```typescript
// Called frequently during PLAYING state (can be every frame)
updateSpeed(): void {
  const speed = this.vehicle.getVelocity().length(); // m/s
  StatisticsSystem.getInstance().recordSpeed(speed);
}

// Or from vehicle update
class Vehicle {
  update(deltaTime: number): void {
    // ... vehicle physics ...
    const speed = this.getVelocity().length();
    StatisticsSystem.getInstance().recordSpeed(speed);
  }
}
```

### Recording Play Time

```typescript
// Called from GameEngine.update() for all active game states
class GameEngine {
  update(deltaTime: number): void {
    // ... game logic ...

    // Record play time (always, not just PLAYING state)
    const stats = StatisticsSystem.getInstance();
    stats.recordPlayTime(deltaTime);
  }
}

// Note: Play time includes menus, pauses, etc.
// To track only racing time, check game state first:
if (this.gameState === GameState.PLAYING) {
  stats.recordPlayTime(deltaTime);
}
```

### Retrieving Statistics

```typescript
// Get full statistics object
const allStats = stats.getStats();
console.log(allStats);
// {
//   totalRaces: 5,
//   totalCrashes: 8,
//   totalDistance: 7500,
//   bestLapTime: 45230,
//   averageSpeed: 15.3,
//   topSpeed: 52.1,
//   timePlayedTotal: 1250
// }

// Get individual values
const races = stats.getTotalRaces();
const crashes = stats.getTotalCrashes();
const distance = stats.getTotalDistance();
const bestLap = stats.getBestLapTime();
const avgSpeed = stats.getAverageSpeed();
const topSpeed = stats.getTopSpeed();
const playTime = stats.getTotalPlayTime();
```

### Calculated Statistics

```typescript
// Get average crashes per race
const crashRate = stats.getAverageCrashesPerRace(); // 0-10
// Formula: totalCrashes / totalRaces

// Get average distance per race
const avgDistance = stats.getAverageDistance(); // meters
// Formula: totalDistance / totalRaces

// Speed average is rolling (exponential moving average)
const avgSpeed = stats.getAverageSpeed(); // m/s
// Formula: newAvg = oldAvg * 0.99 + currentSpeed * 0.01
```

### Dashboard/Results Screen Integration

```typescript
// Display statistics on results screen
class ResultsScreen {
  render(): void {
    const stats = StatisticsSystem.getInstance();
    const allStats = stats.getStats();

    this.renderSection('Career Statistics', [
      ['Total Races', this.formatNumber(allStats.totalRaces)],
      ['Total Crashes', this.formatNumber(allStats.totalCrashes)],
      ['Avg Crashes/Race', this.formatNumber(allStats.totalRaces > 0 ? stats.getAverageCrashesPerRace() : 0)],
      ['Total Distance', `${(allStats.totalDistance / 1000).toFixed(1)} km`],
      ['Avg Distance/Race', `${(stats.getAverageDistance()).toFixed(0)} m`],
      ['Best Lap Time', this.formatTime(allStats.bestLapTime)],
      ['Average Speed', `${allStats.averageSpeed.toFixed(1)} m/s`],
      ['Top Speed', `${allStats.topSpeed.toFixed(1)} m/s`],
      ['Time Played', this.formatSeconds(allStats.timePlayedTotal)],
    ]);
  }

  private formatTime(ms: number): string {
    if (ms === Infinity) return '--:--';
    const timer = TimerSystem.getInstance();
    return timer.formatTime(ms);
  }

  private formatSeconds(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${mins}m ${secs}s`;
  }
}
```

### Per-Race Statistics Example

```typescript
// Track single race statistics
class RaceStats {
  private startTime: number = 0;
  private crashCount: number = 0;
  private distanceTraveled: number = 0;

  onRaceStart(): void {
    this.startTime = performance.now();
    this.crashCount = 0;
    this.distanceTraveled = 0;
  }

  onCrash(): void {
    this.crashCount++;
  }

  updateDistance(deltaPosition: Vector3): void {
    this.distanceTraveled += deltaPosition.length();
  }

  onRaceComplete(bestLapTime: number): void {
    const stats = StatisticsSystem.getInstance();
    stats.recordRaceComplete(
      bestLapTime,
      this.crashCount,
      this.distanceTraveled
    );
  }
}
```

### Speed Recording Pattern

```typescript
// In Vehicle update loop
class Vehicle {
  private lastRecordTime: number = 0;

  update(deltaTime: number): void {
    // ... physics calculations ...

    // Record speed every 0.1 seconds (10 times per second)
    // to avoid excessive updates and memory allocations
    const now = performance.now();
    if (now - this.lastRecordTime > 100) {
      const speed = this.getVelocity().length();
      StatisticsSystem.getInstance().recordSpeed(speed);
      this.lastRecordTime = now;
    }
  }
}
```

### Reset and Testing

```typescript
// Reset all statistics (start fresh)
const stats = StatisticsSystem.getInstance();
stats.resetStats();

// Verify reset
const cleared = stats.getStats();
console.log(cleared.totalRaces); // 0
console.log(cleared.bestLapTime); // Infinity

// Reset singleton for testing
StatisticsSystem.resetInstance();
```

### Storage Details

```typescript
// Statistics persist to localStorage automatically
// Storage key: 'harddriving_stats'
// Data format: JSON with version 1

// If localStorage quota exceeded:
// - System logs warning
// - Game continues without persistence
// - Data lost on page reload

// If corrupted data on load:
// - System logs warning
// - Initializes with defaults (0 values)
// - No errors thrown
```

---

## Integration Checklist

When implementing these systems in GameEngine, use this checklist:

```typescript
// Initialization
const timerSystem = TimerSystem.getInstance();
const leaderboardSystem = LeaderboardSystem.getInstance();
const statsSystem = StatisticsSystem.getInstance();

// On state change to PLAYING
if (newState === GameState.PLAYING) {
  timerSystem.start();
  // ... other init
}

// On state change from PLAYING to PAUSED
if (newState === GameState.PAUSED && oldState === GameState.PLAYING) {
  timerSystem.pause();
}

// On state change from PAUSED to PLAYING
if (newState === GameState.PLAYING && oldState === GameState.PAUSED) {
  timerSystem.resume();
}

// Every frame update
update(deltaTime: number): void {
  // Timer
  timerSystem.update(deltaTime);

  // Stats (always record play time)
  statsSystem.recordPlayTime(deltaTime);

  // Speed (from vehicle)
  if (this.vehicle) {
    statsSystem.recordSpeed(this.vehicle.getVelocity().length());
  }
}

// On crash
onCrash(severity: CrashSeverity): void {
  const penalty = { MINOR: 5, MAJOR: 10, CATASTROPHIC: 15 }[severity];
  timerSystem.applyPenalty(penalty);
}

// On checkpoint
onCheckpointPassed(): void {
  timerSystem.onCheckpointPassed(30); // 30 second bonus
}

// On lap complete
onLapCompleted(): void {
  timerSystem.onLapCompleted();
}

// On time expired / race end
onRaceEnd(): void {
  const state = timerSystem.getState();
  statsSystem.recordRaceComplete(
    state.bestLapTime,
    crashCount,
    totalDistance
  );

  // Check leaderboard
  if (leaderboardSystem.isTopTen(state.bestLapTime)) {
    // Show name entry
    showNameEntryDialog();
  }
}

// On shutdown
dispose(): void {
  timerSystem.dispose();
  leaderboardSystem.dispose();
  statsSystem.dispose();
}
```

---

## Common Patterns

### Timer Event Subscription

```typescript
// Subscribe to multiple events
const timer = TimerSystem.getInstance();
const unsubscribe = () => {
  timer.unsubscribe(handleTimerEvent);
};

function handleTimerEvent(event: TimerEvent, data?: any) {
  switch (event) {
    case TimerEvent.CHECKPOINT_BONUS:
      playSoundEffect('bonus');
      updateUI('Checkpoint: +30s');
      break;
    case TimerEvent.LAP_COMPLETE:
      updateUI(`Lap ${data.lapNumber}: ${data.lapTime}ms`);
      break;
    case TimerEvent.PENALTY_APPLIED:
      playSoundEffect('penalty');
      updateUI(`Penalty: -${data.penaltySeconds}s`);
      break;
    case TimerEvent.TIME_EXPIRED:
      onRaceEnd(data);
      break;
  }
}

timer.subscribe(handleTimerEvent);
```

### Null Safety

```typescript
// All systems return safe defaults
const timer = TimerSystem.getInstance();

const bestLap = timer.getBestLapTime(); // Infinity if not set
const formatted = timer.getFormattedBestLapTime(); // '--:--' if Infinity

const leaderboard = LeaderboardSystem.getInstance();
const ghost = leaderboard.getGhostData(5); // null if not available

const stats = StatisticsSystem.getInstance();
const avg = stats.getAverageCrashesPerRace(); // 0 if no races
```

### Error Handling

```typescript
// All systems handle errors gracefully
try {
  // Storage failures don't throw
  leaderboard.submitTime('Player', 45000, ghostData);

  // Returns false if validation fails
  const added = leaderboard.submitTime('', 0);

  // Corrupted storage initializes with defaults
  const loaded = LeaderboardSystem.getInstance();
} catch (error) {
  // Never throws - errors logged internally
  console.error('Unexpected error:', error);
}
```

---

**End of Phase 5 API Guide**

For more information, see:
- `__DOCS__/phase5/PHASE_5_COMPLETION_REPORT.md` - Detailed implementation report
- `__DOCS__/PRD.md` Section 4.4 - Requirements and specifications
- Source code: `src/systems/TimerSystem.ts`, `LeaderboardSystem.ts`, `StatisticsSystem.ts`

