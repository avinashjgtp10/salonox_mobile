import { useRegionalPreferences } from "@/localization/preferences";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { activePaymentMethods } from "@/services/paymentMethods.service";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatCurrency } from "@/utils/currency";

function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

type SettlementModalProps = {
  description?: string;
  onClose: () => void;
  onSettle: (amount: number, paymentMethod?: string) => void;
  staffName: string;
  settlementLabel?: string;
  totalLabel?: string;
  totalUnpaidCommission: number;
  visible: boolean;
  isLoading?: boolean;
};

type PaymentMethod = string;
type UpiProvider = "PhonePe" | "Google Pay";

const UPI_PROVIDERS: UpiProvider[] = ["PhonePe", "Google Pay"];

export function SettlementModal({
  description,
  isLoading = false,
  onClose,
  onSettle,
  settlementLabel = "Commission",
  staffName,
  totalLabel,
  totalUnpaidCommission,
  visible,
}: SettlementModalProps) {
  "use no memo";
  useRegionalPreferences();
  const Colors = useThemeColors();
  const methods = usePaymentMethods(visible);
  const paymentOptions = methods.options.map(method => method.label);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [amountText, setAmountText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");
  const [paymentMenuOpen, setPaymentMenuOpen] = useState(false);
  const verifyLock = useRef(false);
  const currentSession = useRef({ visible, scope: methods.scope });
  currentSession.current = { visible, scope: methods.scope };
  const [verifying, setVerifying] = useState(false);
  const [upiProvider, setUpiProvider] = useState<UpiProvider>("PhonePe");
  const [upiMenuOpen, setUpiMenuOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setAmountText("");
      setError(null);
      setPaymentMethod("");
      setPaymentMenuOpen(false);
      setUpiProvider("PhonePe");
      setUpiMenuOpen(false);
    }
  }, [visible]);
  useEffect(() => {
    if (methods.ready && !paymentOptions.includes(paymentMethod)) setPaymentMethod("");
  }, [methods.ready, paymentOptions, paymentMethod]);

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

  const handleConfirm = async () => {
    if (!isAmountValid || isLoading || verifyLock.current || !paymentMethod || methods.error) {
      return;
    }
    verifyLock.current = true; setVerifying(true);
    const scope = methods.scope;
    try {
      const current = await methods.refresh();
      if (!currentSession.current.visible || currentSession.current.scope !== scope) return;
      if (!activePaymentMethods(current, methods.offersUpi).some(method => method.label === paymentMethod)) {
        setError("Payment methods changed. Please select an active method."); return;
      }
      onSettle(settlementAmount, paymentMethod);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to verify payment method."); }
    finally { verifyLock.current = false; setVerifying(false); }
  };

  const handleCancel = () => {
    if (verifyLock.current || isLoading) return;
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
              <Text style={styles.title}>Settle {settlementLabel}</Text>
              <Text style={styles.subtitle}>{staffName}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.84} onPress={handleCancel} style={styles.closeButton}>
              <Ionicons name="close" size={18} color={Colors.primaryText} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{totalLabel ?? `Total Unpaid ${settlementLabel}`}</Text>
              <Text style={styles.infoValue}>{formatCurrency(unpaidAmount)}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text translate style={styles.inputLabel}>Settlement Amount *</Text>
              <TextInput
                autoFocus
                editable={!isLoading}
                keyboardType="decimal-pad"
                onChangeText={handleAmountChange}
                placeholder="Enter amount"
                style={[styles.input, error ? styles.inputError : null]}
                value={amountText}
              />
              {error && <Text translate style={styles.errorText}>{error}</Text>}
              {!!methods.error && <Text style={styles.errorText}>{methods.error}</Text>}
            </View>
            {description ? <Text translate style={styles.hintText}>{description}</Text> : null}

            <View style={styles.inputGroup}>
              <Text translate style={styles.inputLabel}>Payment Method *</Text>
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
                    color={Colors.primaryText}
                  />
                  <Text style={styles.selectText}>{paymentMethod || "Select payment method"}</Text>
                </View>
                <Ionicons name={paymentMenuOpen ? "chevron-up" : "chevron-down"} size={18} color={Colors.text2} />
              </TouchableOpacity>
              {paymentMenuOpen ? (
                <View style={styles.selectMenu}>
                  {paymentOptions.map((method) => (
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
                      {paymentMethod === method ? <Ionicons name="checkmark" size={18} color={Colors.primaryText} /> : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            {paymentMethod === "UPI" ? (
              <View style={styles.inputGroup}>
                <Text translate style={styles.inputLabel}>UPI App *</Text>
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
                        {upiProvider === provider ? <Ionicons name="checkmark" size={18} color={Colors.primaryText} /> : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <Text translate style={styles.infoLabel}>Remaining Balance</Text>
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
                <Text translate style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.84}
                disabled={!isAmountValid || isLoading || verifying || !paymentMethod || !!methods.error}
                onPress={handleConfirm}
                style={[styles.confirmButton, (!isAmountValid || isLoading || verifying || !paymentMethod || !!methods.error) && styles.buttonDisabled]}
              >
                {isLoading || verifying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text translate style={styles.confirmButtonText}>Settle</Text>
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
    color: Colors.primaryText,
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
    color: Colors.primaryText,
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
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
});
