import { SceneManager } from './SceneManager';
  import { PhysicsWorld } from './PhysicsWorld';

  export class GameEngine {
    private sceneManager: SceneManager;
    private physicsWorld: PhysicsWorld;
    private lastTime = 0;
    private running = false;

    constructor() {
      const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
      this.sceneManager = new SceneManager(canvas);
      this.physicsWorld = new PhysicsWorld();
    }

    async start(): Promise<void> {
      await this.physicsWorld.init();
      this.running = true;
      this.lastTime = performance.now();
      this.gameLoop();
    }

    private gameLoop = (): void => {
      if (!this.running) return;

      const currentTime = performance.now();
      const deltaTime = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      // Update physics
      this.physicsWorld.step(deltaTime);

      // Render
      this.sceneManager.render();

      requestAnimationFrame(this.gameLoop);
    };

    stop(): void {
      this.running = false;
    }
  }