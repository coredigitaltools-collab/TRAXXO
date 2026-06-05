export const BRAND = {
  name: 'TRAXXO',
  tagline: 'Business Management System',
  description: 'Complete business management system for retail, pharmacy, hardware, supermarket, and wholesale businesses.',
} as const;

export const COLORS = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  secondary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },
  accent: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
} as const;

export const TYPOGRAPHY = {
  fonts: {
    display: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'Fira Code', 'Courier New', monospace",
  },
  sizes: {
    xs: { size: '0.75rem', height: '1rem' },
    sm: { size: '0.875rem', height: '1.25rem' },
    base: { size: '1rem', height: '1.5rem' },
    lg: { size: '1.125rem', height: '1.75rem' },
    xl: { size: '1.25rem', height: '1.75rem' },
    '2xl': { size: '1.5rem', height: '2rem' },
    '3xl': { size: '1.875rem', height: '2.25rem' },
    '4xl': { size: '2.25rem', height: '2.5rem' },
    '5xl': { size: '3rem', height: '1' },
    '6xl': { size: '3.75rem', height: '1' },
  },
  weights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  lineHeights: {
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
} as const;

export const SPACING = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '2.5rem',
  '3xl': '3rem',
  '4xl': '4rem',
} as const;

export const SHADOWS = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  elevation: '0 20px 40px -12px rgba(0, 0, 0, 0.15)',
} as const;

export const ANIMATIONS = {
  durations: {
    fast: 100,
    base: 150,
    slow: 200,
    slower: 300,
    slowest: 500,
  },
  easings: {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
  },
} as const;

export const LOGO_SVG = {
  icon: `
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 22h8l2-4h2l2 4h8L12 2zm0 6l4 8h-8l4-8z"/>
    </svg>
  `,
  full: `
    <svg viewBox="0 0 200 56" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M28 8L8 56h16l4-8h4l4 8h16L28 8zm0 12l8 16h-16l8-16z"/>
      <text x="60" y="44" font-family="Inter, sans-serif" font-size="32" font-weight="700" fill="currentColor">TRAXXO</text>
    </svg>
  `,
} as const;
