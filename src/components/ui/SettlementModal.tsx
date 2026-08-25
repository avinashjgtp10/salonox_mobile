import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

// Plain float subtraction on currency values can produce artifacts like
// 324.99999999999994 — round through integer paise/cents to keep comparisons
// (settlementAmount <= unpaidAmount) and the displayed remaining balance exact.
function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

type SettlementModalProps = {
  onClose: () => void;
  onSettle: (amount: number) => void;
  staffName: string;
  totalUnpaidCommission: number;
  visible: boolean;
  isLoading?: boolean;
};

export function SettlementModal({
  isLoading = false,
  onClose,
  onSettle,
  staffName,
  totalUnpaidCommission,
  visible,
}: SettlementModalProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [amountText, setAmountText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const unpaidAmount = roundToCents(totalUnpaidCommission ?? 0);
  const settlementAmount = roundToCents(Number(amountText) || 0);
  const remainingBalance = Math.max(0, roundToCents(unpaidAmount - settlementAmount));

  const isAmountValid =
    amountText.trim().length > 0 &&
    Number.isFinite(settlementAmount) &&
    settlementAmount > 0 &&
    settlementAmount <= unpaidAmount;

  const handleAmountChange = (text: string) => {
    const numericText = text.replace(/[^0-9.]/g, "");
    const parts = numericText.split(".");
    const sanitized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : numericText;
    setAmountText(sanitized);
    setError(null);
  };

  const handleConfirm = () => {
    if (!isAmountValid || isLoading) {
      return;
    }
    onSettle(settlementAmount);
  };

  const handleCancel = () => {
    setAmountText("");
    setError(null);
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <SafeAreaView style={styles.overlay}>
      <Pressable onPress={handleCancel} style={styles.backdrop} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoiding}
      >
        <Pressable onPress={() => {}} style={[styles.sheet, { paddingBottom: Spacing.lg }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Settle Commission</Text>
              <Text style={styles.subtitle}>{staffName}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.84} onPress={handleCancel} style={styles.closeButton}>
              <Ionicons name="close" size={18} color={Colors.primaryDark} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Unpaid Commission</Text>
              <Text style={styles.infoValue}>{formatCurrency(unpaidAmount)}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Settlement Amount *</Text>
              <TextInput
                autoFocus
                editable={!isLoading}
                keyboardType="decimal-pad"
                onChangeText={handleAmountChange}
                placeholder="Enter amount"
                style={[styles.input, error ? styles.inputError : null]}
                value={amountText}
              />
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Remaining Balance</Text>
              <Text style={[styles.infoValue, { color: remainingBalance > 0 ? Colors.warning : Colors.success }]}>
                {formatCurrency(remainingBalance)}
              </Text>
            </View>

            <View style={styles.validationHint}>
              <Text style={styles.hintText}>
                Minimum: {formatCurrency(1)} | Maximum: {formatCurrency(unpaidAmount)}
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                activeOpacity={0.84}
                disabled={isLoading}
                onPress={handleCancel}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.84}
                disabled={!isAmountValid || isLoading}
                onPress={handleConfirm}
                style={[styles.confirmButton, (!isAmountValid || isLoading) && styles.buttonDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>Settle</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(20, 18, 16, 0.42)",
    flex: 1,
  },
  backdrop: {
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 16,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    height: 4,
    marginBottom: Spacing.md,
    width: 42,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: Colors.text2,
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: AppRadius.control,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  content: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  infoRow: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
  },
  infoLabel: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "700",
  },
  infoValue: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "800",
  },
  inputGroup: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: "700",
    marginTop: Spacing.xs,
  },
  validationHint: {
    marginBottom: Spacing.lg,
  },
  hintText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButtonText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});