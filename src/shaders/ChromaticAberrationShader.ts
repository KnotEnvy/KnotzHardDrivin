/**
 * ChromaticAberrationShader - Modern Lens Distortion Effect
 *
 * Separates RGB channels radially from screen center for cinematic lens aberration.
 * More subtle and modern than the CRT chromatic aberration.
 *
 * Performance: <0.3ms (3 texture samples)
 * - Radial distortion from center
 * - Vignette falloff (stronger at edges)
 * - Minimal ALU operations
 *
 * Use Cases:
 * - ULTRA quality only (subtle cinematic effect)
 * - High-speed moments (boost on acceleration)
 * - Crash cinematics (dramatic distortion)
 *
 * Usage:
 * ```typescript
 * const chromaPass = new ShaderPass(ChromaticAberrationShader);
 * chromaPass.uniforms.offset.value = 0.002; // Subtle
 * ```
 */

import { IUniform } from 'three';

export const ChromaticAberrationShader = {
  uniforms: {
    // Input scene texture
    tDiffuse: { value: null } as IUniform,

    // Aberration offset strength (0.001 - 0.005)
    offset: { value: 0.002 } as IUniform,

    // Vignette falloff (how quickly aberration increases from center)
    // Higher = aberration only at edges
    falloff: { value: 2.0 } as IUniform,
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float falloff;

    varying vec2 vUv;

    void main() {
      // Calculate distance from center
      vec2 centered = vUv - 0.5;
      float dist = length(centered);

      // Radial direction (normalized)
      vec2 direction = dist > 0.0 ? centered / dist : vec2(0.0);

      // Apply falloff (aberration increases with distance from center)
      float strength = pow(dist * 2.0, falloff);

      // Calculate channel offsets (red outward, blue inward, green centered)
      vec2 redOffset = direction * offset * strength;
      vec2 blueOffset = -direction * offset * strength;

      // Sample RGB channels separately
      float r = texture2D(tDiffuse, vUv + redOffset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv + blueOffset).b;

      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
};
