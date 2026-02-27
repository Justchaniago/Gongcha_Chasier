// App.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// 🔥 IMPORT LAYAR BARU & ZUSTAND
import { preloadAppAssets } from './src/utils/preloadAppAssets';
import { useCashierStore } from './src/store/useCashierStore';
import LoginScreen from './src/screens/LoginScreen';
import CashierDashboard from './src/screens/CashierDashboard';

const MIN_SPLASH_MS = 500;
const MAX_PRELOAD_WAIT_MS = 700;

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔥 ZUSTAND FIREBASE LISTENER (Pengganti StaffAuthProvider)
  const { isAuthenticated, isLoadingAuth, initializeAuth } = useCashierStore();

  useEffect(() => {
    // Jalankan listener Firebase saat aplikasi dibuka
    initializeAuth();
  }, []);

  // Animasi Splash Screen (Dibiarkan 100% utuh sesuai desainmu)
  useEffect(() => {
    let mounted = true;
    const startMs = Date.now();

    const floatingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
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
      } catch {} 
      finally {
        const elapsed = Date.now() - startMs;
        const remaining = Math.max(MIN_SPLASH_MS - elapsed, 0);
        splashTimerRef.current = setTimeout(finishSplash, remaining);
      }
    })();

    return () => {
      mounted = false;
      if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
      floatingLoop.stop();
      pulseLoop.stop();
    };
  }, [floatAnim, pulseAnim]);

  // 1. Tampilkan Animasi Splash Bawaanmu
  if (showSplash) {
    return (
      <View style={styles.splashRoot}>
        <Animated.View style={{ transform: [{ translateY: floatAnim }, { scale: pulseAnim }] }}>
          <Image source={require('./assets/images/logo1.webp')} style={styles.splashLogo} resizeMode="contain" />
        </Animated.View>
      </View>
    );
  }

  // 2. Tampilkan Layar Transisi Halus (Sambil Menunggu Balasan Server Firebase)
  if (isLoadingAuth) {
    return (
      <View style={[styles.splashRoot, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#B91C2F" />
      </View>
    );
  }

  // 3. THE MAGIC GATE: Sudah Login? Masuk Dashboard Utama. Belum? Balik ke Layar Login.
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {isAuthenticated ? <CashierDashboard /> : <LoginScreen />}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8F0' },
  splashLogo: { width: 148, height: 148 },
});