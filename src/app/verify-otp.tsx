import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";

import {
  AuthScreen,
  Banner,
  GlassCard,
  HeroIcon,
  OtpInput,
  PrimaryButton,
  TextButton,
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

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

// The backend issues 6-digit codes that expire after 10 minutes.
const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 30;
const formatTimer = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<{
    email?: string;
    message?: string;
  }>();
  const email = getParam(params.email) ?? "";
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [expiresIn, setExpiresIn] = useState(OTP_EXPIRY_SECONDS);
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SECONDS);
  const toast = useAppToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setExpiresIn((seconds) => Math.max(0, seconds - 1));
      setResendIn((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (nextOtp: string) => {
    setOtp(nextOtp.replace(/\D/g, ""));
    setOtpError(null);
    setFormError(null);
  };

  const handleVerifyOtp = async () => {
    if (isLoading) return;
    const trimmedOtp = otp.trim();

    if (!email) {
      setFormError(authMessages.RESET_FLOW_BROKEN);
      return;
    }

    if (trimmedOtp.length < OTP_LENGTH) {
      setOtpError(authMessages.OTP_INCOMPLETE);
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    setFormError(null);

    try {
      const response = await authService.verifyForgotPasswordOtp({
        email,
        otp: trimmedOtp,
      });
      const resetToken =
        response.data?.resetToken ?? response.data?.token ?? response.data?.verificationToken;
      toast.showSuccess("Email verified");

      router.push({
        pathname: "/reset-password",
        params: {
          email,
          message: response.message,
          otp: trimmedOtp,
          resetToken,
        },
      });
    } catch (error) {
      // Code problems show under the boxes; connection / server problems in the banner.
      const message = getAuthErrorMessage(error, "verifyCode");
      if (getAuthErrorCode(error)?.startsWith("OTP_")) setOtpError(message);
      else setFormError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || isResending || !email) return;
    setIsResending(true);
    setFormError(null);
    setOtpError(null);

    try {
      await authService.sendForgotPasswordOtp({ email });
      setOtp("");
      setExpiresIn(OTP_EXPIRY_SECONDS);
      setResendIn(RESEND_COOLDOWN_SECONDS);
      toast.showSuccess(`A new code has been sent to ${email}`);
    } catch (error) {
      setFormError(getAuthErrorMessage(error, "sendCode"));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthScreen header={<TopBar title="Verify email" onBack={() => router.back()} />} footer={<PrimaryButton title="Verify" loading={isLoading} loadingTitle="Verifying…" onPress={handleVerifyOtp} style={styles.flex} />}>
      <View style={styles.hero}>
        <HeroIcon name="mail-open-outline" tone="rose" />
        <Text style={[pearlType.h2, styles.center]}>Check your email</Text>
        <Text style={[pearlType.small, styles.lead]}>
          We sent a 6-digit code to <Text style={styles.email}>{email || "your email"}</Text>
        </Text>
        <Text style={[pearlType.small, styles.lead]}>
          {expiresIn > 0 ? <>Code expires in <Text style={styles.strong}>{formatTimer(expiresIn)}</Text></> : "This code has expired. Please request a new one."}
        </Text>
      </View>

      <GlassCard style={styles.card}>
        <Banner kind="error" message={formError} />
        <OtpInput value={otp} onChange={handleOtpChange} onSubmit={handleVerifyOtp} error={!!otpError} length={OTP_LENGTH} />
        {otpError ? (
          <View style={styles.errRow} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle-outline" size={14} color={pearl.dangerText} />
            <Text style={pearlType.error}>{otpError}</Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <Text style={pearlType.small}>Didn’t get it? Check spam.</Text>
          <Pressable
            onPress={handleResend}
            disabled={resendIn > 0 || isResending}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ disabled: resendIn > 0 || isResending }}
          >
            <Text style={[pearlType.link, styles.resend, (resendIn > 0 || isResending) && styles.resendOff]}>
              {isResending ? "Sending…" : resendIn > 0 ? `Resend in ${formatTimer(resendIn)}` : "Resend code"}
            </Text>
          </Pressable>
        </View>
      </GlassCard>

      <TextButton title="Use a different email" onPress={() => router.back()} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: "center", gap: 10, paddingTop: 6, paddingBottom: pearlSpace.sm, paddingHorizontal: 10 },
  center: { textAlign: "center" },
  lead: { textAlign: "center", fontSize: 13.5, lineHeight: 20 },
  email: { color: pearl.ink, fontWeight: "700" },
  strong: { color: pearl.ink2, fontWeight: "700" },
  card: { gap: pearlSpace.md, borderRadius: 22 },
  errRow: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resend: { fontWeight: "700" },
  resendOff: { color: pearl.muted },
});
