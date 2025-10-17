import * as THREE from 'three';
import { IVehicleModelBuilder, VehicleModelConfig } from './VehicleModelTypes';

/**
 * Corvette-Style Sports Car Model
 *
 * Low-poly but recognizable Corvette-inspired design with:
 * - Sleek, aerodynamic body
 * - Low, wide stance
 * - Aggressive front end with hood scoop
 * - Sloped windshield and cabin
 * - Rear spoiler
 * - Detailed body panels
 *
 * Performance:
 * - Total poly count: ~150-200 triangles
 * - Single draw call per material
 * - LOD-friendly design (can simplify further if needed)
 */
export class CorvetteModel implements IVehicleModelBuilder {
  private config: VehicleModelConfig;

  constructor(config: VehicleModelConfig) {
    this.config = config;
  }

  /**
   * Build the complete Corvette model.
   */
  buildModel(): THREE.Group {
    const carGroup = new THREE.Group();
    carGroup.name = 'corvette-body';

    // Create materials
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.config.bodyColor,
      metalness: this.config.metalness,
      roughness: this.config.roughness,
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: this.config.accentColor || 0x000000,
      metalness: 0.6,
      roughness: 0.4,
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      metalness: 0.0,
      roughness: 0.1,
      transmission: 0.9, // Glass-like transparency
      transparent: true,
      opacity: 0.3,
    });

    // Build car parts
    this.buildLowerBody(carGroup, bodyMaterial);
    this.buildHood(carGroup, bodyMaterial);
    this.buildCabin(carGroup, bodyMaterial, glassMaterial);
    this.buildRearDeck(carGroup, bodyMaterial);
    this.buildFrontBumper(carGroup, accentMaterial);
    this.buildRearBumper(carGroup, accentMaterial);
    this.buildSpoiler(carGroup, accentMaterial);
    this.buildSideSkirts(carGroup, accentMaterial);
    this.buildLights(carGroup);

    // Enable shadows for all meshes
    carGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return carGroup;
  }

  /**
   * Lower body/chassis - wide and low
   */
  private buildLowerBody(parent: THREE.Group, material: THREE.Material): void {
    const bodyGeo = new THREE.BoxGeometry(2.0, 0.5, 4.5);
    const body = new THREE.Mesh(bodyGeo, material);
    body.position.y = 0.25;
    parent.add(body);
  }

  /**
   * Hood - long and sloped with center bulge
   */
  private buildHood(parent: THREE.Group, material: THREE.Material): void {
    // Main hood
    const hoodGeo = new THREE.BoxGeometry(1.9, 0.35, 2.2);
    const hood = new THREE.Mesh(hoodGeo, material);
    hood.position.set(0, 0.55, 1.4);
    hood.rotation.x = -0.05; // Slight downward slope
    parent.add(hood);

    // Hood scoop (aggressive detail)
    const scoopGeo = new THREE.BoxGeometry(0.6, 0.15, 0.8);
    const scoop = new THREE.Mesh(scoopGeo, material);
    scoop.position.set(0, 0.8, 1.6);
    parent.add(scoop);

    // Hood vents (left and right)
    const ventGeo = new THREE.BoxGeometry(0.2, 0.1, 0.5);
    const leftVent = new THREE.Mesh(ventGeo, material);
    leftVent.position.set(-0.6, 0.75, 1.2);
    parent.add(leftVent);

    const rightVent = new THREE.Mesh(ventGeo, material);
    rightVent.position.set(0.6, 0.75, 1.2);
    parent.add(rightVent);
  }

  /**
   * Cabin - low, sloped windshield, racing-style
   */
  private buildCabin(
    parent: THREE.Group,
    bodyMaterial: THREE.Material,
    glassMaterial: THREE.Material
  ): void {
    // Cabin base
    const cabinGeo = new THREE.BoxGeometry(1.7, 0.7, 1.6);
    const cabin = new THREE.Mesh(cabinGeo, bodyMaterial);
    cabin.position.set(0, 0.85, -0.3);
    parent.add(cabin);

    // Windshield (front glass) - sloped
    const windshieldGeo = new THREE.BoxGeometry(1.65, 0.6, 0.6);
    const windshield = new THREE.Mesh(windshieldGeo, glassMaterial);
    windshield.position.set(0, 1.0, 0.5);
    windshield.rotation.x = -0.3; // Steep slope
    parent.add(windshield);

    // Rear window - more upright
    const rearWindowGeo = new THREE.BoxGeometry(1.65, 0.5, 0.4);
    const rearWindow = new THREE.Mesh(rearWindowGeo, glassMaterial);
    rearWindow.position.set(0, 0.95, -0.9);
    rearWindow.rotation.x = 0.2;
    parent.add(rearWindow);

    // Side windows (left and right)
    const sideWindowGeo = new THREE.BoxGeometry(0.05, 0.4, 0.8);
    const leftWindow = new THREE.Mesh(sideWindowGeo, glassMaterial);
    leftWindow.position.set(-0.85, 0.9, -0.1);
    parent.add(leftWindow);

    const rightWindow = new THREE.Mesh(sideWindowGeo, glassMaterial);
    rightWindow.position.set(0.85, 0.9, -0.1);
    parent.add(rightWindow);
  }

  /**
   * Rear deck/trunk - slightly raised
   */
  private buildRearDeck(parent: THREE.Group, material: THREE.Material): void {
    const deckGeo = new THREE.BoxGeometry(1.85, 0.35, 1.1);
    const deck = new THREE.Mesh(deckGeo, material);
    deck.position.set(0, 0.55, -1.8);
    parent.add(deck);
  }

  /**
   * Front bumper - aggressive, low
   */
  private buildFrontBumper(parent: THREE.Group, material: THREE.Material): void {
    const bumperGeo = new THREE.BoxGeometry(2.1, 0.25, 0.3);
    const bumper = new THREE.Mesh(bumperGeo, material);
    bumper.position.set(0, 0.15, 2.65);
    parent.add(bumper);

    // Front splitter (aerodynamic element)
    const splitterGeo = new THREE.BoxGeometry(2.2, 0.05, 0.2);
    const splitter = new THREE.Mesh(splitterGeo, material);
    splitter.position.set(0, 0.05, 2.75);
    parent.add(splitter);
  }

  /**
   * Rear bumper - integrated with body
   */
  private buildRearBumper(parent: THREE.Group, material: THREE.Material): void {
    const bumperGeo = new THREE.BoxGeometry(2.0, 0.25, 0.3);
    const bumper = new THREE.Mesh(bumperGeo, material);
    bumper.position.set(0, 0.2, -2.55);
    parent.add(bumper);

    // Rear diffuser
    const diffuserGeo = new THREE.BoxGeometry(1.8, 0.15, 0.25);
    const diffuser = new THREE.Mesh(diffuserGeo, material);
    diffuser.position.set(0, 0.1, -2.65);
    parent.add(diffuser);
  }

  /**
   * Rear spoiler - racing-style
   */
  private buildSpoiler(parent: THREE.Group, material: THREE.Material): void {
    // Spoiler mounts (left and right)
    const mountGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const leftMount = new THREE.Mesh(mountGeo, material);
    leftMount.position.set(-0.7, 0.95, -2.1);
    parent.add(leftMount);

    const rightMount = new THREE.Mesh(mountGeo, material);
    rightMount.position.set(0.7, 0.95, -2.1);
    parent.add(rightMount);

    // Spoiler wing
    const wingGeo = new THREE.BoxGeometry(1.6, 0.08, 0.4);
    const wing = new THREE.Mesh(wingGeo, material);
    wing.position.set(0, 1.15, -2.1);
    wing.rotation.x = -0.15; // Slight angle for downforce
    parent.add(wing);
  }

  /**
   * Side skirts - aerodynamic side panels
   */
  private buildSideSkirts(parent: THREE.Group, material: THREE.Material): void {
    const skirtGeo = new THREE.BoxGeometry(0.15, 0.2, 3.5);

    // Left side skirt
    const leftSkirt = new THREE.Mesh(skirtGeo, material);
    leftSkirt.position.set(-1.05, 0.15, 0);
    parent.add(leftSkirt);

    // Right side skirt
    const rightSkirt = new THREE.Mesh(skirtGeo, material);
    rightSkirt.position.set(1.05, 0.15, 0);
    parent.add(rightSkirt);
  }

  /**
   * Headlights and taillights
   */
  private buildLights(parent: THREE.Group): void {
    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: 0xffffaa,
      emissiveIntensity: 0.5,
    });

    const taillightMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    });

    // Headlights (front)
    const headlightGeo = new THREE.BoxGeometry(0.3, 0.15, 0.1);

    const leftHeadlight = new THREE.Mesh(headlightGeo, headlightMaterial);
    leftHeadlight.position.set(-0.7, 0.35, 2.72);
    parent.add(leftHeadlight);

    const rightHeadlight = new THREE.Mesh(headlightGeo, headlightMaterial);
    rightHeadlight.position.set(0.7, 0.35, 2.72);
    parent.add(rightHeadlight);

    // Taillights (rear)
    const taillightGeo = new THREE.BoxGeometry(0.4, 0.15, 0.1);

    const leftTaillight = new THREE.Mesh(taillightGeo, taillightMaterial);
    leftTaillight.position.set(-0.7, 0.35, -2.62);
    parent.add(leftTaillight);

    const rightTaillight = new THREE.Mesh(taillightGeo, taillightMaterial);
    rightTaillight.position.set(0.7, 0.35, -2.62);
    parent.add(rightTaillight);
  }

  /**
   * Get vehicle display name.
   */
  getDisplayName(): string {
    return 'Corvette ZR1';
  }

  /**
   * Get recommended camera offset for chase cam.
   */
  getCameraOffset(): THREE.Vector3 {
    return new THREE.Vector3(0, 2.5, -8); // Further back for sports car view
  }
}
