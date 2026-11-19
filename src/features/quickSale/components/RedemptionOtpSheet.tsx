import { pearl, pearlGradients } from "@/components/auth/pearl/tokens";
import { usePearlColors, type PearlColors } from "@/components/auth/pearl/usePearlColors";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { getApiErrorMessage } from "@/services/api";
import { redemptionOtpService } from "@/services/redemptionOtp.service";
import type { RedeemKind } from "@/services/redemptionOtpSettings";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

const OTP_LENGTH = 6;

type RedemptionOtpSheetProps = {
  clientId: string;
  clientName: string;
  /** What this sale redeems, used only for the explanatory copy. */
  kinds: RedeemKind[];
  onClose: () => void;
  /** Fires once the client's code is verified so checkout can continue. */
  onVerified: () => void;
  renderInline?: boolean;
  visible: boolean;
};

const kindsLabel = (kinds: RedeemKind[]): string => {
  const hasPackage = kinds.includes("package");
  const hasMembership = kinds.includes("membership");
  if (hasPackage && hasMembership) return "package and membership";
  if (hasPackage) return "package";
  return "membership";
};

/**
 * WhatsApp OTP gate for redeeming a client's package session or membership
 * benefit. Shown at checkout (Quick Sale and Calendar) when the salon's
 * redeem_otp_required switch is on and the client has no verified window yet.
 * The client reads back the code sent to their registered WhatsApp number; only
 * a successful verify lets the sale proceed. The backend enforces the same gate,
 * so this can't be bypassed by skipping the sheet.
 */
