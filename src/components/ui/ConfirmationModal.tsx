import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  DashboardTypography as Typography,
  getDashboardColors,
  type ThemeColors,
} from "@/constants/theme";

type ConfirmationModalProps = {
  cancelLabel: string;
  cancelable?: boolean;
  confirmLabel: string;
  confirmVariant?: "destructive";
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
};

export function ConfirmationModal({
  cancelLabel,
  cancelable = true,
  confirmLabel,
  confirmVariant = "destructive",
  description,
  onCancel,
  onConfirm,
  title,
  visible,
}: ConfirmationModalProps) {
  const colors = useMemo(() => getDashboardColors("dark"), []);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsConfirming(false);
    }
  }, [visible]);

  const handleConfirm = () => {
    if (isConfirming) {
      return;
    }

    setIsConfirming(true);
    onConfirm();
  };

  const handleCancel = () => {
    if (isConfirming) {
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
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.86}
                disabled={isConfirming}
                onPress={handleCancel}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>{cancelLabel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.86}
                disabled={isConfirming}
                onPress={handleConfirm}
                style={[
                  styles.secondaryButton,
                  confirmVariant === "destructive" ? styles.destructiveButton : null,
                ]}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    confirmVariant === "destructive" ? styles.destructiveButtonText : null,
                  ]}
                >
                  {confirmLabel}
                </Text>
              </TouchableOpacity>
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
    borderCurve: "continuous",
    borderRadius: Radius.lg,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 20,
  },
  destructiveButton: {
    borderColor: "rgba(248, 113, 113, 0.48)",
  },
  destructiveButtonText: {
    color: Colors.error,
  },
});
