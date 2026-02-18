import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  View,
  Text,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Star, Ticket, X } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import { MockBackend } from '../services/MockBackend';
import { RewardItem, UserProfile, UserVoucher } from '../types/types';

type RewardsTab = 'catalog' | 'vouchers';

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [catalog, setCatalog] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RewardsTab>('catalog');
  const [selectedVoucher, setSelectedVoucher] = useState<UserVoucher | null>(null);
  const [voucherQrPayload, setVoucherQrPayload] = useState<string>('');
  const [useVoucherLoading, setUseVoucherLoading] = useState(false);
  const [isVoucherModalVisible, setIsVoucherModalVisible] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const rewardModalScale = useRef(new Animated.Value(0)).current;
  const rewardModalOpacity = useRef(new Animated.Value(0)).current;
  const isCompact = width < 360;
  const horizontalPadding = isCompact ? 16 : 20;

  const fetchData = async () => {
    try {
      const [userData, catalogData] = await Promise.all([MockBackend.getUser(), MockBackend.getCatalog()]);
      setUser(userData);
      setCatalog(catalogData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const handleRedeem = (reward: RewardItem) => {
    if (!user) return;

    if (user.currentPoints < reward.pointsCost) {
      Alert.alert('Poin Kurang', `Kamu butuh ${reward.pointsCost - user.currentPoints} poin lagi!`);
      return;
    }

    Alert.alert('Konfirmasi Redeem', `Tukar ${reward.pointsCost} poin untuk "${reward.title}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Tukar Sekarang',
        onPress: async () => {
          try {
            setRedeemingId(reward.id);
            const updatedUser = await MockBackend.redeemReward(reward.id);
            setUser(updatedUser);
            Alert.alert('Berhasil!', 'Voucher berhasil ditambahkan ke akunmu.');
          } catch (error: any) {
            Alert.alert('Gagal', error?.message || 'Terjadi kesalahan saat redeem.');
          } finally {
            setRedeemingId(null);
          }
        },
      },
    ]);
  };

  const getVoucherStatus = (voucher: UserVoucher): { label: string; color: string; bg: string } => {
    if (voucher.isUsed) {
      return { label: 'Used', color: '#6B7280', bg: '#E5E7EB' };
    }

    const isExpired = new Date(voucher.expiresAt).getTime() < Date.now();
    if (isExpired) {
      return { label: 'Expired', color: '#991B1B', bg: '#FEE2E2' };
    }

    return { label: 'Active', color: '#166534', bg: '#DCFCE7' };
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleUseVoucher = async (voucher: UserVoucher) => {
    const status = getVoucherStatus(voucher);
    if (status.label !== 'Active') {
      Alert.alert('Voucher tidak bisa digunakan', `Status voucher saat ini: ${status.label}.`);
      return;
    }

    try {
      setUseVoucherLoading(true);
      const payload = await MockBackend.getVoucherCheckoutPayload(voucher.id);
      setSelectedVoucher(voucher);
      setVoucherQrPayload(payload);
      setIsVoucherModalVisible(true);
    } catch (error: any) {
      Alert.alert('Gagal', error?.message || 'Tidak dapat menyiapkan voucher QR.');
    } finally {
      setUseVoucherLoading(false);
    }
  };

  const handleMarkVoucherUsed = async () => {
    if (!selectedVoucher) return;

    try {
      setUseVoucherLoading(true);
      const updatedUser = await MockBackend.markVoucherUsed(selectedVoucher.id);
      setUser(updatedUser);
      setIsVoucherModalVisible(false);
      setSelectedVoucher(null);
      setVoucherQrPayload('');
      Alert.alert('Voucher Used', 'Voucher sudah ditandai sebagai digunakan.');
    } catch (error: any) {
      Alert.alert('Gagal', error?.message || 'Tidak dapat mengubah status voucher.');
    } finally {
      setUseVoucherLoading(false);
    }
  };

  const openRewardDetail = (reward: RewardItem) => {
    setSelectedReward(reward);
    Animated.parallel([
      Animated.spring(rewardModalScale, {
        toValue: 1,
        friction: 6,
        tension: 52,
        useNativeDriver: true,
      }),
      Animated.timing(rewardModalOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeRewardDetail = () => {
    Animated.parallel([
      Animated.spring(rewardModalScale, {
        toValue: 0,
        friction: 8,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(rewardModalOpacity, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setSelectedReward(null));
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{activeTab === 'catalog' ? 'Rewards Catalog' : 'My Vouchers'}</Text>
      <Text style={styles.headerSubtitle}>
        {activeTab === 'catalog' ? 'Treat yourself with your points' : 'Track and use your redeemed vouchers'}
      </Text>

      <LinearGradient colors={['#2A1F1F', '#4A3B32']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
        <View>
          <Text style={styles.balanceLabel}>Your Points Balance</Text>
          <Text style={styles.balanceValue}>{user?.currentPoints.toLocaleString() || '0'}</Text>
        </View>
        <View style={styles.iconCircle}>
          <Star size={24} color="#D4A853" fill="#D4A853" />
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'catalog' && styles.activeTab]} onPress={() => setActiveTab('catalog')}>
          <Text style={activeTab === 'catalog' ? styles.activeTabText : styles.tabText}>All Rewards</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'vouchers' && styles.activeTab]} onPress={() => setActiveTab('vouchers')}>
          <Text style={activeTab === 'vouchers' ? styles.activeTabText : styles.tabText}>My Vouchers ({user?.vouchers?.length || 0})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: RewardItem }) => {
    const isAffordable = (user?.currentPoints || 0) >= item.pointsCost;
    const isProcessing = redeemingId === item.id;

    return (
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardTapArea} activeOpacity={0.8} onPress={() => openRewardDetail(item)}>
          <View style={styles.imageWrap}>
            <Image source={item.image} style={styles.image} resizeMode="contain" />
            <View style={styles.costBadge}>
              <Text style={styles.costText}>{item.pointsCost} Pts</Text>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.desc} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.cardRedeemButton, !isAffordable && styles.buttonDisabled, isProcessing && styles.buttonProcessing]}
          disabled={!isAffordable || isProcessing}
          onPress={() => handleRedeem(item)}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>{isAffordable ? 'Redeem' : 'Not Enough Pts'}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderVoucherItem = ({ item }: { item: UserVoucher }) => {
    const status = getVoucherStatus(item);
    const canUseVoucher = status.label === 'Active';

    return (
      <View style={styles.voucherCard}>
        <View style={styles.voucherTopRow}>
          <View style={styles.voucherTitleWrap}>
            <Ticket size={16} color="#B91C2F" />
            <Text style={styles.voucherTitle}>{item.title}</Text>
          </View>
          <View style={[styles.voucherStatusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.voucherStatusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <Text style={styles.voucherCode}>{item.code}</Text>

        <View style={styles.voucherMetaRow}>
          <Text style={styles.voucherMetaLabel}>Redeemed: {formatDate(item.redeemedAt)}</Text>
          <Text style={styles.voucherMetaLabel}>Expire: {formatDate(item.expiresAt)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.useVoucherButton, !canUseVoucher && styles.useVoucherButtonDisabled]}
          onPress={() => handleUseVoucher(item)}
          disabled={!canUseVoucher || useVoucherLoading}
        >
          <Text style={[styles.useVoucherButtonText, !canUseVoucher && styles.useVoucherButtonTextDisabled]}>
            {canUseVoucher ? 'Use at Cashier' : `Voucher ${status.label}`}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderVoucherEmptyState = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>Belum ada voucher</Text>
      <Text style={styles.emptySubtitle}>Tukar poin di tab All Rewards untuk mendapatkan voucher pertama kamu.</Text>
    </View>
  );

  return (
    <ScreenFadeTransition>
      <View style={styles.root}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <DecorativeBackground />

        <View style={[styles.container, { paddingTop: insets.top + 4 }]}> 
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#B91C2F" />
            </View>
          ) : activeTab === 'catalog' ? (
            <FlatList
              key="catalog-list"
              data={catalog}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              ListHeaderComponent={renderHeader}
              numColumns={2}
              contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding, paddingBottom: 120 + insets.bottom }]}
              columnWrapperStyle={styles.columnWrapper}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              key="voucher-list"
              data={user?.vouchers || []}
              keyExtractor={(item) => item.id}
              renderItem={renderVoucherItem}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={renderVoucherEmptyState}
              contentContainerStyle={[styles.voucherListContent, { paddingHorizontal: horizontalPadding, paddingBottom: 120 + insets.bottom }]}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <Modal
          visible={!!selectedReward}
          transparent
          animationType="none"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          onRequestClose={closeRewardDetail}
        >
          <TouchableWithoutFeedback onPress={closeRewardDetail}>
            <Animated.View style={[styles.rewardModalOverlay, { opacity: rewardModalOpacity }]}> 
              <BlurView intensity={20} style={StyleSheet.absoluteFillObject}> 
                <View style={styles.rewardModalOverlayContent}> 
                  <TouchableWithoutFeedback>
                    <Animated.View style={[styles.rewardModalContent, { transform: [{ scale: rewardModalScale }] }]}> 
                      {selectedReward && (
                        <>
                          <TouchableOpacity style={styles.rewardModalClose} onPress={closeRewardDetail}>
                            <X size={22} color="#2A1F1F" />
                          </TouchableOpacity>

                          <View style={styles.rewardModalImageWrap}>
                            <Image source={selectedReward.image} style={styles.rewardModalImage} resizeMode="contain" />
                            <View style={styles.rewardModalCostBadge}>
                              <Text style={styles.rewardModalCostText}>{selectedReward.pointsCost} Pts</Text>
                            </View>
                          </View>

                          <Text style={styles.rewardModalTitle}>{selectedReward.title}</Text>
                          <Text style={styles.rewardModalCategory}>{selectedReward.category}</Text>
                          <Text style={styles.rewardModalDesc}>{selectedReward.description}</Text>

                          <TouchableOpacity
                            style={[
                              styles.rewardModalRedeem,
                              ((user?.currentPoints || 0) < selectedReward.pointsCost || redeemingId === selectedReward.id) && styles.buttonDisabled,
                            ]}
                            disabled={(user?.currentPoints || 0) < selectedReward.pointsCost || redeemingId === selectedReward.id}
                            onPress={() => handleRedeem(selectedReward)}
                          >
                            {redeemingId === selectedReward.id ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <Text style={styles.rewardModalRedeemText}>
                                {(user?.currentPoints || 0) >= selectedReward.pointsCost ? 'Redeem Now' : 'Not Enough Pts'}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </>
                      )}
                    </Animated.View>
                  </TouchableWithoutFeedback>
                </View>
              </BlurView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={isVoucherModalVisible}
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          onRequestClose={() => setIsVoucherModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setIsVoucherModalVisible(false)} />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Scan Voucher at Cashier</Text>
              <Text style={styles.modalSubtitle}>{selectedVoucher?.title || 'Voucher'}</Text>

              <View style={styles.modalQrWrap}>
                {voucherQrPayload ? (
                  <QRCode value={voucherQrPayload} size={170} backgroundColor="transparent" color="#2A1F1F" />
                ) : (
                  <ActivityIndicator size="large" color="#B91C2F" />
                )}
              </View>

              <Text style={styles.modalCodeLabel}>{selectedVoucher?.code || '-'}</Text>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setIsVoucherModalVisible(false)}>
                  <Text style={styles.modalSecondaryText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleMarkVoucherUsed} disabled={useVoucherLoading}>
                  {useVoucherLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalPrimaryText}>Mark as Used</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF8F0', position: 'relative' },
  container: { flex: 1, backgroundColor: 'transparent', zIndex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#2A1F1F' },
  headerSubtitle: { fontSize: 14, color: '#8C7B75', marginTop: 4, marginBottom: 20 },
  balanceCard: {
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 5,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  balanceValue: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: { flexDirection: 'row', marginBottom: 10 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 10 },
  activeTab: { backgroundColor: '#B91C2F' },
  tabText: { color: '#8C7B75', fontWeight: '600' },
  activeTabText: { color: '#FFF', fontWeight: 'bold' },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  voucherListContent: { paddingHorizontal: 20, paddingBottom: 120 },
  columnWrapper: { justifyContent: 'space-between' },
  card: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#2A1F1F',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  cardTapArea: {
    width: '100%',
  },
  imageWrap: {
    height: 140,
    backgroundColor: '#FFF5E1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  image: { width: '80%', height: '80%' },
  costBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  costText: { fontSize: 12, fontWeight: 'bold', color: '#B91C2F' },
  content: { padding: 12 },
  title: { fontSize: 14, fontWeight: 'bold', color: '#2A1F1F', marginBottom: 4 },
  desc: { fontSize: 11, color: '#8C7B75', marginBottom: 12, height: 32 },
  button: {
    backgroundColor: '#B91C2F',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: '#E5E7EB' },
  buttonProcessing: { backgroundColor: '#8E1624' },
  buttonText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  cardRedeemButton: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  rewardModalOverlay: {
    flex: 1,
  },
  rewardModalOverlayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  rewardModalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFF8F0',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F3E9DC',
    alignItems: 'center',
  },
  rewardModalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardModalImageWrap: {
    width: '100%',
    height: 190,
    borderRadius: 18,
    backgroundColor: '#FFF5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  rewardModalImage: {
    width: '76%',
    height: '76%',
  },
  rewardModalCostBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rewardModalCostText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B91C2F',
  },
  rewardModalTitle: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: '800',
    color: '#2A1F1F',
    textAlign: 'center',
  },
  rewardModalCategory: {
    marginTop: 4,
    fontSize: 12,
    color: '#8C7B75',
    fontWeight: '600',
  },
  rewardModalDesc: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B5B54',
    textAlign: 'center',
    lineHeight: 19,
  },
  rewardModalRedeem: {
    marginTop: 16,
    width: '100%',
    backgroundColor: '#B91C2F',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardModalRedeemText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  voucherCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1E6DA',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#2A1F1F',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  voucherTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  voucherTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  voucherTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A1F1F',
    flex: 1,
  },
  voucherStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  voucherStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  voucherCode: {
    marginTop: 10,
    fontSize: 18,
    letterSpacing: 1,
    fontWeight: '800',
    color: '#B91C2F',
  },
  voucherMetaRow: {
    marginTop: 8,
    gap: 2,
  },
  voucherMetaLabel: {
    color: '#8C7B75',
    fontSize: 11,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A1F1F',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: '#8C7B75',
    textAlign: 'center',
    lineHeight: 18,
  },
  useVoucherButton: {
    marginTop: 10,
    backgroundColor: '#B91C2F',
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useVoucherButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  useVoucherButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  useVoucherButtonTextDisabled: {
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFF8F0',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F3E9DC',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2A1F1F',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#8C7B75',
    marginTop: 4,
    textAlign: 'center',
  },
  modalQrWrap: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFE8E1',
  },
  modalCodeLabel: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '800',
    color: '#B91C2F',
    letterSpacing: 1,
  },
  modalActions: {
    marginTop: 16,
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  modalSecondaryBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6CEC6',
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalSecondaryText: {
    color: '#6B7280',
    fontWeight: '700',
  },
  modalPrimaryBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#B91C2F',
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
