import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

// ==========================================
// 1. DEFINISI WARNA (Langsung di sini)
// ==========================================

export const LIGHT_COLORS = {
  background: {
    primary: '#FFF8F0',
    secondary: '#FFFFFF',
    tertiary: '#FFF0E0',
    elevated: '#FFFAF5',
    overlay: '#F5EBE0',
    modal: '#FFFFFF',
    input: '#FFFFFF',
  },
  brand: {
    primary: '#B91C2F',
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
  bottomNav: { // Tambahan khusus untuk TabBar
    background: '#FFFFFF',
    backgroundTransparent: 'rgba(255, 255, 255, 0.95)',
    active: '#B91C2F',
    activeGlow: 'rgba(185, 28, 47, 0.1)',
    inactive: '#8C7B75',
    indicator: '#B91C2F',
    border: '#E0D6CC',
  }
};

export const DARK_COLORS = {
  background: {
    primary: '#1C1410',
    secondary: '#2A1F1A',
    tertiary: '#332820',
    elevated: '#3D3228',
    overlay: '#0F0C09',
    modal: '#2A1F1A',
    input: '#2A1F1A',
  },
  brand: {
    primary: '#FF6B6B',
    primaryHover: '#FF8787',
    primaryPressed: '#E85555',
    primaryDisabled: '#CC5555',
    accent: {
      gold: '#E6B87D',
      cream: '#F5DEB3',
      amber: '#FFB84D',
      brown: '#D4C4B0',
    },
  },
  text: {
    primary: '#F5EBE0',
    secondary: '#D4C4B0',
    tertiary: '#B09A80',
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
  bottomNav: { // Tambahan khusus untuk TabBar
    background: '#2A1F1A',
    backgroundTransparent: 'rgba(42, 31, 26, 0.95)',
    active: '#FF6B6B',
    activeGlow: 'rgba(255, 107, 107, 0.15)',
    inactive: '#7A6B5A',
    indicator: '#FF6B6B',
    border: '#4A3B2F',
  }
};

// ==========================================
// 2. CONTEXT & PROVIDER
// ==========================================

export type ThemeMode = 'light' | 'dark';
type ThemeOption = 'light' | 'dark' | 'system';
type ColorTheme = typeof LIGHT_COLORS;

interface ThemeContextType {
  theme: ThemeOption;
  activeMode: ThemeMode;
  colors: ColorTheme;
  setTheme: (theme: ThemeOption) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeOption>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('user_theme');
        if (storedTheme) {
          setThemeState(storedTheme as ThemeOption);
        }
      } catch (e) {
        console.log('Failed to load theme', e);
      } finally {
        setIsReady(true);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (newTheme: ThemeOption) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem('user_theme', newTheme);
    } catch (e) {
      console.log('Failed to save theme', e);
    }
  };

  const activeMode: ThemeMode = useMemo(() => {
    if (theme === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return theme;
  }, [theme, systemColorScheme]);

  // Fallback ke LIGHT_COLORS jika terjadi sesuatu yang aneh
  const colors = useMemo(() => {
    return activeMode === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  }, [activeMode]);

  const toggleTheme = () => {
    setTheme(activeMode === 'light' ? 'dark' : 'light');
  };

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={{ theme, activeMode, colors, setTheme, toggleTheme }}>
      {/* Update StatusBar sesuai mode */}
      <StatusBar style={activeMode === 'dark' ? 'light' : 'dark'} animated />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};