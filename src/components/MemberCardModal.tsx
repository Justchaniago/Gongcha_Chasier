import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { useMemberCard } from '../context/MemberContext';
import { MockBackend } from '../services/MockBackend';
import { UserProfile } from '../types/types';

const TIER_BADGE_THEME = {
  Silver: { gradient: ['#E8E8E8', '#B8B8B8'], text: '#1A1A1A', glow: '#E8E8E8' },
  Gold: { gradient: ['#FFD700', '#FFA500'], text: '#1A1A1A', glow: '#FFD700' },
  Platinum: { gradient: ['#E0E7FF', '#C7D2FE'], text: '#312E81', glow: '#C7D2FE' },
} as const;

export default function MemberCardModal() {
  const { isCardVisible, hideCard, anchor } = useMemberCard();
  const { width, height } = useWindowDimensions();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const gestureDismissRef = useRef(false);
  const cardWidth = Math.min(Math.max(width * 0.78, 270), 340);
  const cardHeight = cardWidth * 1.58;
  const qrSize = Math.round(Math.min(Math.max(cardWidth * 0.45, 132), 156));
  const brandFontSize = width < 360 ? 20 : 22;
  const pointsFontSize = width < 360 ? 26 : 30;

  const entranceProgress = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const dismissScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let active = true;

    if (isCardVisible) {
      setMounted(true);
      MockBackend.getUser().then((profile) => {
        if (active) {
          setUser(profile);
        }
      });

      entranceProgress.setValue(0);
      dragY.setValue(0);
      cardOpacity.setValue(0);
      dismissScale.setValue(1);
      gestureDismissRef.current = false;
      Animated.parallel([
        Animated.spring(entranceProgress, {
          toValue: 1,
          damping: 20,
          stiffness: 135,
          mass: 0.95,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      if (gestureDismissRef.current) {
        gestureDismissRef.current = false;
        setMounted(false);
        return;
      }

      Animated.parallel([
        Animated.timing(entranceProgress, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setMounted(false);
        }
      });
    }

    return () => {
      active = false;
    };
  }, [backdropOpacity, cardOpacity, dismissScale, dragY, entranceProgress, hideCard, isCardVisible, mounted]);

  const startDx = anchor ? anchor.x - width / 2 : 0;
  const startDy = anchor ? anchor.y - height / 2 : height * 0.3;
  const startScale = anchor ? Math.max(0.2, Math.min(anchor.size / cardWidth, 0.48)) : 0.45;

  const entryTranslateX = entranceProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startDx, 0],
  });

  const entryTranslateY = entranceProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startDy, 0],
  });

  const settleScale = entranceProgress.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [startScale, 1.02, 1],
  });

  const composedScale = Animated.multiply(settleScale, dismissScale);

  const gestureCardOpacity = dragY.interpolate({
    inputRange: [-280, -85, 0],
    outputRange: [0.14, 1, 1],
    extrapolate: 'clamp',
  });

  const gestureBackdropOpacity = dragY.interpolate({
    inputRange: [-280, -85, 0],
    outputRange: [0.4, 1, 1],
    extrapolate: 'clamp',
  });

  const composedCardOpacity = Animated.multiply(cardOpacity, gestureCardOpacity);
  const composedBackdropOpacity = Animated.multiply(backdropOpacity, gestureBackdropOpacity);

  const composedTranslateY = Animated.add(entryTranslateY, dragY);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 4,
        onMoveShouldSetPanResponderCapture: (_, gestureState) => Math.abs(gestureState.dy) > 4,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy < 0) {
            dragY.setValue(gestureState.dy);
          } else {
            dragY.setValue(gestureState.dy * 0.12);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy < -85 || gestureState.vy < -1.1) {
            gestureDismissRef.current = true;
            Animated.parallel([
              Animated.timing(dragY, {
                toValue: -height * 0.55,
                duration: 240,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(cardOpacity, {
                toValue: 0,
                duration: 210,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 210,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(dismissScale, {
                toValue: 0.94,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]).start(() => hideCard());
            return;
          }

          Animated.spring(dragY, {
            toValue: 0,
            damping: 20,
            stiffness: 250,
            useNativeDriver: true,
          }).start();
        },
      }),
    [backdropOpacity, cardOpacity, dismissScale, dragY, hideCard]
  );

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={hideCard}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity: composedBackdropOpacity }]}>
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFillObject} />
          <Pressable style={StyleSheet.absoluteFillObject} onPress={hideCard} />
        </Animated.View>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.cardWrapper,
            {
              width: cardWidth,
              opacity: composedCardOpacity,
              transform: [
                { translateX: entryTranslateX },
                { translateY: composedTranslateY },
                { scale: composedScale },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.card,
              {
                width: cardWidth,
                height: cardHeight,
                borderRadius: Math.max(24, cardWidth * 0.078),
              },
            ]}
          >
            {/* Background Image */}
            <Image
              source={require('../../assets/images/card1.webp')}
              style={{
                position: 'absolute',
                width: cardWidth,
                height: cardHeight,
                borderRadius: Math.max(24, cardWidth * 0.078),
              }}
              resizeMode="cover"
            />

            {/* Dark overlay for better contrast */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: Math.max(24, cardWidth * 0.078) }]} />

            {/* Card Content */}
            <View style={[styles.cardContent, {
              paddingHorizontal: Math.max(22, cardWidth * 0.068),
              paddingTop: Math.max(20, cardWidth * 0.062),
              paddingBottom: Math.max(38, cardWidth * 0.115),
            }]}>
              {/* Header with logo */}
              <View style={[styles.cardHeader, {
                marginBottom: Math.max(12, cardWidth * 0.038),
              }]}>
                <View style={{ flex: 1 }} />
                <Image
                  source={require('../../assets/images/logowhite.webp')}
                  style={[styles.logoImage, { width: Math.round(cardWidth * 0.28), height: Math.round(cardWidth * 0.28) }]}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }} />
              </View>

              {/* QR Code Container with glassmorphism */}
              <View style={[styles.qrSection, {
                marginTop: Math.max(18, cardWidth * 0.055),
                marginBottom: Math.max(18, cardWidth * 0.055),
              }]}>
                <BlurView intensity={20} tint="light" style={styles.qrBlurContainer}>
                  <View style={styles.qrInnerContainer}>
                    {user ? (
                      <QRCode value={user.id} size={qrSize} color="#1A1A1A" backgroundColor="transparent" />
                    ) : (
                      <Text style={styles.loadingText}>Loading...</Text>
                    )}
                  </View>
                </BlurView>
              </View>

              {/* Points section */}
              <View style={[styles.pointsBlock, {
                marginTop: Math.max(14, cardWidth * 0.042),
                marginBottom: Math.max(22, cardWidth * 0.065),
              }]}>
                <Text style={styles.pointsLabel}>WALLET POINTS</Text>
                <Text style={[styles.pointsValue, { fontSize: pointsFontSize }]}>
                  {(user?.currentPoints ?? 0).toLocaleString('id-ID')}
                </Text>
              </View>

              {/* Footer with user info and tier */}
              <View style={[styles.footerRow, {
                marginTop: Math.max(12, cardWidth * 0.036),
              }]}>
                <View style={styles.userInfoBlock}>
                  <Text style={styles.memberName}>{user?.name ?? 'Guest'}</Text>
                  <Text style={styles.memberId}>Joined Dec 2025</Text>
                </View>
                <LinearGradient
                  colors={TIER_BADGE_THEME[user?.tier ?? 'Silver'].gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tierBadge}
                >
                  <Text style={[styles.tierText, { color: TIER_BADGE_THEME[user?.tier ?? 'Silver'].text }]}>
                    {(user?.tier ?? 'Silver').toUpperCase()}
                  </Text>
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* Swipe indicator */}
          <View style={styles.swipeIndicator} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  cardWrapper: {
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.58,
    shadowRadius: 40,
    elevation: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoImage: {
    // Logo keeps its original colors
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  qrSection: {
    alignSelf: 'center',
  },
  qrBlurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  qrInnerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsBlock: {
    alignItems: 'center',
  },
  pointsLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  pointsValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfoBlock: {
    flex: 1,
  },
  memberName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  memberId: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    letterSpacing: 0.5,
    fontSize: 12,
    fontWeight: '500',
  },
  tierBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  tierText: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  swipeIndicator: {
    width: 46,
    height: 5,
    borderRadius: 999,
    marginTop: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});