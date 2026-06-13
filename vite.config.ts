import { defineConfig } from 'vite';

// Rapier ships as `@dimforge/rapier3d-compat`: the WASM is embedded as base64
// inside the JS bundle, so no wasm loader plugin or special config is required.
export default defineConfig({
  server: {
    port: 4200,
    open: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 1500, // three + rapier are large; this is expected
  },
});
