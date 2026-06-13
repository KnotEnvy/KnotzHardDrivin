import * as THREE from 'three';
import { MAX_PIXEL_RATIO } from '../config/constants';

/**
 * Owns the Three.js renderer, scene, camera and base lighting. Other systems
 * add/remove objects via the public `scene`, and read/move the `camera`.
 */
export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const sky = new THREE.Color(0x88c0ff);
    this.scene.background = sky;
    this.scene.fog = new THREE.Fog(sky, 80, 280);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.camera.position.set(10, 7, 14);
    this.camera.lookAt(0, 1, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 0.85);
    this.scene.add(hemi);

    this.sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
    this.sun.position.set(30, 50, 20);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 160;
    const s = 60;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.resize();
    window.addEventListener('resize', this.resize);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  readonly resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    this.renderer.dispose();
  }

  /** Exposed for diagnostics / debug overlays. */
  get domElement(): HTMLCanvasElement {
    return this.canvas;
  }
}