export function RedemptionOtpSheet({ clientId, clientName, kinds, onClose, onVerified, visible }: RedemptionOtpSheetProps) {
  const Colors = usePearlColors(true);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeInput = useRef<TextInput>(null);
  const initialRequestStarted = useRef(false);

  // Reset and request the code as soon as checkout opens the verification
  // sheet. This matches web checkout, where Collect opens directly on the
  // six-digit code entry state instead of requiring a second send tap.
  useEffect(() => {
    if (!visible) {
      initialRequestStarted.current = false;
      return;
    }
    if (initialRequestStarted.current) return;
    initialRequestStarted.current = true;
    setCode("");
    setSentTo("");
    setError(null);
    setSending(true);
    setVerifying(false);
    setResendIn(0);

    void redemptionOtpService.request(clientId)
      .then((result) => {
        setSentTo(result.sentTo);
        setResendIn(result.resendIn || 30);
        setTimeout(() => codeInput.current?.focus(), 150);
      })
      .catch((failure) => setError(getApiErrorMessage(failure)))
      .finally(() => setSending(false));
  }, [visible, clientId]);

  // Resend cooldown ticker.
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setInterval(() => setResendIn((value) => (value <= 1 ? 0 : value - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const sendCode = async () => {
    if (sending || resendIn > 0) return;
    setSending(true);
    setError(null);
    try {
      const result = await redemptionOtpService.request(clientId);
      setSentTo(result.sentTo);
      setResendIn(result.resendIn || 30);
      setCode("");
      setTimeout(() => codeInput.current?.focus(), 150);
    } catch (failure) {
      setError(getApiErrorMessage(failure));
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (verifying || code.length !== OTP_LENGTH) return;
    setVerifying(true);
    setError(null);
    try {
      const result = await redemptionOtpService.verify(clientId, code);
      if (result.verified) {
        onVerified();
        return;
      }
      setError("That code could not be verified. Please try again.");
    } catch (failure) {
      setError(getApiErrorMessage(failure));
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const hasSent = Boolean(sentTo);

  return (
    <Modal animationType="fade" onRequestClose={() => { if (!verifying) onClose(); }} statusBarTranslucent transparent visible={visible}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel="Close verification" onPress={() => { if (!verifying) onClose(); }} style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "position"} contentContainerStyle={styles.modalKeyboardContent} keyboardVerticalOffset={Platform.OS === "android" ? -90 : 0} pointerEvents="box-none" style={styles.modalKeyboardAvoiding}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.headerCopy}>
                <Text translate style={styles.title}>Verify client to redeem</Text>
                <Text style={styles.subtitle}>{clientName}</Text>
              </View>
              <TouchableOpacity accessibilityLabel="Close verification" activeOpacity={0.84} disabled={verifying} onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={18} color={Colors.heading} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.modalBodyScroll}>
              <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark-outline" size={26} color={pearl.accentDeep} />
        </View>
        <Text translate style={styles.intro}>
          {`This sale redeems a ${kindsLabel(kinds)}. Send a WhatsApp code to the client's registered number and enter it below to continue.`}
        </Text>

        {hasSent ? (
          <>
            <Text style={styles.sentTo}>{`Code sent to ${sentTo}`}</Text>
            <TextInput
              autoFocus
              editable={!verifying}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              onChangeText={(value) => { setCode(value.replace(/\D/g, "")); setError(null); }}
              placeholder="------"
              placeholderTextColor={pearl.placeholder}
              ref={codeInput}
              style={styles.codeInput}
              value={code}
            />
            <TouchableOpacity
              accessibilityRole="button"
              disabled={sending || resendIn > 0}
              onPress={() => void sendCode()}
              style={styles.resend}
            >
              <Text translate style={[styles.resendText, (sending || resendIn > 0) && styles.resendDisabled]}>
                {resendIn > 0 ? `Resend code in ${resendIn}s` : sending ? "Sending…" : "Resend code"}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

              </View>
            </ScrollView>
            <View style={styles.actions}>
          <TouchableOpacity activeOpacity={0.84} disabled={verifying} onPress={onClose} style={styles.cancelButton}>
            <Text translate style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          {hasSent ? (
            <TouchableOpacity
              activeOpacity={0.84}
              disabled={verifying || code.length !== OTP_LENGTH}
              onPress={() => void verify()}
              style={[styles.primaryButton, (verifying || code.length !== OTP_LENGTH) && styles.disabled]}
            >
              <LinearGradient pointerEvents="none" colors={pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              {verifying ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text translate style={styles.primaryText}>Verify & continue</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.84}
              disabled={sending}
              onPress={() => void sendCode()}
              style={[styles.primaryButton, sending && styles.disabled]}
            >
              <LinearGradient pointerEvents="none" colors={pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              {sending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text translate style={styles.primaryText}>Send WhatsApp code</Text>}
            </TouchableOpacity>
          )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (Colors: PearlColors) => StyleSheet.create({
  modalRoot: { backgroundColor: "rgba(20, 18, 16, 0.52)", flex: 1, justifyContent: "center", padding: 20 },
  modalKeyboardAvoiding: { flex: 1 },
  modalKeyboardContent: { alignItems: "center", flex: 1, justifyContent: "center" },
  modalCard: { backgroundColor: Colors.bg, borderColor: Colors.glassEdge, borderRadius: 26, borderWidth: 1, maxHeight: "88%", maxWidth: 480, overflow: "hidden", padding: 22, width: "100%" },
  modalBodyScroll: { flexShrink: 1 },
  modalHeader: { alignItems: "flex-start", flexDirection: "row", gap: Spacing.sm, justifyContent: "space-between", marginBottom: Spacing.md },
  headerCopy: { flex: 1, gap: 4 },
  title: { color: Colors.heading, fontSize: 20, fontWeight: "800" },
  subtitle: { color: Colors.text2, fontSize: 14 },
  closeButton: { alignItems: "center", backgroundColor: Colors.bg2, borderColor: Colors.border, borderRadius: 18, borderWidth: 1, height: 36, justifyContent: "center", width: 36 },
  body: { gap: Spacing.md },
  iconWrap: {
    alignItems: "center", alignSelf: "center", backgroundColor: pearl.accentWash, borderRadius: 18,
    height: 52, justifyContent: "center", width: 52,
  },
  intro: { color: pearl.ink2, fontSize: 13, lineHeight: 19, textAlign: "center" },
  sentTo: { color: pearl.ink, fontSize: 13, fontWeight: "700", textAlign: "center" },
  codeInput: {
    backgroundColor: pearl.field, borderColor: pearl.fieldBorder, borderRadius: 16, borderWidth: 1,
    color: pearl.ink, fontSize: 24, fontWeight: "800", letterSpacing: 8, minHeight: 56,
    paddingHorizontal: 14, textAlign: "center",
  },
  resend: { alignSelf: "center", paddingVertical: 6 },
  resendText: { color: pearl.accentDeep, fontSize: 13, fontWeight: "700" },
  resendDisabled: { color: pearl.muted },
  errorText: { color: Colors.error, fontSize: 12, fontWeight: "700", textAlign: "center" },
  actions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.xs },
  cancelButton: {
    alignItems: "center", backgroundColor: Colors.bg2, borderColor: Colors.border, borderRadius: 16,
    borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 48,
  },
  cancelText: { color: Colors.heading, fontSize: 14, fontWeight: "700" },
  primaryButton: { alignItems: "center", borderRadius: 16, flex: 1.4, justifyContent: "center", minHeight: 48, overflow: "hidden" },
  primaryText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.6 },
});
