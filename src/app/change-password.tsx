/**
 * Paper pilot screen. The layout scaffold (gradient, logo, card) is still the
 * shared `PasswordRecoveryScaffold`, but every control inside it is now a
 * react-native-paper component driven by the MD3 theme built in
 * `@/theme/paperTheme`. The `Recovery*` primitives are deliberately left in
 * place for forgot-password / reset-password so this migration stays isolated.
 */

import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Banner, Button, HelperText, TextInput, useTheme } from "react-native-paper";

import { PasswordRecoveryScaffold } from "@/components/auth/passwordRecoveryUi";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/authService";
import {
  CONFIRM_PASSWORD_MISMATCH_MESSAGE,
  isValidPassword,
  PASSWORD_REQUIREMENT_MESSAGE,
} from "@/utils/validation";

export default function ChangePasswordScreen() {
  const theme = useTheme();
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

  // One shared toggle descriptor — each TextInput still needs its own
  // TextInput.Icon element, but they all flip the same piece of state.
  const passwordVisibilityIcon = showPassword ? "eye-off-outline" : "eye-outline";
  const togglePasswordVisibility = () => setShowPassword((currentValue) => !currentValue);

  return (
    <PasswordRecoveryScaffold
      title="Change Password"
      subtitle="Update your SalonOX password to keep your account secure."
      footer={
        <Button
          disabled={isLoading}
          mode="text"
          onPress={() => (router.canGoBack() ? router.back() : undefined)}
        >
          Back
        </Button>
      }
    >
      <Banner
        icon="check-circle-outline"
        style={[styles.banner, { backgroundColor: theme.colors.surface }]}
        visible={Boolean(successMessage)}
      >
        {successMessage ?? ""}
      </Banner>

      <View style={styles.field}>
        <TextInput
          autoCapitalize="none"
          autoComplete="current-password"
          error={Boolean(currentPasswordError)}
          label="Current Password"
          left={<TextInput.Icon icon="lock-outline" />}
          mode="outlined"
          onChangeText={handleCurrentPasswordChange}
          returnKeyType="next"
          right={
            <TextInput.Icon icon={passwordVisibilityIcon} onPress={togglePasswordVisibility} />
          }
          secureTextEntry={!showPassword}
          textContentType="password"
          value={currentPassword}
        />
        <HelperText type="error" visible={Boolean(currentPasswordError)}>
          {currentPasswordError ?? ""}
        </HelperText>
      </View>

      <View style={styles.field}>
        <TextInput
          autoCapitalize="none"
          autoComplete="password-new"
          error={Boolean(newPasswordError)}
          label="New Password"
          left={<TextInput.Icon icon="lock-outline" />}
          mode="outlined"
          onChangeText={handleNewPasswordChange}
          returnKeyType="next"
          right={
            <TextInput.Icon icon={passwordVisibilityIcon} onPress={togglePasswordVisibility} />
          }
          secureTextEntry={!showPassword}
          textContentType="newPassword"
          value={newPassword}
        />
        <HelperText type="error" visible={Boolean(newPasswordError)}>
          {newPasswordError ?? ""}
        </HelperText>
      </View>

      <View style={styles.field}>
        <TextInput
          autoCapitalize="none"
          autoComplete="password-new"
          error={Boolean(confirmPasswordError)}
          label="Confirm Password"
          left={<TextInput.Icon icon="lock-outline" />}
          mode="outlined"
          onChangeText={handleConfirmPasswordChange}
          onSubmitEditing={handleChangePassword}
          returnKeyType="done"
          right={
            <TextInput.Icon icon={passwordVisibilityIcon} onPress={togglePasswordVisibility} />
          }
          secureTextEntry={!showPassword}
          textContentType="newPassword"
          value={confirmPassword}
        />
        <HelperText type="error" visible={Boolean(confirmPasswordError)}>
          {confirmPasswordError ?? ""}
        </HelperText>
      </View>

      <Banner
        icon="alert-circle-outline"
        style={[styles.banner, { backgroundColor: theme.colors.errorContainer }]}
        visible={Boolean(formError)}
      >
        {formError ?? ""}
      </Banner>

      <Button
        contentStyle={styles.submitContent}
        disabled={isLoading}
        loading={isLoading}
        mode="contained"
        onPress={handleChangePassword}
        style={styles.submit}
      >
        Update Password
      </Button>
    </PasswordRecoveryScaffold>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    marginBottom: 12,
  },
  field: {
    marginBottom: 4,
  },
  submit: {
    marginBottom: 12,
    marginTop: 8,
  },
  submitContent: {
    height: 50,
  },
});
