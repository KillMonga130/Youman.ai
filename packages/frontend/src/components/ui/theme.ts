/**
 * Youman.ai Design System - Cyberpunk Theme Configuration
 * Sci-Fi Theme with Glowing Effects
 */

export const colors = {
  // Primary - Cyan (cyberpunk glow)
  primary: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    950: '#083344',
  },
  // Gray - Cyberpunk Dark
  gray: {
    50: '#1a1a1a',
    100: '#2a2a2a',
    200: '#3a3a3a',
    300: '#4a4a4a',
    400: '#5a5a5a',
    500: '#6a6a6a',
    600: '#7a7a7a',
    700: '#8a8a8a',
    800: '#0a0a0a',
    900: '#050505',
    950: '#000000',
  },
  // Success - Green
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  // Warning - Amber
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  // Error - Red
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  // Accent - Bright Cyan/White (cyberpunk glow)
  accent: {
    50: '#ffffff',
    100: '#f0ffff',
    200: '#e0ffff',
    300: '#b0ffff',
    400: '#80ffff',
    500: '#00ffff',
    600: '#00e6e6',
    700: '#00cccc',
    800: '#00b3b3',
    900: '#009999',
    950: '#006666',
  },
  // Teal - Cyberpunk variant
  teal: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    950: '#083344',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: ['Orbitron', 'Rajdhani', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'Consolas', 'Monaco', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px - WCAG AAA minimum
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem',  // 60px
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
} as const;

export const spacing = {
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px - WCAG AAA touch target
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  DEFAULT: '0.375rem', // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
} as const;

// WCAG AAA Contrast Ratios
// Normal text: 7:1 minimum
// Large text (18px+ or 14px+ bold): 4.5:1 minimum
export const accessibility = {
  minTouchTarget: '44px', // WCAG AAA minimum touch target
  minFontSize: '16px',    // WCAG AAA minimum body text
  focusRingWidth: '3px',
  focusRingOffset: '2px',
} as const;

// Semantic color mappings for light/dark modes
export const semanticColors = {
  light: {
    background: colors.gray[50],
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    textPrimary: colors.gray[900],
    textSecondary: colors.gray[600],
    textMuted: colors.gray[500],
    border: colors.gray[200],
    borderFocus: colors.primary[500],
  },
  dark: {
    background: colors.gray[900],
    surface: colors.gray[800],
    surfaceElevated: colors.gray[700],
    textPrimary: colors.gray[100],
    textSecondary: colors.gray[300],
    textMuted: colors.gray[400],
    border: colors.gray[700],
    borderFocus: colors.primary[400],
  },
} as const;

export type ColorScale = typeof colors.primary;
export type ThemeColors = typeof colors;
export type SemanticColors = typeof semanticColors;
