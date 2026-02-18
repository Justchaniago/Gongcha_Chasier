import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  FlatList,
  Modal,
} from 'react-native';
import { Bell, X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import { getGreeting } from '../utils/greetingHelper';
import { useTheme } from '../context/ThemeContext';
import { useStaffAuth } from '../context/StaffAuthContext';

const NOTIFICATIONS = [
  { id: '1', title: 'Update Stok', body: 'Stok Brown Sugar hampir habis di gudang.', time: 'Baru saja', read: false, type: 'system' },
  { id: '2', title: 'Shift Selesai', body: 'Laporan shift pagi telah berhasil disinkronisasi.', time: '2 jam lalu', read: false, type: 'system' },
];

export default function DashboardScreen() {
  const { staff } = useStaffAuth();
  const { colors, activeMode } = useTheme();
  const isDark = activeMode === 'dark';
  
  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<View>(null);
  const [bellLayout, setBellLayout] = useState({ x: 0, y: 0, width: 0, height: 0, pageY: 0 });
  
  // Animation Values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const buttonBg = useRef(new Animated.Value(0)).current;
  
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 360;
  const horizontalPadding = isCompact ? 16 : 24;
  const headerIconSize = isCompact ? 44 : 48;

  const openNotifications = () => {
    bellRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setBellLayout({ x, y, width, height, pageY });
      setShowNotifications(true);
      
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 10, tension: 80 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 350, delay: 100, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.spring(iconRotate, { toValue: 1, useNativeDriver: true, friction: 8, tension: 100 }),
        Animated.timing(buttonBg, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]).start();
    });
  };

  const closeNotifications = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0, duration: 280, useNativeDriver: true, easing: Easing.in(Easing.back(1.2)) }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.spring(iconRotate, { toValue: 0, useNativeDriver: true, friction: 8, tension: 100 }),
      Animated.timing(buttonBg, { toValue: 0, duration: 250, useNativeDriver: false }),
    ]).start(() => setShowNotifications(false));
  };

  // Modal Transform Logic
  const bellCenterX = (width - horizontalPadding - 42 - 10 - (headerIconSize / 2)); 
  const modalTransform = [
    { translateX: bellCenterX - width / 2 },
    { translateY: -(height / 2) + 100 },
    { scale: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.01, 1] }) },
    { translateX: -(bellCenterX - width / 2) },
    { translateY: (height / 2) - 100 },
  ];

  const iconRotation = iconRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const iconScale = iconRotate.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.8, 1] });
  const bellOpacity = iconRotate.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] });
  const xOpacity = iconRotate.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
  const buttonBackgroundColor = buttonBg.interpolate({ 
    inputRange: [0, 1], 
    outputRange: [colors.surface.card, colors.brand.primary]
  });

  return (
    <ScreenFadeTransition>
      <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
        <DecorativeBackground />

        <View style={styles.mainLayout}>
          {/* ============================================================ */}
          {/* KONTAINER 1: FIXED HEADER (SAMA PERSIS) */}
          {/* ============================================================ */}
          <View style={[
            styles.fixedHeaderContainer, 
            { 
              paddingTop: insets.top + 10,
              paddingHorizontal: horizontalPadding,
              backgroundColor: colors.background.primary, 
              borderBottomColor: isDark ? colors.border.light : 'transparent',
              borderBottomWidth: isDark ? 1 : 0,
              zIndex: 20
            }
          ]}>
            <View style={styles.headerContent}> 
              <View style={styles.headerLeft}>
                <View style={styles.headerTextContainer}>
                  <Text style={[styles.greeting, { color: colors.text.secondary }]}>{getGreeting()},</Text>
                  <Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={1} ellipsizeMode="tail">
                    {staff?.name ?? 'Staff'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.headerRight}>
                <View ref={bellRef} style={{ opacity: showNotifications ? 0 : 1 }}>
                  <TouchableOpacity
                    style={[styles.notificationBtn, { width: headerIconSize, height: headerIconSize, backgroundColor: colors.surface.card }]}
                    activeOpacity={0.8}
                    onPress={openNotifications}
                  >
                     <Bell size={22} color={colors.brand.primary} strokeWidth={2.5} />
                     <View style={[styles.notificationBadge, { backgroundColor: colors.brand.primary, borderColor: colors.surface.card }]}>
                        <Text style={styles.notificationBadgeText}>2</Text>
                     </View>
                  </TouchableOpacity>
                </View>
                <Image source={require('../../assets/images/logo1.webp')} style={styles.logoTopRight} resizeMode="contain" />
              </View>
            </View>
          </View>

          {/* ============================================================ */}
          {/* KONTAINER 2: SCROLLABLE CONTENT (KONTEN KASIR) */}
          {/* ============================================================ */}
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={styles.scrollView} 
            contentContainerStyle={[
              styles.scrollContent, 
              { 
                paddingHorizontal: horizontalPadding, 
                paddingBottom: 120 + insets.bottom,
                paddingTop: 12 
              }
            ]}
          >
            {/* DI SINI ADALAH TEMPAT KONTEN DASHBOARD KASIR 
               Elemen membership, wallet, dll sudah dihilangkan.
            */}
            <View style={styles.emptyContent}>
                <Text style={{color: colors.text.secondary, textAlign: 'center'}}>
                    Siap untuk menambahkan fitur Kasir (POS, Scan QR, Laporan).
                </Text>
            </View>

          </ScrollView>
        </View>

        {/* --- MODAL NOTIFIKASI --- */}
        <Modal visible={showNotifications} transparent animationType="none" statusBarTranslucent onRequestClose={closeNotifications}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropAnim }]}>
             {Platform.OS === 'ios' ? (
                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint={isDark ? 'light' : 'dark'} />
             ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
             )}
             <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeNotifications} activeOpacity={1} />
          </Animated.View>

          <Animated.View style={[styles.modalContainer, { backgroundColor: colors.surface.card, top: insets.top + 10 + headerIconSize + 20, opacity: opacityAnim, transform: modalTransform }]}>
             <View style={[styles.modalHeader, { borderBottomColor: colors.border.light }]}>
                 <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Notifications</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>Informasi sistem kasir</Text>
                 </View>
             </View>
             <View style={[styles.notifListContainer, { backgroundColor: colors.background.tertiary }]}>
                <FlatList
                  data={NOTIFICATIONS}
                  keyExtractor={item => item.id}
                  contentContainerStyle={{ padding: 20 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.notifItem, { backgroundColor: colors.surface.card, shadowColor: colors.shadow.color }]} activeOpacity={0.7}>
                       <View style={[styles.notifIconCircle, { backgroundColor: colors.background.elevated }]}>
                          <Bell size={18} color={colors.text.secondary} />
                       </View>
                       <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                             <Text style={[styles.notifItemTitle, { color: colors.text.primary }]}>{item.title}</Text>
                             <Text style={[styles.notifTime, { color: colors.text.tertiary }]}>{item.time}</Text>
                          </View>
                          <Text style={[styles.notifBody, { color: colors.text.secondary }]}>{item.body}</Text>
                       </View>
                    </TouchableOpacity>
                  )}
                />
             </View>
          </Animated.View>

          {/* DUPLICATE FLOATING BELL */}
          <Animated.View style={[styles.notificationBtn, { position: 'absolute', top: bellLayout.pageY > 0 ? bellLayout.pageY : (insets.top + 10 + 10), right: 20 + 42 + 10, width: headerIconSize, height: headerIconSize, backgroundColor: buttonBackgroundColor, zIndex: 9999, elevation: 10 }]}>
             <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={0.8} onPress={closeNotifications}>
                <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', transform: [{ rotate: iconRotation }, { scale: iconScale }] }]}>
                   <Animated.View style={{ opacity: bellOpacity, position: 'absolute' }}><Bell size={22} color={colors.brand.primary} strokeWidth={2.5} /></Animated.View>
                   <Animated.View style={{ opacity: xOpacity, position: 'absolute' }}><X size={22} color="#FFF" strokeWidth={2.5} /></Animated.View>
                </Animated.View>
             </TouchableOpacity>
          </Animated.View>
        </Modal>

      </View>
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, position: 'relative' },
  mainLayout: { flex: 1 }, 
  fixedHeaderContainer: { paddingBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 120 },
  emptyContent: { marginTop: 100, alignItems: 'center', justifyContent: 'center' },

  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTextContainer: { justifyContent: 'center' },
  greeting: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  notificationBtn: { borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  notificationBadge: { position: 'absolute', top: 12, right: 14, width: 8, height: 8, borderRadius: 4, borderWidth: 1 },
  notificationBadgeText: { display: 'none' },
  logoTopRight: { width: 50, height: 50 },

  modalContainer: { position: 'absolute', left: 10, right: 10, borderRadius: 32, overflow: 'hidden', elevation: 20, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 24, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 14 },
  notifListContainer: { flex: 1 },
  notifItem: { flexDirection: 'row', padding: 16, borderRadius: 20, marginBottom: 16 },
  notifIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  notifItemTitle: { fontSize: 15, fontWeight: 'bold' },
  notifTime: { fontSize: 11 },
  notifBody: { fontSize: 13, marginTop: 4 },
});