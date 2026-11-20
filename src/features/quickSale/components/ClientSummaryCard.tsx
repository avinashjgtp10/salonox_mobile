import { useRegionalPreferences } from "@/localization/preferences";
import { useEffect, useState } from "react";
import { pearl } from "@/components/auth/pearl/tokens";
import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useClientSummary } from "@/features/quickSale/hooks/useClientSummary";
import { membershipService } from "@/services/membership.service";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useAppSelector } from "@/store/hooks";
import type { LoyaltyEligibility } from "@/types/wallet";
import { formatCurrency } from "@/features/quickSale/utils/money";
import { useClientPrivacy } from "@/hooks/useClientPrivacy";
import { formatAppDate } from "@/utils/dateTime";
import { maskPhone } from "@/utils/maskPhone";

// Quick Sale reference tokens, plus the web card's grey labels and blue figures.
const c = { line: pearl.glassBorder, fg: pearl.ink, label: pearl.muted, plum: pearl.accentDeep, blue: pearl.accentDeep, ink: pearl.accent };

type ClientSummaryCardProps = {
  compact?: boolean;
  clientId: string;
  initials?: string;
  // Fallback when the history has no active membership (e.g. still loading).
  membership?: string | null;
  name: string;
  onChange: () => void;
  onEditDates?: () => void;
  // Omitted inside the Calendar pop-up, which can't open the client screen over itself.
  onViewHistory?: () => void;
  phone?: string;
};

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";

