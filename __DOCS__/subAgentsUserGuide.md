# Claude Code Subagents - Usage Guide
## Hard Drivin' Remake Project

---

## 📋 Quick Start

### 1. Import the Subagents Configuration

```bash
# Save the subagents.json file to your project root
# Then reference it in your Claude Code session

claude-code --agents=subagents.json
```

### 2. Basic Agent Usage

```bash
# Talk to a specific agent
@physics-engineer "Implement the vehicle suspension system"

# Get architectural guidance
@architect "How should I structure the replay system?"

# Request code review
@architect "Review src/entities/Vehicle.ts for design issues"

# Get testing help
@test-engineer "Create unit tests for WaypointSystem.ts"
```

---

## 🎯 Agent Selection Matrix

### By Development Phase

| Phase | Primary Agents | Supporting Agents |
|-------|---------------|-------------------|
| **Phase 0: Setup** | `devops-specialist`, `architect` | `documentation-writer` |
| **Phase 1: Core Engine** | `architect`, `gameplay-designer` | `graphics-engineer`, `test-engineer` |
| **Phase 2: Vehicle Physics** | `physics-engineer`, `gameplay-designer` | `test-engineer`, `performance-optimizer` |
| **Phase 3: Track System** | `track-builder`, `physics-engineer` | `graphics-engineer`, `gameplay-designer` |
| **Phase 4: Crash/Replay** | `replay-specialist`, `physics-engineer` | `graphics-engineer`, `ui-specialist` |
| **Phase 5: Timing/Scoring** | `gameplay-designer`, `data-specialist` | `ui-specialist`, `test-engineer` |
| **Phase 6: Ghost AI** | `replay-specialist`, `data-specialist` | `graphics-engineer`, `gameplay-designer` |
| **Phase 7: UI/Audio** | `ui-specialist`, `audio-engineer` | `graphics-engineer`, `data-specialist` |
| **Phase 8: Testing/Polish** | `test-engineer`, `performance-optimizer` | `ALL agents for fixes` |

### By Task Type

| Task | Primary Agent | When to Use |
|------|--------------|-------------|
| **Architecture Design** | `architect` | New system design, refactoring, design patterns |
| **Physics Implementation** | `physics-engineer` | Vehicle dynamics, collisions, Rapier.js integration |
| **3D Graphics** | `graphics-engineer` | Scene setup, cameras, shaders, visual effects |
| **Gameplay Logic** | `gameplay-designer` | Game loop, FSM, input, progression systems |
| **Track Creation** | `track-builder` | Track geometry, splines, obstacles, minimap |
| **Replay Systems** | `replay-specialist` | Recording, playback, crash detection, ghost AI |
| **User Interface** | `ui-specialist` | Menus, HUD, results screen, settings |
| **Audio** | `audio-engineer` | Sound effects, music, 3D audio, Howler.js |
| **Data/Storage** | `data-specialist` | Leaderboards, stats, localStorage, serialization |
| **Testing** | `test-engineer` | Unit tests, E2E tests, test architecture |
| **Performance** | `performance-optimizer` | Profiling, optimization, LOD, memory leaks |
| **Deployment** | `devops-specialist` | Build config, CI/CD, deployment, asset optimization |
| **Documentation** | `documentation-writer` | README, API docs, tutorials, comments |

---

## 💡 Effective Prompting Strategies

### 1. Single Agent Tasks

**Basic Request:**
```
@physics-engineer "Implement the vehicle wheel raycast system using Rapier.js"
```

**Detailed Request with Context:**
```
@physics-engineer "Implement wheel raycasting in Vehicle.ts. 
Requirements:
- 4 wheels with independent suspension
- Each wheel should raycast down from chassis
- Apply suspension forces based on compression
- Handle situations where wheels are airborne
- Reference PhysicsConfig.ts for suspension parameters

Context: This is Phase 2A from roadmap.md. Vehicle chassis is already created as a rigid body."
```

**Best Practice:**
- Provide specific file names and line numbers when relevant
- Reference configuration files for parameters
- Mention which phase of development you're in
- Include any constraints or requirements

### 2. Multi-Agent Workflows

