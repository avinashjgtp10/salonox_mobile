import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/AppTypography";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { StaffAvatar } from "@/features/staff/components/StaffPearl";
import { StaffStateView } from "@/features/staff/components/StaffStateView";
import { pearlTones, type PearlTone } from "@/components/auth/pearl/tokens";
import { pearl } from "@/components/auth/pearl/themedPearl";
import { fetchCommissionHistoryThunk } from "@/middleware/staff/staffCommissions.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectCommissionHistory,
  selectCommissionHistoryError,
  selectCommissionHistoryLoaded,
  selectCommissionHistoryLoading,
} from "@/store/staff/staffCommissions.slice";
import { formatAppDate } from "@/utils/dateTime";
import { formatCurrency } from "@/utils/currency";
import type { SalonCommissionRecord } from "@/types/salonCommissions";
import type { CommissionHistoryEntry } from "@/types/staffCommissions";
import { themedStyles } from "@/components/auth/pearl/themedStyles";

// Same six revenue sources the web app's commission drawer uses (CommissionsPage.tsx CATEGORIES).
const CATEGORY_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; tone: PearlTone }> = {
  cancellation: { label: "Cancellation", icon: "close-circle-outline", tone: "danger" },
  gift_cards: { label: "Gift Cards", icon: "gift-outline", tone: "warning" },
  memberships: { label: "Memberships", icon: "pricetag-outline", tone: "lilac" },
  packages: { label: "Packages", icon: "albums-outline", tone: "lavender" },
  products: { label: "Products", icon: "cube-outline", tone: "sky" },
  services: { label: "Services", icon: "cut-outline", tone: "rose" },
};
const DEFAULT_CATEGORY_META = { label: "Other", icon: "pricetags-outline" as const, tone: "neutral" as const };
const getCategoryMeta = (category: string | null | undefined) =>
  (category && CATEGORY_META[category]) || DEFAULT_CATEGORY_META;

const formatCommissionDate = (entry: CommissionHistoryEntry) => {
  const raw = entry.period || entry.createdAt;
  if (!raw) return "-";
  const formatted = formatAppDate(raw, "");
  return formatted || raw;
};

/**
 * Tapping a staff name on the salon-wide Commissions list opens this: that
 * one staff member's commission totals plus their line-by-line history for
 * the currently selected month, matching the web's commission history
 * drawer (CommissionsPage.tsx, CommissionHistoryDrawer) — a summary strip,
 * then one row per commission with its revenue source, date, revenue to
 * commission amount, and payment method once settled.
 */
