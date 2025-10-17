import * as THREE from 'three';
import { IVehicleModelBuilder, VehicleModelConfig } from './VehicleModelTypes';

/**
 * Tesla Cybertruck Model
 *
 * Angular, geometric design matching Cybertruck aesthetic:
 * - Sharp, faceted body panels (no curves)
 * - Flat, angular windshield
 * - Trapezoidal profile
 * - Exoskeleton-style construction
 * - Distinctive triangular roof line
 * - Large, flat bed
 *
 * Performance:
 * - Total poly count: ~120-150 triangles (very efficient due to flat surfaces)
 * - Single draw call per material
 * - Excellent LOD candidate (already very low poly)
 */
export class CybertruckModel implements IVehicleModelBuilder {
  private config: VehicleModelConfig;

  constructor(config: VehicleModelConfig) {
    this.config = config;
  }

  /**
   * Build the complete Cybertruck model.
   */
  buildModel(): THREE.Group {
    const truckGroup = new THREE.Group();
    truckGroup.name = 'cybertruck-body';

    // Create materials
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.config.bodyColor,
      metalness: this.config.metalness,
      roughness: this.config.roughness,
      flatShading: true, // Angular, faceted look
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x222222, // Dark tinted glass
      metalness: 0.1,
      roughness: 0.0,
      transmission: 0.7,
      transparent: true,
      opacity: 0.4,
      flatShading: true,
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: this.config.accentColor || 0x222222,
      metalness: 0.5,
      roughness: 0.5,
      flatShading: true,
    });

    // Build truck parts
    this.buildLowerBody(truckGroup, bodyMaterial);
    this.buildCabin(truckGroup, bodyMaterial, glassMaterial);
    this.buildBed(truckGroup, bodyMaterial);
    this.buildFrontEnd(truckGroup, bodyMaterial);
    this.buildWheelArches(truckGroup, accentMaterial);
    this.buildLights(truckGroup);
    this.buildTruckBedRails(truckGroup, accentMaterial);

    // Enable shadows
    truckGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return truckGroup;
  }

  /**
   * Lower body - wide, trapezoidal profile
   */
  private buildLowerBody(parent: THREE.Group, material: THREE.Material): void {
    // Create custom trapezoidal geometry using BoxGeometry and scaling
    const lowerBodyGeo = new THREE.BoxGeometry(2.2, 0.6, 5.0);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, material);
    lowerBody.position.y = 0.3;
    lowerBody.scale.set(1, 1, 1); // Keep rectangular for base
    parent.add(lowerBody);

    // Side panels - angled outward for Cybertruck profile
    const sidePanelGeo = new THREE.BoxGeometry(0.1, 0.8, 4.8);

    const leftPanel = new THREE.Mesh(sidePanelGeo, material);
    leftPanel.position.set(-1.1, 0.5, 0);
    leftPanel.rotation.z = -0.1; // Slight outward angle
    parent.add(leftPanel);

    const rightPanel = new THREE.Mesh(sidePanelGeo, material);
    rightPanel.position.set(1.1, 0.5, 0);
    rightPanel.rotation.z = 0.1; // Slight outward angle
    parent.add(rightPanel);
  }

  /**
   * Cabin - distinctive angular design with sloped windshield
   */
  private buildCabin(
    parent: THREE.Group,
    bodyMaterial: THREE.Material,
    glassMaterial: THREE.Material
  ): void {
    // Cabin back wall
    const backWallGeo = new THREE.BoxGeometry(2.2, 1.0, 0.2);
    const backWall = new THREE.Mesh(backWallGeo, bodyMaterial);
    backWall.position.set(0, 1.1, 0.5);
    parent.add(backWall);

    // Roof - flat and angular
    const roofGeo = new THREE.BoxGeometry(2.2, 0.1, 2.0);
    const roof = new THREE.Mesh(roofGeo, bodyMaterial);
    roof.position.set(0, 1.6, 1.2);
    roof.rotation.x = -0.25; // Forward slope matching windshield
    parent.add(roof);

    // Windshield - iconic steep angle (about 30 degrees)
    const windshieldGeo = new THREE.BoxGeometry(2.1, 1.4, 0.1);
    const windshield = new THREE.Mesh(windshieldGeo, glassMaterial);
    windshield.position.set(0, 1.4, 1.8);
    windshield.rotation.x = -0.52; // ~30 degree angle (rad)
    parent.add(windshield);

    // Side windows - flat and angular
    const sideWindowGeo = new THREE.BoxGeometry(0.1, 0.6, 1.2);

    const leftWindow = new THREE.Mesh(sideWindowGeo, glassMaterial);
    leftWindow.position.set(-1.1, 1.2, 1.0);
    parent.add(leftWindow);

    const rightWindow = new THREE.Mesh(sideWindowGeo, glassMaterial);
    rightWindow.position.set(1.1, 1.2, 1.0);
    parent.add(rightWindow);

    // Rear window (smaller, triangular area)
    const rearWindowGeo = new THREE.BoxGeometry(2.1, 0.4, 0.1);
    const rearWindow = new THREE.Mesh(rearWindowGeo, glassMaterial);
    rearWindow.position.set(0, 1.3, 0.4);
    parent.add(rearWindow);
  }

  /**
   * Truck bed - large, flat cargo area
   */
  private buildBed(parent: THREE.Group, material: THREE.Material): void {
    // Bed floor
    const bedFloorGeo = new THREE.BoxGeometry(2.0, 0.1, 2.2);
    const bedFloor = new THREE.Mesh(bedFloorGeo, material);
    bedFloor.position.set(0, 0.7, -1.5);
    parent.add(bedFloor);

    // Bed walls - left, right, and tailgate
    const sideWallGeo = new THREE.BoxGeometry(0.1, 0.4, 2.2);

    const leftWall = new THREE.Mesh(sideWallGeo, material);
    leftWall.position.set(-1.0, 0.9, -1.5);
    parent.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, material);
    rightWall.position.set(1.0, 0.9, -1.5);
    parent.add(rightWall);

    // Tailgate
    const tailgateGeo = new THREE.BoxGeometry(2.0, 0.4, 0.1);
    const tailgate = new THREE.Mesh(tailgateGeo, material);
    tailgate.position.set(0, 0.9, -2.6);
    parent.add(tailgate);
  }

  /**
   * Front end - angular and aggressive
   */
  private buildFrontEnd(parent: THREE.Group, material: THREE.Material): void {
    // Front fascia - flat, angular
    const frontGeo = new THREE.BoxGeometry(2.2, 0.8, 0.2);
    const front = new THREE.Mesh(frontGeo, material);
    front.position.set(0, 0.7, 2.6);
    parent.add(front);

    // Hood - flat and angular
    const hoodGeo = new THREE.BoxGeometry(2.0, 0.15, 1.2);
    const hood = new THREE.Mesh(hoodGeo, material);
    hood.position.set(0, 1.1, 2.0);
    parent.add(hood);

    // Front bumper bar (exoskeleton style)
    const bumperGeo = new THREE.BoxGeometry(2.4, 0.15, 0.2);
    const bumper = new THREE.Mesh(bumperGeo, material);
    bumper.position.set(0, 0.35, 2.7);
    parent.add(bumper);
  }

  /**
   * Wheel arches - angular, box-style
   */
  private buildWheelArches(parent: THREE.Group, material: THREE.Material): void {
    const archGeo = new THREE.BoxGeometry(0.5, 0.3, 0.9);

    // Front left
    const frontLeft = new THREE.Mesh(archGeo, material);
    frontLeft.position.set(-1.2, 0.4, 1.5);
    parent.add(frontLeft);

    // Front right
    const frontRight = new THREE.Mesh(archGeo, material);
    frontRight.position.set(1.2, 0.4, 1.5);
    parent.add(frontRight);

    // Rear left
    const rearLeft = new THREE.Mesh(archGeo, material);
    rearLeft.position.set(-1.2, 0.4, -1.5);
    parent.add(rearLeft);

    // Rear right
    const rearRight = new THREE.Mesh(archGeo, material);
    rearRight.position.set(1.2, 0.4, -1.5);
    parent.add(rearRight);
  }

  /**
   * LED light bar and tail lights
   */
  private buildLights(parent: THREE.Group): void {
    // Front LED light bar
    const frontLightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.7,
    });

    const frontLightGeo = new THREE.BoxGeometry(1.8, 0.15, 0.1);
    const frontLight = new THREE.Mesh(frontLightGeo, frontLightMaterial);
    frontLight.position.set(0, 0.9, 2.68);
    parent.add(frontLight);

    // Rear LED light bar (full width)
    const rearLightMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.7,
    });

    const rearLightGeo = new THREE.BoxGeometry(2.0, 0.1, 0.1);
    const rearLight = new THREE.Mesh(rearLightGeo, rearLightMaterial);
    rearLight.position.set(0, 1.0, -2.68);
    parent.add(rearLight);

    // Side marker lights
    const sideLightGeo = new THREE.BoxGeometry(0.1, 0.08, 0.2);

    const leftMarker = new THREE.Mesh(sideLightGeo, rearLightMaterial);
    leftMarker.position.set(-1.15, 0.6, 2.4);
    parent.add(leftMarker);

    const rightMarker = new THREE.Mesh(sideLightGeo, rearLightMaterial);
    rightMarker.position.set(1.15, 0.6, 2.4);
    parent.add(rightMarker);
  }

  /**
   * Truck bed rails/tonneau cover supports
   */
  private buildTruckBedRails(parent: THREE.Group, material: THREE.Material): void {
    const railGeo = new THREE.BoxGeometry(0.08, 0.08, 2.2);

    // Left rail
    const leftRail = new THREE.Mesh(railGeo, material);
    leftRail.position.set(-1.0, 1.1, -1.5);
    parent.add(leftRail);

    // Right rail
    const rightRail = new THREE.Mesh(railGeo, material);
    rightRail.position.set(1.0, 1.1, -1.5);
    parent.add(rightRail);
  }

  /**
   * Get vehicle display name.
   */
  getDisplayName(): string {
    return 'Cybertruck';
  }

  /**
   * Get recommended camera offset for chase cam.
   */
  getCameraOffset(): THREE.Vector3 {
    return new THREE.Vector3(0, 3.0, -10); // Higher and further back for truck
  }
}
