import RAPIER from '@dimforge/rapier3d-compat';

  export class PhysicsWorld {
    public world: RAPIER.World;
    private initialized = false;

    async init(): Promise<void> {
      await RAPIER.init();
      const gravity = { x: 0.0, y: -9.81, z: 0.0 };
      this.world = new RAPIER.World(gravity);
      this.initialized = true;
      
      // Test: Create a sphere that falls
      const sphereBody = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(0, 10, 0)
      );
      const sphereCollider = this.world.createCollider(
        RAPIER.ColliderDesc.ball(1.0),
        sphereBody
      );
      
      console.log('Rapier initialized successfully!');
    }

    step(deltaTime: number): void {
      if (this.initialized) {
        this.world.step();
      }
    }
  }