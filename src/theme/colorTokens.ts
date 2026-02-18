// src/theme/colorTokens.ts

// ============================================
// 1. LIGHT MODE COLORS (Current Design)
// ============================================
export const LIGHT_COLORS = {
  background: {
    primary: '#FFF8F0',        // Main screen background
    secondary: '#FFFFFF',      // Card backgrounds
    tertiary: '#FFF0E0',       // Subtle backgrounds
    elevated: '#FFFAF5',       // Elevated elements
    overlay: '#F5EBE0',        // Overlay backgrounds
    modal: '#FFFFFF',          // Modal backgrounds
    input: '#FFFFFF',          // Input field backgrounds
  },
  brand: {
    primary: '#B91C2F',        // Main Gong Cha red
    primaryHover: '#A01827',
    primaryPressed: '#8A1422',
    primaryDisabled: '#D4737F',
    accent: {
      gold: '#D4A853',
      cream: '#F5E6D3',
      amber: '#FFA726',
      brown: '#8C7B75',
    },
  },
  text: {
    primary: '#2A1F1F',
    secondary: '#8C7B75',
    tertiary: '#B09A80',
    disabled: '#D4C4B0',
    inverse: '#FFFFFF',
    link: '#B91C2F',
    error: '#D32F2F',
    success: '#388E3C',
  },
  border: {
    light: '#F3E9DC',
    default: '#E0D6CC',
    strong: '#D4C4B0',
    brand: '#B91C2F',
    error: '#D32F2F',
    focus: '#B91C2F',
  },
  surface: {
    card: '#FFFFFF',
    cardHover: '#FFFAF5',
    elevated: '#FFFAF5',
    interactive: '#FFF0E0',
  },
  overlay: {
    light: 'rgba(42, 31, 31, 0.4)',
    medium: 'rgba(42, 31, 31, 0.6)',
    heavy: 'rgba(42, 31, 31, 0.8)',
  },
  shadow: {
    color: 'rgba(0, 0, 0, 0.08)',
    colorStrong: 'rgba(0, 0, 0, 0.12)',
    brand: 'rgba(185, 28, 47, 0.15)',
    gold: 'rgba(212, 168, 83, 0.2)',
  },
  status: {
    success: '#4CAF50',
    warning: '#FFA726',
    error: '#D32F2F',
    info: '#42A5F5',
    successBg: '#E8F5E9',
    warningBg: '#FFF3E0',
    errorBg: '#FFEBEE',
    infoBg: '#E3F2FD',
  },
};

// ============================================
// 2. DARK MODE COLORS (Warm Brown Theme)
// ============================================
export const DARK_COLORS = {
  background: {
    primary: '#1C1410',        // Main screen (rich dark chocolate)
    secondary: '#2A1F1A',      // Cards (warm coffee brown)
    tertiary: '#332820',       // Subtle backgrounds
    elevated: '#3D3228',       // Elevated elements
    overlay: '#0F0C09',        // Deep overlay
    modal: '#2A1F1A',          // Modal backgrounds
    input: '#2A1F1A',          // Input field backgrounds
  },
  brand: {
    primary: '#FF6B6B',        // Main red (softer, warmer for dark mode)
    primaryHover: '#FF8787',
    primaryPressed: '#E85555',
    primaryDisabled: '#CC5555',
    accent: {
      gold: '#E6B87D',         // Warm gold
      cream: '#F5DEB3',        // Wheat/cream
      amber: '#FFB84D',        // Warm amber
      brown: '#D4C4B0',        // Light brown
    },
  },
  text: {
    primary: '#F5EBE0',        // Warm cream (easier on eyes than pure white)
    secondary: '#D4C4B0',      // Tan
    tertiary: '#B09A80',       // Muted tan
    disabled: '#7A6B5A',
    inverse: '#2A1F1A',
    link: '#FF8787',
    error: '#FF6B6B',
    success: '#66BB6A',
  },
  border: {
    light: '#3A2D23',
    default: '#4A3B2F',
    strong: '#5A4A3C',
    brand: '#FF6B6B',
    error: '#FF6B6B',
    focus: '#FF6B6B',
  },
  surface: {
    card: '#2A1F1A',
    cardHover: '#332820',
    elevated: '#3D3228',
    interactive: '#3A2D23',
  },
  overlay: {
    light: 'rgba(15, 12, 9, 0.5)',
    medium: 'rgba(15, 12, 9, 0.7)',
    heavy: 'rgba(15, 12, 9, 0.85)',
  },
  shadow: {
    color: 'rgba(0, 0, 0, 0.4)',
    colorStrong: 'rgba(0, 0, 0, 0.6)',
    brand: 'rgba(255, 107, 107, 0.25)',
    gold: 'rgba(230, 184, 125, 0.2)',
  },
  status: {
    success: '#66BB6A',
    warning: '#FFA726',
    error: '#FF6B6B',
    info: '#64B5F6',
    successBg: '#1F3520',
    warningBg: '#3A2818',
    errorBg: '#332118',
    infoBg: '#1A2838',
  },
};

// ============================================
// 3. TYPES & UTILS
// ============================================
export type ThemeMode = 'light' | 'dark';
export type ColorTheme = typeof LIGHT_COLORS;

// Helper to get color dynamically
export const getColor = (light: string, dark: string, mode: ThemeMode) => 
  mode === 'dark' ? dark : light;