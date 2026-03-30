// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Pressable, Platform, StatusBar, ScrollView, Dimensions,
  Image, Animated, Easing, NativeSyntheticEvent, NativeScrollEvent, TouchableWithoutFeedback,
  Modal, SectionList, ActivityIndicator, TextInput, KeyboardAvoidingView 
} from 'react-native';
import { QrCode, TrendingUp, Users, Ticket, Crown, X, ChevronRight, Activity, Calendar, Filter, ScanLine, ArrowLeft, Star, ShoppingBag, Banknote, Smartphone, Clock, CheckCircle2, MapPin, Store, RefreshCcw, LogOut, AlertCircle, ChevronLeft } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';

// --- IMPORT ZUSTAND & FIREBASE ---
import { useCashierStore } from '../store/useCashierStore';
import { doc, getDoc, getDocs, collection, query, where, onSnapshot } from 'firebase/firestore';
import { firestoreDb } from '../config/firebase';

const { width, height } = Dimensions.get('window');

const DESIGN = {
  canvas: '#F2F2F7', surface: '#FFFFFF', surfaceDark: '#1C1C1E', textPrimary: '#000000',
  textSecondary: '#8A8A8E', textLight: '#F5F5F7', brandRed: '#D3232A', glowRed: 'rgba(211, 35, 42, 0.4)',
  border: 'rgba(0,0,0,0.03)', gold: '#D4AF37', goldLight: '#F9F1D8', receiptPaper: '#FDFBF7', 
  successGreen: '#32D74B', outstandingOrange: '#FF9F0A',
};

type TabOption = 'HOME' | 'HISTORY' | 'PROFILE';
const TABS: TabOption[] = ['HOME', 'HISTORY', 'PROFILE'];
const TAB_TRACK_PADDING = 4;
const SCREEN_PADDING = 24;
const TAB_TRACK_WIDTH = width - (SCREEN_PADDING * 2);
const TAB_SEGMENT_WIDTH = (TAB_TRACK_WIDTH - (TAB_TRACK_PADDING * 2)) / TABS.length;

type ModalType = 'REVENUE' | 'MEMBERS' | 'TIERS' | 'PROMOS' | 'RECEIPT' | null; 
type HistorySubTab = 'TRANSACTIONS' | 'REDEMPTIONS'; 
type AlertType = 'success' | 'error' | 'info';

const formatRupiah = (angka: number) => angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const normalizeTransaction = (data: any) => {
  const type = typeof data.type === 'string' ? data.type.toUpperCase() : '';
  const memberUid = data.uid || data.memberId || data.userId || null;
  const status = typeof data.status === 'string' ? data.status.toUpperCase() : '';
  const pointsState =
    typeof data.pointsState === 'string'
      ? data.pointsState.toUpperCase()
      : status === 'PENDING'
        ? 'PENDING'
        : memberUid && (data.pointsEarned ?? data.potentialPoints ?? 0) > 0
          ? 'AVAILABLE'
          : 'NONE';

  return {
    ...data,
    type,
    status,
    uid: memberUid,
    memberId: memberUid,
    posTransactionId: data.posTransactionId || data.receiptNumber || data.id,
    cashierName: data.cashierName || data.staffName || data.staffId || '-',
    pointsEarned: data.pointsEarned ?? data.potentialPoints ?? 0,
    pointsState,
  };
};

const getMemberVouchers = (userData: any) => {
  if (Array.isArray(userData?.vouchers) && userData.vouchers.length > 0) {
    return userData.vouchers;
  }

  if (Array.isArray(userData?.activeVouchers) && userData.activeVouchers.length > 0) {
    return userData.activeVouchers;
  }

  return Array.isArray(userData?.vouchers) ? userData.vouchers : Array.isArray(userData?.activeVouchers) ? userData.activeVouchers : [];
};

const isMemberLikeUser = (userData: any) => {
  const role = typeof userData?.role === 'string' ? userData.role.toLowerCase() : '';
  return !['admin', 'master', 'manager', 'staff', 'super_admin'].includes(role);
};

const SquishyBento = ({ onPress, style, children }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => { Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, friction: 6 }).start(); };
  const handlePressOut = () => { Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start(); };
  return ( <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}><Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View></TouchableWithoutFeedback> );
};

// --- 🔥 THE APPLE-STYLE POP MODAL ---
const PopModal = ({ visible, onClose, children, keyboardPadding = false }: any) => {
  const [show, setShow] = useState(visible);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShow(true);
      Animated.spring(anim, { toValue: 1, friction: 8, tension: 65, useNativeDriver: true }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShow(false));
    }
  }, [visible]);

  if (!show) return null;

  const content = (
    <View style={styles.voucherModalOverlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim }]}>
           <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        </Animated.View>
      </TouchableWithoutFeedback>
      
      <Animated.View pointerEvents="box-none" style={[styles.voucherModalContainer, { opacity: anim, transform: [ { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }, { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) } ] }]}>
        {children}
      </Animated.View>
    </View>
  );

  return <Modal transparent visible={show} animationType="none" onRequestClose={onClose}>{keyboardPadding ? (<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>{content}</KeyboardAvoidingView>) : content}</Modal>;
};

// --- SCANNER OVERLAY ---
const ScannerOverlay = ({ visible, onClose, onSuccessScan }: { visible: boolean, onClose: () => void, onSuccessScan: (data: string) => void }) => {
  const insets = useSafeAreaInsets();
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) { setScanned(false); Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start(); } 
    else { Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(); }
  }, [visible]);

  const handleBarcodeScanned = ({ type, data }: { type: string, data: string }) => { if (scanned) return; setScanned(true); onSuccessScan(data); };
  if (!visible) return null;

  return (
    <Animated.View style={[styles.scannerContainer, { opacity: opacityAnim }]}> 
      <View style={styles.cameraLayer}>
         {(!permission || !permission.granted) ? (
            <View style={styles.noCameraBox}>
              <Text style={{color: 'white', marginBottom: 20}}>Akses Kamera Diperlukan</Text>
              <Pressable style={styles.permissionBtn} onPress={requestPermission}><Text style={styles.permissionBtnText}>Izinkan Akses</Text></Pressable>
            </View>
         ) : ( <CameraView style={StyleSheet.absoluteFillObject} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={scanned ? undefined : handleBarcodeScanned} /> )}
      </View>
      <View style={styles.darkHoleOverlay} pointerEvents="none" />
      <View style={styles.viewfinderCenterFrame} pointerEvents="none"><View style={styles.viewfinderHole} /></View>
      <View style={styles.scannerUIContainer} pointerEvents="box-none">
        <View style={[styles.scannerHeaderGrid, { marginTop: Platform.OS === 'android' ? insets.top + 20 : insets.top || 20 }]}> 
          <View style={styles.scannerHeaderLeft}><Pressable style={styles.scannerCloseBtn} onPress={onClose}><X size={22} color={DESIGN.surface} /></Pressable></View>
          <View style={styles.scannerHeaderCenter}><View style={styles.scannerBadgePill}><ScanLine size={14} color={DESIGN.surface} style={{marginRight: 6}} /><Text style={styles.scannerBadgeText}>Scanner</Text></View></View>
          <View style={styles.scannerHeaderRight} />
        </View>
        <View style={[styles.scannerFooter, { marginBottom: insets.bottom + 40 }]}> 
          <Text style={styles.scannerInstruction}>Arahkan kamera ke QR Profil atau Voucher Pelanggan</Text>
        </View>
      </View>
    </Animated.View>
  );
};

