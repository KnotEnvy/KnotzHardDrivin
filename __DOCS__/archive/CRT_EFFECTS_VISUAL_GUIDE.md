# CRT Effects Visual Guide

**Reference**: Understanding each post-processing effect

---

## Effect Breakdown

### 1. Chromatic Aberration

**What it does**: Separates RGB color channels, creating color fringing at screen edges

**Visual Effect**:
```
Normal:          With Chromatic Aberration:
████████         ██RG████GB██
████████   -->   ██RG████GB██
████████         ██RG████GB██

(R = Red shift outward, G = Green center, B = Blue shift inward)
```

**Parameters**:
- `chromaticAberration: 0.0` - No effect (pure colors)
- `chromaticAberration: 1.5` - Subtle separation (realistic CRT)
- `chromaticAberration: 3.0` - Strong separation (damaged CRT)

**When to use**:
- Subtle (0.8-1.5): Authentic retro feel without distraction
- Strong (2.0+): Intentionally "broken" aesthetic

---

### 2. Scanlines

**What it does**: Draws horizontal lines across the screen (CRT electron gun scan pattern)

**Visual Effect**:
```
Normal:          With Scanlines:
████████         ████████  (bright)
████████   -->   ▓▓▓▓▓▓▓▓  (dark line)
████████         ████████  (bright)
████████         ▓▓▓▓▓▓▓▓  (dark line)
```

**Parameters**:
- `scanlineCount: 400` - 400 scanlines (fine grain, realistic)
- `scanlineCount: 800` - 800 scanlines (very fine, HD CRT)
- `scanlineIntensity: 0.2` - Subtle darkening (20% darker)
- `scanlineIntensity: 0.5` - Strong darkening (50% darker)

**When to use**:
- Low intensity (0.1-0.3): Subtle texture without reducing brightness
- High intensity (0.4-0.6): Pronounced retro effect (may darken image)

---

### 3. Vignette

**What it does**: Darkens the corners of the screen (simulates CRT beam falloff)

**Visual Effect**:
```
Normal:          With Vignette:
████████████     ▓▓████████▓▓
████████████     ▓▓████████▓▓
████████████  -> ▓▓████████▓▓
████████████     ▓▓████████▓▓
████████████     ▓▓████████▓▓

(Corners gradually darker, center remains bright)
```

**Parameters**:
- `vignetteIntensity: 0.5` - Subtle corner darkening
- `vignetteIntensity: 1.0` - Strong corner darkening
- `vignetteFalloff: 0.5` - Gradual transition
- `vignetteFalloff: 2.0` - Sharp transition

**When to use**:
- Always recommended (0.5-0.8): Adds depth, focuses attention on center
- Strong (1.0+): Dramatic "tunnel vision" effect

---

### 4. Film Grain

**What it does**: Adds animated noise texture (analog video static)

**Visual Effect**:
```
Frame 1:         Frame 2:         Frame 3:
████.███   ->    ██.█████   ->    █████.██
██.█.███         ████.█.█         ███.█.██

(Dots = random noise pixels, animated per frame)
```

**Parameters**:
- `grainIntensity: 0.05` - Very subtle (barely visible)
- `grainIntensity: 0.1` - Moderate (visible texture)
- `grainIntensity: 0.2+` - Heavy (VHS tape aesthetic)

**When to use**:
- Subtle (0.03-0.08): Adds "life" without distraction
- Strong (0.1+): Intentionally degraded "found footage" look

---

### 5. Barrel Distortion

**What it does**: Curves the screen edges outward (CRT glass curvature)

**Visual Effect**:
```
Normal (flat):   With Distortion:
┌──────────┐     ╭──────────╮
│          │     │          │
│   MENU   │  -> │   MENU   │
│          │     │          │
└──────────┘     ╰──────────╯

(Edges bow outward, center remains straight)
```

**Parameters**:
- `distortion: 0.0` - Flat screen (LCD)
- `distortion: 0.1` - Slight curvature (modern CRT)
- `distortion: 0.2+` - Strong curvature (vintage CRT)

