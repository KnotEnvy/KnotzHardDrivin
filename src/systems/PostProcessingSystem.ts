import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { CRTShader } from '../shaders/CRTShader';
import { MotionBlurShader } from '../shaders/MotionBlurShader';
import { ColorGradingLUT, generateIdentityLUT, generateArcadeLUT, generateRetroLUT, generateNoirLUT } from '../shaders/ColorGradingLUT';
import { ChromaticAberrationShader } from '../shaders/ChromaticAberrationShader';
import { GraphicsSettings } from '../config/GraphicsConfig';

/**
 * PostProcessingSystem - Advanced Post-Processing Pipeline
 *
 * Manages all post-processing effects for the game:
 * - Bloom: Glow on bright areas (headlights, sparks, UI)
 * - Motion Blur: Velocity-based blur for speed effect
 * - SSAO: Screen-space ambient occlusion for contact shadows
 * - Color Grading: Cinematic color correction via 3D LUT
 * - Chromatic Aberration: Lens distortion effect (ULTRA only)
 * - CRT Effects: Retro arcade aesthetic (scanlines, vignette, grain)
 *
 * Performance Targets:
 * - LOW: <0.5ms (CRT only if enabled)
 * - MEDIUM: <2.0ms (Bloom + Color Grading + CRT)
 * - HIGH: <3.5ms (Bloom + SSAO + Color Grading + Motion Blur + CRT)
 * - ULTRA: <4.0ms (All effects enabled)
 *
 * Architecture:
 * - EffectComposer manages render pass chain
 * - Each effect is a separate pass (can be toggled independently)
 * - Effects are ordered for optimal quality (depth-dependent first, blur last)
 * - Quality presets control which effects are active
 *
 * Pass Order (for optimal quality):
 * 1. RenderPass (scene → texture)
 * 2. SSAOPass (requires depth, affects lighting)
 * 3. UnrealBloomPass (glow on bright areas)
 * 4. MotionBlurPass (velocity-based blur)
 * 5. ColorGradingPass (color correction)
 * 6. ChromaticAberrationPass (lens distortion, ULTRA only)
 * 7. CRTPass (retro effects, final)
 *
 * Usage:
 * ```typescript
 * const postProcessing = new PostProcessingSystem(renderer, scene, camera, settings);
 * postProcessing.update(deltaTime); // Update time-based effects
 * postProcessing.render(); // Render with effects
 * postProcessing.resize(width, height); // On window resize
 * ```
 */
export class PostProcessingSystem {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private composer: EffectComposer;
  private settings: GraphicsSettings;

  // Render passes
  private renderPass: RenderPass;
  private bloomPass?: UnrealBloomPass;
  private ssaoPass?: SSAOPass;
  private motionBlurPass?: ShaderPass;
  private colorGradingPass?: ShaderPass;
  private chromaticAberrationPass?: ShaderPass;
  private crtPass?: ShaderPass;

  // Color grading LUTs
  private lutTextures: Map<string, THREE.Data3DTexture>;

  // Performance tracking
  private lastRenderTime: number = 0;
  private enabled: boolean = true;

  // Window size
  private width: number;
  private height: number;

  // Camera matrices for motion blur
  private prevViewMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private prevProjectionMatrix: THREE.Matrix4 = new THREE.Matrix4();

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    settings: GraphicsSettings
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.settings = settings;

    // Get renderer size
    const size = renderer.getSize(new THREE.Vector2());
    this.width = size.x;
    this.height = size.y;

    // Initialize effect composer
    this.composer = new EffectComposer(renderer);
    this.composer.setSize(this.width, this.height);

    // Generate color grading LUTs
    this.lutTextures = new Map();
    this.generateLUTs();

    // Add base render pass
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // Build effect pipeline based on settings
    this.buildPipeline();

