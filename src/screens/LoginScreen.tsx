// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, 
  ImageBackground, Image, TextInput, KeyboardAvoidingView, 
  Platform, Keyboard, ScrollView, Alert, ActivityIndicator, Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Eye, EyeOff, Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-react-native'; 
import { BlurView } from 'expo-blur'; // 🔥 THE GLASSMORPHISM MAGIC

// Import Auth Zustand
import { useCashierStore } from '../store/useCashierStore';

const { width, height } = Dimensions.get('window');

// 🎨 Definisi Warna dari Web Panel
const COLORS = {
  primary: '#4361EE',          // Biru Utama (Dari Web Panel)
  primaryLight: 'rgba(67, 97, 238, 0.1)',
  success: '#12B76A',          // Hijau Sukses
  error: '#C8102E',            // Merah Error
  errorLight: 'rgba(200, 16, 46, 0.1)',
  textPrimary: '#0F1117',      // Hitam Teks
  textSecondary: '#4A5065',    // Abu-abu Gelap
  textDisabled: '#9299B0',     // Abu-abu Terang (Placeholder)
  border: 'rgba(255,255,255,0.7)', // Border Kaca
  inputBgIdle: 'rgba(255, 255, 255, 0.5)', 
  inputBgFocus: '#FFFFFF',
  white: '#FFFFFF'
};

