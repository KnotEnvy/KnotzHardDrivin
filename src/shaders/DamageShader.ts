import * as THREE from 'three';

/**
 * DamageShader - Custom shader for damaged vehicle materials
 *
 * Features:
 * - Progressive darkening based on damage level
 * - Metallic surface degradation (shiny → dull)
 * - Dirt/scratch overlay effect
 * - Bare metal exposure at high damage
 * - Single-pass shader for performance
 *
 * Performance Target: <0.3ms per vehicle per frame
 *
 * Usage:
 * ```typescript
 * const damageMaterial = new THREE.ShaderMaterial({
 *   uniforms: THREE.UniformsUtils.clone(DamageShader.uniforms),
 *   vertexShader: DamageShader.vertexShader,
 *   fragmentShader: DamageShader.fragmentShader,
 * });
 *
 * // Update damage level (0-1)
 * damageMaterial.uniforms.damageLevel.value = 0.75;
 * ```
 */
export const DamageShader = {
  /**
   * Shader uniforms
   */
  uniforms: {
    /**
     * Base vehicle color (from original material).
     */
    baseColor: { value: new THREE.Color(0xff0000) },

    /**
     * Damage level (0 = pristine, 1 = destroyed).
     */
    damageLevel: { value: 0.0 },

    /**
     * Metalness of pristine material (0-1).
     */
    baseMetalness: { value: 0.8 },

    /**
     * Roughness of pristine material (0-1).
     */
    baseRoughness: { value: 0.2 },

    /**
     * Dirt color (dark brown/gray).
     */
    dirtColor: { value: new THREE.Color(0x3a3228) },

    /**
     * Bare metal color (exposed metal at high damage).
     */
    metalColor: { value: new THREE.Color(0x888888) },

    /**
     * Time uniform for animated effects (optional).
     */
    time: { value: 0.0 },
  },

  /**
   * Vertex shader
   *
   * Simple pass-through shader with normal and position data.
   */
  vertexShader: /* glsl */ `
    // Standard attributes from BufferGeometry
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;

    // Standard uniforms from Three.js
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat3 normalMatrix;

    // Varyings to fragment shader
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      // Transform normal to view space
      vNormal = normalize(normalMatrix * normal);

      // Pass position and UV to fragment shader
      vPosition = position;
      vUv = uv;

      // Calculate world position for lighting
      vec4 worldPosition = modelViewMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;

      // Standard vertex transformation
      gl_Position = projectionMatrix * worldPosition;
    }
  `,

  /**
   * Fragment shader
   *
   * Implements damage effects:
   * 1. Base color darkening (pristine → damaged)
   * 2. Metalness reduction (shiny → dull)
   * 3. Roughness increase (smooth → scratched)
   * 4. Dirt overlay at medium damage
   * 5. Bare metal exposure at high damage
   */
  fragmentShader: /* glsl */ `
    // Precision specification (mediump for mobile compatibility)
    precision mediump float;

    // Uniforms from material
    uniform vec3 baseColor;
    uniform float damageLevel;
    uniform float baseMetalness;
    uniform float baseRoughness;
    uniform vec3 dirtColor;
    uniform vec3 metalColor;
    uniform float time;

    // Varyings from vertex shader
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    // Simple noise function for scratch/dirt patterns
    // Source: https://www.shadertoy.com/view/4dS3Wd
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f); // Smoothstep interpolation

      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    void main() {
      // 1. Calculate damage effects based on damage level

      // Brightness reduction (100% → 60%)
      float brightnessFactor = 1.0 - damageLevel * 0.4;

      // Metalness reduction (shiny → dull)
      float currentMetalness = baseMetalness * (1.0 - damageLevel * 0.7);

      // Roughness increase (smooth → rough)
      float currentRoughness = min(1.0, baseRoughness + damageLevel * 0.6);

      // 2. Calculate scratch/dirt patterns using noise
      // Use world position for consistent noise across deformed geometry
      vec2 noiseCoord = vWorldPosition.xz * 5.0; // Scale noise
      float scratchPattern = noise(noiseCoord);
      float dirtPattern = noise(noiseCoord * 0.5); // Lower frequency for dirt

      // 3. Base color with brightness reduction
      vec3 finalColor = baseColor * brightnessFactor;

      // 4. Apply dirt overlay at medium-high damage (>40%)
      if (damageLevel > 0.4) {
        float dirtAmount = (damageLevel - 0.4) * 1.67; // 0 at 0.4, 1.0 at 1.0
        dirtAmount *= dirtPattern; // Modulate by noise pattern
        finalColor = mix(finalColor, dirtColor, dirtAmount * 0.4);
      }

      // 5. Expose bare metal at high damage (>70%)
      if (damageLevel > 0.7) {
        // Metal shows through at scratch locations
        float metalAmount = (damageLevel - 0.7) * 3.33; // 0 at 0.7, 1.0 at 1.0
        float scratchMask = step(0.7, scratchPattern); // Threshold for scratches
        finalColor = mix(finalColor, metalColor, scratchMask * metalAmount * 0.5);
      }

      // 6. Simple directional lighting (simulates Three.js default lighting)
      vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
      float diffuse = max(0.0, dot(vNormal, lightDir));

      // Ambient + diffuse lighting
      vec3 ambient = finalColor * 0.4;
      vec3 diffuseColor = finalColor * diffuse * 0.6;
      vec3 litColor = ambient + diffuseColor;

      // 7. Apply simple specular highlight (reduced by damage)
      vec3 viewDir = normalize(-vWorldPosition);
      vec3 halfDir = normalize(lightDir + viewDir);
      float specular = pow(max(0.0, dot(vNormal, halfDir)), 32.0);
      specular *= (1.0 - currentRoughness) * currentMetalness;
      litColor += vec3(1.0) * specular * 0.3;

      // Output final color
      gl_FragColor = vec4(litColor, 1.0);
    }
  `,
};

/**
 * Creates a damage material from a base MeshStandardMaterial.
 *
 * Converts standard material to custom damage shader material,
 * preserving original color and properties.
 *
 * @param baseMaterial - Original MeshStandardMaterial
 * @returns ShaderMaterial with damage effects
 */
export function createDamageMaterial(baseMaterial: THREE.MeshStandardMaterial): THREE.ShaderMaterial {
  const damageMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(DamageShader.uniforms),
    vertexShader: DamageShader.vertexShader,
    fragmentShader: DamageShader.fragmentShader,
    lights: false, // We handle lighting in shader
    transparent: baseMaterial.transparent,
    side: baseMaterial.side,
  });

  // Copy properties from base material
  damageMaterial.uniforms.baseColor.value.copy(baseMaterial.color);
  damageMaterial.uniforms.baseMetalness.value = baseMaterial.metalness ?? 0.5;
  damageMaterial.uniforms.baseRoughness.value = baseMaterial.roughness ?? 0.5;

  return damageMaterial;
}

/**
 * Updates damage level on a damage material.
 *
 * @param material - ShaderMaterial created with DamageShader
 * @param damageLevel - Damage level (0-1)
 */
export function updateDamageLevel(material: THREE.ShaderMaterial, damageLevel: number): void {
  if (material.uniforms.damageLevel) {
    material.uniforms.damageLevel.value = Math.max(0, Math.min(1, damageLevel));
  }
}
