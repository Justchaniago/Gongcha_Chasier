import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useCashierStore } from "../store/useCashierStore";

const MAX_PIN_LEN = 6;
const MIN_PIN_LEN = 4;

const NumpadButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.padBtn, pressed && styles.padBtnPressed]}
  >
    <Text style={styles.padBtnText}>{label}</Text>
  </Pressable>
);

export default function BlindPinUnlockScreen() {
  const { staff, activeCashier, isLocked, setActiveCashier } = useCashierStore();
  const cashiers = useMemo(() => staff?.cashiers ?? [], [staff]);

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const storeName = staff?.name || "Unknown Store";
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 15) return "Good Afternoon";
    if (hour < 19) return "Good Evening";
    return "Good Night";
  };

  useEffect(() => {
    // If already unlocked, don't keep showing this screen.
    if (activeCashier && !isLocked) {
      setPin("");
      setError(null);
    }
  }, [activeCashier, isLocked]);

  const tryUnlock = async (nextPin: string) => {
    if (validating) return;
    if (nextPin.length < MIN_PIN_LEN || nextPin.length > MAX_PIN_LEN) return;

    setValidating(true);
    setError(null);
    try {
      const match = cashiers.find((c) => String(c.passcode) === nextPin);
      if (match) {
        setActiveCashier(match, false);
        setPin("");
        setError(null);
      } else {
        setError("PIN salah");
        // Keep user input for 5-6 digits (blind entry); clear only at max length.
        if (nextPin.length === MAX_PIN_LEN) {
          setPin("");
        }
      }
    } finally {
      setValidating(false);
    }
  };

  const appendDigit = (d: string) => {
    setError(null);
    setPin((prev) => {
      const next = prev.length >= MAX_PIN_LEN ? prev : prev + d;
      // Trigger validation when length reaches 4-6 digits.
      if (next.length >= MIN_PIN_LEN && next.length <= MAX_PIN_LEN) {
        void tryUnlock(next);
      }
      return next;
    });
  };

  const backspace = () => {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5DC" />

      <View style={styles.root}>
        <View style={styles.topHeader}>
          <Text style={styles.eyebrow}>{getGreeting()}</Text>
          <Text style={styles.storeName} numberOfLines={1}>
            {storeName}
          </Text>
          <Text style={styles.cashierLine}>
            Cashier: <Text style={styles.cashierBold}>PIN required</Text>
          </Text>
          <Text style={styles.cashierNote}>
            Sistem akan memilih cashier berdasarkan passcode.
          </Text>
        </View>

        <View style={styles.glassCard}>
          <BlurView
            intensity={40}
            tint="light"
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Enter PIN</Text>
            <Text style={styles.cardSubtitle}>4–6 digits</Text>

            <View style={styles.pinBox}>
              <Text style={styles.pinText}>
                {pin ? "•".repeat(pin.length) : " "}
              </Text>
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.numpad}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d) => (
                <NumpadButton key={d} label={d} onPress={() => appendDigit(d)} />
              ))}
              <NumpadButton label="DEL" onPress={backspace} />
            </View>

            <View style={styles.loaderArea}>
              {validating ? <ActivityIndicator color="#D3232A" /> : null}
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: {
    flex: 1,
    backgroundColor: "#F5F5DC",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 26,
  },
  topHeader: { width: "100%", alignItems: "center", marginBottom: 18 },
  eyebrow: { fontSize: 13, fontWeight: "800", color: "rgba(0,0,0,0.45)", letterSpacing: 0.6, textTransform: "uppercase" },
  storeName: { fontSize: 26, fontWeight: "900", color: "#111", letterSpacing: -0.6, marginTop: 8, textAlign: "center" },
  cashierLine: { marginTop: 10, fontSize: 14, fontWeight: "700", color: "rgba(0,0,0,0.55)", textAlign: "center" },
  cashierBold: { color: "#111", fontWeight: "900" },
  cashierNote: { marginTop: 6, fontSize: 12, fontWeight: "600", color: "rgba(0,0,0,0.4)", textAlign: "center", lineHeight: 16 },

  glassCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    overflow: "hidden",
  },
  cardInner: { padding: 22, paddingBottom: 26 },
  cardTitle: { fontSize: 20, fontWeight: "900", color: "#111", textAlign: "center", marginBottom: 2 },
  cardSubtitle: { fontSize: 12, fontWeight: "700", color: "rgba(0,0,0,0.45)", textAlign: "center", marginBottom: 16 },

  pinBox: {
    width: "100%",
    backgroundColor: "rgba(245,245,220,0.35)",
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 14,
  },
  pinText: { fontSize: 30, fontWeight: "900", letterSpacing: 6, color: "#111" },
  errorText: { color: "#D3232A", fontWeight: "900", marginBottom: 12, textAlign: "center" },
  numpad: {
    width: "100%",
    paddingTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "center",
  },
  padBtn: {
    width: "30.5%",
    aspectRatio: 1,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  padBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  padBtnText: { fontSize: 16, fontWeight: "900", color: "#111" },
  loaderArea: { height: 24, marginTop: 12, alignItems: "center", justifyContent: "center" },
});

