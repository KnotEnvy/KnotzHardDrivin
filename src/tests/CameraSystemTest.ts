/**
 * CameraSystemTest - Phase 1B camera system integration test
 *
 * This file provides a standalone test environment for the camera system.
 * It creates a test scene with a moving cube and allows interactive camera mode switching.
 *
 * Usage:
 * Import this in main.ts during Phase 1B development:
 * ```typescript
 * import { setupCameraTest } from './tests/CameraSystemTest';
 * setupCameraTest();
 * ```
 */

import * as THREE from 'three';
import { CameraSystem, CameraMode, type CameraTarget } from '../systems/CameraSystem';

/**
 * Sets up the camera system test environment
 * Creates a scene with a moving test object and interactive controls
 */
export function setupCameraTest(): void {
  console.log('=== Phase 1B Camera System Test ===');
  console.log('Controls:');
  console.log('  [1] - First-person camera');
  console.log('  [2] - Replay camera');
  console.log('  [Space] - Toggle camera mode');
  console.log('  [Arrow Keys] - Manual cube movement');
  console.log('  [P] - Pause/Resume automatic movement');
  console.log('  [D] - Print debug info');
  console.log('  [R] - Reset camera');
  console.log('====================================');

  // Get the canvas
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found!');
    return;
  }

  // Set up Three.js scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0xa0a0a0, 100, 500);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  // Lighting
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
  sunLight.position.set(50, 100, 50);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.left = -100;
  sunLight.shadow.camera.right = 100;
  sunLight.shadow.camera.top = 100;
  sunLight.shadow.camera.bottom = -100;
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d2817, 0.6);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
  scene.add(ambientLight);

  // Ground
  const groundGeometry = new THREE.PlaneGeometry(200, 200);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080,
    roughness: 0.8,
    metalness: 0.2,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Test cube (our "vehicle")
  const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
  const cubeMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    roughness: 0.5,
    metalness: 0.5,
  });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.position.set(0, 1, 0);
  cube.castShadow = true;
  cube.receiveShadow = true;
  scene.add(cube);

  // Grid and axes helpers
  const gridHelper = new THREE.GridHelper(200, 40, 0x444444, 0x222222);
  scene.add(gridHelper);

  const axesHelper = new THREE.AxesHelper(10);
  scene.add(axesHelper);

  // Create camera target wrapper
  const testTarget: CameraTarget = {
    position: cube.position,
    quaternion: cube.quaternion,
    velocity: new THREE.Vector3(0, 0, 0),
  };

  // Initialize camera system
  const cameraSystem = new CameraSystem(camera);

  // Test variables
  let time = 0;
  let lastPosition = cube.position.clone();
  let isPaused = false;
  let lastTime = performance.now();

  // FPS display
  const fpsDisplay = document.createElement('div');
  fpsDisplay.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: #0f0;
    font-family: monospace;
    font-size: 14px;
    padding: 10px;
    border-radius: 4px;
    z-index: 10000;
  `;
  document.body.appendChild(fpsDisplay);

  // Keyboard controls
  setupKeyboardControls(cameraSystem, testTarget, cube, () => isPaused = !isPaused);

  // Window resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    // Update test object movement (if not paused)
    if (!isPaused) {
      time += deltaTime;
      updateTestObject(cube, testTarget, time, deltaTime, lastPosition);
    }

    // Update camera system
    cameraSystem.update(deltaTime, testTarget);

    // Update FPS display
    updateFPSDisplay(fpsDisplay, deltaTime, cameraSystem);

    // Render
    renderer.render(scene, camera);
  }

  animate();
}

/**
 * Update the test object movement (figure-8 pattern)
 */
function updateTestObject(
  cube: THREE.Mesh,
  target: CameraTarget,
  time: number,
  deltaTime: number,
  lastPosition: THREE.Vector3
): void {
  // Move cube in a figure-8 pattern
  const radius = 20;
  const speed = 0.5;

  const x = Math.sin(time * speed) * radius;
  const z = Math.sin(time * speed * 2) * radius;

  const newPos = new THREE.Vector3(x, 1, z);

  // Calculate velocity
  if (target.velocity) {
    target.velocity.subVectors(newPos, lastPosition);
    if (deltaTime > 0) {
      target.velocity.divideScalar(deltaTime);
    }
  }

  lastPosition.copy(cube.position);
  cube.position.copy(newPos);

  // Rotate cube to face movement direction
  if (target.velocity && target.velocity.lengthSq() > 0.01) {
    const direction = target.velocity.clone().normalize();
    const angle = Math.atan2(direction.x, direction.z);
    cube.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
  }
}

/**
 * Set up keyboard controls for camera testing
 */
function setupKeyboardControls(
  cameraSystem: CameraSystem,
  target: CameraTarget,
  cube: THREE.Mesh,
  togglePause: () => void
): void {
  window.addEventListener('keydown', (event) => {
    switch (event.key) {
      case '1':
        console.log('Switching to First-Person camera');
        cameraSystem.transitionTo(CameraMode.FIRST_PERSON, 1.0);
        break;

      case '2':
        console.log('Switching to Replay camera');
        cameraSystem.transitionTo(CameraMode.REPLAY, 1.5);
        break;

      case ' ':
        event.preventDefault();
        const currentMode = cameraSystem.getMode();
        const newMode = currentMode === CameraMode.FIRST_PERSON
          ? CameraMode.REPLAY
          : CameraMode.FIRST_PERSON;
        console.log(`Toggling camera: ${currentMode} -> ${newMode}`);
        cameraSystem.transitionTo(newMode, 1.0);
        break;

      case 'p':
      case 'P':
        togglePause();
        console.log('Movement paused/resumed');
        break;

      case 'r':
      case 'R':
        cameraSystem.reset();
        console.log('Camera reset');
        break;

      case 'ArrowUp':
        cube.position.z += 1;
        break;

      case 'ArrowDown':
        cube.position.z -= 1;
        break;

      case 'ArrowLeft':
        cube.position.x -= 1;
        break;

      case 'ArrowRight':
        cube.position.x += 1;
        break;

      case 'd':
      case 'D':
        console.log('=== Camera Debug Info ===');
        console.log(cameraSystem.getDebugInfo());
        console.log('Target velocity:', target.velocity);
        console.log('=========================');
        break;
    }
  });
}

/**
 * Update FPS display
 */
function updateFPSDisplay(
  display: HTMLDivElement,
  deltaTime: number,
  cameraSystem: CameraSystem
): void {
  const fps = deltaTime > 0 ? 1 / deltaTime : 60;
  const frameTime = deltaTime * 1000;

  // Color code based on performance
  let color = '#0f0';
  if (fps < 55) color = '#ff0';
  if (fps < 40) color = '#f00';
  display.style.color = color;

  const debugInfo = cameraSystem.getDebugInfo();
  const mode = debugInfo.mode.toUpperCase().replace('_', ' ');

  display.innerHTML = `
    FPS: ${fps.toFixed(1)}<br>
    Frame: ${frameTime.toFixed(2)}ms<br>
    Camera: ${mode}<br>
    ${cameraSystem.isInTransition() ? '<span style="color: #ff0">TRANSITIONING</span>' : ''}
  `;
}
