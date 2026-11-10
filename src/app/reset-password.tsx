import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet } from "react-native";

import {
  AuthScreen,
  Banner,
  GlassCard,
  PasswordRules,
  PrimaryButton,
  TextField,
  TopBar,
  authMessages,
  getAuthErrorMessage,
  getPasswordRuleState,
  pearlSpace,
} from "@/components/auth/pearl";
import { type TextInput } from "@/components/ui/AppTypography";
import { useAppToast } from "@/hooks/useAppToast";
import { authService } from "@/services/authService";
import {
  isValidPassword,
} from "@/utils/validation";

// How long the success toast stays on this screen before going to Login.
const REDIRECT_DELAY_MS = 2500;

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    email?: string;
    message?: string;
    otp?: string;
    resetToken?: string;
  }>();
  const email = getParam(params.email) ?? "";
  const otp = getParam(params.otp);
  const resetToken = getParam(params.resetToken);
  const confirmRef = useRef<TextInput>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Password changed: the toast is showing and the screen is about to go to Login.
  const [isUpdated, setIsUpdated] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useAppToast();

  useEffect(() => () => {
    if (redirectTimer.current) clearTimeout(redirectTimer.current);
  }, []);
  const rules = getPasswordRuleState(password, confirmPassword);

  const handlePasswordChange = (nextPassword: string) => {
    setPassword(nextPassword);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setFormError(null);
  };

  const handleConfirmPasswordChange = (nextConfirmPassword: string) => {
    setConfirmPassword(nextConfirmPassword);
    setConfirmPasswordError(null);
    setFormError(null);
  };

  const validateForm = () => {
    let isValid = true;

    if (!email) {
      setFormError(authMessages.RESET_FLOW_BROKEN);
      return false;
    }

    if (!otp) {
      setFormError(authMessages.RESET_FLOW_BROKEN);
      return false;
    }

    if (!password) {
      setPasswordError(authMessages.NEW_PASSWORD_REQUIRED);
      isValid = false;
    } else if (!isValidPassword(password)) {
      setPasswordError(authMessages.NEW_PASSWORD_WEAK);
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError(authMessages.CONFIRM_PASSWORD_REQUIRED);
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError(authMessages.PASSWORDS_DONT_MATCH);
      isValid = false;
    }

    return isValid;
  };

  const handleResetPassword = async () => {
    if (isLoading || isUpdated || !validateForm()) {
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    setFormError(null);

    try {
      await authService.resetForgotPassword({
        confirmPassword,
        email,
        otp,
        password,
        resetToken,
      });

      setIsUpdated(true);
      toast.showSuccess("Password updated. Sign in with your new password.", REDIRECT_DELAY_MS);
      redirectTimer.current = setTimeout(() => router.replace("/login"), REDIRECT_DELAY_MS);
    } catch (error) {
      setFormError(getAuthErrorMessage(error, "resetPassword"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreen header={<TopBar title="New password" onBack={() => router.back()} />} footer={<PrimaryButton title={isUpdated ? "Password updated" : "Update password"} loading={isLoading} loadingTitle="Updating…" disabled={isUpdated} onPress={handleResetPassword} style={styles.flex} />}>
      <GlassCard style={styles.card}>
        <Banner kind="error" message={formError} />
        <TextField
          label="New password"
          icon="lock-closed-outline"
          placeholder="At least 8 characters"
          value={password}
          onChangeText={handlePasswordChange}
          error={passwordError}
          secureToggle
          autoCapitalize="none"
          autoComplete="password-new"
          autoCorrect={false}
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <TextField
          ref={confirmRef}
          label="Confirm new password"
          icon="lock-closed-outline"
          placeholder="Re-enter the password"
          value={confirmPassword}
          onChangeText={handleConfirmPasswordChange}
          error={confirmPasswordError}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
          autoCorrect={false}
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={handleResetPassword}
        />
        <PasswordRules rules={rules} />
      </GlassCard>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: pearlSpace.md + 2, borderRadius: 22 },
});
