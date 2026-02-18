import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import { CameraView, Camera } from "expo-camera";
import { useNavigation } from '@react-navigation/native';
import { X } from 'lucide-react-native';
import { doc, getDoc } from 'firebase/firestore';
import { firestoreDb } from '../config/firebase';
import { UserProfile } from '../types/types';
import UserAvatar from '../components/UserAvatar';
import { COLORS } from '../theme/colorTokens';

export default function ScannerScreen() {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [memberData, setMemberData] = useState<UserProfile | null>(null);
  const [showModal, setShowModal] = useState(false);

  // 1. Request Permission Kamera saat Screen Dibuka
  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };
    getCameraPermissions();
  }, []);

  // 2. Handler saat Barcode Terdeteksi
  const handleBarCodeScanned = async ({ data }: any) => {
    if (scanned || loadingData) return;
    setScanned(true);
    setLoadingData(true);

    const userId = data; // Asumsi QR Code berisi User ID (UID)

    try {
      // Ambil data user dari Firestore collection 'users'
      const userRef = doc(firestoreDb, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = { id: userId, ...userSnap.data() } as UserProfile;
        setMemberData(data);
        setShowModal(true); 
      } else {
        Alert.alert("Tidak Ditemukan", "QR Code valid tapi user tidak ada di database.", [
          { text: "Scan Lagi", onPress: () => { setScanned(false); setLoadingData(false); } }
        ]);
      }
    } catch (error) {
      Alert.alert("Error", "Gagal mengambil data member. Pastikan koneksi internet lancar.");
      setScanned(false);
    } finally {
      setLoadingData(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setMemberData(null);
    setScanned(false); // Reset agar bisa scan lagi
  };

  // 3. Render Status Permission
  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.brand.primary} />
        <Text style={{ marginTop: 10, color: '#FFF' }}>Meminta izin kamera...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: '#FFF', textAlign: 'center' }}>Tidak ada akses ke kamera.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, padding: 10, backgroundColor: '#FFF' }}>
          <Text>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 4. Render Kamera Utama
  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Overlay Header (Tombol Close) */}
      <View style={styles.overlayHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <X color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.overlayTitle}>Scan Member</Text>
        <View style={{ width: 40 }} /> 
      </View>

      {/* Bingkai Fokus Scan */}
      <View style={styles.scanFrame} />
      <Text style={styles.hintText}>Arahkan kamera ke QR Code Member</Text>

      {/* Loading Indicator saat fetching data */}
      {loadingData && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.brand.primary} />
          <Text style={{color: '#FFF', marginTop: 10, fontWeight: 'bold'}}>Mengambil Data Member...</Text>
        </View>
      )}

      {/* --- MODAL HASIL SCAN (MEMBER INFO) --- */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Member Verified ✅</Text>
              <TouchableOpacity onPress={closeModal}>
                <X color="#000" size={24} />
              </TouchableOpacity>
            </View>
            
            {memberData && (
              <View style={styles.memberInfo}>
                <UserAvatar name={memberData.name} photoURL={memberData.photoURL} size={80} />
                <Text style={styles.memberName}>{memberData.name}</Text>
                
                {/* Badge Tier */}
                <View style={[styles.tierBadge, { 
                  backgroundColor: memberData.tier === 'Platinum' ? '#E9D5FF' : memberData.tier === 'Gold' ? '#F3E9DC' : '#E5E7EB' 
                }]}>
                  <Text style={[styles.tierText, {
                    color: memberData.tier === 'Platinum' ? '#6D28D9' : memberData.tier === 'Gold' ? '#B91C2F' : '#374151'
                  }]}>{memberData.tier} Tier</Text>
                </View>
                
                {/* Statistik Points & ID */}
                <View style={styles.statsContainer}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>CURRENT POINTS</Text>
                    <Text style={styles.statVal}>{memberData.currentPoints}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>MEMBER ID</Text>
                    <Text style={styles.statVal}>{memberData.id.substring(0, 6).toUpperCase()}...</Text>
                  </View>
                </View>

                {/* Tombol Aksi Kasir */}
                <TouchableOpacity style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>Input Pesanan & Tambah Poin</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]}>
                  <Text style={[styles.actionBtnText, { color: COLORS.brand.primary }]}>Lihat Voucher Aktif</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  
  overlayHeader: { 
    position: 'absolute', top: 50, left: 0, right: 0, 
    flexDirection: 'row', justifyContent: 'space-between', 
    paddingHorizontal: 20, alignItems: 'center' 
  },
  iconBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  overlayTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  
  scanFrame: { 
    width: 260, height: 260, 
    borderWidth: 2, borderColor: COLORS.brand.primary, 
    alignSelf: 'center', marginTop: '50%', borderRadius: 20,
    backgroundColor: 'transparent'
  },
  hintText: { color: '#FFF', textAlign: 'center', marginTop: 20, opacity: 0.8 },
  
  loader: { 
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
    justifyContent: 'center', alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.8)' 
  },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 24, borderTopRightRadius: 24, 
    padding: 24, minHeight: 500 
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text.primary },
  
  memberInfo: { alignItems: 'center' },
  memberName: { fontSize: 22, fontWeight: 'bold', marginTop: 12, color: COLORS.text.primary },
  tierBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  tierText: { fontWeight: 'bold', fontSize: 12 },
  
  statsContainer: { 
    flexDirection: 'row', width: '100%', justifyContent: 'space-between', 
    marginVertical: 24, paddingVertical: 16, 
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border.light 
  },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: COLORS.border.light },
  statLabel: { fontSize: 10, color: COLORS.text.secondary, letterSpacing: 1, marginBottom: 4 },
  statVal: { fontSize: 20, fontWeight: 'bold', color: COLORS.text.primary },
  
  actionBtn: { 
    width: '100%', backgroundColor: COLORS.brand.primary, 
    padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 12 
  },
  secondaryBtn: { 
    backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.brand.primary 
  },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});