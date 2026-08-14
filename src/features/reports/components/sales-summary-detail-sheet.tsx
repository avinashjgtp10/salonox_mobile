import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { formatReportValue } from "@/features/reports/report-data";
import { getApiErrorMessage } from "@/services/api";
import { reportService, type SalesSummaryDetailResponse } from "@/services/report.service";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatInvoiceNumber } from "@/utils/receipt";

type SalesSummaryDetailSheetProps = {
  onClose: () => void;
  saleId: string | null;
};

const money = (value: unknown) =>
  typeof value === "number"
    ? `Rs. ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
    : "Rs. 0";

const labelize = (value: string | null | undefined) => {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatPaymentMethod = (method: string | null, reference: string | null) => {
  if (!method) return "-";
  if (method.toLowerCase() !== "split" || !reference) return labelize(method);

  try {
    const parsed = JSON.parse(reference) as Record<string, unknown>;
    const entries = Object.entries(parsed)
      .map(([key, value]) => `${labelize(key)} ${money(Number(value) || 0)}`)
      .filter(Boolean);
    return entries.length ? entries.join(", ") : labelize(method);
  } catch {
    return labelize(method);
  }
};

function InfoRow({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.infoRow}>
      <Text allowFontScaling style={styles.infoLabel}>{label}</Text>
      <Text allowFontScaling selectable style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.section}>
      <Text allowFontScaling style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export const SalesSummaryDetailSheet = memo(function SalesSummaryDetailSheet({
  onClose,
  saleId,
}: SalesSummaryDetailSheetProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const requestIdRef = useRef(0);
  const [data, setData] = useState<SalesSummaryDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!saleId || loading) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const detail = await reportService.getSalesSummaryDetail(saleId);
      if (requestId === requestIdRef.current) {
        setData(detail);
      }
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setData(null);
        setError(getApiErrorMessage(loadError) || "Bill details not available.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [loading, saleId]);

  useEffect(() => {
    if (!saleId) {
      setData(null);
      setError(null);
      setLoading(false);
      requestIdRef.current += 1;
      return;
    }

    void load();
    // load intentionally excluded so opening a sheet always makes one request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleId]);

  const sale = data?.sale ?? null;
  const items = data?.items ?? [];
  const payment = data?.payment ?? null;
  const invoice = formatInvoiceNumber(sale?.invoiceNumber) ?? sale?.invoiceNumber ?? "Bill Details";
  const sheetTitle = sale ? invoice : "Bill Details";
  const sheetSubtitle = sale?.clientName ?? (loading ? "Loading bill details..." : "Please try again.");

  return (
    <BottomSheet
      onClose={onClose}
      subtitle={sheetSubtitle}
      title={sheetTitle}
      visible={Boolean(saleId)}
    >
      {loading && !sale ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.stateTitle}>Loading bill details</Text>
          <Text style={styles.stateText}>Fetching the invoice from the current Reports API.</Text>
        </View>
      ) : error || !sale ? (
        <View style={styles.stateCard}>
          <Ionicons name="receipt-outline" size={28} color={Colors.hint} />
          <Text style={styles.stateTitle}>Bill details not available</Text>
          <Text style={styles.stateText}>{error ?? "This bill could not be found."}</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={() => void load()} style={styles.retryButton}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <Section title="Customer">
            <InfoRow label="Name" value={sale.clientName ?? "Walk-in"} />
            <InfoRow label="Phone" value={sale.clientPhone ?? "-"} />
          </Section>

          <Section title="Invoice">
            <InfoRow label="Invoice number" value={invoice} />
            <InfoRow label="Sale date" value={formatReportValue("createdAt", sale.createdAt)} />
            <InfoRow label="Status" value={labelize(sale.status)} />
            <InfoRow label="Staff" value={sale.staffName ?? "-"} />
          </Section>

          <Section title="Items">
            {items.length ? items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemCopy}>
                  <Text allowFontScaling selectable style={styles.itemName}>{item.name}</Text>
                  <Text allowFontScaling style={styles.itemMeta}>
                    {labelize(item.itemType)} - Qty {item.quantity}
                    {item.staffName ? ` - ${item.staffName}` : ""}
                  </Text>
                  {item.discountAmount > 0 ? (
                    <Text allowFontScaling style={styles.itemDiscount}>
                      Discount {money(item.discountAmount)}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.itemAmount}>
                  <Text allowFontScaling style={styles.itemTotal}>{money(item.totalPrice)}</Text>
                  <Text allowFontScaling style={styles.itemUnit}>{money(item.unitPrice)} each</Text>
                </View>
              </View>
            )) : (
              <Text style={styles.emptyText}>No line items.</Text>
            )}
          </Section>

          <Section title="Totals">
            <InfoRow label="Subtotal" value={money(sale.subtotal)} />
            <InfoRow label="Manual discount" value={money(sale.manualDiscountAmount || sale.discountAmount)} />
            {sale.couponDiscountAmount > 0 ? (
              <InfoRow label={sale.couponCode ? `Coupon (${sale.couponCode})` : "Coupon"} value={money(sale.couponDiscountAmount)} />
            ) : null}
            {sale.referralDiscountAmount > 0 ? (
              <InfoRow label="Referral discount" value={money(sale.referralDiscountAmount)} />
            ) : null}
            <InfoRow label="Tax" value={money(sale.taxAmount)} />
            <InfoRow label="Additional charges" value={money(sale.exCharges)} />
            <InfoRow label="Grand total" value={money(sale.totalAmount)} />
          </Section>

          <Section title="Payment">
            <InfoRow label="Payment mode" value={formatPaymentMethod(sale.paymentMethod, sale.paymentReference)} />
            {payment ? (
              <>
                <InfoRow label="Paid" value={money(payment.paidAmount)} />
                <InfoRow label="Due" value={money(payment.dueAmount)} />
                <InfoRow label="E-Wallet" value={money(payment.ewalletUsed)} />
                <InfoRow label="Membership" value={money(payment.membershipWalletUsed)} />
                <InfoRow label="Rewards" value={money(payment.rewardPointsValue)} />
                <InfoRow label="Referral credit" value={money(payment.referralCreditUsed)} />
              </>
            ) : (
              <Text style={styles.emptyText}>No linked payment record.</Text>
            )}
            {sale.tipAmount > 0 ? <InfoRow label="Staff tip" value={money(sale.tipAmount)} /> : null}
          </Section>

          {sale.notes ? (
            <Section title="Notes">
              <Text allowFontScaling selectable style={styles.notes}>{sale.notes}</Text>
            </Section>
          ) : null}
        </View>
      )}
    </BottomSheet>
  );
});

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  content: { gap: Spacing.md, paddingBottom: 72 },
  emptyText: { color: Colors.text2, fontSize: 12, lineHeight: 18 },
  infoLabel: { color: Colors.text2, flex: 1, fontSize: 12, lineHeight: 18 },
  infoRow: {
    alignItems: "flex-start", borderTopColor: Colors.divider, borderTopWidth: 1,
    flexDirection: "row", gap: Spacing.md, paddingVertical: 9,
  },
  infoValue: { color: Colors.heading, flex: 1.2, fontSize: 12, fontWeight: "700", lineHeight: 18, textAlign: "right" },
  itemAmount: { alignItems: "flex-end", gap: 3 },
  itemCopy: { flex: 1, gap: 3 },
  itemDiscount: { color: Colors.warning, fontSize: 11, fontWeight: "700" },
  itemMeta: { color: Colors.text2, fontSize: 11, lineHeight: 16 },
  itemName: { color: Colors.heading, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  itemRow: {
    alignItems: "flex-start", borderTopColor: Colors.divider, borderTopWidth: 1,
    flexDirection: "row", gap: Spacing.md, paddingVertical: 10,
  },
  itemTotal: { color: Colors.heading, fontSize: 13, fontWeight: "900" },
  itemUnit: { color: Colors.text2, fontSize: 10, fontWeight: "600" },
  notes: { color: Colors.text, fontSize: 13, lineHeight: 20 },
  retryButton: {
    alignItems: "center", backgroundColor: Colors.primaryDark, borderRadius: AppRadius.pill,
    flexDirection: "row", gap: Spacing.sm, minHeight: 44, paddingHorizontal: Spacing.xl,
  },
  retryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  section: {
    backgroundColor: Colors.backgroundElement, borderColor: Colors.border,
    borderRadius: AppRadius.card, borderWidth: 1, paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm, paddingTop: Spacing.md,
  },
  sectionTitle: { color: Colors.heading, fontSize: 13, fontWeight: "900", paddingBottom: Spacing.sm },
  stateCard: { alignItems: "center", gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: 40 },
  stateText: { color: Colors.text2, fontSize: 12, lineHeight: 18, textAlign: "center" },
  stateTitle: { color: Colors.heading, fontSize: 15, fontWeight: "900" },
});
