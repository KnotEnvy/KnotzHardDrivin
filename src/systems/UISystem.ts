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

  // HUD Elements
  private speedometer: HTMLElement | null = null;
  private lapTimer: HTMLElement | null = null;
  private positionDisplay: HTMLElement | null = null;
  private damageIndicator: HTMLElement | null = null;

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

    this.initialized = true;
    console.log('UISystem initialized');
  }

  /**
   * Creates main UI container
   */
  private createUIContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'ui-container';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      font-family: 'Arial', sans-serif;
      z-index: 1000;
    `;
    document.body.appendChild(this.container);
  }

  /**
   * Creates main menu
   */
  private createMainMenu(): void {
    this.mainMenu = document.createElement('div');
    this.mainMenu.id = 'main-menu';
    this.mainMenu.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: all;
    `;

    this.mainMenu.innerHTML = `
      <h1 style="color: #fff; font-size: 4rem; margin-bottom: 2rem; text-shadow: 0 0 20px #00ff88;">
        HARD DRIVIN'
      </h1>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <button id="btn-start" style="
          padding: 1rem 3rem;
          font-size: 1.5rem;
          background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
          border: none;
          border-radius: 8px;
          color: #1a1a2e;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          pointer-events: all;
        ">START RACE</button>
        <button id="btn-leaderboard" style="
          padding: 1rem 3rem;
          font-size: 1.2rem;
          background: #2a2a3e;
          border: 2px solid #00ff88;
          border-radius: 8px;
          color: #00ff88;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s;
          pointer-events: all;
        ">LEADERBOARD</button>
        <button id="btn-settings" style="
          padding: 1rem 3rem;
          font-size: 1.2rem;
          background: #2a2a3e;
          border: 2px solid #00ff88;
          border-radius: 8px;
          color: #00ff88;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s;
          pointer-events: all;
        ">SETTINGS</button>
      </div>
      <div style="
        position: absolute;
        bottom: 2rem;
        color: #888;
        font-size: 0.9rem;
      ">
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
    this.carSelection.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: all;
    `;

    this.carSelection.innerHTML = `
      <h1 style="color: #fff; font-size: 3rem; margin-bottom: 3rem; text-shadow: 0 0 20px #00ff88;">
        SELECT YOUR VEHICLE
      </h1>
      <div style="display: flex; gap: 3rem; margin-bottom: 2rem;">
        <!-- Corvette Card -->
        <div id="select-corvette" style="
          width: 350px;
          background: rgba(255, 0, 0, 0.1);
          border: 3px solid #ff0000;
          border-radius: 12px;
          padding: 2rem;
          cursor: pointer;
          transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
          pointer-events: all;
        " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 0 30px rgba(255,0,0,0.5)';"
           onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
          <div style="
            width: 100%;
            height: 150px;
            background: #ff0000;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
          ">
            🏎️
          </div>
          <h2 style="color: #ff0000; font-size: 2rem; margin-bottom: 1rem; text-align: center;">
            CORVETTE
          </h2>
          <div style="color: #aaa; font-size: 0.9rem; line-height: 1.6;">
            <div style="margin-bottom: 0.5rem;">⚡ Speed: ★★★★★</div>
            <div style="margin-bottom: 0.5rem;">🏋️ Handling: ★★★★☆</div>
            <div style="margin-bottom: 0.5rem;">🛡️ Durability: ★★★☆☆</div>
          </div>
          <div style="
            margin-top: 1.5rem;
            padding: 0.8rem;
            background: rgba(255, 0, 0, 0.2);
            border-radius: 6px;
            color: #fff;
            text-align: center;
            font-weight: bold;
          ">
            CLASSIC SPORTS CAR
          </div>
        </div>

        <!-- Cybertruck Card -->
        <div id="select-cybertruck" style="
          width: 350px;
          background: rgba(192, 192, 192, 0.1);
          border: 3px solid #c0c0c0;
          border-radius: 12px;
          padding: 2rem;
          cursor: pointer;
          transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
          pointer-events: all;
        " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 0 30px rgba(192,192,192,0.5)';"
           onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
          <div style="
            width: 100%;
            height: 150px;
            background: #c0c0c0;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
          ">
            🚙
          </div>
          <h2 style="color: #c0c0c0; font-size: 2rem; margin-bottom: 1rem; text-align: center;">
            CYBERTRUCK
          </h2>
          <div style="color: #aaa; font-size: 0.9rem; line-height: 1.6;">
            <div style="margin-bottom: 0.5rem;">⚡ Speed: ★★★☆☆</div>
            <div style="margin-bottom: 0.5rem;">🏋️ Handling: ★★★☆☆</div>
            <div style="margin-bottom: 0.5rem;">🛡️ Durability: ★★★★★</div>
          </div>
          <div style="
            margin-top: 1.5rem;
            padding: 0.8rem;
            background: rgba(192, 192, 192, 0.2);
            border-radius: 6px;
            color: #fff;
            text-align: center;
            font-weight: bold;
          ">
            FUTURISTIC BEAST
          </div>
        </div>
      </div>

      <div style="
        position: absolute;
        bottom: 2rem;
        color: #888;
        font-size: 0.9rem;
      ">
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
    this.hud.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: none;
      pointer-events: none;
    `;

    this.hud.innerHTML = `
      <!-- Speedometer (bottom left) -->
      <div id="speedometer" style="
        position: absolute;
        bottom: 2rem;
        left: 2rem;
        background: rgba(0, 0, 0, 0.7);
        padding: 1.5rem;
        border-radius: 12px;
        border: 2px solid #00ff88;
      ">
        <div style="color: #888; font-size: 0.8rem; margin-bottom: 0.5rem;">SPEED</div>
        <div id="speed-value" style="color: #00ff88; font-size: 3rem; font-weight: bold; line-height: 1;">0</div>
        <div style="color: #888; font-size: 0.9rem; margin-top: 0.3rem;">MPH</div>
      </div>

      <!-- Lap Timer (top center) -->
      <div id="lap-timer" style="
        position: absolute;
        top: 2rem;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        padding: 1rem 2rem;
        border-radius: 12px;
        border: 2px solid #00ff88;
        text-align: center;
      ">
        <div style="color: #888; font-size: 0.8rem; margin-bottom: 0.3rem;">LAP TIME</div>
        <div id="timer-value" style="color: #00ff88; font-size: 2rem; font-weight: bold;">00:00.000</div>
        <div id="lap-count" style="color: #888; font-size: 0.9rem; margin-top: 0.3rem;">LAP 1 / 3</div>
      </div>

      <!-- Position (top right) -->
      <div id="position-display" style="
        position: absolute;
        top: 2rem;
        right: 2rem;
        background: rgba(0, 0, 0, 0.7);
        padding: 1rem 1.5rem;
        border-radius: 12px;
        border: 2px solid #00ff88;
      ">
        <div style="color: #888; font-size: 0.8rem; margin-bottom: 0.3rem;">POSITION</div>
        <div id="position-value" style="color: #00ff88; font-size: 2.5rem; font-weight: bold;">1st</div>
      </div>

      <!-- Damage Indicator (bottom right) -->
      <div id="damage-indicator" style="
        position: absolute;
        bottom: 2rem;
        right: 2rem;
        background: rgba(0, 0, 0, 0.7);
        padding: 1rem;
        border-radius: 12px;
        border: 2px solid #00ff88;
      ">
        <div style="color: #888; font-size: 0.8rem; margin-bottom: 0.5rem;">DAMAGE</div>
        <div id="damage-bar" style="
          width: 200px;
          height: 20px;
          background: #2a2a3e;
          border-radius: 4px;
          overflow: hidden;
        ">
          <div id="damage-fill" style="
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #00ff88 0%, #ff0000 100%);
            transition: width 0.3s;
          "></div>
        </div>
      </div>
    `;

    // Store references to updateable elements
    this.speedometer = this.hud.querySelector('#speed-value');
    this.lapTimer = this.hud.querySelector('#timer-value');
    this.positionDisplay = this.hud.querySelector('#position-value');
    this.damageIndicator = this.hud.querySelector('#damage-fill');

    this.container?.appendChild(this.hud);
  }

  /**
   * Creates pause menu
   */
  private createPauseMenu(): void {
    this.pauseMenu = document.createElement('div');
    this.pauseMenu.id = 'pause-menu';
    this.pauseMenu.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: all;
    `;

    this.pauseMenu.innerHTML = `
      <h2 style="color: #fff; font-size: 3rem; margin-bottom: 2rem;">PAUSED</h2>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <button id="btn-resume" style="
          padding: 1rem 3rem;
          font-size: 1.5rem;
          background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
          border: none;
          border-radius: 8px;
          color: #1a1a2e;
          font-weight: bold;
          cursor: pointer;
        ">RESUME</button>
        <button id="btn-restart" style="
          padding: 1rem 3rem;
          font-size: 1.2rem;
          background: #2a2a3e;
          border: 2px solid #00ff88;
          border-radius: 8px;
          color: #00ff88;
          font-weight: bold;
          cursor: pointer;
        ">RESTART</button>
        <button id="btn-quit" style="
          padding: 1rem 3rem;
          font-size: 1.2rem;
          background: #2a2a3e;
          border: 2px solid #ff0000;
          border-radius: 8px;
          color: #ff0000;
          font-weight: bold;
          cursor: pointer;
        ">QUIT TO MENU</button>
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
    this.resultsScreen.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: all;
    `;

    this.resultsScreen.innerHTML = `
      <h2 style="color: #fff; font-size: 3rem; margin-bottom: 1rem;">RACE COMPLETE!</h2>
      <div id="results-time" style="color: #00ff88; font-size: 2.5rem; font-weight: bold; margin-bottom: 2rem;">
        00:00.000
      </div>
      <div id="results-details" style="
        background: rgba(0, 0, 0, 0.5);
        padding: 2rem;
        border-radius: 12px;
        border: 2px solid #00ff88;
        margin-bottom: 2rem;
      ">
        <div style="color: #888; margin-bottom: 1rem;">RACE STATISTICS</div>
        <div id="results-stats"></div>
      </div>
      <div style="display: flex; gap: 1rem;">
        <button id="btn-race-again" style="
          padding: 1rem 2rem;
          font-size: 1.2rem;
          background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
          border: none;
          border-radius: 8px;
          color: #1a1a2e;
          font-weight: bold;
          cursor: pointer;
        ">RACE AGAIN</button>
        <button id="btn-main-menu" style="
          padding: 1rem 2rem;
          font-size: 1.2rem;
          background: #2a2a3e;
          border: 2px solid #00ff88;
          border-radius: 8px;
          color: #00ff88;
          font-weight: bold;
          cursor: pointer;
        ">MAIN MENU</button>
      </div>
    `;

    this.container?.appendChild(this.resultsScreen);
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

    if (data.currentLap !== undefined && data.maxLaps !== undefined) {
      const lapCount = this.hud?.querySelector('#lap-count');
      if (lapCount) {
        lapCount.textContent = `LAP ${data.currentLap} / ${data.maxLaps}`;
      }
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
   * Shows results screen with lap time
   */
  public showResults(lapTime: string, stats: any): void {
    this.showPanel(UIPanel.RESULTS);

    const timeDisplay = this.resultsScreen?.querySelector('#results-time');
    if (timeDisplay) {
      timeDisplay.textContent = lapTime;
    }

    const statsDisplay = this.resultsScreen?.querySelector('#results-stats');
    if (statsDisplay) {
      statsDisplay.innerHTML = `
        <div style="color: #fff; margin: 0.5rem 0;">
          <span style="color: #888;">Best Lap:</span> ${stats.bestLap || 'N/A'}
        </div>
        <div style="color: #fff; margin: 0.5rem 0;">
          <span style="color: #888;">Crashes:</span> ${stats.crashes || 0}
        </div>
        <div style="color: #fff; margin: 0.5rem 0;">
          <span style="color: #888;">Top Speed:</span> ${stats.topSpeed || 0} MPH
        </div>
      `;
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
    this.hud = null;
    this.pauseMenu = null;
    this.resultsScreen = null;
    this.speedometer = null;
    this.lapTimer = null;
    this.positionDisplay = null;
    this.damageIndicator = null;

    this.initialized = false;
    console.log('UISystem disposed');
  }
}
