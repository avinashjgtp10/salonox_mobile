import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { DateRangePickerSheet } from "@/components/ui/DateRangePickerSheet";
import { FilterSheet } from "@/components/ui/FilterSheet";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ThemeColors } from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { hasCustomPermission } from "@/utils/permissions";
import { maskPhone } from "@/utils/maskPhone";
import { dateRangeLabel } from "@/utils/dateRangePresets";
import { getApiErrorMessage } from "@/services/api";
import { marketingService } from "@/services/marketing.service";
import { filterMarketingCampaigns, marketingSeries, marketingStatusParts, metricColors, percent, rollupMarketingCampaigns, type MarketingMetric } from "./marketingPresentation";

const fmt = (n: number) => n.toLocaleString("en-IN");
const metricNames: MarketingMetric[] = ["sent", "delivered", "read", "failed"];
const titleCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
const statuses = ["RUNNING", "COMPLETED", "PAUSED", "FAILED", "SCHEDULED"];

function useDashboardResource<T>(load: (signal: AbortSignal) => Promise<T>, revision: number, enabled: boolean) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null; revision: number }>({ data: null, loading: true, error: null, revision });
  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    const controller = new AbortController();
    // Clear old page/salon values before rendering a different request.
    setState({ data: null, loading: true, error: null, revision });
    void load(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ data, loading: false, error: null, revision });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ data: null, loading: false, error: getApiErrorMessage(error), revision });
    });
    return () => controller.abort();
  }, [load, revision, enabled]));
  return { ...state, loading: state.loading || state.revision !== revision };
}