export default function LoginScreen() {
  const login = useCashierStore((state) => state.login);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  
  // State untuk fokus input (mengubah warna border & background seperti di web)
  const [focusE, setFocusE] = useState(false);
  const [focusP, setFocusP] = useState(false);

  // State untuk sukses login (animasi centang)
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async () => {
    setErrorMsg("");
    if (!email.trim() || !password.trim()) {
      return setErrorMsg('Email dan password wajib diisi.');
    }

    setLocalLoading(true);
    Keyboard.dismiss();

    try {
      await login(email.trim(), password);
      // Jika berhasil, munculkan state sukses sejenak sebelum Zustand memindahkan halaman
      setSuccess(true);
    } catch (e: any) {
      let msg = e.message;
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
        msg = 'Email atau password salah.';
      } else if (e.code === 'auth/invalid-email') {
        msg = 'Format email tidak valid.';
      }
      setErrorMsg(msg);
      setLocalLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <StatusBar style="light" /> 
        
        {/* 1. BACKGROUND GAMBAR FULL SCREEN */}
        <ImageBackground 
          // Sesuaikan nama file gambar dengan yang ada di asetmu
          source={require('../../assets/images/welcome1.webp')} 
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          {/* OVERLAY GELAP TIPIS (Agar background tidak mencolok) */}
          <View style={styles.darkOverlay} />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
            
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                
                {/* 2. KARTU LOGIN KACA (GLASSMORPHISM) */}
                <BlurView intensity={40} tint="light" style={styles.glassCard}>
                  
                  {/* HEADER & LOGO */}
                  <View style={styles.headerSection}>
                    <View style={styles.logoWrapper}>
                      <Image source={require('../../assets/images/logo1.webp')} style={styles.logoImage} resizeMode="cover" />
                    </View>
                    <Text style={styles.titleText}>
                      {success ? "Berhasil masuk!" : "Selamat Datang"}
                    </Text>
                    <Text style={styles.subtitleText}>
                      {success ? "Mengalihkan ke dashboard…" : "Masuk ke Aplikasi Gongcha App Cashier"}
                    </Text>
                  </View>

                  {/* FORM LOGIN ATAU STATE SUKSES */}
                  {!success ? (
                    <View style={styles.formContainer}>
                      
                      {/* INPUT EMAIL */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <View style={[
                          styles.inputWrapper,
                          { 
                            backgroundColor: focusE ? COLORS.inputBgFocus : COLORS.inputBgIdle,
                            borderColor: focusE ? COLORS.primary : COLORS.border,
                            borderWidth: focusE ? 1.5 : 1
                          }
                        ]}>
                          <Mail size={18} color={focusE ? COLORS.primary : COLORS.textDisabled} style={styles.inputIcon} />
                          <TextInput 
                            style={styles.textInput}
                            placeholder="kasir@gongcha.id"
                            placeholderTextColor={COLORS.textDisabled}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            onFocus={() => setFocusE(true)}
                            onBlur={() => setFocusE(false)}
                          />
                        </View>
                      </View>

                      {/* INPUT PASSWORD */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={[
                          styles.inputWrapper,
                          { 
                            backgroundColor: focusP ? COLORS.inputBgFocus : COLORS.inputBgIdle,
                            borderColor: focusP ? COLORS.primary : COLORS.border,
                            borderWidth: focusP ? 1.5 : 1
                          }
                        ]}>
                          <Lock size={18} color={focusP ? COLORS.primary : COLORS.textDisabled} style={styles.inputIcon} />
                          <TextInput 
                            style={styles.textInput}
                            placeholder="••••••••"
                            placeholderTextColor={COLORS.textDisabled}
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                            onFocus={() => setFocusP(true)}
                            onBlur={() => setFocusP(false)}
                          />
                          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                            {showPassword ? <EyeOff size={18} color={COLORS.textDisabled} /> : <Eye size={18} color={COLORS.textDisabled} />}
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* PESAN ERROR */}
                      {errorMsg ? (
                        <View style={styles.errorBox}>
                          <AlertCircle size={16} color={COLORS.error} style={{marginRight: 8, marginTop: 2}} />
                          <Text style={styles.errorText}>{errorMsg}</Text>
                        </View>
                      ) : null}

                      {/* TOMBOL SUBMIT */}
                      <TouchableOpacity 
                        style={[styles.submitBtn, { backgroundColor: localLoading ? COLORS.textDisabled : COLORS.primary }]} 
                        onPress={handleLogin} 
                        disabled={localLoading}
                        activeOpacity={0.8}
                      >
                        {localLoading ? (
                          <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <ActivityIndicator color={COLORS.white} style={{marginRight: 8}} />
                            <Text style={styles.submitBtnText}>Masuk...</Text>
                          </View>
                        ) : (
                          <Text style={styles.submitBtnText}>Masuk ke Akun</Text>
                        )}
                      </TouchableOpacity>

                    </View>
                  ) : (
                    // TAMPILAN SUKSES
                    <View style={styles.successStateContainer}>
                      <View style={styles.successCircle}>
                         <CheckCircle2 size={32} color={COLORS.white} />
                      </View>
                      <Text style={styles.successText}>Autentikasi berhasil!</Text>
                    </View>
                  )}

                </BlurView>

            </ScrollView>
          </KeyboardAvoidingView>

          {/* 3. FOOTER */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>© 2026 Gong Cha Indonesia. All rights reserved.</Text>
          </View>

        </ImageBackground>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, 
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.15)' },
  
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  
  glassCard: { 
    width: '100%', 
    maxWidth: 420, 
    alignSelf: 'center',
    borderRadius: 32, 
    paddingHorizontal: 32, 
    paddingVertical: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.65)', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.8)',
    overflow: 'hidden' // Penting untuk BlurView
  },

  headerSection: { alignItems: 'center', marginBottom: 32 },
  logoWrapper: { padding: 8, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  logoImage: { width: 48, height: 48, borderRadius: 12 },
  titleText: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5, marginBottom: 8 },
  subtitleText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', textAlign: 'center' },

  formContainer: { gap: 16 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 },
  
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    height: 52, 
    borderRadius: 14, 
    paddingHorizontal: 16
  },
  inputIcon: { marginRight: 12 },
  textInput: { flex: 1, height: '100%', fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  eyeBtn: { padding: 4 },

  errorBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, backgroundColor: 'rgba(255, 255, 255, 0.8)', borderWidth: 1, borderColor: COLORS.errorLight, borderRadius: 12, marginBottom: 4 },
  errorText: { flex: 1, fontSize: 13, color: COLORS.error, fontWeight: '600', lineHeight: 18 },

  submitBtn: { height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  successStateContainer: { alignItems: 'center', paddingVertical: 24 },
  successCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: COLORS.success, shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.3, shadowRadius: 24, elevation: 8 },
  successText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '700' },

  footerContainer: { position: 'absolute', bottom: 32, width: '100%', alignItems: 'center' },
  footerText: { fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', fontWeight: '500' }
});