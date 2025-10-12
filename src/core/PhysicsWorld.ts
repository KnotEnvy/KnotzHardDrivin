import RAPIER from '@dimforge/rapier3d-compat';

  export class PhysicsWorld {
    public world!: RAPIER.World;
    private initialized = false;

    async init(): Promise<void> {
      await RAPIER.init();
      const gravity = { x: 0.0, y: -9.81, z: 0.0 };
      this.world = new RAPIER.World(gravity);
      this.initialized = true;

      console.log('Rapier initialized successfully!');
    }

    step(deltaTime: number): void {
      if (this.initialized) {
        this.world.step();
      }
    }
  }