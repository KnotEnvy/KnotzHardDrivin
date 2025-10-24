// Phase 2: Vehicle Physics & Input Test
import { GameEngine, GameState } from './core/GameEngine';

const engine = new GameEngine();

// Expose engine on window for E2E testing
(window as any).gameEngine = engine;

// Start the game engine
engine.start().then(() => {
  // Game will start in MENU state - user must click START RACE button
  console.log('Game ready! Click START RACE to begin.');
  // Note: Auto-start disabled for Phase 6 - proper menu flow
});

// Add FPS display for monitoring performance
const perfMonitor = engine.getPerformanceMonitor();
const fpsDisplay = perfMonitor.createFPSDisplay();
document.body.appendChild(fpsDisplay);

// Log performance report and vehicle telemetry every 10 seconds
setInterval(() => {
  perfMonitor.logPerformanceReport();

  // Log state machine info
  console.log('\n=== State Machine Status ===');
  console.log(`Current State: ${engine.getState()}`);
  const stateManager = engine.getStateManager();
  console.log(`Valid Transitions: ${stateManager.getValidTransitions(engine.getState()).join(', ')}`);

  // Log vehicle telemetry if available
  const vehicle = engine.getVehicle();
  if (vehicle) {
    const telemetry = vehicle.getTelemetry();
    console.log('\n=== Vehicle Telemetry ===');
    console.log(`Speed: ${telemetry.speed.toFixed(1)} m/s (${telemetry.speedKmh.toFixed(1)} km/h)`);
    console.log(`RPM: ${telemetry.rpm.toFixed(0)}`);
    console.log(`Gear: ${telemetry.gear}`);
    console.log(`Grounded Wheels: ${telemetry.wheelsOnGround}/4`);
    console.log(`Airborne: ${telemetry.isAirborne}`);
    console.log(`G-Force: ${telemetry.gForce.toFixed(2)}`);
  }
}, 10000);

console.log('=== Phase 2: Vehicle Physics Active ===');
console.log('Vehicle Controls:');
console.log('  [W/↑]     - Throttle');
console.log('  [S/↓]     - Brake');
console.log('  [A/←]     - Steer Left');
console.log('  [D/→]     - Steer Right');
console.log('  [Space]   - Handbrake');
console.log('  [R]       - Reset Vehicle');
console.log('  [Esc/P]   - Pause/Unpause');
console.log('');
console.log('Gamepad supported (Xbox/PS layout)');
console.log('Check console for performance reports every 10s');
console.log('==========================================');