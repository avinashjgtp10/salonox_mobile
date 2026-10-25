import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ThemeColors } from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { hasCustomPermission } from "@/utils/permissions";
import { getApiErrorMessage } from "@/services/api";
import { marketingService } from "@/services/marketing.service";
import type { MarketingInsights } from "@/types/marketing";

const integer = (n: number) => n.toLocaleString("en-IN");
const percent = (n: number, total: number) => total > 0 ? Math.round(n / total * 100) : 0;
const categories: Record<string, { label: string; color: string }> = {
  MARKETING: { label: "Marketing", color: "#e5484d" }, UTILITY: { label: "Utility", color: "#3478f6" },
  AUTHENTICATION: { label: "Authentication", color: "#8b5cf6" }, SERVICE: { label: "Service (replies)", color: "#16a36a" },
};
const dateLabel = (date: string) => {
  const value = new Date(`${date}T12:00:00`);
  return Number.isNaN(value.getTime()) ? date : value.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function MarketingInsightsScreen() {
  const user = useAppSelector(selectCurrentUser);
  return <Insights key={`${user?.id}:${user?.salonId}`} />;
}

function Insights() {
  const colors = useThemeColors();
  const s = useMemo(() => styles(colors), [colors]);
  const user = useAppSelector(selectCurrentUser);
  const allowed = Boolean(user && (["salon_owner", "admin"].includes((user.role || "").toLowerCase()) || hasCustomPermission(user, "view_marketing_analytics")));
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ data: MarketingInsights | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    if (!allowed) return;
    const controller = new AbortController();
    setResult({ data: null, error: null, loading: true });
    setSelectedDate(null);
    void marketingService.getInsights(days, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ data, error: null, loading: false });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ data: null, error: getApiErrorMessage(error), loading: false });
    });
    return () => controller.abort();
    // The revision intentionally reruns the request for pull-to-refresh and Retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, days, revision]));
  const { data, loading, error } = result;
  const refresh = () => setRevision(v => v + 1);
  const money = (value: number) => {
    try { return new Intl.NumberFormat("en-IN", { style: "currency", currency: data?.currency || "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); }
    catch { return `${data?.currency || "INR"} ${value.toFixed(2)}`; }
  };
  const maxDaily = Math.max(0.0001, ...(data?.daily.map(d => d.cost) ?? []));
  const hot = data?.daily.find(d => d.date === selectedDate);
  const spendUnavailable = data?.errors.some(e => e.startsWith("Spend:"));
  const templatesUnavailable = data?.errors.some(e => e.startsWith("Templates:"));
  const metric = (label: string, value: string, hint: string, green = false) => <View key={label} style={[s.metric, label === "Billed by Meta" && s.spendMetric, label === "Billed messages" && s.billedMetric, label === "All messages" && s.allMetric, green && s.freeMetric]}>
    <View style={[s.row, s.metricHeading]}><View style={s.metricIcon}><Ionicons name={label === "Billed by Meta" ? "wallet-outline" : green ? "gift-outline" : "chatbubbles-outline"} size={16} color={colors.primaryText} /></View><Text style={s.metricLabel}>{label}</Text></View>
    <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={[s.value, green && { color: colors.success }]}>{value}</Text><Text style={s.hint}>{hint}</Text>
  </View>;
  return <SafeAreaView edges={["top", "bottom"]} style={s.root}>
    <AppStatusBar />
    <View style={s.header}><AppBackButton fallbackHref="/dashboard" /><View style={s.fill}><Text style={s.eyebrow}>MARKETING</Text><Text style={s.heading}>Meta Insights</Text></View><View style={s.headerIcon}><Ionicons name="analytics-outline" size={22} color={colors.primaryText} /></View></View>
    {!allowed ? <Text style={s.empty}>You don’t have permission to view marketing insights.</Text> : <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading && revision > 0} onRefresh={refresh} tintColor={colors.primaryText} />}>
      <Text style={s.intro}>Your WhatsApp spend and performance, straight from Meta.</Text>
      <View style={s.periods}>{([7, 30, 90] as const).map(period => <Pressable key={period} accessibilityRole="button" accessibilityState={{ selected: days === period }} onPress={() => { if (period === days) return; setDays(period); setResult({ data: null, error: null, loading: true }); }} style={[s.period, days === period && s.active]}><Text style={[s.periodText, days === period && s.activeText]}>Last {period} days</Text></Pressable>)}</View>
      <View style={s.notice}><Ionicons name="information-circle-outline" size={16} color={colors.text2} /><Text style={[s.hint, s.fill]}>Up to 90 days of history. Figures may lag by a few hours.</Text></View>
      {loading ? <View style={s.empty}><ActivityIndicator color={colors.primaryText} /><Text style={s.hint}>Loading Meta’s numbers…</Text></View> : error ? <View accessibilityRole="alert" style={s.card}><Text style={{ color: colors.error }}>{error}</Text><Pressable accessibilityRole="button" onPress={refresh} style={s.period}><Text style={s.periodText}>Retry</Text></Pressable></View> : data && <>
        {!!data.errors.length && <View accessibilityRole="alert" style={s.warning}><Text style={s.title}>Some insights are unavailable</Text>{data.errors.map((message, index) => <Text key={index} style={s.hint}>{message}</Text>)}<Pressable accessibilityRole="button" onPress={refresh} style={s.period}><Text style={s.periodText}>Retry</Text></Pressable></View>}
        <View style={s.grid}>
          {metric("Billed by Meta", spendUnavailable ? "—" : money(data.totals.cost), `Last ${data.days} days · before GST`)}
          {metric("Billed messages", spendUnavailable ? "—" : integer(data.totals.billableVolume), spendUnavailable ? "Unavailable" : data.totals.billableVolume > 0 ? `${money(data.totals.cost / data.totals.billableVolume)} per message on average` : "No billed messages")}
          {metric("Free messages", spendUnavailable ? "—" : integer(data.totals.freeVolume), "Replies & free entry points", true)}
          {metric("All messages", spendUnavailable ? "—" : integer(data.totals.volume), spendUnavailable ? "Unavailable" : `${percent(data.totals.freeVolume, data.totals.volume)}% were free`)}
        </View>
        <View style={s.card}><View style={s.row}><View style={s.sectionIcon}><Ionicons name="pie-chart-outline" size={18} color={colors.primaryText} /></View><Text style={s.sectionTitle}>Spend by message type</Text></View>
          {spendUnavailable ? <Text style={s.hint}>Meta’s spend data is currently unavailable.</Text> : !data.byCategory.length ? <Text style={s.hint}>No messages in this period.</Text> : <>
            <View style={s.track}>{data.byCategory.filter(c => c.cost > 0).map(c => <View key={c.category} style={{ flex: c.cost, backgroundColor: categories[c.category]?.color || colors.hint }} />)}</View>
            {data.byCategory.map(c => <View key={c.category} style={s.item}><View style={s.row}><View style={[s.dot, { backgroundColor: categories[c.category]?.color || colors.hint }]} /><Text style={[s.title, s.fill]}>{categories[c.category]?.label || c.category}</Text><Text style={s.title}>{money(c.cost)}</Text></View><Text style={s.hint}>{integer(c.volume)} messages · {integer(c.freeVolume)} free · {percent(c.cost, data.totals.cost)}% of spend</Text></View>)}
          </>}
        </View>
        <View style={s.card}><View style={s.row}><View style={s.sectionIcon}><Ionicons name="bar-chart-outline" size={18} color={colors.primaryText} /></View><Text style={s.sectionTitle}>Daily spend</Text></View>
          {spendUnavailable ? <Text style={s.hint}>Daily spend is currently unavailable.</Text> : !data.daily.length ? <Text style={s.hint}>No spend data in this period.</Text> : <>
            <Text style={s.hint}>Tap a bar to see spend and message count.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={s.chart}>{data.daily.map(d => <Pressable key={d.date} accessibilityRole="button" accessibilityLabel={`${dateLabel(d.date)}: ${money(d.cost)}, ${integer(d.volume)} messages`} onPress={() => setSelectedDate(d.date)} style={s.barSlot}><View style={{ height: Math.max(d.cost > 0 ? 2 : 0, d.cost / maxDaily * 140), width: 14, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: colors.success, opacity: selectedDate === d.date ? 1 : 0.4 }} /></Pressable>)}</View></ScrollView>
            <View style={s.row}><Text style={[s.hint, s.fill]}>{dateLabel(data.daily[0].date)}</Text><Text style={s.hint}>{dateLabel(data.daily[data.daily.length - 1].date)}</Text></View>
            {hot && <Text accessibilityLiveRegion="polite" style={s.chartDetail}>{dateLabel(hot.date)} · {money(hot.cost)} · {integer(hot.volume)} messages</Text>}
          </>}
        </View>
        <View style={s.card}><View style={s.row}><View style={s.sectionIcon}><Ionicons name="documents-outline" size={18} color={colors.primaryText} /></View><Text style={s.sectionTitle}>Template performance</Text></View><Text style={s.hint}>Delivery and engagement, as counted by Meta</Text>
          {!data.templates.length ? <Text style={s.hint}>{templatesUnavailable ? "Template results are currently unavailable." : "No template results for this period yet. Analytics counts messages sent after it was enabled for your account."}</Text> : data.templates.map(t => <View key={t.template_id} style={s.templateCard}><Text style={s.title}>{t.name}</Text><View style={s.templateGrid}>
            {[{ label: "Sent", count: t.sent, rate: null }, { label: "Delivered", count: t.delivered, rate: percent(t.delivered, t.sent) }, { label: "Read", count: t.read, rate: percent(t.read, t.sent) }, { label: "Button clicks", count: t.clicked, rate: percent(t.clicked, t.sent) }].map(item => <View key={item.label} style={s.templateMetric}><Text style={s.hint}>{item.label}</Text><View style={s.row}><Text style={s.templateValue}>{integer(item.count)}</Text>{item.rate !== null && <Text style={s.rateBadge}>{item.rate}%</Text>}</View></View>)}
          </View>{Object.entries(t.clicks).map(([label, count]) => <Text key={label} style={s.hint}>{label}: {integer(count)}</Text>)}</View>)}
        </View>
      </>}
    </ScrollView>}
  </SafeAreaView>;
}

