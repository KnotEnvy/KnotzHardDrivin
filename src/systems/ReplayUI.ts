import { GameState } from '../core/GameEngine';

/**
 * ReplayUI - Overlay UI shown during crash replay playback.
 *
 * Displays:
 * - "CRASH REPLAY" title (retro-futuristic styling)
 * - Progress bar showing replay duration (0-10 seconds)
 * - Skip button to interrupt replay and respawn
 *
 * Architecture:
 * - DOM-based overlay (created once, shown/hidden as needed)
 * - Minimal animations for performance (<1ms render overhead)
 * - Keyboard support: Enter key to skip
 * - Gamepad support: A button to skip (via input system)
 *
 * Integration:
 * - Called by GameEngine when entering/exiting REPLAY state
 * - updateProgress() called each frame during replay
 * - Emit 'skip' event when player presses skip button/key
 *
 * Styling:
 * - Retro arcade aesthetic (cyan/magenta, monospace font)
 * - Center-screen overlay with semi-transparent background
 * - High z-index (1000) to appear above game canvas
 * - Responsive to window size changes
 *
 * Usage:
 * ```typescript
 * const replayUI = new ReplayUI();
 *
 * // When crash detected:
 * replayUI.show();
 * replayUI.updateProgress(0, 10);
 *
 * // Each frame during replay:
 * replayUI.updateProgress(elapsedTime, totalDuration);
 *
 * // Handle skip event:
 * replayUI.onSkip(() => {
 *   GameEngine.getInstance().skipReplay();
 * });
 *
 * // When replay ends:
 * replayUI.hide();
 * ```
 */
export class ReplayUI {
  private container: HTMLElement;
  private overlay: HTMLElement;
  private titleElement: HTMLElement;
  private progressBar: HTMLProgressElement;
  private skipButton: HTMLButtonElement;
  private skipCallbacks: Array<() => void> = [];

  /**
   * Creates a new ReplayUI instance.
   *
   * Initializes the DOM structure and attaches event listeners.
   * The UI starts hidden and is shown when entering REPLAY state.
   */
  constructor() {
    this.container = this.createContainer();
    this.overlay = this.container.querySelector('.replay-overlay') as HTMLElement;
    this.titleElement = this.container.querySelector('.replay-title') as HTMLElement;
    this.progressBar = this.container.querySelector('.replay-progress') as HTMLProgressElement;
    this.skipButton = this.container.querySelector('.skip-button') as HTMLButtonElement;

    this.attachEventListeners();

    // Add to page
    document.body.appendChild(this.container);

    console.log('ReplayUI initialized');
  }

