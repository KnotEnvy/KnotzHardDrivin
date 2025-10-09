// Phase 1A: Core Game Loop Test
import { GameEngine, GameState } from './core/GameEngine';

const engine = new GameEngine();

// Start the game engine
engine.start();

// Add FPS display for monitoring performance
const perfMonitor = engine.getPerformanceMonitor();
const fpsDisplay = perfMonitor.createFPSDisplay();
document.body.appendChild(fpsDisplay);

// Log performance report every 10 seconds
setInterval(() => {
  perfMonitor.logPerformanceReport();

  // Also log state machine info
  console.log('\n=== State Machine Status ===');
  console.log(`Current State: ${engine.getState()}`);
  const stateManager = engine.getStateManager();
  console.log(`Valid Transitions: ${stateManager.getValidTransitions(engine.getState()).join(', ')}`);
}, 10000);

// Test state transitions with keyboard
window.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'p':
      // Toggle playing/paused
      if (engine.getState() === GameState.MENU) {
        engine.setState(GameState.PLAYING);
      } else if (engine.getState() === GameState.PLAYING) {
        engine.setState(GameState.PAUSED);
      } else if (engine.getState() === GameState.PAUSED) {
        engine.setState(GameState.PLAYING);
      }
      break;
    case 'm':
      // Back to menu (from paused)
      if (engine.getState() === GameState.PAUSED) {
        engine.setState(GameState.MENU);
      }
      break;
  }
});

console.log('=== Phase 1A: Core Game Loop Active ===');
console.log('Controls:');
console.log('  [P] - Toggle Play/Pause');
console.log('  [M] - Return to Menu (from paused)');
console.log('  Check console for performance reports every 10s');
console.log('=====================================');