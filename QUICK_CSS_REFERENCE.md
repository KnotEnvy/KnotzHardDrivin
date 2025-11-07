# Hard Drivin' - Quick CSS Reference Card

Quick lookup guide for developers working with the UI/UX system.

---

## Color Palette (Copy-Paste Ready)

### Primary Colors
```css
--color-primary: #00ff88;        /* Neon Green - Main accent */
--color-primary-dark: #00cc6a;   /* Green - Darker variant */
--color-primary-light: #00ffaa;  /* Green - Lighter variant */
```

### Secondary Colors
```css
--color-secondary: #ff0055;      /* Neon Pink */
--color-secondary-dark: #cc0044;

--color-accent-cyan: #00ffff;    /* Retro Arcade */
--color-accent-orange: #ff6b35;  /* Warning/Boost */
```

### Backgrounds
```css
--color-bg-dark: #0a0a14;        /* Main background */
--color-bg-darker: #050509;      /* Darker background */
--color-bg-card: #1a1a2e;        /* Card background */
--color-bg-overlay: #16213e;     /* Overlay background */
```

### Status Colors
```css
--color-success: #00ff88;        /* Success - Green */
--color-warning: #ffaa00;        /* Warning - Orange */
--color-danger: #ff0055;         /* Danger - Pink */
--color-info: #00ffff;           /* Info - Cyan */
```

---

## CSS Variables (All Available)

### Sizing
```css
--spacing-xs: 0.25rem;    /* 4px */
--spacing-sm: 0.5rem;     /* 8px */
--spacing-md: 1rem;       /* 16px */
--spacing-lg: 1.5rem;     /* 24px */
--spacing-xl: 2rem;       /* 32px */
--spacing-2xl: 3rem;      /* 48px */
--spacing-3xl: 4rem;      /* 64px */

--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
```

### Typography
```css
--font-family-primary: system fonts
--font-family-mono: Courier New
--font-family-display: Orbitron

--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.5rem;     /* 24px */
--font-size-2xl: 2rem;      /* 32px */
--font-size-3xl: 3rem;      /* 48px */
--font-size-4xl: 4rem;      /* 64px */

--font-weight-light: 300;
--font-weight-normal: 400;
--font-weight-semibold: 600;
--font-weight-bold: 700;
--font-weight-extrabold: 800;
```

### Transitions
```css
--transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 0.5s cubic-bezier(0.4, 0, 0.2, 1);
--transition-smooth: 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

## Button Classes

### Primary Button (Green Gradient)
```html
<button class="btn-primary">START RACE</button>
```

### Secondary Button (Green Outline)
```html
<button class="btn-secondary">LEADERBOARD</button>
```

### Danger Button (Red Outline)
```html
<button class="btn-danger">QUIT</button>
```

---

## Common Utility Classes

### Text Utilities
```css
.text-center           /* text-align: center */
.text-uppercase        /* text-transform: uppercase */
.text-mono             /* font-family: monospace */
.text-glow             /* Neon glow effect */
```

### Flexbox
```css
.flex                  /* display: flex */
.flex-col              /* flex-direction: column */
.flex-center           /* Center items */

.gap-sm, .gap-md, .gap-lg, .gap-xl
```

### Visibility
```css
.hidden                /* display: none */
.invisible             /* visibility: hidden */
.opacity-50            /* 50% transparency */
```

### Effects
```css
.bg-card               /* Card background with border */
.glow                  /* Neon glow effect */
.glow-intense          /* Stronger glow */
```

---

## Responsive Breakpoints

```css
/* Desktop - Full quality */
@media (max-width: 1920px) { }

/* Laptop - Optimized */
@media (max-width: 1366px) { }

/* Tablet landscape */
@media (max-width: 1024px) { }

/* Tablet portrait */
@media (max-width: 768px) { }

/* Mobile */
@media (max-width: 480px) { }

