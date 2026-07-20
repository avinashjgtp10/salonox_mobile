import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable } from "react-native";

import {
  PasswordRecoveryScaffold,
  RecoveryMessage,
  RecoveryPrimaryButton,
  RecoveryTextButton,
  RecoveryTextInput,
  passwordRecoveryStyles,
} from "@/components/auth/passwordRecoveryUi";
import { useThemeColors } from "@/theme/ThemeProvider";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/authService";
import {
  CONFIRM_PASSWORD_MISMATCH_MESSAGE,
  isValidPassword,
  PASSWORD_REQUIREMENT_MESSAGE,
} from "@/utils/validation";

export default function ChangePasswordScreen() {
  const Colors = useThemeColors();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const clearErrors = () => {
    setCurrentPasswordError(null);
    setNewPasswordError(null);
    setConfirmPasswordError(null);
    setFormError(null);
  };

  const handleCurrentPasswordChange = (value: string) => {
    setCurrentPassword(value);
    clearErrors();
  };

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    clearErrors();
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    clearErrors();
  };

  const validateForm = () => {
    let isValid = true;

    if (!currentPassword) {
      setCurrentPasswordError("Current Password is required.");
      isValid = false;
    }

    if (!newPassword) {
      setNewPasswordError("New Password is required.");
      isValid = false;
    } else if (!isValidPassword(newPassword)) {
      setNewPasswordError(PASSWORD_REQUIREMENT_MESSAGE);
      isValid = false;
    } else if (newPassword === currentPassword) {
      setNewPasswordError("New Password must be different from your current password.");
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Confirm Password is required.");
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError(CONFIRM_PASSWORD_MISMATCH_MESSAGE);
      isValid = false;
    }

    return isValid;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const response = await authService.changePassword({
        confirmPassword,
        currentPassword,
        newPassword,
      });

      setSuccessMessage(response.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        }
      }, 900);
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
        color={Colors.secondary}
      />
    </Pressable>
  );

  return (
    <PasswordRecoveryScaffold
      title="Change Password"
      subtitle="Update your SalonOX password to keep your account secure."
      footer={
        <RecoveryTextButton
          disabled={isLoading}
          label="Back"
          onPress={() => (router.canGoBack() ? router.back() : undefined)}
        />
      }
    >
      <RecoveryMessage message={successMessage} type="success" />

      <RecoveryTextInput
        autoCapitalize="none"
        autoComplete="current-password"
        error={currentPasswordError ?? undefined}
        iconName="lock-closed-outline"
        label="Current Password"
        onChangeText={handleCurrentPasswordChange}
        placeholder="Enter current password"
        returnKeyType="next"
        rightAccessory={passwordToggle}
        secureTextEntry={!showPassword}
        textContentType="password"
        value={currentPassword}
      />

      <RecoveryTextInput
        autoCapitalize="none"
        autoComplete="password-new"
        error={newPasswordError ?? undefined}
        iconName="lock-closed-outline"
        label="New Password"
        onChangeText={handleNewPasswordChange}
        placeholder="Enter new password"
        returnKeyType="next"
        rightAccessory={passwordToggle}
        secureTextEntry={!showPassword}
        textContentType="newPassword"
        value={newPassword}
      />

      <RecoveryTextInput
        autoCapitalize="none"
        autoComplete="password-new"
        error={confirmPasswordError ?? undefined}
        iconName="lock-closed-outline"
        label="Confirm Password"
        onChangeText={handleConfirmPasswordChange}
        onSubmitEditing={handleChangePassword}
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
        label="Update Password"
        onPress={handleChangePassword}
      />
    </PasswordRecoveryScaffold>
  );
}
