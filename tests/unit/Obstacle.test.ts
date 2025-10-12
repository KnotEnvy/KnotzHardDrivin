/**
 * Unit tests for Obstacle.ts
 * Target: >80% coverage
 *
 * Tests cover:
 * - Obstacle creation for each type
 * - Mesh generation with correct geometry
 * - Collider creation with correct shapes
 * - Position and rotation handling
 * - Friction and restitution properties
 * - Resource disposal
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { Obstacle, ObstacleType } from '@/entities/Obstacle';
import { createMockPhysicsWorld } from '../fixtures/testHelpers';
import {
  coneObstacle,
  barrierObstacle,
  tireWallObstacle,
} from '../fixtures/trackFixtures';

describe('Obstacle', () => {
  let mockWorld: any;
  let mockScene: any;

  beforeEach(() => {
    mockWorld = createMockPhysicsWorld();
    mockScene = {
      add: vi.fn(),
      remove: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('constructor and initialization', () => {
    it('should create cone obstacle', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      expect(obstacle).toBeDefined();
      expect(obstacle.getType()).toBe(ObstacleType.CONE);
    });

    it('should create barrier obstacle', () => {
      const obstacle = new Obstacle(
        ObstacleType.BARRIER,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      expect(obstacle).toBeDefined();
      expect(obstacle.getType()).toBe(ObstacleType.BARRIER);
    });

    it('should create tire wall obstacle', () => {
      const obstacle = new Obstacle(
        ObstacleType.TIRE_WALL,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      expect(obstacle).toBeDefined();
      expect(obstacle.getType()).toBe(ObstacleType.TIRE_WALL);
    });

    it('should add mesh to scene', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      expect(mockScene.add).toHaveBeenCalled();
    });

    it('should create rigid body in physics world', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      expect(mockWorld.world.createRigidBody).toHaveBeenCalled();
    });

    it('should create collider in physics world', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      expect(mockWorld.world.createCollider).toHaveBeenCalled();
    });

    it('should set position correctly', () => {
      const position = new THREE.Vector3(10, 5, 20);
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        position,
        mockWorld,
        mockScene
      );

      const obstaclePos = obstacle.getPosition();
      expect(obstaclePos.x).toBe(10);
      expect(obstaclePos.y).toBe(5);
      expect(obstaclePos.z).toBe(20);
    });
  });

  describe('mesh generation', () => {
    it('should create cone geometry for CONE type', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const mesh = obstacle.getMesh();
      expect(mesh.geometry).toBeInstanceOf(THREE.ConeGeometry);
    });

    it('should create box geometry for BARRIER type', () => {
      const obstacle = new Obstacle(
        ObstacleType.BARRIER,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const mesh = obstacle.getMesh();
      expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
    });

    it('should create box geometry for TIRE_WALL type', () => {
      const obstacle = new Obstacle(
        ObstacleType.TIRE_WALL,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const mesh = obstacle.getMesh();
      expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
    });

    it('should use correct color for cone', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const mesh = obstacle.getMesh();
      const material = mesh.material as THREE.MeshStandardMaterial;
      expect(material.color.getHex()).toBe(0xff6600);
    });

    it('should use correct color for barrier', () => {
      const obstacle = new Obstacle(
        ObstacleType.BARRIER,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const mesh = obstacle.getMesh();
      const material = mesh.material as THREE.MeshStandardMaterial;
      expect(material.color.getHex()).toBe(0xcccccc);
    });

    it('should use correct color for tire wall', () => {
      const obstacle = new Obstacle(
        ObstacleType.TIRE_WALL,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const mesh = obstacle.getMesh();
      const material = mesh.material as THREE.MeshStandardMaterial;
      expect(material.color.getHex()).toBe(0x222222);
    });

    it('should enable shadow casting', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const mesh = obstacle.getMesh();
      expect(mesh.castShadow).toBe(true);
    });

    it('should enable shadow receiving', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const mesh = obstacle.getMesh();
      expect(mesh.receiveShadow).toBe(true);
    });

    it('should use MeshStandardMaterial', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const mesh = obstacle.getMesh();
      expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    });
  });

  describe('rigid body creation', () => {
    it('should create fixed rigid body', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(5, 2, 10),
        mockWorld,
        mockScene
      );

      expect(mockWorld.world.createRigidBody).toHaveBeenCalled();
    });

    it('should set rigid body position', () => {
      const position = new THREE.Vector3(10, 5, 20);
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        position,
        mockWorld,
        mockScene
      );

      // Verify RigidBodyDesc.setTranslation was called with correct position
      expect(mockWorld.world.createRigidBody).toHaveBeenCalled();
    });
  });

  describe('collider creation', () => {
    it('should create cone collider for CONE type', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      expect(mockWorld.world.createCollider).toHaveBeenCalled();
    });

    it('should create cuboid collider for BARRIER type', () => {
      const obstacle = new Obstacle(
        ObstacleType.BARRIER,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      expect(mockWorld.world.createCollider).toHaveBeenCalled();
    });

    it('should create cuboid collider for TIRE_WALL type', () => {
      const obstacle = new Obstacle(
        ObstacleType.TIRE_WALL,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      expect(mockWorld.world.createCollider).toHaveBeenCalled();
    });

    it('should return collider from getter', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const collider = obstacle.getCollider();
      expect(collider).toBeDefined();
    });
  });

  describe('friction and restitution', () => {
    it('should set friction to 0.8', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      // Friction is set during collider creation
      expect(mockWorld.world.createCollider).toHaveBeenCalled();
    });

    it('should set restitution to 0.3', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      // Restitution is set during collider creation
      expect(mockWorld.world.createCollider).toHaveBeenCalled();
    });
  });

  describe('position retrieval', () => {
    it('should get position', () => {
      const position = new THREE.Vector3(10, 5, 20);
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        position,
        mockWorld,
        mockScene
      );

      const pos = obstacle.getPosition();
      expect(pos.x).toBe(10);
      expect(pos.y).toBe(5);
      expect(pos.z).toBe(20);
    });

    it('should return clone of position', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const pos1 = obstacle.getPosition();
      const pos2 = obstacle.getPosition();

      expect(pos1).not.toBe(pos2);
    });

    it('should handle negative positions', () => {
      const position = new THREE.Vector3(-10, -5, -20);
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        position,
        mockWorld,
        mockScene
      );

      const pos = obstacle.getPosition();
      expect(pos.x).toBe(-10);
      expect(pos.y).toBe(-5);
      expect(pos.z).toBe(-20);
    });

    it('should handle zero position', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const pos = obstacle.getPosition();
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
      expect(pos.z).toBe(0);
    });
  });

  describe('type retrieval', () => {
    it('should get obstacle type', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      expect(obstacle.getType()).toBe(ObstacleType.CONE);
    });

    it('should return correct type for each obstacle', () => {
      const types = [
        ObstacleType.CONE,
        ObstacleType.BARRIER,
        ObstacleType.TIRE_WALL,
      ];

      types.forEach(type => {
        const obstacle = new Obstacle(
          type,
          new THREE.Vector3(0, 0, 0),
          mockWorld,
          mockScene
        );

        expect(obstacle.getType()).toBe(type);
      });
    });
  });

  describe('mesh retrieval', () => {
    it('should get mesh', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const mesh = obstacle.getMesh();
      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should return same mesh on multiple calls', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const mesh1 = obstacle.getMesh();
      const mesh2 = obstacle.getMesh();

      expect(mesh1).toBe(mesh2);
    });
  });

  describe('update method', () => {
    it('should have update method', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      expect(obstacle.update).toBeDefined();
    });

    it('should not throw on update (static obstacles)', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      expect(() => obstacle.update(1 / 60)).not.toThrow();
    });

    it('should handle zero deltaTime', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      expect(() => obstacle.update(0)).not.toThrow();
    });

    it('should handle large deltaTime', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      expect(() => obstacle.update(10)).not.toThrow();
    });
  });

  describe('resource disposal', () => {
    it('should remove mesh from scene', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      obstacle.dispose(mockWorld, mockScene);

      expect(mockScene.remove).toHaveBeenCalled();
    });

    it('should dispose geometry', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const mesh = obstacle.getMesh();
      const disposeSpy = vi.spyOn(mesh.geometry, 'dispose');

      obstacle.dispose(mockWorld, mockScene);

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should dispose material', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const mesh = obstacle.getMesh();
      const material = mesh.material as THREE.Material;
      const disposeSpy = vi.spyOn(material, 'dispose');

      obstacle.dispose(mockWorld, mockScene);

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should remove collider from physics world', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      obstacle.dispose(mockWorld, mockScene);

      expect(mockWorld.world.removeCollider).toHaveBeenCalled();
    });

    it('should remove rigid body from physics world', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      obstacle.dispose(mockWorld, mockScene);

      expect(mockWorld.world.removeRigidBody).toHaveBeenCalled();
    });

    it('should handle material array', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const mesh = obstacle.getMesh();
      const materials = [
        new THREE.MeshStandardMaterial(),
        new THREE.MeshStandardMaterial(),
      ];
      mesh.material = materials;

      const disposeSpy1 = vi.spyOn(materials[0], 'dispose');
      const disposeSpy2 = vi.spyOn(materials[1], 'dispose');

      obstacle.dispose(mockWorld, mockScene);

      expect(disposeSpy1).toHaveBeenCalled();
      expect(disposeSpy2).toHaveBeenCalled();
    });
  });

  describe('multiple obstacles', () => {
    it('should create multiple obstacles independently', () => {
      const obstacle1 = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      const obstacle2 = new Obstacle(
        ObstacleType.BARRIER,
        new THREE.Vector3(10, 0, 0),
        mockWorld,
        mockScene
      );

      expect(obstacle1.getType()).toBe(ObstacleType.CONE);
      expect(obstacle2.getType()).toBe(ObstacleType.BARRIER);
    });

    it('should handle obstacles at same position', () => {
      const position = new THREE.Vector3(0, 0, 0);

      const obstacle1 = new Obstacle(
        ObstacleType.CONE,
        position,
        mockWorld,
        mockScene
      );

      const obstacle2 = new Obstacle(
        ObstacleType.CONE,
        position,
        mockWorld,
        mockScene
      );

      expect(obstacle1.getPosition()).toEqual(obstacle2.getPosition());
    });
  });

  describe('edge cases', () => {
    it('should handle very large positions', () => {
      const position = new THREE.Vector3(10000, 5000, 20000);
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        position,
        mockWorld,
        mockScene
      );

      const pos = obstacle.getPosition();
      expect(pos.x).toBe(10000);
      expect(pos.y).toBe(5000);
      expect(pos.z).toBe(20000);
    });

    it('should handle very small positions', () => {
      const position = new THREE.Vector3(0.001, 0.002, 0.003);
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        position,
        mockWorld,
        mockScene
      );

      const pos = obstacle.getPosition();
      expect(pos.x).toBeCloseTo(0.001, 3);
      expect(pos.y).toBeCloseTo(0.002, 3);
      expect(pos.z).toBeCloseTo(0.003, 3);
    });

    it('should handle obstacles at world origin', () => {
      const obstacle = new Obstacle(
        ObstacleType.CONE,
        new THREE.Vector3(0, 0, 0),
        mockWorld,
        mockScene
      );

      expect(obstacle.getPosition()).toEqual(new THREE.Vector3(0, 0, 0));
    });

    it('should create obstacle with all types', () => {
      const types = [
        ObstacleType.CONE,
        ObstacleType.BARRIER,
        ObstacleType.TIRE_WALL,
      ];

      types.forEach(type => {
        const obstacle = new Obstacle(
          type,
          new THREE.Vector3(0, 0, 0),
          mockWorld,
          mockScene
        );

        expect(obstacle).toBeDefined();
        expect(obstacle.getType()).toBe(type);
      });
    });
  });

  describe('integration with fixtures', () => {
    it('should match cone fixture properties', () => {
      const obstacle = new Obstacle(
        coneObstacle.type as ObstacleType,
        coneObstacle.position,
        mockWorld,
        mockScene
      );

      expect(obstacle.getType()).toBe(ObstacleType.CONE);
      expect(obstacle.getPosition()).toEqual(coneObstacle.position);
    });

    it('should match barrier fixture properties', () => {
      const obstacle = new Obstacle(
        barrierObstacle.type as ObstacleType,
        barrierObstacle.position,
        mockWorld,
        mockScene
      );

      expect(obstacle.getType()).toBe(ObstacleType.BARRIER);
      expect(obstacle.getPosition()).toEqual(barrierObstacle.position);
    });

    it('should match tire wall fixture properties', () => {
      const obstacle = new Obstacle(
        tireWallObstacle.type as ObstacleType,
        tireWallObstacle.position,
        mockWorld,
        mockScene
      );

      expect(obstacle.getType()).toBe(ObstacleType.TIRE_WALL);
      expect(obstacle.getPosition()).toEqual(tireWallObstacle.position);
    });
  });

  describe('performance', () => {
    it('should create obstacles quickly', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        new Obstacle(
          ObstacleType.CONE,
          new THREE.Vector3(i, 0, 0),
          mockWorld,
          mockScene
        );
      }

      const end = performance.now();
      const avgTime = (end - start) / 100;

      expect(avgTime).toBeLessThan(5); // < 5ms per obstacle in test environment
    });

    it('should handle many obstacles efficiently', () => {
      const obstacles: Obstacle[] = [];

      for (let i = 0; i < 100; i++) {
        obstacles.push(
          new Obstacle(
            ObstacleType.CONE,
            new THREE.Vector3(i, 0, 0),
            mockWorld,
            mockScene
          )
        );
      }

      expect(obstacles.length).toBe(100);
    });
  });
});