export function CommissionStaffHistorySheet({
  month,
  onClose,
  record,
  renderInline = false,
  visible,
}: {
  /** YYYY-MM; the history endpoint is month-only on the backend, same as web. */
  month: string;
  onClose: () => void;
  record: SalonCommissionRecord | null;
  renderInline?: boolean;
  visible: boolean;
}) {
  const dispatch = useAppDispatch();
  const staffId = record?.staffId ?? "";
  const historyArgs = useMemo(() => ({ month, staffId }), [month, staffId]);

  const history = useAppSelector((state) => selectCommissionHistory(state, historyArgs));
  const historyLoaded = useAppSelector((state) => selectCommissionHistoryLoaded(state, historyArgs));
  const historyLoading = useAppSelector((state) => selectCommissionHistoryLoading(state, historyArgs));
  const historyError = useAppSelector((state) => selectCommissionHistoryError(state, historyArgs));

  useEffect(() => {
    if (visible && staffId && !historyLoaded && !historyLoading) {
      void dispatch(fetchCommissionHistoryThunk(historyArgs));
    }
  }, [dispatch, visible, staffId, historyArgs, historyLoaded, historyLoading]);

  const unpaid = record?.unpaidAmount ?? 0;
  const total = record?.amount ?? 0;
  const paid = Math.max(0, total - unpaid);
  const initials = (record?.staffName ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <BottomSheet
      pearlStyle
      centered={false}
      onClose={onClose}
      renderInline={renderInline}
      subtitle={"Commission history · " + formatAppDate(month + "-01", "")}
      title={record?.staffName ?? "Staff"}
      visible={visible}
    >
      <View style={s.header}>
        <StaffAvatar initials={initials} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={s.staffName}>{record?.staffName ?? "Staff"}</Text>
          <Text translate style={s.staffMeta}>{record?.status.toLowerCase() === "paid" ? "All settled" : "Has unpaid commission"}</Text>
        </View>
      </View>

      <View style={s.summaryRow}>
        <View style={s.summaryItem}>
          <Text translate style={s.summaryLabel}>Total commission</Text>
          <Text style={s.summaryValue}>{formatCurrency(total)}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text translate style={s.summaryLabel}>Paid</Text>
          <Text style={[s.summaryValue, { color: pearl.successText }]}>{formatCurrency(paid)}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text translate style={s.summaryLabel}>Unpaid</Text>
          <Text style={[s.summaryValue, { color: pearl.warningText }]}>{formatCurrency(unpaid)}</Text>
        </View>
      </View>

      <Text translate style={s.sectionTitle}>Commission history</Text>

      {historyError ? (
        <StaffStateView
          actionLabel="Retry"
          description={historyError}
          onAction={() => staffId && void dispatch(fetchCommissionHistoryThunk(historyArgs))}
          title="Unable to load commission history"
          variant="error"
        />
      ) : null}
      {!historyError && historyLoading && !historyLoaded ? (
        <StaffStateView description="Fetching commission history." loading title="Loading history" />
      ) : null}
      {!historyError && historyLoaded && history.length === 0 ? (
        <StaffStateView
          description={"No commission entries for " + formatAppDate(month + "-01", "") + "."}
          title="No commission history"
        />
      ) : null}
      {!historyError && history.length > 0 ? (
        <View style={{ gap: 10 }}>
          {history.map((entry) => {
            const meta = getCategoryMeta(entry.category);
            const tone = pearlTones[meta.tone];
            const settled = entry.status === "paid" || entry.status === "partial";
            return (
              <View key={entry.id} style={s.row}>
                <View style={[s.rowIcon, { backgroundColor: tone.bg }]}>
                  <Ionicons name={meta.icon} size={18} color={tone.fg} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={s.rowTop}>
                    <Text translate style={s.rowCategory}>{meta.label}</Text>
                    <View style={[s.statusPill, { backgroundColor: settled ? pearl.successBg : pearl.warningBg }]}>
                      <Text translate style={{ color: settled ? pearl.successText : pearl.warningText, fontSize: 10.5, fontWeight: "700" }}>
                        {entry.status === "paid" ? "Paid" : entry.status === "partial" ? "Partial" : "Pending"}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.rowDate}>{formatCommissionDate(entry)}</Text>
                  <Text translate style={s.rowRevenue}>Bill {formatCurrency(entry.revenueAmount)}</Text>
                  <Text style={s.rowAmount}>
                    {entry.commissionKind === "percentage" ? `${entry.commissionRate ?? 0}%` : `Flat ${formatCurrency(entry.commissionRate ?? 0)}`}
                    {" → "}
                    <Text style={{ fontWeight: "800" }}>{formatCurrency(entry.amount)}</Text>
                  </Text>
                  {settled && entry.paymentMethod ? (
                    <Text translate style={s.rowPayment}>Paid via {entry.paymentMethod}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </BottomSheet>
  );
}

const s = themedStyles((p) => ({
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  staffName: { color: p.ink, fontSize: 16, fontWeight: "800" },
  staffMeta: { color: p.muted, fontSize: 12, marginTop: 2 },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: p.glass,
    borderColor: p.glassBorder,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 3 },
  summaryDivider: { width: 1, alignSelf: "stretch", backgroundColor: p.divider, marginVertical: 2 },
  summaryLabel: { color: p.muted, fontSize: 11, fontWeight: "600", textAlign: "center" },
  summaryValue: { color: p.ink, fontSize: 15, fontWeight: "800" },
  sectionTitle: { color: p.ink, fontSize: 14, fontWeight: "700", marginBottom: 10 },
  row: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: p.glass,
    borderColor: p.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  rowIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowCategory: { color: p.ink, fontSize: 13, fontWeight: "700" },
  statusPill: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  rowDate: { color: p.muted, fontSize: 11, marginTop: 1 },
  rowRevenue: { color: p.ink2, fontSize: 12, marginTop: 4 },
  rowAmount: { color: p.ink2, fontSize: 12.5, marginTop: 2 },
  rowPayment: { color: p.accentDeep, fontSize: 11.5, marginTop: 4, fontWeight: "600" },
}));