**When to use**:
- Subtle (0.05-0.15): Authentic CRT feel without disorientation
- Strong (0.2+): Exaggerated retro aesthetic

**Warning**: High distortion can cut off screen edges on ultra-wide displays

---

## Quality Preset Comparison

### Low Quality (Performance Mode)
```
Effect               | Value  | Visual Impact
---------------------|--------|---------------
Global Intensity     | 0.5    | All effects dimmed
Chromatic Aberration | 0.0    | Disabled
Scanlines            | 0.0    | Disabled
Vignette             | 0.5    | Subtle corner darkening ONLY
Film Grain           | 0.0    | Disabled
Barrel Distortion    | 0.0    | Disabled

Result: Minimal effect (vignette only), maximum performance
```

### Medium Quality (Balanced)
```
Effect               | Value  | Visual Impact
---------------------|--------|---------------
Global Intensity     | 0.7    | Moderate effects
Chromatic Aberration | 0.8    | Subtle color fringing
Scanlines            | 0.2    | Light horizontal lines
Vignette             | 0.6    | Moderate corner darkening
Film Grain           | 0.05   | Very subtle noise
Barrel Distortion    | 0.08   | Slight screen curvature

Result: Authentic retro look without performance hit
```

### High Quality (Maximum Effect)
```
Effect               | Value  | Visual Impact
---------------------|--------|---------------
Global Intensity     | 1.0    | Full strength effects
Chromatic Aberration | 1.5    | Noticeable color separation
Scanlines            | 0.3    | Visible scan pattern
Vignette             | 0.8    | Strong corner darkening
Film Grain           | 0.08   | Visible animated noise
Barrel Distortion    | 0.15   | Clear screen curvature

Result: Maximum retro arcade authenticity
```

---

## Visual Examples (ASCII Art Simulation)

### No Effects (Modern LCD)
```
╔════════════════════════════════════╗
║                                    ║
║        HARD DRIVIN'                ║
║                                    ║
║    [START RACE]                    ║
║    [SETTINGS]                      ║
║    [LEADERBOARD]                   ║
║                                    ║
╚════════════════════════════════════╝
```

### Low Quality (Vignette Only)
```
▓╔═══════════════════════════════╗▓
▓║                               ║▓
▓║       HARD DRIVIN'            ║▓
▓║                               ║▓
▓║   [START RACE]                ║▓
▓║   [SETTINGS]                  ║▓
▓║   [LEADERBOARD]               ║▓
▓║                               ║▓
▓╚═══════════════════════════════╝▓
```

### Medium Quality (Scanlines + Vignette + Slight Chromatic)
```
▓╔RG═════════════════════════GB══╗▓
▓║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║▓ <-- Scanline
▓║RG      HARD DRIVIN'       GB ║▓
▓║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║▓ <-- Scanline
▓║RG  [START RACE]           GB ║▓
▓║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║▓ <-- Scanline
▓║RG  [SETTINGS]             GB ║▓
▓║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║▓ <-- Scanline
▓╚RG═════════════════════════GB═╝▓
```

### High Quality (All Effects)
```
▓╭RG═════════════════════════GB═╮▓ <-- Curved top
▓│▓.▓▓.▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓.▓▓▓.▓▓│▓ <-- Scanline + Grain
▓│RG .    HARD DRIVIN'    .GB  │▓ <-- Chromatic + Grain
▓│▓▓▓▓.▓▓▓▓▓▓▓▓.▓▓▓▓▓▓▓▓▓▓.▓▓▓│▓ <-- Scanline + Grain
▓│RG  [START RACE].        GB  │▓
▓│▓▓.▓▓▓▓▓▓▓▓▓▓▓.▓▓▓▓▓▓▓▓▓▓▓.▓│▓ <-- Scanline + Grain
▓│RG  [SETTINGS]    .      GB  │▓
▓│▓▓▓▓▓.▓▓▓▓▓▓▓▓▓▓▓▓.▓▓▓▓▓▓▓▓▓│▓ <-- Scanline + Grain
▓╰RG═════════════════════════GB═╯▓ <-- Curved bottom
```