/* High DPI displays */
@media (min-resolution: 192dpi) { }

/* Accessibility: Reduced motion */
@media (prefers-reduced-motion: reduce) { }

/* Accessibility: High contrast */
@media (prefers-contrast: more) { }
```

---

## Animation Classes

### Panel Animations
```css
.panel-fade-in         /* Fade in */
.panel-fade-out        /* Fade out */
.panel-scale-in        /* Scale in with bounce */
.panel-slide-down      /* Slide down */
.panel-slide-up        /* Slide up */
```

### HUD Animations
```css
.speed-update-pulse    /* Speed number pulse */
.timer-update          /* Timer bounce */
.position-highlight    /* Position glow */
.damage-shake          /* Shake animation */
.damage-warning        /* Warning pulse */
.hud-element-glow      /* Continuous glow */
```

### Button Animations
```css
.btn-hover-lift        /* Lift on hover */
.btn-glow-pulse        /* Pulse glow */
.btn-press             /* Press effect */
```

### Loading Animations
```css
.spinner               /* Loading spinner */
.loading-dots          /* Loading dots */
.progress-bar-animated /* Progress animation */
```

---

## HUD Element IDs

Quick reference for HUD elements:

```html
<!-- Speedometer -->
<div id="speedometer">
  <div id="speed-value">150</div>
</div>

<!-- Lap Timer -->
<div id="lap-timer">
  <div id="timer-value">1:23.456</div>
  <div id="lap-count">LAP 1 / 3</div>
</div>

<!-- Position -->
<div id="position-display">
  <div id="position-value">1st</div>
</div>

<!-- Damage -->
<div id="damage-indicator">
  <div id="damage-bar">
    <div id="damage-fill"></div>
  </div>
</div>
```

---

## Menu IDs

```html
#main-menu              /* Main menu screen */
#car-selection          /* Car selection screen */
#pause-menu             /* Pause menu overlay */
#results-screen         /* Results screen */
#ui-container           /* Root UI container */
```

---

## Common Updates

### Update HUD
```typescript
ui.updateHUD({
  speed: 150,
  lapTime: '1:23.456',
  currentLap: 1,
  maxLaps: 3,
  position: 1,
  damage: 0.5
});
```

### Show Panel
```typescript
ui.showPanel(UIPanel.MAIN_MENU);
ui.showPanel(UIPanel.HUD);
ui.showPanel(UIPanel.PAUSE_MENU);
ui.showPanel(UIPanel.RESULTS);
```

### Show Results
```typescript
ui.showResults('1:23.456', {
  bestLap: '1:22.123',
  lapsCompleted: 3,
  crashes: 0,
  topSpeed: 280,
  averageSpeed: 140
});
```

---

## Theme Classes (Apply to Document Root)

```typescript
// Colorblind themes
document.documentElement.classList.add('theme-colorblind-deuteranopia');
document.documentElement.classList.add('theme-colorblind-protanopia');
document.documentElement.classList.add('theme-colorblind-tritanopia');
document.documentElement.classList.add('theme-colorblind-achromatopsia');

// Time of day
document.documentElement.classList.add('time-night');
document.documentElement.classList.add('time-dawn');
document.documentElement.classList.add('time-day');
document.documentElement.classList.add('time-dusk');

