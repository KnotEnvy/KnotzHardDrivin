/**
 * UISystem - Manages all UI elements, menus, and HUD
 *
 * Responsibilities:
 * - Main menu (start, settings, leaderboard)
 * - In-game HUD (speedometer, timer, position, damage)
 * - Pause menu
 * - Results screen
 * - Settings panel
 * - State-based UI visibility
 *
 * Design Pattern: Singleton
 * Performance: <1ms per update
 *
 * Integration:
 * - GameEngine: Listen to state changes, update HUD
 * - TimerSystem: Display lap times and race timer
 * - LeaderboardSystem: Display rankings
 * - Vehicle: Display speed, damage, telemetry
 *
 * Usage:
 * ```typescript
 * const ui = UISystem.getInstance();
 * ui.init();
 * ui.showMainMenu();
 * ui.updateHUD(speed, lapTime, position);
 * ```
 */

import { GameState } from '../core/GameEngine';
import type { TimerSystem } from './TimerSystem';
import type { LeaderboardSystem } from './LeaderboardSystem';
import type { Vehicle } from '../entities/Vehicle';

/**
 * UI panel types
 */
export enum UIPanel {
  MAIN_MENU = 'main-menu',
  CAR_SELECTION = 'car-selection',
  HUD = 'hud',
  PAUSE_MENU = 'pause-menu',
  RESULTS = 'results',
  SETTINGS = 'settings',
  LEADERBOARD = 'leaderboard',
  LOADING = 'loading',
}

/**
 * Singleton UISystem
 */
export class UISystem {
  private static instance: UISystem | null = null;

  // UI Elements
  private container: HTMLElement | null = null;
  private mainMenu: HTMLElement | null = null;
  private carSelection: HTMLElement | null = null;
  private hud: HTMLElement | null = null;
  private pauseMenu: HTMLElement | null = null;
  private resultsScreen: HTMLElement | null = null;
  private settingsScreen: HTMLElement | null = null;
  private leaderboardScreen: HTMLElement | null = null;

  // HUD Elements
  private speedometer: HTMLElement | null = null;
  private lapTimer: HTMLElement | null = null;
  private positionDisplay: HTMLElement | null = null;
  private damageIndicator: HTMLElement | null = null;
  private lapCountElement: HTMLElement | null = null;

  // State
  private currentPanel: UIPanel | null = null;
  private initialized: boolean = false;

  /**
   * Private constructor (singleton)
   */
  private constructor() {}

  /**
   * Gets or creates singleton instance
   */
  public static getInstance(): UISystem {
    if (!UISystem.instance) {
      UISystem.instance = new UISystem();
    }
    return UISystem.instance;
  }

  /**
   * Resets singleton instance (for testing)
   */
  public static resetInstance(): void {
    if (UISystem.instance) {
      UISystem.instance.dispose();
      UISystem.instance = null;
    }
  }

  /**
   * Initializes UI system and creates DOM elements
   */
  public init(): void {
    if (this.initialized) return;

    this.createUIContainer();
    this.createMainMenu();
    this.createCarSelection();
    this.createHUD();
    this.createPauseMenu();
    this.createResultsScreen();
    this.createSettingsScreen();
    this.createLeaderboardScreen();

    this.initialized = true;
    console.log('UISystem initialized');
  }

