## Phase 7: UI & Audio
**Duration**: Week 11-12 (10 days)  
**Status**: 🔴 Not Started  
**Dependencies**: All core systems (Phases 1-6)  
**Team**: 3-4 developers  
**Parallel Work**: ⚡ Split into 7A (UI), 7B (Audio), 7C (Polish)

### Phase 7A: User Interface ⚡
**Developer Focus**: UI/Frontend Developer

#### Tasks
- [ ] **Create UISystem.ts**
  ```typescript
  export enum UIState {
    LOADING = 'loading',
    MAIN_MENU = 'main-menu',
    GAMEPLAY = 'gameplay',
    PAUSE_MENU = 'pause-menu',
    RESULTS = 'results',
    LEADERBOARD = 'leaderboard',
    SETTINGS = 'settings',
  }

  export class UISystem {
    private state: UIState = UIState.LOADING;
    private containers: Map<UIState, HTMLElement> = new Map();

    constructor() {
      this.createAllUI();
      this.attachEventListeners();
    }

    setState(state: UIState): void {
      // Hide all containers
      this.containers.forEach((container) => {
        container.style.display = 'none';
      });

      // Show target container
      const target = this.containers.get(state);
      if (target) {
        target.style.display = 'flex';
      }

      this.state = state;
    }

    private createAllUI(): void {
      this.containers.set(UIState.LOADING, this.createLoadingScreen());
      this.containers.set(UIState.MAIN_MENU, this.createMainMenu());
      this.containers.set(UIState.GAMEPLAY, this.createHUD());
      this.containers.set(UIState.PAUSE_MENU, this.createPauseMenu());
      this.containers.set(UIState.RESULTS, this.createResultsScreen());
      this.containers.set(UIState.LEADERBOARD, this.createLeaderboard());
      this.containers.set(UIState.SETTINGS, this.createSettings());
    }
  }
  ```

- [ ] **Create main menu**
  ```typescript
  private createMainMenu(): HTMLElement {
    const menu = document.createElement('div');
    menu.className = 'main-menu';
    menu.innerHTML = `
      <div class="menu-container">
        <h1 class="game-title">HARD DRIVIN'</h1>
        <div class="menu-buttons">
          <button id="start-race" class="menu-btn primary">START RACE</button>
          <button id="time-trial" class="menu-btn">TIME TRIAL</button>
          <button id="leaderboard" class="menu-btn">LEADERBOARD</button>
          <button id="settings" class="menu-btn">SETTINGS</button>
          <button id="credits" class="menu-btn">CREDITS</button>
        </div>
        <div class="version">v1.0.0</div>
      </div>
      <div id="bg-scene"></div>
    `;
    document.body.appendChild(menu);
    return menu;
  }
  ```

- [ ] **Create HUD**
  ```typescript
  private createHUD(): HTMLElement {
    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.innerHTML = `
      <div class="hud-top-left">
        <div class="lap-counter">
          <span class="label">LAP</span>
          <span id="current-lap">1</span>
          <span class="separator">/</span>
          <span id="total-laps">2</span>
        </div>
        <div class="minimap" id="minimap-container">
          <canvas id="minimap-canvas" width="150" height="150"></canvas>
        </div>
      </div>

      <div class="hud-top-center">
        <div class="timer" id="race-timer">2:00.00</div>
        <div class="checkpoint-bonus" id="checkpoint-bonus">+30s</div>
      </div>

      <div class="hud-top-right">
        <div class="damage-indicator">
          <div class="damage-bar">
            <div id="damage-fill" class="damage-fill"></div>
          </div>
        </div>
      </div>

      <div class="hud-bottom-left">
        <div class="speed-display">
          <div class="speed-value" id="speed-value">0</div>
          <div class="speed-unit">MPH</div>
        </div>
      </div>

      <div class="hud-bottom-right">
        <div class="speedometer">
          <svg viewBox="0 0 200 120" class="speedo-svg">
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#333" stroke-width="8"/>
            <path id="speedo-arc" d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#0ff" stroke-width="8"/>
            <line id="speedo-needle" x1="100" y1="100" x2="100" y2="40" stroke="#f00" stroke-width="3"/>
          </svg>
        </div>
      </div>

      <div class="hud-center-bottom">
        <div class="message-display" id="message-display"></div>
      </div>
    `;
    document.body.appendChild(hud);
    return hud;
  }

  updateHUD(gameState: any): void {
    // Update lap counter
    document.getElementById('current-lap')!.textContent = gameState.currentLap.toString();
    
    // Update timer
    const timerEl = document.getElementById('race-timer')!;
    const time = TimerSystem.getInstance().formatTime(gameState.remainingTime);
    timerEl.textContent = time;
    
    // Color code based on time remaining
    if (gameState.remainingTime < 30000) {
      timerEl.classList.add('warning');
    } else if (gameState.remainingTime < 10000) {
      timerEl.classList.add('critical');
    }

    // Update speed
    document.getElementById('speed-value')!.textContent = 
      Math.round(gameState.speed * 2.237).toString(); // m/s to mph

    // Update speedometer needle
    const speedPercent = gameState.speed / 55; // max speed
    const angle = -90 + (speedPercent * 180); // -90° to 90°
    document.getElementById('speedo-needle')!.setAttribute(
      'transform',
      `rotate(${angle} 100 100)`
    );

    // Update damage
    const damagePercent = gameState.health / 100;
    document.getElementById('damage-fill')!.style.width = `${damagePercent * 100}%`;
  }
  ```