---

## Tuning Recommendations

### For Maximum Authenticity
```typescript
// Simulate a 1990s arcade CRT monitor
postProcessing.setQuality('medium');
postProcessing.setChromaticAberration(1.2);  // Slight lens distortion
postProcessing.setScanlineIntensity(0.25);   // Visible but not overbearing
postProcessing.setVignetteIntensity(0.7);    // Natural beam falloff
postProcessing.setGrainIntensity(0.06);      // Subtle analog noise
postProcessing.setDistortion(0.1);           // Slight screen curve
```

### For Modern "Neo-Retro" Look
```typescript
// Clean retro aesthetic with minimal degradation
postProcessing.setQuality('high');
postProcessing.setChromaticAberration(0.5);  // Minimal color separation
postProcessing.setScanlineIntensity(0.15);   // Very light scanlines
postProcessing.setVignetteIntensity(0.8);    // Strong focus on center
postProcessing.setGrainIntensity(0.03);      // Almost invisible grain
postProcessing.setDistortion(0.05);          // Very subtle curvature
```

### For "Damaged VHS Tape" Effect
```typescript
// Intentionally degraded aesthetic
postProcessing.setQuality('high');
postProcessing.setChromaticAberration(2.5);  // Strong color bleeding
postProcessing.setScanlineIntensity(0.4);    // Heavy scanlines
postProcessing.setVignetteIntensity(1.0);    // Dark corners
postProcessing.setGrainIntensity(0.15);      // Very visible noise
postProcessing.setDistortion(0.2);           // Pronounced curvature
```

---

## Performance vs. Visual Quality

### Impact by Effect (from highest to lowest cost)

1. **Chromatic Aberration** (~40% of shader cost)
   - Requires 3 texture samples (R, G, B at different UVs)
   - Most expensive effect, but most visually impactful

2. **Barrel Distortion** (~25% of shader cost)
   - UV coordinate transformation for every pixel
   - Adds math operations before all other effects

3. **Vignette** (~15% of shader cost)
   - Distance calculation + power function
   - Relatively cheap but effective

4. **Film Grain** (~10% of shader cost)
   - Random number generation per pixel
   - Animated (changes every frame)

5. **Scanlines** (~10% of shader cost)
   - Simple sin() calculation
   - Cheapest effect, but very visible

### Optimization Strategy

**If FPS drops below 60**:
1. Disable barrel distortion (`distortion: 0`)
2. Reduce chromatic aberration (`chromaticAberration: 0.5`)
3. Disable film grain (`grainIntensity: 0`)
4. Reduce scanline intensity (`scanlineIntensity: 0.1`)
5. Keep vignette (minimal cost, high impact)

---

## Accessibility Considerations

### Motion Sensitivity
- **Film Grain**: Animated noise may trigger motion sickness in sensitive users
- **Recommendation**: Provide option to disable grain while keeping other effects

### Visual Clarity
- **Scanlines**: Heavy scanlines can reduce text readability
- **Recommendation**: Lower scanline intensity on text-heavy screens (settings, leaderboard)

### Color Blindness
- **Chromatic Aberration**: RGB separation may confuse colorblind users
- **Recommendation**: Provide option to disable chromatic aberration independently

### Suggested Settings UI
```
[ ] Enable CRT Effects

Advanced:
  Chromatic Aberration: [====·····] 40%
  Scanlines:            [=======··] 70%
  Vignette:             [========·] 80%
  Film Grain:           [===······] 30%
  Screen Curvature:     [=====····] 50%

[Preset: Arcade Cabinet] [Preset: Modern] [Preset: Off]
```

---

**Author**: 3D Graphics & Rendering Specialist
**Last Updated**: November 8, 2025