// --- REAKTIF MEMBER PAGE ---
const MemberDetailPage = ({ visible, onClose, onShowAlert }: { visible: boolean, onClose: () => void, onShowAlert: (msg: string, type: AlertType) => void }) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(width)).current; 
  const bgOpacity = useRef(new Animated.Value(0)).current;

  const storeState: any = useCashierStore();
  const activeMember = storeState.activeMember;
  const staff = storeState.staff;
  const processTransaction = storeState.processTransaction;
  const setScannedVoucher = storeState.setScannedVoucher; 

  const [isTrxModalVisible, setTrxModalVisible] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [posTrxId, setPosTrxId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [isCharging, setIsCharging] = useState(false);
  const [duplicateReceiptWarning, setDuplicateReceiptWarning] = useState('');
  const [isCheckingDuplicateReceipt, setIsCheckingDuplicateReceipt] = useState(false);
  const [memberHistory, setMemberHistory] = useState<any[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);

  const potentialPoints = amountStr ? Math.floor(parseInt(amountStr.replace(/\D/g, ''), 10) / 1000) : 0;

  useEffect(() => {
    if (visible) {
      Animated.parallel([ Animated.spring(slideAnim, { toValue: 0, friction: 10, tension: 65, useNativeDriver: true }), Animated.timing(bgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }) ]).start();
      fetchMemberHistory();
    } else {
      Animated.parallel([ Animated.spring(slideAnim, { toValue: width, friction: 10, tension: 65, useNativeDriver: true }), Animated.timing(bgOpacity, { toValue: 0, duration: 250, useNativeDriver: true }) ]).start();
      setTrxModalVisible(false); setIsConfirming(false); setPosTrxId(''); setAmountStr(''); setDuplicateReceiptWarning(''); setMemberHistory([]); setSelectedHistoryItem(null);
    }
  }, [visible, activeMember?.uid]);

  useEffect(() => {
    if (duplicateReceiptWarning) {
      setDuplicateReceiptWarning('');
    }
  }, [posTrxId]);

  const fetchMemberHistory = async () => {
    if (!activeMember?.uid || !staff?.assignedStoreId) return;
    try {
      const storeSnap = await getDocs(
        query(
          collection(firestoreDb, 'transactions'),
          where('storeId', '==', staff.assignedStoreId)
        )
      );

      const data = storeSnap.docs
        .map((transactionDoc) =>
          normalizeTransaction({ id: transactionDoc.id, ...(transactionDoc.data() as any) })
        )
        .filter((item: any) => {
          const relatedUid = item.uid || item.userId || item.memberId;
          return relatedUid === activeMember.uid;
        });

      data.sort((a, b) => { const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0; const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0; return timeB - timeA; });
      setMemberHistory(data.slice(0, 10)); 
    } catch (e) {
      console.error('Failed to fetch member history:', e);
    }
  };

  const handleChargeSubmit = async () => {
    const amount = parseInt(amountStr.replace(/\D/g, ''), 10);
    if (duplicateReceiptWarning) {
      return;
    }
    if (!posTrxId.trim()) {
      onShowAlert("Receipt / POS transaction ID wajib diisi.", "error");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      onShowAlert("Total transaksi harus lebih dari 0.", "error");
      return;
    }
    setIsCharging(true);
    try {
      await processTransaction(amount, posTrxId.trim(), true); 
      const successMessage = potentialPoints > 0
        ? `Transaksi terekam. +${potentialPoints} poin masuk ke pending dan menunggu verifikasi admin.`
        : 'Transaksi terekam tanpa poin loyalty karena nominal belum memenuhi syarat.';
      setTrxModalVisible(false); onClose(); onShowAlert(successMessage, 'success');
    } catch (error: any) {
      if (/sudah pernah diinput/i.test(error?.message || '')) {
        setDuplicateReceiptWarning(error.message);
        return;
      }
      onShowAlert(error?.message || "Gagal memproses transaksi. Periksa koneksi internet.", "error");
    } finally { setIsCharging(false); }
  };

  const handleOpenTransactionConfirmation = async () => {
    if (!posTrxId.trim()) return onShowAlert("Masukkan Receipt ID!", "error");
    if (!amountStr) return onShowAlert("Masukkan Nominal!", "error");
    if (!staff?.assignedStoreId) return onShowAlert("Store kasir tidak ditemukan.", "error");

    setIsCheckingDuplicateReceipt(true);
    try {
      const hasDuplicateReceipt = await TransactionService.hasTodayReceipt(
        staff.assignedStoreId,
        posTrxId.trim()
      );

      setDuplicateReceiptWarning(
        hasDuplicateReceipt
          ? `Receipt ID ${posTrxId.trim()} sudah pernah dipakai hari ini. Gunakan ID transaksi yang berbeda.`
          : ''
      );
      setIsConfirming(true);
    } catch (error) {
      onShowAlert("Gagal memverifikasi Receipt ID. Periksa koneksi internet.", "error");
    } finally {
      setIsCheckingDuplicateReceipt(false);
    }
  };

  if (!activeMember) return null;

  return (
    <Animated.View style={[styles.pageContainer, { transform: [{ translateX: slideAnim }] }, !visible ? { pointerEvents: 'none' } : {} ]}>
      <Animated.View style={[styles.pageBackground, { opacity: bgOpacity }]} />
      <View style={[styles.floatingHeader, { top: insets.top + 10 }]}> <Pressable style={styles.floatingBackPill} onPress={onClose}><ArrowLeft size={20} color={DESIGN.textPrimary} strokeWidth={2.5} /></Pressable></View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.pageScroll, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 140 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.digitalCard}>
          <View style={styles.digitalCardHeader}>
            <View><Text style={styles.cardBrandText}>GONG CHA</Text><Text style={styles.cardSubText}>MEMBER</Text></View>
            <View style={styles.cardTierBadge}><Crown size={12} color={DESIGN.surfaceDark} strokeWidth={3} style={{marginRight: 4}} /><Text style={styles.cardTierText}>{activeMember.tier || 'Silver'}</Text></View>
          </View>
          <View style={styles.digitalCardBody}>
            <Text style={styles.cardMemberName}>{activeMember.name || 'Pelanggan'}</Text><Text style={styles.cardMemberID}>UID: {activeMember.uid}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
           <View style={[styles.statBox, {width: '100%'}]}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                 <View><View style={styles.statIconGold}><Star size={20} color={DESIGN.gold} /></View><Text style={styles.statLabel}>Total Poin Tersedia</Text></View>
                 <Text style={[styles.statValue, {fontSize: 32}]}>{formatRupiah(activeMember.points || 0)}</Text>
              </View>
              <Text style={{color: DESIGN.textSecondary, fontSize: 13, marginTop: 12, lineHeight: 18}}>Setiap kelipatan Rp 1.000 otomatis dikonversi menjadi 1 Poin. Poin dapat ditukar dengan voucher katalog.</Text>
           </View>
        </View>

        <Text style={styles.sectionHeading}>Voucher Pelanggan</Text>
        <View style={styles.rewardContainer}>
           {activeMember.vouchers?.filter((v: any) => !v.isUsed).length > 0 ? (
             activeMember.vouchers.filter((v: any) => !v.isUsed).map((v: any) => (
                <View key={v.id} style={styles.ticketCard}>
                   <View style={styles.ticketLeft}><Text style={styles.ticketTitle}>{v.title}</Text><Text style={styles.ticketSub}>Exp: {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '-'}</Text></View>
                   <View style={styles.ticketDivider} />
                   <Pressable style={styles.ticketRight} onPress={() => setScannedVoucher(v)}><Text style={styles.ticketActionText}>Redeem</Text></Pressable>
                </View>
             ))
           ) : ( <Text style={{color: DESIGN.textSecondary, fontStyle: 'italic', marginBottom: 16}}>Belum ada voucher aktif yang dimiliki.</Text> )}
        </View>

        <Text style={[styles.sectionHeading, {marginTop: 16}]}>Riwayat Aktivitas</Text>
        {memberHistory.length > 0 ? memberHistory.map((item: any) => (
            <Pressable key={item.id} style={({pressed}) => [styles.historyRow, pressed && {transform: [{scale: 0.98}], backgroundColor: 'rgba(0,0,0,0.02)'}]} onPress={() => setSelectedHistoryItem(item)}>
               <View style={[styles.historyIconBox, item.type === 'REDEEM' && {backgroundColor: 'rgba(211, 35, 42, 0.05)'}]}>
                  {item.type === 'REDEEM' ? <Ticket size={20} color={DESIGN.brandRed}/> : <ShoppingBag size={20} color={DESIGN.textPrimary}/>}
               </View>
               <View style={styles.historyInfo}>
                  <Text style={styles.historyTrxId}>{item.type === 'REDEEM' ? (item.voucherTitle || 'Voucher') : (item.posTransactionId || item.id)}</Text>
                  <Text style={styles.historyDetails}>{item.createdAt?.toDate ? new Date(item.createdAt.toDate()).toLocaleDateString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) : '-'} • {item.type}</Text>
               </View>
               <View style={styles.historyTotalBox}>
                  {item.type === 'EARN' ? (
                    <>
                      <Text style={styles.historyTotalText}>Rp {formatRupiah(item.totalAmount || 0)}</Text>
                      <Text style={[
                        styles.historyPointText,
                        {
                          marginTop: 4,
                          color: item.pointsState === 'PENDING' ? DESIGN.outstandingOrange : DESIGN.successGreen,
                          fontSize: 12,
                        },
                      ]}>
                        +{item.pointsEarned || 0} Pts{item.pointsState === 'PENDING' ? ' (Pending)' : ''}
                      </Text>
                    </>
                  ) : ( <Text style={[styles.historyTotalText, {color: DESIGN.brandRed, fontSize: 13}]}>REDEEMED</Text> )}
                </View>
            </Pressable>
        )) : ( <Text style={{color: DESIGN.textSecondary, fontStyle: 'italic', marginBottom: 24}}>Belum ada riwayat transaksi.</Text> )}
      </ScrollView>

      <View style={[styles.stickyBottomBar, { paddingBottom: insets.bottom || 24 }]}> 
         <Pressable style={({ pressed }) => [ styles.primaryActionBtn, pressed && { transform: [{ scale: 0.96 }] } ]} onPress={() => {setTrxModalVisible(true); setIsConfirming(false);}}>
            <ShoppingBag size={20} color={DESIGN.surface} style={{marginRight: 8}} />
            <Text style={styles.primaryActionText}>Record Transaction</Text>
         </Pressable>
      </View>

      <PopModal visible={selectedHistoryItem !== null} onClose={() => setSelectedHistoryItem(null)}>
        <View style={styles.historyDetailCard}>
          <View style={styles.historyDetailPill} />
          <View style={styles.historyDetailHeader}>
            <View style={[styles.historyDetailIconBox, selectedHistoryItem?.type === 'REDEEM' ? { backgroundColor: 'rgba(211,35,42,0.1)' } : { backgroundColor: DESIGN.canvas }]}>
              {selectedHistoryItem?.type === 'REDEEM' ? <Ticket size={20} color={DESIGN.brandRed} strokeWidth={2} /> : <ShoppingBag size={20} color={DESIGN.textPrimary} strokeWidth={2} />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.historyDetailTitle}>{selectedHistoryItem?.type === 'REDEEM' ? 'Voucher Redeemed' : 'Purchase'}</Text>
              <Text style={styles.historyDetailDate}>{selectedHistoryItem?.createdAt?.toDate ? new Date(selectedHistoryItem.createdAt.toDate()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</Text>
            </View>
            <Pressable style={styles.historyDetailClose} onPress={() => setSelectedHistoryItem(null)}>
              <X size={16} color={DESIGN.textSecondary} strokeWidth={2.5} />
            </Pressable>
          </View>
          {selectedHistoryItem?.type === 'EARN' && (
            <View style={styles.historyDetailAmountBox}>
              <Text style={styles.historyDetailAmountLabel}>TOTAL BELANJA</Text>
              <Text style={styles.historyDetailAmount}>Rp {formatRupiah(selectedHistoryItem?.totalAmount || 0)}</Text>
            </View>
          )}
          {selectedHistoryItem?.type === 'REDEEM' && (
            <View style={[styles.historyDetailAmountBox, { backgroundColor: 'rgba(211,35,42,0.06)' }]}>
              <Text style={[styles.historyDetailAmountLabel, { color: DESIGN.brandRed }]}>VOUCHER</Text>
              <Text style={[styles.historyDetailAmount, { color: DESIGN.brandRed, fontSize: 20 }]} numberOfLines={1}>{selectedHistoryItem?.voucherTitle || '-'}</Text>
            </View>
          )}
          <View style={styles.historyDetailRows}>
            <View style={styles.historyDetailRow}>
              <Text style={styles.historyDetailLabel}>Receipt ID</Text>
              <Text style={styles.historyDetailValue}>{selectedHistoryItem?.posTransactionId || selectedHistoryItem?.id || '-'}</Text>
            </View>
            <View style={styles.historyDetailRow}>
              <Text style={styles.historyDetailLabel}>Kasir</Text>
              <Text style={styles.historyDetailValue}>{selectedHistoryItem?.cashierName || '-'}</Text>
            </View>
            {selectedHistoryItem?.type === 'EARN' && selectedHistoryItem?.pointsEarned > 0 && (
              <View style={[styles.historyDetailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.historyDetailLabel}>Poin</Text>
                <Text style={[
                  styles.historyDetailValue,
                  selectedHistoryItem?.pointsState === 'PENDING' ? { color: DESIGN.outstandingOrange } : { color: DESIGN.successGreen }
                ]}>
                  +{selectedHistoryItem?.pointsEarned} pts{selectedHistoryItem?.pointsState === 'PENDING' ? ' (pending)' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>
      </PopModal>

      <PopModal visible={isTrxModalVisible} onClose={() => setTrxModalVisible(false)} keyboardPadding={true}>
         <View style={styles.voucherModalCardInner}>
            {isConfirming ? (
               <View style={{alignItems: 'center', width: '100%'}}>
                  <AlertCircle size={48} color={DESIGN.outstandingOrange} style={{marginBottom: 16}} />
                  <Text style={styles.voucherModalTitle}>Konfirmasi Transaksi</Text>
                  <Text style={{textAlign: 'center', color: DESIGN.textSecondary, marginBottom: 24, fontSize: 14, lineHeight: 20}}>Pastikan data benar. Total: <Text style={{fontWeight: 'bold', color: DESIGN.textPrimary}}>Rp {amountStr}</Text>.{'\n'}Pelanggan akan mendapat <Text style={{fontWeight: 'bold', color: DESIGN.successGreen}}>+{potentialPoints} Poin</Text>.</Text>
                  {duplicateReceiptWarning ? (
                    <View style={styles.transactionWarningBox}>
                      <AlertCircle size={18} color={DESIGN.outstandingOrange} style={{marginRight: 10, marginTop: 2}} />
                      <Text style={styles.transactionWarningText}>{duplicateReceiptWarning}</Text>
                    </View>
                  ) : null}
                  <View style={styles.voucherModalBtnRow}>
                    <Pressable style={styles.voucherModalBtnCancel} onPress={() => setIsConfirming(false)}><Text style={styles.voucherModalBtnCancelText}>Kembali</Text></Pressable>
                    <Pressable style={[styles.voucherModalBtnRedeem, {backgroundColor: duplicateReceiptWarning ? DESIGN.border : DESIGN.successGreen}]} onPress={handleChargeSubmit} disabled={isCharging || Boolean(duplicateReceiptWarning)}>{isCharging ? <ActivityIndicator color="#FFF"/> : <Text style={styles.voucherModalBtnRedeemText}>Proses</Text>}</Pressable>
                  </View>
               </View>
            ) : (
               <View style={{width: '100%'}}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                     <Text style={[styles.voucherModalTitle, {marginBottom: 0}]}>Input Transaksi</Text>
                     <Pressable onPress={() => setTrxModalVisible(false)}><X size={22} color={DESIGN.textSecondary}/></Pressable>
                  </View>
                  <Text style={styles.inputLabel}>POS Receipt ID</Text>
                  <TextInput
                    style={styles.trxInput}
                    placeholder="e.g. 103606"
                    placeholderTextColor={DESIGN.textSecondary}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    value={posTrxId}
                    onChangeText={(text) => setPosTrxId(text.replace(/\D/g, ''))}
                  />
                  <Text style={[styles.inputLabel, {marginTop: 16}]}>Nominal Belanja (Rp)</Text>
                  <TextInput style={styles.trxInput} placeholder="e.g. 45000" placeholderTextColor={DESIGN.textSecondary} keyboardType="numeric" value={amountStr} onChangeText={(t) => setAmountStr(formatRupiah(parseInt(t.replace(/\D/g, ''))||0))} />
                  {amountStr ? ( <View style={{backgroundColor: 'rgba(50, 215, 75, 0.1)', padding: 12, borderRadius: 12, marginTop: 16, alignItems: 'center'}}><Text style={{color: DESIGN.successGreen, fontWeight: '800', fontSize: 14}}>Potensi Poin: +{potentialPoints} Pts</Text></View> ) : null}
                  <View style={[styles.voucherModalBtnRow, {marginTop: 24}]}>
                    <Pressable style={[styles.voucherModalBtnRedeem, {backgroundColor: DESIGN.textPrimary, width: '100%'}]} onPress={handleOpenTransactionConfirmation} disabled={isCheckingDuplicateReceipt}>
                       {isCheckingDuplicateReceipt ? <ActivityIndicator color="#FFF" /> : <Text style={styles.voucherModalBtnRedeemText}>Lanjut Konfirmasi</Text>}
                    </Pressable>
                  </View>
               </View>
            )}
         </View>
      </PopModal>
    </Animated.View>
  );
};

export default function CashierDashboard() {
  const insets = useSafeAreaInsets();
  const [syncStatus, setSyncStatus] = useState<"live" | "updated" | "offline" | "error">("live");
  const [activeTab, setActiveTab] = useState<number>(0);
  const [historyTab, setHistoryTab] = useState<HistorySubTab>('TRANSACTIONS');
  const [selectedTrx, setSelectedTrx] = useState<any>(null); 
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isMemberPageVisible, setIsMemberPageVisible] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);

  const storeState: any = useCashierStore();
  const { staff, syncData, logout, scannedVoucher, setScannedVoucher, redeemVoucher } = storeState;
  
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [storeName, setStoreName] = useState('Loading Store...');

  // --- 🔥 STATE REAL-TIME DASHBOARD ---
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  const [selectedFilterDate, setSelectedFilterDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMounted, setDatePickerMounted] = useState(false);
  const datePickerAnim = useRef(new Animated.Value(0)).current;

  // Status pill morph animation
  const STATUS_ORDER = { live: 0, updated: 1, offline: 2, error: 3 } as const;
  const statusMorphAnim = useRef(new Animated.Value(0)).current;
  const pillTextOpacity = useRef(new Animated.Value(1)).current;
  const [pillLabel, setPillLabel] = useState<string>('LIVE');

  const [dailyStats, setDailyStats] = useState({
     revenue: 0, transactions: 0, memberVisits: 0, 
     membersList: [] as any[], promos: [] as any[], 
     hourlyChart: [] as number[], maxHourValue: 0,
     tiers: { gold: 0, silver: 0, platinum: 0 }, topTier: 'Silver' as 'Silver' | 'Gold' | 'Platinum'
  });

  const [todayStats, setTodayStats] = useState({
     revenue: 0, transactions: 0, memberVisits: 0, 
     membersList: [] as any[], promos: [] as any[], 
     hourlyChart: [] as number[], maxHourValue: 0,
     tiers: { gold: 0, silver: 0, platinum: 0 }, topTier: 'Silver' as 'Silver' | 'Gold' | 'Platinum'
  });

  const [historyLists, setHistoryLists] = useState({ transactions: [] as any[], redemptions: [] as any[] });

  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; message: string; type: AlertType }>({ visible: false, message: '', type: 'error' });
  const alertOpacity = useRef(new Animated.Value(0)).current;
  const alertTranslateY = useRef(new Animated.Value(-50)).current;

  // 1. FETCH MURNI DARI FIREBASE 
  useEffect(() => {
    if (!staff) return;
    setStoreName(staff.name || 'Unknown Store');

    const q = query(collection(firestoreDb, 'transactions'), where('storeId', '==', staff.assignedStoreId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
       const docs = snapshot.docs.map(d => normalizeTransaction({ id: d.id, ...d.data() }));
       setRawTransactions(docs);
       setSyncStatus('live');
    }, () => setSyncStatus('error'));

    return () => unsubscribe();
  }, [staff]);

  // 2. COMPUTE DATA BERDASARKAN TANGGAL YANG DIPILIH
  useEffect(() => {
     const computeStats = async () => {
        let rev = 0; let trxCount = 0; 
        let membersMap = new Map(); let promosMap = new Map(); let memberTiersMap = new Map();
        let allTrx: any[] = []; let allRedeem: any[] = [];
        let hourlyData = new Array(24).fill(0);

        const startOfDay = new Date(selectedFilterDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedFilterDate); endOfDay.setHours(23, 59, 59, 999);

        rawTransactions.forEach(data => {
           if (!data.createdAt?.toDate) return;
           const trxDate = data.createdAt.toDate();

           if (data.type === 'EARN') {
              allTrx.push({
                id: data.id, posTransactionId: data.posTransactionId, type: data.type, cashierName: data.cashierName, storeId: data.storeId,
                time: trxDate.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}), dateStr: trxDate.toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}), timestamp: trxDate.getTime(), createdAt: data.createdAt,
                totalAmount: data.totalAmount, total: `Rp ${formatRupiah(data.totalAmount || 0)}`, member: data.memberName || null, memberId: data.uid || data.memberId || null,
                pointsEarned: data.pointsEarned || 0, pointStatus: data.pointsState || 'NONE', items: 1, status: data.status
              });
           } else if (data.type === 'REDEEM') {
              allRedeem.push({
                id: data.id, posTransactionId: data.posTransactionId, type: data.type, cashierName: data.cashierName, storeId: data.storeId,
                time: trxDate.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}), dateStr: trxDate.toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}), timestamp: trxDate.getTime(), createdAt: data.createdAt,
                voucherTitle: data.voucherTitle || 'Voucher', member: data.memberName || 'Pelanggan',
              });
           }

           // Kalkulasi Statistik Bento khusus Tanggal Terpilih
           if (trxDate >= startOfDay && trxDate <= endOfDay) {
              if (data.type === 'EARN') {
                 rev += (data.totalAmount || 0); trxCount += 1;
                 const hour = trxDate.getHours();
                 hourlyData[hour] += (data.totalAmount || 0);
                 const memberUid = data.uid || data.memberId;
                 if (memberUid) membersMap.set(memberUid, { name: data.memberName, time: trxDate });
              } else if (data.type === 'REDEEM') {
                 const title = data.voucherTitle || 'Voucher';
                 promosMap.set(title, (promosMap.get(title) || 0) + 1);
              }
           }
        });

        allTrx.sort((a,b) => b.timestamp - a.timestamp);
        allRedeem.sort((a,b) => b.timestamp - a.timestamp);

        const groupData = (list: any[]) => {
           const map = new Map();
           list.forEach(item => { if(!map.has(item.dateStr)) map.set(item.dateStr, []); map.get(item.dateStr).push(item); });
           return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
        };
        setHistoryLists({ transactions: groupData(allTrx), redemptions: groupData(allRedeem) });

        // Fetch member tier data for unique memberIds
        const uniqueMemberIds = Array.from(membersMap.keys());
        if (uniqueMemberIds.length > 0) {
           try {
              const tierPromises = uniqueMemberIds.map(memberId =>
                 getDoc(doc(firestoreDb, 'users', memberId)).then(snap => {
                    if (snap.exists()) {
                       const tierVal = snap.data()?.tier || 'Silver';
                       return { memberId, tier: tierVal, found: true };
                    }
                    return { memberId, tier: 'Silver', found: false };
                 }).catch((err) => {
                    console.warn(`Failed to fetch tier for ${memberId}:`, err);
                    return { memberId, tier: 'Silver', found: false };
                 })
              );
              const tiers = await Promise.all(tierPromises);
              tiers.forEach(({ memberId, tier }) => memberTiersMap.set(memberId, tier));
           } catch (err) {
              console.error('Error fetching member tiers:', err);
           }
        }

        const totalMem = membersMap.size;
        const goldCount = Array.from(memberTiersMap.values()).filter(t => t === 'Gold').length;
        const silverCount = Array.from(memberTiersMap.values()).filter(t => t === 'Silver').length;
        const platinumCount = Array.from(memberTiersMap.values()).filter(t => t === 'Platinum').length;
        const topTier = platinumCount > goldCount ? (platinumCount > silverCount ? 'Platinum' : 'Silver') : (goldCount > silverCount ? 'Gold' : 'Silver');

        setDailyStats({
           revenue: rev, transactions: trxCount, memberVisits: totalMem, 
           membersList: Array.from(membersMap.values()).sort((a, b) => b.time - a.time), 
           promos: Array.from(promosMap.entries()).map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count),
           hourlyChart: hourlyData, maxHourValue: Math.max(...hourlyData, 1),
           tiers: { gold: goldCount, silver: silverCount, platinum: platinumCount },
           topTier: topTier
        });
     };

     computeStats();
  }, [rawTransactions, selectedFilterDate]);

  // 3. COMPUTE TODAY'S STATS (for bento card — always today regardless of selectedFilterDate)
  useEffect(() => {
     const computeTodayStats = async () => {
        let rev = 0; let trxCount = 0; 
        let membersMap = new Map(); let promosMap = new Map(); let memberTiersMap = new Map();
        let hourlyData = new Array(24).fill(0);

        const today = new Date();
        const startOfToday = new Date(today); startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(today); endOfToday.setHours(23, 59, 59, 999);

        rawTransactions.forEach(data => {
           if (!data.createdAt?.toDate) return;
           const trxDate = data.createdAt.toDate();

           if (trxDate >= startOfToday && trxDate <= endOfToday) {
              if (data.type === 'EARN') {
                 rev += (data.totalAmount || 0); trxCount += 1;
                 const hour = trxDate.getHours();
                 hourlyData[hour] += (data.totalAmount || 0);
                 const memberUid = data.uid || data.memberId;
                 if (memberUid) membersMap.set(memberUid, { name: data.memberName, time: trxDate });
              } else if (data.type === 'REDEEM') {
                 const title = data.voucherTitle || 'Voucher';
                 promosMap.set(title, (promosMap.get(title) || 0) + 1);
              }
           }
        });

        // Fetch member tier data for unique memberIds
        const uniqueMemberIds = Array.from(membersMap.keys());
        if (uniqueMemberIds.length > 0) {
           try {
              const tierPromises = uniqueMemberIds.map(memberId =>
                 getDoc(doc(firestoreDb, 'users', memberId)).then(snap => {
                    if (snap.exists()) {
                       const tierVal = snap.data()?.tier || 'Silver';
                       return { memberId, tier: tierVal, found: true };
                    }
                    return { memberId, tier: 'Silver', found: false };
                 }).catch((err) => {
                    console.warn(`Failed to fetch tier for ${memberId}:`, err);
                    return { memberId, tier: 'Silver', found: false };
                 })
              );
              const tiers = await Promise.all(tierPromises);
              tiers.forEach(({ memberId, tier }) => memberTiersMap.set(memberId, tier));
           } catch (err) {
              console.error('Error fetching member tiers for today:', err);
           }
        }

        const totalMem = membersMap.size;
        const goldCount = Array.from(memberTiersMap.values()).filter(t => t === 'Gold').length;
        const silverCount = Array.from(memberTiersMap.values()).filter(t => t === 'Silver').length;
        const platinumCount = Array.from(memberTiersMap.values()).filter(t => t === 'Platinum').length;
        const topTier = platinumCount > goldCount ? (platinumCount > silverCount ? 'Platinum' : 'Silver') : (goldCount > silverCount ? 'Gold' : 'Silver');

        setTodayStats({
           revenue: rev, transactions: trxCount, memberVisits: totalMem, 
           membersList: Array.from(membersMap.values()).sort((a, b) => b.time - a.time), 
           promos: Array.from(promosMap.entries()).map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count),
           hourlyChart: hourlyData, maxHourValue: Math.max(...hourlyData, 1),
           tiers: { gold: goldCount, silver: silverCount, platinum: platinumCount },
           topTier: topTier
        });
     };

     computeTodayStats();
  }, [rawTransactions]);

  const showCustomAlert = (message: string, type: AlertType = 'error') => {
    setAlertConfig({ visible: true, message, type });
    Animated.parallel([ Animated.timing(alertOpacity, { toValue: 1, duration: 250, useNativeDriver: true }), Animated.spring(alertTranslateY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }) ]).start();
    setTimeout(() => { Animated.parallel([ Animated.timing(alertOpacity, { toValue: 0, duration: 200, useNativeDriver: true }), Animated.timing(alertTranslateY, { toValue: -50, duration: 200, useNativeDriver: true }) ]).start(() => setAlertConfig(prev => ({ ...prev, visible: false }))); }, 3000);
  };

  const handleSimulateScan = async (data: string) => {
    setIsScannerVisible(false); 
    try {
      let targetUid = data; let scannedVoucherCode: string | null = null;
      if (data.startsWith('VOUCHER:')) { const parts = data.split(':'); if (parts.length === 3) { targetUid = parts[1]; scannedVoucherCode = parts[2]; } } 
      else if (data.startsWith('{')) { try { const parsed = JSON.parse(data); if (parsed.uid) targetUid = parsed.uid; if (parsed.voucherCode) scannedVoucherCode = parsed.voucherCode; } catch(e) {} }

      const userDocRef = doc(firestoreDb, 'users', targetUid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData: any = userDocSnap.data();
        if (isMemberLikeUser(userData)) {
          const memberVouchers = getMemberVouchers(userData);
          storeState.setActiveMember({ uid: targetUid, name: userData.name || 'Member Tanpa Nama', phone: userData.phoneNumber || '-', points: userData.currentPoints || userData.points || 0, tier: userData.tier || 'Silver', walletBalance: 0, vouchers: memberVouchers });
          setIsMemberPageVisible(true); 
          if (scannedVoucherCode) {
             const foundVoucher = memberVouchers?.find((v: any) => v.code === scannedVoucherCode);
             if (foundVoucher) {
                if (foundVoucher.isUsed) { showCustomAlert(`Voucher "${foundVoucher.title}" sudah dipakai!`, "error"); } 
                else { setTimeout(() => { setScannedVoucher(foundVoucher); }, 400); }
             } else { showCustomAlert("Voucher tidak valid.", "error"); }
          } else { showCustomAlert("Profil Pelanggan berhasil dimuat.", "success"); }
        } else { showCustomAlert("QR Code ini bukan milik Pelanggan.", "error"); }
      } else { showCustomAlert("Pelanggan tidak ditemukan.", "error"); }
    } catch (error) { showCustomAlert("Terjadi kesalahan jaringan.", "error"); }
  };

  const handleConfirmRedeem = async () => {
    setIsRedeeming(true);
    try {
      await redeemVoucher();
      showCustomAlert("Voucher berhasil di-mark as used!", "success");
    } catch (e: any) { showCustomAlert(e?.message || "Gagal redeem voucher.", "error"); } 
    finally { setIsRedeeming(false); }
  };

  // --- 🔥 CONTAINER TRANSFORM ANIMATION SYSTEM ---
  const morphAnim = useRef(new Animated.Value(0)).current;       // layout: left/top/width/height/radius
  const contentOpacity = useRef(new Animated.Value(0)).current;  // content inside — fades in after expand
  const backdropAnim = useRef(new Animated.Value(0)).current;    // backdrop blur + card opacity
  const [bentoOrigin, setBentoOrigin] = useState({ x: 0, y: 0, w: width - 48, h: 180 });

  // Bento button refs for morph-from-origin
  const revenueBentoRef = useRef<any>(null);
  const membersBentoRef = useRef<any>(null);
  const tiersBentoRef = useRef<any>(null);
  const promosBentoRef = useRef<any>(null);

  const spinAnim = useRef(new Animated.Value(0)).current; const flatListRef = useRef<Animated.FlatList<any>>(null); const scrollX = useRef(new Animated.Value(0)).current;

  const getGreeting = () => { const hour = new Date().getHours(); if (hour < 12) return 'Good Morning,'; if (hour < 15) return 'Good Afternoon,'; if (hour < 19) return 'Good Evening,'; return 'Good Night,'; };
  const handleTabPress = (index: number) => { setActiveTab(index); flatListRef.current?.scrollToIndex({ index, animated: true }); };
  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => { const offsetX = event.nativeEvent.contentOffset.x; const newIndex = Math.round(offsetX / width); if (newIndex !== activeTab) setActiveTab(newIndex); };
  const tabTranslateX = scrollX.interpolate({ inputRange: [0, width, width * 2], outputRange: [0, TAB_SEGMENT_WIDTH, TAB_SEGMENT_WIDTH * 2], extrapolate: 'clamp' });
  const pillBg = statusMorphAnim.interpolate({ inputRange: [0, 1, 2, 3], outputRange: ['#34C759', '#007AFF', '#FF9500', '#FF3B30'] });

  useEffect(() => {
    if (showDatePicker) {
      Animated.spring(datePickerAnim, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true }).start();
    } else {
      Animated.timing(datePickerAnim, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => setDatePickerMounted(false));
    }
  }, [showDatePicker]);

  // Status pill morph: smooth color interpolation + text cross-fade
  useEffect(() => {
    Animated.spring(statusMorphAnim, {
      toValue: STATUS_ORDER[syncStatus],
      useNativeDriver: false,
      tension: 90,
      friction: 10,
    }).start();
    Animated.timing(pillTextOpacity, { toValue: 0, duration: 80, useNativeDriver: true }).start(() => {
      setPillLabel(syncStatus === 'live' ? 'LIVE' : syncStatus === 'updated' ? 'UPDATED' : syncStatus === 'offline' ? 'OFFLINE' : 'ERROR');
      Animated.timing(pillTextOpacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    });
  }, [syncStatus]);

  const openDatePicker = () => { setDatePickerMounted(true); setShowDatePicker(true); };
  const closeDatePicker = () => setShowDatePicker(false);

  const openModal = (type: ModalType, bentoRef?: React.RefObject<any>) => {
    setShowDatePicker(false); setDatePickerMounted(false); datePickerAnim.setValue(0);

    const doOpen = (ox: number, oy: number, ow: number, oh: number) => {
      // Pre-reset all values before Modal mounts
      morphAnim.setValue(0);
      contentOpacity.setValue(0);
      backdropAnim.setValue(0);
      setBentoOrigin({ x: ox, y: oy, w: ow, h: oh });
      setActiveModal(type);

      // Double rAF: wait 2 paint cycles so the native Modal layer commits
      // the invisible first frame before we start animating
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Run native-driver and JS-driver animations separately — never mix in parallel/sequence
          Animated.spring(morphAnim, { toValue: 1, friction: 7, tension: 50, useNativeDriver: false }).start();
          Animated.timing(backdropAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
          // Content fades in after card has mostly expanded
          setTimeout(() => {
            Animated.timing(contentOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
          }, 220);
        });
      });
    };

    if (bentoRef?.current) {
      bentoRef.current.measure((fx: number, fy: number, bw: number, bh: number, px: number, py: number) => {
        if (bw === 0 && Platform.OS === 'android') {
          setTimeout(() => bentoRef.current?.measure((_fx: number, _fy: number, _bw: number, _bh: number, _px: number, _py: number) => {
            doOpen(_px, _py, _bw, _bh);
          }), 50);
        } else {
          doOpen(px, py, bw, bh);
        }
      });
    } else {
      doOpen(24, height / 2 - 90, width - 48, 180);
    }
  };

  const closeModal = () => {
    setShowDatePicker(false); setDatePickerMounted(false); datePickerAnim.setValue(0);
    // Step 1: fade content out (native driver)
    Animated.timing(contentOpacity, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => {
      // Step 2: shrink card (JS driver) + fade backdrop (native driver) — run separately, not in parallel()
      Animated.timing(morphAnim, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => setActiveModal(null));
      Animated.timing(backdropAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    });
  };

  const handleSyncDatabase = async () => { spinAnim.setValue(0); setSyncStatus('updated'); Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })).start(); try { await syncData(); setSyncStatus('live'); } catch (err) { setSyncStatus('error'); } finally { Animated.timing(spinAnim, { toValue: 0, duration: 300, useNativeDriver: true }).stop(); } };
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // --- 🔥 RENDER NAVIGASI FILTER TANGGAL (BISA DI-KLIK) ---
  const renderFilterBar = () => {
    const isToday = new Date().toDateString() === selectedFilterDate.toDateString();
    const dateStr = selectedFilterDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    
    return (
      <View style={styles.filterBarContainer} pointerEvents="auto">
        <Pressable 
          style={styles.dateArrowBtn} 
          onPress={() => setSelectedFilterDate(d => new Date(d.getTime() - 86400000))} 
          hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
        >
           <ChevronLeft size={24} color={DESIGN.textPrimary} />
        </Pressable>

        <Pressable 
          style={styles.datePickerPill} 
          onPress={() => openDatePicker()} 
          hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
        >
          <Calendar size={16} color={DESIGN.textPrimary} style={{marginRight: 8}} />
          <Text style={styles.datePickerText}>{isToday ? 'Today, ' : ''}{dateStr}</Text>
        </Pressable>

        <Pressable 
          style={[styles.dateArrowBtn, isToday && {opacity: 0.3}]} 
          disabled={isToday} 
          onPress={() => setSelectedFilterDate(d => new Date(d.getTime() + 86400000))} 
          hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
        >
           <ChevronRight size={24} color={DESIGN.textPrimary} />
        </Pressable>
      </View>
    );
  };

  // --- � RENDER REVENUE BAR CHART (per jam) ---
  const renderRevenueChart = () => {
    const displayHours = [8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];
    const maxVal = dailyStats.maxHourValue || 1;
    const fmtShort = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`;

    const peakHour = displayHours.reduce((best, h) =>
      (dailyStats.hourlyChart[h] || 0) > (dailyStats.hourlyChart[best] || 0) ? h : best,
      displayHours[0]
    );
    const peakVal = dailyStats.hourlyChart[peakHour] || 0;
    const totalHoursActive = displayHours.filter(h => (dailyStats.hourlyChart[h] || 0) > 0).length;

    return (
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: DESIGN.textSecondary, letterSpacing: 0.2, marginBottom: 2 }}>REVENUE PER JAM</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: DESIGN.textSecondary }}>
              {totalHoursActive > 0 ? `${totalHoursActive} jam aktif` : 'Belum ada data'}
            </Text>
          </View>
          {peakVal > 0 && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: DESIGN.textSecondary }}>Peak Hour</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: DESIGN.brandRed, letterSpacing: -0.3 }}>
                {peakHour < 12 ? `${peakHour}:00 AM` : `${peakHour > 12 ? peakHour - 12 : 12}:00 PM`} · Rp {fmtShort(peakVal)}
              </Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 3 }}>
          {displayHours.map(h => {
            const val = dailyStats.hourlyChart[h] || 0;
            const barH = val > 0 ? Math.max(5, Math.round((val / maxVal) * 80)) : 3;
            const isPeak = h === peakHour && val > 0;
            const hasVal = val > 0;
            return (
              <View key={h} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                {isPeak && (
                  <Text style={{ fontSize: 8, fontWeight: '800', color: DESIGN.brandRed, marginBottom: 3, letterSpacing: -0.2 }}>
                    {fmtShort(val)}
                  </Text>
                )}
                <View style={{
                  width: '100%',
                  height: barH,
                  backgroundColor: isPeak ? DESIGN.brandRed : hasVal ? `${DESIGN.brandRed}35` : `${DESIGN.canvas}`,
                  borderRadius: 3,
                }} />
              </View>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', marginTop: 5, gap: 3 }}>
          {displayHours.map((h, i) => (
            <Text key={h} style={{ flex: 1, fontSize: 8.5, fontWeight: '600', color: DESIGN.textSecondary, textAlign: 'center' }}>
              {i % 3 === 0 ? `${h}` : ''}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  const renderModalContent = () => {
    if (!activeModal) return null;

    const totalTierCount = dailyStats.tiers.gold + dailyStats.tiers.silver + dailyStats.tiers.platinum;
    const totalTiers = Math.max(1, totalTierCount);
    const goldP = totalTiers > 0 ? Math.round((dailyStats.tiers.gold / totalTiers) * 100) : 0;
    const silverP = totalTiers > 0 ? Math.round((dailyStats.tiers.silver / totalTiers) * 100) : 0;
    const platP = totalTiers > 0 ? Math.round((dailyStats.tiers.platinum / totalTiers) * 100) : 0;

    const accentColor = activeModal === 'REVENUE' ? DESIGN.brandRed : activeModal === 'MEMBERS' ? '#5E6AD2' : activeModal === 'TIERS' ? DESIGN.gold : '#FF9F0A';
    const modalTitle = activeModal === 'REVENUE' ? 'Revenue' : activeModal === 'MEMBERS' ? 'Member Visits' : activeModal === 'TIERS' ? 'Tier Distribution' : 'Top Promos';
    const modalSub = activeModal === 'REVENUE' ? `Rp ${formatRupiah(dailyStats.revenue)} · ${dailyStats.transactions} trx` : activeModal === 'MEMBERS' ? `${dailyStats.memberVisits} scans recorded` : activeModal === 'TIERS' ? `${totalTiers} total members` : `${dailyStats.promos.length} promo types`;

    return (
      <>
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={selectedFilterDate}
            mode="date"
            display="default"
            onChange={(e: any, d?: Date) => {
              closeDatePicker();
              if (d) setSelectedFilterDate(d);
            }}
          />
        )}
        {Platform.OS === 'ios' && datePickerMounted && (
          <>
            <TouchableWithoutFeedback onPress={closeDatePicker}>
              <Animated.View style={{
                ...StyleSheet.absoluteFillObject,
                zIndex: 999,
                backgroundColor: '#000',
                opacity: datePickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.28] }),
              }} />
            </TouchableWithoutFeedback>
            <Animated.View style={[
              styles.datePickerOverlay,
              {
                transform: [{ translateY: datePickerAnim.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }) }],
                opacity: datePickerAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
              }
            ]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderColor: DESIGN.canvas }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: DESIGN.textPrimary }}>Pilih Tanggal</Text>
                <Pressable onPress={closeDatePicker} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: DESIGN.brandRed, fontWeight: '700', fontSize: 15 }}>Selesai</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={selectedFilterDate}
                mode="date"
                display="spinner"
                onChange={(e: any, d?: Date) => {
                  if (d) setSelectedFilterDate(d);
                }}
              />
            </Animated.View>
          </>
        )}

        <View style={styles.floatingModalHeader}>
          <View style={[styles.floatingModalIconBox, { backgroundColor: `${accentColor}18` }]}>
            {activeModal === 'REVENUE' && <TrendingUp color={accentColor} size={20} />}
            {activeModal === 'MEMBERS' && <Users color={accentColor} size={20} />}
            {activeModal === 'TIERS' && <Crown color={accentColor} size={20} />}
            {activeModal === 'PROMOS' && <Ticket color={accentColor} size={20} />}
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.floatingModalTitle}>{modalTitle}</Text>
            <Text style={styles.floatingModalSub} numberOfLines={1}>{modalSub}</Text>
          </View>
          <Pressable style={styles.floatingModalCloseBtn} onPress={closeModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={16} color={DESIGN.textSecondary} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.floatingModalDivider} />
        {renderFilterBar()}
        <View style={styles.floatingModalDivider} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.floatingModalBody} bounces={true}>
          {activeModal === 'REVENUE' && (
            <View>
              <View style={styles.dummyChartBox}>{renderRevenueChart()}</View>
              <View style={styles.kpiRow}>
                <View style={styles.kpiBox}><Text style={styles.kpiLabel}>Avg. Order Value</Text><Text style={styles.kpiValue}>Rp {formatRupiah(dailyStats.transactions > 0 ? Math.floor(dailyStats.revenue / dailyStats.transactions) : 0)}</Text></View>
                <View style={styles.kpiBox}><Text style={styles.kpiLabel}>Total Transactions</Text><Text style={styles.kpiValue}>{dailyStats.transactions}</Text></View>
              </View>
            </View>
          )}
          {activeModal === 'MEMBERS' && (
            <View>
              {dailyStats.membersList.length > 0 ? dailyStats.membersList.slice(0, 10).map((m, i) => (
                <View key={i} style={styles.memberListItem}>
                  <View style={styles.memberAvatar}><Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>{m.name ? m.name.charAt(0).toUpperCase() : 'M'}</Text></View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.memberName}>{m.name || 'Pelanggan'}</Text>
                  </View>
                  <Text style={styles.memberTimeBadge}>{m.time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              )) : <Text style={{ color: DESIGN.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingVertical: 24 }}>Belum ada member tercatat.</Text>}
            </View>
          )}
          {activeModal === 'TIERS' && (
            <View style={{ gap: 14 }}>
              {[
                { label: 'Gold', count: dailyStats.tiers.gold, pct: goldP, color: DESIGN.gold },
                { label: 'Silver', count: dailyStats.tiers.silver, pct: silverP, color: DESIGN.textSecondary },
                { label: 'Platinum', count: dailyStats.tiers.platinum, pct: platP, color: '#A855F7' },
              ].map(({ label, count, pct, color }) => (
                <View key={label} style={styles.tierStatRow}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                      <Text style={styles.tierStatLabel}>{label}</Text>
                    </View>
                    <Text style={styles.tierStatCount}>{count} members · {pct}%</Text>
                  </View>
                  <View style={styles.tierBarContainer}>
                    <View style={[styles.tierBar, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                </View>
              ))}
            </View>
          )}
          {activeModal === 'PROMOS' && (
            <View>
              {dailyStats.promos.length > 0 ? dailyStats.promos.map((p, i) => (
                <View key={i} style={styles.promoCardModal}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.promoTitle} numberOfLines={1}>{p.title}</Text>
                    <Text style={styles.promoCount}>{p.count} Redeemed</Text>
                  </View>
                  <View style={styles.promoCountBadge}>
                    <Text style={styles.promoCountBadgeText}>{p.count}</Text>
                  </View>
                </View>
              )) : <Text style={{ color: DESIGN.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingVertical: 24 }}>Belum ada promo yang diredeem.</Text>}
            </View>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      </>
    );
  };

  const renderPage = ({ item }: { item: TabOption }) => {
    return (
      <View style={{ width, height: '100%' }}>
        {item === 'HOME' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.bentoContainer}>
              <View ref={revenueBentoRef} collapsable={false}>
                <SquishyBento onPress={() => openModal('REVENUE', revenueBentoRef)} style={styles.heroBlackCard}>
                  <View style={styles.heroTop}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: DESIGN.brandRed }} />
                      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '600', letterSpacing: 0.8 }}>TODAY'S REVENUE</Text>
                    </View>
                    <TrendingUp size={18} color='rgba(255,255,255,0.25)' strokeWidth={2} />
                  </View>
                  <View style={styles.heroBottom}>
                    <Text style={styles.heroValue}><Text style={styles.currency}>Rp</Text> {formatRupiah(todayStats.revenue)}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '500', marginTop: 6 }}>{todayStats.transactions} transactions recorded</Text>
                  </View>
                </SquishyBento>
              </View>

              <View style={styles.bentoRow}>
                <View ref={membersBentoRef} style={{ flex: 1 }} collapsable={false}>
                  <SquishyBento onPress={() => openModal('MEMBERS', membersBentoRef)} style={[styles.bentoBox, styles.bentoBoxSmall]}>
                    <View style={{ flex: 1, justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={styles.bentoLabel}>Member Visits</Text>
                        <Users size={15} color={DESIGN.textSecondary} strokeWidth={2} />
                      </View>
                      <View>
                        <Text style={styles.bentoValue}>{dailyStats.memberVisits}</Text>
                        <Text style={{ fontSize: 11, color: DESIGN.textSecondary, fontWeight: '500', marginTop: 2 }}>{dailyStats.memberVisits === 1 ? 'member today' : 'members today'}</Text>
                      </View>
                    </View>
                  </SquishyBento>
                </View>
                <View ref={tiersBentoRef} style={{ flex: 1 }} collapsable={false}>
                  <SquishyBento onPress={() => openModal('TIERS', tiersBentoRef)} style={[styles.bentoBox, styles.bentoBoxSmall]}>
                    {(() => {
                      const total = todayStats.tiers.gold + todayStats.tiers.silver + todayStats.tiers.platinum;
                      const goldP = total > 0 ? (todayStats.tiers.gold / total) * 100 : 0;
                      const silverP = total > 0 ? (todayStats.tiers.silver / total) * 100 : 0;
                      const platP = total > 0 ? (todayStats.tiers.platinum / total) * 100 : 0;
                      return (
                        <View style={{ flex: 1, justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.bentoLabel}>Member Tiers</Text>
                            <Crown size={14} color={DESIGN.gold} strokeWidth={2} />
                          </View>
                          <View style={{ gap: 6 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: DESIGN.gold }} />
                                <Text style={{ fontSize: 11, fontWeight: '500', color: DESIGN.textSecondary }}>Gold</Text>
                              </View>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: DESIGN.textPrimary, letterSpacing: -0.3 }}>{todayStats.tiers.gold}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#B0B0B0' }} />
                                <Text style={{ fontSize: 11, fontWeight: '500', color: DESIGN.textSecondary }}>Silver</Text>
                              </View>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: DESIGN.textPrimary, letterSpacing: -0.3 }}>{todayStats.tiers.silver}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#A855F7' }} />
                                <Text style={{ fontSize: 11, fontWeight: '500', color: DESIGN.textSecondary }}>Platinum</Text>
                              </View>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: DESIGN.textPrimary, letterSpacing: -0.3 }}>{todayStats.tiers.platinum}</Text>
                            </View>
                          </View>
                          <View style={{ height: 4, borderRadius: 2, flexDirection: 'row', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.06)', gap: 1 }}>
                            {total > 0 ? (
                              <>
                                {goldP > 0 && <View style={{ flex: goldP, backgroundColor: DESIGN.gold }} />}
                                {silverP > 0 && <View style={{ flex: silverP, backgroundColor: '#B0B0B0' }} />}
                                {platP > 0 && <View style={{ flex: platP, backgroundColor: '#A855F7' }} />}
                              </>
                            ) : <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />}
                          </View>
                        </View>
                      );
                    })()}
                  </SquishyBento>
                </View>
              </View>

              <View ref={promosBentoRef} collapsable={false}>
                <SquishyBento onPress={() => openModal('PROMOS', promosBentoRef)} style={[styles.bentoBox, styles.bentoBoxWide]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                    <View style={{ flex: 1, marginRight: 16 }}>
                      <Text style={styles.bentoLabel}>Top Redeemed Promo</Text>
                      <Text style={[styles.wideBoxTitle, { marginTop: 6 }]} numberOfLines={1}>{dailyStats.promos.length > 0 ? dailyStats.promos[0].title : 'No promo today'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', minWidth: 40 }}>
                      <Ticket size={18} color={DESIGN.textSecondary} strokeWidth={1.5} />
                      {dailyStats.promos.length > 0 && <Text style={{ fontSize: 18, fontWeight: '900', color: DESIGN.textPrimary, marginTop: 4, letterSpacing: -0.5 }}>{dailyStats.promos[0].count}×</Text>}
                    </View>
                  </View>
                </SquishyBento>
              </View>
              <View style={{ height: 120 }} />
            </View>
          </ScrollView>
        )}

        {item === 'HISTORY' && (
          <View style={{ flex: 1, backgroundColor: DESIGN.canvas }}>
             <View style={styles.subTabContainer}>
                <View style={styles.subTabTrack}>
                   <Pressable onPress={() => setHistoryTab('TRANSACTIONS')} style={[styles.subTabItem, historyTab === 'TRANSACTIONS' && styles.subTabActive]}><Text style={[styles.subTabText, historyTab === 'TRANSACTIONS' && styles.subTabTextActive]}>Transactions</Text></Pressable>
                   <Pressable onPress={() => setHistoryTab('REDEMPTIONS')} style={[styles.subTabItem, historyTab === 'REDEMPTIONS' && styles.subTabActive]}><Text style={[styles.subTabText, historyTab === 'REDEMPTIONS' && styles.subTabTextActive]}>Redemptions</Text></Pressable>
                </View>
             </View>

             <SectionList<any, any> 
                sections={historyTab === 'TRANSACTIONS' ? historyLists.transactions : historyLists.redemptions}
                keyExtractor={(item: any) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}
                stickySectionHeadersEnabled={true}
                ListEmptyComponent={() => <Text style={{textAlign: 'center', marginTop: 40, color: DESIGN.textSecondary, fontStyle: 'italic'}}>Belum ada riwayat terekam.</Text>}
                renderSectionHeader={({ section }) => (<View style={styles.historySectionHeader}><Text style={styles.historySectionText}>{section.title}</Text></View>)}
                renderItem={({ item }) => {
                  if (historyTab === 'TRANSACTIONS') {
                    return (
                      <Pressable style={({pressed}) => [styles.historyRow, pressed && { backgroundColor: 'rgba(0,0,0,0.02)', transform: [{scale: 0.98}] }]} onPress={() => setSelectedHistoryItem(item)}>
                        <View style={styles.historyIconBox}>
                          <ShoppingBag size={17} color={DESIGN.textPrimary} strokeWidth={2} />
                        </View>
                        <View style={styles.historyInfo}>
                          <Text style={styles.historyTrxId} numberOfLines={1}>{item.posTransactionId || item.id}</Text>
                          <Text style={styles.historyDetails}>{item.time}{item.member ? ` · ${item.member}` : ' · Anonym'}</Text>
                        </View>
                        <View style={styles.historyTotalBox}>
                          <Text style={styles.historyTotalText}>{item.total}</Text>
                          {item.pointsEarned > 0 && (
                            <View style={[
                              styles.historyPointBadge,
                              item.pointStatus === 'AVAILABLE' && { backgroundColor: 'rgba(50,215,75,0.1)' },
                              item.pointStatus === 'PENDING' && { backgroundColor: 'rgba(255,159,10,0.12)' },
                            ]}>
                              <Text style={[
                                styles.historyPointTextBadge,
                                item.pointStatus === 'AVAILABLE' && { color: DESIGN.successGreen },
                                item.pointStatus === 'PENDING' && { color: DESIGN.outstandingOrange },
                              ]}>
                                +{item.pointsEarned} pts {item.pointStatus === 'PENDING' ? '· Pending' : ''}
                              </Text>
                            </View>
                          )}
                        </View>
                      </Pressable>
                    );
                  } else {
                    return (
                      <Pressable style={({pressed}) => [styles.historyRow, styles.historyRedeemRow, pressed && { backgroundColor: 'rgba(0,0,0,0.02)', transform: [{scale: 0.98}] }]} onPress={() => setSelectedHistoryItem(item)}>
                        <View style={[styles.historyIconBox, { backgroundColor: 'rgba(211,35,42,0.07)' }]}>
                          <Ticket size={17} color={DESIGN.brandRed} strokeWidth={2} />
                        </View>
                        <View style={[styles.historyInfo, styles.historyRedeemInfo]}>
                          <Text style={styles.historyRedeemTitle} numberOfLines={1} ellipsizeMode="tail">{item.voucherTitle}</Text>
                          <Text style={styles.historyRedeemDetails} numberOfLines={1} ellipsizeMode="tail">{item.time}{item.member ? ` · ${item.member}` : ''}</Text>
                        </View>
                        <View style={styles.historyRedeemBadge}>
                          <Text style={styles.historyRedeemBadgeText}>REDEEM</Text>
                        </View>
                      </Pressable>
                    );
                  }
                }}
             />
          </View>
        )}

        {item === 'PROFILE' && (
             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.profileContainer}>
                <View style={styles.profileHero}>
                   <View style={styles.profileAvatarBox}><Store size={40} color={DESIGN.textPrimary} /></View>
                   <Text style={[styles.locationTitle, { fontSize: storeName.length > 22 ? 18 : 24, maxWidth: width - 80, textAlign: 'center', marginBottom: 8 }]} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.7}>{storeName}</Text>
                   <View style={styles.profileStatusBadge}><View style={styles.statusDot} /><Text style={styles.statusText}>System Connected</Text></View>
                </View>

                <Text style={styles.sectionHeading}>System Actions</Text>
                <View style={styles.profileActionGroup}>
                   <Pressable style={({pressed}) => [styles.profileActionRow, pressed && {backgroundColor: DESIGN.canvas}]} onPress={handleSyncDatabase}>
                      <View style={styles.profileActionLeft}>
                         <View style={styles.actionIconBox}><Animated.View style={{ transform: [{ rotate: spin }] }}><RefreshCcw size={20} color={DESIGN.textPrimary} /></Animated.View></View>
                         <Text style={styles.actionText}>Sync Database</Text>
                      </View>
                      <ChevronRight size={20} color={DESIGN.border} />
                   </Pressable>
                   <View style={styles.actionDivider} />
                   <Pressable style={({pressed}) => [styles.profileActionRow, pressed && {backgroundColor: DESIGN.canvas}]} onPress={logout}>
                      <View style={styles.profileActionLeft}>
                         <View style={[styles.actionIconBox, {backgroundColor: 'rgba(211, 35, 42, 0.1)'}]}><LogOut size={20} color={DESIGN.brandRed} /></View>
                         <Text style={[styles.actionText, {color: DESIGN.brandRed}]}>Logout Terminal</Text>
                      </View>
                   </Pressable>
                </View>
                <Text style={styles.appVersionText}>App Version 1.0.4 (Build 82)</Text>
             </ScrollView>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={DESIGN.canvas} />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require('../../assets/images/logo1.webp')} style={styles.headerLogo} resizeMode="contain" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.eyebrow}>{getGreeting()}</Text>
              <Text style={[styles.locationTitle, { fontSize: (staff?.name || 'Staff').length > 20 ? 18 : 22 }]} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.7}>{staff?.name || 'Staff'}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Animated.View style={[styles.statusPill, { backgroundColor: pillBg }]}>
              <Animated.Text style={[styles.statusPillText, { opacity: pillTextOpacity }]}>{pillLabel}</Animated.Text>
            </Animated.View>
          </View>
        </View>

        <View style={styles.tabTrackWrapper}>
          <View style={styles.tabTrack}>
            <Animated.View style={[styles.activeTabHighlight, { transform: [{ translateX: tabTranslateX }] }]} />
            {TABS.map((tab, index) => {
              const isActive = activeTab === index;
              return (
                <Pressable key={tab} onPress={() => handleTabPress(index)} style={styles.tabSegment}>
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Animated.FlatList ref={flatListRef} data={TABS} keyExtractor={(item) => item} renderItem={renderPage} horizontal pagingEnabled showsHorizontalScrollIndicator={false} bounces={false} onMomentumScrollEnd={handleMomentumScrollEnd} onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })} scrollEventThrottle={16} />

        <View style={styles.floatingWrapper} pointerEvents="box-none">
          <Pressable style={({ pressed }) => [styles.scanPill, pressed && { transform: [{ scale: 0.94 }] }]} onPress={() => setIsScannerVisible(true)}>
            <View style={styles.scanIconBox}><QrCode size={20} color={DESIGN.brandRed} strokeWidth={3} /></View>
            <Text style={styles.scanText}>SCAN QR</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal visible={activeModal !== null} transparent={true} animationType="none" onRequestClose={closeModal}>
        <View style={styles.floatingModalWrapper}>
          <TouchableWithoutFeedback onPress={closeModal}>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropAnim }]}>
              <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
            </Animated.View>
          </TouchableWithoutFeedback>

          <Animated.View
            pointerEvents="auto"
            style={[
              styles.floatingModalCard,
              {
                position: 'absolute',
                left:         morphAnim.interpolate({ inputRange: [0, 1], outputRange: [bentoOrigin.x, 0] }),
                top:          morphAnim.interpolate({ inputRange: [0, 1], outputRange: [bentoOrigin.y, 0] }),
                width:        morphAnim.interpolate({ inputRange: [0, 1], outputRange: [bentoOrigin.w, width] }),
                height:       morphAnim.interpolate({ inputRange: [0, 1], outputRange: [bentoOrigin.h, height] }),
                borderRadius: morphAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }),
              },
            ]}
          >
            <View style={styles.floatingModalClipView}>
              <Animated.View style={{ flex: 1, opacity: backdropAnim }}>
                <Animated.View style={{ opacity: contentOpacity, flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
                  {renderModalContent()}
                </Animated.View>
              </Animated.View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <ScannerOverlay visible={isScannerVisible} onClose={() => setIsScannerVisible(false)} onSuccessScan={handleSimulateScan} />
      <MemberDetailPage visible={isMemberPageVisible} onClose={() => setIsMemberPageVisible(false)} onShowAlert={showCustomAlert} />

      <PopModal visible={selectedHistoryItem !== null} onClose={() => setSelectedHistoryItem(null)}>
        <View style={styles.historyDetailCard}>
          <View style={styles.historyDetailPill} />
          <View style={styles.historyDetailHeader}>
            <View style={[styles.historyDetailIconBox, selectedHistoryItem?.type === 'REDEEM' ? { backgroundColor: 'rgba(211,35,42,0.1)' } : { backgroundColor: DESIGN.canvas }]}>
              {selectedHistoryItem?.type === 'REDEEM' ? <Ticket size={20} color={DESIGN.brandRed} strokeWidth={2} /> : <ShoppingBag size={20} color={DESIGN.textPrimary} strokeWidth={2} />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.historyDetailTitle}>{selectedHistoryItem?.type === 'REDEEM' ? 'Voucher Redeemed' : 'Purchase'}</Text>
              <Text style={styles.historyDetailDate}>{selectedHistoryItem?.createdAt?.toDate ? new Date(selectedHistoryItem.createdAt.toDate()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</Text>
            </View>
            <Pressable style={styles.historyDetailClose} onPress={() => setSelectedHistoryItem(null)}>
              <X size={16} color={DESIGN.textSecondary} strokeWidth={2.5} />
            </Pressable>
          </View>
          {selectedHistoryItem?.type === 'EARN' && (
            <View style={styles.historyDetailAmountBox}>
              <Text style={styles.historyDetailAmountLabel}>TOTAL BELANJA</Text>
              <Text style={styles.historyDetailAmount}>Rp {formatRupiah(selectedHistoryItem?.totalAmount || 0)}</Text>
            </View>
          )}
          {selectedHistoryItem?.type === 'REDEEM' && (
            <View style={[styles.historyDetailAmountBox, styles.historyDetailRedeemBox]}>
              <Text style={[styles.historyDetailAmountLabel, { color: DESIGN.brandRed }]}>VOUCHER</Text>
              <Text style={[styles.historyDetailAmount, styles.historyDetailRedeemTitle]}>{selectedHistoryItem?.voucherTitle || '-'}</Text>
            </View>
          )}
          <View style={styles.historyDetailRows}>
            <View style={styles.historyDetailRow}>
              <Text style={styles.historyDetailLabel}>Receipt ID</Text>
              <Text style={styles.historyDetailValue}>{selectedHistoryItem?.posTransactionId || selectedHistoryItem?.id || '-'}</Text>
            </View>
            <View style={styles.historyDetailRow}>
              <Text style={styles.historyDetailLabel}>Kasir</Text>
              <Text style={styles.historyDetailValue}>{selectedHistoryItem?.cashierName || '-'}</Text>
            </View>
            {selectedHistoryItem?.member && (
              <View style={styles.historyDetailRow}>
                <Text style={styles.historyDetailLabel}>Member</Text>
                <Text style={styles.historyDetailValue}>{selectedHistoryItem?.member}</Text>
              </View>
            )}
            {selectedHistoryItem?.type === 'EARN' && selectedHistoryItem?.pointsEarned > 0 && (
              <View style={[styles.historyDetailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.historyDetailLabel}>Poin</Text>
                <Text style={[
                  styles.historyDetailValue,
                  selectedHistoryItem?.pointsState === 'PENDING' ? { color: DESIGN.outstandingOrange } : { color: DESIGN.successGreen }
                ]}>
                  +{selectedHistoryItem?.pointsEarned} pts{selectedHistoryItem?.pointsState === 'PENDING' ? ' (pending)' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>
      </PopModal>

      <PopModal visible={scannedVoucher !== null} onClose={() => setScannedVoucher(null)}>
        <View style={styles.voucherModalCardInner}>
           <Pressable style={styles.modalCloseIcon} onPress={() => setScannedVoucher(null)}>
              <X size={24} color={DESIGN.textSecondary} strokeWidth={2.5} />
           </Pressable>
           <View style={styles.voucherModalIcon}>
             <Ticket size={36} color={DESIGN.brandRed} />
           </View>
           <View style={styles.voucherModalTextBlock}>
             <Text style={styles.voucherModalTitle} numberOfLines={2} ellipsizeMode="tail">{scannedVoucher?.title}</Text>
             <Text style={styles.voucherModalExp}>
                Berlaku s/d: {scannedVoucher?.expiresAt ? new Date(scannedVoucher.expiresAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : '-'}
             </Text>
             {!!scannedVoucher?.code && (
               <View style={styles.voucherModalCodePill}>
                 <Text style={styles.voucherModalCodeLabel}>Kode Voucher</Text>
                 <Text style={styles.voucherModalCodeValue}>{scannedVoucher.code}</Text>
               </View>
             )}
           </View>
           <View style={styles.voucherModalBtnRow}>
             <Pressable style={styles.voucherModalBtnCancel} onPress={() => setScannedVoucher(null)} disabled={isRedeeming}>
               <Text style={styles.voucherModalBtnCancelText}>Batal</Text>
             </Pressable>
             <Pressable style={styles.voucherModalBtnRedeem} onPress={handleConfirmRedeem} disabled={isRedeeming}>
               {isRedeeming ? <ActivityIndicator color="#FFF" /> : <Text style={styles.voucherModalBtnRedeemText}>Mark as Used</Text>}
             </Pressable>
           </View>
        </View>
      </PopModal>

      {alertConfig.visible && (
        <Animated.View pointerEvents="none" style={[styles.alertContainer, { opacity: alertOpacity, transform: [{ translateY: alertTranslateY }], top: insets.top + 10 }]}>
          <View style={[styles.alertBox, alertConfig.type === 'success' ? styles.alertSuccess : styles.alertError]}>
            <View style={[styles.alertIconBox, alertConfig.type === 'success' && {backgroundColor: DESIGN.successGreen}]}><Text style={{color: '#FFF', fontWeight: 'bold'}}>{alertConfig.type === 'success' ? '✓' : '!'}</Text></View>
            <Text style={styles.alertText}>{alertConfig.message}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// --- WORLD-CLASS STYLESHEET ---
const styles = StyleSheet.create({
  scannerContainer: { ...StyleSheet.absoluteFillObject, zIndex: 999, backgroundColor: '#000' },
  cameraLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  noCameraBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  darkHoleOverlay: { position: 'absolute', top: height / 2 - 130 - 1000, left: width / 2 - 130 - 1000, width: 260 + 2000, height: 260 + 2000, borderWidth: 1000, borderRadius: 1048, borderColor: 'rgba(0,0,0,0.85)', zIndex: 2 },
  viewfinderCenterFrame: { position: 'absolute', top: height / 2 - 130, left: width / 2 - 130, width: 260, height: 260, justifyContent: 'center', alignItems: 'center', zIndex: 3 },
  viewfinderHole: { width: 260, height: 260, borderRadius: 48, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  scannerUIContainer: { ...StyleSheet.absoluteFillObject, zIndex: 4, justifyContent: 'space-between' },
  scannerHeaderGrid: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, height: 44 },
  scannerHeaderLeft: { flex: 1, alignItems: 'flex-start' },
  scannerHeaderCenter: { flex: 2, alignItems: 'center' },
  scannerHeaderRight: { flex: 1 }, 
  scannerBadgePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  scannerBadgeText: { color: DESIGN.surface, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  scannerCloseBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  scannerFooter: { paddingHorizontal: 24, alignItems: 'center' },
  scannerInstruction: { color: DESIGN.surface, fontSize: 15, fontWeight: '600', marginBottom: 40, textAlign: 'center', opacity: 0.8 },
  permissionBtn: { backgroundColor: DESIGN.surface, paddingVertical: 18, paddingHorizontal: 40, borderRadius: 100, shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.3, shadowRadius: 20 },
  permissionBtnText: { color: DESIGN.textPrimary, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  
  root: { flex: 1, backgroundColor: DESIGN.canvas },
  safeArea: { flex: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 },
  headerLogo: { width: 44, height: 44, marginRight: 12 },
  headerTextContainer: { flex: 1, justifyContent: 'center' },
  eyebrow: { fontSize: 13, fontWeight: '700', color: DESIGN.textSecondary, letterSpacing: 0.5, marginBottom: 2, textTransform: 'uppercase' },
  locationTitle: { fontWeight: '900', color: DESIGN.textPrimary, letterSpacing: -1 },
  headerRight: { justifyContent: 'center', alignItems: 'flex-end' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  statusPillText: { color: '#FFF', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  tabTrackWrapper: { paddingHorizontal: SCREEN_PADDING, marginBottom: 24 },
  tabTrack: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.04)', padding: TAB_TRACK_PADDING, borderRadius: 100, position: 'relative' },
  activeTabHighlight: { position: 'absolute', top: TAB_TRACK_PADDING, left: TAB_TRACK_PADDING, width: TAB_SEGMENT_WIDTH, height: 44, backgroundColor: DESIGN.surface, borderRadius: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  tabSegment: { width: TAB_SEGMENT_WIDTH, height: 44, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  tabText: { fontSize: 13, fontWeight: '600', color: DESIGN.textSecondary, letterSpacing: 0.5 },
  tabTextActive: { color: DESIGN.textPrimary, fontWeight: '800' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  bentoContainer: { gap: 12 },
  heroBlackCard: { backgroundColor: DESIGN.surfaceDark, borderRadius: 28, padding: 22, height: 172, justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 10 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badgeGlow: { backgroundColor: DESIGN.glowRed, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(211, 35, 42, 0.5)' },
  badgeText: { color: DESIGN.brandRed, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  heroBottom: { marginTop: 'auto' },
  heroLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '600', marginBottom: 8, letterSpacing: 0.8 },
  heroValue: { color: DESIGN.surface, fontSize: 36, fontWeight: '800', letterSpacing: -1.5 },
  currency: { fontSize: 22, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  decimals: { fontSize: 22, color: 'rgba(255,255,255,0.4)' },
  bentoRow: { flexDirection: 'row', gap: 12 },
  bentoBox: { backgroundColor: DESIGN.surface, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
  bentoBoxSmall: { flex: 1, height: 160, justifyContent: 'space-between' },
  bentoBoxWide: { width: '100%', height: 88, justifyContent: 'center' },
  wideBoxContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wideBoxTitle: { fontSize: 16, fontWeight: '700', color: DESIGN.textPrimary, letterSpacing: -0.3 },
  iconWrapperDark: { width: 40, height: 40, borderRadius: 20, backgroundColor: DESIGN.surfaceDark, justifyContent: 'center', alignItems: 'center' },
  iconWrapperGold: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center' },
  bentoValue: { fontSize: 30, fontWeight: '800', color: DESIGN.textPrimary, letterSpacing: -1 },
  bentoLabel: { fontSize: 11, fontWeight: '600', color: DESIGN.textSecondary, letterSpacing: 0.2 },
  
  floatingWrapper: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 24, alignSelf: 'center' },
  scanPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: DESIGN.brandRed, padding: 8, paddingRight: 32, borderRadius: 100, shadowColor: DESIGN.brandRed, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 12 },
  scanIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: DESIGN.surface, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  scanText: { color: DESIGN.surface, fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },

  subTabContainer: { paddingHorizontal: 24, paddingBottom: 16 },
  subTabTrack: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 4 },
  subTabItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  subTabActive: { backgroundColor: DESIGN.surface, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  subTabText: { fontSize: 13, fontWeight: '600', color: DESIGN.textSecondary },
  subTabTextActive: { color: DESIGN.textPrimary, fontWeight: '800' },

  historySectionHeader: { backgroundColor: DESIGN.canvas, paddingVertical: 12, marginBottom: 8 },
  historySectionText: { fontSize: 14, fontWeight: '800', color: DESIGN.textPrimary, letterSpacing: 0.5 },
  
  historyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: DESIGN.surface, padding: 16, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.02, shadowRadius: 8 },
  historyIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: DESIGN.canvas, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  historyInfo: { flex: 1 },
  historyTrxId: { fontSize: 15, fontWeight: '800', color: DESIGN.textPrimary },
  historyDetails: { fontSize: 13, color: DESIGN.textSecondary, marginTop: 4 },
  historyRedeemRow: { alignItems: 'center' },
  historyRedeemInfo: { flex: 1, minWidth: 0, paddingRight: 12 },
  historyRedeemTitle: { fontSize: 15, fontWeight: '800', color: DESIGN.textPrimary, flexShrink: 1 },
  historyRedeemDetails: { fontSize: 13, color: DESIGN.textSecondary, marginTop: 4, flexShrink: 1 },
  historyRedeemBadge: { minWidth: 74, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: 'rgba(211,35,42,0.08)', justifyContent: 'center', alignItems: 'center', marginLeft: 4, flexShrink: 0 },
  historyRedeemBadgeText: { fontSize: 12, fontWeight: '900', color: DESIGN.brandRed, letterSpacing: 0.6 },
  historyTotalBox: { alignItems: 'flex-end', justifyContent: 'center' },
  historyTotalText: { fontSize: 16, fontWeight: '900', color: DESIGN.textPrimary },
  historyPointText: { fontSize: 12, fontWeight: '800', color: DESIGN.successGreen },
  historyPointTextBadge: { fontSize: 10, fontWeight: '800', color: DESIGN.outstandingOrange },
  historyPointBadge: { marginLeft: 8, backgroundColor: 'rgba(255, 159, 10, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  profileContainer: { paddingHorizontal: 24, paddingBottom: 40 },
  profileHero: { alignItems: 'center', paddingVertical: 32 },
  profileAvatarBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: DESIGN.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: {width:0, height:8}, shadowOpacity: 0.05, shadowRadius: 16 },
  profileStoreName: { fontSize: 24, fontWeight: '900', color: DESIGN.textPrimary, letterSpacing: -0.5 },
  profileStoreLocation: { fontSize: 15, color: DESIGN.textSecondary, marginTop: 4, marginBottom: 16 },
  profileStatusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(50, 215, 75, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: DESIGN.successGreen, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '800', color: DESIGN.successGreen, letterSpacing: 0.5 },
  
  profileActionGroup: { backgroundColor: DESIGN.surface, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: DESIGN.border },
  profileActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  profileActionLeft: { flexDirection: 'row', alignItems: 'center' },
  actionIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: DESIGN.canvas, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionText: { fontSize: 16, fontWeight: '700', color: DESIGN.textPrimary },
  actionDivider: { width: '100%', height: 1, backgroundColor: DESIGN.canvas, marginLeft: 72 }, 
  appVersionText: { textAlign: 'center', marginTop: 32, fontSize: 13, fontWeight: '500', color: 'rgba(0,0,0,0.3)' },

  modalOverlay: { flex: 1 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  modalSheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height, backgroundColor: DESIGN.surface, borderTopLeftRadius: 36, borderTopRightRadius: 36, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 20 },
  dragHeaderArea: { paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: DESIGN.canvas, backgroundColor: DESIGN.surface, borderTopLeftRadius: 36, borderTopRightRadius: 36, zIndex: 10 },
  dragPill: { width: 48, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.1)', alignSelf: 'center', marginBottom: 20 },
  dragPillContainer: { width: '100%', alignItems: 'center', paddingVertical: 8 },

  // --- 🔥 FLOATING MORPH MODAL ---
  floatingModalWrapper: { ...StyleSheet.absoluteFillObject },
  floatingModalCard: { backgroundColor: DESIGN.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 40, elevation: 30 },
  floatingModalClipView: { overflow: 'hidden', flex: 1 },
  floatingModalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 },
  floatingModalIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  floatingModalTitle: { fontSize: 17, fontWeight: '800', color: DESIGN.textPrimary, letterSpacing: -0.4 },
  floatingModalSub: { fontSize: 12, fontWeight: '500', color: DESIGN.textSecondary, marginTop: 1 },
  floatingModalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: DESIGN.canvas, justifyContent: 'center', alignItems: 'center' },
  floatingModalDivider: { height: 1, backgroundColor: DESIGN.canvas },
  floatingModalBody: { paddingHorizontal: 20, paddingTop: 16 },
  datePickerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: DESIGN.surface, zIndex: 1000, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },

  // --- GLANCE STYLES (half stage) ---
  glanceHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 6 },
  glanceHintText: { fontSize: 13, fontWeight: '600', color: DESIGN.textSecondary, fontStyle: 'italic' },
  glanceCenterBox: { alignItems: 'center', paddingTop: 8 },
  glanceBigNumber: { fontSize: 64, fontWeight: '900', color: DESIGN.textPrimary, letterSpacing: -2 },
  glanceBigLabel: { fontSize: 16, fontWeight: '600', color: DESIGN.textSecondary, marginBottom: 16 },
  glancePromoCard: { backgroundColor: DESIGN.canvas, borderRadius: 24, padding: 24, alignItems: 'center', gap: 8 },
  glancePromoLabel: { fontSize: 12, fontWeight: '800', color: DESIGN.brandRed, letterSpacing: 1, textTransform: 'uppercase' },
  glancePromoTitle: { fontSize: 22, fontWeight: '900', color: DESIGN.textPrimary, textAlign: 'center', letterSpacing: -0.5 },
  glancePromoCount: { fontSize: 15, fontWeight: '600', color: DESIGN.textSecondary },
  sheetHeaderContent: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: DESIGN.canvas, justifyContent: 'center', alignItems: 'center', marginLeft: 16 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  kpiBox: { flex: 1, backgroundColor: DESIGN.canvas, padding: 14, borderRadius: 16 },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: DESIGN.textSecondary, marginBottom: 3, letterSpacing: 0.2 },
  kpiValue: { fontSize: 19, fontWeight: '800', color: DESIGN.textPrimary, letterSpacing: -0.3 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: DESIGN.textPrimary, marginBottom: 16, marginTop: 8 },
  seeMoreText: { textAlign: 'center', color: DESIGN.textSecondary, fontSize: 14, fontWeight: '600', marginVertical: 16, fontStyle: 'italic' },
  sheetIconBoxRed: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(211, 35, 42, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  sheetIconBoxDark: { width: 56, height: 56, borderRadius: 16, backgroundColor: DESIGN.surfaceDark, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  sheetIconBoxGold: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  sheetIconBoxLight: { width: 56, height: 56, borderRadius: 16, backgroundColor: DESIGN.canvas, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  sheetTitle: { fontSize: 24, fontWeight: '800', color: DESIGN.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  sheetSub: { fontSize: 15, color: DESIGN.textSecondary },
  memberListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: DESIGN.canvas },
  memberAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: DESIGN.surfaceDark, justifyContent: 'center', alignItems: 'center' },
  memberName: { fontSize: 14, fontWeight: '600', color: DESIGN.textPrimary },
  memberTime: { fontSize: 12, fontWeight: '500', color: DESIGN.textSecondary, marginTop: 1 },
  memberTimeBadge: { fontSize: 12, fontWeight: '600', color: DESIGN.textSecondary },
  tierStatRow: { flexDirection: 'column' },
  tierBarContainer: { height: 6, backgroundColor: DESIGN.canvas, borderRadius: 3, overflow: 'hidden' },
  tierBar: { height: '100%', borderRadius: 3 },
  tierStatText: { fontSize: 13, fontWeight: '600', color: DESIGN.textPrimary },
  tierStatLabel: { fontSize: 13, fontWeight: '700', color: DESIGN.textPrimary },
  tierStatCount: { fontSize: 12, fontWeight: '500', color: DESIGN.textSecondary },
  promoCardModal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: DESIGN.canvas, borderRadius: 14, padding: 14, marginBottom: 10 },
  promoTitle: { fontSize: 14, fontWeight: '700', color: DESIGN.textPrimary, marginBottom: 2 },
  promoCount: { fontSize: 12, fontWeight: '500', color: DESIGN.textSecondary },
  promoCountBadge: { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: DESIGN.surface, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  promoCountBadgeText: { fontSize: 13, fontWeight: '800', color: DESIGN.textPrimary },
  
  // --- DATE PICKER STYLES ---
  filterBarContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  datePickerPill: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: DESIGN.canvas, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 100, marginHorizontal: 12 },
  datePickerText: { fontSize: 15, fontWeight: '700', color: DESIGN.textPrimary },
  dateArrowBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: DESIGN.canvas, justifyContent: 'center', alignItems: 'center' },
  filterIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: DESIGN.canvas, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  
  // --- LINE CHART STYLES ---
  sheetScrollBody: { paddingHorizontal: 24, paddingTop: 24 },
  chartContainer: { alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 12 },
  dummyChartBox: { backgroundColor: DESIGN.canvas, borderRadius: 20, padding: 16, marginBottom: 16, position: 'relative', overflow: 'hidden' },
  chartXAxis: { flexDirection: 'row', width: '100%', position: 'relative', height: 20 },
  chartHourText: { fontSize: 10, color: DESIGN.textSecondary, fontWeight: '700' },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  detailText: { fontSize: 16, fontWeight: '500', color: DESIGN.textSecondary },
  detailValue: { fontSize: 18, fontWeight: '800', color: DESIGN.textPrimary },

  pageContainer: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  pageBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  floatingHeader: { position: 'absolute', left: 20, zIndex: 10 },
  floatingBackPill: { width: 44, height: 44, borderRadius: 22, backgroundColor: DESIGN.surface, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  pageScroll: { paddingHorizontal: 24, backgroundColor: DESIGN.canvas, minHeight: height },
  digitalCard: { width: '100%', height: 220, backgroundColor: DESIGN.surfaceDark, borderRadius: 24, padding: 24, justifyContent: 'space-between', marginBottom: 24, shadowColor: '#000', shadowOffset: {width: 0, height: 16}, shadowOpacity: 0.25, shadowRadius: 24, elevation: 15 },
  digitalCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBrandText: { color: DESIGN.surface, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  cardSubText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  cardTierBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: DESIGN.gold, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  cardTierText: { color: DESIGN.surfaceDark, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  digitalCardBody: { marginTop: 'auto' },
  cardMemberName: { color: DESIGN.surface, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  cardMemberID: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600', letterSpacing: 2 },
  
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: DESIGN.surface, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.02, shadowRadius: 12 },
  statIconGold: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statLabel: { fontSize: 14, fontWeight: '700', color: DESIGN.textSecondary },
  statValue: { fontSize: 28, fontWeight: '900', color: DESIGN.textPrimary, letterSpacing: -1 },
  sectionHeading: { fontSize: 18, fontWeight: '900', color: DESIGN.textPrimary, marginBottom: 16, letterSpacing: -0.5 },
  
  formBox: { backgroundColor: DESIGN.surface, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.02, shadowRadius: 12, marginBottom: 24 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: DESIGN.textSecondary, marginBottom: 8, letterSpacing: 0.5 },
  trxInput: { height: 52, backgroundColor: DESIGN.canvas, borderRadius: 14, paddingHorizontal: 16, fontSize: 16, fontWeight: '700', color: DESIGN.textPrimary, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  
  rewardContainer: { gap: 12 },
  ticketCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: DESIGN.surface, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.02, shadowRadius: 8 },
  ticketLeft: { flex: 1, paddingRight: 16 },
  ticketTitle: { fontSize: 16, fontWeight: '800', color: DESIGN.textPrimary, marginBottom: 4 },
  ticketSub: { fontSize: 13, fontWeight: '600', color: DESIGN.brandRed },
  ticketDivider: { width: 1, height: '100%', backgroundColor: DESIGN.canvas, marginHorizontal: 16 }, 
  ticketRight: { justifyContent: 'center', alignItems: 'center', paddingLeft: 8 },
  ticketActionText: { fontSize: 15, fontWeight: '800', color: DESIGN.brandRed },

  stickyBottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(242, 242, 247, 0.9)', paddingTop: 16, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  primaryActionBtn: { flexDirection: 'row', backgroundColor: DESIGN.brandRed, paddingVertical: 18, borderRadius: 100, alignItems: 'center', justifyContent: 'center', shadowColor: DESIGN.brandRed, shadowOffset: {width:0, height:10}, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  primaryActionText: { color: DESIGN.surface, fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },

  alertContainer: { position: 'absolute', left: 24, right: 24, zIndex: 9999, elevation: 999, alignItems: 'center' },
  alertBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 100, backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10, width: '100%' },
  alertSuccess: { borderLeftWidth: 4, borderLeftColor: DESIGN.successGreen },
  alertError: { borderLeftWidth: 4, borderLeftColor: DESIGN.brandRed },
  alertIconBox: { width: 24, height: 24, borderRadius: 12, backgroundColor: DESIGN.brandRed, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  alertText: { flex: 1, fontSize: 14, fontWeight: '700', color: DESIGN.textPrimary },

  voucherModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  voucherModalContainer: { width: '100%', maxWidth: 420 },
  voucherModalCardInner: { width: '100%', backgroundColor: DESIGN.surface, borderRadius: 32, paddingTop: 32, paddingBottom: 24, paddingHorizontal: 24, alignItems: 'stretch', shadowColor: '#000', shadowOffset: {width: 0, height: 20}, shadowOpacity: 0.3, shadowRadius: 30, elevation: 15 },
  modalCloseIcon: { position: 'absolute', top: 20, right: 20, padding: 8, zIndex: 10 },
  voucherModalIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(211, 35, 42, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, alignSelf: 'center' },
  voucherModalTextBlock: { width: '100%', alignItems: 'center', marginBottom: 24 },
  voucherModalTitle: { width: '100%', fontSize: 22, fontWeight: '900', color: DESIGN.textPrimary, textAlign: 'center', marginBottom: 8, letterSpacing: -0.5, lineHeight: 28, paddingHorizontal: 12 },
  voucherModalExp: { width: '100%', fontSize: 14, fontWeight: '600', color: DESIGN.textSecondary, marginBottom: 16, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  voucherModalCodePill: { width: '100%', backgroundColor: 'rgba(211,35,42,0.06)', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
  voucherModalCodeLabel: { fontSize: 11, fontWeight: '800', color: DESIGN.brandRed, letterSpacing: 0.8, marginBottom: 4, textTransform: 'uppercase' },
  voucherModalCodeValue: { fontSize: 14, fontWeight: '800', color: DESIGN.textPrimary, textAlign: 'center' },
  transactionWarningBox: { flexDirection: 'row', alignItems: 'flex-start', width: '100%', backgroundColor: 'rgba(255,159,10,0.12)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 18 },
  transactionWarningText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700', color: DESIGN.outstandingOrange },
  voucherModalBtnRow: { flexDirection: 'row', gap: 12, width: '100%', alignItems: 'stretch' },
  voucherModalBtnCancel: { flex: 1, height: 52, borderRadius: 16, backgroundColor: DESIGN.canvas, justifyContent: 'center', alignItems: 'center' },
  voucherModalBtnCancelText: { fontSize: 15, fontWeight: '700', color: DESIGN.textSecondary },
  voucherModalBtnRedeem: { flex: 1, height: 52, borderRadius: 16, backgroundColor: DESIGN.brandRed, justifyContent: 'center', alignItems: 'center', shadowColor: DESIGN.brandRed, shadowOffset: {width:0, height:6}, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  voucherModalBtnRedeemText: { fontSize: 15, fontWeight: '800', color: DESIGN.surface },
  modalFullBtn: { width: '100%', height: 52, borderRadius: 16, backgroundColor: DESIGN.canvas, justifyContent: 'center', alignItems: 'center' },
  modalFullBtnText: { fontSize: 15, fontWeight: '700', color: DESIGN.textSecondary },

  historyDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: DESIGN.canvas, gap: 16 },
  historyDetailLabel: { fontSize: 13, fontWeight: '500', color: DESIGN.textSecondary, width: 84, paddingTop: 2 },
  historyDetailValue: { fontSize: 13, fontWeight: '700', color: DESIGN.textPrimary, textAlign: 'right', flex: 1, flexShrink: 1, lineHeight: 18 },

  // --- HISTORY DETAIL CARD (Apple-style bottom sheet modal) ---
  historyDetailCard: { width: '100%', backgroundColor: DESIGN.surface, borderRadius: 28, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 28, shadowColor: '#000', shadowOffset: {width: 0, height: 20}, shadowOpacity: 0.25, shadowRadius: 30, elevation: 15 },
  historyDetailPill: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.1)', alignSelf: 'center', marginBottom: 16 },
  historyDetailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  historyDetailIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  historyDetailTitle: { fontSize: 15, fontWeight: '800', color: DESIGN.textPrimary, letterSpacing: -0.2 },
  historyDetailDate: { fontSize: 11, fontWeight: '500', color: DESIGN.textSecondary, marginTop: 2 },
  historyDetailClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: DESIGN.canvas, justifyContent: 'center', alignItems: 'center' },
  historyDetailAmountBox: { backgroundColor: DESIGN.canvas, borderRadius: 16, padding: 14, marginBottom: 14, width: '100%' },
  historyDetailAmountLabel: { fontSize: 10, fontWeight: '700', color: DESIGN.textSecondary, letterSpacing: 0.8, marginBottom: 4 },
  historyDetailAmount: { fontSize: 26, fontWeight: '900', color: DESIGN.textPrimary, letterSpacing: -0.5 },
  historyDetailRedeemBox: { backgroundColor: 'rgba(211,35,42,0.06)' },
  historyDetailRedeemTitle: { color: DESIGN.brandRed, fontSize: 20, lineHeight: 25 },
  historyDetailRows: { marginTop: 2 },
});