- [ ] **Create results screen**
  ```typescript
  private createResultsScreen(): HTMLElement {
    const results = document.createElement('div');
    results.className = 'results-screen';
    results.innerHTML = `
      <div class="results-container">
        <h2 class="results-title">RACE COMPLETE</h2>
        
        <div class="results-stats">
          <div class="stat-row main-stat">
            <span class="stat-label">FINAL TIME</span>
            <span id="final-time" class="stat-value">0:00.00</span>
          </div>
          
          <div class="stat-row">
            <span class="stat-label">Best Lap</span>
            <span id="best-lap" class="stat-value">0:00.00</span>
          </div>
          
          <div class="stat-row">
            <span class="stat-label">Avg Speed</span>
            <span id="avg-speed" class="stat-value">0 MPH</span>
          </div>
          
          <div class="stat-row">
            <span class="stat-label">Crashes</span>
            <span id="crash-count" class="stat-value">0</span>
          </div>
        </div>

        <div id="new-record-banner" class="new-record hidden">
          🏆 NEW RECORD! 🏆
        </div>

        <div class="results-buttons">
          <button id="retry-btn" class="btn primary">RETRY</button>
          <button id="view-leaderboard-btn" class="btn">VIEW LEADERBOARD</button>
          <button id="main-menu-btn" class="btn">MAIN MENU</button>
        </div>
      </div>
    `;
    document.body.appendChild(results);
    return results;
  }
  ```

- [ ] **Create settings panel**
  ```typescript
  private createSettings(): HTMLElement {
    const settings = document.createElement('div');
    settings.className = 'settings-panel';
    settings.innerHTML = `
      <div class="settings-container">
        <h2>SETTINGS</h2>
        
        <div class="settings-section">
          <h3>Graphics</h3>
          <div class="setting-row">
            <label>Quality</label>
            <select id="quality-select">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div class="setting-row">
            <label>Shadows</label>
            <input type="checkbox" id="shadows-toggle" checked>
          </div>
          <div class="setting-row">
            <label>Anti-aliasing</label>
            <input type="checkbox" id="aa-toggle" checked>
          </div>
        </div>

        <div class="settings-section">
          <h3>Audio</h3>
          <div class="setting-row">
            <label>Master Volume</label>
            <input type="range" id="master-volume" min="0" max="100" value="80">
            <span id="master-volume-value">80%</span>
          </div>
          <div class="setting-row">
            <label>SFX Volume</label>
            <input type="range" id="sfx-volume" min="0" max="100" value="70">
            <span id="sfx-volume-value">70%</span>
          </div>
          <div class="setting-row">
            <label>Music Volume</label>
            <input type="range" id="music-volume" min="0" max="100" value="50">
            <span id="music-volume-value">50%</span>
          </div>
        </div>

        <div class="settings-section">
          <h3>Controls</h3>
          <div class="setting-row">
            <label>Speed Unit</label>
            <select id="speed-unit">
              <option value="mph">MPH</option>
              <option value="kmh">KM/H</option>
            </select>
          </div>
          <div class="setting-row">
            <label>Steering Sensitivity</label>
            <input type="range" id="steering-sens" min="50" max="150" value="100">
          </div>
        </div>

        <div class="settings-buttons">
          <button id="save-settings" class="btn primary">SAVE</button>
          <button id="cancel-settings" class="btn">CANCEL</button>
        </div>
      </div>
    `;
    document.body.appendChild(settings);
    return settings;
  }
  ```

