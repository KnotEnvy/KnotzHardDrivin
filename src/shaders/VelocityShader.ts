/**
 * VelocityShader - Motion Vector Buffer for Motion Blur
 *
 * Renders screen-space velocity vectors by comparing current and previous
 * frame positions of objects. Used as input for motion blur effect.
 *
 * Performance: ~0.5ms (additional geometry pass)
 * - Minimal fragment shader (just stores velocity)
 * - Reuses existing geometry (no additional draw calls)
 * - Half-resolution velocity buffer for performance
 *
 * Usage:
 * ```typescript
 * const velocityPass = new ShaderPass(VelocityShader);
 * velocityPass.uniforms.prevModelViewProjectionMatrix.value = prevMVP;
 * velocityPass.uniforms.modelViewProjectionMatrix.value = currentMVP;
 * ```
 */

import { IUniform, Matrix4 } from 'three';

export const VelocityShader = {
  uniforms: {
    // Scene depth texture (from render pass)
    tDepth: { value: null } as IUniform,

    // Camera matrices for current frame
    projectionMatrix: { value: new Matrix4() } as IUniform,
    inverseProjectionMatrix: { value: new Matrix4() } as IUniform,

    // Camera matrices for previous frame
    prevProjectionMatrix: { value: new Matrix4() } as IUniform,
    prevViewMatrix: { value: new Matrix4() } as IUniform,
    currentViewMatrix: { value: new Matrix4() } as IUniform,

    // Camera clip planes
    cameraNear: { value: 0.1 } as IUniform,
    cameraFar: { value: 1000.0 } as IUniform,
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDepth;
    uniform mat4 projectionMatrix;
    uniform mat4 inverseProjectionMatrix;
    uniform mat4 prevProjectionMatrix;
    uniform mat4 prevViewMatrix;
    uniform mat4 currentViewMatrix;
    uniform float cameraNear;
    uniform float cameraFar;

    varying vec2 vUv;

    // Reconstruct world position from depth buffer
    vec3 getWorldPosition(float depth, vec2 uv) {
      // Convert to NDC coordinates
      vec4 ndc = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);

      // Transform to view space
      vec4 viewPos = inverseProjectionMatrix * ndc;
      viewPos /= viewPos.w;

      // Transform to world space
      vec4 worldPos = inverse(currentViewMatrix) * viewPos;
      return worldPos.xyz;
    }

    void main() {
      // Sample depth from depth buffer
      float depth = texture2D(tDepth, vUv).r;

      // Skip background pixels (depth = 1.0)
      if (depth >= 0.9999) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
      }

      // Reconstruct world position from depth
      vec3 worldPos = getWorldPosition(depth, vUv);

      // Transform to previous frame's clip space
      vec4 prevClipPos = prevProjectionMatrix * prevViewMatrix * vec4(worldPos, 1.0);
      prevClipPos /= prevClipPos.w;

      // Transform to current frame's clip space
      vec4 currentClipPos = projectionMatrix * currentViewMatrix * vec4(worldPos, 1.0);
      currentClipPos /= currentClipPos.w;

      // Calculate screen-space velocity (current - previous)
      vec2 velocity = (currentClipPos.xy - prevClipPos.xy) * 0.5;

      // Encode velocity in RG channels ([-1, 1] -> [0, 1])
      gl_FragColor = vec4(velocity * 0.5 + 0.5, 0.0, 1.0);
    }
  `,
};
