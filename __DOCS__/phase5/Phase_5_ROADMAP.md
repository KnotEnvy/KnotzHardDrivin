## Phase 5: Timing & Scoring System
**Duration**: Week 9 (5 days)  
**Status**: 🔴 Not Started  
**Dependencies**: Phase 3 complete  
**Team**: 2 developers  
**Parallel Work**: ⚡ Split into 5A (Timer) and 5B (Leaderboard)

### Phase 5A: Timer System ⚡
**Developer Focus**: Gameplay/Logic Developer

#### Tasks
- [ ] **Create TimerSystem.ts**
  ```typescript
  export interface TimerState {
    raceTime: number;        // Total elapsed time (ms)
    remainingTime: number;   // Countdown timer (ms)
    lapStartTime: number;    // Current lap start (ms)
    currentLap: number;
    lapTimes: number[];      // Array of completed lap times
    bestLapTime: number;
  }

  export class TimerSystem {
    private state: TimerState;
    private initialTime = 120000; // 120 seconds in ms
    private running = false;

    constructor() {
      this.state = {
        raceTime: 0,
        remainingTime: this.initialTime,
        lapStartTime: 0,
        currentLap: 1,
        lapTimes: [],
        bestLapTime: Infinity,
      };
    }

    start(): void {
      this.running = true;
      this.state.lapStartTime = performance.now();
    }

    update(deltaTime: number): void {
      if (!this.running) return;

      this.state.raceTime += deltaTime * 1000;
      this.state.remainingTime = Math.max(0, this.state.remainingTime - deltaTime * 1000);

      if (this.state.remainingTime <= 0) {
        this.onTimeExpired();
      }
    }

    onCheckpointPassed(timeBonus: number): void {
      this.state.remainingTime += timeBonus * 1000;
      console.log(`Time bonus! +${timeBonus}s`);
      
      // Visual feedback
      UISystem.getInstance().showTimeBonusAnimation(timeBonus);
      AudioSystem.getInstance().playSound('checkpoint');
    }

    onLapCompleted(): void {
      const lapTime = performance.now() - this.state.lapStartTime;
      this.state.lapTimes.push(lapTime);

      if (lapTime < this.state.bestLapTime) {
        this.state.bestLapTime = lapTime;
        console.log(`New best lap: ${this.formatTime(lapTime)}`);
        UISystem.getInstance().showNewRecordAnimation();
      }

      // Start next lap timer
      this.state.currentLap++;
      this.state.lapStartTime = performance.now();
    }

    private onTimeExpired(): void {
      this.running = false;
      GameEngine.getInstance().setState(GameState.RESULTS);
      
      // Show how far the player got
      const progress = WaypointSystem.getInstance().getProgress();
      console.log(`Time's up! Progress: ${(progress * 100).toFixed(1)}%`);
    }

    formatTime(milliseconds: number): string {
      const totalSeconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const ms = Math.floor((milliseconds % 1000) / 10);

      return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    getState(): TimerState {
      return { ...this.state };
    }

    applyPenalty(seconds: number): void {
      this.state.remainingTime = Math.max(0, this.state.remainingTime - seconds * 1000);
      console.log(`Penalty: -${seconds}s`);
      UISystem.getInstance().showPenaltyAnimation(seconds);
    }
  }
  ```

- [ ] **Add timer penalties**
  ```typescript
  // In appropriate systems:

  // Off-road timeout (in Vehicle.ts or OffRoadSystem.ts)
  if (timeOffRoad >= 10) {
    TimerSystem.getInstance().applyPenalty(5);
    Vehicle.getInstance().respawnAtLastWaypoint();
  }

  // Crash penalty (in CrashManager.ts)
  if (crashEvent.severity === 'major') {
    TimerSystem.getInstance().applyPenalty(10);
  } else if (crashEvent.severity === 'catastrophic') {
    TimerSystem.getInstance().applyPenalty(15);
  }
  ```

### Phase 5B: Scoring & Leaderboard ⚡
**Developer Focus**: Data/UI Developer

#### Tasks
- [ ] **Create LeaderboardSystem.ts**
  ```typescript
  export interface LeaderboardEntry {
    rank: number;
    playerName: string;
    lapTime: number;         // Best lap time in ms
    timestamp: Date;
    ghostData?: Uint8Array;  // Compressed replay data
  }

  export class LeaderboardSystem {
    private entries: LeaderboardEntry[] = [];
    private maxEntries = 10;
    private storageKey = 'harddriving_leaderboard';

    constructor() {
      this.load();
    }

    submitTime(playerName: string, lapTime: number, ghostData?: Uint8Array): boolean {
      // Check if time qualifies for leaderboard
      if (this.entries.length >= this.maxEntries && 
          lapTime >= this.entries[this.entries.length - 1].lapTime) {
        return false; // Not fast enough
      }

      const entry: LeaderboardEntry = {
        rank: 0, // Will be calculated after sorting
        playerName,
        lapTime,
        timestamp: new Date(),
        ghostData,
      };

      this.entries.push(entry);
      this.entries.sort((a, b) => a.lapTime - b.lapTime);
      
      // Keep only top 10
      if (this.entries.length > this.maxEntries) {
        this.entries = this.entries.slice(0, this.maxEntries);
      }

      // Update ranks
      this.entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      this.save();
      return true;
    }

    getLeaderboard(): LeaderboardEntry[] {
      return [...this.entries];
    }

    getGhostData(rank: number): Uint8Array | null {
      const entry = this.entries.find(e => e.rank === rank);
      return entry?.ghostData || null;
    }

    isTopTen(lapTime: number): boolean {
      if (this.entries.length < this.maxEntries) return true;
      return lapTime < this.entries[this.entries.length - 1].lapTime;
    }

    private save(): void {
      try {
        const data = {
          entries: this.entries.map(entry => ({
            ...entry,
            timestamp: entry.timestamp.toISOString(),
            ghostData: entry.ghostData ? Array.from(entry.ghostData) : undefined,
          })),
        };
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save leaderboard:', error);
      }
    }

    private load(): void {
      try {
        const data = localStorage.getItem(this.storageKey);
        if (!data) return;

        const parsed = JSON.parse(data);
        this.entries = parsed.entries.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
          ghostData: entry.ghostData ? new Uint8Array(entry.ghostData) : undefined,
        }));
      } catch (error) {
        console.error('Failed to load leaderboard:', error);
        this.entries = [];
      }
    }

    clearLeaderboard(): void {
      this.entries = [];
      this.save();
    }
  }
  ```

- [ ] **Create statistics tracking**
  ```typescript
  export interface GameStatistics {
    totalRaces: number;
    totalCrashes: number;
    totalDistance: number;       // meters
    bestLapTime: number;          // ms
    averageSpeed: number;         // m/s
    topSpeed: number;             // m/s
    timePlayedTotal: number;      // seconds
  }

  export class StatisticsSystem {
    private stats: GameStatistics;
    private storageKey = 'harddriving_stats';

    constructor() {
      this.load();
    }

    recordRaceComplete(lapTime: number, crashes: number, distance: number): void {
      this.stats.totalRaces++;
      this.stats.totalCrashes += crashes;
      this.stats.totalDistance += distance;

      if (lapTime < this.stats.bestLapTime) {
        this.stats.bestLapTime = lapTime;
      }

      this.save();
    }

    recordSpeed(speed: number): void {
      if (speed > this.stats.topSpeed) {
        this.stats.topSpeed = speed;
      }

      // Update rolling average
      const alpha = 0.01; // Smoothing factor
      this.stats.averageSpeed = this.stats.averageSpeed * (1 - alpha) + speed * alpha;
    }

    getStats(): GameStatistics {
      return { ...this.stats };
    }

    private save(): void {
      localStorage.setItem(this.storageKey, JSON.stringify(this.stats));
    }

    private load(): void {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        this.stats = JSON.parse(data);
      } else {
        this.stats = {
          totalRaces: 0,
          totalCrashes: 0,
          totalDistance: 0,
          bestLapTime: Infinity,
          averageSpeed: 0,
          topSpeed: 0,
          timePlayedTotal: 0,
        };
      }
    }
  }
  ```

### Testing Criteria
- [x] **Timer starts correctly**
- [x] **Timer counts down** accurately (verify with stopwatch)
- [x] **Checkpoint bonus applies** correctly (+30s)
- [x] **Lap times recorded** accurately
- [x] **Best lap tracked** correctly
- [x] **Time-out triggers** when timer reaches 0
- [x] **Penalties apply** correctly (crashes, off-road)
- [x] **Leaderboard saves** to localStorage
- [x] **Leaderboard loads** on page refresh
- [x] **Top 10 detection** works correctly
- [x] **Statistics persist** across sessions
- [x] **No localStorage errors** (quota exceeded handling)
- [x] **Time formatting** displays correctly (MM:SS.mmm)

### Deliverables
- ✅ Complete timing system
- ✅ Checkpoint/penalty mechanics
- ✅ Leaderboard with localStorage
- ✅ Statistics tracking
- ✅ Data persistence

### Performance Targets
- Timer update: <0.5ms per frame
- LocalStorage operations: <10ms
- Memory: <5MB for leaderboard data

---