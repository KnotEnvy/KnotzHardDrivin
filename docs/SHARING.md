# Sharing Pacific Run — October 7, 2026

The publishing branch is master. Pushes to master run the pinned GitHub Actions workflow in .github/workflows/pages.yml: a clean npm install, all serial regression tests, the optimized production build, and a Chromium check under /KnotzHardDrivin/. Only a successful build can deploy to the github-pages environment. Pull requests run the same checks without publishing. The workflow can also be run manually from Actions.

The game URL is https://knotenvy.github.io/KnotzHardDrivin/. GitHub Pages must use GitHub Actions as its publishing source. The workflow publishes dist, including the shared images produced by the lossless asset optimizer. Relative Vite URLs support this repository path and a future custom domain.

For local development, run npm ci and npm run dev. To check a production build, run npm run build, then npm run verify:performance-build. The verifier starts its own temporary server. For tests, run node node_modules/vitest/vitest.mjs run --maxWorkers=1. CI uses Node 24 and a software WebGL browser; Windows smoke checks use D3D11. CI validates functionality, not GPU performance.

The repository contains the game source, tests, original runtime assets, asset-generation scripts and project documentation. Generated dist, local artifact galleries, videos, Blender outputs, dependency/cache folders and recordings are ignored. Existing artifacts remain available locally; they are not included in the Pages website. The old unused oval Track, track configuration and texture helpers are archived locally under artifacts/legacy-oval and removed from the active source tree. Historical development decisions and scores remain in docs.

Publishing the game does not establish low-end PC compatibility or close the existing overall review gate. High preserves the authored presentation, Balanced remains the default, and Auto/Performance are available in settings. See PERFORMANCE_PASS.md for the measured limits.

Deployment uses [GitHub's Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