const styles = (c: ThemeColors) => StyleSheet.create({
  eyebrow: { color: c.text2, fontSize: 10, letterSpacing: 1.5, fontWeight: "700", marginBottom: 3 },
  headerIcon: { backgroundColor: c.backgroundSelected, width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 2 },
  spendMetric: { backgroundColor: c.backgroundSelected, borderColor: c.backgroundSelected },
  freeMetric: { backgroundColor: c.dashboardRevenueBg, borderColor: c.dashboardRevenueBg },
  billedMetric: { backgroundColor: c.dashboardAppointmentBg, borderColor: c.dashboardAppointmentBg },
  allMetric: { backgroundColor: c.dashboardWarningBg, borderColor: c.dashboardWarningBg },
  metricIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
  metricHeading: { minHeight: 40 },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.backgroundSelected, alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: c.heading, fontSize: 16, fontWeight: "700", flex: 1 },
  chartDetail: { color: c.primaryText, backgroundColor: c.backgroundSelected, padding: 12, borderRadius: 12, fontSize: 12, lineHeight: 19 },
  templateCard: { backgroundColor: c.bg, borderRadius: 16, padding: 14, gap: 14 },
  templateMetric: { flexBasis: "45%", flexGrow: 1, gap: 4 },
  templateValue: { color: c.heading, fontSize: 18, fontWeight: "700", flexShrink: 1 },
  rateBadge: { color: c.primaryText, backgroundColor: c.backgroundSelected, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, fontSize: 10, fontWeight: "700" },
  root: { flex: 1, backgroundColor: c.bg }, header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 12 }, heading: { color: c.heading, fontSize: 22, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32, gap: 14, maxWidth: 760, width: "100%", alignSelf: "center" }, intro: { color: c.text2, fontSize: 14, lineHeight: 22 }, hint: { color: c.text2, fontSize: 12, lineHeight: 19 },
  periods: { flexDirection: "row", borderRadius: 16, padding: 4, gap: 4, backgroundColor: c.bg2 }, period: { flex: 1, alignItems: "center", justifyContent: "center", padding: 10, minHeight: 44, borderRadius: 12 }, periodText: { color: c.heading, fontSize: 12, fontWeight: "700" }, active: { backgroundColor: c.primary }, activeText: { color: c.onPrimary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, metric: { flexGrow: 1, flexBasis: "46%", backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 20, padding: 14, gap: 10 }, metricLabel: { color: c.text2, fontSize: 12, fontWeight: "600", flex: 1 }, value: { color: c.heading, fontSize: 28, fontWeight: "700" },
  card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 18, gap: 16 }, title: { color: c.heading, fontSize: 14, fontWeight: "700", flexShrink: 1 }, row: { flexDirection: "row", alignItems: "center", gap: 8 }, fill: { flex: 1 }, item: { paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, gap: 8 }, dot: { width: 8, height: 8, borderRadius: 4 }, track: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: c.bg2 }, chart: { flexDirection: "row", height: 154, alignItems: "flex-end", borderBottomWidth: 1, borderBottomColor: c.border }, barSlot: { width: 24, height: 154, alignItems: "center", justifyContent: "flex-end" }, templateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, empty: { padding: 32, gap: 12, color: c.text2 }, warning: { backgroundColor: c.warningBg, borderRadius: 14, padding: 16, gap: 8 },
});
