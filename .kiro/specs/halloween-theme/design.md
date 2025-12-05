# Halloween Theme Design - Technical Specification

## Component Architecture

### 1. Halloween Components (`/components/Halloween/`)

#### GhostParticles
```typescript
interface GhostParticlesProps {
  count?: number;        // Number of floating ghosts
  className?: string;
}
```
- Floating ghost emoji particles
- CSS animation-based (GPU accelerated)
- Random positioning and timing
- Pointer-events: none (non-interactive)

#### GhostDetector
```typescript
interface GhostDetectorProps {
  score: number;         // 0-100 AI detection score
  className?: string;
}
```
- Circular progress gauge
- Dynamic icon (Sparkles/Ghost/Skull)
- Color-coded by score range
- Smooth transitions

#### SpellCircle
```typescript
interface SpellCircleProps {
  progress?: number;     // 0-100 transformation progress
  className?: string;
}
```
- Rotating outer pentagram circle
- Inner progress ring
- Center pulsing glow
- Continuous rotation animation

#### StatCard
```typescript
interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  iconColor?: string;
  className?: string;
}
```
- Tombstone-style card
- Hover effects (rise + glow)
- Icon with background
- Stat display

#### LoadingRitual
```typescript
interface LoadingRitualProps {
  message?: string;
  progress?: number;
}
```
- Spell circle with progress
- Random spooky messages
- Progress percentage display

### 2. Layout Updates

#### Header
- Logo: "The Necromancer's Quill" with Creepster font
- Tagline: "Resurrect AI text. Breathe life into the lifeless."
- Purple glow on hover
- Ghost particles in background

#### Sidebar
- Dark background with purple accents
- Glowing active states
- Smooth transitions
- Icon + label navigation

### 3. Page Layouts

#### Dashboard
```
┌─────────────────────────────────────┐
│  Ghost Particles Background         │
│  ┌───────────────────────────────┐  │
│  │  Stat Cards (4 columns)       │  │
│  │  💀 🧪 ⚡ 🌙                   │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Recent Resurrections         │  │
│  │  (Tombstone cards)            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

#### Editor (Resurrection Chamber)
```
┌─────────────────────────────────────┐
│  ┌──────────┐   ┌──────────┐       │
│  │ Cursed   │   │Resurrected│       │
│  │ Text     │   │   Text    │       │
│  │ (Red)    │   │  (Green)  │       │
│  └──────────┘   └──────────┘       │
│         ┌──────────┐                │
│         │  Spell   │                │
│         │  Circle  │                │
│         └──────────┘                │
│  ┌──────────────────────────────┐  │
│  │  Ghost Detector              │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Styling System

### Tailwind Extensions
- Custom colors (primary, accent, warning, error)
- Custom animations (float-ghost, pulse-glow, spell-circle, tombstone-rise)
- Custom shadows (glow-purple, glow-green, glow-red)
- Custom fonts (display, mono)

### CSS Custom Properties
```css
:root {
  --color-primary: #8b5cf6;
  --color-accent: #22c55e;
  --color-warning: #f97316;
  --color-error: #ef4444;
  --color-bg-primary: #0a0a0f;
  --color-bg-secondary: #13131a;
  --color-bg-card: #1a1a24;
  --shadow-glow-purple: 0 0 20px rgba(139, 92, 246, 0.5);
  --shadow-glow-green: 0 0 20px rgba(34, 197, 94, 0.5);
  --shadow-glow-red: 0 0 20px rgba(239, 68, 68, 0.5);
}
```

### Component Classes
- `.btn-resurrection` - Primary action button with glow
- `.panel-cursed` - Red-glowing AI input panel
- `.panel-resurrected` - Green-glowing human output panel
- `.stat-card` - Tombstone-style stat display
- `.card-tombstone` - Animated rising card
- `.ghost-particle` - Floating ghost animation
- `.text-glow-purple/green/red` - Glowing text effects
- `.font-necromancer` - Display font for headers

## Animation Specifications

### Float Ghost
```css
@keyframes floatGhost {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}
```
- Duration: 3s
- Easing: ease-in-out
- Infinite loop

### Pulse Glow
```css
@keyframes pulseGlow {
  0%, 100% { text-shadow: 0 0 20px rgba(139, 92, 246, 0.8); }
  50% { text-shadow: 0 0 30px rgba(124, 58, 237, 1); }
}
```
- Duration: 2s
- Easing: ease-in-out
- Infinite loop

### Spell Circle
```css
@keyframes spellCircle {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```
- Duration: 20s
- Easing: linear
- Infinite loop

### Tombstone Rise
```css
@keyframes tombstoneRise {
  from { 
    transform: translateY(100px) scale(0.8);
    opacity: 0;
  }
  to { 
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
```
- Duration: 0.6s
- Easing: ease-out
- Once on mount

## State Management

### Theme Context
```typescript
interface HalloweenThemeContext {
  particlesEnabled: boolean;
  glowEffectsEnabled: boolean;
  animationsEnabled: boolean;
  toggleParticles: () => void;
  toggleGlowEffects: () => void;
  toggleAnimations: () => void;
}
```

### Accessibility Preferences
- Respect `prefers-reduced-motion`
- Disable particles if requested
- Reduce glow intensity
- Simplify animations

## Integration Points

### Existing Components
- Update Button component with `.btn-resurrection` variant
- Update Card component with `.card-tombstone` variant
- Update Spinner with LoadingRitual
- Update Progress with SpellCircle

### New Routes
- `/dashboard` - Resurrection Chamber stats
- `/editor` - Main humanization interface
- `/graveyard` - History view
- `/spellbook` - Templates
- `/potion-lab` - A/B testing

## Testing Strategy

### Visual Regression
- Screenshot tests for all Halloween components
- Dark theme consistency
- Animation states

### Accessibility
- Keyboard navigation
- Screen reader compatibility
- Color contrast validation
- Focus indicators

### Performance
- Animation frame rate (60fps target)
- Particle count optimization
- Glow effect performance
- Initial load time

## Deployment Checklist
- [ ] All Halloween components created
- [ ] Tailwind config updated
- [ ] CSS animations added
- [ ] Fonts loaded (Creepster, Courier Prime)
- [ ] Accessibility tested
- [ ] Performance optimized
- [ ] Mobile responsive
- [ ] Browser compatibility verified
