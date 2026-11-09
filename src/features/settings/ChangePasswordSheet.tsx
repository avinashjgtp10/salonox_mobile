import { useEffect, useRef, useState } from "react";
import { Keyboard, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { PasswordField } from "@/components/ui/PasswordField";
import { authService } from "@/services/authService";
import { getApiErrorMessage } from "@/services/api";
import {
  CONFIRM_PASSWORD_MISMATCH_MESSAGE,
  CHANGED_PASSWORD_REQUIREMENT_MESSAGE,
  isValidChangedPassword,
} from "@/utils/validation";
import { SettingsButton, useSettingsStyles } from "./SettingsUI";

export function ChangePasswordSheet({
  onClose,
  renderInline = false,
}: {
  onClose: () => void;
  renderInline?: boolean;
}) {
  const ui = useSettingsStyles();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    current?: string;
    next?: string;
    confirm?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const currentRef = useRef<TextInput>(null),
    nextRef = useRef<TextInput>(null),
    confirmRef = useRef<TextInput>(null);
  const lock = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const clearErrors = () => {
    setErrors({});
    setError(null);
  };
  const submit = async () => {
    if (lock.current || success) return;
    const validation: typeof errors = {};
    if (!currentPassword) validation.current = "Current password is required.";
    if (!newPassword) validation.next = "New password is required.";
    else if (!isValidChangedPassword(newPassword))
      validation.next = CHANGED_PASSWORD_REQUIREMENT_MESSAGE;
    else if (newPassword === currentPassword)
      validation.next =
        "New password must be different from your current password.";
    if (!confirmPassword)
      validation.confirm = "Confirm new password is required.";
    else if (newPassword !== confirmPassword)
      validation.confirm = CONFIRM_PASSWORD_MISMATCH_MESSAGE;
    setErrors(validation);
    if (Object.keys(validation).length) {
      (validation.current
        ? currentRef
        : validation.next
          ? nextRef
          : confirmRef
      ).current?.focus();
      return;
    }
    lock.current = true;
    setLoading(true);
    setError(null);
    Keyboard.dismiss();
    try {
      const response = await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (!mounted.current) return;
      setSuccess(response.message || "Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      timer.current = setTimeout(onClose, 900);
    } catch (err) {
      if (mounted.current) setError(getApiErrorMessage(err));
    } finally {
      lock.current = false;
      if (mounted.current) setLoading(false);
    }
  };
  return (
    <BottomSheet
      renderInline={renderInline}
      visible
      pearlStyle
      centered={false}
      avoidKeyboard
      title="Change password"
      onClose={() => {
        if (!lock.current) {
          Keyboard.dismiss();
          onClose();
        }
      }}
      footer={
        <View style={{ flex: 1 }}>
          <SettingsButton
            label="Update password"
            onPress={() => void submit()}
            loading={loading}
            disabled={!!success}
          />
        </View>
      }
    >
      <PasswordField
        pearlStyle
        leadingIcon="lock-closed-outline"
        ref={currentRef}
        label="Current password *"
        placeholder="Your current password"
        value={currentPassword}
        onChangeText={(value) => {
          setCurrentPassword(value);
          clearErrors();
        }}
        error={errors.current}
        editable={!loading && !success}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => nextRef.current?.focus()}
      />
      <PasswordField
        pearlStyle
        leadingIcon="lock-closed-outline"
        ref={nextRef}
        label="New password *"
        placeholder="At least 8 characters"
        value={newPassword}
        onChangeText={(value) => {
          setNewPassword(value);
          clearErrors();
        }}
        error={errors.next}
        editable={!loading && !success}
        autoComplete="password-new"
        textContentType="newPassword"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <Text style={[ui.muted, { marginBottom: 14 }]}>
        {CHANGED_PASSWORD_REQUIREMENT_MESSAGE}
      </Text>
      <PasswordField
        pearlStyle
        leadingIcon="lock-closed-outline"
        ref={confirmRef}
        label="Confirm new password *"
        placeholder="Re-enter new password"
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          clearErrors();
        }}
        error={errors.confirm}
        editable={!loading && !success}
        autoComplete="password-new"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />
      {!!error && (
        <Text translate accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      {!!success && (
        <Text accessibilityLiveRegion="polite" style={ui.body}>
          {success}
        </Text>
      )}
    </BottomSheet>
  );
}
