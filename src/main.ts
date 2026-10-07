import './styles/main.css';
import { App } from './app/App';

function showStartupError(error: unknown): void {
  console.error('[Pacific Run] failed to start:', error);
  const boot = document.getElementById('boot');
  boot?.classList.remove('is-hidden');
  const status = document.querySelector('.boot__status');
  if (status) status.textContent = 'The graphics engine could not start. Close other graphics-heavy tabs and try again.';
  if (boot && !boot.querySelector('button')) {
    const retry = document.createElement('button');
    retry.className = 'primary';
    retry.textContent = 'TRY AGAIN';
    retry.addEventListener('click', () => window.location.reload());
    boot.append(retry);
  }
}

async function boot(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  if (!canvas) throw new Error('Game canvas missing');
  const app = new App(canvas);
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    app.stop();
    showStartupError(new Error('Graphics context lost'));
  });
  await app.start();
  if (import.meta.env.DEV) (window as unknown as { __app?: App }).__app = app;
}

void boot().catch(showStartupError);