**Sequential Workflow (Design → Implement → Test):**
```
# Step 1: Architecture design
@architect "Design the replay system architecture. 
- How should frame recording work?
- What data structure for replay frames?
- How to integrate with crash detection?"

# Step 2: Implementation
@replay-specialist "Implement ReplaySystem.ts based on the architecture from @architect.
- Rolling 15-second buffer
- Frame interpolation for smooth playback
- Integration with CrashManager"

# Step 3: Testing
@test-engineer "Create unit tests for ReplaySystem.ts
- Test frame recording and buffer management
- Test playback and interpolation
- Test edge cases (buffer overflow, rapid crashes)"

# Step 4: Documentation
@documentation-writer "Document the replay system in docs/replay-system.md
- Explain frame recording
- Show example usage
- Document API"
```

**Parallel Workflow (Multiple agents working simultaneously):**
```
# These can be done in parallel during Phase 3:

@track-builder "Create Track.ts with spline-based geometry generation"

@physics-engineer "Create track collision mesh system in Track.ts"

@graphics-engineer "Implement track rendering with proper materials and textures"

@gameplay-designer "Implement WaypointSystem.ts for track progression"
```

### 3. Code Review Workflow

```
# After implementing a feature, get review
@architect "Review src/entities/Vehicle.ts
- Is the architecture sound?
- Are there any design pattern issues?
- How can this be made more maintainable?"

@performance-optimizer "Review src/entities/Vehicle.ts
- Any performance concerns?
- Memory allocation issues?
- Can this be optimized?"

@test-engineer "Review tests/unit/Vehicle.test.ts
- Is test coverage sufficient?
- Are we testing edge cases?
- Any missing scenarios?"
```

### 4. Debugging Workflow

```
# When you have a bug:

# Step 1: Describe the issue to the appropriate specialist
@physics-engineer "Bug: Vehicle flips randomly when landing from jumps.
Observed: Vehicle rotation becomes unstable after landing
Expected: Smooth landing and continued driving
Context: Happens most often on steep ramp landings at high speed
File: src/entities/Vehicle.ts, line 245 (suspension force application)"

# Step 2: If unclear which agent, ask architect
@architect "I have a bug where vehicles flip on landing. 
Which agent should I consult? Is this physics or gameplay logic?"

# Step 3: After fix, verify with performance optimizer
@performance-optimizer "Fixed the vehicle flipping bug in Vehicle.ts. 
Can you verify the fix doesn't hurt performance?"

# Step 4: Add regression test
@test-engineer "Create a test for the vehicle landing bug we just fixed"
```

### 5. Optimization Workflow

```
# Performance optimization process:

@performance-optimizer "Profile the game and identify bottlenecks"

# Based on findings, delegate to specialists:
@graphics-engineer "Optimize particle system - it's taking 8ms per frame"

@physics-engineer "Reduce physics calculation time - currently 6ms per frame"

@audio-engineer "Optimize audio mixing - reduce CPU usage"

# Verify improvements
@performance-optimizer "Verify optimizations achieved target frame time"
```

---

## 🔥 Advanced Techniques

### 1. Agent Collaboration Requests

**When agents need to work together:**
```
@replay-specialist "Implement replay recording, coordinate with:
- @physics-engineer for vehicle transform data
- @graphics-engineer for camera positions
- @data-specialist for compression and storage

Start by discussing data format with each agent."
```

### 2. Constraint-Based Development

**When you have specific constraints:**
```
@graphics-engineer "Create particle system with constraints:
- Must run at 60fps even with 500 particles
- Memory budget: <10MB
- No more than 3 draw calls
- Must work on integrated graphics

Reference performance-budget.md for details."
```

### 3. Learning from Agents

**Use agents as teachers:**
```
@physics-engineer "Explain how Rapier.js wheel raycasting works.
Include:
- Basic concept and physics theory
- Rapier.js API specifics
- Common pitfalls to avoid
- Example code snippet"
```

### 4. Architecture Discussions

**Before implementing complex features:**
```
@architect "I need to implement a replay system. Let's discuss:
1. Should replays be stored in memory or localStorage?
2. What's the best data structure for frame recording?
3. How should we handle replay playback during crashes?
4. What's the integration point with other systems?

Please provide a high-level architecture proposal."
```

