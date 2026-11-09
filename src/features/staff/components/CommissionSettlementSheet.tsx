import { useRegionalPreferences } from "@/localization/preferences";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { pearl } from "@/components/auth/pearl/tokens";
import { formatCurrency, currencyLabel } from "@/utils/currency";
import {
  CommissionButton,
  CommissionChip,
  commissionUi as ui,
} from "./CommissionPearl";

const cents = (amount: number) => Math.round(amount * 100) / 100;

/** Uses the existing amount-only settlement callback and all-dates unpaid balance. */
export function CommissionSettlementSheet({
  visible,
  onClose,
  onSettle,
  staffName,
  totalUnpaidCommission,
  isLoading = false,
}: {
  visible: boolean;
  onClose: () => void;
  onSettle: (amount: number) => void;
  staffName: string;
  totalUnpaidCommission: number;
  isLoading?: boolean;
}) {
  "use no memo";
  useRegionalPreferences();
  const [amountText, setAmountText] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  useEffect(() => {
    if (!visible) {
      setAmountText("");
      setPaymentMethod("Cash");
    }
  }, [visible]);
  const unpaid = cents(totalUnpaidCommission ?? 0);
  const amount = cents(Number(amountText) || 0);
  const valid =
    amountText.trim().length > 0 &&
    Number.isFinite(amount) &&
    amount > 0 &&
    amount <= unpaid;
  const remaining = Math.max(0, cents(unpaid - amount));
  const close = () => {
    if (!isLoading) onClose();
  };
  return (
    <BottomSheet
      pearlStyle
      avoidKeyboard
      centered={false}
      visible={visible}
      onClose={close}
      title={`Pay ${staffName}`}
      footer={
        <View style={ui.row}>
          <CommissionButton
            secondary
            label="Cancel"
            disabled={isLoading}
            onPress={close}
          />
          <View style={{ flex: 1 }}>
            <CommissionButton
              label={isLoading ? "Settling…" : "Settle"}
              disabled={!valid || isLoading}
              onPress={() => {
                if (valid && !isLoading) onSettle(amount);
              }}
            />
          </View>
        </View>
      }
    >
      <View style={{ gap: 14 }}>
        <View style={[ui.card, ui.between]}>
          <Text translate style={ui.muted}>Unpaid commission</Text>
          <Text style={ui.value}>{formatCurrency(unpaid)}</Text>
        </View>
        <CommissionButton
          secondary
          label={`Pay full ${formatCurrency(unpaid)}`}
          disabled={isLoading}
          onPress={() => setAmountText(String(unpaid))}
        />
        <View style={ui.fieldGroup}>
          <Text translate style={ui.label}>Amount to pay *</Text>
          <View style={[ui.input, ui.row]}>
            <Text translate style={ui.muted}>{currencyLabel("₹")}</Text>
            <TextInput
              editable={!isLoading}
              accessibilityLabel="Amount to pay"
              keyboardType="decimal-pad"
              returnKeyType="done"
              placeholder="0"
              placeholderTextColor={pearl.placeholder}
              value={amountText}
              onChangeText={(text) => {
                const parts = text.replace(/[^0-9.]/g, "").split(".");
                setAmountText(
                  parts.length > 1
                    ? `${parts[0]}.${parts.slice(1).join("")}`
                    : parts[0],
                );
              }}
              style={{
                flex: 1,
                minHeight: 48,
                color: pearl.ink,
                backgroundColor: "transparent",
              }}
            />
          </View>
          <Text style={ui.muted}>
            Between {formatCurrency(1)} and {formatCurrency(unpaid)}. Older
            commissions are cleared first.
          </Text>
          {amountText && !valid ? (
            <Text style={ui.error}>
              Enter an amount above 0 and no more than {formatCurrency(unpaid)}.
            </Text>
          ) : null}
        </View>
        <View style={ui.fieldGroup}>
          <Text translate style={ui.label}>Paid via</Text>
          <View style={ui.chips}>
            {["UPI", "Cash", "Card"].map((method) => (
              <CommissionChip
                key={method}
                label={method}
                selected={paymentMethod === method}
                onPress={() => {
                  if (!isLoading) setPaymentMethod(method);
                }}
              />
            ))}
          </View>
        </View>
        <View style={[ui.card, ui.between]}>
          <Text translate style={ui.muted}>Remaining after</Text>
          <Text style={ui.value}>{formatCurrency(remaining)}</Text>
        </View>
      </View>
    </BottomSheet>
  );
}
