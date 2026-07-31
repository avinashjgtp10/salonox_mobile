import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { fetchSaleByIdThunk } from "@/middleware/sales/sales.thunk";
import { selectSaleDetail } from "@/store/sales/sales.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatInvoiceNumber } from "@/utils/receipt";

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatPaymentMethod(method: string) {
  return method
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function QuickSaleCheckoutScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const params = useLocalSearchParams<{
    amountPaid?: string;
    mode?: string;
    paymentMethod?: string;
    receipt?: string;
    saleId?: string;
    total?: string;
  }>();
  const dispatch = useAppDispatch();
  const saleDetail = useAppSelector(selectSaleDetail);

  // Params render instantly; the authoritative record (once loaded) refreshes
  // the numbers in the background without blocking this confirmation screen.
  useEffect(() => {
    if (params.saleId) {
      void dispatch(fetchSaleByIdThunk(params.saleId));
    }
  }, [dispatch, params.saleId]);

  const authoritativeSale =
    saleDetail && params.saleId && saleDetail.id === params.saleId ? saleDetail : null;

  const isPreview = params.mode === "preview";
  const receipt = formatInvoiceNumber(authoritativeSale?.receiptNumber ?? params.receipt) ?? "—";
  const amountPaid = authoritativeSale?.amountPaid ?? Number(params.amountPaid ?? 0);
  const total = authoritativeSale?.total ?? Number(params.total ?? amountPaid);
  const paymentMethod = authoritativeSale?.paymentMethod ?? params.paymentMethod ?? "Cash";
  const lineItems = authoritativeSale?.lineItems ?? [];
  const clientName = authoritativeSale?.clientName ?? "Walk-In";
  const createdDateLabel = authoritativeSale?.createdDateLabel ?? "Just now";
  const itemCount =
    lineItems.length > 0 ? lineItems.reduce((count, item) => count + item.quantity, 0) : 0;
  const outstandingAmount = authoritativeSale?.outstandingAmount ?? Math.max(0, total - amountPaid);

  const handleStartNewSale = () => {
    router.replace({
      pathname: "/quick-sale",
      params: { resetSale: String(Date.now()) },
    });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />

      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.86}
            accessibilityLabel="Back to dashboard"
            onPress={() => router.replace("/dashboard" as Href)}
            style={styles.headerIconButton}
          >
            <Ionicons name="close" size={20} color={Colors.heading} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isPreview ? "Receipt Preview" : "Sale Completed"}</Text>
          <View style={styles.headerIconButtonPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={styles.successBlock}>
            <View style={styles.iconWrap}>
              <Ionicons
                name={isPreview ? "receipt-outline" : "checkmark"}
                size={34}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.title}>{isPreview ? "Receipt Ready" : "Payment Successful"}</Text>
            <Text style={styles.subtitle}>
              {isPreview
                ? "Your draft receipt is ready for review."
                : "The sale has been completed successfully."}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <InfoRow label="Invoice" value={receipt} />
            <InfoRow label="Client" value={clientName} />
            <InfoRow label="Date & Time" value={createdDateLabel} />
            <InfoRow label="Payment" value={formatPaymentMethod(paymentMethod)} />
            <InfoRow label="Items" value={itemCount > 0 ? String(itemCount) : "—"} />
            <InfoRow label="Total" value={formatCurrency(total)} />
            {outstandingAmount > 0 ? (
              <InfoRow label="Outstanding" value={formatCurrency(outstandingAmount)} />
            ) : null}
          </View>

          {lineItems.length > 0 ? (
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Services Summary</Text>
              {lineItems.slice(0, 4).map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemCopy}>
                    <Text numberOfLines={1} style={styles.itemName}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemMeta}>Qty {item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>{formatCurrency(item.totalPrice)}</Text>
                </View>
              ))}
              {lineItems.length > 4 ? (
                <Text style={styles.moreItemsText}>+{lineItems.length - 4} more item(s)</Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Receipt Actions</Text>
            <ReceiptAction icon="print-outline" label="Print Receipt" />
            <ReceiptAction icon="share-social-outline" label="Share Receipt" />
            <ReceiptAction icon="logo-whatsapp" label="WhatsApp Receipt" />
            <ReceiptAction icon="mail-outline" label="Email Receipt" />
          </View>

          {params.saleId ? (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => router.push(`/sales/${params.saleId}` as Href)}
              style={styles.optionalButton}
            >
              <Ionicons name="document-text-outline" size={17} color={Colors.primaryDark} />
              <Text style={styles.optionalButtonText}>View Invoice</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={isPreview ? () => router.back() : handleStartNewSale}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>{isPreview ? "Back to Sale" : "Start New Sale"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => router.replace("/dashboard" as Href)}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function ReceiptAction({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <TouchableOpacity activeOpacity={1} disabled style={[styles.receiptAction, styles.buttonDisabled]}>
      <View style={styles.receiptActionIcon}>
        <Ionicons name={icon} size={17} color={Colors.primaryDark} />
      </View>
      <Text style={styles.receiptActionText}>{label}</Text>
      <Text style={styles.receiptActionMeta}>Coming Soon</Text>
    </TouchableOpacity>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  headerIconButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerIconButtonPlaceholder: {
    height: 40,
    width: 40,
  },
  headerTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "900",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
  },
  successBlock: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    padding: Spacing.xl,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: Colors.successBg,
    borderRadius: Radius.full,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  title: {
    color: Colors.heading,
    fontSize: 20,
    fontWeight: "900",
    marginTop: Spacing.md,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 34,
    paddingVertical: 6,
  },
  summaryLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "800",
  },
  summaryValue: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "900",
    marginLeft: Spacing.md,
    textAlign: "right",
  },
  itemRow: {
    alignItems: "center",
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
  },
  itemMeta: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  itemPrice: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
  },
  moreItemsText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "800",
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  receiptAction: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  receiptActionIcon: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  receiptActionText: {
    color: Colors.heading,
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
  },
  receiptActionMeta: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "800",
  },
  optionalButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: Spacing.md,
    minHeight: 46,
  },
  optionalButtonText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
  },
  footer: {
    backgroundColor: Colors.bg,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.md,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    minHeight: 52,
    width: "100%",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: Spacing.sm,
    minHeight: 48,
    width: "100%",
  },
  secondaryButtonText: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
