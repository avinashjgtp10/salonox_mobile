import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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
import { formatCurrency } from "@/utils/currency";

function axisAmount(value: number) {
  const divisor = value >= 10000000 ? 10000000 : value >= 100000 ? 100000 : value >= 1000 ? 1000 : 1;
  const suffix = divisor === 10000000 ? "Cr" : divisor === 100000 ? "L" : divisor === 1000 ? "k" : "";
  return `₹${(value / divisor).toFixed(divisor === 1 ? 0 : 1).replace(/\.0$/, "")}${suffix}`;
}

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
    targetButton: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    targetButtonText: { color: colors.onPrimary, fontSize: 14, fontWeight: "700" },
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
  const money = (value: number | null) => value === null ? "—" : formatCurrency(value).replace(/\.00$/, "");

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
    {loading ? <ActivityIndicator accessibilityLabel="Loading monthly projection" color={colors.primaryText} /> : error ? <View style={{ gap: 8 }}>
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
      {canEdit && !editing ? <Pressable accessibilityRole="button" style={({ pressed }) => [styles.targetButton, pressed && { opacity: 0.75 }]} onPress={() => { setDraft(data.target === null ? "" : String(data.target)); setTargetError(""); setEditing(true); }}><Ionicons name={data.target === null ? "add-circle-outline" : "create-outline"} size={18} color={colors.onPrimary} /><Text style={styles.targetButtonText}>{data.target === null ? "Set monthly target" : "Edit monthly target"}</Text></Pressable> : null}
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
      <View style={{ padding: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, gap: 14 }}>
      <View style={{ gap: 4 }}>
        <Text style={styles.title}>Daily sales outlook</Text>
        <Text style={styles.label}>{data.monthLabel} · Sales per day</Text>
      </View>
      <View style={[styles.row, { gap: 12 }]}>
        {[["Sales", "#16A34A"], ["Projected", "#2563EB"]].map(([label, color]) => <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: color }} /><Text style={styles.label}>{label}</Text></View>)}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 12, borderTopWidth: 1, borderStyle: "dashed", borderColor: colors.text2 }} /><Text style={styles.label}>Trend</Text></View>
      </View>
      <View accessibilityLiveRegion="polite" style={{ padding: 12, borderRadius: 12, backgroundColor: colors.bg2, gap: 4, minHeight: 68 }}>
        <Text style={styles.label}>{selectedDay === null ? "Explore your month" : `Day ${selectedDay} · ${selectedDay <= data.daysPassed ? "Actual sales" : "Projected sales"}`}</Text>
        <Text style={selectedDay === null ? styles.label : styles.value}>{selectedDay === null ? "Tap a bar for the daily amount" : money(selectedDay <= data.daysPassed ? data.daily.find((row) => row.day === selectedDay)?.sales ?? 0 : trend[selectedDay - 1])}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
      <View style={{ width: 40, height: 168, marginTop: 10 }}>
        {[1, 0.75, 0.5, 0.25, 0].map((fraction) => <Text key={fraction} numberOfLines={1} style={{ color: colors.text2, fontSize: 9, position: "absolute", top: (1 - fraction) * 168 - 6, right: 0 }}>{axisAmount(maximum * fraction)}</Text>)}
      </View>
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator accessibilityLabel="Daily sales and projected trend by day" style={{ flex: 1 }}>
        <View style={{ paddingTop: 10, paddingBottom: 4 }}>
        <View pointerEvents="none" style={{ position: "absolute", top: 10, left: 0, right: 0, height: 168 }}>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => <View key={fraction} style={{ position: "absolute", top: fraction * 168, width: "100%", borderTopWidth: 1, borderColor: colors.border, borderStyle: fraction === 1 ? "solid" : "dashed" }} />)}
        </View>
        <View style={{ flexDirection: "row" }}>
          {trend.map((value, index) => {
            const day = index + 1;
            const actual = day <= data.daysPassed;
            const sales = actual ? data.daily.find((row) => row.day === day)?.sales ?? 0 : value;
            return <Pressable key={day} accessibilityRole="button" accessibilityState={{ selected: selectedDay === day }} onPress={() => setSelectedDay(day)} accessibilityLabel={`Day ${day}: ${actual ? "sales" : "projected"} ${money(sales)}, trend ${money(value)}`} style={{ width: 44, borderRadius: 8, backgroundColor: selectedDay === day ? colors.backgroundSelected : undefined }}>
              <View style={{ height: 168, justifyContent: "flex-end", alignItems: "center" }}>
                <LinearGradient colors={actual ? ["#4ADE80", "#16A34A"] : ["#93C5FD", "#2563EB"]} style={{ width: 24, height: sales / maximum * 168, opacity: selectedDay === null || selectedDay === day ? 1 : 0.65, borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
                <View style={{ position: "absolute", bottom: value / maximum * 168, width: 44, borderTopWidth: 1, borderStyle: "dashed", borderColor: colors.text2 }} />
              </View><Text style={[styles.label, { textAlign: "center", fontSize: 10, paddingVertical: 6 }, selectedDay === day && { color: colors.heading, fontWeight: "800" }]}>{day}</Text>
            </Pressable>;
          })}
        </View>
        </View>
      </ScrollView>
      </View>
      <Text style={[styles.label, { textAlign: "center", fontSize: 10 }]}>Day of month · Swipe to explore →</Text>
      </View>
    </> : null}
  </View>;
}