### 5. Incremental Development

**Break down large tasks:**
```
@physics-engineer "Let's implement vehicle physics incrementally:

Session 1: Basic rigid body chassis
Session 2: Wheel raycasting system
Session 3: Suspension forces
Session 4: Drive forces and steering
Session 5: Tire grip and surface types
Session 6: Aerodynamics and downforce

Start with Session 1. After each session, we'll test before proceeding."
```

---

## 📖 Common Scenarios

### Scenario 1: Starting a New Phase

```
# Phase kickoff protocol:

@architect "We're starting Phase 3 (Track System). 
Please review:
- PRD.md sections 4.2 (Track System)
- roadmap.md Phase 3 tasks
- Provide a development order recommendation
- Identify any design decisions needed upfront"

@track-builder "Read Phase 3 requirements and create:
- Track.ts interface design
- Track data format (JSON schema)
- List any dependencies on other systems"

@test-engineer "Review Phase 3 testing criteria from roadmap.md
- Prepare test plan
- Identify what needs mocking
- Set up test fixtures"
```

### Scenario 2: Stuck on a Problem

```
# Escalation protocol:

# Try specialist first
@physics-engineer "Vehicle suspension is unstable - wheels vibrate rapidly"

# If not resolved, ask architect for design review
@architect "Physics engineer couldn't solve suspension vibration.
Possible design issue? Should we reconsider the approach?"

# Get performance perspective
@performance-optimizer "Could this be a performance issue causing instability?"

# Last resort: collaborative debugging
@architect @physics-engineer @performance-optimizer
"Team debug session: Vehicle suspension vibration issue
Let's collectively diagnose this problem."
```

### Scenario 3: Code Not Working as Expected

```
@test-engineer "WaypointSystem.ts is failing tests.
Test: 'should detect waypoint passage'
Error: 'Expected waypoint 1 to be current, got waypoint 0'
Code: src/systems/WaypointSystem.ts lines 45-60

Please help debug and fix."
```

### Scenario 4: Need to Refactor

```
@architect "Vehicle.ts has grown to 800 lines and is hard to maintain.
Propose a refactoring strategy to split it into smaller, focused classes.

Current responsibilities:
- Physics rigid body management
- Wheel raycasting
- Input handling
- Damage tracking
- Audio triggering"

# After getting proposal:
@physics-engineer "Implement the refactored vehicle physics classes based on @architect's proposal"
```

### Scenario 5: Preparing for Production

```
# Pre-deployment checklist:

@test-engineer "Run full test suite and generate coverage report"

@performance-optimizer "Run final performance audit:
- Check frame rates across all game states
- Memory leak detection
- Bundle size analysis"

@devops-specialist "Prepare production build:
- Optimize assets
- Configure environment variables
- Set up error tracking
- Prepare deployment"

@documentation-writer "Final documentation update:
- Update README with deployment info
- Finalize API docs
- Create release notes"
```

---

## 🎮 Project-Specific Agent Combinations

### Combination 1: Vehicle Feel Tuning
```
@physics-engineer @gameplay-designer
"Let's tune vehicle handling together:
- Physics: Adjust suspension stiffness, tire grip
- Gameplay: Tune steering sensitivity, acceleration curves
Goal: Arcade-fun but realistic feel"
```

### Combination 2: Replay Camera Polish
```
@replay-specialist @graphics-engineer
"Polish the replay camera:
- Replay: Ensure smooth playback with proper timing
- Graphics: Create cinematic camera movements
Goal: Dramatic crash replays that look great"
```

### Combination 3: Performance Optimization Sprint
```
@performance-optimizer @graphics-engineer @physics-engineer
"Optimization sprint to hit 60fps:
- Graphics: Reduce draw calls, optimize shaders
- Physics: Reduce substeps if possible
- Performance: Profile and prioritize optimizations
Goal: Stable 60fps on medium hardware"
```

### Combination 4: UI/UX Polish Pass
```
@ui-specialist @graphics-engineer @audio-engineer
"Polish pass on all UI:
- UI: Smooth animations, clear layouts
- Graphics: Particle effects on UI interactions
- Audio: UI sound effects for all interactions
Goal: Satisfying, juicy UI feel"
```

