/**
 * Month overview (prototype "Compare & projection"): this month vs last month on the
 * same days, target & projection, and daily sales. Data: /dashboard/monthly-projection.
 */
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { pearl, pearlType } from "@/components/auth/pearl/tokens";
import { EditTargetSheet, inrShort } from "@/components/dashboard/EditTargetSheet";
import { Chips, LoadError, NoteBox, Page, PageHeader, ProgressBar } from "@/components/pearl/Page";
import { Card, Divider, IconButton, SectionHeader, Skeleton, SmallButton, StatTile } from "@/components/pearl/ui";
import { Text } from "@/components/ui/AppTypography";
import { ApiError } from "@/services/api";
import { monthlyProjectionService, type MonthlyProjection, type ProjectionGender } from "@/services/monthlyProjection.service";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { selectDashboardMetrics } from "@/store/dashboard/dashboard.slice";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { formatCurrencyRounded as money } from "@/utils/currency";
import { buildProjectionTrend } from "@/utils/monthlyProjection";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CMP_MAX = 110;
const CHART_H = 130;

const GENDERS: { key: ProjectionGender; label: string }[] = [
  { key: "all", label: "All clients" },
  { key: "female", label: "Women" },
  { key: "male", label: "Men" },
];

export default function MonthOverviewScreen() {
  const branchId = useAppSelector(selectActiveBranchId);
  const user = useAppSelector(selectCurrentUser);
  const metrics = useAppSelector(selectDashboardMetrics);
  const canEdit = user?.role === "salon_owner" || user?.role === "admin";
  const [gender, setGender] = useState<ProjectionGender>("all");
  const [data, setData] = useState<MonthlyProjection | null>(null);
  const [error, setError] = useState<"offline" | "failed" | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    monthlyProjectionService.get(gender)
      .then(next => { if (active) { setData(next); setSelectedDay(null); } })
      .catch(err => { if (active) setError(err instanceof ApiError && err.status === undefined ? "offline" : "failed"); })
      .finally(() => { if (active) { setLoading(false); setRefreshing(false); } });
    return () => { active = false; };
  }, [branchId, gender, reloadKey]);

  const reload = useCallback(() => { setRefreshing(true); setReloadKey(key => key + 1); }, []);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/dashboard" as Href));

  const now = new Date();
  const monthName = MONTHS[now.getMonth()];
  const prevMonthName = MONTHS[(now.getMonth() + 11) % 12];

  return (
    <Page
      refreshing={refreshing}
      onRefresh={reload}
      header={(
        <PageHeader
          title="Month overview"
          subtitle={`${data?.monthLabel ?? `${monthName} ${now.getFullYear()}`} · month to date`}
          onBack={back}
          right={canEdit ? <IconButton icon="edit" label="Edit monthly target" onPress={() => setEditing(true)} /> : undefined}
        />
      )}
    >
      <Chips items={GENDERS} value={gender} onChange={setGender} />

      {loading && !data ? (
        <View style={{ gap: 14 }}><Skeleton h={220} r={22} /><Skeleton h={150} r={22} /><Skeleton h={180} r={22} /></View>
      ) : error && !data ? (
        <LoadError offline={error === "offline"} onRetry={() => setReloadKey(key => key + 1)} />
      ) : data ? (
        <Overview
          data={data}
          monthName={monthName}
          prevMonthName={prevMonthName}
          canEdit={canEdit}
          onEditTarget={() => setEditing(true)}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      ) : null}

      <EditTargetSheet
        visible={editing}
        onClose={() => setEditing(false)}
        current={data?.target ?? null}
        lastMonth={metrics.lastMonthRevenue}
        onSaved={() => setReloadKey(key => key + 1)}
      />
    </Page>
  );
}