// Difficulty
document.documentElement.classList.add('difficulty-easy');
document.documentElement.classList.add('difficulty-medium');
document.documentElement.classList.add('difficulty-hard');
document.documentElement.classList.add('difficulty-expert');
```

---

## Animation Utilities

From `UIAnimations` object:

```typescript
UIAnimations.applyPanelAnimation(element, panelType);
UIAnimations.animateHUDUpdate(element, 'speed' | 'timer' | 'position');
UIAnimations.damageAnimation(element, damagePercent);
UIAnimations.buttonPressEffect(button);
UIAnimations.addButtonGlowPulse(button);
UIAnimations.removeButtonGlowPulse(button);
UIAnimations.showLoadingSpinner(true/false);
UIAnimations.animateNumberCounter(element, start, end, duration);
```

---

## Z-Index Scale

```css
--z-base: 1;                /* Base elements */
--z-dropdown: 100;          /* Dropdowns */
--z-sticky: 200;            /* Sticky elements */
--z-fixed: 300;             /* Fixed positioning */
--z-modal-backdrop: 400;    /* Modal backdrop */
--z-modal: 500;             /* Modal content */
--z-tooltip: 600;           /* Tooltips */
--z-notification: 700;      /* Notifications */
--z-hud: 1000;              /* HUD elements */
```

---

## Performance Tips

### DO:
- Use CSS transforms for animations
- Cache DOM element references
- Use CSS variables for theming
- Apply `will-change` strategically
- Batch DOM updates

### DON'T:
- Animate position/size (use transform instead)
- Create new elements frequently
- Use box-shadow in loops
- Apply effects to hidden elements
- Forget to clean up animations

---

## Responsive Text Size Example

```css
@media (max-width: 1920px) { :root { font-size: 16px; } }
@media (max-width: 1366px) { :root { font-size: 15px; } }
@media (max-width: 1024px) { :root { font-size: 14px; } }
@media (max-width: 768px)  { :root { font-size: 13px; } }
@media (max-width: 480px)  { :root { font-size: 12px; } }
```

All font sizes scale automatically with viewport!

---

## Accessibility Checklist

```
□ Color contrast 4.5:1 minimum
□ Focus indicators visible
□ Keyboard navigation works
□ prefers-reduced-motion respected
□ Screen reader compatible
□ Touch targets 44px minimum
□ No color-only information
□ Descriptive button/link text
```

---

## File Locations Quick Links

| File | Purpose | Location |
|------|---------|----------|
| Main CSS | Global styles | `/src/styles/main.css` |
| Animations | All animations | `/src/styles/animations.css` |
| Menus | Menu screens | `/src/styles/menus.css` |
| HUD | Game display | `/src/styles/hud.css` |
| Themes | Color system | `/src/styles/themes.css` |
| HTML | Entry point | `/index.html` |
| UISystem | Game UI class | `/src/systems/UISystem.ts` |

---

## Debugging Tips

### Check animation performance
```javascript
performance.mark('start');
// ... code ...
performance.mark('end');
performance.measure('name', 'start', 'end');
console.table(performance.getEntriesByType('measure'));
```

### Check element visibility
```javascript
console.log(window.getComputedStyle(element).display);
console.log(window.getComputedStyle(element).opacity);
console.log(window.getComputedStyle(element).zIndex);
```

### Test animations
```javascript
element.classList.add('panel-fade-in');
// Check in DevTools Animations panel
```

### Check CSS custom properties
```javascript
const styles = getComputedStyle(document.documentElement);
console.log(styles.getPropertyValue('--color-primary'));
```

---

## Common Issues & Quick Fixes

| Issue | Solution |
|-------|----------|
| Animation not playing | Check `prefers-reduced-motion` |
| Colors not applying | Check CSS cascade and specificity |
| Layout broken on mobile | Check breakpoint rules |
| HUD updates slow | Use cached element references |
| Buttons not clickable | Check `pointer-events` property |
| Text unreadable | Check contrast ratio |
| Animation jerky | Use `transform` instead of `position` |
| Memory leak | Remove animation listeners |

---

## Contact & Support

For questions about the UI system:
1. Check `UI_UX_POLISH_GUIDE.md` for detailed documentation
2. Review `UI_IMPLEMENTATION_CHECKLIST.md` for testing
3. Look at inline CSS comments
4. Check `src/systems/UISystem.ts` for implementation

---

**Last Updated**: November 6, 2024
**Version**: 1.0
**Status**: Production Ready

Keep this quick reference handy while developing!

🎨 **Happy styling!**