/** The selected client's details as on the web app's client card. */
export function ClientSummaryCard({
  compact = false,
  clientId,
  initials,
  membership,
  name,
  onChange,
  onEditDates,
  onViewHistory,
  phone,
}: ClientSummaryCardProps) {
  "use no memo";
  useRegionalPreferences();
  const [expanded, setExpanded] = useState(false);
  const { clientName, staffMode } = useClientPrivacy();
  // Staff can't open client profiles.
  const handleViewHistory = staffMode ? undefined : onViewHistory;
  const { error, loading, metrics, retry, stats, summary } = useClientSummary(clientId);
  const pending = loading || !metrics;
  const show = (value: string) => (pending ? "…" : value);

  // Loyalty ("automatic") membership — the web counts it alongside purchased
  // memberships (e.g. "Membership (2)"), but it comes from the loyalty endpoint,
  // not the client's purchased-membership history. Fetched here so the card
  // works the same in Quick Sale and the Calendar form without prop plumbing.
  const salonId = useAppSelector(selectActiveBranchId);
  const [loyalty, setLoyalty] = useState<LoyaltyEligibility | null>(null);
  useEffect(() => {
    setLoyalty(null);
    if (!clientId) return undefined;
    let active = true;
    membershipService.getLoyaltyEligibility(clientId, salonId)
      .then((result) => { if (active) setLoyalty(result); })
      .catch(() => { if (active) setLoyalty(null); });
    return () => { active = false; };
  }, [clientId, salonId]);

  const activeMembershipRecords = metrics?.activeMemberships ?? [];
  const loyaltyMembership = loyalty?.eligible ? loyalty : null;
  const activeMemberships = [
    ...activeMembershipRecords.map((item) => item.membershipName),
    ...(loyaltyMembership?.name ? [loyaltyMembership.name] : []),
  ].filter(Boolean);
  const membershipCount = activeMembershipRecords.length + (loyaltyMembership ? 1 : 0);
  const membershipLabel = activeMemberships.length ? activeMemberships.join(", ") : membership || "N/A";
  const activePackageRecords = (metrics?.packages ?? []).filter((pkg) => pkg.status.trim().toLowerCase() === "active");

  // Which detail popover is open (like the web client card's (i) hover).
  const [detail, setDetail] = useState<"package" | "membership" | null>(null);

  const stat = (label: string, value: string, tone?: "blue") => (
    <View key={label} style={s.stat}>
      <Text translate numberOfLines={1} style={s.label}>{label}</Text>
      <Text numberOfLines={2} style={[s.value, tone === "blue" && s.blue]}>{value}</Text>
    </View>
  );

  // A stat with an (i) button that opens its details overlay, for package /
  // membership — the mobile twin of the web card's hover popover.
  const statWithInfo = (label: string, count: number, value: string, onInfo: () => void) => (
    <View key={label} style={s.stat}>
      <View style={s.statLabelRow}>
        <Text translate numberOfLines={1} style={s.label}>{count > 1 ? `${label} (${count})` : label}</Text>
        {count > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`${label} details`} hitSlop={8} onPress={onInfo}>
            <Ionicons name="information-circle-outline" size={15} color={c.plum} />
          </Pressable>
        ) : null}
      </View>
      <Text numberOfLines={2} style={[s.value, s.blue]}>{value}</Text>
    </View>
  );

  const detailRow = (rowLabel: string, rowValue: string) => (
    <View key={rowLabel} style={s.detailRow}>
      <Text translate style={s.detailLabel}>{rowLabel}</Text>
      <Text style={s.detailValue}>{rowValue}</Text>
    </View>
  );

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Client details" onPress={() => setExpanded(value => !value)} style={s.avatar}><Text style={s.avatarText}>{initials || initialsOf(name)}</Text></Pressable>
        <View style={s.flex}>
          <Text numberOfLines={1} style={s.name}>{clientName(name)}</Text>
          {phone ? <Text style={s.phone}>{maskPhone(phone)}{compact && membership && membership !== "N/A" ? ` \u00b7 ${membership}` : ""}</Text> : null}
        </View>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onChange}><Text translate style={s.link}>Change</Text></Pressable>
      </View>

      {(!compact || expanded) && <><View style={s.grid}>
        {stat("E-Wallet", show(formatCurrency(summary?.walletBalance ?? 0)))}
        {stat("Unpaid", show(formatCurrency(metrics?.amountDue ?? 0)))}
        {stat("Reward", show(`${summary?.rewardPointsBalance ?? 0} pts`))}
        {stat("Referral", show(formatCurrency(summary?.referralBalance ?? 0)))}
        {stat("Visits", show(String(metrics?.totalVisits ?? 0)))}
        {stat("Last Visit", show(formatAppDate(metrics?.lastVisit ?? null)))}
        {stat("Cancelled", show(String(stats?.cancellations ?? 0)))}
      </View>

      <View style={s.grid}>
        {stat("Total Revenue", show(formatCurrency(metrics?.totalSpend ?? 0)), "blue")}
        {pending
          ? stat("Package", "…", "blue")
          : statWithInfo("Package", activePackageRecords.length, activePackageRecords.length ? activePackageRecords.map((pkg) => pkg.packageName).join(", ") : "N/A", () => setDetail("package"))}
        {pending
          ? stat("Membership", "…", "blue")
          : statWithInfo("Membership", membershipCount, activeMemberships.length ? membershipLabel : "N/A", () => setDetail("membership"))}
      </View>

      {error ? (
        <Pressable accessibilityRole="button" onPress={retry} style={s.errorRow}>
          <Ionicons name="alert-circle-outline" size={15} color="#E5484D" />
          <Text translate style={s.error}>Could not load client details. Tap to retry.</Text>
        </Pressable>
      ) : null}

      {onEditDates || handleViewHistory ? (
        <View style={s.footer}>
          {onEditDates ? (
            <Pressable accessibilityRole="button" onPress={onEditDates} style={s.footerLink}>
              <Ionicons name="calendar-outline" size={16} color={c.plum} />
              <Text translate style={s.link}>Edit DOB & Anniversary</Text>
            </Pressable>
          ) : <View />}
          {handleViewHistory ? (
            <Pressable accessibilityRole="button" onPress={handleViewHistory} style={s.historyButton}>
              <Text translate style={s.historyText}>View History</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      </>}

      <Modal animationType="fade" onRequestClose={() => setDetail(null)} transparent visible={detail !== null}>
        <Pressable accessibilityLabel="Close details" onPress={() => setDetail(null)} style={s.overlayBackdrop}>
          <Pressable style={s.overlayCard}>
            <View style={s.overlayHeader}>
              <Text translate style={s.overlayTitle}>{detail === "package" ? "Packages" : "Memberships"}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={() => setDetail(null)}>
                <Ionicons name="close" size={20} color={c.label} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={s.overlayScroll}>
              {detail === "package" ? (
                activePackageRecords.length ? activePackageRecords.map((pkg) => (
                  <View key={pkg.id} style={s.detailGroup}>
                    <Text style={s.detailName}>{pkg.packageName}</Text>
                    {detailRow("Status", pkg.status || "—")}
                    {detailRow("Purchase Date", formatAppDate(pkg.createdDate ?? null) || "—")}
                    {detailRow("Expiry Date", formatAppDate(pkg.expiryDate ?? null) || "—")}
                    {detailRow("Sessions", pkg.totalSessions > 0 ? `${pkg.completedSessions}/${pkg.totalSessions} used` : "Unlimited")}
                    {detailRow("Price", formatCurrency(pkg.totalAmount))}
                  </View>
                )) : <Text translate style={s.detailEmpty}>No active packages.</Text>
              ) : (
                membershipCount ? (
                  <>
                    {activeMembershipRecords.map((item) => (
                      <View key={item.id} style={s.detailGroup}>
                        <Text style={s.detailName}>{item.membershipName}</Text>
                        {detailRow("Status", item.status || "—")}
                        {detailRow("Purchase Date", formatAppDate(item.purchasedAt ?? null) || "—")}
                        {detailRow("Expiry Date", formatAppDate(item.expiresAt ?? null) || "—")}
                        {detailRow("Sessions", item.totalSessions > 0 ? `${item.remainingSessions}/${item.totalSessions} left` : "Unlimited")}
                        {detailRow("Price", formatCurrency(item.pricePaid))}
                        {item.membershipWalletBalance > 0 ? detailRow("Balance Amount", formatCurrency(item.membershipWalletBalance)) : null}
                        {item.discountBalanceRemaining > 0 ? detailRow("Discount Left", formatCurrency(item.discountBalanceRemaining)) : null}
                      </View>
                    ))}
                    {loyaltyMembership ? (
                      <View style={s.detailGroup}>
                        <Text style={s.detailName}>{loyaltyMembership.name || "Loyalty"}</Text>
                        {detailRow("Type", "Loyalty (Automatic)")}
                        {detailRow("Status", "active")}
                        {detailRow("Current Discount", `${loyaltyMembership.discountPercent}% off`)}
                        {detailRow("Next Tier", loyaltyMembership.nextTier ? `${loyaltyMembership.nextTier.discountPercent}% at ${loyaltyMembership.nextTier.thresholdValue} visits` : "Highest tier reached")}
                      </View>
                    ) : null}
                  </>
                ) : <Text translate style={s.detailEmpty}>No active memberships.</Text>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  card: { gap: 12 },
  header: { alignItems: "center", flexDirection: "row", gap: 12 },
  avatar: { alignItems: "center", backgroundColor: pearl.accentTint, borderRadius: 23, height: 46, justifyContent: "center", width: 46 },
  avatarText: { color: pearl.accentDeep, fontSize: 17, fontWeight: "700" },
  flex: { flex: 1, minWidth: 0 },
  name: { color: c.fg, fontSize: 16, fontWeight: "700" },
  phone: { color: c.label, fontSize: 13, marginTop: 2 },
  link: { color: c.plum, fontSize: 13, fontWeight: "700" },
  grid: { borderColor: c.line, borderTopWidth: 1, flexDirection: "row", flexWrap: "wrap", paddingTop: 12, rowGap: 12 },
  stat: { gap: 4, paddingRight: 8, width: "33.33%" },
  label: { color: c.label, fontSize: 11, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase" },
  value: { color: c.fg, fontSize: 14, fontWeight: "700" },
  blue: { color: c.blue },
  errorRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  error: { color: "#E5484D", fontSize: 12 },
  footer: { alignItems: "center", borderColor: c.line, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: 12 },
  footerLink: { alignItems: "center", flexDirection: "row", gap: 6 },
  historyButton: { backgroundColor: c.ink, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  historyText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  statLabelRow: { alignItems: "center", flexDirection: "row", gap: 4 },
  overlayBackdrop: { alignItems: "center", backgroundColor: "rgba(15, 23, 32, 0.45)", flex: 1, justifyContent: "center", padding: 24 },
  overlayCard: { backgroundColor: pearl.bgTop, borderColor: c.line, borderRadius: 20, borderWidth: 1, maxHeight: "72%", padding: 18, width: "100%" },
  overlayHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  overlayTitle: { color: c.fg, fontSize: 16, fontWeight: "800" },
  overlayScroll: { flexGrow: 0 },
  detailGroup: { backgroundColor: pearl.glass, borderColor: c.line, borderRadius: 14, borderWidth: 1, gap: 6, marginBottom: 12, padding: 14 },
  detailName: { color: c.plum, fontSize: 14, fontWeight: "800", marginBottom: 2 },
  detailRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 },
  detailLabel: { color: c.label, fontSize: 12, fontWeight: "600" },
  detailValue: { color: c.fg, flexShrink: 1, fontSize: 13, fontWeight: "700", textAlign: "right" },
  detailEmpty: { color: c.label, fontSize: 13, paddingVertical: 8, textAlign: "center" },
});
