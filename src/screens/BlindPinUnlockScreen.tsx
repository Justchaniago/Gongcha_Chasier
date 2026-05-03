import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCashierStore } from "../store/useCashierStore";

const { width } = Dimensions.get("window");

const MAX_PIN_LEN = 4;
const MIN_PIN_LEN = 4;
const DOT_COUNT = 4;

// ─── Design tokens ────────────────────────────────────────────────────────────
const D = {
  bg: "#F5F5DC", // beige
  numBg: "rgba(255,255,255,0.78)",
  numBorder: "rgba(0,0,0,0.06)",
  numPressed: "rgba(255,255,255,0.95)",
  border: "rgba(0,0,0,0.06)",
  red: "#D3232A",
  redBright: "#D3232A",
  textPrimary: "#0F1117",
  textSecondary: "rgba(15,17,23,0.55)",
  textTertiary: "rgba(15,17,23,0.35)",
};

// ─── Dot indicator ────────────────────────────────────────────────────────────
function PinDot({ filled }: { filled: boolean }) {
  const scale = useRef(new Animated.Value(filled ? 1 : 0.7)).current;
  const opacity = useRef(new Animated.Value(filled ? 1 : 0)).current;
  const prevFilled = useRef(filled);

  useEffect(() => {
    const was = prevFilled.current;
    prevFilled.current = filled;
    if (!was && filled) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.3, duration: 90, useNativeDriver: true, easing: Easing.out(Easing.back(2.5)) }),
          Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]),
        Animated.timing(opacity, { toValue: 1, duration: 90, useNativeDriver: true }),
      ]).start();
    } else if (was && !filled) {
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.6, duration: 90, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 90, useNativeDriver: true }),
      ]).start();
    }
  }, [filled]);

  return (
    <View style={styles.dot}>
      <Animated.View
        style={[
          styles.dotInner,
          {
            opacity,
            transform: [{ scale }],
            backgroundColor: D.red,
          },
        ]}
      />
    </View>
  );
}

