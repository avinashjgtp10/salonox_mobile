import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

const CONFIRM_WORD = "DELETE";

type DeleteAccountModalProps = {
  errorMessage: string | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  visible: boolean;
};

export function DeleteAccountModal({
  errorMessage,
  isDeleting,
  onCancel,
  onConfirm,
  visible,
}: DeleteAccountModalProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [confirmText, setConfirmText] = useState("");
  const [hasBlurred, setHasBlurred] = useState(false);

  useEffect(() => {
    if (visible) {
      setConfirmText("");
      setHasBlurred(false);
    }
  }, [visible]);

  const isMatch = confirmText.trim().toUpperCase() === CONFIRM_WORD;
  const showValidationError = hasBlurred && confirmText.length > 0 && !isMatch;

  const handleClose = () => {
    if (isDeleting) {
      return;
    }
    onCancel();
  };

  return (
    <BottomSheet
      footer={
        <>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.84}
            disabled={isDeleting}
            onPress={handleClose}
            style={[styles.cancelButton, isDeleting && styles.buttonDisabled]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: !isMatch || isDeleting }}
            activeOpacity={0.84}
            disabled={!isMatch || isDeleting}
            onPress={onConfirm}
            style={[styles.deleteButton, (!isMatch || isDeleting) && styles.buttonDisabled]}
          >
            {isDeleting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            )}
          </TouchableOpacity>
        </>
      }
      onClose={handleClose}
      title="Delete Account"
      visible={visible}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="warning" size={36} color={Colors.error} />
      </View>

      <Text style={styles.warningText}>
        Deleting your account will permanently remove your profile, salon data, appointments,
        clients, staff, sales history, and all associated information. This action cannot be
        undone.
      </Text>

      <Text style={styles.inputLabel}>Confirm deletion</Text>
      <TextInput
        accessibilityHint="This action is permanent and cannot be undone"
        accessibilityLabel="Type DELETE to confirm account deletion"
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!isDeleting}
        onBlur={() => setHasBlurred(true)}
        onChangeText={setConfirmText}
        placeholder="Type DELETE to confirm"
        placeholderTextColor={Colors.placeholder}
        style={[styles.input, showValidationError && styles.inputError]}
        value={confirmText}
      />

      {showValidationError ? (
        <Text accessibilityLiveRegion="polite" style={styles.validationText}>
          Please type DELETE to continue.
        </Text>
      ) : null}

      {errorMessage ? (
        <Text accessibilityLiveRegion="assertive" style={styles.apiErrorText}>
          {errorMessage}
        </Text>
      ) : null}
    </BottomSheet>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.full,
    height: 72,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 72,
  },
  warningText: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  inputLabel: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: Colors.error,
  },
  validationText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  apiErrorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  cancelButtonText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
