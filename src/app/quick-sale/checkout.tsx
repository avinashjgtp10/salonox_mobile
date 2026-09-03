import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReceiptModal } from "@/components/receipt/ReceiptModal";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { fetchSaleByIdThunk } from "@/middleware/sales/sales.thunk";
import { printerService } from "@/services/printer.service";
import { salonService } from "@/services/salon.service";
import { useAppDispatch } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { SalonListItem } from "@/types/salon";
import type { SaleDetail } from "@/types/sales";
import { normalizeSaleId } from "@/utils/apiNormalize";
import { formatAppDate, formatAppTime } from "@/utils/dateTime";
import { formatInvoiceNumber } from "@/utils/receipt";
import type { ReceiptData } from "@/utils/receiptGenerator";

type ReceiptLoadStatus = "initial" | "loading" | "loaded" | "failed" | "retrying";

type ReceiptLoadState = {
  error: string | null;
  sale: SaleDetail | null;
  status: ReceiptLoadStatus;
};

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
    draftId?: string;
    mode?: string;
    openReceipt?: string;
    saleId?: string;
  }>();
  const normalizedSaleId = useMemo(
    () => normalizeSaleId({ saleId: params.saleId }),
    [params.saleId],
  );
  const dispatch = useAppDispatch();
  const hasTerminalNavigationStartedRef = useRef(false);
  const receiptRequestIdRef = useRef(0);
  const receiptRequestInFlightRef = useRef(false);
  const [receiptLoadState, setReceiptLoadState] = useState<ReceiptLoadState>({
    // ... existing state ...
    error: null,
    sale: null,
    status: "initial",
  });
  const [salon, setSalon] = useState<SalonListItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    salonService
      .getSalonMe()
      .then((result) => {
        if (!cancelled) {
          setSalon(result);
        }
      })
      .catch(() => {
        // Receipt still renders without salon branding — printReceipt/shareReceipt
        // just fall back to empty salon fields below.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isPreview = params.mode === "preview";

  const loadReceipt = useCallback(
    async (retry = false) => {
      const saleId = normalizedSaleId;
      if (!saleId) {
        setReceiptLoadState({
          error: "No sale reference was provided, so receipt details cannot be requested.",
          sale: null,
          status: "failed",
        });
        return;
      }

      if (receiptRequestInFlightRef.current) {
        return;
      }

      const requestId = ++receiptRequestIdRef.current;
      receiptRequestInFlightRef.current = true;
      setReceiptLoadState({
        error: null,
        sale: null,
        status: retry ? "retrying" : "loading",
      });

      const result = await dispatch(fetchSaleByIdThunk(saleId));
      if (requestId !== receiptRequestIdRef.current) {
        return;
      }

      if (fetchSaleByIdThunk.fulfilled.match(result) && result.payload.id === saleId) {
        setReceiptLoadState({
          error: null,
          sale: result.payload,
          status: "loaded",
        });
      } else {
        const payloadMessage =
          result.payload && typeof result.payload === "object" && "message" in result.payload
            ? result.payload.message
            : null;
        setReceiptLoadState({
          error:
            typeof payloadMessage === "string" && payloadMessage.trim()
              ? payloadMessage
              : fetchSaleByIdThunk.fulfilled.match(result)
                ? "The server returned receipt details for a different sale."
                : result.error.message ?? "Unable to load receipt details.",
          sale: null,
          status: "failed",
        });
      }

      if (requestId === receiptRequestIdRef.current) {
        receiptRequestInFlightRef.current = false;
      }
    },
    [dispatch, normalizedSaleId],
  );

  useEffect(() => {
    void loadReceipt();

    return () => {
      receiptRequestIdRef.current += 1;
      receiptRequestInFlightRef.current = false;
    };
  }, [loadReceipt]);

  const authoritativeSale = receiptLoadState.sale;
  const receipt = formatInvoiceNumber(authoritativeSale?.receiptNumber) ?? "—";
  const total = authoritativeSale?.total ?? 0;
  const paymentMethod = authoritativeSale?.paymentMethod ?? "-";
  const lineItems = authoritativeSale?.lineItems ?? [];
  const clientName = authoritativeSale?.clientName ?? "-";
  const createdDateLabel = authoritativeSale?.createdDateLabel ?? "-";
  const itemCount = lineItems.reduce((count, item) => count + item.quantity, 0);
  const outstandingAmount = authoritativeSale?.outstandingAmount ?? 0;

  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState(false);
  const hasAutoOpenedReceiptRef = useRef(false);

  const receiptData = useMemo<ReceiptData | null>(() => {
    if (!authoritativeSale) return null;

    const [datePart, timePart] = authoritativeSale.createdDateLabel.includes(" • ")
      ? authoritativeSale.createdDateLabel.split(" • ")
      : [formatAppDate(authoritativeSale.createdDateLabel), formatAppTime(authoritativeSale.createdDateLabel)];

    const items = authoritativeSale.lineItems.map((item) => ({
      name: item.name,
      qty: item.quantity,
      price: item.unitPrice,
      total: item.totalPrice,
      discount: item.discountAmount,
    }));

    const itemDiscountTotal = items.reduce((sum, item) => sum + (item.discount ?? 0), 0);

    // Split payments store their per-method breakdown as backend-computed
    // { [method]: amount } JSON — parsed here, never recalculated locally.
    let paymentBreakdown: { method: string; amount: number }[] | undefined;
    if (authoritativeSale.paymentMethod === "split" && authoritativeSale.paymentReference) {
      try {
        const parsed = JSON.parse(authoritativeSale.paymentReference) as Record<string, number>;
        paymentBreakdown = Object.entries(parsed)
          .filter(([, amount]) => Number(amount) > 0)
          .map(([method, amount]) => ({ method: formatPaymentMethod(method), amount: Number(amount) }));
      } catch {
        paymentBreakdown = undefined;
      }
    }

    return {
      salon: {
        name: salon?.businessName || salon?.name || "Salon",
        address: salon?.address || undefined,
        city: salon?.city || undefined,
        state: salon?.state || undefined,
        phone: salon?.phone || undefined,
        email: salon?.email || undefined,
        website: salon?.websiteUrl || undefined,
        gstin: salon?.gstin || undefined,
        logoUrl: salon?.logoUrl || undefined,
      },
      invoice: {
        invoiceNumber: formatInvoiceNumber(authoritativeSale.receiptNumber) ?? "N/A",
        date: datePart,
        time: timePart,
        paymentMethod: formatPaymentMethod(authoritativeSale.paymentMethod),
      },
      client: {
        name: authoritativeSale.clientName ?? "Walk-in Client",
        phone: authoritativeSale.clientPhone,
        email: undefined, // Not available in SaleDetail directly
      },
      staffName: authoritativeSale.lineItems.find((item) => item.staffName)?.staffName,
      items,
      paymentBreakdown,
      pricing: {
        subtotal: authoritativeSale.subtotal,
        itemDiscountTotal: itemDiscountTotal > 0 ? itemDiscountTotal : undefined,
        manualDiscount:
          authoritativeSale.manualDiscountAmount > 0 ? authoritativeSale.manualDiscountAmount : undefined,
        couponDiscount:
          authoritativeSale.couponDiscountAmount > 0 ? authoritativeSale.couponDiscountAmount : undefined,
        gstAmount: authoritativeSale.taxAmount,
        taxBreakdown: undefined, // Backend stores one blended tax_amount per sale, no CGST/SGST split
        exCharges: authoritativeSale.exCharges,
        tipAmount: authoritativeSale.tipAmount,
        grandTotal: authoritativeSale.total,
        amountPaid: authoritativeSale.amountPaid,
        dueAmount: authoritativeSale.outstandingAmount,
      },
      paperSize: "80mm",
      footerMessage: "Thank you for your business! Visit us again soon.",
      upiQrUrl: undefined, // No UPI QR source stored on the salon profile yet
    };
  }, [authoritativeSale, salon]);

  useEffect(() => {
    if (params.openReceipt === "1" && receiptData && !hasAutoOpenedReceiptRef.current) {
      hasAutoOpenedReceiptRef.current = true;
      setIsReceiptModalVisible(true);
    }
  }, [params.openReceipt, receiptData]);

  const [isQuickActionLoading, setIsQuickActionLoading] = useState(false);

  const handleViewReceipt = useCallback(() => {
    setIsReceiptModalVisible(true);
  }, []);

  const handlePrintReceipt = useCallback(async () => {
    if (!receiptData || isQuickActionLoading) return;

    setIsQuickActionLoading(true);
    try {
      await printerService.printReceipt(receiptData);
    } catch {
      Alert.alert("Print failed", "Could not open the print dialog. Please try again.");
    } finally {
      setIsQuickActionLoading(false);
    }
  }, [isQuickActionLoading, receiptData]);

  const handleShareReceipt = useCallback(async () => {
    if (!receiptData || isQuickActionLoading) return;

    setIsQuickActionLoading(true);
    try {
      await printerService.shareReceipt(receiptData);
    } catch {
      Alert.alert("Share failed", "Could not generate the receipt PDF. Please try again.");
    } finally {
      setIsQuickActionLoading(false);
    }
  }, [isQuickActionLoading, receiptData]);

  const replaceOnce = useCallback((href: Href) => {
    if (hasTerminalNavigationStartedRef.current) {
      return;
    }

    hasTerminalNavigationStartedRef.current = true;
    router.replace(href);
  }, []);

  const handleStartNewSale = useCallback(() => {
    replaceOnce({
      pathname: "/quick-sale",
      params: { resetSale: String(Date.now()) },
    });
  }, [replaceOnce]);

  const handleBackToDraft = useCallback(() => {
    replaceOnce({
      params: { draftId: params.draftId },
      pathname: "/quick-sale",
    });
  }, [params.draftId, replaceOnce]);

  const handleExitToCalendar = useCallback(() => {
    replaceOnce("/calendar" as Href);
  }, [replaceOnce]);

  const handleExitToDashboard = useCallback(() => {
    replaceOnce("/dashboard" as Href);
  }, [replaceOnce]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        if (isPreview) {
          handleBackToDraft();
        } else {
          handleExitToCalendar();
        }

        return true;
      });

      return () => subscription.remove();
    }, [handleBackToDraft, handleExitToCalendar, isPreview]),
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <AppStatusBar />

      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.86}
            accessibilityLabel={isPreview ? "Back to dashboard" : "Back to calendar"}
            onPress={isPreview ? handleExitToDashboard : handleExitToCalendar}
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
          {receiptLoadState.status === "initial" ||
            receiptLoadState.status === "loading" ||
            receiptLoadState.status === "retrying" ? (
            <View style={styles.receiptStateCard}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.receiptStateTitle}>
                {receiptLoadState.status === "retrying"
                  ? "Retrying receipt details"
                  : "Loading receipt details"}
              </Text>
              <Text style={styles.receiptStateMessage}>
                {isPreview
                  ? "The draft is saved. Waiting for the authoritative receipt preview from the server."
                  : "The sale is complete. Waiting for the authoritative receipt from the server."}
              </Text>
            </View>
          ) : receiptLoadState.status === "failed" ? (
            <View style={[styles.receiptStateCard, styles.receiptErrorCard]}>
              <View style={[styles.iconWrap, styles.errorIconWrap]}>
                <Ionicons name="alert-circle-outline" size={34} color={Colors.error} />
              </View>
              <Text style={styles.receiptStateTitle}>
                {isPreview ? "Receipt preview unavailable" : "Receipt details unavailable"}
              </Text>
              <Text style={styles.receiptStateMessage}>
                {isPreview
                  ? "The draft was saved successfully, but receipt preview details could not be loaded."
                  : "The sale was completed successfully, but receipt details could not be loaded."}
              </Text>
              {receiptLoadState.error ? (
                <Text style={styles.receiptErrorDetail}>{receiptLoadState.error}</Text>
              ) : null}
              {normalizedSaleId ? (
                <TouchableOpacity
                  accessibilityLabel="Retry loading receipt details"
                  activeOpacity={0.86}
                  onPress={() => void loadReceipt(true)}
                  style={styles.retryButton}
                >
                  <Ionicons name="refresh" size={17} color={Colors.onPrimary} />
                  <Text style={styles.retryButtonText}>Retry Receipt</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : authoritativeSale ? (
            <>
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
                <ReceiptActionButton icon="receipt-outline" label="View Receipt" onPress={handleViewReceipt} />
                <ReceiptActionButton
                  icon="print-outline"
                  label="Print Receipt"
                  onPress={handlePrintReceipt}
                  loading={isQuickActionLoading}
                />
                <ReceiptActionButton
                  icon="share-social-outline"
                  label="Share Receipt"
                  onPress={handleShareReceipt}
                  loading={isQuickActionLoading}
                />
                <ReceiptActionButton icon="mail-outline" label="Email Receipt" disabled />
              </View>

              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => router.push(`/sales/${authoritativeSale.id}` as Href)}
                style={styles.optionalButton}
              >
                <Ionicons name="document-text-outline" size={17} color={Colors.primaryDark} />
                <Text style={styles.optionalButtonText}>View Invoice</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={isPreview ? handleBackToDraft : handleStartNewSale}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>{isPreview ? "Back to Sale" : "Start New Sale"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={isPreview ? handleExitToDashboard : handleExitToCalendar}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              {isPreview ? "Back to Dashboard" : "Back to Calendar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {receiptData && (
        <ReceiptModal
          visible={isReceiptModalVisible}
          onClose={() => setIsReceiptModalVisible(false)}
          receiptData={receiptData}
        />
      )}
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

function ReceiptActionButton({
  icon,
  label,
  onPress,
  disabled = false,
  loading = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.receiptAction, (disabled || loading) && styles.buttonDisabled]}
    >
      <View style={styles.receiptActionIcon}>
        {loading ? (
          <ActivityIndicator color={Colors.primaryDark} size="small" />
        ) : (
          <Ionicons name={icon} size={17} color={disabled ? Colors.text2 : Colors.primaryDark} />
        )}
      </View>
      <Text style={[styles.receiptActionText, disabled && { color: Colors.text2 }]}>{label}</Text>
      {disabled && <Text style={styles.receiptActionMeta}>Coming Soon</Text>}
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
  receiptStateCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 280,
    padding: Spacing.xl,
  },
  receiptErrorCard: {
    borderColor: Colors.error,
  },
  receiptStateTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "900",
    marginTop: Spacing.md,
    textAlign: "center",
  },
  receiptStateMessage: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  receiptErrorDetail: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  errorIconWrap: {
    backgroundColor: Colors.errorBg,
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 46,
    paddingHorizontal: Spacing.lg,
  },
  retryButtonText: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: "900",
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