- [ ] **Add CSS styling (styles.css)**
  ```css
  /* Main Menu */
  .main-menu {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  }

  .game-title {
    font-size: 72px;
    font-weight: bold;
    color: #00ffff;
    text-shadow: 0 0 20px #00ffff, 0 0 40px #ff00ff;
    margin-bottom: 40px;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { text-shadow: 0 0 20px #00ffff, 0 0 40px #ff00ff; }
    50% { text-shadow: 0 0 30px #00ffff, 0 0 60px #ff00ff; }
  }

  .menu-btn {
    width: 300px;
    padding: 15px;
    margin: 10px;
    font-size: 20px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid #00ffff;
    color: white;
    cursor: pointer;
    transition: all 0.3s;
  }

  .menu-btn:hover {
    background: rgba(0, 255, 255, 0.2);
    transform: scale(1.05);
  }

  .menu-btn.primary {
    background: #00ffff;
    color: #000;
    font-weight: bold;
  }

  /* HUD */
  .hud {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    font-family: 'Courier New', monospace;
  }

  .hud-top-left {
    position: absolute;
    top: 20px;
    left: 20px;
  }

  .lap-counter {
    font-size: 24px;
    color: white;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  }

  .timer {
    font-size: 48px;
    font-weight: bold;
    color: #00ff00;
    text-shadow: 0 0 10px #00ff00;
    transition: color 0.3s;
  }

  .timer.warning {
    color: #ffff00;
    text-shadow: 0 0 10px #ffff00;
  }

  .timer.critical {
    color: #ff0000;
    text-shadow: 0 0 10px #ff0000;
    animation: blink 0.5s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .speed-display {
    font-size: 48px;
    font-weight: bold;
    color: white;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  }

  .minimap {
    width: 150px;
    height: 150px;
    border: 2px solid #00ffff;
    background: rgba(0, 0, 0, 0.7);
    margin-top: 10px;
  }

  /* Results Screen */
  .results-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.9);
  }

  .results-container {
    text-align: center;
    color: white;
  }

  .results-title {
    font-size: 48px;
    color: #00ffff;
    margin-bottom: 40px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 20px;
    font-size: 20px;
  }

  .stat-row.main-stat {
    font-size: 36px;
    color: #00ffff;
    border-bottom: 2px solid #00ffff;
    margin-bottom: 20px;
  }

  .new-record {
    font-size: 32px;
    color: #ffd700;
    margin: 20px 0;
    animation: recordPulse 1s ease-in-out infinite;
  }

  @keyframes recordPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  ```

### Phase 7B: Audio System ⚡
**Developer Focus**: Audio Engineer

