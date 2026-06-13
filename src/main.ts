import './styles/main.css';
import { App } from './app/App';

const canvas = document.getElementById('game') as HTMLCanvasElement | null;

if (!canvas) {
  throw new Error('#game canvas not found in index.html');
}

const app = new App(canvas);
app.start().catch((err) => {
  console.error('[HardDrivin] failed to start:', err);
  const status = document.querySelector('.boot__status');
  if (status) status.textContent = 'Failed to start — see console.';
});

// Expose for debugging in the browser console during development.
(window as unknown as { __app?: App }).__app = app;
