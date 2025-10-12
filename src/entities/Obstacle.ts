/**
 * Obstacle - Track obstacles (cones, barriers, tire walls)
 *
 * Static rigid bodies with collision detection.
 * Different collision shapes based on obstacle type.
 *
 * Performance:
 * - Creation: <1ms per obstacle
 * - Collision detection: handled by Rapier (minimal overhead)
 *
 * @module entities/Obstacle
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsWorld } from '../core/PhysicsWorld';

/**
 * Obstacle type enumeration
 */
export enum ObstacleType {
  CONE = 'cone',
  BARRIER = 'barrier',
  TIRE_WALL = 'tire_wall',
}

/**
 * Obstacle entity with physics collision
 */
export class Obstacle {
  private mesh: THREE.Mesh;
  private collider: RAPIER.Collider;
  private type: ObstacleType;
  private rigidBody: RAPIER.RigidBody;

  /**
   * Create obstacle at position
   * @param type - Obstacle type
   * @param position - World position
   * @param world - Physics world
   * @param scene - Three.js scene
   */
  constructor(
    type: ObstacleType,
    position: THREE.Vector3,
    world: PhysicsWorld,
    scene: THREE.Scene
  ) {
    this.type = type;
    this.mesh = this.loadModel(type);
    this.mesh.position.copy(position);
    scene.add(this.mesh);

    this.rigidBody = this.createRigidBody(world, position);
    this.collider = this.createCollider(world, this.rigidBody);
  }

  /**
   * Load 3D model based on obstacle type
   * @param type - Obstacle type
   * @returns Three.js mesh
   */
  private loadModel(type: ObstacleType): THREE.Mesh {
    // For now, create simple geometry placeholders
    // In production, load GLTF models
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    switch (type) {
      case ObstacleType.CONE:
        geometry = new THREE.ConeGeometry(0.3, 0.5, 8);
        material = new THREE.MeshStandardMaterial({
          color: 0xff6600,
          roughness: 0.7,
          metalness: 0.3,
        });
        break;

      case ObstacleType.BARRIER:
        geometry = new THREE.BoxGeometry(2, 0.5, 0.2);
        material = new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          roughness: 0.8,
          metalness: 0.2,
        });
        break;

      case ObstacleType.TIRE_WALL:
        geometry = new THREE.BoxGeometry(1, 1, 0.5);
        material = new THREE.MeshStandardMaterial({
          color: 0x222222,
          roughness: 0.9,
          metalness: 0.1,
        });
        break;

      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  /**
   * Create fixed rigid body for obstacle
   * @param world - Physics world
   * @param position - World position
   * @returns Rigid body
   */
  private createRigidBody(world: PhysicsWorld, position: THREE.Vector3): RAPIER.RigidBody {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      position.x,
      position.y,
      position.z
    );

    return world.world.createRigidBody(bodyDesc);
  }

  /**
   * Create collider based on obstacle type
   * @param world - Physics world
   * @param body - Rigid body to attach collider to
   * @returns Collider
   */
  private createCollider(world: PhysicsWorld, body: RAPIER.RigidBody): RAPIER.Collider {
    // Different collision shapes based on type
    let colliderDesc: RAPIER.ColliderDesc;

    switch (this.type) {
      case ObstacleType.CONE:
        // Cone shape (halfHeight, radius)
        colliderDesc = RAPIER.ColliderDesc.cone(0.25, 0.3);
        break;

      case ObstacleType.BARRIER:
        // Cuboid shape (half-extents)
        colliderDesc = RAPIER.ColliderDesc.cuboid(1.0, 0.25, 0.1);
        break;

      case ObstacleType.TIRE_WALL:
        // Cuboid shape (half-extents)
        colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.25);
        break;

      default:
        colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
    }

    // Set friction and restitution
    colliderDesc.setFriction(0.8);
    colliderDesc.setRestitution(0.3);

    return world.world.createCollider(colliderDesc, body);
  }

  /**
   * Get obstacle mesh
   * @returns Three.js mesh
   */
  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  /**
   * Get obstacle collider
   * @returns Rapier collider
   */
  getCollider(): RAPIER.Collider {
    return this.collider;
  }

  /**
   * Get obstacle type
   * @returns Obstacle type
   */
  getType(): ObstacleType {
    return this.type;
  }

  /**
   * Get obstacle position
   * @returns World position
   */
  getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  /**
   * Update obstacle (if needed for animation, etc.)
   * @param deltaTime - Time step in seconds
   */
  update(deltaTime: number): void {
    // Static obstacles don't need updates
    // Override in subclasses for animated obstacles
  }

  /**
   * Clean up resources
   * @param world - Physics world
   * @param scene - Three.js scene
   */
  dispose(world: PhysicsWorld, scene: THREE.Scene): void {
    // Remove from scene
    scene.remove(this.mesh);

    // Dispose geometry and material
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((material) => material.dispose());
    } else {
      this.mesh.material.dispose();
    }

    // Remove collider and rigid body from physics world
    world.world.removeCollider(this.collider, true);
    world.world.removeRigidBody(this.rigidBody);
  }
}
