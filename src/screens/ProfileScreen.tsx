import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
  Easing,
  Platform,
  useWindowDimensions,
  DeviceEventEmitter, // PENTING: Untuk komunikasi dengan TabBar
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  History,
  ArrowDownCircle,
  ArrowUpCircle,
  Settings,
  LogOut,
  ChevronRight,
  MapPin,
  HelpCircle,
  X,
  ShieldCheck,
} from 'lucide-react-native';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import UserAvatar from '../components/UserAvatar';
import { MockBackend } from '../services/MockBackend';
import { AuthService } from '../services/AuthService';
import { UserProfile, XpRecord } from '../types/types';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Animation State
  const [showHistory, setShowHistory] = useState(false);
  const historyTranslateY = useRef(new Animated.Value(380)).current;
  const historyBackdropOpacity = useRef(new Animated.Value(0)).current;
  const historyCardOpacity = useRef(new Animated.Value(0)).current;
  const historyCardScale = useRef(new Animated.Value(0.98)).current;

  const useBlurBackdrop = true; 
  const backdropBlurIntensity = Platform.OS === 'ios' ? 20 : 80; 
  
  const isCompact = screenWidth < 360;
  const horizontalPadding = isCompact ? 14 : 20;
  const avatarSize = isCompact ? 88 : 100;

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const data = await MockBackend.getUser();
      setUser(data);
    } catch (error) {
      console.log('Failed to load user data', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.logout();
            } catch {}
            const rootNavigation = navigation.getParent?.() || navigation;
            rootNavigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              })
            );
          },
        },
      ]
    );
  };

  const handleTestNotification = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission needed', 'Please allow notifications to see the preview.');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'GongCha Admin',
          body: '🔔 Test notification triggered successfully!',
        },
        trigger: { type: 'time', seconds: 1 },
      });
    } catch (error: any) {
      Alert.alert('Notification error', String(error?.message || error));
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // --- OPEN HISTORY (Trigger Hide TabBar) ---
  const openHistory = () => {
    setShowHistory(true);
    // Kirim sinyal ke CustomTabBar untuk sembunyi
    DeviceEventEmitter.emit('TOGGLE_TAB_BAR', true);

    historyTranslateY.setValue(screenHeight);
    historyBackdropOpacity.setValue(0);
    historyCardOpacity.setValue(0);
    historyCardScale.setValue(0.95);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(historyTranslateY, {
          toValue: 0, damping: 20, stiffness: 120, mass: 0.8, useNativeDriver: true,
        }),
        Animated.timing(historyBackdropOpacity, {
          toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(historyCardOpacity, {
          toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.spring(historyCardScale, {
          toValue: 1, damping: 20, stiffness: 150, useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // --- CLOSE HISTORY (Trigger Show TabBar) ---
  const closeHistory = () => {
    // Kirim sinyal ke CustomTabBar untuk muncul lagi
    DeviceEventEmitter.emit('TOGGLE_TAB_BAR', false);

    Animated.parallel([
      Animated.timing(historyTranslateY, {
        toValue: screenHeight, duration: 250, easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(historyBackdropOpacity, {
        toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(historyCardOpacity, {
        toValue: 0, duration: 150, useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setShowHistory(false);
    });
  };

  const MenuItem = ({ icon: Icon, title, subtitle, onPress, isDestructive = false }: any) => (
    <TouchableOpacity 
      style={styles.menuItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.menuIcon, 
        { backgroundColor: isDestructive ? '#B91C2F' : '#FFF0E0' } // Hardcoded color
      ]}>
        <Icon size={20} color={isDestructive ? '#FFF' : '#B91C2F'} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={[
          styles.menuTitle, 
          { color: isDestructive ? '#B91C2F' : '#2A1F1F' }
        ]}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {!isDestructive && <ChevronRight size={16} color="#B09A80" />}
    </TouchableOpacity>
  );

  const HistoryModal = () => {
    if (!showHistory) return null;
    return (
      <View style={styles.inlineOverlay} pointerEvents="box-none">
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalBackdrop, { opacity: historyBackdropOpacity }]}>
            {useBlurBackdrop ? (
              <BlurView intensity={backdropBlurIntensity} tint="dark" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFillObject} />
            ) : null}
            <View style={styles.modalBackdropTint} />
            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeHistory} />
          </Animated.View>
          <Animated.View
            style={[
              styles.bottomSheetCard,
              {
                minHeight: Math.max(320, screenHeight * 0.5),
                opacity: historyCardOpacity,
                transform: [{ translateY: historyTranslateY }, { scale: historyCardScale }],
              },
            ]}
          >
            <View style={styles.modalGrip} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transaction History</Text>
              <TouchableOpacity onPress={closeHistory} style={styles.closeBtn}>
                <X size={20} color="#2A1F1F" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[...(user?.xpHistory || [])].reverse()}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.historyListContent}
              ListEmptyComponent={<View style={{ padding: 40, alignItems: 'center' }}><Text style={styles.emptyText}>No transaction history yet.</Text></View>}
              renderItem={({ item }: { item: XpRecord }) => {
                const isRedeem = (item.type || 'earn') === 'redeem';
                const itemAmountColor = isRedeem ? '#C2410C' : '#15803D'; // Orange / Green
                const itemIconBg = isRedeem ? '#FFF7ED' : '#DCFCE7';
                
                return (
                  <View style={styles.historyItem}>
                    <View style={[styles.historyIconBg, { backgroundColor: itemIconBg }]}>
                      {isRedeem ? <ArrowDownCircle size={18} color="#C2410C" /> : <ArrowUpCircle size={18} color="#15803D" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>{isRedeem ? 'Points Redeemed' : 'Points Earned'}</Text>
                      <Text style={styles.historyContext}>{item.context || (isRedeem ? 'Reward Redeem' : 'Drink Purchase')}</Text>
                      <Text style={styles.historyMeta}>{item.location || 'Gong Cha App'}</Text>
                      <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                    </View>
                    <Text style={[styles.historyAmount, { color: itemAmountColor }]}>{isRedeem ? '-' : '+'}{item.amount} XP</Text>
                  </View>
                );
              }}
            />
          </Animated.View>
        </View>
      </View>
    );
  };

  return (
    <ScreenFadeTransition>
      <View style={styles.root}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <DecorativeBackground />

        <View style={[styles.container, { paddingTop: insets.top + 4 }]}> 
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
          >
            {/* --- HEADER PROFILE --- */}
            <View style={styles.header}>
              <View style={styles.avatarContainer}>
                <UserAvatar
                  name={user?.name || 'Guest'}
                  photoURL={user?.photoURL}
                  size={avatarSize}
                />
                <TouchableOpacity 
                  style={styles.editBadge} 
                  onPress={() => navigation.navigate('EditProfile')}
                  activeOpacity={0.8}
                >
                  <Settings size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
              <Text style={styles.userPhone}>{user?.phoneNumber || '-'}</Text>
              
              {user?.role === 'admin' && (
                 <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>ADMIN MODE</Text>
                 </View>
              )}
            </View>

            {/* --- MENU SECTIONS --- */}
            <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
              <Text style={styles.sectionHeader}>Account</Text>

              <MenuItem
                icon={User}
                title="Edit Profile"
                subtitle="Name, Phone, Email & Photo"
                onPress={() => navigation.navigate('EditProfile')}
              />

              <MenuItem
                icon={History}
                title="Transaction History"
                subtitle="Check your earned points"
                onPress={openHistory}
              />

              <MenuItem
                icon={MapPin}
                title="Find a Store"
                subtitle="Locate nearest Gong Cha"
                onPress={() => navigation.navigate('StoreLocator')}
              />
            </View>

            {/* --- ADMIN GOD MODE PANEL --- */}
            {user?.role === 'admin' && (
              <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 }}>
                   <ShieldCheck size={18} color="#B91C2F" style={{ marginRight: 8 }} />
                   <Text style={[styles.sectionHeader, { marginBottom: 0, marginLeft: 0, color: '#B91C2F' }]}>
                      Admin / Debug Panel
                   </Text>
                </View>

                <MenuItem
                  icon={ArrowUpCircle}
                  title="Inject 5.000 XP"
                  subtitle="Instant Level Up"
                  onPress={async () => {
                    Alert.alert('Processing', 'Adding 5.000 XP...');
                    try {
                      await MockBackend.addTransaction(5000 * 100); 
                      await loadData();
                      Alert.alert('Success', '5.000 XP Added!');
                    } catch (e) {
                      Alert.alert('Error', 'Failed to inject XP');
                    }
                  }}
                />

                <MenuItem
                  icon={LogOut}
                  title="Reset Account Data"
                  subtitle="Wipe Data (Back to New User)"
                  isDestructive
                  onPress={() => {
                    Alert.alert(
                      'Reset Data?',
                      'This will wipe all points & history. You will become a new user.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'RESET DATA',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await MockBackend.resetData();
                              if (user?.phoneNumber) {
                                await MockBackend.initUser(user.phoneNumber);
                              }
                              await loadData();
                              Alert.alert('Reset Complete', 'Welcome back, new user!');
                            } catch (e) {
                              Alert.alert('Error', 'Failed to reset data');
                            }
                          },
                        },
                      ]
                    );
                  }}
                />

                <MenuItem
                  icon={ArrowDownCircle}
                  title="Test Notification"
                  subtitle="Trigger Local Push"
                  onPress={handleTestNotification}
                />
              </View>
            )}

            <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
              <Text style={styles.sectionHeader}>Support</Text>
              <MenuItem icon={HelpCircle} title="Help Center" onPress={() => {}} />
              <MenuItem icon={LogOut} title="Log Out" isDestructive onPress={handleLogout} />
            </View>

            <Text style={styles.versionText}>App Version 1.0.3</Text>
          </ScrollView>
        </View>

        <HistoryModal />
      </View>
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF8F0' },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  header: { alignItems: 'center', marginTop: 20, marginBottom: 24 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#2A1F1F', padding: 8, borderRadius: 20,
    borderWidth: 2, borderColor: '#FFF', elevation: 3,
  },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#2A1F1F' },
  userPhone: { fontSize: 14, color: '#8C7B75', marginTop: 4 },
  
  adminBadge: {
    marginTop: 8, backgroundColor: '#B91C2F', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6
  },
  adminBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

  menuSection: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#2A1F1F', marginBottom: 12, marginLeft: 4 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 10,
    elevation: 1, shadowColor: '#3A2E2A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600' },
  menuSubtitle: { fontSize: 12, color: '#8C7B75', marginTop: 2 },

  versionText: { textAlign: 'center', color: '#8C7B75', fontSize: 12, opacity: 0.5, marginBottom: 20 },

  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  inlineOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 60 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalBackdropTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21,17,17,0.3)' },
  bottomSheetCard: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', paddingBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 20,
  },
  modalGrip: { alignSelf: 'center', width: 44, height: 5, borderRadius: 999, backgroundColor: '#E5E7EB', marginTop: 10, marginBottom: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2A1F1F' },
  closeBtn: { padding: 8, backgroundColor: '#F5F5F5', borderRadius: 20 },
  historyListContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  emptyText: { textAlign: 'center', color: '#8C7B75', fontSize: 14 },
  historyItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9F9F9' },
  historyIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  historyTitle: { fontSize: 16, fontWeight: '600', color: '#2A1F1F' },
  historyContext: { fontSize: 13, color: '#6B5A55', marginTop: 2 },
  historyMeta: { fontSize: 12, color: '#9A8A85', marginTop: 1 },
  historyDate: { fontSize: 12, color: '#8C7B75', marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: '700', marginTop: 2 },
});