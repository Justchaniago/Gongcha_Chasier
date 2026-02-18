import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
  ActionSheetIOS,
  ListRenderItem
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { MapPin, Navigation, Clock, ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, getDocs } from 'firebase/firestore';
import { firestoreDb } from '../config/firebase';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import DecorativeBackground from '../components/DecorativeBackground';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- TYPES ---
type StoreType = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  openHours: string;
  statusOverride?: 'open' | 'closed' | 'almost_close';
  distance?: number;
};

type StoreStatus = {
  label: string;
  color: string;
  bg: string;
};

export default function StoreLocatorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus>(Location.PermissionStatus.UNDETERMINED);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    fetchStoresAndLocation();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchStoresAndLocation = async () => {
    setLoading(true);
    try {
      // 1. Request Location
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      let currentUserLoc: Location.LocationObject | null = null;
      if (status === 'granted') {
        currentUserLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }

      // 2. Fetch Firestore Data
      const querySnapshot = await getDocs(collection(firestoreDb, 'stores'));
      const storesData: StoreType[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        
        // Prioritaskan field 'name', kalau kosong baru coba yang lain
        const rawName = data.name || data.Name || data.storeName || data.nama || 'Unnamed Store';
        const rawAddress = data.address || data.Address || data.alamat || 'Address not available';

        storesData.push({
          id: doc.id,
          name: String(rawName).trim(),
          address: String(rawAddress).trim(),
          latitude: Number(data.latitude || 0),
          longitude: Number(data.longitude || 0),
          openHours: (data.openHours || '10:00 - 22:00').trim(),
          statusOverride: ['open', 'closed', 'almost_close'].includes(data.statusOverride) 
            ? data.statusOverride 
            : undefined,
        });
      });

      // 3. Calculate Distance & Sort
      if (currentUserLoc) {
        const sortedStores = storesData
          .map((store) => {
            const dist = calculateDistance(
              currentUserLoc!.coords.latitude,
              currentUserLoc!.coords.longitude,
              store.latitude,
              store.longitude
            );
            return { ...store, distance: dist };
          })
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));

        setStores(sortedStores);
      } else {
        setStores(storesData);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      Alert.alert('Notice', 'Gagal memuat data live. Menggunakan data demo.');
      // Fallback Demo Data
      setStores([
        {
          id: 'demo-1',
          name: 'Gong Cha Tunjungan Plaza',
          address: 'Tunjungan Plaza 6, Lt. 4, Surabaya',
          latitude: -7.2625,
          longitude: 112.7416,
          openHours: '10:00 - 22:00',
          distance: 0.0,
          statusOverride: 'open'
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // --- UTILS ---
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  const parseHoursRange = (hours: string) => {
    const matches = hours.match(/(\d{1,2})[:.](\d{2})/g);
    if (!matches || matches.length < 2) return null;
    const toMinutes = (raw: string) => {
      const [h, m] = raw.replace('.', ':').split(':').map(Number);
      return h * 60 + m;
    };
    return { open: toMinutes(matches[0]), close: toMinutes(matches[1]) };
  };

  const getStoreStatus = (store: StoreType): StoreStatus => {
    // 1. Manual Override
    if (store.statusOverride === 'open') return { label: 'Open', color: '#166534', bg: '#DCFCE7' };
    if (store.statusOverride === 'almost_close') return { label: 'Closing Soon', color: '#9A3412', bg: '#FFEDD5' };
    if (store.statusOverride === 'closed') return { label: 'Closed', color: '#6B7280', bg: '#E5E7EB' };

    // 2. Auto Calculation
    const range = parseHoursRange(store.openHours);
    if (!range) return { label: 'Open', color: '#166534', bg: '#DCFCE7' }; 

    const now = new Date(nowTick);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isOvernight = range.close < range.open;
    
    const isOpen = isOvernight
      ? nowMinutes >= range.open || nowMinutes < range.close
      : nowMinutes >= range.open && nowMinutes < range.close;

    if (!isOpen) return { label: 'Closed', color: '#6B7280', bg: '#E5E7EB' };

    // Check "Almost Close" (30 mins before)
    let minutesToClose = range.close - nowMinutes;
    if (isOvernight && nowMinutes >= range.open) minutesToClose = (24 * 60) - nowMinutes + range.close;

    if (minutesToClose <= 30 && minutesToClose > 0) {
      return { label: 'Closing Soon', color: '#9A3412', bg: '#FFEDD5' };
    }

    return { label: 'Open', color: '#166534', bg: '#DCFCE7' };
  };

  const openMaps = async (lat: number, lng: number, label: string, address?: string) => {
    const latLng = `${lat},${lng}`;
    const query = address ? `${label}, ${address}` : label;
    const queryEncoded = encodeURIComponent(query);

    const appleMapsUrl = `maps:0,0?q=${queryEncoded}&ll=${latLng}`;
    const webGoogleUrl = `https://www.google.com/maps/search/?api=1&query=${queryEncoded}`;

    type MapApp = {
      label: string;
      probeUrls?: string[];
      openUrl: string;
    };

    const mapApps: MapApp[] = Platform.select({
      ios: [
        {
          label: 'Google Maps',
          probeUrls: ['comgooglemaps://', 'comgooglemaps-x-callback://'],
          openUrl: `comgooglemaps://?q=${queryEncoded}@${latLng}`,
        },
        {
          label: 'Waze',
          probeUrls: ['waze://'],
          openUrl: `waze://?ll=${latLng}&navigate=yes`,
        },
        {
          label: 'Apple Maps',
          openUrl: appleMapsUrl,
        },
      ],
      android: [
        {
          label: 'Google Maps',
          probeUrls: ['comgooglemaps://', 'google.navigation:'],
          openUrl: `google.navigation:q=${queryEncoded}`,
        },
        {
          label: 'Waze',
          probeUrls: ['waze://'],
          openUrl: `waze://?ll=${latLng}&navigate=yes`,
        },
      ],
      default: [],
    }) || [];

    const detectedApps: Array<{ label: string; run: () => void }> = [];

    for (const app of mapApps) {
      let available = false;

      if (!app.probeUrls || app.probeUrls.length === 0) {
        available = true;
      } else {
        for (const probeUrl of app.probeUrls) {
          try {
            if (await Linking.canOpenURL(probeUrl)) {
              available = true;
              break;
            }
          } catch {
            available = false;
          }
        }
      }

      if (available) {
        detectedApps.push({
          label: app.label,
          run: () => {
            void Linking.openURL(app.openUrl).catch(() => {
              void Linking.openURL(webGoogleUrl);
            });
          },
        });
      }
    }

    const hasNativeGoogleMaps = detectedApps.some((app) => app.label === 'Google Maps');

    detectedApps.push({
      label: hasNativeGoogleMaps ? 'Google Maps (Web)' : 'Google Maps',
      run: () => {
        void Linking.openURL(webGoogleUrl);
      },
    });

    if (Platform.OS === 'ios') {
      const options = [...detectedApps.map((item) => item.label), 'Cancel'];
      const cancelButtonIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: label,
          message: address,
          options,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === cancelButtonIndex) return;
          detectedApps[buttonIndex]?.run();
        }
      );

      return;
    }

    const alertOptions: Array<{ text: string; onPress: () => void; style?: 'cancel' }> = detectedApps.map((app) => ({
      text: app.label,
      onPress: app.run,
    }));

    alertOptions.push({ text: 'Cancel', onPress: () => {}, style: 'cancel' });
    Alert.alert('Open Maps', `${label}\n${address || ''}`, alertOptions);
  };

  // --- RENDER ITEM ---
  const renderStoreItem: ListRenderItem<StoreType> = ({ item, index }) => {
    const status = getStoreStatus(item);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => openMaps(item.latitude, item.longitude, item.name, item.address)}
      >
        <View style={styles.cardHeader}>
          {/* ICON */}
          <View style={styles.iconBg}>
            <MapPin size={24} color="#B91C2F" />
          </View>
          
          {/* INFO */}
          <View style={styles.storeMeta}>
            <Text style={styles.storeName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.storeAddress} numberOfLines={2}>{item.address}</Text>
          </View>

          {/* BADGES (Right Side) */}
          <View style={styles.badgeColumn}>
            {item.distance !== undefined && (
              <View style={[styles.distanceBadge, index === 0 && styles.nearestBadge]}>
                <Text style={[styles.distanceText, index === 0 && styles.nearestText]}>
                  {item.distance} km
                </Text>
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.infoRow}>
            <Clock size={16} color="#8C7B75" />
            <Text style={styles.infoText}>{item.openHours}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => openMaps(item.latitude, item.longitude, item.name, item.address)}
          >
            <Navigation size={16} color="#FFF" />
            <Text style={styles.navButtonText}>Go There</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenFadeTransition>
      <View style={styles.container}>
        <StatusBar style="dark" />
        <DecorativeBackground />
        
        <View style={[styles.mainContent, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <ChevronLeft size={24} color="#2A1F1F" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Find a Store</Text>
          </View>

          {/* Warning Location */}
          {permissionStatus !== 'granted' && !loading && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>Enable location for nearest store.</Text>
              <TouchableOpacity onPress={fetchStoresAndLocation}>
                <Text style={styles.warningAction}>Allow Access</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Content */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#B91C2F" />
              <Text style={styles.loadingText}>Locating Gong Cha...</Text>
            </View>
          ) : (
            <FlatList
              data={stores}
              keyExtractor={(item) => item.id}
              renderItem={renderStoreItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.center}>
                   <Text style={styles.emptyText}>No stores found nearby.</Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  mainContent: { flex: 1 },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 12,
    marginBottom: 8
  },
  backButton: { 
    marginRight: 12,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#2A1F1F' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  loadingText: { marginTop: 12, color: '#8C7B75', fontSize: 14 },
  emptyText: { color: '#9CA3AF', fontSize: 16 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },

  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    marginBottom: 16, 
    padding: 16, 
    shadowColor: '#9CA3AF', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 12, 
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  
  iconBg: { 
    width: 48, height: 48, 
    backgroundColor: '#FFF1F2', 
    borderRadius: 14, 
    alignItems: 'center', justifyContent: 'center' 
  },
  
  storeMeta: { flex: 1, justifyContent: 'center' },
  storeName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4, lineHeight: 22 },
  storeAddress: { fontSize: 13, color: '#6B7280', lineHeight: 18 },

  badgeColumn: { alignItems: 'flex-end', gap: 6 },
  distanceBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  distanceText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  nearestBadge: { backgroundColor: '#B91C2F' },
  nearestText: { color: '#FFF' },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },

  navButton: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#111827', 
    paddingHorizontal: 16, paddingVertical: 10, 
    borderRadius: 12, gap: 8 
  },
  navButtonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  warningBox: { 
    marginHorizontal: 20, marginBottom: 16, padding: 12, 
    backgroundColor: '#FEF2F2', borderRadius: 12, 
    borderWidth: 1, borderColor: '#FCA5A5',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  warningText: { color: '#991B1B', fontSize: 13, flex: 1 },
  warningAction: { color: '#B91C2F', fontWeight: '700', fontSize: 13, marginLeft: 8 },
});