  /**
   * Creates main UI container
   */
  private createUIContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'ui-container';
    // Styling handled by CSS
    document.body.appendChild(this.container);
  }

  /**
   * Creates main menu
   */
  private createMainMenu(): void {
    this.mainMenu = document.createElement('div');
    this.mainMenu.id = 'main-menu';

    this.mainMenu.innerHTML = `
      <h1>HARD DRIVIN'</h1>
      <div class="menu-button-group">
        <button id="btn-start" class="menu-button btn-primary">START RACE</button>
        <button id="btn-leaderboard" class="menu-button btn-secondary">LEADERBOARD</button>
        <button id="btn-settings" class="menu-button btn-secondary">SETTINGS</button>
      </div>
      <div class="menu-footer">
        Press SPACE to start | ESC for menu
      </div>
    `;

    this.container?.appendChild(this.mainMenu);
  }

  /**
   * Creates car selection screen
   */
  private createCarSelection(): void {
    this.carSelection = document.createElement('div');
    this.carSelection.id = 'car-selection';
    this.carSelection.style.display = 'none';

    this.carSelection.innerHTML = `
      <h1>SELECT YOUR VEHICLE</h1>
      <div class="car-grid">
        <!-- Corvette Card -->
        <div id="select-corvette" class="car-card corvette">
          <div class="car-card-image">🏎️</div>
          <h2>CORVETTE</h2>
          <div class="car-stats">
            <div class="car-stats-row">
              <span class="car-stats-label">⚡ Speed:</span>
              <span class="car-stats-value">★★★★★</span>
            </div>
            <div class="car-stats-row">
              <span class="car-stats-label">🏋️ Handling:</span>
              <span class="car-stats-value">★★★★☆</span>
            </div>
            <div class="car-stats-row">
              <span class="car-stats-label">🛡️ Durability:</span>
              <span class="car-stats-value">★★★☆☆</span>
            </div>
          </div>
          <div class="car-description">CLASSIC SPORTS CAR</div>
        </div>

        <!-- Cybertruck Card -->
        <div id="select-cybertruck" class="car-card cybertruck">
          <div class="car-card-image">🚙</div>
          <h2>CYBERTRUCK</h2>
          <div class="car-stats">
            <div class="car-stats-row">
              <span class="car-stats-label">⚡ Speed:</span>
              <span class="car-stats-value">★★★☆☆</span>
            </div>
            <div class="car-stats-row">
              <span class="car-stats-label">🏋️ Handling:</span>
              <span class="car-stats-value">★★★☆☆</span>
            </div>
            <div class="car-stats-row">
              <span class="car-stats-label">🛡️ Durability:</span>
              <span class="car-stats-value">★★★★★</span>
            </div>
          </div>
          <div class="car-description">FUTURISTIC BEAST</div>
        </div>
      </div>

      <div class="menu-footer">
        Select a vehicle to begin | ESC to go back
      </div>
    `;

    this.container?.appendChild(this.carSelection);
  }

  /**
   * Creates in-game HUD
   */
  private createHUD(): void {
    this.hud = document.createElement('div');
    this.hud.id = 'hud';
    this.hud.style.display = 'none';

    this.hud.innerHTML = `
      <!-- Speedometer (bottom left) -->
      <div id="speedometer" class="hud-speedometer">
        <div class="hud-speedometer-label">SPEED</div>
        <div id="speed-value" class="hud-speed-value">0</div>
        <div class="hud-speed-unit">MPH</div>
      </div>

      <!-- Lap Timer (top center) -->
      <div id="lap-timer" class="hud-lap-timer">
        <div class="hud-timer-label">LAP TIME</div>
        <div id="timer-value" class="hud-timer-value">00:00.000</div>
        <div id="lap-count" class="hud-lap-count">LAP 1 / 3</div>
      </div>

      <!-- Position (top right) -->
      <div id="position-display" class="hud-position">
        <div class="hud-position-label">POSITION</div>
        <div id="position-value" class="hud-position-value">1st</div>
      </div>

      <!-- Damage Indicator (bottom right) -->
      <div id="damage-indicator" class="hud-damage">
        <div class="hud-damage-label">DAMAGE</div>
        <div id="damage-bar" class="hud-damage-bar">
          <div id="damage-fill" class="hud-damage-fill"></div>
        </div>
      </div>
    `;

    // Store references to updateable elements (cached for performance)
    this.speedometer = this.hud.querySelector('#speed-value');
    this.lapTimer = this.hud.querySelector('#timer-value');
    this.positionDisplay = this.hud.querySelector('#position-value');
    this.damageIndicator = this.hud.querySelector('#damage-fill');
    this.lapCountElement = this.hud.querySelector('#lap-count');

    this.container?.appendChild(this.hud);
  }

  /**
   * Creates pause menu
   */
  private createPauseMenu(): void {
    this.pauseMenu = document.createElement('div');
    this.pauseMenu.id = 'pause-menu';
    this.pauseMenu.style.display = 'none';

    this.pauseMenu.innerHTML = `
      <h2>PAUSED</h2>
      <div class="pause-button-group">
        <button id="btn-resume" class="btn-primary">RESUME</button>
        <button id="btn-restart" class="btn-secondary">RESTART</button>
        <button id="btn-quit" class="btn-danger">QUIT TO MENU</button>
      </div>
    `;

    this.container?.appendChild(this.pauseMenu);
  }

  /**
   * Creates results screen
   */
  private createResultsScreen(): void {
    this.resultsScreen = document.createElement('div');
    this.resultsScreen.id = 'results-screen';
    this.resultsScreen.style.display = 'none';

    this.resultsScreen.innerHTML = `
      <h2>RACE COMPLETE!</h2>
      <div id="results-time">00:00.000</div>
      <div id="results-details">
        <div style="color: #888; margin-bottom: 1rem;">RACE STATISTICS</div>
        <div id="results-stats"></div>
      </div>
      <div class="results-button-group">
        <button id="btn-race-again" class="btn-primary">RACE AGAIN</button>
        <button id="btn-main-menu" class="btn-secondary">MAIN MENU</button>
      </div>
    `;

    this.container?.appendChild(this.resultsScreen);
  }

  /**
   * Creates settings screen
   */
  private createSettingsScreen(): void {
    this.settingsScreen = document.createElement('div');
    this.settingsScreen.id = 'settings-screen';
    this.settingsScreen.style.display = 'none';

    this.settingsScreen.innerHTML = `
      <h2>SETTINGS</h2>
      <div class="settings-content">
        <div class="settings-section">
          <h3>GRAPHICS</h3>
          <div class="settings-option">
            <label>Quality Preset:</label>
            <select id="setting-quality" class="settings-select">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="ultra">Ultra</option>
            </select>
          </div>
          <div class="settings-option">
            <label>Shadows:</label>
            <input type="checkbox" id="setting-shadows" checked class="settings-checkbox">
          </div>
        </div>

        <div class="settings-section">
          <h3>AUDIO</h3>
          <div class="settings-option">
            <label>Master Volume:</label>
            <input type="range" id="setting-volume" min="0" max="100" value="70" class="settings-slider">
            <span class="settings-value">70%</span>
          </div>
          <div class="settings-option">
            <label>Engine Sounds:</label>
            <input type="checkbox" id="setting-engine-audio" checked class="settings-checkbox">
          </div>
        </div>

        <div class="settings-section">
          <h3>CONTROLS</h3>
          <div class="settings-option">
            <label>Steering Sensitivity:</label>
            <input type="range" id="setting-steering" min="1" max="10" value="5" class="settings-slider">
            <span class="settings-value">5</span>
          </div>
        </div>
      </div>
      <div class="settings-button-group">
        <button id="btn-save-settings" class="btn-primary">SAVE SETTINGS</button>
        <button id="btn-cancel-settings" class="btn-secondary">CANCEL</button>
      </div>
    `;

    this.container?.appendChild(this.settingsScreen);
  }

  /**
   * Creates leaderboard screen
   */
  private createLeaderboardScreen(): void {
    this.leaderboardScreen = document.createElement('div');
    this.leaderboardScreen.id = 'leaderboard-screen';
    this.leaderboardScreen.style.display = 'none';

    this.leaderboardScreen.innerHTML = `
      <h2>LEADERBOARD</h2>
      <div class="leaderboard-content">
        <div class="leaderboard-header">
          <span class="leaderboard-col-rank">RANK</span>
          <span class="leaderboard-col-player">PLAYER</span>
          <span class="leaderboard-col-time">TIME</span>
        </div>
        <div id="leaderboard-list" class="leaderboard-list">
          <!-- Leaderboard entries will be populated dynamically -->
          <div class="leaderboard-empty">No entries yet. Be the first to set a record!</div>
        </div>
      </div>
      <div class="leaderboard-button-group">
        <button id="btn-close-leaderboard" class="btn-primary">BACK TO MENU</button>
      </div>
    `;

    this.container?.appendChild(this.leaderboardScreen);
  }

  /**
   * Shows specified UI panel
   */
  public showPanel(panel: UIPanel): void {
    this.hideAll();
    this.currentPanel = panel;

    switch (panel) {
      case UIPanel.MAIN_MENU:
        if (this.mainMenu) this.mainMenu.style.display = 'flex';
        break;
      case UIPanel.CAR_SELECTION:
        if (this.carSelection) this.carSelection.style.display = 'flex';
        break;
      case UIPanel.HUD:
        if (this.hud) this.hud.style.display = 'block';
        break;
      case UIPanel.PAUSE_MENU:
        if (this.pauseMenu) this.pauseMenu.style.display = 'flex';
        break;
      case UIPanel.RESULTS:
        if (this.resultsScreen) this.resultsScreen.style.display = 'flex';
        break;
      case UIPanel.SETTINGS:
        if (this.settingsScreen) this.settingsScreen.style.display = 'flex';
        break;
      case UIPanel.LEADERBOARD:
        if (this.leaderboardScreen) this.leaderboardScreen.style.display = 'flex';
        break;
      case UIPanel.LOADING:
        // Loading screen handled separately
        break;
    }
  }

  /**
   * Hides all UI panels
   */
  private hideAll(): void {
    if (this.mainMenu) this.mainMenu.style.display = 'none';
    if (this.carSelection) this.carSelection.style.display = 'none';
    if (this.hud) this.hud.style.display = 'none';
    if (this.pauseMenu) this.pauseMenu.style.display = 'none';
    if (this.resultsScreen) this.resultsScreen.style.display = 'none';
    if (this.settingsScreen) this.settingsScreen.style.display = 'none';
    if (this.leaderboardScreen) this.leaderboardScreen.style.display = 'none';
  }

  /**
   * Updates HUD with current game data
   */
  public updateHUD(data: {
    speed?: number;
    lapTime?: string;
    currentLap?: number;
    maxLaps?: number;
    position?: number;
    damage?: number;
  }): void {
    if (this.currentPanel !== UIPanel.HUD) return;

    if (data.speed !== undefined && this.speedometer) {
      this.speedometer.textContent = Math.round(data.speed).toString();
    }

    if (data.lapTime !== undefined && this.lapTimer) {
      this.lapTimer.textContent = data.lapTime;
    }

    // Use cached element reference (10x faster than querySelector every frame)
    if (data.currentLap !== undefined && data.maxLaps !== undefined && this.lapCountElement) {
      this.lapCountElement.textContent = `LAP ${data.currentLap} / ${data.maxLaps}`;
    }

    if (data.position !== undefined && this.positionDisplay) {
      const suffix = this.getOrdinalSuffix(data.position);
      this.positionDisplay.textContent = `${data.position}${suffix}`;
    }

    if (data.damage !== undefined && this.damageIndicator) {
      const damagePercent = Math.min(100, data.damage * 100);
      this.damageIndicator.style.width = `${damagePercent}%`;
    }
  }

  /**
   * Shows results screen with lap time and comprehensive race statistics
   */
  public showResults(lapTime: string, stats: any): void {
    console.log('[UI RESULTS] showResults called with:', { lapTime, stats });
    console.log('[UI RESULTS] resultsScreen element:', this.resultsScreen);

    this.showPanel(UIPanel.RESULTS);

    const timeDisplay = this.resultsScreen?.querySelector('#results-time');
    console.log('[UI RESULTS] timeDisplay element:', timeDisplay);
    if (timeDisplay) {
      timeDisplay.textContent = lapTime;
      console.log('[UI RESULTS] Set time display to:', lapTime);
    }

    const statsDisplay = this.resultsScreen?.querySelector('#results-stats');
    console.log('[UI RESULTS] statsDisplay element:', statsDisplay);
    if (statsDisplay) {
      // Build leaderboard section if user qualified
      let leaderboardSection = '';
      if (stats.qualifiesForLeaderboard) {
        leaderboardSection = `
          <div class="leaderboard-section-title">
            LEADERBOARD RANKING: ${stats.leaderboardRank > 0 ? `#${stats.leaderboardRank}` : 'N/A'}
          </div>
        `;
        if (stats.leaderboardEntries && stats.leaderboardEntries.length > 0) {
          leaderboardSection += `<div class="leaderboard-section">`;
          stats.leaderboardEntries.forEach((entry: any, index: number) => {
            leaderboardSection += `
              <div class="leaderboard-entry">
                <span class="leaderboard-rank">#${index + 1}</span>
                <span class="leaderboard-name">${entry.playerName}</span>
                <span class="leaderboard-time">${entry.lapTime}</span>
              </div>
            `;
          });
          leaderboardSection += `</div>`;
        }
      }

      const statsHTML = `
        <div class="results-stat-row">
          <span class="results-stat-label">Best Lap:</span>
          <span class="results-stat-value">${stats.bestLap || 'N/A'}</span>
        </div>
        <div class="results-stat-row">
          <span class="results-stat-label">Laps Completed:</span>
          <span class="results-stat-value">${stats.lapsCompleted || 0}</span>
        </div>
        <div class="results-stat-row">
          <span class="results-stat-label">Crashes:</span>
          <span class="results-stat-value" style="color: #ff6b6b;">${stats.crashes || 0}</span>
        </div>
        <div class="results-stat-row">
          <span class="results-stat-label">Top Speed:</span>
          <span class="results-stat-value">${stats.topSpeed || 0} MPH</span>
        </div>
        <div class="results-stat-row">
          <span class="results-stat-label">Average Speed:</span>
          <span class="results-stat-value">${stats.averageSpeed || 0} MPH</span>
        </div>
        ${leaderboardSection}
      `;
      statsDisplay.innerHTML = statsHTML;
      console.log('[UI RESULTS] Stats HTML set successfully. Stats:', {
        bestLap: stats.bestLap,
        lapsCompleted: stats.lapsCompleted,
        crashes: stats.crashes,
        topSpeed: stats.topSpeed,
        averageSpeed: stats.averageSpeed
      });
    } else {
      console.error('[UI RESULTS] Stats display element not found!');
    }
  }

  /**
   * Gets ordinal suffix for position (1st, 2nd, 3rd, etc.)
   */
  private getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  /**
   * Registers event listener for UI button
   */
  public onButtonClick(buttonId: string, callback: () => void): void {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', callback);
    }
  }

  /**
   * Gets current visible panel
   */
  public getCurrentPanel(): UIPanel | null {
    return this.currentPanel;
  }

  /**
   * Checks if UI is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Disposes UI system and removes DOM elements
   */
  public dispose(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    this.mainMenu = null;
    this.carSelection = null;
    this.hud = null;
    this.pauseMenu = null;
    this.resultsScreen = null;
    this.settingsScreen = null;
    this.leaderboardScreen = null;
    this.speedometer = null;
    this.lapTimer = null;
    this.positionDisplay = null;
    this.damageIndicator = null;
    this.lapCountElement = null;

    this.initialized = false;
    console.log('UISystem disposed');
  }
}

/**
 * UISystem Enhancement - Animation & Visual Polish Layer
 * Applied as extension methods to enhance the base UISystem
 * 
 * Features:
 * - Panel transition animations
 * - HUD element animations
 * - Button feedback animations
 * - Speed-based visual effects
 */

// Augment UISystem prototype with animation methods
declare global {
  interface UISystem {
    animatePanel(panel: UIPanel): void;
    pulseHUDElement(elementId: string): void;
    damageIndicatorShake(): void;
    speedUpdateEffect(): void;
  }
}

// Note: These methods enhance the base UISystem implementation
// They should be called within existing methods to add visual polish

export const UIAnimations = {
  /**
   * Apply entrance animation to panel
   */
  applyPanelAnimation(element: HTMLElement, panelType: UIPanel): void {
    element.style.animation = '';
    // Trigger reflow to restart animation
    void element.offsetHeight;

    switch (panelType) {
      case UIPanel.MAIN_MENU:
      case UIPanel.CAR_SELECTION:
      case UIPanel.RESULTS:
        element.classList.add('panel-fade-in');
        break;
      case UIPanel.PAUSE_MENU:
        element.classList.add('panel-fade-in');
        break;
      case UIPanel.HUD:
        element.style.display = 'block';
        break;
    }
  },

  /**
   * Apply HUD update animation
   */
  animateHUDUpdate(element: HTMLElement | null, type: 'speed' | 'timer' | 'position'): void {
    if (!element) return;

    element.style.animation = '';
    // Trigger reflow
    void element.offsetHeight;

    switch (type) {
      case 'speed':
        element.classList.add('speed-update-pulse');
        break;
      case 'timer':
        element.classList.add('timer-update');
        break;
      case 'position':
        element.classList.add('position-highlight');
        break;
    }

    // Clean up animation class after animation ends
    setTimeout(() => {
      element.classList.remove('speed-update-pulse', 'timer-update', 'position-highlight');
    }, 500);
  },

  /**
   * Apply damage indicator animation
   */
  damageAnimation(damageElement: HTMLElement | null, damagePercent: number): void {
    if (!damageElement || !damageElement.parentElement) return;

    const container = damageElement.parentElement;

    if (damagePercent > 75) {
      container.classList.add('damage-critical');
    } else {
      container.classList.remove('damage-critical');
    }
  },

  /**
   * Apply button press effect
   */
  buttonPressEffect(button: HTMLElement | null): void {
    if (!button) return;

    button.classList.add('btn-press');
    setTimeout(() => {
      button.classList.remove('btn-press');
    }, 200);
  },

  /**
   * Apply glow pulse to buttons
   */
  addButtonGlowPulse(button: HTMLElement | null): void {
    if (!button) return;
    button.classList.add('btn-glow-pulse');
  },

  /**
   * Remove button glow pulse
   */
  removeButtonGlowPulse(button: HTMLElement | null): void {
    if (!button) return;
    button.classList.remove('btn-glow-pulse');
  },

  /**
   * Add loading spinner animation
   */
  showLoadingSpinner(show: boolean = true): void {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
      spinner.style.display = show ? 'block' : 'none';
    }
  },

  /**
   * Animate number counting up (for results screen)
   */
  animateNumberCounter(element: HTMLElement | null, start: number, end: number, duration: number = 1000): void {
    if (!element) return;

    const startTime = performance.now();
    const range = end - start;

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const current = Math.floor(start + range * progress);
      element.textContent = current.toString();

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    requestAnimationFrame(updateCounter);
  },
};

/**
 * Export animation utilities for external use
 */
export function enhanceUIWithAnimations(ui: UISystem): void {
  // Hook into showPanel to add animations
  const originalShowPanel = ui.showPanel.bind(ui);
  ui.showPanel = function (panel: UIPanel) {
    originalShowPanel(panel);
    
    // Apply animations based on panel type
    const panelElement = document.getElementById(panel.toString());
    if (panelElement) {
      UIAnimations.applyPanelAnimation(panelElement, panel);
    }
  };

  // Hook into updateHUD to add animations
  const originalUpdateHUD = ui.updateHUD.bind(ui);
  ui.updateHUD = function (data: any) {
    // Apply animations before update
    if (data.speed !== undefined) {
      const speedEl = document.getElementById('speed-value');
      UIAnimations.animateHUDUpdate(speedEl, 'speed');
    }

    if (data.lapTime !== undefined) {
      const timerEl = document.getElementById('timer-value');
      UIAnimations.animateHUDUpdate(timerEl, 'timer');
    }

    if (data.position !== undefined) {
      const posEl = document.getElementById('position-value');
      UIAnimations.animateHUDUpdate(posEl, 'position');
    }

    if (data.damage !== undefined) {
      const damageEl = document.getElementById('damage-fill');
      UIAnimations.damageAnimation(damageEl, data.damage * 100);
    }

    // Call original update
    originalUpdateHUD(data);
  };
}