#### Tasks
- [ ] **Create AudioSystem.ts**
  ```typescript
  import { Howl, Howler } from 'howler';

  export class AudioSystem {
    private sounds: Map<string, Howl> = new Map();
    private music: Map<string, Howl> = new Map();
    private currentMusic: Howl | null = null;
    
    private masterVolume = 0.8;
    private sfxVolume = 0.7;
    private musicVolume = 0.5;

    async init(): Promise<void> {
      // Load all sound effects
      await this.loadSounds();
      await this.loadMusic();
      
      Howler.volume(this.masterVolume);
      console.log('Audio system initialized');
    }

    private async loadSounds(): Promise<void> {
      const soundFiles = {
        'engine_idle': 'assets/audio/engine_idle.ogg',
        'engine_rev': 'assets/audio/engine_rev.ogg',
        'tire_squeal': 'assets/audio/tire_squeal.ogg',
        'crash_major': 'assets/audio/crash_major.ogg',
        'crash_minor': 'assets/audio/crash_minor.ogg',
        'checkpoint': 'assets/audio/checkpoint.ogg',
        'offroad': 'assets/audio/offroad.ogg',
        'ui_click': 'assets/audio/ui_click.ogg',
        'countdown': 'assets/audio/countdown.ogg',
      };

      for (const [name, path] of Object.entries(soundFiles)) {
        const sound = new Howl({
          src: [path],
          volume: this.sfxVolume,
          preload: true,
        });
        
        this.sounds.set(name, sound);
      }
    }

    private async loadMusic(): Promise<void> {
      const musicFiles = {
        'menu': 'assets/audio/menu_music.mp3',
        'race': 'assets/audio/race_music.mp3',
      };

      for (const [name, path] of Object.entries(musicFiles)) {
        const music = new Howl({
          src: [path],
          volume: this.musicVolume,
          loop: true,
          preload: true,
        });
        
        this.music.set(name, music);
      }
    }

    playSound(name: string, volume = 1.0): void {
      const sound = this.sounds.get(name);
      if (sound) {
        sound.volume(volume * this.sfxVolume);
        sound.play();
      }
    }

    playSoundAt(name: string, position: THREE.Vector3, listenerPos: THREE.Vector3): void {
      const sound = this.sounds.get(name);
      if (!sound) return;

      const distance = position.distanceTo(listenerPos);
      const maxDistance = 50;
      const volume = Math.max(0, 1 - (distance / maxDistance));

      sound.volume(volume * this.sfxVolume);
      sound.play();
    }

    loopSound(name: string, volume = 1.0): number {
      const sound = this.sounds.get(name);
      if (sound) {
        sound.volume(volume * this.sfxVolume);
        sound.loop(true);
        return sound.play();
      }
      return -1;
    }

    stopSound(name: string, id?: number): void {
      const sound = this.sounds.get(name);
      if (sound) {
        if (id !== undefined) {
          sound.stop(id);
        } else {
          sound.stop();
        }
      }
    }

    playMusic(name: string): void {
      // Stop current music
      if (this.currentMusic) {
        this.currentMusic.fade(this.musicVolume, 0, 1000);
        setTimeout(() => {
          this.currentMusic?.stop();
        }, 1000);
      }

      // Start new music
      const music = this.music.get(name);
      if (music) {
        music.volume(0);
        music.play();
        music.fade(0, this.musicVolume, 1000);
        this.currentMusic = music;
      }
    }

    setMasterVolume(volume: number): void {
      this.masterVolume = Math.max(0, Math.min(1, volume));
      Howler.volume(this.masterVolume);
    }

    setSFXVolume(volume: number): void {
      this.sfxVolume = Math.max(0, Math.min(1, volume));
      this.sounds.forEach(sound => {
        sound.volume(this.sfxVolume);
      });
    }

    setMusicVolume(volume: number): void {
      this.musicVolume = Math.max(0, Math.min(1, volume));
      if (this.currentMusic) {
        this.currentMusic.volume(this.musicVolume);
      }
    }
  }
  ```

- [ ] **Add engine sound with RPM variation**
  ```typescript
  export class EngineSoundManager {
    private idleSound: number;
    private revSound: number;
    private currentRPM = 0;

    start(): void {
      this.idleSound = AudioSystem.getInstance().loopSound('engine_idle', 0.5);
      this.revSound = AudioSystem.getInstance().loopSound('engine_rev', 0);
    }

    updateRPM(rpm: number, maxRPM: number): void {
      this.currentRPM = rpm;
      const rpmPercent = rpm / maxRPM;

      // Fade between idle and rev sounds
      const idleVolume = Math.max(0, 0.5 - rpmPercent * 0.5);
      const revVolume = Math.min(0.8, rpmPercent);

      const idleSound = AudioSystem.getInstance().sounds.get('engine_idle');
      const revSound = AudioSystem.getInstance().sounds.get('engine_rev');

      if (idleSound && this.idleSound !== -1) {
        idleSound.volume(idleVolume, this.idleSound);
        idleSound.rate(0.8 + rpmPercent * 0.4, this.idleSound); // Pitch shift
      }

      if (revSound && this.revSound !== -1) {
        revSound.volume(revVolume, this.revSound);
        revSound.rate(0.9 + rpmPercent * 0.5, this.revSound);
      }
    }

    stop(): void {
      AudioSystem.getInstance().stopSound('engine_idle', this.idleSound);
      AudioSystem.getInstance().stopSound('engine_rev', this.revSound);
    }
  }
  ```

### Phase 7C: Visual Polish ⚡
**Developer Focus**: Effects/Graphics Developer

