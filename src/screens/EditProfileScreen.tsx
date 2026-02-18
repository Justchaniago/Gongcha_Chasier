import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Camera, User, Phone, Mail, Save, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import DecorativeBackground from '../components/DecorativeBackground';
import UserAvatar from '../components/UserAvatar';
import MockBackend from '../services/MockBackend';
import { UserProfile } from '../types/types';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);

  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await MockBackend.getUser();
      if (user) {
        setProfile(user);
        setName(user.name);
        setPhone(user.phoneNumber);
        setEmail(user.email || ''); 
        setPhoto(user.photoURL);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    // Meminta izin akses galeri
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to allow access to your photos to change profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3, // Kompresi agar tidak terlalu besar untuk Firestore
      base64: true, // Kita butuh base64 untuk simpan langsung ke Firestore (simple method)
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      // Format data URI untuk ditampilkan dan disimpan
      const selectedImage = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhoto(selectedImage);
    }
  };

  const handleInitialSave = () => {
    if (!profile) return;
    
    // Validasi sederhana
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }

    // Cek apakah nomor HP berubah
    if (phone !== profile.phoneNumber) {
      // Jika berubah, munculkan OTP Modal
      setShowOtpModal(true);
    } else {
      // Jika tidak berubah, langsung simpan
      executeSaveProfile();
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit code sent to your new number.');
      return;
    }

    setIsVerifyingOtp(true);
    
    // Simulasi delay verifikasi server
    setTimeout(() => {
      setIsVerifyingOtp(false);
      if (otpCode === '1234') { // Mock OTP Code
        setShowOtpModal(false);
        executeSaveProfile();
      } else {
        Alert.alert('Verification Failed', 'Invalid OTP Code. (Hint: Use 1234)');
      }
    }, 1500);
  };

  const executeSaveProfile = async () => {
    setSaving(true);
    try {
      const updates: Partial<UserProfile> = {
        name: name,
        phoneNumber: phone,
        email: email,
        photoURL: photo, // Update foto juga
      };

      await MockBackend.updateUserProfile(updates);
      
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#FFF8F0' }]}>
        <ActivityIndicator size="large" color="#B91C2F" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <DecorativeBackground />

      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <View style={styles.backBtnCircle}>
            <ChevronLeft size={24} color="#2A1F1F" />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 44 }} /> 
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarBorder}>
                <UserAvatar 
                  name={name || 'User'} 
                  photoURL={photo} 
                  size={110} 
                />
              </View>
              <TouchableOpacity style={styles.cameraButton} activeOpacity={0.8} onPress={handlePickImage}>
                <LinearGradient
                  colors={['#B91C2F', '#8E0E00']}
                  style={styles.cameraGradient}
                >
                  <Camera size={20} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.iconBox}>
                  <User size={20} color="#B91C2F" />
                </View>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#C4B5B0"
                />
              </View>
            </View>

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.iconBox}>
                  <Phone size={20} color="#B91C2F" />
                </View>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="0812..."
                  keyboardType="phone-pad"
                  placeholderTextColor="#C4B5B0"
                />
              </View>
              {phone !== profile?.phoneNumber && (
                <Text style={styles.helperText}>* Changing phone number requires OTP verification.</Text>
              )}
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.iconBox}>
                  <Mail size={20} color="#B91C2F" />
                </View>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  placeholderTextColor="#C4B5B0"
                  autoCapitalize="none"
                />
              </View>
            </View>

          </View>
        </ScrollView>

        {/* Floating Save Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity 
            style={styles.saveBtnContainer} 
            onPress={handleInitialSave}
            disabled={saving}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={saving ? ['#9CA3AF', '#6B7280'] : ['#B91C2F', '#8E0E00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtnGradient}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Save size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* OTP Modal */}
      <Modal
        visible={showOtpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOtpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpCard}>
            <TouchableOpacity 
              style={styles.closeOtpBtn} 
              onPress={() => setShowOtpModal(false)}
            >
              <X size={20} color="#8C7B75" />
            </TouchableOpacity>
            
            <View style={styles.otpIconCircle}>
              <Phone size={24} color="#B91C2F" />
            </View>
            
            <Text style={styles.otpTitle}>Verify Phone Number</Text>
            <Text style={styles.otpDesc}>
              We've sent a verification code to <Text style={{fontWeight: 'bold'}}>{phone}</Text>
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="1 2 3 4"
              placeholderTextColor="#DDD"
              keyboardType="number-pad"
              maxLength={4}
              value={otpCode}
              onChangeText={setOtpCode}
              textAlign="center"
              autoFocus
            />
            <Text style={styles.otpHint}>(Mock OTP: Enter 1234)</Text>

            <TouchableOpacity 
              style={styles.verifyBtn}
              onPress={handleVerifyOtp}
              disabled={isVerifyingOtp}
            >
              {isVerifyingOtp ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>Verify & Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    borderRadius: 20,
  },
  backBtnCircle: {
    width: 44,
    height: 44,
    backgroundColor: '#FFF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3A2E2A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3E9DC',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2A1F1F',
  },
  
  // Content Styles
  scrollContent: {
    padding: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 36,
    marginTop: 10,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarBorder: {
    padding: 4,
    backgroundColor: '#FFF',
    borderRadius: 60,
    shadowColor: '#B91C2F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cameraGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  changePhotoText: {
    color: '#B91C2F',
    fontWeight: '600',
    fontSize: 14,
    opacity: 0.9,
  },
  
  // Form Styles
  formContainer: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2A1F1F',
    marginLeft: 4,
    opacity: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 56,
    shadowColor: '#3A2E2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  iconBox: {
    width: 48,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5E1', 
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2A1F1F',
    height: '100%',
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 11,
    color: '#C2410C', // Orange warning color
    marginLeft: 4,
    fontStyle: 'italic',
  },
  
  // Footer Button Styles
  footer: {
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  saveBtnContainer: {
    shadowColor: '#B91C2F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnGradient: {
    flexDirection: 'row',
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // OTP Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  otpCard: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
  },
  closeOtpBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  otpIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2A1F1F',
    marginBottom: 8,
  },
  otpDesc: {
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  otpInput: {
    width: '80%',
    height: 56,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
    marginBottom: 8,
    color: '#2A1F1F',
  },
  otpHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  verifyBtn: {
    backgroundColor: '#B91C2F',
    width: '100%',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});