  /**
   * Creates the complete DOM structure for the replay UI overlay.
   *
   * Structure:
   * ```html
   * <div id="replay-ui" class="replay-ui-container">
   *   <div class="replay-overlay">
   *     <div class="replay-title">CRASH REPLAY</div>
   *     <progress class="replay-progress" value="0" max="10"></progress>
   *     <button class="skip-button">SKIP (Enter)</button>
   *   </div>
   * </div>
   * ```
   *
   * @returns HTMLElement container ready to append to document
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'replay-ui';
    container.className = 'replay-ui-container';
    container.style.display = 'none';

    container.innerHTML = `
      <div class="replay-overlay">
        <div class="replay-title">CRASH REPLAY</div>
        <progress class="replay-progress" value="0" max="10"></progress>
        <button class="skip-button">SKIP (Enter)</button>
      </div>
    `;

    return container;
  }

  /**
   * Attaches event listeners for keyboard and button interactions.
   *
   * Listeners:
   * - Click: Skip button triggers skip sequence
   * - Keydown (Enter): Keyboard shortcut to skip
   * - Keydown (Escape): Alternative way to skip (optional)
   */
  private attachEventListeners(): void {
    // Skip button click
    this.skipButton.addEventListener('click', () => {
      this.onSkipButtonClicked();
    });

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only respond when replay UI is visible
      if (this.container.style.display !== 'block') {
        return;
      }

      if (e.code === 'Enter' || e.key === 'Enter') {
        e.preventDefault();
        this.onSkipButtonClicked();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
  }

  /**
   * Handles skip button activation.
   *
   * Triggers all registered skip callbacks.
   * Called by: button click, Enter key press
   */
  private onSkipButtonClicked(): void {
    console.log('Replay skip triggered');

    // Add visual feedback
    this.skipButton.classList.add('pressed');
    setTimeout(() => {
      this.skipButton.classList.remove('pressed');
    }, 100);

    // Trigger callbacks
    this.skipCallbacks.forEach(callback => callback());
  }

  /**
   * Shows the replay UI overlay.
   *
   * Called when:
   * - Entering REPLAY state
   * - After crash detected and about to show replay
   *
   * Effects:
   * - Fades in the overlay with CSS animation
   * - Resets progress bar to 0
   * - Enables button/keyboard input
   *
   * @example
   * ```typescript
   * replayUI.show();
   * ```
   */
  show(): void {
    this.container.style.display = 'block';

    // Reset progress
    this.progressBar.value = 0;

    // Trigger fade-in animation via CSS class
    requestAnimationFrame(() => {
      this.container.classList.add('visible');
    });

    console.log('ReplayUI shown');
  }

  /**
   * Hides the replay UI overlay.
   *
   * Called when:
   * - Exiting REPLAY state (replay ended or skipped)
   * - Before transitioning back to PLAYING
   *
   * Effects:
   * - Fades out the overlay with CSS animation
   * - Disables button/keyboard input
   * - Preserves state for potential re-showing
   *
   * @example
   * ```typescript
   * replayUI.hide();
   * ```
   */
  hide(): void {
    this.container.classList.remove('visible');

    // Wait for fade-out animation to complete before hiding
    setTimeout(() => {
      if (!this.container.classList.contains('visible')) {
        this.container.style.display = 'none';
      }
    }, 300);

    console.log('ReplayUI hidden');
  }

  /**
   * Updates the progress bar to show replay playback progress.
   *
   * Called every frame during replay playback to update the progress bar.
   * The progress bar smoothly animates to show progress.
   *
   * Performance: O(1) DOM update, <1ms overhead per frame
   *
   * @param current - Current replay time in seconds (0.0 to totalDuration)
   * @param total - Total replay duration in seconds (typically 10)
   *
   * @example
   * ```typescript
   * // In GameEngine update loop during REPLAY state:
   * const elapsedTime = replayPlayer.getElapsedTime();
   * const totalDuration = replayPlayer.getTotalDuration();
   * replayUI.updateProgress(elapsedTime, totalDuration);
   * ```
   */
  updateProgress(current: number, total: number): void {
    // Clamp values to valid range
    const clampedCurrent = Math.max(0, Math.min(current, total));
    const clampedTotal = Math.max(1, total); // Prevent division by zero

    // Update progress bar
    this.progressBar.value = clampedCurrent;
    this.progressBar.max = clampedTotal;

    // Optional: Log when reaching milestones (for debugging)
    // console.log(`Replay progress: ${clampedCurrent.toFixed(1)}/${clampedTotal.toFixed(1)}s`);
  }

  /**
   * Registers a callback to be called when player skips the replay.
   *
   * Multiple callbacks can be registered and all will be called.
   * Typically used by GameEngine to trigger respawn and state transition.
   *
   * @param callback - Function to call when skip is triggered
   *
   * @example
   * ```typescript
   * replayUI.onSkip(() => {
   *   console.log('Replay skipped by player');
   *   GameEngine.getInstance().onReplaySkipped();
   * });
   * ```
   */
  onSkip(callback: () => void): void {
    this.skipCallbacks.push(callback);
  }

  /**
   * Gets the visibility state of the replay UI.
   *
   * @returns true if UI is currently shown, false otherwise
   */
  isVisible(): boolean {
    return this.container.style.display === 'block';
  }

  /**
   * Gets the current progress bar value (0 to max).
   *
   * @returns Current progress value
   */
  getProgressValue(): number {
    return this.progressBar.value;
  }

  /**
   * Gets the current progress bar max value.
   *
   * @returns Maximum progress value
   */
  getProgressMax(): number {
    return this.progressBar.max;
  }

  /**
   * Resets the replay UI to initial state.
   *
   * Clears all state without showing/hiding.
   * Useful when starting a new race.
   */
  reset(): void {
    this.progressBar.value = 0;
    this.progressBar.max = 10; // Reset to default
    this.container.classList.remove('visible');
    console.log('ReplayUI reset');
  }

  /**
   * Cleans up the replay UI and removes it from the DOM.
   *
   * Called when:
   * - Game shuts down
   * - Transitioning to menu
   * - Freeing resources
   *
   * Removes event listeners and DOM elements.
   */
  dispose(): void {
    // Remove from DOM
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    // Clear callbacks
    this.skipCallbacks = [];

    console.log('ReplayUI disposed');
  }

  /**
   * Gets debug information about the UI state.
   *
   * @returns Debug object with UI stats
   *
   * @example
   * ```typescript
   * const debug = replayUI.getDebugInfo();
   * console.log(`Visible: ${debug.isVisible}, Progress: ${debug.progress}%`);
   * ```
   */
  getDebugInfo(): {
    isVisible: boolean;
    progressValue: number;
    progressMax: number;
    progress: number;
  } {
    const progressValue = this.getProgressValue();
    const progressMax = this.getProgressMax();
    const progress = progressMax > 0 ? (progressValue / progressMax) * 100 : 0;

    return {
      isVisible: this.isVisible(),
      progressValue,
      progressMax,
      progress,
    };
  }
}
