import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { useClientSummary } from "@/features/quickSale/hooks/useClientSummary";
import { formatCurrency } from "@/features/quickSale/utils/money";
import { useClientPrivacy } from "@/hooks/useClientPrivacy";
import { formatAppDate } from "@/utils/dateTime";
import { maskPhone } from "@/utils/maskPhone";

// Quick Sale reference tokens, plus the web card's grey labels and blue figures.
const c = { line: "#E9DFE5", fg: "#000000", label: "#8A8F98", plum: "#A3467F", blue: "#3B82F6", ink: "#111827" };

type ClientSummaryCardProps = {
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
  clientId,
  initials,
  membership,
  name,
  onChange,
  onEditDates,
  onViewHistory,
  phone,
}: ClientSummaryCardProps) {
  const { clientName, staffMode } = useClientPrivacy();
  // Staff can't open client profiles.
  const handleViewHistory = staffMode ? undefined : onViewHistory;
  const { error, loading, metrics, retry, stats, summary } = useClientSummary(clientId);
  const pending = loading || !metrics;
  const show = (value: string) => (pending ? "…" : value);

  const activePackages = (metrics?.packages ?? [])
    .filter((pkg) => pkg.status.trim().toLowerCase() === "active")
    .map((pkg) => pkg.packageName)
    .filter(Boolean);
  const activeMemberships = (metrics?.activeMemberships ?? []).map((item) => item.membershipName).filter(Boolean);
  const membershipLabel = activeMemberships.length ? activeMemberships.join(", ") : membership || "N/A";

  const stat = (label: string, value: string, tone?: "blue") => (
    <View key={label} style={s.stat}>
      <Text numberOfLines={1} style={s.label}>{label}</Text>
      <Text numberOfLines={2} style={[s.value, tone === "blue" && s.blue]}>{value}</Text>
    </View>
  );

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={s.avatar}><Text style={s.avatarText}>{initials || initialsOf(name)}</Text></View>
        <View style={s.flex}>
          <Text numberOfLines={1} style={s.name}>{clientName(name)}</Text>
          {phone ? <Text style={s.phone}>{maskPhone(phone)}</Text> : null}
        </View>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onChange}><Text style={s.link}>Change</Text></Pressable>
      </View>

      <View style={s.grid}>
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
        {stat("Package", show(activePackages.length ? activePackages.join(", ") : "N/A"), "blue")}
        {stat("Membership", show(membershipLabel), "blue")}
      </View>

      {error ? (
        <Pressable accessibilityRole="button" onPress={retry} style={s.errorRow}>
          <Ionicons name="alert-circle-outline" size={15} color="#E5484D" />
          <Text style={s.error}>Could not load client details. Tap to retry.</Text>
        </Pressable>
      ) : null}

      {onEditDates || handleViewHistory ? (
        <View style={s.footer}>
          {onEditDates ? (
            <Pressable accessibilityRole="button" onPress={onEditDates} style={s.footerLink}>
              <Ionicons name="calendar-outline" size={16} color={c.plum} />
              <Text style={s.link}>Edit DOB & Anniversary</Text>
            </Pressable>
          ) : <View />}
          {handleViewHistory ? (
            <Pressable accessibilityRole="button" onPress={handleViewHistory} style={s.historyButton}>
              <Text style={s.historyText}>View History</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { gap: 12 },
  header: { alignItems: "center", flexDirection: "row", gap: 12 },
  avatar: { alignItems: "center", backgroundColor: c.ink, borderRadius: 12, height: 46, justifyContent: "center", width: 46 },
  avatarText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
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
});
