import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing, LayoutChangeEvent, useWindowDimensions, DeviceEventEmitter } from 'react-native';
import { Home, Coffee, QrCode, Trophy, User } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberCard } from '../context/MemberContext';
import { useTheme } from '../context/ThemeContext';

const BAR_HORIZONTAL_PADDING = 10;

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // --- STATE UNTUK VISIBILITY ---
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);

  // --- LISTENER EVENT (Jalur Khusus) ---
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('TOGGLE_TAB_BAR', (shouldHide: boolean) => {
      setIsTabBarHidden(shouldHide);
    });
    return () => subscription.remove();
  }, []);

  const { showCard } = useMemberCard();
  const { colors, activeMode } = useTheme();
  const isDark = activeMode === 'dark';

  const memberTriggerRef = useRef<View | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const isQrFocused = state.routes[state.index]?.name === 'QR';
  const iconMap: Record<string, React.ComponentType<any>> = {
    Home: Home,
    Menu: Coffee,
    QR: QrCode,
    Rewards: Trophy,
    Profile: User,
  };

  const activeIndex = useRef(new Animated.Value(state.index)).current;
  const activePillScale = useRef(new Animated.Value(1)).current;
  const [barWidth, setBarWidth] = useState(0);
  const pressScales = useRef(state.routes.map(() => new Animated.Value(1)));
  const insets = useSafeAreaInsets();
  const isCompact = screenWidth < 370;
  const sideInset = screenWidth < 350 ? 14 : 24;
  const barHeight = isCompact ? 66 : 72;
  const activePillSize = isCompact ? 40 : 44;
  const triggerButtonSize = isCompact ? 54 : 60;
  const triggerLift = isCompact ? -12 : -16;
  const iconSize = isCompact ? 20 : 22;
  const navButtonHeight = isCompact ? 44 : 48;
  const dynamicBarPadding = isCompact ? 8 : BAR_HORIZONTAL_PADDING;
  
  // Value 0 = Visible, 1 = Hidden
  const tabBarHideProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pressScales.current.length !== state.routes.length) {
      pressScales.current = state.routes.map(() => new Animated.Value(1));
    }
  }, [state.routes]);

  // --- ANIMASI APPLE STYLE (BOUNCY) ---
  useEffect(() => {
    if (isTabBarHidden) {
      // HIDING: Slide down cepat & mulus (agar tidak ganggu modal)
      Animated.timing(tabBarHideProgress, {
        toValue: 1,
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    } else {
      // SHOWING: Spring Up dengan efek mantul (Bouncy)
      Animated.spring(tabBarHideProgress, {
        toValue: 0,
        damping: 16,     // Lebih kecil = lebih mantul
        stiffness: 140,  // Kekakuan pegas
        mass: 0.8,       // Berat elemen
        useNativeDriver: true,
      }).start();
    }
  }, [isTabBarHidden, tabBarHideProgress]);

  useEffect(() => {
    activePillScale.setValue(0.92);
    Animated.parallel([
      Animated.spring(activeIndex, {
        toValue: state.index,
        tension: 160,
        friction: 18,
        useNativeDriver: true,
      }),
      Animated.spring(activePillScale, {
        toValue: 1,
        tension: 140,
        friction: 16,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeIndex, activePillScale, state.index]);

  const onBarLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  const tabCount = state.routes.length || 1;
  const innerWidth = Math.max(barWidth - dynamicBarPadding * 2, 0);
  const slotWidth = innerWidth > 0 ? innerWidth / tabCount : 0;
  const bottomOffset = Math.max(insets.bottom + (isCompact ? 2 : 4), isCompact ? 8 : 10);
  const hideTranslateY = barHeight + bottomOffset + 60; // Jarak sembunyi ke bawah

  const pillTranslateX = activeIndex.interpolate({
    inputRange: state.routes.map((_, idx) => idx),
    outputRange: state.routes.map((_, idx) => {
      const slotCenter = dynamicBarPadding + (idx * slotWidth) + (slotWidth / 2);
      return slotCenter - (activePillSize / 2);
    }),
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      pointerEvents={isTabBarHidden ? 'none' : 'auto'}
      style={[
        styles.bottomNav,
        {
          left: sideInset,
          right: sideInset,
          bottom: bottomOffset,
          height: barHeight,
          borderRadius: barHeight / 2,
          paddingHorizontal: dynamicBarPadding,
          
          backgroundColor: colors.bottomNav.background,
          
          borderWidth: isDark ? 1.5 : 0.5,
          borderColor: isDark 
            ? colors.border.default 
            : 'rgba(185, 28, 47, 0.12)', 
          
          shadowColor: isDark ? colors.shadow.color : colors.brand.primary,
          shadowOffset: { width: 0, height: isDark ? -4 : 8 },
          shadowOpacity: isDark ? 0.16 : 0.12,
          shadowRadius: isDark ? 20 : 28,
          elevation: isDark ? 10 : 12,
          
          // Apply Animasi Naik/Turun
          transform: [
            {
              translateY: tabBarHideProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, hideTranslateY],
              }),
            },
          ],
        },
      ]}
      onLayout={onBarLayout}
    >
      {barWidth > 0 && !isQrFocused && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activePill,
            {
              top: (barHeight - activePillSize) / 2,
              width: activePillSize,
              height: activePillSize,
              borderRadius: activePillSize / 2,
              backgroundColor: colors.bottomNav.active,
              shadowColor: colors.brand.primary,
              shadowOffset: { width: 0, height: isDark ? 3 : 4 },
              shadowOpacity: isDark ? 0.24 : 0.28,
              shadowRadius: isDark ? 10 : 12,
              elevation: 6,
              transform: [{ translateX: pillTranslateX }, { scale: activePillScale }],
            },
          ]}
        />
      )}

      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isMemberCardTrigger = route.name === 'QR';
        const IconComponent = iconMap[route.name] || Home;

        const scaleInputRange = [index - 1 > 0 ? index - 1 : 0, index, index + 1 < state.routes.length ? index + 1 : state.routes.length - 1];
        
        const iconScale = activeIndex.interpolate({
          inputRange: [index - 1, index, index + 1],
          outputRange: [1, 1.12, 1],
          extrapolate: 'clamp',
        });

        const iconOpacity = activeIndex.interpolate({
          inputRange: [index - 1, index, index + 1],
          outputRange: [0.48, 1, 0.48],
          extrapolate: 'clamp',
        });
        
        const iconRotate = activeIndex.interpolate({
          inputRange: [index - 1, index, index + 1],
          outputRange: ['-5deg', '0deg', '5deg'],
          extrapolate: 'clamp',
        });

        const handlePressIn = () => {
          Animated.spring(pressScales.current[index], { toValue: 0.92, useNativeDriver: true }).start();
        };

        const handlePressOut = () => {
          Animated.spring(pressScales.current[index], { toValue: 1, friction: 5, useNativeDriver: true }).start();
        };

        const onPress = () => {
          if (isMemberCardTrigger) {
            if (memberTriggerRef.current) {
              memberTriggerRef.current.measureInWindow((x, y, width, height) => {
                showCard({ x: x + width / 2, y: y + height / 2, size: Math.max(width, height) });
              });
            } else {
              showCard();
            }
            return;
          }
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const iconColor = isFocused ? '#FFFFFF' : colors.bottomNav.inactive;  
        const finalIconColor = isMemberCardTrigger ? '#FFFFFF' : iconColor;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={isMemberCardTrigger ? [styles.memberTriggerSlot, { height: barHeight }] : [styles.navButton, { height: navButtonHeight }]}
            activeOpacity={0.92}
          >
            {isMemberCardTrigger ? (
              <Animated.View style={{ transform: [{ scale: pressScales.current[index] }] }}>
                <View
                  ref={memberTriggerRef}
                  collapsable={false}
                  style={[
                    styles.memberTriggerButton,
                    {
                      width: triggerButtonSize, height: triggerButtonSize, borderRadius: triggerButtonSize / 2,
                      transform: [{ translateY: triggerLift }],
                      backgroundColor: colors.brand.primary,
                      borderWidth: isDark ? 4 : 3, borderColor: colors.bottomNav.background,
                      shadowColor: colors.brand.primary, shadowOffset: { width: 0, height: isDark ? 6 : 8 },
                      shadowOpacity: isDark ? 0.35 : 0.3, shadowRadius: isDark ? 10 : 14, elevation: 8,
                    },
                  ]}
                >
                  <IconComponent size={iconSize} color="#FFFFFF" strokeWidth={2.4} />
                </View>
              </Animated.View>
            ) : (
              <Animated.View style={{ transform: [{ scale: Animated.multiply(iconScale, pressScales.current[index]) }, { rotate: iconRotate }], opacity: iconOpacity }}>
                <IconComponent size={iconSize} color={finalIconColor} strokeWidth={isFocused ? 2.6 : 2.1} />
              </Animated.View>
            )}
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bottomNav: { position: 'absolute', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activePill: { position: 'absolute' },
  navButton: { flex: 1, height: 44, borderRadius: 18, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  memberTriggerSlot: { flex: 1, height: 72, justifyContent: 'center', alignItems: 'center', zIndex: 3 },
  memberTriggerButton: { alignItems: 'center', justifyContent: 'center' },
});