function Ring({ parts, size, children }: { parts: { value: number; color: string }[]; size: number; children: ReactNode }) {
  const total = parts.reduce((n, p) => n + p.value, 0);
  const circumference = 2 * Math.PI * 54;
  let offset = 0;
  const arcs = parts.filter(p => p.value > 0).map(p => {
    const length = total ? p.value / total * circumference : 0;
    const circle = `<circle cx="70" cy="70" r="54" fill="none" stroke="${p.color}" stroke-width="16" stroke-dasharray="${Math.max(0, length - 1)} ${circumference}" stroke-dashoffset="${-offset}"/>`;
    offset += length;
    return circle;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140"><g transform="rotate(-90 70 70)"><circle cx="70" cy="70" r="54" fill="none" stroke="#e8e8e6" stroke-width="16"/>${arcs}</g></svg>`;
  return <View style={{ width: size, height: size, flexShrink: 0, alignItems: "center", justifyContent: "center" }}>
    <Image accessibilityElementsHidden importantForAccessibility="no-hide-descendants" source={{ uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` }} style={StyleSheet.absoluteFill} />
    {children}
  </View>;
}

export default function MarketingDashboardScreen() {
  const user = useAppSelector(selectCurrentUser);
  // Key the screen to the authenticated salon to prevent cross-session dashboard state.
  return <Dashboard key={`${user?.id}:${user?.salonId}`} />;
}

function Dashboard() {
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const user = useAppSelector(selectCurrentUser);
  const allowed = Boolean(user && (["salon_owner", "admin"].includes((user.role || "").toLowerCase()) || hasCustomPermission(user, "view_marketing_dashboard")));
  const can = (permission: string) => Boolean(user && (["salon_owner", "admin"].includes((user.role || "").toLowerCase()) || hasCustomPermission(user, permission)));
  const [revision, setRevision] = useState(0);
  const [templatePage, setTemplatePage] = useState(1);
  const [contactPage, setContactPage] = useState(1);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [status, setStatus] = useState("ALL");
  const [tab, setTab] = useState("all");
  const [metric, setMetric] = useState<MarketingMetric>("sent");
  const [hotDate, setHotDate] = useState<string | null>(null);
  const [datesOpen, setDatesOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const loadDashboard = useCallback((signal: AbortSignal) => marketingService.getDashboard(signal), []);
  const loadTemplates = useCallback((signal: AbortSignal) => marketingService.getTopTemplates(templatePage, signal), [templatePage]);
  const loadContacts = useCallback((signal: AbortSignal) => marketingService.getEngagedContacts(contactPage, signal), [contactPage]);
  const main = useDashboardResource(loadDashboard, revision, allowed);
  const templates = useDashboardResource(loadTemplates, revision, allowed);
  const contacts = useDashboardResource(loadContacts, revision, allowed);
  const refresh = () => setRevision(value => value + 1);
  const data = main.data;
  const filtered = useMemo(() => filterMarketingCampaigns(data?.campaigns ?? [], status, start, end), [data, status, start, end]);
  const activeFilters = status !== "ALL" || !!start || !!end;
  const totals = data ? activeFilters ? rollupMarketingCampaigns(filtered) : data.stats : null;
  const series = useMemo(() => marketingSeries(filtered, start, end), [filtered, start, end]);
  const selectedDay = series.find(d => d.date === hotDate);
  const maxMetric = Math.max(1, ...series.map(d => d[metric]));
  const performance = (activeFilters ? [...filtered].sort((a, b) => b.sent_count - a.sent_count).slice(0, 8) : data?.stats.topCampaigns ?? []).filter(c =>
    tab === "all" || (tab === "active" && ["RUNNING", "SENDING"].includes(c.status)) || (tab === "completed" && c.status === "COMPLETED") || (tab === "scheduled" && ["SCHEDULED", "PENDING"].includes(c.status)));
  const config = data?.config;
  const dailyLimit = config?.dailyLimit ?? 0;
  const unlimited = dailyLimit >= 999999999;
  const used = data?.stats.sentToday ?? 0;
  const usage = dailyLimit > 0 && !unlimited ? Math.min(100, used / dailyLimit * 100) : 0;
  const usageColor = usage >= 100 ? metricColors.failed : usage >= 80 ? metricColors.blocked : metricColors.sent;
  const button = (label: string, onPress: () => void, selected = false) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[s.button, selected && s.selected]}><Text style={[s.buttonText, selected && s.selectedText]}>{label}</Text></Pressable>;
  const card = (title: string, subtitle: string, icon: keyof typeof Ionicons.glyphMap, body: ReactNode) => <View style={s.card}>
    <View style={s.row}><View style={s.icon}><Ionicons name={icon} size={17} color={metricColors.sent} /></View><Text style={[s.cardTitle, s.fill]}>{title}</Text></View>
    <Text style={s.subtitle}>{subtitle}</Text>{body}
  </View>;
  const empty = (message: string) => <Text style={s.empty}>{message}</Text>;
  const errorView = (message: string) => <View accessibilityRole="alert" style={s.errorBox}><Text style={s.errorText}>{message}</Text>{button("Retry", refresh)}</View>;
  const pager = (page: number, total: number, update: (page: number) => void) => total > 10 ? <View style={[s.row, s.pager]}>
    <Pressable accessibilityRole="button" disabled={page <= 1} onPress={() => update(page - 1)} style={[s.button, page <= 1 && s.disabled]}><Text style={s.buttonText}>Previous</Text></Pressable>
    <Text style={s.meta}>{page} / {Math.max(1, Math.ceil(total / 10))}</Text>
    <Pressable accessibilityRole="button" disabled={page * 10 >= total} onPress={() => update(page + 1)} style={[s.button, page * 10 >= total && s.disabled]}><Text style={s.buttonText}>Next</Text></Pressable>
  </View> : null;
  const rate = (label: string, value: number, color: string) => <View style={[s.fill, { gap: 6 }]}><View style={s.row}><Text style={[s.meta, s.fill]}>{label}</Text><Text style={{ color, fontSize: 12, fontWeight: "700" }}>{Math.round(value)}%</Text></View><View style={s.track}><View style={{ backgroundColor: color, width: `${Math.max(0, Math.min(100, value))}%`, height: 5, borderRadius: 4 }} /></View></View>;

  return <SafeAreaView edges={["top", "bottom"]} style={s.root}>
    <AppStatusBar />
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.canGoBack() ? router.back() : router.replace("/dashboard" as Href)} style={s.back}><Ionicons name="arrow-back" size={22} color={colors.heading} /></Pressable><Text style={[s.cardTitle, s.fill]}>Marketing</Text>{can("view_inbox") && button("Inbox", () => router.push("/inbox" as Href))}</View>
    {!allowed ? empty("You don’t have permission to view the marketing dashboard.") : <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={main.loading && revision > 0} onRefresh={refresh} tintColor={colors.primary} />}>
      <Text style={s.eyebrow}>MARKETING</Text><Text style={s.title}>WhatsApp Marketing</Text><Text style={s.subtitle}>Reach. Engage. Bring more clients to your salon.</Text>
      <View style={s.wrap}>{button(start && end ? dateRangeLabel(start, end) : "All time", () => setDatesOpen(true))}{button(status === "ALL" ? "Filters" : titleCase(status), () => setFiltersOpen(true), status !== "ALL")}</View>
      {main.loading ? <ActivityIndicator style={{ margin: 32 }} color={colors.primary} /> : main.error ? errorView(main.error) : data && totals && <>
        <View style={s.connection}>
          <View style={s.row}><View style={s.connectionIcon}><Ionicons name="logo-whatsapp" size={24} color="#00866b" /></View><View style={s.fill}><Text style={s.connectionTitle}>{config?.isVerified ? "WhatsApp Connected" : "WhatsApp Not Connected"}</Text><Text style={s.connectionMeta}>{config?.displayPhone || "No WhatsApp number connected"}</Text></View><View style={[s.dot, { backgroundColor: config?.isVerified ? metricColors.sent : "#f59e0b" }]} /></View>
          <Text style={{ color: config?.qualityRating === "GREEN" ? "#00866b" : config?.qualityRating === "YELLOW" ? "#946200" : config?.qualityRating === "RED" ? "#c43232" : "#526b62", marginTop: 12 }}>{config?.qualityRating === "GREEN" ? "● High quality" : config?.qualityRating === "YELLOW" ? "● Medium quality" : config?.qualityRating === "RED" ? "● Low quality" : "Quality unavailable"}</Text>
          <View style={s.limitRow}>
            <View style={s.limitDetails}>
              <Text style={s.connectionMeta}>Daily Limit (Business Tier)</Text>
              <View style={s.limitValueRow}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[s.limit, s.limitNumber]}>{unlimited ? "Unlimited" : dailyLimit ? fmt(dailyLimit) : "Unavailable"}</Text>
                {dailyLimit > 0 && !unlimited && <Text style={[s.connectionMeta, s.limitUnit]}>messages/day</Text>}
              </View>
              <View style={s.usageDetails}>
                <Text style={s.connectionMeta}>{fmt(used)} used</Text>
                {dailyLimit > 0 && !unlimited && <Text style={s.connectionMeta}>{fmt(Math.max(0, dailyLimit - used))} remaining</Text>}
              </View>
            </View>
            {dailyLimit > 0 && !unlimited && <Ring size={84} parts={[{ value: usage, color: usageColor }, { value: 100 - usage, color: "#cce6dc" }]}><Text style={s.connectionTitle}>{Math.round(usage)}%</Text></Ring>}
          </View>
          {dailyLimit > 0 && !unlimited && <View style={[s.track, { backgroundColor: "#cce6dc" }]}><View style={{ width: `${usage}%`, backgroundColor: usageColor, height: 5, borderRadius: 4 }} /></View>}
        </View>
        {!data.campaigns.length && !totals.totalSent && !activeFilters && <View style={s.card}><Text style={s.cardTitle}>No campaigns yet</Text><Text style={s.subtitle}>Create a WhatsApp template, then launch your first campaign. Your performance will appear here.</Text></View>}
        {card("Campaigns Overview", "Total campaigns and message performance.", "paper-plane-outline", <>
          <Text style={s.done}>{fmt(totals.completedCampaigns)} of {fmt(totals.totalCampaigns)} campaigns done</Text>
          <View style={s.wrap}>{metricNames.map(m => button(titleCase(m), () => { setMetric(m); setHotDate(null); }, metric === m))}</View>
          <Text style={s.meta}>Daily {metric} · {series.length ? `${series[0].label} – ${series[series.length - 1].label}` : "No dates"}</Text>
          <View style={s.chart}>{series.map(day => <Pressable key={day.date} accessibilityRole="button" accessibilityLabel={`${day.label}: ${fmt(day[metric])} ${metric}`} onPress={() => setHotDate(day.date)} style={s.barSlot}><View style={{ height: Math.max(2, day[metric] / maxMetric * 138), backgroundColor: metricColors[metric], opacity: hotDate === day.date ? 1 : 0.4, width: "100%", borderTopLeftRadius: 3, borderTopRightRadius: 3 }} /></Pressable>)}</View>
          <View style={s.row}>{[0, Math.floor((series.length - 1) / 2), series.length - 1].filter(i => i >= 0).map((i, index) => <Text key={index} style={[s.meta, s.fill, { textAlign: index === 0 ? "left" : index === 1 ? "center" : "right" }]}>{series[i]?.label}</Text>)}</View>
          {selectedDay && <Text accessibilityLiveRegion="polite" style={s.chartDetail}>{selectedDay.label}: {metricNames.map(m => `${titleCase(m)} ${fmt(selectedDay[m])}`).join(" · ")}</Text>}
        </>)}
        {card("Campaign Performance", "Track delivery and engagement for your campaigns.", "megaphone-outline", <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{["all", "active", "completed", "scheduled"].map(t => button(t === "all" ? "All Campaigns" : titleCase(t), () => setTab(t), tab === t))}</ScrollView>
          {performance.length ? performance.map(c => <View key={c.id} style={s.item}>
            <View style={s.row}><View style={s.avatar}><Text style={s.avatarText}>{c.name.charAt(0).toUpperCase()}</Text></View><Text style={[s.itemTitle, s.fill]}>{c.name}</Text><Text style={[s.badge, { color: c.status === "FAILED" ? metricColors.failed : metricColors.sent }]}>{titleCase(c.status)}</Text></View>
            <View style={[s.row, { marginVertical: 10 }]}><Text style={[s.meta, s.fill]}>Sent <Text style={s.itemTitle}>{fmt(c.sent_count)}</Text></Text><Text style={s.meta}>Failed <Text style={{ color: c.failed_count ? metricColors.failed : colors.text2 }}>{fmt(c.failed_count)}</Text></Text></View>
            <View style={[s.row, { gap: 18 }]}>{rate("Delivered", c.delivery_rate, metricColors.delivered)}{rate("Read rate", c.read_rate, metricColors.read)}</View>
            {!!c.created_at && <Text style={[s.meta, { marginTop: 10 }]}>{new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Text>}
          </View>) : empty("No campaigns to show")}
        </>)}
        {card("Message Status", "Overall delivery status for the selected period.", "checkmark-done-outline", <View style={s.statusRow}>
          <Ring size={140} parts={marketingStatusParts(totals)}><Text style={s.total}>{fmt(totals.totalSent)}</Text><Text style={s.meta}>Total Sent</Text></Ring>
          <View style={[s.fill, { gap: 14, minWidth: 145 }]}>{[{ label: "Delivered", n: totals.totalDelivered, color: metricColors.delivered }, { label: "Read", n: totals.totalRead, color: metricColors.read }, { label: "Failed", n: totals.totalFailed, color: metricColors.failed }, { label: "Blocked", n: totals.totalBlocked, color: metricColors.blocked }].map(item => <View key={item.label} style={[s.row, { gap: 5 }]}><View style={[s.dot, { backgroundColor: item.color }]} /><Text style={[s.meta, s.fill]}>{item.label}</Text><Text style={s.itemTitle}>{fmt(item.n)}</Text><Text style={[s.meta, { width: 32, textAlign: "right" }]}>{percent(item.n, totals.totalSent)}%</Text></View>)}</View>
        </View>)}
      </>}
      {card("Top Performing Templates", "Templates with the highest usage and engagement. All time.", "eye-outline", templates.loading ? <ActivityIndicator color={colors.primary} /> : templates.error ? errorView(templates.error) : <>
        {templates.data?.rows.length ? templates.data.rows.map((t, i) => <View key={t.template_id} style={s.item}><View style={s.row}><View style={[s.rank, templatePage === 1 && i === 0 && s.topRank]}><Text style={templatePage === 1 && i === 0 ? s.selectedText : s.meta}>{(templatePage - 1) * 10 + i + 1}</Text></View><View style={s.fill}><Text style={s.itemTitle}>{t.template_name}</Text><Text style={s.meta}>Used in {t.times_used} campaigns · {fmt(t.total_sent)} sent</Text></View></View><View style={[s.row, { marginTop: 10, gap: 18 }]}>{rate("Read", t.avg_read_rate, metricColors.read)}{rate("Delivered", percent(t.total_delivered, t.total_sent), metricColors.delivered)}</View></View>) : empty("No template data yet")}
        {pager(templatePage, templates.data?.total ?? 0, setTemplatePage)}
      </>)}
      {card("Most Engaged Contacts", "Contacts who consistently read your messages. All time.", "chatbubble-outline", contacts.loading ? <ActivityIndicator color={colors.primary} /> : contacts.error ? errorView(contacts.error) : <>
        {contacts.data?.rows.length ? contacts.data.rows.map(c => <View key={c.phone} style={[s.row, s.item]}><View style={[s.avatar, { backgroundColor: "#f1ebff" }]}><Text style={{ color: metricColors.read, fontWeight: "700" }}>{c.name ? c.name.trim().split(/\s+/).slice(0, 2).map(n => n.charAt(0)).join("").toUpperCase() : c.phone.slice(-2)}</Text></View><View style={s.fill}><Text style={s.itemTitle}>{c.name || maskPhone(c.phone)}</Text>{!!c.name && <Text style={s.meta}>{maskPhone(c.phone)}</Text>}</View><View style={s.contactMetric}><Text style={s.itemTitle}>{fmt(c.campaigns_read)}</Text><Text style={s.meta}>reads</Text></View><View style={s.contactMetric}><Text style={{ color: metricColors.read, fontWeight: "700" }}>{Math.round(c.read_rate)}%</Text><Text style={s.meta}>rate</Text></View></View>) : empty("No engagement data yet")}
        {pager(contactPage, contacts.data?.total ?? 0, setContactPage)}
      </>)}
    </ScrollView>}
    <DateRangePickerSheet visible={datesOpen} startDate={start} endDate={end} allowAllTime maximumDate={new Date()} onClose={() => setDatesOpen(false)} onApply={(a, b) => { setStart(a); setEnd(b); setHotDate(null); setDatesOpen(false); }} />
    <FilterSheet visible={filtersOpen} selected={{ status: status === "ALL" ? [] : [status] }} fields={[{ key: "status", label: "Campaign status", single: true, options: statuses.map(value => ({ id: value, label: titleCase(value) })) }]} onClose={() => setFiltersOpen(false)} onApply={value => { setStatus(value.status?.[0] ?? "ALL"); setHotDate(null); setFiltersOpen(false); }} />
  </SafeAreaView>;
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg }, fill: { flex: 1, minWidth: 0 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border },
  back: { padding: 10 }, content: { padding: 16, gap: 12, paddingBottom: 36 },
  eyebrow: { color: metricColors.sent, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  title: { color: c.heading, fontSize: 26, fontWeight: "800" },
  subtitle: { color: c.text2, fontSize: 13, lineHeight: 20, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 9 }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: { backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  cardTitle: { color: c.heading, fontSize: 16, fontWeight: "800" },
  icon: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#e4f5ef", alignItems: "center", justifyContent: "center" },
  button: { minHeight: 40, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: c.border, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  buttonText: { color: c.heading, fontSize: 12, fontWeight: "700" }, selected: { backgroundColor: metricColors.sent, borderColor: metricColors.sent }, selectedText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.35 }, tabs: { gap: 7, paddingBottom: 4 },
  connection: { backgroundColor: "#edf8f3", borderColor: "#cce6dc", borderWidth: 1, borderRadius: 16, padding: 18, gap: 4 },
  connectionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#d5eee2", alignItems: "center", justifyContent: "center" },
  connectionTitle: { color: "#163d30", fontWeight: "800", fontSize: 16 }, connectionMeta: { color: "#526b62", fontSize: 12, lineHeight: 20 },
  limitRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center", borderTopWidth: 1, borderTopColor: "#cce6dc", marginTop: 14, paddingTop: 14, paddingBottom: 8 },
  limitDetails: { flexGrow: 1, flexShrink: 1, flexBasis: 160, minWidth: 0 },
  limitValueRow: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  limitNumber: { flexShrink: 1, minWidth: 0 },
  limitUnit: { flexShrink: 0 },
  usageDetails: { marginTop: 8, gap: 2 },
  limit: { fontSize: 28, lineHeight: 40, fontWeight: "800", color: "#163d30", marginVertical: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 }, track: { height: 5, backgroundColor: c.border, borderRadius: 4, overflow: "hidden" },
  meta: { color: c.text2, fontSize: 11, lineHeight: 17 }, itemTitle: { color: c.heading, fontSize: 13, fontWeight: "700" },
  item: { borderTopWidth: 1, borderTopColor: c.border, paddingVertical: 14 },
  avatar: { height: 36, width: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#e4f5ef" }, avatarText: { color: "#00866b", fontWeight: "800" },
  badge: { fontSize: 10, fontWeight: "700", backgroundColor: c.bg, borderRadius: 10, padding: 6 },
  done: { color: "#00866b", backgroundColor: "#e4f5ef", padding: 9, borderRadius: 16, alignSelf: "flex-start", fontSize: 12, fontWeight: "700" },
  chart: { height: 150, flexDirection: "row", gap: 3, alignItems: "flex-end", borderBottomWidth: 1, borderBottomColor: c.border },
  barSlot: { flex: 1, height: "100%", justifyContent: "flex-end" }, chartDetail: { color: c.heading, fontSize: 12, lineHeight: 20, padding: 8, backgroundColor: c.bg, borderRadius: 8 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 10 }, total: { color: c.heading, fontSize: 25, fontWeight: "800" },
  rank: { width: 28, height: 28, backgroundColor: c.bg, borderRadius: 7, alignItems: "center", justifyContent: "center" }, topRank: { backgroundColor: metricColors.sent },
  contactMetric: { alignItems: "flex-end", gap: 3 }, pager: { justifyContent: "space-between", paddingTop: 6 },
  empty: { color: c.text2, textAlign: "center", padding: 24, fontSize: 13, lineHeight: 20 },
  errorBox: { backgroundColor: c.errorBg, borderRadius: 10, padding: 12, gap: 10 }, errorText: { color: c.error, fontSize: 13 },
});
