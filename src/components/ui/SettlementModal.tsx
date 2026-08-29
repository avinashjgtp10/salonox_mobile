import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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

type PaymentMethod = "Cash" | "Card" | "UPI";
type UpiProvider = "PhonePe" | "Google Pay";

const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Card", "UPI"];
const UPI_PROVIDERS: UpiProvider[] = ["PhonePe", "Google Pay"];

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentMenuOpen, setPaymentMenuOpen] = useState(false);
  const [upiProvider, setUpiProvider] = useState<UpiProvider>("PhonePe");
  const [upiMenuOpen, setUpiMenuOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setAmountText("");
      setError(null);
      setPaymentMethod("Cash");
      setPaymentMenuOpen(false);
      setUpiProvider("PhonePe");
      setUpiMenuOpen(false);
    }
  }, [visible]);

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
    setPaymentMenuOpen(false);
    setUpiMenuOpen(false);
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      onRequestClose={handleCancel}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable onPress={handleCancel} style={styles.backdrop} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoiding}
      >
        <Pressable onPress={() => {}} style={[styles.dialog, { paddingBottom: Spacing.lg }]}>
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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payment Method *</Text>
              <TouchableOpacity
                activeOpacity={0.84}
                disabled={isLoading}
                onPress={() => setPaymentMenuOpen((open) => !open)}
                style={styles.selectButton}
              >
                <View style={styles.selectValue}>
                  <Ionicons
                    name={paymentMethod === "Cash" ? "cash-outline" : paymentMethod === "Card" ? "card-outline" : "phone-portrait-outline"}
                    size={18}
                    color={Colors.primaryDark}
                  />
                  <Text style={styles.selectText}>{paymentMethod}</Text>
                </View>
                <Ionicons name={paymentMenuOpen ? "chevron-up" : "chevron-down"} size={18} color={Colors.text2} />
              </TouchableOpacity>
              {paymentMenuOpen ? (
                <View style={styles.selectMenu}>
                  {PAYMENT_METHODS.map((method) => (
                    <TouchableOpacity
                      key={method}
                      activeOpacity={0.82}
                      onPress={() => {
                        setPaymentMethod(method);
                        setPaymentMenuOpen(false);
                        if (method !== "UPI") setUpiMenuOpen(false);
                      }}
                      style={styles.selectOption}
                    >
                      <Text style={[styles.selectOptionText, paymentMethod === method && styles.selectOptionTextActive]}>{method}</Text>
                      {paymentMethod === method ? <Ionicons name="checkmark" size={18} color={Colors.primary} /> : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            {paymentMethod === "UPI" ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>UPI App *</Text>
                <TouchableOpacity
                  activeOpacity={0.84}
                  disabled={isLoading}
                  onPress={() => setUpiMenuOpen((open) => !open)}
                  style={styles.selectButton}
                >
                  <Text style={styles.selectText}>{upiProvider}</Text>
                  <Ionicons name={upiMenuOpen ? "chevron-up" : "chevron-down"} size={18} color={Colors.text2} />
                </TouchableOpacity>
                {upiMenuOpen ? (
                  <View style={styles.selectMenu}>
                    {UPI_PROVIDERS.map((provider) => (
                      <TouchableOpacity
                        key={provider}
                        activeOpacity={0.82}
                        onPress={() => {
                          setUpiProvider(provider);
                          setUpiMenuOpen(false);
                        }}
                        style={styles.selectOption}
                      >
                        <Text style={[styles.selectOptionText, upiProvider === provider && styles.selectOptionTextActive]}>{provider}</Text>
                        {upiProvider === provider ? <Ionicons name="checkmark" size={18} color={Colors.primary} /> : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

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
      </View>
    </Modal>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(20, 18, 16, 0.42)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingVertical: Spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardAvoiding: {
    justifyContent: "center",
    maxHeight: "100%",
    width: "100%",
  },
  dialog: {
    backgroundColor: Colors.card,
    borderRadius: AppRadius.card,
    maxHeight: "100%",
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
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
  selectButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  selectValue: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  selectText: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "700",
  },
  selectMenu: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
    overflow: "hidden",
  },
  selectOption: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  selectOptionText: {
    color: Colors.text2,
    fontSize: 14,
    fontWeight: "600",
  },
  selectOptionTextActive: {
    color: Colors.primaryDark,
    fontWeight: "800",
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
