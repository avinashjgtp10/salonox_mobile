import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable } from "react-native";

import {
  PasswordRecoveryScaffold,
  RecoveryColors,
  RecoveryMessage,
  RecoveryPrimaryButton,
  RecoveryTextButton,
  RecoveryTextInput,
  passwordRecoveryStyles,
} from "@/components/auth/passwordRecoveryUi";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/authService";

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
const isValidPassword = (value: string) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value);

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
  const initialMessage = getParam(params.message);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(initialMessage ?? null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      setFormError("Email address is missing. Please restart the password reset flow.");
      return false;
    }

    if (!password) {
      setPasswordError("New Password is required.");
      isValid = false;
    } else if (!isValidPassword(password)) {
      setPasswordError("Password must be at least 8 characters and contain letters and numbers.");
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Confirm Password is required.");
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError("Confirm Password must match New Password.");
      isValid = false;
    }

    return isValid;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const response = await authService.resetForgotPassword({
        confirmPassword,
        email,
        otp,
        password,
        resetToken,
      });

      router.replace({
        pathname: "/login",
        params: {
          successMessage: response.message,
        },
      });
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const passwordToggle = (
    <Pressable
      hitSlop={12}
      onPress={() => setShowPassword((currentValue) => !currentValue)}
      style={passwordRecoveryStyles.passwordToggle}
    >
      <Ionicons
        name={showPassword ? "eye-outline" : "eye-off-outline"}
        size={20}
        color={RecoveryColors.secondary}
      />
    </Pressable>
  );

  return (
    <PasswordRecoveryScaffold
      title="Reset Password"
      subtitle="Create a secure new password for your SalonOX account."
      footer={
        <RecoveryTextButton
          disabled={isLoading}
          label="Back to OTP"
          onPress={() => router.back()}
        />
      }
    >
      <RecoveryMessage message={successMessage} type="success" />

      <RecoveryTextInput
        autoCapitalize="none"
        autoComplete="password-new"
        error={passwordError ?? undefined}
        iconName="lock-closed-outline"
        label="New Password"
        onChangeText={handlePasswordChange}
        placeholder="Enter new password"
        returnKeyType="next"
        rightAccessory={passwordToggle}
        secureTextEntry={!showPassword}
        textContentType="newPassword"
        value={password}
      />

      <RecoveryTextInput
        autoCapitalize="none"
        autoComplete="password-new"
        error={confirmPasswordError ?? undefined}
        iconName="lock-closed-outline"
        label="Confirm Password"
        onChangeText={handleConfirmPasswordChange}
        onSubmitEditing={handleResetPassword}
        placeholder="Confirm new password"
        returnKeyType="done"
        rightAccessory={passwordToggle}
        secureTextEntry={!showPassword}
        textContentType="newPassword"
        value={confirmPassword}
      />

      <RecoveryMessage message={formError} type="error" />

      <RecoveryPrimaryButton
        isLoading={isLoading}
        label="Reset Password"
        onPress={handleResetPassword}
      />
    </PasswordRecoveryScaffold>
  );
}
