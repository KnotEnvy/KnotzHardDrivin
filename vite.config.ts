import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
resolve: {
    alias: {
    '@': resolve(__dirname, 'src'),
    '@core': resolve(__dirname, 'src/core'),
    '@entities': resolve(__dirname, 'src/entities'),
    '@systems': resolve(__dirname, 'src/systems'),
    },
},
server: {
    port: 4200,
    open: true,
},
build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
    output: {
        manualChunks: {
        'three': ['three'],
        'rapier': ['@dimforge/rapier3d-compat'],
        },
    },
    },
},
});