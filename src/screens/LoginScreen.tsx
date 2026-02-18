import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  useWindowDimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Eye, EyeOff } from 'lucide-react-native'; 

// Import Auth Context Saja (Theme Context Dibuang)
import { useStaffAuth } from '../context/StaffAuthContext';

// 🎨 Definisi Warna Statis (Light Mode Only)
const COLORS = {
  background: '#FEFDFB',       // Putih Tulang
  modal: '#FFFFFF',            // Putih Bersih
  primary: '#B91C2F',          // Merah Gong Cha
  textPrimary: '#1F2937',      // Abu Gelap (Hampir Hitam)
  textSecondary: '#6B7280',    // Abu Sedang
  textDisabled: '#9CA3AF',     // Abu Terang
  border: '#E5E7EB',           // Garis Halus
  inputBg: '#F9FAFB',          // Abu Sangat Muda
  white: '#FFFFFF'
};

export default function LoginScreen() {
  const { login, loading: authLoading } = useStaffAuth();
  
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Responsive Layout Variables
  const isCompact = width < 360;
  const logoSize = isCompact ? 88 : 100;
  const sheetPadding = isCompact ? 18 : 24;
  const dynamicLogoTop = insets.top + (Platform.OS === 'ios' ? 12 : 8);
  const dynamicSheetBottomPadding = Math.max(insets.bottom + 16, 24);

  // State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  // Handle Login
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert('Gagal', 'Mohon isi Email dan Password');
    }

    setLocalLoading(true);
    Keyboard.dismiss();

    try {
      await login(email, password);
    } catch (e: any) {
      let msg = e.message;
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found') {
        msg = 'Email atau password salah.';
      } else if (e.code === 'auth/invalid-email') {
        msg = 'Format email tidak valid.';
      }
      Alert.alert('Login Gagal', msg);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: COLORS.background }]}>
        <StatusBar style="light" /> 
        
        {/* Background Image */}
        <Image 
          source={require('../../assets/images/welcome1.webp')} 
          style={[styles.backgroundImage, { width, height }]} 
          resizeMode="cover" 
        />
        {/* Gradient Overlay (Supaya teks logo terbaca) */}
        <LinearGradient 
          colors={['transparent', 'rgba(0,0,0,0.85)']} 
          style={[styles.gradientOverlay, { height: height * 0.6 }]} 
          pointerEvents="none" 
        />
        
        {/* Logo Section */}
        <View style={[styles.logoSection, { top: dynamicLogoTop }]}>
          <Image 
            source={require('../../assets/images/logo1.webp')} 
            style={{ width: logoSize, height: logoSize }} 
            resizeMode="contain" 
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* White Bottom Sheet */}
          <View style={[
            styles.bottomSheet, 
            { 
              padding: sheetPadding, 
              paddingTop: 12, 
              paddingBottom: dynamicSheetBottomPadding, 
              backgroundColor: COLORS.modal 
            }
          ]}> 
            
            {/* Drag Indicator (Garis kecil di atas sheet) */}
            <View style={styles.sheetHeader}>
              <View style={[styles.dragIndicator, { backgroundColor: COLORS.border }]} />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
              
              {/* Header Teks */}
              <View style={{ marginBottom: 20 }}>
                <Text style={[styles.header, { color: COLORS.textPrimary }]}>
                  Staff Login
                </Text>
                <Text style={[styles.subtext, { color: COLORS.textSecondary }]}>
                  Masuk menggunakan akun kasir
                </Text>
              </View>

              {/* --- INPUT EMAIL --- */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: COLORS.textSecondary }]}>Email</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: COLORS.inputBg, 
                    borderColor: COLORS.border,
                    color: COLORS.textPrimary
                  }]}
                  placeholder="kasir@gongcha.id"
                  placeholderTextColor={COLORS.textDisabled}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* --- INPUT PASSWORD --- */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: COLORS.textSecondary }]}>Password</Text>
                <View style={[styles.passwordContainer, { 
                  backgroundColor: COLORS.inputBg, 
                  borderColor: COLORS.border 
                }]}> 
                  <TextInput
                    style={[styles.passwordInput, { color: COLORS.textPrimary }]}
                    placeholder="••••••"
                    placeholderTextColor={COLORS.textDisabled}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ padding: 10 }}
                  >
                    {showPassword ? 
                      <EyeOff size={20} color={COLORS.textSecondary} /> : 
                      <Eye size={20} color={COLORS.textSecondary} />
                    }
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton, 
                  { 
                    backgroundColor: COLORS.primary,
                    opacity: (localLoading || authLoading) ? 0.7 : 1,
                    marginTop: 10
                  }
                ]}
                onPress={handleLogin}
                disabled={localLoading || authLoading}
              >
                {localLoading || authLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={[styles.primaryButtonText, { color: COLORS.white }]}>MASUK</Text>
                )}
              </TouchableOpacity>

              {/* Footer Info */}
              <View style={{marginTop: 24, alignItems: 'center'}}>
                 <Text style={{color: COLORS.textDisabled, fontSize: 10}}>
                    Authorized Staff Only • v1.0.0
                 </Text>
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, 
  backgroundImage: { position: 'absolute', top: 0, left: 0 },
  gradientOverlay: { position: 'absolute', bottom: 0, width: '100%' },
  logoSection: { position: 'absolute', alignSelf: 'center' },
  keyboardView: { flex: 1, justifyContent: 'flex-end' },
  
  bottomSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 40,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 20
  },
  sheetHeader: { alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
  sheetScrollContent: { paddingBottom: 12 },
  dragIndicator: { width: 40, height: 4, borderRadius: 2 },
  
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtext: { fontSize: 15 },
  
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 6, fontWeight: '600', marginLeft: 4 },
  input: {
    borderRadius: 14, borderWidth: 1, height: 52, paddingHorizontal: 16, fontSize: 16
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1, height: 52, paddingHorizontal: 4
  },
  passwordInput: {
    flex: 1, height: 50, paddingHorizontal: 12, fontSize: 16
  },
  
  primaryButton: { height: 52, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
});