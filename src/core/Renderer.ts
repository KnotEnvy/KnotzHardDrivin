import * as THREE from 'three';
import { atmosphere, cloudShade } from '../world/atmosphere';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { LIGHTING } from '../config/lighting.config';
import { renderPixelRatio } from './graphicsQuality';

/**
 * Owns the Three.js renderer, scene, camera, sky, image-based environment and
 * the key light. Other systems add/remove objects via the public `scene`, read/
 * move the `camera`, and (post-FX) read the underlying `gl` renderer.
 *
 * Lighting uses PBR: a physical sky with animated clouds provides the backdrop; — via a
 * PMREM probe — the scene's environment map, so metals/clearcoat reflect a real
 * sky. The directional key light follows the action so shadows stay crisp with a
 * tight frustum instead of an enormous shadow map.
 */
export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly canvas: HTMLCanvasElement;
  private backdrop!:Sky;
  private readonly hemi=new THREE.HemisphereLight(0xabc2d0,0x514b40,LIGHTING.skyFill);
  private environmentTarget?:THREE.WebGLRenderTarget;
  private skyTime=0;
  get atmosphereTime():number{return this.skyTime;}
  get lightDirection():THREE.Vector3{return this.sunDir;}
  private pixelRatio=1;
  private readonly resizeListeners: Array<(w: number, h: number) => void> = [];

  /** Unit vector from the origin toward the sun (key-light direction). */
  private readonly sunDir = new THREE.Vector3();
  private static readonly SUN_ELEVATION = 8; // degrees above horizon
  private static readonly SUN_AZIMUTH = 202; // degrees
  private static readonly SUN_DISTANCE = 120; // how far the light sits from focus

  constructor(canvas: HTMLCanvasElement, pixelRatio=renderPixelRatio(window.innerWidth,window.innerHeight,window.devicePixelRatio,'balanced')) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.pixelRatio=pixelRatio;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = LIGHTING.exposure;

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    this.camera.position.set(10, 7, 14);
    this.camera.lookAt(0, 1, 0);

    // Soft sky/ground fill on top of the image-based environment ambient.
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xffd3a0, LIGHTING.sun);
    this.sun.castShadow = true;
    this.sun.shadow.intensity = .72;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = Renderer.SUN_DISTANCE * 2;
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = .025;
    const s = 55;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.buildEnvironment();

    this.resize();
    window.addEventListener('resize', this.resize);
  }

  /** Bake nearby coast/road into the paint reflections once, outside the game loop. */
  bakeReflection(focus:THREE.Vector3,hidden:THREE.Object3D[]):void {
    const state=hidden.map(o=>o.visible);hidden.forEach(o=>o.visible=false);
    const target=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType});
    const probe=new THREE.CubeCamera(.15,650,target);probe.position.copy(focus);probe.position.y+=1;
    const shadows=this.renderer.shadowMap.autoUpdate;this.renderer.shadowMap.autoUpdate=false;
    probe.update(this.renderer,this.scene);this.renderer.shadowMap.autoUpdate=shadows;
    const pmrem=new THREE.PMREMGenerator(this.renderer);const baked=pmrem.fromCubemap(target.texture);
    this.environmentTarget?.dispose();this.environmentTarget=baked;
    this.scene.environment=baked.texture;this.scene.environmentIntensity=LIGHTING.reflections;
    hidden.forEach((o,i)=>o.visible=state[i]);target.dispose();pmrem.dispose();
  }
  /** The underlying WebGL renderer (for the post-FX composer). */
  get gl(): THREE.WebGLRenderer {
    return this.renderer;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Keep the key light (and its shadow frustum) centred on a focus point so a
   * small, sharp shadow map covers wherever the car is, anywhere on a big track.
   */
  updateAtmosphere(dt:number,focus:THREE.Vector3):void {
    this.skyTime+=Math.max(0,Math.min(.1,dt));
    const elevation=10.5+2.2*Math.sin(this.skyTime/150),azimuth=202+3*Math.sin(this.skyTime/240);
    this.sunDir.setFromSphericalCoords(1,THREE.MathUtils.degToRad(90-elevation),THREE.MathUtils.degToRad(azimuth));
    // Keep the finite sky cube around the viewer along the entire coastal route.
    this.backdrop.position.copy(this.camera.position);
    this.backdrop.material.uniforms.cloudTime.value=this.skyTime;
    const shade=cloudShade(focus.x,focus.z,this.skyTime,this.sunDir);
    this.sun.intensity=LIGHTING.sun*shade;this.sun.color.setHSL(.105+(elevation-8)*.003,.40,.81);
    this.hemi.intensity=LIGHTING.skyFill+(1-shade)*LIGHTING.cloudFill;
    this.scene.environmentIntensity=LIGHTING.reflections+(shade-.85)*LIGHTING.reflectionVariation;
    this.sun.shadow.intensity=.68*shade;
    this.updateSun(focus);
  }
  updateSun(focus: THREE.Vector3): void {
    this.sun.position.copy(focus).addScaledVector(this.sunDir, Renderer.SUN_DISTANCE);
    this.sun.target.position.copy(focus);
    this.sun.target.updateMatrixWorld();
  }

  /** Register a callback fired (after the canvas resizes) with the new size. */
  addResizeListener(fn: (w: number, h: number) => void): void {
    this.resizeListeners.push(fn);
  }

  setPixelRatio(ratio:number):void {this.pixelRatio=ratio;this.resize();}

  readonly resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    for (const fn of this.resizeListeners) fn(w, h);
  };

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    this.environmentTarget?.dispose();
    this.backdrop.geometry.dispose();this.backdrop.material.dispose();
    this.renderer.dispose();
  }

  /** Exposed for diagnostics / debug overlays. */
  get domElement(): HTMLCanvasElement {
    return this.canvas;
  }

  /** Build the physical sky, derive a PMREM environment probe, tune fog. */
  private buildEnvironment(): void {
    const phi = THREE.MathUtils.degToRad(90 - Renderer.SUN_ELEVATION);
    const theta = THREE.MathUtils.degToRad(Renderer.SUN_AZIMUTH);
    this.sunDir.setFromSphericalCoords(1, phi, theta);

    const sky = new Sky();
    sky.scale.setScalar(10000);
    const u = sky.material.uniforms;
    u['turbidity'].value = 3;
    u['rayleigh'].value = 1.5;
    u['mieCoefficient'].value = 0.005;
    u['mieDirectionalG'].value = 0.8;
    u['sunPosition'].value.copy(this.sunDir);

    // Generate an environment map from the sky for PBR reflections/ambient.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const skyScene = new THREE.Scene();
    skyScene.add(sky);
    const envRT = pmrem.fromScene(skyScene);
    this.environmentTarget=envRT;this.scene.environment = envRT.texture;
    this.scene.environmentIntensity = LIGHTING.reflections;
    pmrem.dispose();

    // Re-parent the sky into the live scene as the backdrop.
    this.backdrop=atmosphere(this.sunDir);this.scene.add(this.backdrop);
    sky.geometry.dispose();sky.material.dispose();

    // Light atmospheric haze: keep the mid-track crisp, fade only the far field.
    this.scene.fog = new THREE.Fog(0xb6b7ad, 550, 1850);

    this.updateSun(new THREE.Vector3(0, 0, 0));
  }
}
