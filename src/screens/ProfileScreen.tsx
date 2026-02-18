import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useStaffAuth } from '../context/StaffAuthContext';
import { COLORS } from '../theme/colorTokens';
// Pastikan library ini sudah terinstall: npx expo install lucide-react-native
import { LogOut, UserCircle } from 'lucide-react-native';

export default function ProfileScreen() {
  const { staff, logout } = useStaffAuth();

  const handleLogout = () => {
    Alert.alert(
      "Konfirmasi Logout",
      "Apakah Anda yakin ingin keluar shift?",
      [
        { text: "Batal", style: "cancel" },
        { text: "Keluar", onPress: () => logout(), style: "destructive" }
      ]
    );
  };

  // Helper untuk menampilkan data dengan fallback '-'
  const renderValue = (val?: string) => val || '-';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Menggunakan warna dari COLORS, pastikan COLORS.brand.primary ada */}
        <UserCircle size={80} color={COLORS.brand?.primary || '#B91C2F'} />
        <Text style={styles.title}>Staff Profile</Text>
      </View>

      <View style={styles.card}>
         <View style={styles.infoRow}>
            <Text style={styles.label}>Nama Staff</Text>
            <Text style={styles.value}>{renderValue(staff?.name)}</Text>
         </View>
         
         <View style={styles.divider} />

         <View style={styles.infoRow}>
            <Text style={styles.label}>Staff ID</Text>
            {/* Menggunakan staff?.id sesuai perbaikan di types.ts */}
            <Text style={styles.value}>{renderValue(staff?.id)}</Text>
         </View>

         <View style={styles.divider} />

         <View style={styles.infoRow}>
            <Text style={styles.label}>Lokasi Toko</Text>
            <Text style={styles.value}>{renderValue(staff?.storeLocation)}</Text>
         </View>

         <View style={styles.divider} />

         <View style={styles.infoRow}>
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleBadgeContainer}>
              <Text style={styles.roleBadgeText}>
                {staff?.role === 'store_manager' ? 'Store Manager' : 'Cashier'}
              </Text>
            </View>
         </View>
      </View>
      
      <TouchableOpacity 
        style={styles.logoutBtn} 
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <LogOut size={20} color={COLORS.brand?.primary || '#B91C2F'} style={{marginRight: 8}} />
        <Text style={styles.logoutText}>AKHIRI SHIFT (LOGOUT)</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Gong Cha POS v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 24, 
    justifyContent: 'center', 
    backgroundColor: COLORS.background?.primary || '#FFF8F0' 
  },
  header: {
    alignItems: 'center',
    marginBottom: 30
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginTop: 16,
    color: COLORS.text?.primary || '#2A1F1F'
  },
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    marginBottom: 30, 
    borderWidth: 1, 
    borderColor: COLORS.border?.light || '#F3E9DC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  infoRow: {
    padding: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border?.light || '#F3E9DC',
    marginHorizontal: 16
  },
  label: { 
    fontSize: 12, 
    color: COLORS.text?.secondary || '#8C7B75', 
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  value: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.text?.primary || '#2A1F1F'
  },
  // Perbaikan styling badge agar text tidak terpotong
  roleBadgeContainer: {
    backgroundColor: '#FFF5F5',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden'
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.brand?.primary || '#B91C2F',
  },
  logoutBtn: { 
    flexDirection: 'row',
    backgroundColor: '#FFF', 
    padding: 18, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECaca'
  },
  logoutText: { 
    color: '#B91C2F', 
    fontWeight: 'bold',
    fontSize: 16
  },
  versionText: {
    textAlign: 'center',
    marginTop: 20,
    color: COLORS.text?.disabled || '#9CA3AF',
    fontSize: 12
  }
});