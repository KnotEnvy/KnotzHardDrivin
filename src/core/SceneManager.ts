import * as THREE from 'three';

  export class SceneManager {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;

    constructor(canvas: HTMLCanvasElement) {
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(
        75, window.innerWidth / window.innerHeight, 0.1, 1000
      );
      this.renderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: true 
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      
      // Test: Add a spinning cube
      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      this.scene.add(cube);
      
      // Lighting
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(5, 5, 5);
      this.scene.add(light);
      this.scene.add(new THREE.AmbientLight(0x404040));
      
      this.camera.position.z = 5;
    }

    render(): void {
      this.renderer.render(this.scene, this.camera);
    }
  }