function Overview({ data, monthName, prevMonthName, canEdit, onEditTarget, selectedDay, onSelectDay }: {
  data: MonthlyProjection; monthName: string; prevMonthName: string; canEdit: boolean;
  onEditTarget: () => void; selectedDay: number | null; onSelectDay: (day: number) => void;
}) {
  const current = data.mtdSales;
  const previous = data.lmmtdSales;
  const diff = current - previous;
  const up = diff >= 0;
  const change = previous > 0 ? `${up ? "+" : "−"}${Math.abs((diff / previous) * 100).toFixed(1)}%` : current > 0 ? "new" : "0%";
  const cmpMax = Math.max(current, previous, 1);
  const shortNow = SHORT_MONTHS[MONTHS.indexOf(monthName)];
  const shortPrev = SHORT_MONTHS[MONTHS.indexOf(prevMonthName)];

  const trend = useMemo(() => buildProjectionTrend(data.daily, data.daysInMonth), [data.daily, data.daysInMonth]);
  const days = useMemo(() => trend.map((estimate, index) => {
    const day = index + 1;
    const actual = day <= data.daysPassed;
    return { day, actual, amount: actual ? data.daily.find(row => row.day === day)?.sales ?? 0 : estimate };
  }), [data.daily, data.daysPassed, trend]);
  const chartMax = Math.max(1, ...days.map(row => row.amount));
  const selected = days.find(row => row.day === (selectedDay ?? data.daysPassed)) ?? null;
  const dayLabel = (day: number) => {
    const date = new Date();
    date.setDate(day);
    return `${DAYS[date.getDay()]} ${day}`;
  };

  return (
    <>
      <SectionHeader title={`${monthName} vs ${prevMonthName}`} action="Collected" />
      <Card padded style={{ gap: 10 }}>
        <View style={styles.cmp}>
          <View style={styles.cmpBars} accessible accessibilityLabel={`${prevMonthName} ${money(previous)}, ${monthName} ${money(current)}`}>
            {[{ label: shortPrev, value: previous, colors: ["#C9B5EC", "#8466B8"] as const }, { label: shortNow, value: current, colors: [pearl.accentTint, pearl.accentDeep] as const }].map(month => (
              <View key={month.label} style={{ alignItems: "center", gap: 5 }}>
                <Text style={styles.cmpValue}>{inrShort(month.value)}</Text>
                <LinearGradient colors={month.colors} style={[styles.cmpBar, { height: Math.max(8, (month.value / cmpMax) * CMP_MAX) }]} />
                <Text style={pearlType.small}>{month.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ flex: 1, gap: 10, justifyContent: "center" }}>
            <KeyValue k="Change" v={`${up ? "▲" : "▼"} ${money(Math.abs(diff))} (${change})`} color={diff === 0 ? undefined : up ? pearl.successText : pearl.dangerText} />
            <KeyValue k={shortPrev} v={money(previous)} />
            <KeyValue k={shortNow} v={money(current)} />
          </View>
        </View>
        <Text style={[pearlType.small, { fontSize: 11.5 }]}>1–{data.daysPassed} {shortNow} vs 1–{data.daysPassed} {shortPrev} · same days compared</Text>
      </Card>

      <SectionHeader title="Target & projection" />
      <Card padded style={{ gap: 12 }}>
        <View style={styles.legend}>
          <Legend color={pearl.accent} label="Actual" /><Legend color="#C9B5EC" label="Estimate" /><Legend color="#E8DFD0" label="Target" />
        </View>
        <View style={styles.rowBetween}>
          <View><Text style={pearlType.small}>Actual (MTD)</Text><Text style={styles.big}>{money(data.mtdSales)}</Text></View>
          <View style={{ alignItems: "flex-end" }}><Text style={pearlType.small}>Projected</Text><Text style={[styles.big, { color: "#6A4F98" }]}>{money(data.projectedSales)}</Text></View>
        </View>
        {data.target !== null ? (
          <>
            <ProgressBar value={data.achievedPct ?? (data.mtdSales / data.target) * 100} />
            <View style={styles.rowBetween}>
              <Text style={pearlType.small}>Target {money(data.target)}</Text>
              <Text style={[pearlType.small, { fontWeight: "700", color: pearl.ink }]}>
                {(data.remainingTarget ?? 0) > 0 ? `${money(data.remainingTarget ?? 0)} to go` : "Target reached"}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.rowBetween}>
            <Text style={[pearlType.small, { flex: 1 }]}>No monthly target set yet.</Text>
            {canEdit ? <SmallButton title="Set target" icon="target" onPress={onEditTarget} /> : null}
          </View>
        )}
      </Card>

      <NoteBox>Projection = your average daily sales this month × days left. It is an estimate, not a forecast of bookings.</NoteBox>

      <View style={styles.statRow}>
        <StatTile icon="target" tone="lavender" label="Needed per day" value={data.requiredDailySales === null ? "—" : money(data.requiredDailySales)} />
        <StatTile icon="receipt" tone="lilac" label="Avg bill (month)" value={data.monthAbv === null ? "—" : money(data.monthAbv)} />
      </View>
      <View style={styles.statRow}>
        <StatTile icon="users" tone="sky" label="Walk-ins" value={String(data.mtdWalkins)} />
        <StatTile icon="calendar" tone="lavender" label="Days left" value={String(Math.max(0, data.remainingDays))} />
      </View>

      <SectionHeader title="Daily sales" action={selected ? `${dayLabel(selected.day)} · ${money(selected.amount)}${selected.actual ? "" : " (est.)"}` : "Swipe for more ›"} />
      <Card padded>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chart}
          contentOffset={{ x: Math.max(0, (data.daysPassed - 10) * 26), y: 0 }}>
          {days.map(row => {
            const on = selected?.day === row.day;
            const height = Math.max(6, (row.amount / chartMax) * CHART_H);
            return (
              <Pressable key={row.day} onPress={() => onSelectDay(row.day)} accessibilityRole="button" accessibilityState={{ selected: on }}
                accessibilityLabel={`${dayLabel(row.day)}: ${money(row.amount)}${row.actual ? "" : ", estimate"}`} style={styles.dayCol}>
                {on ? <Text style={styles.tip}>{inrShort(row.amount)}</Text> : null}
                {row.actual
                  ? <LinearGradient colors={on ? [pearl.accent, pearl.accentDeep] : [pearl.accentTint, pearl.accentLight]} style={[styles.bar, { height }]} />
                  : <View style={[styles.bar, styles.estimate, { height }, on && styles.barOn]} />}
                <Text style={[pearlType.small, { fontSize: 10, lineHeight: 13 }, on && { color: pearl.ink, fontWeight: "800" }]}>{row.day}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Divider inset={0} />
        <Text style={[pearlType.small, { marginTop: 8, fontSize: 11 }]}>Tap a bar for the amount · lighter bars are estimates</Text>
      </Card>
    </>
  );
}

const KeyValue = ({ k, v, color }: { k: string; v: string; color?: string }) => (
  <View style={{ gap: 1 }}>
    <Text style={[pearlType.small, { fontSize: 11.5 }]}>{k}</Text>
    <Text style={[pearlType.bodyStrong, { fontSize: 13.5 }, color ? { color } : null]}>{v}</Text>
  </View>
);

const Legend = ({ color, label }: { color: string; label: string }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
    <Text style={[pearlType.label, { fontWeight: "700", fontSize: 11.5 }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  cmp: { flexDirection: "row", gap: 16, alignItems: "flex-end" },
  cmpBars: { flexDirection: "row", gap: 14, alignItems: "flex-end", height: CMP_MAX + 44 },
  cmpBar: { width: 46, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 },
  cmpValue: { fontWeight: "800", fontSize: 12, color: pearl.ink },
  legend: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  big: { fontWeight: "800", fontSize: 19, color: pearl.ink },
  statRow: { flexDirection: "row", gap: 10 },
  chart: { gap: 8, alignItems: "flex-end", height: CHART_H + 44, paddingBottom: 6 },
  dayCol: { alignItems: "center", gap: 6, width: 18 },
  bar: { width: 18, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  estimate: { backgroundColor: "rgba(201,181,236,0.45)", borderWidth: 1, borderColor: "rgba(132,102,184,0.35)", borderStyle: "dashed" },
  barOn: { borderColor: pearl.accentDeep, borderWidth: 1.5 },
  tip: { fontWeight: "800", fontSize: 10, color: "#fff", backgroundColor: pearl.ink, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
});