    console.log('[PostProcessingSystem] Initialized with advanced effects pipeline');
  }

  /**
   * Generate color grading LUT textures
   */
  private generateLUTs(): void {
    const lutSize = 32;

    // Create 3D textures for each LUT preset
    const presets = {
      neutral: generateIdentityLUT(lutSize),
      arcade: generateArcadeLUT(lutSize),
      retro: generateRetroLUT(lutSize),
      noir: generateNoirLUT(lutSize),
    };

    for (const [name, data] of Object.entries(presets)) {
      const texture = new THREE.Data3DTexture(data, lutSize, lutSize, lutSize);
      texture.format = THREE.RGBAFormat;
      texture.type = THREE.FloatType;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.wrapR = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;

      this.lutTextures.set(name, texture);
    }

    console.log('[PostProcessingSystem] Generated color grading LUTs:', Array.from(this.lutTextures.keys()));
  }

  /**
   * Build post-processing pipeline based on quality settings
   */
  private buildPipeline(): void {
    // Clear existing passes (keep only render pass)
    while (this.composer.passes.length > 1) {
      this.composer.passes.pop();
    }

    // Reset pass references
    this.bloomPass = undefined;
    this.ssaoPass = undefined;
    this.motionBlurPass = undefined;
    this.colorGradingPass = undefined;
    this.chromaticAberrationPass = undefined;
    this.crtPass = undefined;

    // 1. SSAO Pass (requires depth, affects lighting)
    if (this.settings.ssao) {
      // Pass kernelSize to constructor (cannot be changed after initialization)
      this.ssaoPass = new SSAOPass(
        this.scene,
        this.camera as THREE.PerspectiveCamera,
        this.width,
        this.height,
        this.settings.ssaoSamples // kernelSize parameter
      );
      this.ssaoPass.kernelRadius = 0.8; // Larger radius for more visible occlusion
      this.ssaoPass.minDistance = 0.005;
      this.ssaoPass.maxDistance = 0.2;
      this.composer.addPass(this.ssaoPass);
      console.log(`[PostProcessingSystem] SSAO enabled (${this.settings.ssaoSamples} samples, ~${this.settings.ssaoSamples <= 16 ? '1.5' : '2.0'}ms)`);
    }

    // 2. Bloom Pass (glow on bright areas)
    if (this.settings.bloom) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.width, this.height),
        this.settings.bloomStrength, // Strength
        0.5, // Increased Radius for softer glow
        0.75 // Lowered Threshold (more areas glow slightly)
      );
      this.composer.addPass(this.bloomPass);
      console.log(`[PostProcessingSystem] Bloom enabled (strength: ${this.settings.bloomStrength}, ~0.8ms)`);
    }

    // 3. Motion Blur Pass (velocity-based blur)
    if (this.settings.motionBlur) {
      this.motionBlurPass = new ShaderPass(MotionBlurShader);
      this.motionBlurPass.uniforms.velocityFactor.value = 1.0;
      this.motionBlurPass.uniforms.samples.value = this.settings.motionBlurSamples;
      this.composer.addPass(this.motionBlurPass);
      console.log(`[PostProcessingSystem] Motion Blur enabled (${this.settings.motionBlurSamples} samples, ~1.5ms)`);
    }

    // 4. Color Grading Pass (LUT-based color correction)
    if (this.settings.colorGrading) {
      this.colorGradingPass = new ShaderPass(ColorGradingLUT);
      const lut = this.lutTextures.get(this.settings.colorGradingPreset);
      if (lut) {
        this.colorGradingPass.uniforms.lut.value = lut;
        this.colorGradingPass.uniforms.intensity.value = 1.0;
        this.colorGradingPass.uniforms.lutSize.value = 32.0;
      }
      this.composer.addPass(this.colorGradingPass);
      console.log(`[PostProcessingSystem] Color Grading enabled (${this.settings.colorGradingPreset} LUT, ~0.3ms)`);
    }

    // 5. Chromatic Aberration Pass (lens distortion, ULTRA only)
    if (this.settings.chromaticAberration) {
      this.chromaticAberrationPass = new ShaderPass(ChromaticAberrationShader);
      this.chromaticAberrationPass.uniforms.offset.value = 0.002; // Subtle
      this.chromaticAberrationPass.uniforms.falloff.value = 2.0;
      this.composer.addPass(this.chromaticAberrationPass);
      console.log('[PostProcessingSystem] Chromatic Aberration enabled (ULTRA, ~0.3ms)');
    }

    // 6. CRT Pass (retro effects, final)
    if (this.settings.crtEffects) {
      this.crtPass = new ShaderPass(CRTShader);
      this.crtPass.renderToScreen = true; // Final pass
      this.applyCRTQuality();
      this.composer.addPass(this.crtPass);
      console.log('[PostProcessingSystem] CRT Effects enabled (~0.5ms)');
    }

    // If no CRT effects, last pass must render to screen
    if (!this.settings.crtEffects && this.composer.passes.length > 1) {
      this.composer.passes[this.composer.passes.length - 1].renderToScreen = true;
    }

    console.log(`[PostProcessingSystem] Pipeline built: ${this.composer.passes.length - 1} active passes`);
  }

  /**
   * Apply CRT quality settings (legacy from original CRT system)
   */
  private applyCRTQuality(): void {
    if (!this.crtPass) return;

    // Use medium quality CRT settings by default
    this.crtPass.uniforms.intensity.value = 0.7;
    this.crtPass.uniforms.chromaticAberration.value = 0.05;
    this.crtPass.uniforms.scanlineIntensity.value = 0.15;
    this.crtPass.uniforms.vignetteIntensity.value = 0.6;
    this.crtPass.uniforms.grainIntensity.value = 0.03;
    this.crtPass.uniforms.distortion.value = 0.05;
    this.crtPass.uniforms.scanlineCount.value = 300.0;
  }

  /**
   * Update settings and rebuild pipeline
   */
  updateSettings(settings: GraphicsSettings): void {
    this.settings = settings;
    this.buildPipeline();
    this.resize(this.width, this.height);
  }

  /**
   * Enable or disable post-processing entirely
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`[PostProcessingSystem] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Check if post-processing is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Update time-based effects
   */
  update(deltaTime: number): void {
    // Update CRT time uniform (film grain animation)
    if (this.crtPass) {
      this.crtPass.uniforms.time.value += deltaTime;
    }

    // Update motion blur camera matrices
    if (this.motionBlurPass && this.camera instanceof THREE.PerspectiveCamera) {
      // Store previous frame matrices
      this.prevViewMatrix.copy(this.camera.matrixWorldInverse);
      this.prevProjectionMatrix.copy(this.camera.projectionMatrix);
    }
  }

  /**
   * Render scene with post-processing
   */
  render(): void {
    const startTime = performance.now();

    if (this.enabled && this.composer.passes.length > 1) {
      // Render with post-processing
      this.composer.render();
    } else {
      // Fallback to direct rendering (no effects)
      this.renderer.render(this.scene, this.camera);
    }

    this.lastRenderTime = performance.now() - startTime;

    // Warn if post-processing exceeds budget
    const budget = this.settings.ssao ? 4.0 : 3.0; // Higher budget with SSAO
    if (this.lastRenderTime > budget && this.enabled) {
      console.warn(
        `[PostProcessingSystem] Slow render: ${this.lastRenderTime.toFixed(2)}ms (budget: <${budget}ms)`
      );
    }
  }

  /**
   * Get last render time for performance monitoring
   */
  getLastRenderTime(): number {
    return this.lastRenderTime;
  }

  /**
   * Handle window resize
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    // Update composer size
    this.composer.setSize(width, height);

    // Update SSAO pass size
    if (this.ssaoPass) {
      this.ssaoPass.setSize(width, height);
    }

    // Update bloom pass resolution
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }

    console.log(`[PostProcessingSystem] Resized to ${width}x${height}`);
  }

  /**
   * Set bloom strength (runtime control)
   */
  setBloomStrength(strength: number): void {
    if (this.bloomPass) {
      this.bloomPass.strength = Math.max(0.0, Math.min(3.0, strength));
    }
  }

  /**
   * Set motion blur intensity (runtime control)
   */
  setMotionBlurIntensity(intensity: number): void {
    if (this.motionBlurPass) {
      this.motionBlurPass.uniforms.velocityFactor.value = Math.max(0.0, Math.min(2.0, intensity));
    }
  }

  /**
   * Set chromatic aberration strength (runtime control)
   */
  setChromaticAberrationStrength(strength: number): void {
    if (this.chromaticAberrationPass) {
      this.chromaticAberrationPass.uniforms.offset.value = Math.max(0.0, Math.min(0.01, strength));
    }
  }

  /**
   * Change color grading preset (runtime control)
   */
  setColorGradingPreset(preset: 'neutral' | 'arcade' | 'retro' | 'noir'): void {
    if (this.colorGradingPass) {
      const lut = this.lutTextures.get(preset);
      if (lut) {
        this.colorGradingPass.uniforms.lut.value = lut;
        console.log(`[PostProcessingSystem] Color grading changed to: ${preset}`);
      }
    }
  }

  /**
   * Set color grading intensity (runtime control)
   */
  setColorGradingIntensity(intensity: number): void {
    if (this.colorGradingPass) {
      this.colorGradingPass.uniforms.intensity.value = Math.max(0.0, Math.min(1.0, intensity));
    }
  }

  /**
   * CRT effect controls (legacy API compatibility)
   */
  setChromaticAberration(value: number): void {
    if (this.crtPass) {
      this.crtPass.uniforms.chromaticAberration.value = value;
    }
  }

  setScanlineIntensity(value: number): void {
    if (this.crtPass) {
      this.crtPass.uniforms.scanlineIntensity.value = value;
    }
  }

  setVignetteIntensity(value: number): void {
    if (this.crtPass) {
      this.crtPass.uniforms.vignetteIntensity.value = value;
    }
  }

  setGrainIntensity(value: number): void {
    if (this.crtPass) {
      this.crtPass.uniforms.grainIntensity.value = value;
    }
  }

  setDistortion(value: number): void {
    if (this.crtPass) {
      this.crtPass.uniforms.distortion.value = value;
    }
  }

  /**
   * Get performance breakdown by effect
   * (Estimated based on typical GPU timings)
   */
  getPerformanceBreakdown(): { effect: string; estimatedTime: number }[] {
    const breakdown: { effect: string; estimatedTime: number }[] = [];

    if (this.ssaoPass) {
      const time = this.settings.ssaoSamples <= 16 ? 1.5 : 2.0;
      breakdown.push({ effect: 'SSAO', estimatedTime: time });
    }

    if (this.bloomPass) {
      breakdown.push({ effect: 'Bloom', estimatedTime: 0.8 });
    }

    if (this.motionBlurPass) {
      const time = this.settings.motionBlurSamples <= 12 ? 1.2 : 1.8;
      breakdown.push({ effect: 'Motion Blur', estimatedTime: time });
    }

    if (this.colorGradingPass) {
      breakdown.push({ effect: 'Color Grading', estimatedTime: 0.3 });
    }

    if (this.chromaticAberrationPass) {
      breakdown.push({ effect: 'Chromatic Aberration', estimatedTime: 0.3 });
    }

    if (this.crtPass) {
      breakdown.push({ effect: 'CRT Effects', estimatedTime: 0.5 });
    }

    const total = breakdown.reduce((sum, item) => sum + item.estimatedTime, 0);
    breakdown.push({ effect: 'Total (estimated)', estimatedTime: total });

    return breakdown;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Dispose composer
    this.composer.dispose();

    // Dispose LUT textures
    for (const texture of this.lutTextures.values()) {
      texture.dispose();
    }
    this.lutTextures.clear();

    console.log('[PostProcessingSystem] Disposed');
  }
}
