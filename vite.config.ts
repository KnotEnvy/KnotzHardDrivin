import { defineConfig } from 'vite';

// Relative URLs support both a repository GitHub Pages URL and a custom domain.
export default defineConfig({
  base: './',
  server: {port:4200,open:false},
  build: {
    target:'es2022',
    sourcemap:false,
    rollupOptions:{output:{manualChunks(id){
      if(id.includes('@dimforge/rapier'))return 'physics';
      if(id.includes('/node_modules/three/'))return 'three';
    }}},
  },
});
