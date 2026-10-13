import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { selectDashboardLastFetchedAt } from "@/store/dashboard/dashboard.slice";
import { getApiErrorMessage } from "@/services/api";
import { monthlyProjectionService, type MonthlyProjection, type ProjectionGender } from "@/services/monthlyProjection.service";
import { buildProjectionTrend } from "@/utils/monthlyProjection";
import { formatDashboardRevenue } from "@/utils/dashboard";

export default function MonthlyProjectionCard() {
  const branch = useAppSelector(selectActiveBranchId);
  const user = useAppSelector(selectCurrentUser);
  // Remount on salon changes so requests/target edits cannot show another salon's data.
  return <ProjectionBody key={`${user?.id}:${branch}`} canEdit={user?.role === "salon_owner" || user?.role === "admin"} />;
}

function ProjectionBody({ canEdit }: { canEdit: boolean }) {
  const colors = useThemeColors();
  const refreshedAt = useAppSelector(selectDashboardLastFetchedAt);
  const [gender, setGender] = useState<ProjectionGender>("all");
  const [data, setData] = useState<MonthlyProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [targetError, setTargetError] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const styles = useMemo(() => StyleSheet.create({
    body: { width: "100%", gap: 14 },
    title: { color: colors.heading, fontSize: 17, fontWeight: "700" },
    label: { color: colors.text2, fontSize: 12 },
    value: { color: colors.heading, fontSize: 19, fontWeight: "700" },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    button: { paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
    selected: { borderColor: colors.primary, backgroundColor: colors.bg2 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    metric: { flexBasis: "46%", flexGrow: 1, gap: 5, padding: 10, backgroundColor: colors.bg2, borderRadius: 12 },
    input: { color: colors.heading, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 12 },
    error: { color: colors.error, fontSize: 13 },
  }), [colors]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    setSelectedDay(null);
    monthlyProjectionService.get(gender).then((next) => {
      if (active) setData(next);
    }).catch((err) => {
      if (active) setError(getApiErrorMessage(err));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gender, refreshedAt, reload]);

  const trend = useMemo(() => data ? buildProjectionTrend(data.daily, data.daysInMonth) : [], [data]);
  const maximum = data ? Math.max(1, ...data.daily.map((row) => row.sales), ...trend) : 1;
  const money = (value: number | null) => value === null ? "—" : formatDashboardRevenue(value);

  async function saveTarget() {
    const target = draft.trim() === "" ? null : Number(draft);
    setSaving(true);
    setTargetError("");
    try {
      await monthlyProjectionService.setTarget(target);
      setEditing(false);
      setReload((value) => value + 1);
    } catch (err) {
      setTargetError(getApiErrorMessage(err));
    } finally { setSaving(false); }
  }

  function metric(label: string, value: string, detail?: string) {
    return <View key={label} style={styles.metric}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text>{detail ? <Text style={styles.label}>{detail}</Text> : null}</View>;
  }

  return <View style={styles.body}>
    <Text style={styles.title}>Monthly Projection &amp; Growth</Text>
    <Text style={styles.label}>Based on current month performance</Text>
    <View style={styles.row}>
      {(["all", "male", "female"] as const).map((option) => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: gender === option }} onPress={() => setGender(option)} style={[styles.button, gender === option && styles.selected]}>
        <Text style={styles.label}>{option === "all" ? "All Genders" : option === "male" ? "Male" : "Female"}</Text>
      </Pressable>)}
    </View>
    {loading ? <ActivityIndicator accessibilityLabel="Loading monthly projection" color={colors.primary} /> : error ? <View style={{ gap: 8 }}>
      <Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setReload((value) => value + 1)} style={styles.button}><Text style={styles.label}>Retry</Text></Pressable>
    </View> : data ? <>
      <Text style={styles.label}>{data.monthLabel} · Through {data.asOf} · {data.daysPassed} days</Text>
      <View style={styles.grid}>
        {metric("MTD Sales", money(data.mtdSales), "Month to date")}
        {metric("Projected Sales", money(data.projectedSales), "Based on current run rate")}
        {metric("Target (Monthly)", data.target === null ? "Not set" : money(data.target), data.achievedPct === null ? undefined : `${data.achievedPct.toFixed(2)}% achieved · ${money(data.remainingTarget)} left`)}
        {metric("Growth", data.growthPct === null ? "—" : `${data.growthPct > 0 ? "+" : ""}${data.growthPct.toFixed(2)}%`, data.growthPct === null ? "No sales last month till date" : "vs last month till date")}
      </View>
      {data.target !== null ? <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.min(100, Math.max(0, data.achievedPct ?? 0)) }} style={{ height: 6, borderRadius: 3, backgroundColor: colors.border }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.primary, width: `${Math.min(100, Math.max(0, data.achievedPct ?? 0))}%` }} />
      </View> : null}
      {canEdit && !editing ? <Pressable accessibilityRole="button" style={styles.button} onPress={() => { setDraft(data.target === null ? "" : String(data.target)); setTargetError(""); setEditing(true); }}><Text style={styles.label}>{data.target === null ? "Set monthly target" : "Edit monthly target"}</Text></Pressable> : null}
      {editing ? <View style={{ gap: 8 }}>
        <TextInput accessibilityLabel="Monthly sales target" keyboardType="decimal-pad" editable={!saving} value={draft} onChangeText={setDraft} placeholder="Enter amount" placeholderTextColor={colors.text2} style={styles.input} />
        <Text style={styles.label}>Leave blank to remove the target.</Text>
        {targetError ? <Text style={styles.error}>{targetError}</Text> : null}
        <View style={styles.row}><Pressable accessibilityRole="button" disabled={saving} style={styles.button} onPress={() => void saveTarget()}><Text style={styles.label}>{saving ? "Saving…" : "Save"}</Text></Pressable><Pressable accessibilityRole="button" disabled={saving} style={styles.button} onPress={() => setEditing(false)}><Text style={styles.label}>Cancel</Text></Pressable></View>
      </View> : null}
      <View style={styles.grid}>
        {metric("Required Daily Sales", money(data.requiredDailySales), data.target === null ? "Set a target to see this" : data.remainingDays <= 0 ? "Last day of the month" : `${data.remainingDays} days left`)}
        {metric("Day ABV", money(data.dayAbv), `${data.todayWalkins} walk-ins today`)}
        {metric("Month ABV", money(data.monthAbv), `${data.mtdWalkins} walk-ins this month`)}
      </View>
      <Text style={styles.label}>ABV = average bill value</Text>
      <Text style={styles.label}>Daily sales (solid) · Projected trend (faded)</Text>
      <Text style={styles.label}>{selectedDay === null ? "Tap a day to see its amount. Swipe to see the full month." : `Day ${selectedDay}: ${selectedDay <= data.daysPassed ? "Sales" : "Projected"} ${money(selectedDay <= data.daysPassed ? data.daily.find((row) => row.day === selectedDay)?.sales ?? 0 : trend[selectedDay - 1])}`}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel="Daily sales and projected trend by day">
        <View style={{ flexDirection: "row", gap: 5, paddingBottom: 8 }}>
          {trend.map((value, index) => {
            const day = index + 1;
            const actual = day <= data.daysPassed;
            const sales = actual ? data.daily.find((row) => row.day === day)?.sales ?? 0 : value;
            return <Pressable key={day} accessibilityRole="button" accessibilityState={{ selected: selectedDay === day }} onPress={() => setSelectedDay(day)} accessibilityLabel={`Day ${day}: ${actual ? "sales" : "projected"} ${money(sales)}, trend ${money(value)}`} style={{ width: 28, gap: 5, backgroundColor: selectedDay === day ? colors.bg2 : undefined }}>
              <View style={{ height: 110, justifyContent: "flex-end" }}>
                <View style={{ height: sales / maximum * 100, backgroundColor: colors.primary, opacity: actual ? 1 : 0.25, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
                <View style={{ position: "absolute", bottom: value / maximum * 100, width: 20, borderTopWidth: 1, borderStyle: "dashed", borderColor: colors.text2 }} />
              </View><Text style={[styles.label, { textAlign: "center", fontSize: 10 }]}>{day}</Text>
            </Pressable>;
          })}
        </View>
      </ScrollView>
    </> : null}
  </View>;
}
