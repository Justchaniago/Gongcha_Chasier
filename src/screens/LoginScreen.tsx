import React, { useState, useRef, useEffect } from 'react';
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
  LayoutAnimation,
  Animated,
  Keyboard,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Sun, Moon } from 'lucide-react-native'; // Import icon (pastikan lucide-react-native terinstall)

// Import Hook Theme
import { useTheme } from '../context/ThemeContext';

type RootStackParamList = {
  Login: { initialStep?: 'phone' | 'otp' };
  MainApp: undefined;
};

type LoginScreenRouteProp = RouteProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const { colors, activeMode, toggleTheme } = useTheme(); // Gunakan toggleTheme
  const isDark = activeMode === 'dark';

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<LoginScreenRouteProp>();
  const isCompact = width < 360;
  const logoSize = isCompact ? 88 : 100;
  const sheetPadding = isCompact ? 18 : 24;
  const otpBoxWidth = isCompact ? 44 : 50;
  const otpBoxHeight = isCompact ? 54 : 60;
  const dynamicLogoTop = insets.top + (Platform.OS === 'ios' ? 12 : 8);
  const dynamicSheetBottomPadding = Math.max(insets.bottom + 16, 24);

  const [step, setStep] = useState<'phone' | 'otp'>(route.params?.initialStep || 'phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  
  const otpRefs = useRef<Array<TextInput | null>>([null, null, null, null]);
  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (step === 'otp') {
      startResendTimer();
    }
  }, [step]);

  const startResendTimer = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  };

  const handleGetOtp = () => {
    if (phoneNumber.length >= 9) {
      Keyboard.dismiss();
      Animated.timing(contentOpacity, { 
        toValue: 0, 
        duration: 150, 
        useNativeDriver: true 
      }).start();
      
      setTimeout(() => {
        setStep('otp');
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        
        setTimeout(() => {
          Animated.timing(contentOpacity, { 
            toValue: 1, 
            duration: 200, 
            useNativeDriver: true 
          }).start(() => {
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
          });
        }, 50);
      }, 150);
      
      startResendTimer();
    }
  };

  const handleBackToPhone = () => {
    Keyboard.dismiss();
    Animated.timing(contentOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    setTimeout(() => {
      setStep('phone');
      setOtp(['', '', '', '']);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTimeout(() => {
        Animated.timing(contentOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      }, 50);
    }, 150);
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 3) otpRefs.current[index + 1]?.focus();
  };

  const handleVerify = () => {
    if (otp.join('').length === 4) {
      navigation.navigate('MainApp');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <StatusBar style="light" /> 
        
        <Image source={require('../../assets/images/welcome1.webp')} style={[styles.backgroundImage, { width, height }]} resizeMode="cover" />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={[styles.gradientOverlay, { height: height * 0.6 }]} pointerEvents="none" />
        
        <View style={[styles.logoSection, { top: dynamicLogoTop }]}>
          <Image source={require('../../assets/images/logo1.webp')} style={[styles.logoImage, { width: logoSize, height: logoSize }]} resizeMode="contain" />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
          style={styles.keyboardView}
        >
          <View style={[
            styles.bottomSheet, 
            { 
              padding: sheetPadding, 
              paddingTop: 12, 
              paddingBottom: dynamicSheetBottomPadding, 
              minHeight: height * 0.52,
              backgroundColor: colors.background.modal // Apply theme BG here
            }
          ]}> 
            
            <View style={styles.sheetHeader}>
              <View style={[styles.dragIndicator, { backgroundColor: colors.border.default }]} />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
            <Animated.View style={{ opacity: contentOpacity }}>
              
              {step === 'phone' ? (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.header, { color: colors.text.primary, marginBottom: 0 }]}>Welcome Back</Text>
                    
                    {/* --- TRIGGER THEME BUTTON --- */}
                    <TouchableOpacity onPress={toggleTheme} style={{ padding: 4 }}>
                      {isDark ? <Sun size={24} color={colors.text.primary} /> : <Moon size={24} color={colors.text.primary} />}
                    </TouchableOpacity>
                    {/* --------------------------- */}
                  </View>

                  <Text style={[styles.subtext, { color: colors.text.secondary }]}>Enter your mobile number to continue</Text>

                  <View style={[
                    styles.phoneInputContainer, 
                    { 
                      backgroundColor: colors.input.background, 
                      borderColor: colors.border.default 
                    }
                  ]}>
                    <View style={[styles.countryCodeBox, { borderRightColor: colors.border.default }]}>
                      <Text style={{ fontSize: 18 }}>🇮🇩</Text>
                      <Text style={[styles.countryCodeText, { color: colors.text.primary }]}>+62</Text>
                    </View>
                    <TextInput
                      style={[styles.phoneInput, { color: colors.text.primary }]}
                      placeholder="812 3456 7890"
                      placeholderTextColor={colors.text.disabled}
                      keyboardType="number-pad"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton, 
                      { backgroundColor: phoneNumber.length < 9 ? colors.brand.primaryDisabled : colors.brand.primary }
                    ]}
                    onPress={handleGetOtp}
                    disabled={phoneNumber.length < 9}
                  >
                    <Text style={[styles.primaryButtonText, { color: colors.text.inverse }]}>Get OTP</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <TouchableOpacity onPress={handleBackToPhone} style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 16, color: colors.text.secondary }}>← Back to number</Text>
                    </TouchableOpacity>
                    
                    {/* --- TRIGGER THEME BUTTON (OTP View) --- */}
                    <TouchableOpacity onPress={toggleTheme} style={{ padding: 4 }}>
                      {isDark ? <Sun size={24} color={colors.text.primary} /> : <Moon size={24} color={colors.text.primary} />}
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.header, { color: colors.text.primary }]}>Verify Phone</Text>
                  <Text style={[styles.subtext, { color: colors.text.secondary }]}>Code sent to your number</Text>

                  <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => {
                          otpRefs.current[index] = ref;
                        }}
                        style={[
                          styles.otpBox, 
                          { 
                            width: otpBoxWidth, 
                            height: otpBoxHeight,
                            backgroundColor: colors.input.background,
                            borderColor: digit ? colors.brand.primary : colors.border.default,
                            color: colors.text.primary
                          },
                          digit ? { backgroundColor: isDark ? 'rgba(255, 107, 107, 0.1)' : '#FFF5F5' } : {}
                        ]}
                        keyboardType="number-pad"
                        maxLength={1}
                        value={digit}
                        onChangeText={text => handleOtpChange(text, index)}
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton, 
                      { backgroundColor: otp.join('').length < 4 ? colors.brand.primaryDisabled : colors.brand.primary }
                    ]}
                    onPress={handleVerify}
                    disabled={otp.join('').length < 4}
                  >
                    <Text style={[styles.primaryButtonText, { color: colors.text.inverse }]}>Verify & Login</Text>
                  </TouchableOpacity>

                  <View style={{ alignItems: 'center', marginTop: 16 }}>
                    {resendTimer > 0 ? (
                      <Text style={{ color: colors.text.disabled }}>Resend in 00:{resendTimer.toString().padStart(2, '0')}</Text>
                    ) : (
                      <TouchableOpacity onPress={() => startResendTimer()}>
                         <Text style={{ color: colors.brand.primary, fontWeight: '600' }}>Resend Code</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}

            </Animated.View>
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
  logoImage: {},
  keyboardView: { flex: 1, justifyContent: 'flex-end' },
  bottomSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 40,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 20
  },
  sheetHeader: { alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  sheetScrollContent: { paddingBottom: 12 },
  dragIndicator: { width: 40, height: 4, borderRadius: 2 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtext: { fontSize: 15, marginBottom: 24 },
  
  phoneInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1, height: 52, marginBottom: 20
  },
  countryCodeBox: { flexDirection: 'row', paddingHorizontal: 14, borderRightWidth: 1, gap: 6 },
  countryCodeText: { fontSize: 16, fontWeight: '600' },
  phoneInput: { flex: 1, fontSize: 16, paddingHorizontal: 14 },

  otpContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  otpBox: { borderRadius: 12, borderWidth: 1, textAlign: 'center', fontSize: 24, fontWeight: 'bold' },
  
  primaryButton: { height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { fontWeight: '600', fontSize: 16 },
});