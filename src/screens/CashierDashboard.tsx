import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Platform,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
  Image,
  Animated,
  PanResponder,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableWithoutFeedback,
  Modal,
  SectionList
} from 'react-native';
import { QrCode, TrendingUp, Users, Ticket, Crown, X, ChevronRight, Activity, Calendar, Filter, ScanLine, ArrowLeft, Star, CreditCard, ShoppingBag, Banknote, Smartphone, Clock, CheckCircle2, MapPin, Store, RefreshCcw, LogOut } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';

// --- TAMBAHAN IMPORT ZUSTAND STORE ---
import { useCashierStore } from '../store/useCashierStore';

const { width, height } = Dimensions.get('window');

const DESIGN = {
  canvas: '#F2F2F7',        
  surface: '#FFFFFF',       
  surfaceDark: '#1C1C1E',   
  textPrimary: '#000000',
  textSecondary: '#8A8A8E',
  textLight: '#F5F5F7',
  brandRed: '#D3232A',      
  glowRed: 'rgba(211, 35, 42, 0.4)',
  border: 'rgba(0,0,0,0.03)',
  gold: '#D4AF37',
  goldLight: '#F9F1D8',
  receiptPaper: '#FDFBF7', 
  successGreen: '#32D74B',
  outstandingOrange: '#FF9F0A',
};

type TabOption = 'HOME' | 'HISTORY' | 'PROFILE';
const TABS: TabOption[] = ['HOME', 'HISTORY', 'PROFILE'];

const TAB_TRACK_PADDING = 4;
const SCREEN_PADDING = 24;
const TAB_TRACK_WIDTH = width - (SCREEN_PADDING * 2);
const TAB_SEGMENT_WIDTH = (TAB_TRACK_WIDTH - (TAB_TRACK_PADDING * 2)) / TABS.length;

type ModalType = 'REVENUE' | 'MEMBERS' | 'TIERS' | 'PROMOS' | 'RECEIPT' | null; 
type HistorySubTab = 'TRANSACTIONS' | 'REDEMPTIONS'; 

// --- HELPER FUNGSI RUPIAH ---
const formatRupiah = (angka: number) => {
  return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// --- DATA DUMMY HISTORY ---
const TRX_HISTORY_DATA = [
  {
    title: 'Today, 27 Feb',
    data: [
      { id: 'TRX-0982', time: '14:20', total: 'Rp 65.000', method: 'QRIS', member: 'Ferry Rusly', memberId: 'ID-0812', points: 65, pointStatus: 'OUTSTANDING', items: 2 },
      { id: 'TRX-0981', time: '13:45', total: 'Rp 35.000', method: 'Cash', member: null, memberId: null, points: 0, pointStatus: 'NONE', items: 1 },
      { id: 'TRX-0980', time: '11:10', total: 'Rp 110.000', method: 'QRIS', member: 'Aris S.', memberId: 'ID-0992', points: 110, pointStatus: 'OUTSTANDING', items: 4 },
    ],
  },
  {
    title: 'Yesterday, 26 Feb (Settled)',
    data: [
      { id: 'TRX-0979', time: '19:30', total: 'Rp 85.000', method: 'Card', member: 'Budi T.', memberId: 'ID-0123', points: 85, pointStatus: 'RELEASED', items: 3 },
      { id: 'TRX-0977', time: '10:00', total: 'Rp 215.000', method: 'QRIS', member: 'Ferry Rusly', memberId: 'ID-0812', points: 215, pointStatus: 'RELEASED', items: 8 },
    ],
  },
];

const REDEEM_HISTORY_DATA = [
  {
    title: 'Today, 27 Feb',
    data: [
      { id: 'RED-0045', time: '14:22', voucher: 'Free 1 Pearl Topping', member: 'Ferry Rusly', refTrx: 'TRX-0982' },
      { id: 'RED-0044', time: '09:15', voucher: '20% Off Signature', member: 'Aris S.', refTrx: 'TRX-0979' },
    ],
  }
];

const SquishyBento = ({ onPress, style, children }: any) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => { Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, friction: 6 }).start(); };
  const handlePressOut = () => { Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start(); };

  return (
    <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableWithoutFeedback>
  );
};

// --- MODERN SCANNER OVERLAY (MATHEMATICALLY PERFECT) ---
const ScannerOverlay = ({ visible, onClose, onSuccessScan }: { visible: boolean, onClose: () => void, onSuccessScan: (data: string) => void }) => {
  const insets = useSafeAreaInsets();
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false); 
      Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleBarcodeScanned = ({ type, data }: { type: string, data: string }) => {
    if (scanned) return; 
    setScanned(true); 
    onSuccessScan(data);
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.scannerContainer, { opacity: opacityAnim }]}> 
      <View style={styles.cameraLayer}>
         {(!permission || !permission.granted) ? (
            <View style={styles.noCameraBox}>
              <Text style={{color: 'white', marginBottom: 20}}>Camera Access Required</Text>
              <Pressable style={styles.dummySimulateBtn} onPress={requestPermission}>
                 <Text style={styles.dummySimulateText}>Grant Access</Text>
              </Pressable>
            </View>
         ) : (
            <CameraView 
               style={StyleSheet.absoluteFillObject} 
               facing="back"
               barcodeScannerSettings={{ barcodeTypes: ["qr"] }} 
               onBarcodeScanned={scanned ? undefined : handleBarcodeScanned} 
            />
         )}
      </View>

      <View style={styles.darkHoleOverlay} pointerEvents="none" />

      <View style={styles.viewfinderCenterFrame} pointerEvents="none">
         <View style={styles.viewfinderHole} />
      </View>

      <View style={styles.scannerUIContainer} pointerEvents="box-none">
        
        <View style={[styles.scannerHeaderGrid, { marginTop: Platform.OS === 'android' ? insets.top + 20 : insets.top || 20 }]}> 
          <View style={styles.scannerHeaderLeft}>
            <Pressable style={styles.scannerCloseBtn} onPress={onClose}>
               <X size={22} color={DESIGN.surface} />
            </Pressable>
          </View>
          <View style={styles.scannerHeaderCenter}>
            <View style={styles.scannerBadgePill}>
               <ScanLine size={14} color={DESIGN.surface} style={{marginRight: 6}} />
               <Text style={styles.scannerBadgeText}>Scanner</Text>
            </View>
          </View>
          <View style={styles.scannerHeaderRight} />
        </View>

        <View style={[styles.scannerFooter, { marginBottom: insets.bottom + 40 }]}> 
          <Text style={styles.scannerInstruction}>Hold camera over Member QR</Text>
          <Pressable 
            style={({pressed}) => [styles.dummySimulateBtn, pressed && {opacity: 0.8, transform: [{scale: 0.95}]}]} 
            onPress={() => onSuccessScan("DUMMY_MEMBER_ID_0812")}
          >
              <Text style={styles.dummySimulateText}>Simulate Scan</Text>
          </Pressable>
        </View>

      </View>
    </Animated.View>
  );
};