#### Tasks
- [ ] **Create ParticleEffects.ts**
  ```typescript
  export class ParticleEffects {
    private scene: THREE.Scene;
    private pools: Map<string, THREE.Points[]> = new Map();

    constructor(scene: THREE.Scene) {
      this.scene = scene;
      this.createPools();
    }

    private createPools(): void {
      // Pre-create particle systems for reuse
      this.pools.set('dust', this.createDustPool(20));
      this.pools.set('smoke', this.createSmokePool(10));
      this.pools.set('sparks', this.createSparksPool(15));
    }

    spawnDust(position: THREE.Vector3, velocity: THREE.Vector3): void {
      const particles = this.getFromPool('dust');
      if (!particles) return;

      particles.position.copy(position);
      this.scene.add(particles);

      // Animate
      this.animateDust(particles, velocity);
    }

    spawnSparks(position: THREE.Vector3): void {
      const particles = this.getFromPool('sparks');
      if (!particles) return;

      particles.position.copy(position);
      this.scene.add(particles);

      this.animateSparks(particles);
    }

    private animateDust(particles: THREE.Points, velocity: THREE.Vector3): void {
      const material = particles.material as THREE.PointsMaterial;
      let opacity = 0.8;
      let life = 2.0; // seconds

      const animate = () => {
        life -= 0.016; // ~60fps
        opacity *= 0.95;

        particles.position.add(velocity.clone().multiplyScalar(0.016));
        material.opacity = opacity;

        if (life > 0) {
          requestAnimationFrame(animate);
        } else {
          this.returnToPool('dust', particles);
        }
      };

      animate();
    }
  }
  ```

- [ ] **Add screen effects (ScreenEffects.ts)**
  ```typescript
  export class ScreenEffects {
    private composer: THREE.EffectComposer;
    private bloomPass: THREE.UnrealBloomPass;
    private vignettePass: THREE.ShaderPass;

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
      this.composer = new THREE.EffectComposer(renderer);
      
      const renderPass = new THREE.RenderPass(scene, camera);
      this.composer.addPass(renderPass);

      // Subtle bloom for lights and effects
      this.bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5,  // strength
        0.4,  // radius
        0.85  // threshold
      );
      this.composer.addPass(this.bloomPass);
    }

    flashCrash(): void {
      // White flash on crash
      const flash = document.createElement('div');
      flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: white;
        opacity: 0.8;
        pointer-events: none;
        animation: fadeOut 0.3s ease-out forwards;
      `;
      document.body.appendChild(flash);

      setTimeout(() => flash.remove(), 300);
    }

    applyDamageVignette(damagePercent: number): void {
      // Increase vignette as damage increases
      const intensity = (1 - damagePercent) * 0.5;
      // Apply to vignette shader uniform
    }
  }
  ```

- [ ] **Add loading screen with progress**
  ```typescript
  export class LoadingScreen {
    private container: HTMLElement;
    private progressBar: HTMLProgressElement;
    private statusText: HTMLSpanElement;

    constructor() {
      this.createUI();
    }

    private createUI(): void {
      this.container = document.createElement('div');
      this.container.className = 'loading-screen';
      this.container.innerHTML = `
        <div class="loading-container">
          <h1>HARD DRIVIN'</h1>
          <div class="loading-spinner"></div>
          <progress id="load-progress" value="0" max="100"></progress>
          <span id="load-status">Initializing...</span>
        </div>
      `;
      document.body.appendChild(this.container);

      this.progressBar = document.getElementById('load-progress') as HTMLProgressElement;
      this.statusText = document.getElementById('load-status') as HTMLSpanElement;
    }

    updateProgress(progress: number, status: string): void {
      this.progressBar.value = progress;
      this.statusText.textContent = status;
    }

    hide(): void {
      this.container.style.opacity = '0';
      setTimeout(() => {
        this.container.remove();
      }, 500);
    }
  }
  ```

### Testing Criteria
- [x] **All menus navigable** (keyboard + mouse)
- [x] **HUD updates in real-time**
- [x] **All UI elements visible** and readable
- [x] **Audio plays correctly** (all sounds)
- [x] **Music crossfades smoothly**
- [x] **Volume controls work**
- [x] **Engine sound varies with RPM**
- [x] **Particle effects render** correctly
- [x] **Screen effects don't tank FPS**
- [x] **Loading screen shows progress**
- [x] **UI scales on different resolutions**
- [x] **No audio distortion**
- [x] **Settings persist** across sessions
- [x] **Performance: 60fps maintained**

### Deliverables
- ✅ Complete UI system (all screens)
- ✅ Full audio implementation
- ✅ Particle effects system
- ✅ Screen effects (bloom, vignette)
- ✅ Loading screen with progress
- ✅ Polished HUD
- ✅ Settings persistence

### Performance Targets
- UI rendering: <2ms per frame
- Audio: <10 concurrent sounds
- Particles: <500 active at once
- Memory: <50MB for audio buffers

---