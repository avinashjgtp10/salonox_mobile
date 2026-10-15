import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";
import { DateRangeField } from "@/components/ui/DateRangeField";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { DashboardRadius as Radius, type ThemeColors } from "@/constants/theme";
import { StaffSectionCard } from "@/features/staff/components/StaffSectionCard";
import { staffCommissionsService } from "@/services/staffCommissions.service";
import type { CommissionHistoryEntry } from "@/types/staffCommissions";
import { formatAppDate } from "@/utils/dateTime";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatCurrency as money } from "@/utils/currency";

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const prettyCategory = (category?: string | null) => category
  ? category.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  : "Commission";

type Props = { refreshKey?: number; staffId?: string | null; staffName: string };

export function MyCommissionCard({ refreshKey = 0, staffId, staffName }: Props) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const today = useMemo(() => dateKey(new Date()), []);
  const [appliedRange, setAppliedRange] = useState(() => ({ startDate: dateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), endDate: today }));
  const [entries, setEntries] = useState<CommissionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (range: { startDate: string; endDate: string }) => {
    if (!staffId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await staffCommissionsService.getCommissionHistoryForRange(staffId, range.startDate, range.endDate);
      setEntries(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your commissions.");
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => { void load(appliedRange); }, [appliedRange, load, refreshKey]);

  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <StaffSectionCard title="My Commission">
      <Text style={styles.name}>{staffName}</Text>
      <DateRangeField startDate={appliedRange.startDate} endDate={appliedRange.endDate} maximumDate={new Date()} disabled={loading}
        onChange={(start, end) => setAppliedRange({ startDate: start, endDate: end })} />

      <View style={styles.totalCard}>
        <View>
          <Text style={styles.totalLabel}>Total earned</Text>
          <Text style={styles.rangeLabel}>{formatAppDate(new Date(`${appliedRange.startDate}T00:00:00`))} - {formatAppDate(new Date(`${appliedRange.endDate}T00:00:00`))}</Text>
        </View>
        <Text style={styles.totalAmount}>{money(total)}</Text>
      </View>

      {loading ? <View style={styles.state}><ActivityIndicator color={Colors.primary} /><Text style={styles.stateText}>Loading your commission...</Text></View> : null}
      {!loading && error ? (
        <TouchableOpacity accessibilityRole="button" onPress={() => void load(appliedRange)} style={styles.state}>
          <Text style={styles.error}>{error}</Text><Text style={styles.retry}>Tap to retry</Text>
        </TouchableOpacity>
      ) : null}
      {!loading && !error && entries.length === 0 ? <Text style={styles.empty}>No commission earned in this date range.</Text> : null}
      {!loading && !error && entries.length > 0 ? (
        <View style={styles.list}>
          {entries.map((entry) => (
            <View key={entry.id} style={styles.entry}>
              <View style={styles.entryCopy}>
                <Text style={styles.category}>{prettyCategory(entry.category)}</Text>
                <Text style={styles.meta}>{entry.period ?? "Date unavailable"} - {entry.status}</Text>
              </View>
              <Text style={styles.amount}>{money(entry.amount)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </StaffSectionCard>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  name: { color: Colors.text2, fontSize: 13, fontWeight: "700", marginBottom: 12 },
  dateRow: { flexDirection: "row", gap: 10 },
  dateField: { flex: 1 },
  error: { color: Colors.error, fontSize: 12 },
  applyButton: { alignItems: "center", alignSelf: "flex-start", backgroundColor: Colors.primary, borderRadius: Radius.md, flexDirection: "row", gap: 8, marginBottom: 14, paddingHorizontal: 13, paddingVertical: 10 },
  applyText: { color: Colors.card, fontSize: 12, fontWeight: "800" },
  totalCard: { alignItems: "center", backgroundColor: Colors.bg2, borderColor: Colors.border, borderRadius: Radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginBottom: 12, padding: 14 },
  totalLabel: { color: Colors.heading, fontSize: 14, fontWeight: "800" },
  rangeLabel: { color: Colors.text2, fontSize: 11, marginTop: 4 },
  totalAmount: { color: Colors.heading, fontSize: 17, fontWeight: "900" },
  state: { alignItems: "center", gap: 8, paddingVertical: 18 },
  stateText: { color: Colors.text2, fontSize: 12 },
  retry: { color: Colors.primary, fontSize: 12, fontWeight: "800" },
  empty: { color: Colors.text2, fontSize: 12, paddingVertical: 12, textAlign: "center" },
  list: { gap: 8 },
  entry: { alignItems: "center", backgroundColor: Colors.bg2, borderColor: Colors.border, borderRadius: Radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 12 },
  entryCopy: { flex: 1, paddingRight: 10 },
  category: { color: Colors.heading, fontSize: 13, fontWeight: "800" },
  meta: { color: Colors.text2, fontSize: 11, marginTop: 4, textTransform: "capitalize" },
  amount: { color: Colors.heading, fontSize: 13, fontWeight: "800" },
});