// --- REDESIGNED: THE APPLE-WALLET STYLE MEMBER PAGE (REACTIVE) ---
const MemberDetailPage = ({ visible, onClose }: { visible: boolean, onClose: () => void }) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(width)).current; 

  // AMBIL DATA DARI ZUSTAND
  const activeMember = useCashierStore((state) => state.activeMember);
  const processTransaction = useCashierStore((state) => state.processTransaction);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 60, useNativeDriver: true }).start();
    } else {
      Animated.spring(slideAnim, { toValue: width, friction: 9, tension: 60, useNativeDriver: true }).start();
    }
  }, [visible]);

  // FUNGSI SIMULASI CHECKOUT
  const handleCharge = () => {
    processTransaction(45000, true); // Tambah Rp 45rb & Tambah 1 Member Visit
    onClose();
  };

  // Jangan render jika tidak ada data member
  if (!activeMember) return null;

  return (
    <Animated.View 
      style={[
        styles.pageContainer, 
        { transform: [{ translateX: slideAnim }] },
        !visible ? { pointerEvents: 'none' } : {} 
      ]}
    >
      <View style={styles.pageBackground} />
      <View style={[styles.floatingHeader, { top: insets.top + 10 }]}>
         <Pressable style={styles.floatingBackPill} onPress={onClose}>
           <ArrowLeft size={20} color={DESIGN.textPrimary} strokeWidth={2.5} />
         </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.pageScroll, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 140 }]}>
        <View style={styles.digitalCard}>
          <View style={styles.digitalCardHeader}>
            <View>
              <Text style={styles.cardBrandText}>GONG CHA</Text>
              <Text style={styles.cardSubText}>MEMBER</Text>
            </View>
            <View style={styles.cardTierBadge}>
               <Crown size={12} color={DESIGN.surfaceDark} strokeWidth={3} style={{marginRight: 4}} />
               <Text style={styles.cardTierText}>{activeMember.tier}</Text>
            </View>
          </View>
          <View style={styles.digitalCardBody}>
            <Text style={styles.cardMemberName}>{activeMember.name}</Text>
            <Text style={styles.cardMemberID}>UID: {activeMember.uid}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
           <View style={styles.statBox}>
              <View style={styles.statIconGold}><Star size={20} color={DESIGN.gold} /></View>
              <Text style={styles.statLabel}>Total Points</Text>
              <Text style={styles.statValue}>{formatRupiah(activeMember.points)}</Text>
           </View>
           <View style={styles.statBox}>
              <View style={styles.statIconDark}><CreditCard size={20} color={DESIGN.surface} /></View>
              <Text style={styles.statLabel}>E-Wallet</Text>
              <Text style={styles.statValue}>Rp {formatRupiah(activeMember.walletBalance)}</Text>
           </View>
        </View>
        <Text style={styles.sectionHeading}>Available Rewards</Text>
        <View style={styles.rewardContainer}>
           <View style={styles.ticketCard}>
              <View style={styles.ticketLeft}><Text style={styles.ticketTitle}>Free 1 Pearl Topping</Text><Text style={styles.ticketSub}>Valid until 28 Feb</Text></View>
              <View style={styles.ticketDivider} />
              <Pressable style={styles.ticketRight}><Text style={styles.ticketActionText}>Apply</Text></Pressable>
           </View>
           <View style={styles.ticketCard}>
              <View style={styles.ticketLeft}><Text style={styles.ticketTitle}>20% Off Signature</Text><Text style={styles.ticketSub}>Gold Member Exclusive</Text></View>
              <View style={styles.ticketDivider} />
              <Pressable style={styles.ticketRight}><Text style={styles.ticketActionText}>Apply</Text></Pressable>
           </View>
        </View>
      </ScrollView>
      <View style={[styles.stickyBottomBar, { paddingBottom: insets.bottom || 24 }]}>
         <Pressable style={({ pressed }) => [styles.primaryActionBtn, pressed && { transform: [{ scale: 0.96 }] }]} onPress={handleCharge}>
            <ShoppingBag size={20} color={DESIGN.surface} style={{marginRight: 8}} />
            <Text style={styles.primaryActionText}>Charge Rp 45.000</Text>
         </Pressable>
      </View>
    </Animated.View>
  );
};


