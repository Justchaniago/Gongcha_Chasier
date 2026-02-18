import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, History, User, QrCode, Gift } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colorTokens'; // ✅ Import Colors Statis

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // --- CONFIG ICON & LABEL ---
          let IconComponent = Home;
          let label = 'Home';

          if (route.name === 'Home') {
            IconComponent = Home;
            label = 'Dashboard';
          } else if (route.name === 'History') {
            IconComponent = History;
            label = 'Riwayat';
          } else if (route.name === 'Scan') {
            IconComponent = QrCode;
            label = 'Scan';
          } else if (route.name === 'Rewards') {
            IconComponent = Gift;
            label = 'Voucher';
          } else if (route.name === 'Profile') {
            IconComponent = User;
            label = 'Staff';
          }

          const isScanButton = route.name === 'Scan';
          const activeColor = COLORS.brand.primary;
          const inactiveColor = COLORS.text.secondary;

          // --- TOMBOL TENGAH (SCANNER) ---
          if (isScanButton) {
            return (
              <View key={index} style={styles.scanButtonWrapper}>
                <TouchableOpacity onPress={onPress} style={styles.scanButton} activeOpacity={0.9}>
                  <QrCode size={28} color="#FFF" />
                </TouchableOpacity>
              </View>
            );
          }

          // --- TOMBOL BIASA ---
          return (
            <TouchableOpacity key={index} onPress={onPress} style={styles.tabItem} activeOpacity={0.7}>
              <IconComponent
                size={24}
                color={isFocused ? activeColor : inactiveColor}
                strokeWidth={isFocused ? 2.5 : 2}
              />
              <Text style={[
                styles.label, 
                { color: isFocused ? activeColor : inactiveColor, fontWeight: isFocused ? '600' : '400' }
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'transparent', elevation: 0 },
  content: {
    flexDirection: 'row', 
    backgroundColor: COLORS.bottomNav.background, 
    marginHorizontal: 20, 
    marginBottom: 20, 
    borderRadius: 25,
    height: 70, 
    shadowColor: COLORS.bottomNav.shadow, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10,
    elevation: 5, 
    alignItems: 'center', 
    justifyContent: 'space-around', 
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border.light
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  label: { fontSize: 10, marginTop: 4 },
  scanButtonWrapper: { top: -20, justifyContent: 'center', alignItems: 'center' },
  scanButton: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.brand.primary,
    justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.brand.primary,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
    borderWidth: 4, borderColor: COLORS.background.primary,
  },
});