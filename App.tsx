import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
// import * as Notifications from 'expo-notifications';

import AppNavigator from './src/navigation/AppNavigator';
import MemberCardModal from './src/components/MemberCardModal';
import { MemberProvider } from './src/context/MemberContext';
import { ThemeProvider } from './src/context/ThemeContext'; // <--- IMPORT BARU
import { preloadAppAssets } from './src/utils/preloadAppAssets';

const MIN_SPLASH_MS = 500;
const MAX_PRELOAD_WAIT_MS = 700;

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    // Placeholder for notification setup
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const startMs = Date.now();

    const floatingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    floatingLoop.start();
    pulseLoop.start();

    const finishSplash = () => {
      if (!mounted) return;
      setShowSplash(false);
      floatingLoop.stop();
      pulseLoop.stop();
    };

    (async () => {
      try {
        await Promise.race([
          preloadAppAssets(),
          new Promise((resolve) => setTimeout(resolve, MAX_PRELOAD_WAIT_MS)),
        ]);
      } catch {
      } finally {
        const elapsed = Date.now() - startMs;
        const remaining = Math.max(MIN_SPLASH_MS - elapsed, 0);
        splashTimerRef.current = setTimeout(finishSplash, remaining);
      }
    })();

    return () => {
      mounted = false;
      if (splashTimerRef.current) {
        clearTimeout(splashTimerRef.current);
      }
      floatingLoop.stop();
      pulseLoop.stop();
    };
  }, [floatAnim, pulseAnim]);

  if (showSplash) {
    return (
      <View style={styles.splashRoot}>
        <Animated.View
          style={{
            transform: [{ translateY: floatAnim }, { scale: pulseAnim }],
          }}
        >
          <Image source={require('./assets/images/logo1.webp')} style={styles.splashLogo} resizeMode="contain" />
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      {/* WRAP APLIKASI DENGAN THEME PROVIDER DI SINI */}
      <ThemeProvider>
        <MemberProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
          <MemberCardModal />
        </MemberProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F0', // Splash screen tetap warna brand cream dulu
  },
  splashLogo: {
    width: 148,
    height: 148,
  },
});