export default function CashierDashboard() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<number>(0);
  
  const [historyTab, setHistoryTab] = useState<HistorySubTab>('TRANSACTIONS');
  const [selectedTrx, setSelectedTrx] = useState<any>(null); 

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isMemberPageVisible, setIsMemberPageVisible] = useState(false);

  // --- ZUSTAND STORE INTEGRATION ---
  const { totalRevenue, memberVisits, staff, setActiveMember, syncData } = useCashierStore();
  // Ekstrak nama toko dari data Firebase aslimu!
  // Ambil outlet pertama dari array storeLocations
  const storeName = staff?.storeLocations?.[0] || 'Loading Store...';


  
  const SHEET_HIDDEN = height; 
  const SHEET_HALF = height * 0.4; 
  const SHEET_FULL = 0;

  const modalY = useRef(new Animated.Value(SHEET_HIDDEN)).current;
  const lastModalY = useRef(SHEET_HIDDEN);

  // Animasi Sync Spin
  const spinAnim = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef<Animated.FlatList<any>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 15) return 'Good Afternoon,';
    if (hour < 19) return 'Good Evening,';
    return 'Good Night,';
  };

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / width);
    if (newIndex !== activeTab) setActiveTab(newIndex);
  };

  const tabTranslateX = scrollX.interpolate({
    inputRange: [0, width, width * 2],
    outputRange: [0, TAB_SEGMENT_WIDTH, TAB_SEGMENT_WIDTH * 2],
    extrapolate: 'clamp',
  });

  const openModal = (type: ModalType, data: any = null) => {
    setActiveModal(type);
    if (data) setSelectedTrx(data);

    let targetY = SHEET_HALF;
    if (type === 'RECEIPT') {
      targetY = insets.top > 0 ? insets.top + 40 : 40; 
      setIsFullScreen(true); 
    } else {
      setIsFullScreen(false);
    }

    lastModalY.current = targetY;
    Animated.spring(modalY, { toValue: targetY, useNativeDriver: false, friction: 8, tension: 60 }).start();
  };

  const closeModal = () => {
    lastModalY.current = SHEET_HIDDEN;
    Animated.spring(modalY, { toValue: SHEET_HIDDEN, useNativeDriver: false, friction: 9, tension: 50 }).start(() => {
      setActiveModal(null);
      setSelectedTrx(null);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        let newY = lastModalY.current + gestureState.dy;
        if (newY < SHEET_FULL) newY = SHEET_FULL; 
        modalY.setValue(newY);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentY = lastModalY.current + gestureState.dy;
        let toValue = SHEET_HALF;

        if (activeModal === 'RECEIPT') {
           if (gestureState.vy > 0.5 || currentY > height * 0.3) { toValue = SHEET_HIDDEN; }
           else { toValue = insets.top > 0 ? insets.top + 40 : 40; }
        } else {
           if (gestureState.vy < -0.5 || currentY < height * 0.25) { toValue = SHEET_FULL; } 
           else if (gestureState.vy > 0.5 || currentY > height * 0.65) { toValue = SHEET_HIDDEN; } 
           else { toValue = SHEET_HALF; }
        }

        lastModalY.current = toValue;
        
        Animated.spring(modalY, { toValue, useNativeDriver: false, friction: 8, tension: 50 }).start(() => {
          if (toValue === SHEET_HIDDEN) {
            setActiveModal(null);
            setSelectedTrx(null);
          }
        });
      },
    })
  ).current;

  const backdropOpacity = modalY.interpolate({ inputRange: [SHEET_FULL, height * 0.5, SHEET_HIDDEN], outputRange: [0.7, 0.4, 0], extrapolate: 'clamp' });
  const morphFullOpacity = modalY.interpolate({ inputRange: [SHEET_FULL, SHEET_HALF - 50, SHEET_HALF], outputRange: [1, 0, 0], extrapolate: 'clamp' });
  const morphHalfOpacity = modalY.interpolate({ inputRange: [SHEET_FULL, SHEET_HALF - 50, SHEET_HALF], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const morphPaddingTop = modalY.interpolate({ inputRange: [SHEET_FULL, SHEET_HALF], outputRange: [insets.top + 10, 10], extrapolate: 'clamp' });
  const morphChartHeight = modalY.interpolate({ inputRange: [SHEET_FULL, SHEET_HALF], outputRange: [240, 160], extrapolate: 'clamp' });

  // --- ZUSTAND: HANDLER SCAN CAMERA ---
  const handleSimulateScan = (data: string) => {
    setIsScannerVisible(false); 
    
    // Inject data ke Zustand dari hasil QR
    setActiveMember({
      uid: data,
      name: 'Budi Santoso',
      phone: '08123456789',
      points: 1250,
      tier: 'GOLD',
      walletBalance: 250000
    });

    setIsMemberPageVisible(true); 
  };

  // --- ZUSTAND: HANDLER SYNC DATABASE (SPIN ANIMATION) ---
  const handleSyncDatabase = async () => {
    spinAnim.setValue(0);
    Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })).start();
    
    // Panggil fungsi Zustand async
    await syncData();
    
    Animated.timing(spinAnim, { toValue: 0, duration: 300, useNativeDriver: true }).stop();
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const renderFilterBar = () => {
    const dateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    return (
      <Animated.View style={[styles.filterBarContainer, { opacity: morphFullOpacity }]}>
        <View style={styles.datePickerPill}>
          <Calendar size={16} color={DESIGN.textPrimary} style={{marginRight: 8}} />
          <Text style={styles.datePickerText}>Today, {dateStr}</Text>
        </View>
        <Pressable style={styles.filterIconBtn}>
          <Filter size={18} color={DESIGN.textPrimary} />
        </Pressable>
      </Animated.View>
    );
  };

  const renderDigitalReceipt = () => {
    if (!selectedTrx) return null;
    return (
       <Animated.View {...panResponder.panHandlers} style={[styles.receiptPaper, { height: height - (insets.top + 40) }]}>
         <View style={styles.receiptDragHandle} />
         <Pressable style={styles.closeReceiptBtn} onPress={closeModal}>
            <X size={20} color={DESIGN.textSecondary} />
         </Pressable>

         <View style={styles.receiptHeader}>
            <Image source={require('../../assets/images/logo1.webp')} style={{width: 56, height: 56, marginBottom: 12}} resizeMode="contain"/>
            <Text style={styles.receiptBrand}>GONG CHA</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 16}}>
              <MapPin size={12} color={DESIGN.textSecondary} style={{marginRight: 4}} />
              <Text style={styles.receiptStore}>Tunjungan Plaza, SBY</Text>
            </View>
            <Text style={styles.receiptDate}>27 Feb 2026 • {selectedTrx.time}</Text>
            <Text style={styles.receiptTrxId}>{selectedTrx.id}</Text>
         </View>

         <View style={styles.receiptDashedLine} />

         <ScrollView showsVerticalScrollIndicator={false} style={{flex: 1}} contentContainerStyle={styles.receiptBody}>
            {selectedTrx.member && (
               <View style={styles.receiptMemberBox}>
                  <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                     <Users size={16} color={DESIGN.textPrimary} style={{marginRight: 8}} />
                     <Text style={styles.receiptMemberLabel}>Member Customer</Text>
                  </View>
                  <Text style={styles.receiptMemberName}>{selectedTrx.member}</Text>
                  <Text style={styles.receiptMemberId}>{selectedTrx.memberId}</Text>
                  
                  <View style={styles.receiptPointRow}>
                     <Text style={styles.receiptPointLabel}>Points Earned:</Text>
                     <Text style={styles.receiptPointValue}>+{selectedTrx.points} Pts</Text>
                  </View>
                  <View style={styles.receiptPointRow}>
                     <Text style={styles.receiptPointLabel}>Status:</Text>
                     <View style={[styles.pointStatusBadge, selectedTrx.pointStatus === 'RELEASED' ? styles.badgeSuccess : styles.badgeWarning]}>
                        {selectedTrx.pointStatus === 'RELEASED' ? <CheckCircle2 size={10} color={DESIGN.successGreen} style={{marginRight:4}}/> : <Clock size={10} color={DESIGN.outstandingOrange} style={{marginRight:4}}/>}
                        <Text style={[styles.pointStatusText, selectedTrx.pointStatus === 'RELEASED' ? {color: DESIGN.successGreen} : {color: DESIGN.outstandingOrange}]}>
                           {selectedTrx.pointStatus}
                        </Text>
                     </View>
                  </View>
               </View>
            )}

            <Text style={styles.receiptItemsHeader}>Order Summary</Text>
            <View style={styles.receiptItemRow}>
               <View style={{flex: 1}}><Text style={styles.receiptItemName}>1x Brown Sugar Pearl Milk Tea</Text><Text style={styles.receiptItemNote}>Large, Normal Ice, 50% Sugar</Text></View>
               <Text style={styles.receiptItemPrice}>65.000</Text>
            </View>

            <View style={[styles.receiptDashedLine, {marginVertical: 24}]} />
            
            <View style={styles.receiptTotalRow}>
               <Text style={styles.receiptTotalText}>TOTAL</Text>
               <Text style={styles.receiptTotalValue}>{selectedTrx.total}</Text>
            </View>

            <View style={styles.receiptPaymentInfo}>
               <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 {selectedTrx.method === 'Cash' ? <Banknote size={16} color={DESIGN.textSecondary}/> : <Smartphone size={16} color={DESIGN.textSecondary}/>}
                 <Text style={styles.receiptPaymentText}>Paid via {selectedTrx.method}</Text>
               </View>
            </View>
            <View style={{height: 60}} />
         </ScrollView>
       </Animated.View>
    );
  }

  const renderModalContent = () => {
    if (!activeModal) return null;
    if (activeModal === 'RECEIPT') return renderDigitalReceipt();

    return (
      <View style={{ flex: 1, backgroundColor: DESIGN.surface }}>
        <Animated.View {...panResponder.panHandlers} style={[styles.dragHeaderArea, { paddingTop: morphPaddingTop }]}>
           <Animated.View style={[styles.dragPill, { opacity: morphHalfOpacity }]} />
           <View style={styles.sheetHeaderContent}>
             {activeModal === 'REVENUE' && <View style={styles.sheetIconBoxRed}><TrendingUp color={DESIGN.brandRed} size={28} /></View>}
             {activeModal === 'MEMBERS' && <View style={styles.sheetIconBoxDark}><Users color={DESIGN.surface} size={28} /></View>}
             {activeModal === 'TIERS' && <View style={styles.sheetIconBoxGold}><Crown color={DESIGN.gold} size={28} /></View>}
             {activeModal === 'PROMOS' && <View style={styles.sheetIconBoxLight}><Ticket color={DESIGN.textPrimary} size={28} /></View>}
             <View style={{ flex: 1 }}>
               <Text style={styles.sheetTitle}>
                 {activeModal === 'REVENUE' ? 'Revenue Details' : activeModal === 'MEMBERS' ? 'Member Visits' : activeModal === 'TIERS' ? 'Tier Distribution' : 'Top Promos'}
               </Text>
               <View style={{position: 'relative', height: 20}}>
                  <Animated.Text style={[styles.sheetSub, { position: 'absolute', opacity: morphHalfOpacity }]}>
                    {activeModal === 'REVENUE' ? "Breakdown of today's Rp 4.250.000" : activeModal === 'MEMBERS' ? "128 scans today." : activeModal === 'TIERS' ? "Majority are Gold members." : "Most redeemed vouchers today."}
                  </Animated.Text>
                  <Animated.Text style={[styles.sheetSub, { position: 'absolute', opacity: morphFullOpacity }]}>
                    {activeModal === 'REVENUE' ? "Comprehensive Revenue Report" : activeModal === 'MEMBERS' ? "Complete Member Traffic" : activeModal === 'TIERS' ? "Detailed Tier Analytics" : "Voucher & Promo History"}
                  </Animated.Text>
               </View>
             </View>
             <Pressable style={styles.actionBtn} onPress={closeModal}><X size={24} color={DESIGN.textPrimary} /></Pressable>
           </View>
           {renderFilterBar()}
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScrollBody} bounces={true}>
          {activeModal === 'REVENUE' && (
             <View>
                <Animated.View style={[styles.dummyChartBox, { height: morphChartHeight }]}>
                   <Animated.View style={{ transform: [{ scale: morphChartHeight.interpolate({ inputRange: [160, 240], outputRange: [1, 1.3] }) }] }}>
                     <Activity color={DESIGN.brandRed} size={48} opacity={0.5} />
                   </Animated.View>
                   <Animated.Text style={[styles.bentoLabel, { opacity: morphHalfOpacity, position: 'absolute', bottom: 20 }]}>Sales peaked at 12:00 PM</Animated.Text>
                   <Animated.Text style={[styles.bentoLabel, { opacity: morphFullOpacity, position: 'absolute', bottom: 20 }]}>Hourly Revenue Trend (24h)</Animated.Text>
                </Animated.View>
                <Animated.View style={{ opacity: morphFullOpacity, overflow: 'hidden' }}>
                  <View style={styles.kpiRow}><View style={styles.kpiBox}><Text style={styles.kpiLabel}>Avg. Order Value</Text><Text style={styles.kpiValue}>Rp 42.500</Text></View><View style={styles.kpiBox}><Text style={styles.kpiLabel}>Total Transactions</Text><Text style={styles.kpiValue}>100</Text></View></View>
                </Animated.View>
                <Text style={styles.sectionTitle}>Payment Methods</Text>
                <View style={styles.detailRow}><Text style={styles.detailText}>Cash</Text><Text style={styles.detailValue}>Rp 1.200.000</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailText}>QRIS / E-Wallet</Text><Text style={styles.detailValue}>Rp 3.050.000</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailText}>Credit Card</Text><Text style={styles.detailValue}>Rp 0</Text></View>
             </View>
          )}

          {activeModal === 'MEMBERS' && (
            <View>
               <Text style={styles.sectionTitle}>Recent Logs</Text>
               {[1,2,3,4,5].map((i) => (<View key={i} style={styles.memberListItem}><View style={styles.memberAvatar}><Text style={{color: '#FFF', fontWeight: 'bold'}}>M</Text></View><View style={{flex: 1, marginLeft: 16}}><Text style={styles.memberName}>Customer 00{i}</Text><Text style={styles.memberTime}>Just now</Text></View><ChevronRight size={20} color={DESIGN.border} /></View>))}
               <Animated.Text style={[styles.seeMoreText, { opacity: morphHalfOpacity }]}>Drag up to see all members</Animated.Text>
            </View>
          )}

          {activeModal === 'TIERS' && (
             <View>
              <Text style={styles.sectionTitle}>Distribution Chart</Text>
              <View style={styles.tierStatRow}><View style={styles.tierBarContainer}><View style={[styles.tierBar, {width: '70%', backgroundColor: DESIGN.gold}]}/></View><Text style={styles.tierStatText}>70% Gold</Text></View>
              <View style={styles.tierStatRow}><View style={styles.tierBarContainer}><View style={[styles.tierBar, {width: '20%', backgroundColor: DESIGN.textSecondary}]}/></View><Text style={styles.tierStatText}>20% Silver</Text></View>
              <View style={styles.tierStatRow}><View style={styles.tierBarContainer}><View style={[styles.tierBar, {width: '10%', backgroundColor: DESIGN.surfaceDark}]}/></View><Text style={styles.tierStatText}>10% Plat.</Text></View>
             </View>
          )}

          {activeModal === 'PROMOS' && (
             <View>
              <Text style={styles.sectionTitle}>Redeemed Today</Text>
              <View style={styles.promoCardModal}><View><Text style={styles.promoTitle}>Buy 1 Get 1 Pearl</Text><Text style={styles.promoCount}>45 Redeemed</Text></View><ChevronRight size={24} color={DESIGN.textSecondary}/></View>
              <View style={styles.promoCardModal}><View><Text style={styles.promoTitle}>Discount 20% (Gold)</Text><Text style={styles.promoCount}>18 Redeemed</Text></View><ChevronRight size={24} color={DESIGN.textSecondary}/></View>
             </View>
          )}
          <View style={{height: 160}}/>
        </ScrollView>
      </View>
    );
  };

  const renderPage = ({ item }: { item: TabOption }) => {
    return (
      <View style={{ width, height: '100%' }}>
        {item === 'HOME' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.bentoContainer}>
              <SquishyBento onPress={() => openModal('REVENUE')} style={styles.heroBlackCard}>
                <View style={styles.heroTop}>
                  <View style={styles.badgeGlow}><Text style={styles.badgeText}>LIVE</Text></View>
                  <TrendingUp size={24} color={DESIGN.brandRed} />
                </View>
                <View style={styles.heroBottom}>
                  <Text style={styles.heroLabel}>Total Revenue Today</Text>
                  {/* --- NILAI REVENUE DARI ZUSTAND --- */}
                  <Text style={styles.heroValue}><Text style={styles.currency}>Rp</Text> {formatRupiah(totalRevenue)}</Text>
                </View>
              </SquishyBento>

              <View style={styles.bentoRow}>
                <SquishyBento onPress={() => openModal('MEMBERS')} style={[styles.bentoBox, styles.bentoBoxSmall]}>
                   <View style={styles.iconWrapperDark}><Users size={22} color={DESIGN.surface} /></View>
                   <View>
                      {/* --- NILAI VISITS DARI ZUSTAND --- */}
                      <Text style={styles.bentoValue}>{memberVisits}</Text>
                      <Text style={styles.bentoLabel}>Member Visits</Text>
                   </View>
                </SquishyBento>
                <SquishyBento onPress={() => openModal('TIERS')} style={[styles.bentoBox, styles.bentoBoxSmall]}><View style={styles.iconWrapperGold}><Crown size={22} color={DESIGN.gold} /></View><View><Text style={styles.bentoValue}>Gold</Text><Text style={styles.bentoLabel}>Top Tier Today</Text></View></SquishyBento>
              </View>

              <SquishyBento onPress={() => openModal('PROMOS')} style={[styles.bentoBox, styles.bentoBoxWide]}>
                  <View style={styles.wideBoxContent}><View><Text style={styles.bentoLabel}>Top Redeemed Promo</Text><Text style={styles.wideBoxTitle}>Buy 1 Get 1 Pearl</Text></View><Ticket size={32} color={DESIGN.textSecondary} strokeWidth={1.5} /></View>
              </SquishyBento>
              <View style={{ height: 120 }} /> 
            </View>
          </ScrollView>
        )}

        {item === 'HISTORY' && (
          <View style={{ flex: 1, backgroundColor: DESIGN.canvas }}>
             <View style={styles.subTabContainer}>
                <View style={styles.subTabTrack}>
                   <Pressable onPress={() => setHistoryTab('TRANSACTIONS')} style={[styles.subTabItem, historyTab === 'TRANSACTIONS' && styles.subTabActive]}>
                      <Text style={[styles.subTabText, historyTab === 'TRANSACTIONS' && styles.subTabTextActive]}>Transactions</Text>
                   </Pressable>
                   <Pressable onPress={() => setHistoryTab('REDEMPTIONS')} style={[styles.subTabItem, historyTab === 'REDEMPTIONS' && styles.subTabActive]}>
                      <Text style={[styles.subTabText, historyTab === 'REDEMPTIONS' && styles.subTabTextActive]}>Redemptions</Text>
                   </Pressable>
                </View>
             </View>

             <SectionList<any, any> 
                sections={historyTab === 'TRANSACTIONS' ? TRX_HISTORY_DATA : REDEEM_HISTORY_DATA}
                keyExtractor={(item: any) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}
                stickySectionHeadersEnabled={true}
                
                renderSectionHeader={({ section }) => (
                  <View style={styles.historySectionHeader}>
                    <Text style={styles.historySectionText}>{section.title}</Text>
                  </View>
                )}
                
                renderItem={({ item }) => {
                  if (historyTab === 'TRANSACTIONS') {
                    return (
                      <Pressable style={({pressed}) => [styles.historyRow, pressed && { backgroundColor: 'rgba(0,0,0,0.02)', transform: [{scale: 0.98}] }]} onPress={() => openModal('RECEIPT', item)}>
                         <View style={styles.historyIconBox}>{item.method === 'Cash' ? <Banknote size={20} color={DESIGN.textPrimary} /> : <Smartphone size={20} color={DESIGN.textPrimary} />}</View>
                         <View style={styles.historyInfo}>
                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 2}}>
                               <Text style={styles.historyTrxId}>{item.id}</Text>
                               {item.points > 0 && (<View style={[styles.historyPointBadge, item.pointStatus === 'RELEASED' ? {backgroundColor: 'rgba(50, 215, 75, 0.1)'} : {}]}><Text style={[styles.historyPointText, item.pointStatus === 'RELEASED' ? {color: DESIGN.successGreen} : {}]}>+{item.points} Pts</Text></View>)}
                            </View>
                            <Text style={styles.historyDetails}>{item.time} • {item.items} Items {item.member ? `• ${item.member}` : ''}</Text>
                         </View>
                         <View style={styles.historyTotalBox}><Text style={styles.historyTotalText}>{item.total}</Text></View>
                      </Pressable>
                    );
                  } else {
                    return (
                      <View style={styles.historyRow}>
                         <View style={[styles.historyIconBox, {backgroundColor: 'rgba(211, 35, 42, 0.05)'}]}><Ticket size={20} color={DESIGN.brandRed} /></View>
                         <View style={styles.historyInfo}>
                            <Text style={[styles.historyTrxId, {marginBottom: 2}]}>{item.voucher}</Text>
                            <Text style={styles.historyDetails}>{item.time} • Redeemed by {item.member}</Text>
                         </View>
                         <View style={styles.historyTotalBox}><Text style={[styles.historyTotalText, {color: DESIGN.brandRed, fontSize: 13}]}>REDEEMED</Text></View>
                      </View>
                    );
                  }
                }}
             />
          </View>
        )}

        {/* --- HALAMAN PROFILE --- */}
        {item === 'PROFILE' && (
             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.profileContainer}>
                <View style={styles.profileHero}>
                   <View style={styles.profileAvatarBox}>
                      <Store size={40} color={DESIGN.textPrimary} />
                   </View>
                   {/* --- NAMA TOKO DARI ZUSTAND --- */}
                   <Text style={styles.profileStoreName}>{storeName}</Text>
                   <Text style={styles.profileStoreLocation}>{storeName}</Text>
                   
                   <View style={styles.profileStatusBadge}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>System Connected</Text>
                   </View>
                </View>

                <Text style={styles.sectionHeading}>System Actions</Text>
                
                <View style={styles.profileActionGroup}>
                   <Pressable style={({pressed}) => [styles.profileActionRow, pressed && {backgroundColor: DESIGN.canvas}]} onPress={handleSyncDatabase}>
                      <View style={styles.profileActionLeft}>
                         <View style={styles.actionIconBox}>
                            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                               <RefreshCcw size={20} color={DESIGN.textPrimary} />
                            </Animated.View>
                         </View>
                         <Text style={styles.actionText}>Sync Database</Text>
                      </View>
                      <ChevronRight size={20} color={DESIGN.border} />
                   </Pressable>

                   <View style={styles.actionDivider} />

                   <Pressable style={({pressed}) => [styles.profileActionRow, pressed && {backgroundColor: DESIGN.canvas}]} onPress={() => console.log('Logout pressed')}>
                      <View style={styles.profileActionLeft}>
                         <View style={[styles.actionIconBox, {backgroundColor: 'rgba(211, 35, 42, 0.1)'}]}>
                            <LogOut size={20} color={DESIGN.brandRed} />
                         </View>
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
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>{getGreeting()}</Text>
            {/* --- NAMA TOKO DARI ZUSTAND --- */}
            <Text style={styles.locationTitle}>{storeName}.</Text>
          </View>
          <View style={styles.avatarPremium}>
            <Image source={require('../../assets/images/logo1.webp')} style={styles.logoImage} resizeMode="contain" />
            <View style={styles.onlineDot} />
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

        <Animated.FlatList
          ref={flatListRef} data={TABS} keyExtractor={(item) => item} renderItem={renderPage} horizontal pagingEnabled showsHorizontalScrollIndicator={false} bounces={false} onMomentumScrollEnd={handleMomentumScrollEnd} onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })} scrollEventThrottle={16}
        />

        <View style={styles.floatingWrapper} pointerEvents="box-none">
          <Pressable style={({ pressed }) => [styles.scanPill, pressed && { transform: [{ scale: 0.94 }] }]} onPress={() => setIsScannerVisible(true)}>
            <View style={styles.scanIconBox}><QrCode size={20} color={DESIGN.brandRed} strokeWidth={3} /></View>
            <Text style={styles.scanText}>SCAN QR</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal visible={activeModal !== null} transparent={true} animationType="none" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={activeModal === 'RECEIPT' ? undefined : closeModal}>
             <Animated.View style={[styles.modalBackdrop, { opacity: backdropOpacity }]} />
          </TouchableWithoutFeedback>
          <Animated.View style={[styles.modalSheetContainer, { transform: [{ translateY: modalY }] }, isFullScreen && { borderRadius: 0 }, activeModal === 'RECEIPT' && {backgroundColor: 'transparent', shadowOpacity: 0} ]}>
            {renderModalContent()}
          </Animated.View>
        </View>
      </Modal>

      <ScannerOverlay visible={isScannerVisible} onClose={() => setIsScannerVisible(false)} onSuccessScan={handleSimulateScan} />
      <MemberDetailPage visible={isMemberPageVisible} onClose={() => setIsMemberPageVisible(false)} />
    </View>
  );
}

