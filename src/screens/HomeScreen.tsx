import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { Trophy, Gift, ChevronRight, Bell, X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import UserAvatar from '../components/UserAvatar';
import MockBackend from '../services/MockBackend';
import type { RootTabParamList } from '../navigation/AppNavigator';
import { MemberTier, UserProfile } from '../types/types';
import { getGreeting } from '../utils/greetingHelper';
import { useTheme } from '../context/ThemeContext';

const NOTIFICATIONS = [
  { id: '1', title: 'Selamat Ulang Tahun!', body: 'Voucher Birthday diskon 10% sudah aktif. Traktir dirimu sekarang!', time: 'Baru saja', read: false, type: 'gift' },
  { id: '2', title: 'Poin Masuk', body: 'Kamu mendapatkan 5.000 XP dari Admin Bonus. Level up semakin dekat!', time: '2 jam lalu', read: false, type: 'points' },
  { id: '3', title: 'Promo Brown Sugar', body: 'Beli 2 Brown Sugar Milk Tea, Gratis 1 Topping. Cek menu sekarang.', time: '1 hari lalu', read: true, type: 'promo' },
  { id: '4', title: 'Update Aplikasi', body: 'Fitur baru Store Locator sudah tersedia. Yuk update aplikasi Gong Cha kamu.', time: '3 hari lalu', read: true, type: 'system' },
];

const TIER_THEME: Record<MemberTier, any> = {
  Silver: {
    progressGradient: ['#B7C0CC', '#8A93A1'],
    tierBadgeBg: '#E5E7EB', tierText: '#4B5563', percentBadgeBg: '#6B7280',
    progressTrackBg: '#ECEFF3', rewardsBorder: '#E5E7EB', rewardsShadow: '#9CA3AF',
    footerIcon: '#6B7280', walletGradient: ['#5B6470', '#2F3742'],
    trophyBg: 'rgba(191, 199, 209, 0.92)', redeemAccent: '#4B5563',
  },
  Gold: {
    progressGradient: ['#D4A853', '#F3C677'],
    tierBadgeBg: '#D4A853', tierText: '#2A1F1F', percentBadgeBg: '#B91C2F',
    progressTrackBg: '#F0E6DA', rewardsBorder: '#F3E9DC', rewardsShadow: '#3A2E2A',
    footerIcon: '#B91C2F', walletGradient: ['#8E0E00', '#1F1C18'],
    trophyBg: 'rgba(212, 168, 83, 0.88)', redeemAccent: '#B91C2F',
  },
  Platinum: {
    progressGradient: ['#A78BFA', '#7C3AED'],
    tierBadgeBg: '#DDD6FE', tierText: '#5B21B6', percentBadgeBg: '#6D28D9',
    progressTrackBg: '#EDE9FE', rewardsBorder: '#E9D5FF', rewardsShadow: '#7C3AED',
    footerIcon: '#6D28D9', walletGradient: ['#4C1D95', '#111827'],
    trophyBg: 'rgba(196, 181, 253, 0.9)', redeemAccent: '#5B21B6',
  },
};

export default function HomeScreen() {
  const { colors, activeMode } = useTheme();
  const isDark = activeMode === 'dark';
  
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const promoScrollRef = useRef<ScrollView | null>(null);
  const [activePromo, setActivePromo] = useState(0);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
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
  const horizontalPadding = isCompact ? 16 : 20;
  const avatarSize = isCompact ? 46 : 52;
  const headerIconSize = isCompact ? 44 : 48;

  // --- ANIMASI NOTIFIKASI ---
  const openNotifications = () => {
    // Karena header sekarang fixed, posisi Y lonceng relatif stabil
    // Tapi kita tetap pakai measure untuk akurasi pixel perfect di berbagai device
    bellRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setBellLayout({ x, y, width, height, pageY });
      setShowNotifications(true);
      
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 10,
          tension: 80,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 350,
          delay: 100,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(iconRotate, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
        Animated.timing(buttonBg, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    });
  };

  const closeNotifications = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
        easing: Easing.in(Easing.back(1.2)),
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(iconRotate, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }),
      Animated.timing(buttonBg, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false, 
      }),
    ]).start(() => {
      setShowNotifications(false);
    });
  };

  const loadUserData = async () => {
    setLoading(true);
    try {
      const user = await MockBackend.getUser();
      setUserData(user);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const tierXp = userData?.tierXp ?? 0;
  const currentPoints = userData?.currentPoints ?? 0;
  const tier = userData?.tier ?? 'Silver';
  const tierTheme = TIER_THEME[tier];
  const target = tier === 'Silver' ? MockBackend.TIER_MILESTONES.Gold : tier === 'Gold' ? MockBackend.TIER_MILESTONES.Platinum : MockBackend.TIER_MILESTONES.Platinum;
  const isPlatinum = tier === 'Platinum';
  const progress = isPlatinum ? 100 : Math.max(0, Math.min((tierXp / target) * 100, 100));
  const remainingToNextTier = isPlatinum ? 0 : Math.max(0, target - tierXp);
  const footerMessage = isPlatinum ? 'You are Top Tier!' : `${remainingToNextTier} XP to reach next Tier!`;
  const promoCardWidth = width - 40;

  const promos = useMemo(() => [
    { color: '#FFD1DC', image: require('../../assets/images/promo1.webp') },
    { color: '#FFF5E1', image: null },
    { color: '#E0F7FA', image: null },
  ], []);

  useEffect(() => {
    if (!promos.length) return;
    const interval = setInterval(() => {
      setActivePromo((prev) => {
        const next = (prev + 1) % promos.length;
        promoScrollRef.current?.scrollTo({ x: next * promoCardWidth, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [promoCardWidth, promos.length]);

  // Modal Transform Logic
  // Menggunakan posisi Y dari measure (bellLayout.pageY) yang sekarang stabil karena header fixed
  const bellCenterX = (width - horizontalPadding - 42 - 10 - (headerIconSize / 2)); 
  
  const modalTransform = [
    { translateX: bellCenterX - width / 2 },
    { translateY: -(height / 2) + 100 },
    { 
      scale: scaleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.01, 1],
      }) 
    },
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
          {/* KONTAINER 1: FIXED HEADER (Tidak ikut scroll) */}
          {/* ============================================================ */}
          <View style={[
            styles.fixedHeaderContainer, 
            { 
              paddingTop: insets.top + 6,
              paddingHorizontal: horizontalPadding,
              backgroundColor: colors.background.primary, // Agar konten scroll tidak terlihat di belakang header
              borderBottomColor: isDark ? colors.border.light : 'transparent',
              borderBottomWidth: isDark ? 1 : 0, // Garis tipis halus di dark mode
              zIndex: 20
            }
          ]}>
            <View style={styles.headerContent}> 
              <View style={styles.headerLeft}>
                <View style={styles.avatarWrap}>
                  <UserAvatar
                    name={userData?.name ?? 'Member'}
                    photoURL={userData?.photoURL}
                    size={avatarSize}
                  />
                  <View style={styles.avatarStatusDot} />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={[styles.greeting, { color: colors.text.secondary }]}>{getGreeting()},</Text>
                  <Text style={[styles.name, { color: colors.text.primary }]}>{userData?.name ?? 'Member'}</Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                
                {/* TOMBOL LONCENG (Sekarang Fixed) */}
                <View ref={bellRef} style={{ opacity: showNotifications ? 0 : 1 }}>
                  <TouchableOpacity
                    style={[
                      styles.notificationBtn, 
                      { 
                        width: headerIconSize, 
                        height: headerIconSize,
                        backgroundColor: colors.surface.card,
                        shadowColor: colors.shadow.color,
                      }
                    ]}
                    activeOpacity={0.8}
                    onPress={openNotifications}
                    disabled={loading}
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
          {/* KONTAINER 2: SCROLLABLE CONTENT (Sisa layar) */}
          {/* ============================================================ */}
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={styles.scrollView} 
            contentContainerStyle={[
              styles.scrollContent, 
              { 
                paddingHorizontal: horizontalPadding, 
                paddingBottom: 120 + insets.bottom,
                paddingTop: 10 // Jarak sedikit dari header
              }
            ]}
          >
            {/* --- 2. MEMBERSHIP STATUS CARD --- */}
            <View style={[
              styles.rewardsCard, 
              { 
                backgroundColor: colors.surface.card,
                borderColor: tierTheme.rewardsBorder, 
                shadowColor: tierTheme.rewardsShadow 
              }
            ]}>
              <View style={styles.rewardsHeader}>
                <View>
                  <Text style={[styles.rewardsLabel, { color: colors.text.secondary }]}>MEMBERSHIP STATUS</Text>
                  <Text style={[styles.rewardsPoints, { color: colors.text.primary }]}>{loading ? 'Loading...' : `${tierXp} / ${target} XP`}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[styles.tierBadge, { backgroundColor: tierTheme.tierBadgeBg }]}>
                    <Text style={[styles.tierText, { color: tierTheme.tierText }]}>{tier} Tier</Text>
                  </View>
                  <View style={[styles.percentBadge, { backgroundColor: tierTheme.percentBadgeBg }]}>
                    <Text style={styles.percentText}>{Math.round(progress)}%</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: tierTheme.progressTrackBg }]}>
                <LinearGradient
                  colors={tierTheme.progressGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${progress}%` }]} 
                />
              </View>
              <View style={styles.rewardsFooter}>
                <Gift size={14} color={tierTheme.footerIcon} />
                <Text style={[styles.rewardsFooterText, { color: colors.text.secondary }]}>{loading ? 'Syncing rewards...' : footerMessage}</Text>
              </View>
            </View>

            {/* --- 3. SPECIAL OFFERS --- */}
            <View style={styles.sectionHeader}>
              <View style={[styles.redPill, { backgroundColor: colors.brand.primary }]} />
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Special Offers</Text>
              <Image source={require('../../assets/images/boba.webp')} style={styles.titleIcon} />
            </View>

            <ScrollView
              ref={promoScrollRef}
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              style={styles.promoScroll} contentContainerStyle={{ paddingRight: 20 }}
              onMomentumScrollEnd={(e) => setActivePromo(Math.round(e.nativeEvent.contentOffset.x / promoCardWidth))}
            >
              {promos.map((promo, idx) => (
                <View key={idx} style={[styles.promoCard, { width: promoCardWidth, backgroundColor: colors.surface.card }]}> 
                  {promo.image ? (
                    <Image source={promo.image} style={styles.promoImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.promoPlaceholder, { backgroundColor: promo.color }]}>
                       <Text style={{color: '#8C7B75', fontWeight: 'bold'}}>Promo {idx+1}</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
            <View style={styles.paginationDots}>
              {promos.map((_, i) => <View key={i} style={[styles.dot, activePromo === i && { backgroundColor: colors.brand.primary, width: 24 }]} />)}
            </View>

            {/* --- 4. GONG CHA WALLET --- */}
            <View style={styles.sectionHeader}>
              <View style={[styles.redPill, { backgroundColor: colors.brand.primary }]} />
              <Text style={[styles.walletTitle, { color: colors.text.primary }]}>Gong Cha Wallet</Text>
            </View>

            <LinearGradient 
              colors={tierTheme.walletGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.walletCard}
            >
              <Image source={require('../../assets/images/liquid.webp')} style={styles.walletLiquid} />
              <View style={styles.walletTopRow}>
                <View>
                  <Text style={styles.walletLabel}>Gong Cha Wallet</Text>
                  <Text style={styles.walletAmount}>{loading ? '...' : currentPoints.toLocaleString('id-ID')}</Text>
                </View>
                <View style={[styles.trophyIconBg, { backgroundColor: tierTheme.trophyBg }]}>
                  <Trophy size={21} color="#2A1F1F" />
                </View>
              </View>
              <View style={styles.walletDivider} />
              <View style={styles.walletBottomRow}>
                <View>
                  <Text style={styles.walletBenefitTitle}>Tier Benefits</Text>
                  <Text style={styles.walletBenefitDesc}>Free delivery & 10% Birthday Discount</Text>
                </View>
                <TouchableOpacity
                  style={[styles.redeemButton, { backgroundColor: colors.surface.card }]}
                  onPress={() => navigation.navigate('Rewards')}
                >
                  <Text style={[styles.redeemButtonText, { color: tierTheme.redeemAccent }]}>Redeem Catalog</Text>
                  <ChevronRight size={11} color={tierTheme.redeemAccent} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

          </ScrollView>
        </View>

        {/* --- MODAL (OVERLAY) --- */}
        <Modal
          visible={showNotifications}
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={closeNotifications}
        >
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropAnim }]}>
             {Platform.OS === 'ios' ? (
                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint={isDark ? 'light' : 'dark'} />
             ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
             )}
             <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeNotifications} activeOpacity={1} />
          </Animated.View>

          <Animated.View 
            style={[
              styles.modalContainer,
              {
                backgroundColor: colors.surface.card,
                top: insets.top + 6 + headerIconSize + 20, 
                opacity: opacityAnim,
                transform: modalTransform
              }
            ]}
          >
             <View style={[styles.modalHeader, { borderBottomColor: colors.border.light }]}>
                 <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Notifications</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>You have 2 unread messages</Text>
                 </View>
             </View>

             <View style={[styles.notifListContainer, { backgroundColor: colors.background.tertiary }]}>
                <FlatList
                  data={NOTIFICATIONS}
                  keyExtractor={item => item.id}
                  contentContainerStyle={{ padding: 20 }}
                  ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[
                        styles.notifItem, 
                        { backgroundColor: colors.surface.card, shadowColor: colors.shadow.color },
                        !item.read && { borderColor: colors.status.errorBg, borderWidth: 1 }
                      ]}
                      activeOpacity={0.7}
                    >
                       <View style={[
                         styles.notifIconCircle, 
                         !item.read ? { backgroundColor: colors.brand.primary } : { backgroundColor: colors.background.elevated }
                        ]}>
                          {item.type === 'gift' ? <Gift size={18} color={!item.read ? '#FFF' : colors.text.secondary} /> : 
                           item.type === 'points' ? <Trophy size={18} color={!item.read ? '#FFF' : colors.text.secondary} /> :
                           <Bell size={18} color={!item.read ? '#FFF' : colors.text.secondary} />}
                       </View>
                       <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                             <Text style={[styles.notifItemTitle, { color: !item.read ? colors.text.primary : colors.text.secondary }]}>{item.title}</Text>
                             <Text style={[styles.notifTime, { color: colors.text.tertiary }]}>{item.time}</Text>
                          </View>
                          <Text style={[styles.notifBody, { color: colors.text.secondary }]}>{item.body}</Text>
                       </View>
                       {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.brand.primary }]} />}
                    </TouchableOpacity>
                  )}
                />
             </View>

             <TouchableOpacity style={[styles.markReadBtn, { backgroundColor: colors.surface.card, borderTopColor: colors.border.light }]} onPress={() => {}}>
                <Text style={[styles.markReadText, { color: colors.brand.primary }]}>Mark all as read</Text>
             </TouchableOpacity>
          </Animated.View>

          {/* DUPLICATE FLOATING BELL (Fixed Position sesuai Header) */}
          <Animated.View
            style={[
              styles.notificationBtn,
              { 
                position: 'absolute',
                // Gunakan koordinat hasil measure, atau fallback ke posisi estimasi header
                top: bellLayout.pageY > 0 ? bellLayout.pageY : (insets.top + 6 + 10), 
                right: 20 + 42 + 10,
                width: headerIconSize, 
                height: headerIconSize,
                backgroundColor: buttonBackgroundColor,
                zIndex: 9999,
                elevation: 10,
              }
            ]}
          >
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
  // Flex container untuk membagi layar jadi 2: Header (fixed) dan Scroll (fluid)
  mainLayout: { flex: 1 }, 
  
  // FIXED HEADER STYLES
  fixedHeaderContainer: {
    paddingBottom: 20, // Spacing bawah header
    // Shadow halus agar header terlihat "mengambang" di atas konten
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerContent: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginTop: 10, // Margin internal
  },
  
  // SCROLL CONTENT
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },

  // HEADER ELEMENTS
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarWrap: { position: 'relative', marginRight: 12 },
  avatarStatusDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, backgroundColor: '#4CAF50', borderRadius: 7, borderWidth: 2, borderColor: '#FFF' },
  greeting: { fontSize: 13, fontWeight: '500' },
  headerTextContainer: { justifyContent: 'center' },
  name: { fontSize: 19, fontWeight: 'bold' },
  
  notificationBtn: { borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  notificationBadge: { position: 'absolute', top: 12, right: 14, width: 8, height: 8, borderRadius: 4, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  notificationBadgeText: { fontSize: 8, color: '#FFF', fontWeight: 'bold', display: 'none' },
  logoTopRight: { width: 48, height: 48 },

  // MODAL STYLES (Sama seperti sebelumnya)
  modalContainer: {
    position: 'absolute', left: 10, right: 10, bottom: 20,
    borderRadius: 32, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20,
    maxHeight: '75%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 2 },
  modalSubtitle: { fontSize: 14 },
  notifListContainer: { flex: 1 },
  notifItem: {
    flexDirection: 'row', padding: 16, borderRadius: 20,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  notifIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  notifItemTitle: { fontSize: 15, fontWeight: 'bold', flex: 1 },
  notifTime: { fontSize: 11, marginLeft: 8 },
  notifBody: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8, marginTop: 6 },
  markReadBtn: { padding: 16, alignItems: 'center', borderTopWidth: 1 },
  markReadText: { fontWeight: 'bold', fontSize: 14 },

  // CARD STYLES
  rewardsCard: { borderRadius: 22, padding: 12, marginBottom: 12, borderWidth: 1, elevation: 3 },
  rewardsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 },
  rewardsLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.8, marginBottom: 2 },
  rewardsPoints: { fontSize: 16, fontWeight: 'bold' },
  tierBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, marginBottom: 3 },
  tierText: { fontSize: 9, fontWeight: 'bold' },
  percentBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-end' },
  percentText: { color: '#FFF', fontWeight: 'bold', fontSize: 10 },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  rewardsFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardsFooterText: { fontSize: 9, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  redPill: { width: 4, height: 24, borderRadius: 2, marginRight: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  titleIcon: { width: 24, height: 24, marginLeft: 8, opacity: 0.8 },
  promoScroll: { marginBottom: 10 },
  promoCard: { height: 180, borderRadius: 24, overflow: 'hidden', elevation: 5 },
  promoImage: { width: '100%', height: '100%' },
  promoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  paginationDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 20, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0D6CC' },
  walletTitle: { fontSize: 18, fontWeight: 'bold' },
  walletCard: { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 13, position: 'relative', overflow: 'hidden', elevation: 5 },
  walletLiquid: { position: 'absolute', right: -18, bottom: -28, width: 98, height: 146, opacity: 0.28, transform: [{ rotate: '-10deg' }] },
  walletTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  walletLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 3 },
  walletAmount: { color: '#FFF', fontSize: 26, fontWeight: 'bold', letterSpacing: 0.4 },
  trophyIconBg: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  walletDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 10 },
  walletBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  walletBenefitTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  walletBenefitDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 2, maxWidth: 170 },
  redeemButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 14, gap: 4, elevation: 2 },
  redeemButtonText: { fontWeight: 'bold', fontSize: 10 },
});