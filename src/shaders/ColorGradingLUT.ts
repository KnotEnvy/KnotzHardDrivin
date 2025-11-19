/**
 * ColorGradingLUT - 3D LUT Color Grading Shader
 *
 * Applies cinematic color grading using a 3D Look-Up Table texture.
 * Transforms colors for different visual styles (arcade, retro, noir, etc.)
 *
 * Performance: <0.5ms (single texture lookup)
 * - Uses 3D LUT texture (32x32x32)
 * - Trilinear interpolation for smooth gradients
 * - Minimal ALU operations
 *
 * LUT Format:
 * - 3D texture representing color transformation
 * - Input RGB maps to output RGB via table lookup
 * - Size: 32x32x32 (optimal quality/performance balance)
 *
 * Presets:
 * - Neutral: No change (identity LUT)
 * - Arcade: Vibrant, saturated colors
 * - Retro: Warm, desaturated, film-like
 * - Noir: High contrast, desaturated
 *
 * Usage:
 * ```typescript
 * const lutPass = new ShaderPass(ColorGradingLUT);
 * lutPass.uniforms.lut.value = arcadeLUT; // 3D texture
 * lutPass.uniforms.intensity.value = 1.0; // Blend strength
 * ```
 */

import { IUniform } from 'three';

export const ColorGradingLUT = {
  uniforms: {
    // Input scene texture
    tDiffuse: { value: null } as IUniform,

    // 3D LUT texture (32x32x32)
    lut: { value: null } as IUniform,

    // LUT intensity (0.0 = original, 1.0 = full LUT effect)
    intensity: { value: 1.0 } as IUniform,

    // LUT size (typically 32)
    lutSize: { value: 32.0 } as IUniform,
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
    uniform sampler3D lut; // 3D texture for LUT
    uniform float intensity;
    uniform float lutSize;

    varying vec2 vUv;

    void main() {
      // Sample original color
      vec4 originalColor = texture2D(tDiffuse, vUv);
      vec3 color = originalColor.rgb;

      // Skip LUT if intensity is zero
      if (intensity < 0.001) {
        gl_FragColor = originalColor;
        return;
      }

      // Transform color to LUT space [0, 1]
      // Scale to account for LUT size (avoid edge sampling)
      vec3 lutCoord = color * ((lutSize - 1.0) / lutSize) + 0.5 / lutSize;

      // Sample 3D LUT texture
      vec3 gradedColor = texture(lut, lutCoord).rgb;

      // Blend between original and graded color
      vec3 finalColor = mix(color, gradedColor, intensity);

      gl_FragColor = vec4(finalColor, originalColor.a);
    }
  `,
};

/**
 * Generate identity LUT (no color change)
 * Used as base for creating custom LUTs
 */
export function generateIdentityLUT(size: number = 32): Float32Array {
  const data = new Float32Array(size * size * size * 4);
  let i = 0;

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        data[i++] = r / (size - 1); // R
        data[i++] = g / (size - 1); // G
        data[i++] = b / (size - 1); // B
        data[i++] = 1.0;            // A
      }
    }
  }

  return data;
}

/**
 * Generate "Arcade" LUT - Vibrant, saturated colors
 */
export function generateArcadeLUT(size: number = 32): Float32Array {
  const data = generateIdentityLUT(size);
  const maxIndex = size - 1;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Increase saturation by 30%
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = luminance + (r - luminance) * 1.3;
    g = luminance + (g - luminance) * 1.3;
    b = luminance + (b - luminance) * 1.3;

    // Boost contrast slightly (S-curve)
    r = r < 0.5 ? r * r * 2.0 : 1.0 - (1.0 - r) * (1.0 - r) * 2.0;
    g = g < 0.5 ? g * g * 2.0 : 1.0 - (1.0 - g) * (1.0 - g) * 2.0;
    b = b < 0.5 ? b * b * 2.0 : 1.0 - (1.0 - b) * (1.0 - b) * 2.0;

    // Clamp to [0, 1]
    data[i] = Math.max(0.0, Math.min(1.0, r));
    data[i + 1] = Math.max(0.0, Math.min(1.0, g));
    data[i + 2] = Math.max(0.0, Math.min(1.0, b));
  }

  return data;
}

/**
 * Generate "Retro" LUT - Warm, slightly desaturated, film-like
 */
export function generateRetroLUT(size: number = 32): Float32Array {
  const data = generateIdentityLUT(size);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Desaturate by 20%
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = luminance + (r - luminance) * 0.8;
    g = luminance + (g - luminance) * 0.8;
    b = luminance + (b - luminance) * 0.8;

    // Warm tone shift (boost red, reduce blue)
    r *= 1.1;
    b *= 0.9;

    // Soft contrast (lift shadows, compress highlights)
    r = r * 0.9 + 0.05;
    g = g * 0.9 + 0.05;
    b = b * 0.9 + 0.05;

    // Clamp to [0, 1]
    data[i] = Math.max(0.0, Math.min(1.0, r));
    data[i + 1] = Math.max(0.0, Math.min(1.0, g));
    data[i + 2] = Math.max(0.0, Math.min(1.0, b));
  }

  return data;
}

/**
 * Generate "Noir" LUT - Desaturated, high contrast
 */
export function generateNoirLUT(size: number = 32): Float32Array {
  const data = generateIdentityLUT(size);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Convert to grayscale (preserve luminance)
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Boost contrast (S-curve)
    let contrast = luminance < 0.5
      ? luminance * luminance * 2.0
      : 1.0 - (1.0 - luminance) * (1.0 - luminance) * 2.0;

    // Further increase contrast
    contrast = (contrast - 0.5) * 1.5 + 0.5;

    // Clamp to [0, 1]
    const gray = Math.max(0.0, Math.min(1.0, contrast));
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  return data;
}
