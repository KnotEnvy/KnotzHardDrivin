# Gemini Code Assistant Context

## Project Overview

This project is a modern, browser-based remake of the classic arcade racer "Hard Drivin'". It aims to deliver a realistic driving experience with cinematic crash replays, a ghost opponent, and high-performance 60fps graphics.

The application is built as a single-page web application using TypeScript and a modern development stack.

**Key Technologies:**

*   **Game Engine:** Custom-built using Three.js for 3D rendering and Rapier.js for physics simulation.
*   **Language:** TypeScript
*   **Build Tool:** Vite
*   **Testing:** Vitest for unit tests and Playwright for end-to-end testing.
*   **Audio:** Howler.js
*   **Code Style:** ESLint and Prettier

**Architecture:**

The codebase is structured around a central `GameEngine` class (`src/core/GameEngine.ts`) that manages the main game loop, state, and interactions between various systems. Key architectural components include:

*   **ECS-like Structure:** The project uses an architecture similar to Entity-Component-System (ECS), with:
    *   **Entities:** Game objects like `Vehicle`, `Track`, and `Obstacle` (`src/entities/`).
    *   **Components:** Data containers like `TransformComponent` and `RigidBodyComponent` (`src/components/`).
    *   **Systems:** Logic controllers like `CameraSystem`, `InputSystem`, and `ReplaySystem` (`src/systems/`).
*   **State Management:** A state machine (`src/core/StateManager.ts`) manages the overall game state (e.g., `LOADING`, `PLAYING`, `PAUSED`, `CRASH`).
*   **Configuration:** Game parameters are managed through dedicated configuration files (`src/config/`).

## Building and Running

### Prerequisites

*   Node.js and npm

### Installation

```bash
npm install
```

### Development

To run the local development server with hot-reloading:

```bash
npm run dev
```

The application will be available at `http://localhost:4200`.

### Building for Production

To create an optimized production build in the `dist/` directory:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Testing

### Unit & Integration Tests

The project uses Vitest for unit and integration testing.

To run all tests:

```bash
npm run test
```

To run tests in watch mode:

```bash
npm run test -- --watch
```

To use the Vitest UI:

```bash
npm run test:ui
```

### End-to-End (E2E) Tests

E2E tests are handled by Playwright. These tests simulate user interaction in a real browser environment. The game engine instance is exposed on the `window` object (`window.gameEngine`) to facilitate E2E test automation.

To run E2E tests:

```bash
npm run test:e2e
```

## Development Conventions

*   **Code Style:** Code is automatically formatted with Prettier and linted with ESLint. Run `npm run format` and `npm run lint` before committing.
*   **Type Checking:** Ensure there are no TypeScript errors by running `npm run type-check`.
*   **Modularity:** Follow the existing ECS-like structure. Create new entities, components, and systems in their respective directories.
*   **Imports:** Use the configured path aliases (e.g., `@/core`, `@/entities`) for cleaner imports.
*   **Performance:** Be mindful of performance. The project includes a performance monitor (`src/utils/PerformanceMonitor.ts`) to help track FPS and other metrics.
*   **Documentation:** The `__DOCS__` directory contains extensive project documentation, including roadmaps, design documents, and completion reports. Refer to these for context on past and future work.