// ─── Numpad key ───────────────────────────────────────────────────────────────
function NumKey({
  label,
  sub,
  onPress,
  isDelete,
  disabled,
}: {
  label: string;
  sub?: string;
  onPress: () => void;
  isDelete?: boolean;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.timing(scale, { toValue: 0.90, duration: 60, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 8 }).start();

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={disabled}>
      <Animated.View
        style={[
          styles.numKey,
          isDelete && styles.numKeyTransparent,
          { transform: [{ scale }] },
        ]}
      >
        {isDelete ? (
          <Text style={styles.deleteGlyph}>⌫</Text>
        ) : (
          <>
            <Text style={styles.numKeyLabel}>{label}</Text>
            {sub ? <Text style={styles.numKeySub}>{sub}</Text> : null}
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function BlindPinUnlockScreen() {
  const { staff, activeCashier, isLocked, setActiveCashier } = useCashierStore();
  const cashiers = useMemo(() => staff?.cashiers ?? [], [staff]);

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const storeName = staff?.name ?? "Gong Cha";

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 5) return "Good night";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
  };

  // Shake row on wrong PIN
  const shakeX = useRef(new Animated.Value(0)).current;
  const triggerShake = () => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 11, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -11, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start();
  };

  // Fade error in/out
  const errorOpacity = useRef(new Animated.Value(0)).current;
  const showError = (msg: string) => {
    setError(msg);
    errorOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(errorOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(errorOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setError(null));
  };

  useEffect(() => {
    if (activeCashier && !isLocked) {
      setPin("");
      setError(null);
    }
  }, [activeCashier, isLocked]);

  const tryUnlock = async (nextPin: string) => {
    if (validating) return;
    setValidating(true);
    try {
      const match = cashiers.find((c) => String(c.passcode) === nextPin);
      if (match) {
        setActiveCashier(match, false);
        setPin("");
      } else {
        triggerShake();
        showError("Incorrect PIN");
        setTimeout(() => setPin(""), 420);
      }
    } finally {
      setValidating(false);
    }
  };

  const appendDigit = (d: string) => {
    setPin((prev) => {
      if (prev.length >= MAX_PIN_LEN) return prev;
      const next = prev + d;
      if (next.length === MAX_PIN_LEN) void tryUnlock(next);
      return next;
    });
  };

  const backspace = () => setPin((prev) => prev.slice(0, -1));

  const ROWS = [
    [{ n: "1", s: "" }, { n: "2", s: "ABC" }, { n: "3", s: "DEF" }],
    [{ n: "4", s: "GHI" }, { n: "5", s: "JKL" }, { n: "6", s: "MNO" }],
    [{ n: "7", s: "PQRS" }, { n: "8", s: "TUV" }, { n: "9", s: "WXYZ" }],
    [null, { n: "0", s: "+" }, { n: "DEL", s: "" }],
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={D.bg} />

      <View style={styles.root}>

        {/* ── Header ── */}
        <View style={styles.topSection}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.storeName} numberOfLines={1}>{storeName}</Text>
          <Text style={styles.subtitle}>Enter your 4-digit PIN to unlock</Text>
        </View>

        {/* ── Dots ── */}
        <Animated.View style={[styles.dotsWrapper, { transform: [{ translateX: shakeX }] }]}>
          <View style={styles.dotsRow}>
            {Array.from({ length: DOT_COUNT }).map((_, i) => (
              <PinDot key={i} filled={i < pin.length} />
            ))}
          </View>
          <Animated.View style={[styles.errorRow, { opacity: errorOpacity }]}>
            <Text style={styles.errorText}>{error ?? ""}</Text>
          </Animated.View>
        </Animated.View>

        {/* ── Numpad ── */}
        <View style={styles.numpad}>
          {ROWS.map((row, ri) => (
            <View key={ri} style={styles.numRow}>
              {row.map((cell, ci) => {
                if (!cell) return <View key={`ghost-${ri}-${ci}`} style={styles.numKeyGhost} />;
                if (cell.n === "DEL") return (
                  <NumKey key={`del-${ri}-${ci}`} label="" onPress={backspace} isDelete disabled={pin.length === 0} />
                );
                return (
                  <NumKey
                    key={`key-${ri}-${ci}-${cell.n}`}
                    label={cell.n}
                    sub={cell.s || undefined}
                    onPress={() => appendDigit(cell.n)}
                  />
                );
              })}
            </View>
          ))}
        </View>

      </View>
    </SafeAreaView>
  );
}

// ─── Sizing ───────────────────────────────────────────────────────────────────
const GAP = 12;
const H_PAD = 32;
const KEY_W = Math.min((width - H_PAD * 2 - GAP * 2) / 3, 108);
const KEY_H = Math.round(KEY_W * 0.68);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: D.bg },
  root: {
    flex: 1,
    backgroundColor: D.bg,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: H_PAD,
    paddingVertical: 8,
  },

  // ── Top ──
  topSection: { alignItems: "center", gap: 6 },
  greeting: {
    fontSize: 11,
    fontWeight: "600",
    color: D.textTertiary,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  storeName: {
    fontSize: 26,
    fontWeight: "700",
    color: D.textPrimary,
    letterSpacing: -0.6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
    color: D.textSecondary,
    letterSpacing: 0.1,
  },

  // ── Dots ──
  dotsWrapper: { alignItems: "center", gap: 10 },
  dotsRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: D.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  errorRow: { height: 18, alignItems: "center", justifyContent: "center" },
  errorText: {
    fontSize: 12.5,
    fontWeight: "500",
    color: D.redBright,
    letterSpacing: 0.2,
  },

  // ── Numpad ──
  numpad: { width: "100%", gap: GAP },
  numRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: GAP,
  },
  numKey: {
    width: KEY_W,
    height: KEY_H,
    borderRadius: 16,
    backgroundColor: D.numBg,
    borderWidth: 1,
    borderColor: D.numBorder,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  numKeyTransparent: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  numKeyGhost: { width: KEY_W, height: KEY_H },
  numKeyLabel: {
    fontSize: 20,
    fontWeight: "300",
    color: D.textPrimary,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  numKeySub: {
    fontSize: 8,
    fontWeight: "600",
    color: D.textTertiary,
    letterSpacing: 1.8,
  },
  deleteGlyph: {
    fontSize: 20,
    color: "rgba(255,255,255,0.5)",
  },
});
