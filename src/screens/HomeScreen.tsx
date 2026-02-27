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
  Pressable,
} from 'react-native';
import { Bell, X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenFadeTransition from '../components/ScreenFadeTransition';
import { getGreeting } from '../utils/greetingHelper';
import { useTheme } from '../context/ThemeContext';
import { useStaffAuth } from '../context/StaffAuthContext';

// ─── Types ────────────────────────────────────────────────────

type TrxStatus = 'pending' | 'released' | 'void';

interface TrxItem {
  id: string;
  memberName: string;
  memberTier: 'Silver' | 'Gold' | 'Platinum';
  nominal: number;
  status: TrxStatus;
  createdAt: string;
}

// ─── Dummy data (replace with Firestore) ──────────────────────

const TODAY = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

const DATA = {
  totalAmount: 4_875_000,
  totalTrx: 47,
  voucherRedeemed: 9,
  pendingVouchers: 2,
};

const TRX: TrxItem[] = [
  { id: 't1', memberName: 'Rina Kartika',    memberTier: 'Gold',     nominal: 85_000,  status: 'released', createdAt: new Date(Date.now() - 1000*60*12).toISOString() },
  { id: 't2', memberName: 'Budi Santoso',    memberTier: 'Silver',   nominal: 52_000,  status: 'pending',  createdAt: new Date(Date.now() - 1000*60*34).toISOString() },
  { id: 't3', memberName: 'Sari Dewi',       memberTier: 'Platinum', nominal: 120_000, status: 'pending',  createdAt: new Date(Date.now() - 1000*60*58).toISOString() },
  { id: 't4', memberName: 'Andi Wijaya',     memberTier: 'Silver',   nominal: 38_000,  status: 'void',     createdAt: new Date(Date.now() - 1000*60*80).toISOString() },
  { id: 't5', memberName: 'Dewi Lestari',    memberTier: 'Gold',     nominal: 96_000,  status: 'released', createdAt: new Date(Date.now() - 1000*60*110).toISOString() },
];

const TOP_VOUCHERS = [
  { id: 'v1', title: 'Free Brown Sugar Milk Tea', count: 5 },
  { id: 'v2', title: 'Buy 1 Get 1 Taro',          count: 3 },
  { id: 'v3', title: 'Diskon 20% All Size',        count: 1 },
];

const TIERS = [
  { tier: 'Platinum', count: 3,  color: '#7C3AED', pct: 12 },
  { tier: 'Gold',     count: 8,  color: '#C9933A', pct: 33 },
  { tier: 'Silver',   count: 13, color: '#9CA3AF', pct: 55 },
];

const NOTIFS = [
  { id: '1', title: 'Trx POS-0221-009 Void',  body: 'Transaksi Budi divoid oleh admin — nominal tidak sesuai.', time: '1 jam lalu', read: false },
  { id: '2', title: 'Settlement Selesai',      body: '47 trx berhasil di-match. 2 masuk dispute.',               time: '3 jam lalu', read: false },
  { id: '3', title: 'Poin Released',           body: 'Batch settlement 22 Feb diproses. Poin aktif ke member.',  time: 'Kemarin',    read: true  },
];

// ─── Helpers ──────────────────────────────────────────────────

const rp = (n: number) =>
  n >= 1_000_000
    ? `Rp ${(n / 1_000_000).toFixed(1)}jt`
    : `Rp ${n.toLocaleString('id-ID')}`;

const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)}m lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)}j lalu`;
  return `${Math.floor(s / 86400)}h lalu`;
};

const TIER_COLOR: Record<string, string> = {
  Silver: '#9CA3AF', Gold: '#C9933A', Platinum: '#7C3AED',
};

const STATUS_COLOR: Record<TrxStatus, string> = {
  pending: '#CA8A04', released: '#16A34A', void: '#DC2626',
};

// ─── Bento Cell wrapper ────────────────────────────────────────

function Cell({
  onPress, style, children,
}: { onPress: () => void; style?: any; children: React.ReactNode }) {
  const sc = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(sc, { toValue: 0.965, useNativeDriver: true, friction: 8, tension: 120 }).start()}
      onPressOut={() => Animated.spring(sc, { toValue: 1, useNativeDriver: true, friction: 8, tension: 120 }).start()}
    >
      <Animated.View style={[{ transform: [{ scale: sc }] }, style]} />
    </Pressable>
  );
}

// ─── Main ──────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { staff } = useStaffAuth();
  const { colors, activeMode } = useTheme();
  const isDark = activeMode === 'dark';
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const GAP   = 10;
  const H_PAD = 16;
  const ICON  = 46;
  const HALF  = (width - H_PAD * 2 - GAP) / 2;

  const [showNotif, setShowNotif] = useState(false);
  const bellRef = useRef<View>(null);
  const [bellY, setBellY] = useState(0);

  const scA = useRef(new Animated.Value(0)).current;
  const opA = useRef(new Animated.Value(0)).current;
  const bgA = useRef(new Animated.Value(0)).current;
  const rtA = useRef(new Animated.Value(0)).current;
  const bbA = useRef(new Animated.Value(0)).current;

  const unread = NOTIFS.filter(n => !n.read).length;

  const openNotif = () => {
    bellRef.current?.measure((x, y, w, h, px, py) => {
      setBellY(py);
      setShowNotif(true);
      Animated.parallel([
        Animated.timing(bgA, { toValue: 1, duration: 260, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.spring(scA, { toValue: 1, useNativeDriver: true, friction: 10, tension: 80 }),
        Animated.timing(opA, { toValue: 1, duration: 280, delay: 70, useNativeDriver: true }),
        Animated.spring(rtA, { toValue: 1, useNativeDriver: true, friction: 8, tension: 100 }),
        Animated.timing(bbA, { toValue: 1, duration: 260, useNativeDriver: false }),
      ]).start();
    });
  };

  const closeNotif = () => {
    Animated.parallel([
      Animated.timing(bgA, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scA, { toValue: 0, duration: 240, useNativeDriver: true, easing: Easing.in(Easing.back(1.2)) }),
      Animated.timing(opA, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.spring(rtA, { toValue: 0, useNativeDriver: true, friction: 8, tension: 100 }),
      Animated.timing(bbA, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start(() => setShowNotif(false));
  };

  const bellCX = width - H_PAD - 42 - 10 - ICON / 2;
  const modalT = [
    { translateX: bellCX - width / 2 },
    { translateY: -(height / 2) + 100 },
    { scale: scA.interpolate({ inputRange: [0, 1], outputRange: [0.01, 1] }) },
    { translateX: -(bellCX - width / 2) },
    { translateY: height / 2 - 100 },
  ];
  const rotDeg = rtA.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const rtSc   = rtA.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.8, 1] });
  const bOp    = rtA.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] });
  const xOp    = rtA.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
  const bbCol  = bbA.interpolate({ inputRange: [0, 1], outputRange: [colors.surface.card, colors.brand.primary] });

  // ── Palette ──────────────────────────────────────────────────
  const BG     = isDark ? '#161412' : '#F5F0EB';
  const CARD   = isDark ? '#1E1A18' : '#FFFFFF';
  const CARD_D = isDark ? '#111010' : '#1A1512'; // dark contrast card
  const BORDER = isDark ? '#2C2724' : '#EAE4DC';
  const T1     = isDark ? '#F0EBE4' : '#1A1512';
  const T2     = isDark ? '#7A706A' : '#6B5E56';
  const T3     = isDark ? '#443E3A' : '#C4B8B0';
  const RED    = colors.brand.primary;

  const cellShadow = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.07,
    shadowRadius: 10,
    elevation: 3,
  };

  // ─── Reusable inline cell (avoid component for style flexibility) ─

  const pressScale = (ref: Animated.Value) => ({
    onPressIn: () => Animated.spring(ref, { toValue: 0.965, useNativeDriver: true, friction: 8, tension: 120 }).start(),
    onPressOut: () => Animated.spring(ref, { toValue: 1, useNativeDriver: true, friction: 8, tension: 120 }).start(),
  });

  const sc1 = useRef(new Animated.Value(1)).current;
  const sc2 = useRef(new Animated.Value(1)).current;
  const sc3 = useRef(new Animated.Value(1)).current;
  const sc4 = useRef(new Animated.Value(1)).current;
  const sc5 = useRef(new Animated.Value(1)).current;

  return (
    <ScreenFadeTransition>
      <View style={{ flex: 1, backgroundColor: BG }}>
        <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />

        <View style={{ flex: 1 }}>

          {/* ══ HEADER ════════════════════════════════════════ */}
          <View style={[{
            paddingTop: insets.top + 10,
            paddingBottom: 14,
            paddingHorizontal: H_PAD,
            backgroundColor: BG,
            borderBottomWidth: 1,
            borderBottomColor: BORDER,
            zIndex: 20,
          }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '500', color: T2, marginBottom: 2 }}>{getGreeting()},</Text>
                <Text style={{ fontSize: 26, fontWeight: '800', color: T1, letterSpacing: -0.6 }} numberOfLines={1}>
                  {staff?.name ?? 'Staff'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View ref={bellRef} style={{ opacity: showNotif ? 0 : 1 }}>
                  <TouchableOpacity
                    style={{ width: ICON, height: ICON, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: BORDER }}
                    activeOpacity={0.8}
                    onPress={openNotif}
                  >
                    <Bell size={19} color={RED} strokeWidth={2} />
                    {unread > 0 && <View style={{ position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: RED }} />}
                  </TouchableOpacity>
                </View>
                <Image source={require('../../assets/images/logo1.webp')} style={{ width: 46, height: 46 }} resizeMode="contain" />
              </View>
            </View>

            {/* Date chip */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: RED }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: T2 }}>{TODAY}</Text>
            </View>
          </View>

          {/* ══ BENTO SCROLL ══════════════════════════════════ */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 120 + insets.bottom, gap: GAP }}
          >

            {/* ══════════════════════════════════════════════
                CELL 1 — Total Amount (HERO, full width)
                Priority 1 — paling besar, paling dominan
            ══════════════════════════════════════════════ */}
            <Pressable onPress={() => navigation.navigate('TrxDetail')} {...pressScale(sc1)}>
              <Animated.View style={[{
                backgroundColor: CARD_D,
                borderRadius: 22,
                padding: 22,
                height: 150,
                justifyContent: 'space-between',
                overflow: 'hidden',
                transform: [{ scale: sc1 }],
              }, cellShadow]}>
                {/* Background texture — faint radial */}
                <View style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.03)' }} />
                <View style={{ position: 'absolute', right: 30, bottom: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.025)' }} />

                <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  Total Transaksi Member
                </Text>

                <View>
                  <Text style={{ fontSize: 42, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1.5, lineHeight: 48 }}>
                    {rp(DATA.totalAmount)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.75)' }}>
                        {DATA.totalTrx} transaksi
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            </Pressable>

            {/* ══════════════════════════════════════════════
                ROW 2 — Voucher diredeem + Member tier
                Priority 3 & 5 — dua kolom equal
            ══════════════════════════════════════════════ */}
            <View style={{ flexDirection: 'row', gap: GAP }}>

              {/* CELL 2 — Voucher diredeem */}
              <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('Voucher')} {...pressScale(sc2)}>
                <Animated.View style={[{
                  backgroundColor: CARD,
                  borderRadius: 20,
                  padding: 18,
                  height: 130,
                  borderWidth: 1,
                  borderColor: BORDER,
                  justifyContent: 'space-between',
                  transform: [{ scale: sc2 }],
                }, cellShadow]}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: T3, letterSpacing: 1, textTransform: 'uppercase' }}>
                    Voucher Diredeem
                  </Text>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                      <Text style={{ fontSize: 38, fontWeight: '800', color: T1, letterSpacing: -1, lineHeight: 42 }}>
                        {DATA.voucherRedeemed}
                      </Text>
                      {DATA.pendingVouchers > 0 && (
                        <View style={{ backgroundColor: RED, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>
                            {DATA.pendingVouchers} pending
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 11, color: T2, marginTop: 2 }}>hari ini</Text>
                  </View>
                </Animated.View>
              </Pressable>

              {/* CELL 3 — Member tier datang */}
              <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('MemberDetail')} {...pressScale(sc3)}>
                <Animated.View style={[{
                  backgroundColor: CARD,
                  borderRadius: 20,
                  padding: 18,
                  height: 130,
                  borderWidth: 1,
                  borderColor: BORDER,
                  justifyContent: 'space-between',
                  transform: [{ scale: sc3 }],
                }, cellShadow]}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: T3, letterSpacing: 1, textTransform: 'uppercase' }}>
                    Tier Member
                  </Text>

                  {/* Compact tier list */}
                  <View style={{ gap: 5 }}>
                    {/* Stacked bar */}
                    <View style={{ flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', gap: 1 }}>
                      {TIERS.map(t => (
                        <View key={t.tier} style={{ flex: t.pct, backgroundColor: t.color + 'BB' }} />
                      ))}
                    </View>
                    {/* Labels */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      {TIERS.map(t => (
                        <View key={t.tier} style={{ alignItems: 'center', gap: 2 }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: t.color }}>{t.count}</Text>
                          <Text style={{ fontSize: 9, color: T2, fontWeight: '500' }}>{t.tier}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </Animated.View>
              </Pressable>

            </View>

            {/* ══════════════════════════════════════════════
                CELL 4 — History TRX (scrollable list)
                Priority 2 — tall cell, fixed height, inner scroll
            ══════════════════════════════════════════════ */}
            <Pressable onPress={() => navigation.navigate('Riwayat')} {...pressScale(sc4)}>
              <Animated.View style={[{
                backgroundColor: CARD,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: BORDER,
                overflow: 'hidden',
                transform: [{ scale: sc4 }],
              }, cellShadow]}>
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: T1 }}>History Transaksi</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: RED }}>Lihat semua ›</Text>
                </View>

                {/* Trx rows — fixed 4-5 visible */}
                {TRX.map((trx, i) => (
                  <View key={trx.id}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13 }}
                      activeOpacity={0.6}
                      onPress={() => navigation.navigate('TrxDetail', { trxId: trx.id })}
                    >
                      {/* Tier strip */}
                      <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: TIER_COLOR[trx.memberTier], marginRight: 14, borderRadius: 2 }} />

                      {/* Info */}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: T1 }} numberOfLines={1}>{trx.memberName}</Text>
                        <Text style={{ fontSize: 11, color: T2, marginTop: 2 }}>{timeAgo(trx.createdAt)}</Text>
                      </View>

                      {/* Amount + status */}
                      <View style={{ alignItems: 'flex-end', paddingRight: 16, gap: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: T1 }}>
                          Rp {trx.nominal.toLocaleString('id-ID')}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: STATUS_COLOR[trx.status] }} />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: STATUS_COLOR[trx.status] }}>
                            {trx.status.charAt(0).toUpperCase() + trx.status.slice(1)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {i < TRX.length - 1 && (
                      <View style={{ height: 1, backgroundColor: BORDER, marginLeft: 17 }} />
                    )}
                  </View>
                ))}
              </Animated.View>
            </Pressable>

            {/* ══════════════════════════════════════════════
                CELL 5 — Most redeemed voucher today
                Priority 4 — full width, compact ranked list
            ══════════════════════════════════════════════ */}
            <Pressable onPress={() => navigation.navigate('Voucher')} {...pressScale(sc5)}>
              <Animated.View style={[{
                backgroundColor: CARD,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: BORDER,
                overflow: 'hidden',
                transform: [{ scale: sc5 }],
              }, cellShadow]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: T1 }}>Voucher Terpopuler</Text>
                  <Text style={{ fontSize: 11, color: T2 }}>hari ini</Text>
                </View>

                {TOP_VOUCHERS.map((v, i) => (
                  <View key={v.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18, borderBottomWidth: i < TOP_VOUCHERS.length - 1 ? 1 : 0, borderBottomColor: BORDER }}>
                    {/* Rank number */}
                    <Text style={{ fontSize: 13, fontWeight: '800', color: i === 0 ? RED : T3, width: 22 }}>
                      {i + 1}
                    </Text>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: T1 }} numberOfLines={1}>
                      {v.title}
                    </Text>
                    {/* Count bar */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 60, height: 4, borderRadius: 2, backgroundColor: BORDER, overflow: 'hidden' }}>
                        <View style={{ width: `${(v.count / TOP_VOUCHERS[0].count) * 100}%`, height: '100%', backgroundColor: i === 0 ? RED : T3, borderRadius: 2 }} />
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: i === 0 ? RED : T2, width: 16, textAlign: 'right' }}>
                        {v.count}x
                      </Text>
                    </View>
                  </View>
                ))}
              </Animated.View>
            </Pressable>

          </ScrollView>
        </View>

        {/* ══ NOTIFICATION MODAL ════════════════════════════ */}
        <Modal visible={showNotif} transparent animationType="none" statusBarTranslucent onRequestClose={closeNotif}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgA }]}>
            {Platform.OS === 'ios'
              ? <BlurView intensity={30} style={StyleSheet.absoluteFill} tint={isDark ? 'light' : 'dark'} />
              : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
            }
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeNotif} activeOpacity={1} />
          </Animated.View>

          <Animated.View style={{
            position: 'absolute', left: 10, right: 10,
            top: insets.top + 10 + ICON + 20,
            borderRadius: 24, overflow: 'hidden',
            backgroundColor: CARD, elevation: 20,
            maxHeight: '72%',
            opacity: opA, transform: modalT,
          }}>
            <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: BORDER }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: T1 }}>Notifikasi</Text>
              <Text style={{ fontSize: 12, color: T2, marginTop: 2 }}>{unread} belum dibaca</Text>
            </View>
            <FlatList
              data={NOTIFS}
              keyExtractor={i => i.id}
              style={{ backgroundColor: BG }}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 13, borderRadius: 14, backgroundColor: CARD, borderLeftWidth: item.read ? 0 : 3, borderLeftColor: '#CA8A04' }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: T1, flex: 1 }} numberOfLines={1}>{item.title}</Text>
                    <Text style={{ fontSize: 10, color: T3 }}>{item.time}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: T2, lineHeight: 17 }}>{item.body}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={{ padding: 15, alignItems: 'center', borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: CARD }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: RED }}>Tandai semua dibaca</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Floating bell clone */}
          <Animated.View style={{
            position: 'absolute',
            top: bellY > 0 ? bellY : insets.top + 20,
            right: H_PAD + 42 + 10,
            width: ICON, height: ICON,
            borderRadius: 14,
            justifyContent: 'center', alignItems: 'center',
            backgroundColor: bbCol,
            zIndex: 9999, elevation: 10,
          }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={0.8} onPress={closeNotif}>
              <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', transform: [{ rotate: rotDeg }, { scale: rtSc }] }]}>
                <Animated.View style={{ opacity: bOp, position: 'absolute' }}><Bell size={19} color={RED} strokeWidth={2} /></Animated.View>
                <Animated.View style={{ opacity: xOp, position: 'absolute' }}><X   size={19} color="#FFF" strokeWidth={2} /></Animated.View>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        </Modal>

      </View>
    </ScreenFadeTransition>
  );
}