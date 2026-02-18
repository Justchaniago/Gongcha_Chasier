import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colorTokens';

export default function RewardsScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>Katalog Voucher</Text>
      <Text style={styles.subtext}>Kasir bisa melihat daftar voucher aktif toko di sini.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background.primary },
  text: { fontSize: 18, fontWeight: 'bold', color: COLORS.text.primary },
  subtext: { color: COLORS.text.secondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }
});