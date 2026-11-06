import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";

import {
  AuthScreen,
  Banner,
  GlassCard,
  HeroIcon,
  PrimaryButton,
  TextField,
  TopBar,
  authMessages,
  getAuthErrorCode,
  getAuthErrorMessage,
  pearl,
  pearlSpace,
  pearlType,
} from "@/components/auth/pearl";
import { Text } from "@/components/ui/AppTypography";
import { useAppToast } from "@/hooks/useAppToast";
import { authService } from "@/services/authService";
import { isValidEmail } from "@/utils/validation";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // Unregistered email: the banner explains it and the field is highlighted.
  const [emailNotFound, setEmailNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useAppToast();

  const handleEmailChange = (nextEmail: string) => {
    setEmail(nextEmail);
    setEmailError(null);
    setFormError(null);
    setEmailNotFound(false);
  };

  const handleSendOtp = async () => {
    if (isLoading) return;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError(authMessages.EMAIL_REQUIRED_RECOVERY);
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setEmailError(authMessages.EMAIL_INVALID);
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    setFormError(null);

    try {
      const response = await authService.sendForgotPasswordOtp({ email: trimmedEmail });
      toast.showSuccess(`Code sent to ${trimmedEmail}`);

      router.push({
        pathname: "/verify-otp",
        params: {
          email: trimmedEmail,
          message: response.message,
        },
      });
    } catch (error) {
      setEmailNotFound(getAuthErrorCode(error) === "USER_NOT_FOUND");
      setFormError(getAuthErrorMessage(error, "sendCode"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreen header={<TopBar title="Reset password" onBack={() => router.back()} />} footer={<PrimaryButton title="Send code" loading={isLoading} loadingTitle="Sending code…" onPress={handleSendOtp} style={styles.flex} />}>
      <View style={styles.hero}>
        <HeroIcon name="mail-outline" tone="lilac" />
        <Text style={[pearlType.h2, styles.center]}>Forgot your password?</Text>
        <Text style={[pearlType.small, styles.lead]}>Enter the email you use for SalonOX. We’ll email you a 6-digit verification code.</Text>
      </View>

      <GlassCard style={styles.card}>
        <Banner kind="error" message={formError} />
        <TextField
          label="Registered email"
          icon="mail-outline"
          placeholder="you@yoursalon.com"
          value={email}
          onChangeText={handleEmailChange}
          error={emailError ?? emailNotFound}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={handleSendOtp}
        />
        <View style={styles.note}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#6A4F98" style={styles.noteIcon} />
          <Text style={[pearlType.small, styles.noteText]}>
            For your security, codes are sent <Text style={styles.bold}>by email only</Text>.
          </Text>
        </View>
      </GlassCard>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: "center", gap: 10, paddingTop: 6, paddingBottom: pearlSpace.sm, paddingHorizontal: 10 },
  center: { textAlign: "center" },
  lead: { textAlign: "center", maxWidth: 290, fontSize: 13.5, lineHeight: 20 },
  card: { gap: pearlSpace.md, borderRadius: 22 },
  note: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: pearl.infoBg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  noteIcon: { marginTop: 1 },
  noteText: { flex: 1, color: pearl.ink2, lineHeight: 18 },
  bold: { fontWeight: "700", color: pearl.ink2 },
});
