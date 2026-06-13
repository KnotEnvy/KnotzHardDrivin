import RAPIER from '@dimforge/rapier3d-compat';
import { GRAVITY_Y } from '../config/constants';

/**
 * Thin wrapper around a Rapier physics world.
 *
 * Rapier's WASM must be initialised once before any world is created, so
 * `init()` is async and must be awaited before `world` is accessed.
 */
export class Physics {
  private _world: RAPIER.World | null = null;
  private _ready = false;

  get ready(): boolean {
    return this._ready;
  }

  /** The live physics world. Throws if accessed before `init()`. */
  get world(): RAPIER.World {
    if (!this._world) {
      throw new Error('Physics.init() must be awaited before accessing the world.');
    }
    return this._world;
  }

  /** Re-export the Rapier namespace so callers need not import it separately. */
  get RAPIER(): typeof RAPIER {
    return RAPIER;
  }

  async init(gravityY: number = GRAVITY_Y): Promise<void> {
    if (this._ready) return;
    await RAPIER.init();
    this._world = new RAPIER.World({ x: 0, y: gravityY, z: 0 });
    this._ready = true;
  }

  /** Advance the simulation by exactly `dt` seconds. */
  step(dt: number): void {
    const world = this.world;
    world.timestep = dt;
    world.step();
  }

  dispose(): void {
    this._world?.free();
    this._world = null;
    this._ready = false;
  }
}