// --- WORLD-CLASS STYLESHEET ---
const styles = StyleSheet.create({
    scannerContainer: { ...StyleSheet.absoluteFillObject, zIndex: 999, backgroundColor: '#000' },
    cameraLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
    noCameraBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
    darkHoleOverlay: {
      position: 'absolute',
      top: height / 2 - 130 - 1000,   
      left: width / 2 - 130 - 1000,   
      width: 260 + 2000,              
      height: 260 + 2000,
      borderWidth: 1000,
      borderRadius: 1048,             
      borderColor: 'rgba(0,0,0,0.85)',
      zIndex: 2,
    },
    viewfinderCenterFrame: { 
       position: 'absolute', 
       top: height / 2 - 130, 
       left: width / 2 - 130,
       width: 260, 
       height: 260, 
       justifyContent: 'center', 
       alignItems: 'center',
       zIndex: 3
    },
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
    dummySimulateBtn: { backgroundColor: DESIGN.surface, paddingVertical: 18, paddingHorizontal: 40, borderRadius: 100, shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.3, shadowRadius: 20 },
    dummySimulateText: { color: DESIGN.textPrimary, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  logoImage: { width: 28, height: 28 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#34C759', borderWidth: 2, borderColor: DESIGN.surface },
  root: { flex: 1, backgroundColor: DESIGN.canvas },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  eyebrow: { fontSize: 13, fontWeight: '700', color: DESIGN.textSecondary, letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  locationTitle: { fontSize: 32, fontWeight: '900', color: DESIGN.textPrimary, letterSpacing: -1.2, lineHeight: 36 },
  avatarPremium: { width: 48, height: 48, borderRadius: 24, backgroundColor: DESIGN.surface, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  
  tabTrackWrapper: { paddingHorizontal: SCREEN_PADDING, marginBottom: 24 },
  tabTrack: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.04)', padding: TAB_TRACK_PADDING, borderRadius: 100, position: 'relative' },
  activeTabHighlight: { position: 'absolute', top: TAB_TRACK_PADDING, left: TAB_TRACK_PADDING, width: TAB_SEGMENT_WIDTH, height: 44, backgroundColor: DESIGN.surface, borderRadius: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  tabSegment: { width: TAB_SEGMENT_WIDTH, height: 44, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  tabText: { fontSize: 13, fontWeight: '600', color: DESIGN.textSecondary, letterSpacing: 0.5 },
  tabTextActive: { color: DESIGN.textPrimary, fontWeight: '800' },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  bentoContainer: { gap: 16 },
  heroBlackCard: { backgroundColor: DESIGN.surfaceDark, borderRadius: 32, padding: 24, height: 180, justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badgeGlow: { backgroundColor: DESIGN.glowRed, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(211, 35, 42, 0.5)' },
  badgeText: { color: DESIGN.brandRed, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  heroBottom: { marginTop: 'auto' },
  heroLabel: { color: DESIGN.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  heroValue: { color: DESIGN.surface, fontSize: 38, fontWeight: '900', letterSpacing: -1.5 },
  currency: { fontSize: 24, color: DESIGN.textSecondary },
  decimals: { fontSize: 24, color: DESIGN.textSecondary },
  bentoRow: { flexDirection: 'row', gap: 16 },
  bentoBox: { backgroundColor: DESIGN.surface, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: DESIGN.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 12 },
  bentoBoxSmall: { flex: 1, height: 160, justifyContent: 'space-between' },
  bentoBoxWide: { width: '100%', height: 100, justifyContent: 'center' },
  wideBoxContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wideBoxTitle: { fontSize: 18, fontWeight: '800', color: DESIGN.textPrimary, marginTop: 4, letterSpacing: -0.5 },
  iconWrapperDark: { width: 44, height: 44, borderRadius: 22, backgroundColor: DESIGN.surfaceDark, justifyContent: 'center', alignItems: 'center' },
  iconWrapperGold: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center' },
  bentoValue: { fontSize: 28, fontWeight: '900', color: DESIGN.textPrimary, letterSpacing: -1 },
  bentoLabel: { fontSize: 13, fontWeight: '600', color: DESIGN.textSecondary },
  comingSoonBox: { height: 200, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(0,0,0,0.05)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  comingSoonText: { fontSize: 20, fontWeight: '800', color: 'rgba(0,0,0,0.2)', letterSpacing: 2 },
  
  floatingWrapper: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 24, alignSelf: 'center' },
  scanPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: DESIGN.brandRed, padding: 8, paddingRight: 32, borderRadius: 100, shadowColor: DESIGN.brandRed, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 12 },
  scanIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: DESIGN.surface, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  scanText: { color: DESIGN.surface, fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },

  // --- DUAL HISTORY STYLES ---
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
  historyDetails: { fontSize: 13, color: DESIGN.textSecondary, marginTop: 2 },
  historyTotalBox: { alignItems: 'flex-end', justifyContent: 'center' },
  historyTotalText: { fontSize: 16, fontWeight: '900', color: DESIGN.textPrimary },
  
  historyPointBadge: { marginLeft: 8, backgroundColor: 'rgba(255, 159, 10, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  historyPointText: { fontSize: 10, fontWeight: '800', color: DESIGN.outstandingOrange },

  // --- PROFILE TAB STYLES ---
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

  // --- MODAL STYLES ---
  modalOverlay: { flex: 1 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  modalSheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height, backgroundColor: DESIGN.surface, borderTopLeftRadius: 36, borderTopRightRadius: 36, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 20 },
  dragHeaderArea: { paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: DESIGN.canvas, backgroundColor: DESIGN.surface, borderTopLeftRadius: 36, borderTopRightRadius: 36, zIndex: 10 },
  dragPill: { width: 48, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.1)', alignSelf: 'center', marginBottom: 20 },
  sheetHeaderContent: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: DESIGN.canvas, justifyContent: 'center', alignItems: 'center', marginLeft: 16 },
  filterBarContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  datePickerPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: DESIGN.canvas, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100 },
  datePickerText: { fontSize: 14, fontWeight: '700', color: DESIGN.textPrimary },
  filterIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: DESIGN.canvas, justifyContent: 'center', alignItems: 'center' },
  kpiRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  kpiBox: { flex: 1, backgroundColor: DESIGN.canvas, padding: 16, borderRadius: 20 },
  kpiLabel: { fontSize: 13, fontWeight: '600', color: DESIGN.textSecondary, marginBottom: 4 },
  kpiValue: { fontSize: 22, fontWeight: '800', color: DESIGN.textPrimary },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: DESIGN.textPrimary, marginBottom: 16, marginTop: 8 },
  seeMoreText: { textAlign: 'center', color: DESIGN.textSecondary, fontSize: 14, fontWeight: '600', marginVertical: 16, fontStyle: 'italic' },
  sheetScrollBody: { paddingHorizontal: 24, paddingTop: 24 },
  sheetIconBoxRed: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(211, 35, 42, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  sheetIconBoxDark: { width: 56, height: 56, borderRadius: 16, backgroundColor: DESIGN.surfaceDark, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  sheetIconBoxGold: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  sheetIconBoxLight: { width: 56, height: 56, borderRadius: 16, backgroundColor: DESIGN.canvas, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  sheetTitle: { fontSize: 24, fontWeight: '800', color: DESIGN.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  sheetSub: { fontSize: 15, color: DESIGN.textSecondary },
  dummyChartBox: { backgroundColor: DESIGN.canvas, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 24, position: 'relative' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  detailText: { fontSize: 16, fontWeight: '500', color: DESIGN.textSecondary },
  detailValue: { fontSize: 18, fontWeight: '800', color: DESIGN.textPrimary },
  memberListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  memberAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: DESIGN.textSecondary, justifyContent: 'center', alignItems: 'center' },
  memberName: { fontSize: 18, fontWeight: '700', color: DESIGN.textPrimary, marginBottom: 2 },
  memberTime: { fontSize: 14, color: DESIGN.textSecondary },
  tierStatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  tierBarContainer: { flex: 1, height: 12, backgroundColor: DESIGN.canvas, borderRadius: 6, marginRight: 16, overflow: 'hidden' },
  tierBar: { height: '100%', borderRadius: 6 },
  tierStatText: { width: 90, fontSize: 16, fontWeight: '800', color: DESIGN.textPrimary, textAlign: 'right' },
  promoCardModal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: DESIGN.canvas, padding: 20, borderRadius: 24, marginBottom: 12 },
  promoTitle: { fontSize: 16, fontWeight: '800', color: DESIGN.textPrimary, marginBottom: 4 },
  promoCount: { fontSize: 14, color: DESIGN.textSecondary, fontWeight: '500' },

  // --- DIGITAL RECEIPT STYLES ---
  receiptPaper: { marginHorizontal: 16, backgroundColor: DESIGN.receiptPaper, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.2, shadowRadius: 20, elevation: 15, overflow: 'hidden' },
  receiptDragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.1)', alignSelf: 'center', marginTop: 12 },
  closeReceiptBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 8 },
  
  receiptHeader: { alignItems: 'center', paddingTop: 24, paddingBottom: 24 },
  receiptBrand: { fontSize: 22, fontWeight: '900', color: DESIGN.textPrimary, letterSpacing: 2 },
  receiptStore: { fontSize: 13, fontWeight: '600', color: DESIGN.textSecondary },
  receiptDate: { fontSize: 12, color: DESIGN.textSecondary, marginTop: 12 },
  receiptTrxId: { fontSize: 12, fontWeight: '700', color: DESIGN.textPrimary, marginTop: 4, opacity: 0.5 },

  receiptDashedLine: { width: '100%', height: 1, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)', borderStyle: 'dashed' },
  
  receiptBody: { paddingHorizontal: 24, paddingTop: 24 },
  
  receiptMemberBox: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  receiptMemberLabel: { fontSize: 12, fontWeight: '700', color: DESIGN.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  receiptMemberName: { fontSize: 18, fontWeight: '900', color: DESIGN.textPrimary, marginBottom: 2 },
  receiptMemberId: { fontSize: 13, color: DESIGN.textSecondary, marginBottom: 16, letterSpacing: 1 },
  receiptPointRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  receiptPointLabel: { fontSize: 13, fontWeight: '600', color: DESIGN.textSecondary },
  receiptPointValue: { fontSize: 14, fontWeight: '800', color: DESIGN.gold },
  pointStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  badgeSuccess: { backgroundColor: 'rgba(50, 215, 75, 0.1)' },
  badgeWarning: { backgroundColor: 'rgba(255, 159, 10, 0.1)' },
  pointStatusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  receiptItemsHeader: { fontSize: 12, fontWeight: '800', color: DESIGN.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 },
  receiptItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  receiptItemName: { fontSize: 15, fontWeight: '700', color: DESIGN.textPrimary, marginBottom: 4 },
  receiptItemNote: { fontSize: 13, color: DESIGN.textSecondary },
  receiptItemPrice: { fontSize: 15, fontWeight: '800', color: DESIGN.textPrimary },
  
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  receiptTotalText: { fontSize: 18, fontWeight: '900', color: DESIGN.textPrimary },
  receiptTotalValue: { fontSize: 24, fontWeight: '900', color: DESIGN.brandRed, letterSpacing: -1 },

  receiptPaymentInfo: { alignItems: 'center', paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12 },
  receiptPaymentText: { fontSize: 14, fontWeight: '700', color: DESIGN.textSecondary, marginLeft: 8 },


  // --- NEW: THE APPLE WALLET MEMBER PAGE ---
  pageContainer: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  pageBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: DESIGN.canvas },
  floatingHeader: { position: 'absolute', left: 20, zIndex: 10 },
  floatingBackPill: { width: 44, height: 44, borderRadius: 22, backgroundColor: DESIGN.surface, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  pageScroll: { paddingHorizontal: 24 },
  digitalCard: { width: '100%', height: 220, backgroundColor: DESIGN.surfaceDark, borderRadius: 24, padding: 24, justifyContent: 'space-between', marginBottom: 24, shadowColor: '#000', shadowOffset: {width: 0, height: 16}, shadowOpacity: 0.25, shadowRadius: 24, elevation: 15 },
  digitalCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBrandText: { color: DESIGN.surface, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  cardSubText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  cardTierBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: DESIGN.gold, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  cardTierText: { color: DESIGN.surfaceDark, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  digitalCardBody: { marginTop: 'auto' },
  cardMemberName: { color: DESIGN.surface, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  cardMemberID: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600', letterSpacing: 2 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: DESIGN.surface, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.02, shadowRadius: 12 },
  statIconGold: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  statIconDark: { width: 40, height: 40, borderRadius: 20, backgroundColor: DESIGN.surfaceDark, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  statLabel: { fontSize: 13, fontWeight: '600', color: DESIGN.textSecondary, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '900', color: DESIGN.textPrimary, letterSpacing: -0.5 },
  sectionHeading: { fontSize: 18, fontWeight: '900', color: DESIGN.textPrimary, marginBottom: 16, letterSpacing: -0.5 },
  rewardContainer: { gap: 12 },
  ticketCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: DESIGN.surface, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.02, shadowRadius: 8 },
  ticketLeft: { flex: 1, paddingRight: 16 },
  ticketTitle: { fontSize: 16, fontWeight: '800', color: DESIGN.textPrimary, marginBottom: 4 },
  ticketSub: { fontSize: 13, fontWeight: '600', color: DESIGN.brandRed },
  ticketDivider: { width: 1, height: '100%', backgroundColor: DESIGN.canvas, marginHorizontal: 16 }, 
  ticketRight: { justifyContent: 'center', alignItems: 'center', paddingLeft: 8 },
  ticketActionText: { fontSize: 15, fontWeight: '800', color: DESIGN.surfaceDark },
  stickyBottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(242, 242, 247, 0.9)', paddingTop: 16, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  primaryActionBtn: { flexDirection: 'row', backgroundColor: DESIGN.brandRed, paddingVertical: 18, borderRadius: 100, alignItems: 'center', justifyContent: 'center', shadowColor: DESIGN.brandRed, shadowOffset: {width:0, height:10}, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  primaryActionText: { color: DESIGN.surface, fontSize: 17, fontWeight: '900', letterSpacing: 0.5 }
});