import { Text } from "@/components/ui/AppTypography";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, ActivityIndicator, Pressable, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  DashboardTypography as Typography,
  type ThemeColors,
} from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

export type ConfirmationAction = {
  label: string;
  variant?: "default" | "cancel" | "destructive";
  onPress: () => void | Promise<void>;
};

type ConfirmationModalProps = {
  cancelLabel: string;
  cancelable?: boolean;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  actions?: ConfirmationAction[];
  busy?: boolean;
  error?: string | null;
  description: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  visible: boolean;
};

export function ConfirmationModal({
  cancelLabel,
  cancelable = true,
  confirmLabel,
  confirmVariant = "destructive",
  actions,
  busy = false,
  error,
  description,
  onCancel,
  onConfirm,
  title,
  visible,
}: ConfirmationModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const [isConfirming, setIsConfirming] = useState(false);
  const actionLock = useRef(false);
  const disabled = busy || isConfirming;

  useEffect(() => {
    if (visible) {
      setIsConfirming(false);
      actionLock.current = false;
    }
  }, [visible]);

  const handleAction = async (action: () => void | Promise<void>) => {
    if (busy || actionLock.current) {
      return;
    }

    actionLock.current = true;
    setIsConfirming(true);
    try {
      await action();
    } finally {
      actionLock.current = false;
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    if (disabled || actionLock.current) {
      return;
    }

    onCancel();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={cancelable ? handleCancel : undefined}
      transparent
      visible={visible}
    >
      <View
        accessibilityViewIsModal
        importantForAccessibility="yes"
        style={styles.overlay}
      >
        <Pressable
          accessibilityLabel="Close confirmation dialog"
          accessibilityRole="button"
          onPress={cancelable ? handleCancel : undefined}
          style={styles.backdrop}
        >
          <Pressable
            accessibilityLabel={title}
            accessibilityRole="alert"
            onPress={() => undefined}
            style={[styles.card, { width: Math.min(width - 40, 420) }]}
          >
            <View style={styles.copy}>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              <Text style={styles.description}>{description}</Text>
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            </View>

            <View style={styles.actions}>
              {actions ? actions.map((action, index) => (
                <TouchableOpacity
                  key={`${index}-${action.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled }}
                  disabled={disabled}
                  onPress={() => { void handleAction(action.onPress); }}
                  style={[
                    action.variant === "destructive" ? styles.secondaryButton : styles.primaryButton,
                    action.variant === "destructive" && styles.destructiveButton,
                    disabled && styles.disabledButton,
                  ]}
                >
                  <Text style={action.variant === "destructive" ? [styles.secondaryButtonText, styles.destructiveButtonText] : styles.primaryButtonText}>{action.label}</Text>
                </TouchableOpacity>
              )) : <>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.86}
                disabled={disabled}
                onPress={handleCancel}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>{cancelLabel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.86}
                disabled={disabled}
                onPress={() => { void handleAction(onConfirm); }}
                style={[
                  styles.secondaryButton,
                  confirmVariant === "destructive" ? styles.destructiveButton : null,
                ]}
              >
                {disabled ? <ActivityIndicator color={confirmVariant === "destructive" ? colors.error : colors.primary} /> : <Text
                  style={[
                    styles.secondaryButtonText,
                    confirmVariant === "destructive" ? styles.destructiveButtonText : null,
                  ]}
                >
                  {confirmLabel}
                </Text>}
              </TouchableOpacity>
              </>}
            </View>
          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(3, 7, 18, 0.72)",
    flex: 1,
  },
  backdrop: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderCurve: "continuous",
    borderRadius: 22,
    borderWidth: 1,
    gap: Spacing.xl,
    padding: Spacing.xl,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.34,
    shadowRadius: 34,
    elevation: 24,
  },
  copy: {
    gap: Spacing.md,
  },
  title: {
    color: Colors.heading,
    fontFamily: Typography.fontFamilies.display,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 28,
  },
  description: {
    color: Colors.text2,
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 22,
  },
  error: { color: Colors.error, fontSize: 14, lineHeight: 20 },
  disabledButton: { opacity: 0.5 },
  actions: {
    gap: Spacing.md,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderCurve: "continuous",
    borderRadius: Radius.lg,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  primaryButtonText: {
    color: Colors.onPrimary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 20,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: Colors.border,
    borderCurve: "continuous",
    borderRadius: Radius.lg,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 20,
  },
  destructiveButton: {
    borderColor: Colors.error,
  },
  destructiveButtonText: {
    color: Colors.error,
  },
});