---

## ⚠️ Important Guidelines

### DO's ✅

- **Be specific** with file names, line numbers, and requirements
- **Reference documentation** (PRD.md, roadmap.md, phase descriptions)
- **Follow phase order** from roadmap.md
- **Request reviews** from architect for structural changes
- **Test incrementally** with test-engineer after each feature
- **Document as you go** with documentation-writer
- **Check collaboration field** in agent config before major changes
- **Ask for explanations** when learning new concepts

### DON'Ts ❌

- **Don't skip testing gates** between phases
- **Don't mix concerns** - use the right agent for the task
- **Don't ignore performance** - consult performance-optimizer early
- **Don't forget documentation** - update docs with each feature
- **Don't make architecture decisions** without consulting architect
- **Don't commit untested code** - run tests first
- **Don't optimize prematurely** - profile first, then optimize
- **Don't work in isolation** - leverage agent collaboration

---

## 🚀 Pro Tips

### Tip 1: Create Agent Workflows
Save common agent workflows as scripts or documentation for reuse.

### Tip 2: Use Agents for Learning
When stuck, ask agents to explain concepts before asking for implementation.

### Tip 3: Parallel Development
Use multiple terminal sessions to work with different agents simultaneously during parallel work phases.

### Tip 4: Context Loading
Start each session by having agents read relevant docs:
```
@physics-engineer "Read PRD.md section 4.1 (Vehicle Physics) and roadmap.md Phase 2A before we begin"
```

### Tip 5: Code Review Culture
Make @architect review a habit for any significant change - catch issues early.

### Tip 6: Performance Budget Awareness
Always mention performance budgets in requests:
```
@graphics-engineer "Create particle system - budget: 2ms per frame, 200 particles max"
```

### Tip 7: Incremental Testing
After each agent completes work:
```
@test-engineer "Quick smoke test for [feature] before I continue"
```

### Tip 8: Documentation Debt
Schedule regular documentation updates:
```
@documentation-writer "Update all docs that were affected by today's work"
```

---

## 📊 Agent Utilization Tracking

Keep track of which agents you use most - helps identify bottlenecks:

```
Week 1 (Phase 0-1):
- architect: 15 sessions
- devops-specialist: 10 sessions
- gameplay-designer: 8 sessions

Week 2 (Phase 2):
- physics-engineer: 20 sessions  [HEAVY USE - expected]
- gameplay-designer: 12 sessions
- test-engineer: 8 sessions
```

If an agent is overloaded, consider breaking down tasks more or working in smaller increments.

---

## 🆘 Troubleshooting

### Problem: Agent doesn't understand context
**Solution:** Provide more specific information:
```
❌ Bad: "@physics-engineer fix the vehicle"
✅ Good: "@physics-engineer The vehicle in src/entities/Vehicle.ts is 
flipping on landing (line 245, suspension force application). 
This happens after jumps >5m height at speeds >30 m/s. 
PhysicsConfig.ts has suspension settings."
```

### Problem: Conflicting advice from different agents
**Solution:** Escalate to architect:
```
@architect "@physics-engineer wants approach A, @gameplay-designer prefers approach B 
for vehicle input handling. Please make architectural decision."
```

### Problem: Agent suggesting code that doesn't match project style
**Solution:** Reference coding standards:
```
@graphics-engineer "Following our TypeScript strict mode standards in 
subagents.json, please revise the shader implementation"
```

### Problem: Need help choosing which agent to use
**Solution:** Ask architect:
```
@architect "I need to implement [feature]. Which agent(s) should I work with?"
```

---

## 📅 Phase-by-Phase Agent Usage Plan

### Phase 0: Project Setup (Week 1)
**Primary:** `devops-specialist`, `architect`
**Supporting:** `documentation-writer`

**Example Session:**
```
@devops-specialist "Set up project: package.json, tsconfig, vite config, ESLint"
@architect "Create folder structure and initial TypeScript interfaces"
@documentation-writer "Create initial README.md with setup instructions"
```

### Phase 1: Core Engine (Week 2)
**Primary:** `architect`, `gameplay-designer`, `graphics-engineer`
**Supporting:** `test-engineer`

