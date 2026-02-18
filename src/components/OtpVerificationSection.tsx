import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

type OtpVerificationSectionProps = {
  phone: string;
  otp: string[];
  otpRefs: React.MutableRefObject<Array<TextInput | null>>;
  onChange: (text: string, index: number) => void;
  onBack: () => void;
  onVerify: () => void;
  verifyLabel: string;
  progressMessage?: string;
  resendTimer: number;
  onResend: () => void;
  isSubmitting?: boolean;
};

export default function OtpVerificationSection({
  phone,
  otp,
  otpRefs,
  onChange,
  onBack,
  onVerify,
  verifyLabel,
  progressMessage,
  resendTimer,
  onResend,
  isSubmitting = false,
}: OtpVerificationSectionProps) {
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const otpBoxWidth = isCompact ? 44 : 50;
  const otpBoxHeight = isCompact ? 54 : 60;
  const otpFontSize = isCompact ? 22 : 24;

  return (
    <View>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Verify Phone</Text>
          <Text style={styles.subtitle}>Code sent to +62 {phone}</Text>
        </View>
      </View>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              otpRefs.current[index] = ref;
            }}
            style={[
              styles.otpBox,
              {
                width: otpBoxWidth,
                height: otpBoxHeight,
                fontSize: otpFontSize,
              },
              digit && styles.otpBoxFilled,
            ]}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(text) => onChange(text, index)}
            editable={!isSubmitting} // Disable input saat loading
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, (otp.join('').length < 4 || isSubmitting) && styles.primaryButtonDisabled]}
        onPress={onVerify}
        disabled={otp.join('').length < 4 || isSubmitting}
      >
        <Text style={styles.primaryButtonText}>{verifyLabel}</Text>
      </TouchableOpacity>

      {isSubmitting && !!progressMessage && (
        <Text style={styles.progressText}>{progressMessage}</Text>
      )}

      <View style={styles.resendWrap}>
        {resendTimer > 0 ? (
          <Text style={styles.resendText}>Resend in 00:{resendTimer.toString().padStart(2, '0')}</Text>
        ) : (
          <TouchableOpacity onPress={onResend} disabled={isSubmitting}>
            <Text style={[styles.resendAction, isSubmitting && { color: '#999' }]}>Resend Code</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { padding: 4, marginRight: 8 },
  backIcon: { fontSize: 20, color: '#1A1A1A' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#6B7280' },

  otpContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  otpBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    textAlign: 'center',
    fontWeight: 'bold',
    backgroundColor: '#F9FAFB',
    color: '#1A1A1A',
  },
  otpBoxFilled: { borderColor: '#B91C2F', backgroundColor: '#FFF5F5' },

  primaryButton: { height: 50, backgroundColor: '#B91C2F', borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  primaryButtonDisabled: { backgroundColor: '#E5E7EB' },
  primaryButtonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  progressText: { textAlign: 'center', marginTop: 10, color: '#8C7B75', fontSize: 12 },

  resendWrap: { alignItems: 'center', marginTop: 16 },
  resendText: { color: '#9CA3AF' },
  resendAction: { color: '#B91C2F', fontWeight: '600' },
});