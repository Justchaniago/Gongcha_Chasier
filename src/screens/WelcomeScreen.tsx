import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Platform,
  TextInput,
  Animated,
  Keyboard,
  Alert,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OtpVerificationSection from '../components/OtpVerificationSection';
import { AuthService } from '../services/AuthService';
import { firebaseAuth } from '../config/firebase';
import { getGreeting } from '../utils/greetingHelper';

// Tipe navigasi
type RootStackParamList = {
  Welcome: undefined;
  Login: { initialStep?: 'phone' | 'otp' }; // Update parameter
  MainApp: undefined;
};

type WelcomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

const WELCOME_KEYBOARD_SHIFT_MULTIPLIER = 1.0;
const OTP_AUTH_PASSWORD = 'GongCha@123';

export default function WelcomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const isCompact = width < 360;
  const logoSize = isCompact ? 104 : 120;
  const sheetPadding = isCompact ? 18 : 24;
  const sheetHiddenOffset = Math.max(400, height * 0.52);

  // State
  const [viewMode, setViewMode] = useState<'initial' | 'selection' | 'login_form' | 'login_otp' | 'signup_form' | 'signup_otp'>('initial');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loginOtp, setLoginOtp] = useState(['', '', '', '']);
  const [loginResendTimer, setLoginResendTimer] = useState(30);
  const [signupName, setSignupName] = useState('');
  const [signupDob, setSignupDob] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupOtp, setSignupOtp] = useState(['', '', '', '']);
  const [signupResendTimer, setSignupResendTimer] = useState(30);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authProgressMessage, setAuthProgressMessage] = useState('');
  
  // Animasi Values
  const getStartedOpacity = useRef(new Animated.Value(1)).current;
  const getStartedTranslateY = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(sheetHiddenOffset)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const keyboardShift = useRef(new Animated.Value(0)).current;
  const loginOtpRefs = useRef<Array<TextInput | null>>([null, null, null, null]);
  const loginTimerRef = useRef<NodeJS.Timeout | null>(null);
  const signupOtpRefs = useRef<Array<TextInput | null>>([null, null, null, null]);
  const signupTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  };

  const isOtpMode = viewMode === 'login_otp' || viewMode === 'signup_otp';
  // Turunkan posisi logo secara universal agar lebih aman di semua device
  const dynamicLogoTop = insets.top + (Platform.OS === 'ios' ? 60 : 40);
  const dynamicGetStartedBottom = Math.max(insets.bottom + 20, 32);
  const dynamicSheetBottomPadding = Math.max(insets.bottom + 16, 20) + (isOtpMode ? 12 : 0) + (isKeyboardVisible ? 18 : 0);

  const getDynamicLoginShift = (keyboardHeight: number) => {
    const isSmallScreen = height < 750;
    const isOtp = isOtpMode;
    const platformFactor = Platform.OS === 'ios'
      ? (isOtp ? 1.02 : 0.95)
      : (isOtp ? 0.84 : 0.76);
    const iosBonus = Platform.OS === 'ios' ? (isOtp ? 42 : 34) : 0;
    const rawShift = keyboardHeight * platformFactor - height * 0.14 + (isSmallScreen ? 24 : 10) + iosBonus;
    const minShift = isOtp ? 74 : 58;
    const maxShift = Platform.OS === 'ios'
      ? Math.min(height * (isOtp ? 0.44 : 0.39), isOtp ? 300 : 255)
      : Math.min(height * (isOtp ? 0.34 : 0.3), isOtp ? 210 : 180);
    return -clamp(rawShift * WELCOME_KEYBOARD_SHIFT_MULTIPLIER, minShift, maxShift);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp' }],
        });
      }
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      if (viewMode !== 'login_form' && viewMode !== 'login_otp' && viewMode !== 'signup_form' && viewMode !== 'signup_otp') return;
      setIsKeyboardVisible(true);
      const keyboardHeight = event.endCoordinates?.height ?? 0;
      const targetShift = getDynamicLoginShift(keyboardHeight);

      Animated.timing(keyboardShift, {
        toValue: targetShift,
        duration: Platform.OS === 'ios' ? 250 : 200,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      Animated.timing(keyboardShift, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? 250 : 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardShift, viewMode]);

  useEffect(() => {
    return () => {
      if (loginTimerRef.current) clearInterval(loginTimerRef.current);
      if (signupTimerRef.current) clearInterval(signupTimerRef.current);
    };
  }, []);

  // Handler: Tombol Get Started
  const handleGetStarted = () => {
    // Start the sheet animation and state change
    Animated.parallel([
      Animated.timing(getStartedOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(getStartedTranslateY, {
        toValue: -30,
        duration: 250,
        useNativeDriver: true,
      }),
      // Bottom Sheet slides up
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        friction: 9,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start();

    // Update state after a short delay to ensure animation starts
    setTimeout(() => {
      setViewMode('login_form');
    }, 50);
  };

  // Handler: Kembali ke state awal
  const handleBackToSelection = () => {
    Keyboard.dismiss();
    animateTransition(() => {
      setPhoneNumber('');
      setLoginOtp(['', '', '', '']);
      setLoginResendTimer(30);
      if (loginTimerRef.current) clearInterval(loginTimerRef.current);
      setSignupName('');
      setSignupDob('');
      setSignupPhone('');
      setSignupOtp(['', '', '', '']);
      setSignupResendTimer(30);
      if (signupTimerRef.current) clearInterval(signupTimerRef.current);
      Animated.parallel([
        Animated.timing(getStartedOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(getStartedTranslateY, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: sheetHiddenOffset, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        setViewMode('initial');
        sheetTranslateY.setValue(sheetHiddenOffset);
        getStartedOpacity.setValue(1);
        getStartedTranslateY.setValue(0);
      });
    });
  };

  // Handler: Tutup Sheet (Swipe Down simulasi)
  const handleCloseSheet = () => {
    Keyboard.dismiss();
    if (viewMode === 'login_form' || viewMode === 'login_otp' || viewMode === 'signup_form' || viewMode === 'signup_otp') {
      handleBackToSelection();
    } else {
      // Kembali ke state awal (Get Started)
      Animated.parallel([
        Animated.timing(getStartedOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(getStartedTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: sheetHiddenOffset, duration: 300, useNativeDriver: true }),
      ]).start(() => setViewMode('initial'));
    }
  };

  // Helper untuk transisi halus antar konten sheet
  const animateTransition = (callback: () => void) => {
    contentOpacity.stopAnimation();
    contentOpacity.setValue(1);
    requestAnimationFrame(() => {
      callback();
    });
  };

  const generateDemoOtp = () => `${Math.floor(1000 + Math.random() * 9000)}`;

  // Support alphanumeric untuk testing (e.g., "0812MASTER")
  const normalizePhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\s/g, ''); // Hapus spasi saja
    // Jika pure numeric, remove leading zeros
    if (/^\d+$/.test(cleaned)) {
      return cleaned.replace(/^0+/, '') || '8123456789';
    }
    // Jika ada huruf, keep as-is (untuk master account testing)
    return cleaned || '8123456789';
  };
  const mapPhoneToEmail = (phone: string) => `${normalizePhoneNumber(phone)}@gongcha-id.app`;

  // Handler: Submit Nomor HP -> Pindah ke LoginScreen (OTP)
  const handleGetOtp = () => {
    if (!phoneNumber.trim()) {
      setPhoneNumber('8123456789');
    }

    const otpCode = generateDemoOtp();
    Alert.alert('OTP Demo (Login)', `Kode OTP demo: ${otpCode}\nUntuk trial, isi sembarang 4 digit juga bisa.`);

    Keyboard.dismiss();
    setLoginOtp(['', '', '', '']);
    animateTransition(() => setViewMode('login_otp'));
    startLoginResendTimer();
    setTimeout(() => {
      loginOtpRefs.current[0]?.focus();
    }, 120);
  };

  const startLoginResendTimer = () => {
    startResendTimer(loginTimerRef, setLoginResendTimer);
  };

  const handleLoginOtpChange = (text: string, index: number) => {
    handleOtpDigitChange(text, index, loginOtp, setLoginOtp, loginOtpRefs);
  };

  const handleLoginOtpBack = () => {
    Keyboard.dismiss();
    if (loginTimerRef.current) clearInterval(loginTimerRef.current);
    animateTransition(() => setViewMode('login_form'));
  };

  const handleLoginOtpVerify = async () => {
    if (loginOtp.join('').length < 4) {
      Alert.alert('OTP belum lengkap', 'Masukkan 4 digit OTP untuk lanjut.');
      return;
    }

    const email = mapPhoneToEmail(phoneNumber);

    try {
      setIsAuthSubmitting(true);
      setAuthProgressMessage('Signing in securely...');
      await AuthService.login(email, OTP_AUTH_PASSWORD);
      setAuthProgressMessage('Loading your account...');
      navigation.navigate('MainApp');
    } catch (error: any) {
      const message = String(error?.message || 'Login gagal.');
      if (message.includes('timed out')) {
        Alert.alert('Koneksi bermasalah', 'Request ke Firebase terlalu lama. Cek internet, provider Auth, dan Firestore rules.');
        return;
      }
      if (message.includes('User profile not found') || message.includes('auth/invalid-credential')) {
        Alert.alert('Akun tidak ditemukan', 'Nomor ini belum terdaftar. Silakan Sign Up terlebih dahulu.');
        return;
      }
      if (message.includes('auth/network-request-failed')) {
        Alert.alert('Login gagal', 'Tidak bisa terhubung ke Firebase. Cek koneksi internet kamu.');
        return;
      }
      Alert.alert('Login gagal', message);
    } finally {
      setIsAuthSubmitting(false);
      setAuthProgressMessage('');
    }
  };

  const handleOpenSignUp = () => {
    Keyboard.dismiss();
    animateTransition(() => setViewMode('signup_form'));
  };

  const handleBackToLoginForm = () => {
    Keyboard.dismiss();
    animateTransition(() => setViewMode('login_form'));
  };

  const startSignupResendTimer = () => {
    startResendTimer(signupTimerRef, setSignupResendTimer);
  };

  const handleSignUpGetOtp = () => {
    if (!signupName.trim()) setSignupName('User Trial');
    if (!signupDob.trim()) setSignupDob('01/01/2000');
    if (!signupPhone.trim()) setSignupPhone('8123456789');

    const otpCode = generateDemoOtp();
    Alert.alert('OTP Demo (Sign Up)', `Kode OTP demo: ${otpCode}\nUntuk trial, isi sembarang 4 digit juga bisa.`);

    Keyboard.dismiss();
    setSignupOtp(['', '', '', '']);
    animateTransition(() => setViewMode('signup_otp'));
    startSignupResendTimer();
    setTimeout(() => {
      signupOtpRefs.current[0]?.focus();
    }, 120);
  };

  const handleSignupOtpChange = (text: string, index: number) => {
    handleOtpDigitChange(text, index, signupOtp, setSignupOtp, signupOtpRefs);
  };

  const handleSignupOtpBack = () => {
    Keyboard.dismiss();
    if (signupTimerRef.current) clearInterval(signupTimerRef.current);
    animateTransition(() => setViewMode('signup_form'));
  };

  const handleSignupOtpVerify = async () => {
    if (signupOtp.join('').length < 4) {
      Alert.alert('OTP belum lengkap', 'Masukkan 4 digit OTP untuk lanjut.');
      return;
    }

    const normalizedPhone = normalizePhoneNumber(signupPhone);
    const email = mapPhoneToEmail(normalizedPhone);
    const profileName = signupName.trim() || 'User Trial';

    try {
      setIsAuthSubmitting(true);
      setAuthProgressMessage('Creating account...');
      await AuthService.register(email, OTP_AUTH_PASSWORD, profileName, normalizedPhone);
      setAuthProgressMessage('Syncing your profile...');
      navigation.navigate('MainApp');
    } catch (error: any) {
      const message = String(error?.message || 'Registrasi gagal.');
      if (message.includes('timed out')) {
        Alert.alert('Koneksi bermasalah', 'Request ke Firebase terlalu lama. Cek internet, provider Auth, dan Firestore rules.');
        return;
      }
      if (message.includes('auth/email-already-in-use')) {
        try {
          setAuthProgressMessage('Account exists, signing in...');
          await AuthService.login(email, OTP_AUTH_PASSWORD);
          setAuthProgressMessage('Loading your account...');
          navigation.navigate('MainApp');
          return;
        } catch {
          Alert.alert('Registrasi gagal', 'Akun sudah ada tapi tidak bisa login. Coba lagi nanti.');
          return;
        }
      }
      if (message.includes('auth/operation-not-allowed')) {
        Alert.alert('Registrasi gagal', 'Email/Password belum diaktifkan di Firebase Authentication > Sign-in method.');
        return;
      }
      if (message.includes('auth/network-request-failed')) {
        Alert.alert('Registrasi gagal', 'Tidak bisa terhubung ke Firebase. Cek koneksi internet kamu.');
        return;
      }
      Alert.alert('Registrasi gagal', message);
    } finally {
      setIsAuthSubmitting(false);
      setAuthProgressMessage('');
    }
  };

  const handleLoginResend = () => {
    const otpCode = generateDemoOtp();
    Alert.alert('Resend OTP (Login)', `Kode OTP baru: ${otpCode}`);
    startLoginResendTimer();
  };

  const handleSignupResend = () => {
    const otpCode = generateDemoOtp();
    Alert.alert('Resend OTP (Sign Up)', `Kode OTP baru: ${otpCode}`);
    startSignupResendTimer();
  };

  const startResendTimer = (
    timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
    setTimer: React.Dispatch<React.SetStateAction<number>>,
  ) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(30);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpDigitChange = (
    text: string,
    index: number,
    otpState: string[],
    setOtpState: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<Array<TextInput | null>>,
  ) => {
    const digit = text.replace(/\D/g, '').slice(0, 1);
    const next = [...otpState];
    next[index] = digit;
    setOtpState(next);
    if (digit && index < 3) refs.current[index + 1]?.focus();
  };

  const handleDobChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, 8);

    if (digitsOnly.length <= 2) {
      setSignupDob(digitsOnly);
      return;
    }

    if (digitsOnly.length <= 4) {
      setSignupDob(`${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`);
      return;
    }

    setSignupDob(`${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4)}`);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        {/* Background Image - DYNAMIC FILL */}
        <View style={{ flex: 1, position: 'absolute', width: '100%', height: '100%' }}>
          <Image
            source={require('../../assets/images/welcome1.webp')}
            style={{ flex: 1, width: undefined, height: undefined }}
            resizeMode="cover"
          />
        </View>

      {/* Logo */}
      <View style={[styles.logoSection, { top: dynamicLogoTop }]}>
        <Image
          source={require('../../assets/images/logo1.webp')}
          style={[styles.logoImage, { width: logoSize, height: logoSize }]}
          resizeMode="contain"
        />
      </View>

      <TouchableOpacity 
        style={[styles.gradientOverlay, { height: height * 0.5 }]} 
        activeOpacity={1}
        onPress={Keyboard.dismiss}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </TouchableOpacity>

      {/* Tombol Get Started (Hanya muncul di awal) */}
      <Animated.View
        style={[
          styles.getStartedWrapper,
          {
            bottom: dynamicGetStartedBottom,
            opacity: getStartedOpacity,
            transform: [{ translateY: getStartedTranslateY }],
          },
        ]}
        pointerEvents={viewMode === 'initial' ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.getStartedText}>Get started</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheetContainer,
          { transform: [{ translateY: Animated.add(sheetTranslateY, keyboardShift) }] },
        ]}
      >
        <View
          style={[
            styles.bottomSheetContent,
            { padding: sheetPadding, paddingTop: 12, paddingBottom: dynamicSheetBottomPadding },
          ]}
        >
          
          {/* Handle Bar (Klik untuk tutup/back) */}
          <TouchableOpacity 
            style={styles.sheetHeader} 
            onPress={handleCloseSheet}
            activeOpacity={0.6}
          >
            <View style={styles.dragIndicator} />
          </TouchableOpacity>

          {/* Konten Sheet */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.sheetScrollContent}
          >
          <Animated.View key={viewMode} style={{ opacity: contentOpacity }}>
            
            {/* VIEW LOGIN FORM (Input No HP) */}
            {viewMode === 'login_form' && (
              <View>
                {/* Header Row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <TouchableOpacity onPress={handleBackToSelection} style={{ padding: 4, marginRight: 8 }}>
                     <Text style={{ fontSize: 20, color: '#1A1A1A' }}>←</Text>
                  </TouchableOpacity>
                  <View>
                    <Text style={styles.formTitle}>{getGreeting()}</Text>
                    <Text style={styles.formSubtext}>Enter mobile number to continue</Text>
                  </View>
                </View>

                {/* Input Field */}
                <View style={styles.phoneInputContainer}>
                  <View style={styles.countryCodeBox}>
                    <Text style={{ fontSize: 18 }}>🇮🇩</Text>
                    <Text style={styles.countryCodeText}>+62</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="812 3456 7890"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="default"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                  ]}
                  onPress={handleGetOtp}
                >
                  <Text style={styles.primaryButtonText}>Get OTP</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.signUpButton, { marginTop: 12 }]}
                  onPress={handleOpenSignUp}
                >
                  <Text style={styles.signUpButtonText}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            )}

            {viewMode === 'signup_form' && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <TouchableOpacity onPress={handleBackToLoginForm} style={{ padding: 4, marginRight: 8 }}>
                    <Text style={{ fontSize: 20, color: '#1A1A1A' }}>←</Text>
                  </TouchableOpacity>
                  <View>
                    <Text style={styles.formTitle}>Create Account</Text>
                    <Text style={styles.formSubtext}>Fill a few details to continue</Text>
                  </View>
                </View>

                <View style={styles.textInputContainer}>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Full name"
                    placeholderTextColor="#9CA3AF"
                    value={signupName}
                    onChangeText={setSignupName}
                  />
                </View>

                <View style={styles.textInputContainer}>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Date of birth (DD/MM/YYYY)"
                    placeholderTextColor="#9CA3AF"
                    value={signupDob}
                    onChangeText={handleDobChange}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>

                <View style={styles.phoneInputContainer}>
                  <View style={styles.countryCodeBox}>
                    <Text style={{ fontSize: 18 }}>🇮🇩</Text>
                    <Text style={styles.countryCodeText}>+62</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="812 3456 7890"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="default"
                    value={signupPhone}
                    onChangeText={setSignupPhone}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                  ]}
                  onPress={handleSignUpGetOtp}
                >
                  <Text style={styles.primaryButtonText}>Get OTP</Text>
                </TouchableOpacity>
              </View>
            )}

            {viewMode === 'login_otp' &&
              <OtpVerificationSection
                phone={phoneNumber}
                otp={loginOtp}
                otpRefs={loginOtpRefs}
                onChange={handleLoginOtpChange}
                onBack={handleLoginOtpBack}
                onVerify={handleLoginOtpVerify}
                verifyLabel={isAuthSubmitting ? 'Processing...' : 'Verify & Login'}
                progressMessage={authProgressMessage}
                resendTimer={loginResendTimer}
                onResend={handleLoginResend}
                isSubmitting={isAuthSubmitting}
              />}

            {viewMode === 'signup_otp' &&
              <OtpVerificationSection
                phone={signupPhone}
                otp={signupOtp}
                otpRefs={signupOtpRefs}
                onChange={handleSignupOtpChange}
                onBack={handleSignupOtpBack}
                onVerify={handleSignupOtpVerify}
                verifyLabel={isAuthSubmitting ? 'Processing...' : 'Verify & Create Account'}
                progressMessage={authProgressMessage}
                resendTimer={signupResendTimer}
                onResend={handleSignupResend}
                isSubmitting={isAuthSubmitting}
              />}

          </Animated.View>
          </ScrollView>
        </View>
      </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFDFB' },
  // heroImage: { position: 'absolute', top: 0, left: 0 },
  logoSection: { position: 'absolute', alignSelf: 'center', zIndex: 10 },
  logoImage: {},
  gradientOverlay: { position: 'absolute', bottom: 0, width: '100%' },
  
  getStartedWrapper: { position: 'absolute', left: 24, right: 24, zIndex: 15 },
  getStartedButton: {
    height: 56, backgroundColor: '#B91C2F', borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 8
  },
  getStartedText: { fontSize: 17, fontWeight: '600', color: '#FFF' },

  bottomSheetContainer: {
    position: 'absolute', bottom: 0, width: '100%',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 25,
    zIndex: 20,
  },
  bottomSheetContent: {},
  sheetScrollContent: { paddingBottom: 10 },
  
  sheetHeader: { alignItems: 'center', paddingVertical: 10, marginBottom: 10, width: '100%' },
  dragIndicator: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#E5E7EB' },

  sheetTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center', marginBottom: 6 },
  sheetSubtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 24 },
  
  loginButton: { height: 50, backgroundColor: '#B91C2F', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  loginButtonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  signUpButton: { height: 50, backgroundColor: '#FFF', borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#B91C2F' },
  signUpButtonText: { color: '#B91C2F', fontWeight: '600', fontSize: 16 },

  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  formSubtext: { fontSize: 13, color: '#6B7280' },
  
  phoneInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', height: 54, marginBottom: 20
  },
  textInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', height: 54, marginBottom: 12
  },
  countryCodeBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRightWidth: 1, borderRightColor: '#E5E7EB', gap: 6 },
  countryCodeText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  phoneInput: { flex: 1, fontSize: 16, paddingHorizontal: 14, color: '#1A1A1A' },

  primaryButton: { height: 50, backgroundColor: '#B91C2F', borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  primaryButtonDisabled: { backgroundColor: '#E5E7EB' },
  primaryButtonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});