**Example Session:**
```
@architect "Design GameEngine.ts and core loop architecture"
@gameplay-designer "Implement game loop with fixed timestep"
@graphics-engineer "Create SceneManager.ts and camera system"
@test-engineer "Set up testing infrastructure and write first tests"
```

### Phase 2: Vehicle Physics (Weeks 3-4)
**Primary:** `physics-engineer`, `gameplay-designer`
**Supporting:** `test-engineer`, `performance-optimizer`

**Example Session:**
```
@physics-engineer "Implement Vehicle.ts with Rapier.js integration"
@gameplay-designer "Create InputSystem.ts for vehicle controls"
@test-engineer "Unit tests for vehicle physics"
@performance-optimizer "Profile physics performance"
```

### Phase 3: Track System (Weeks 5-6)
**Primary:** `track-builder`, `physics-engineer`, `graphics-engineer`
**Supporting:** `gameplay-designer`

**Example Session:**
```
@track-builder "Create Track.ts with spline generation"
@physics-engineer "Generate track collision meshes"
@graphics-engineer "Implement track rendering and materials"
@gameplay-designer "Build WaypointSystem.ts"
```

### Phase 4: Crash/Replay (Weeks 7-8)
**Primary:** `replay-specialist`, `physics-engineer`, `graphics-engineer`
**Supporting:** `ui-specialist`

**Example Session:**
```
@replay-specialist "Implement ReplaySystem.ts with frame recording"
@physics-engineer "Add crash detection logic"
@graphics-engineer "Create cinematic replay camera"
@ui-specialist "Build replay UI controls"
```

### Phase 5: Timing/Scoring (Week 9)
**Primary:** `gameplay-designer`, `data-specialist`
**Supporting:** `ui-specialist`

**Example Session:**
```
@gameplay-designer "Implement TimerSystem.ts"
@data-specialist "Create LeaderboardSystem.ts with localStorage"
@ui-specialist "Display timer and leaderboard in UI"
```

### Phase 6: Ghost AI (Week 10)
**Primary:** `replay-specialist`, `data-specialist`
**Supporting:** `graphics-engineer`

**Example Session:**
```
@replay-specialist "Implement Ghost.ts playback system"
@data-specialist "Handle ghost data storage and compression"
@graphics-engineer "Create ghost shader and visual effects"
```

### Phase 7: UI/Audio (Weeks 11-12)
**Primary:** `ui-specialist`, `audio-engineer`
**Supporting:** `graphics-engineer`, `data-specialist`

**Example Session:**
```
@ui-specialist "Build all UI screens (menu, HUD, results)"
@audio-engineer "Implement AudioSystem.ts with Howler.js"
@graphics-engineer "Add particle effects and screen effects"
@data-specialist "Settings persistence"
```

### Phase 8: Testing/Polish (Weeks 13-14)
**Primary:** `test-engineer`, `performance-optimizer`
**Supporting:** ALL agents for bug fixes

**Example Session:**
```
@test-engineer "Full test suite execution and coverage report"
@performance-optimizer "Final optimization pass"
@devops-specialist "Production build and deployment"
@documentation-writer "Final documentation updates"
```

---

## 🎯 Success Metrics

Track your effectiveness with agents:

- **Code Quality:** Fewer bugs reported after code reviews with agents
- **Development Speed:** Completing phases on schedule
- **Test Coverage:** Maintaining >70% coverage with test-engineer
- **Performance:** Hitting 60fps target with performance-optimizer guidance
- **Documentation:** Up-to-date docs maintained by documentation-writer
- **Collaboration:** Smooth handoffs between specialized agents

---

## 📚 Additional Resources

- **PRD.md** - Complete product requirements
- **roadmap.md** - Detailed phase-by-phase development plan
- **subagents.json** - Agent configuration reference

---

**Last Updated:** October 4, 2025  
**Version:** 1.0  
**Status:** Ready for Use 🚀

---

**Remember:** These agents are here to help you build an amazing game. Use them strategically, communicate clearly, and don't hesitate to ask for help or explanations. Good luck building Hard Drivin'! 🏎️💨