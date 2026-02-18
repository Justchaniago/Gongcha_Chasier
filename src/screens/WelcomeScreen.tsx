import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Platform,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStaffAuth } from '../context/StaffAuthContext'; // Gunakan Context Staff

// Definisikan Tipe Navigasi Sederhana
type RootStackParamList = {
  Welcome: undefined;
  Login: undefined; // Login tidak butuh parameter step lagi
  MainApp: undefined;
};

type WelcomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const { staff, loading } = useStaffAuth(); // Cek status login dari context

  // 1. Auto-Redirect jika sudah login
  useEffect(() => {
    if (!loading && staff) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      });
    }
  }, [staff, loading, navigation]);

  // UI Variables
  const isCompact = width < 360;
  const logoSize = isCompact ? 120 : 150;
  const bottomPadding = insets.bottom + 40;

  // Handler Navigasi ke Login
  const handleGoToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background Image Full Screen */}
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={require('../../assets/images/welcome1.webp')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        {/* Gradient Overlay untuk keterbacaan teks */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Logo Section (Tengah Atas) */}
      <View style={[styles.contentContainer, { paddingTop: insets.top + 60 }]}>
        <Image
          source={require('../../assets/images/logo1.webp')} // Pastikan logo ada
          style={{ width: logoSize, height: logoSize, marginBottom: 20 }}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>Gong Cha POS</Text>
        <Text style={styles.subtitle}>Staff & Cashier Portal</Text>
      </View>

      {/* Bottom Section (Tombol Login) */}
      <View style={[styles.bottomContainer, { paddingBottom: bottomPadding }]}>
        <View style={styles.infoBadge}>
          <Text style={styles.infoText}>Authorized Access Only</Text>
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleGoToLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.loginButtonText}>LOGIN AS STAFF</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0 (Cashier Build)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backgroundImage: { width: '100%', height: '100%' },
  
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#E5E7EB',
    marginTop: 5,
    opacity: 0.9,
  },

  bottomContainer: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  infoBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  infoText: {
    color: '#F3F4F6',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  loginButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#B91C2F', // Warna Brand Gong Cha
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B91C2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },

  versionText: {
    color: '#6B7280',
    fontSize: 10,
  },
});