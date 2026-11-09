import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { DateRangePickerSheet } from "@/components/ui/DateRangePickerSheet";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl } from "@/components/auth/pearl/tokens";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { hasCustomPermission } from "@/utils/permissions";
import { dateRangeLabel } from "@/utils/dateRangePresets";
import { getApiErrorMessage } from "@/services/api";
import { marketingService } from "@/services/marketing.service";
import type { MarketingDashboard } from "@/types/marketing";
import {
  filterMarketingCampaigns,
  marketingSeries,
  percent,
} from "./marketingPresentation";
import {
  MarketingHeader,
  MarketingChip,
  MarketingStat,
  m,
} from "./MarketingPearl";
const fmt = (n: number) => n.toLocaleString("en-IN");
const statusLabel = (status: string) =>
  ({
    COMPLETED: "Finished",
    RUNNING: "Running",
    SENDING: "Running",
    SCHEDULED: "Scheduled",
    PENDING: "Scheduled",
    FAILED: "Failed",
    PAUSED: "Paused",
  })[status] || status;
const sentDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : `Sent ${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
};
export default function MarketingDashboardScreen() {
  const user = useAppSelector(selectCurrentUser);
  return <Dashboard key={`${user?.id}:${user?.salonId}`} />;
}
function Dashboard() {
  const user = useAppSelector(selectCurrentUser);
  const can = (permission: string) =>
    Boolean(
      user &&
        (["salon_owner", "admin"].includes((user.role || "").toLowerCase()) ||
          hasCustomPermission(user, permission)),
    );
  const allowed = can("view_marketing_dashboard");
  const [result, setResult] = useState<{
    data: MarketingDashboard | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: true, error: null });
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("ALL");
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [datesOpen, setDatesOpen] = useState(false);
  const [hotDate, setHotDate] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!allowed) return;
      const controller = new AbortController();
      setResult({ data: null, loading: true, error: null });
      void marketingService
        .getDashboard(controller.signal)
        .then((data) => {
          if (!controller.signal.aborted)
            setResult({ data, loading: false, error: null });
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setResult({
              data: null,
              loading: false,
              error: getApiErrorMessage(error),
            });
        });
      return () => controller.abort();
      // Pull-to-refresh intentionally reruns the same salon request.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowed, revision]),
  );
  const { data, loading, error } = result;
  const filtered = useMemo(
    () =>
      status === "SCHEDULED"
        ? (data?.campaigns ?? []).filter((c) =>
            ["SCHEDULED", "PENDING"].includes(c.status),
          )
        : filterMarketingCampaigns(data?.campaigns ?? [], status, null, null),
    [data, status],
  );
  const series = useMemo(
    () => marketingSeries(data?.campaigns ?? [], start, end),
    [data, start, end],
  );
  const max = Math.max(1, ...series.map((d) => d.sent));
  const activeDays = series.filter((d) => d.sent > 0).length;
  const hot = series.find((d) => d.date === hotDate);
  const config = data?.config;
  const used = data?.stats.sentToday ?? 0;
  const limit = config?.dailyLimit ?? 0;
  const unlimited = limit >= 999999999;
  const usage =
    limit > 0 && !unlimited ? Math.min(100, (used / limit) * 100) : 0;
  const quality =
    { GREEN: "High", YELLOW: "Medium", RED: "Low" }[
      config?.qualityRating || ""
    ] || "Unavailable";
  const refresh = () => setRevision((v) => v + 1);
  const count = (value: string) =>
    (data?.campaigns ?? []).filter((c) =>
      value === "RUNNING"
        ? ["RUNNING", "SENDING"].includes(c.status)
        : value === "SCHEDULED"
          ? ["SCHEDULED", "PENDING"].includes(c.status)
          : c.status === value,
    ).length;
  return (
    <PearlBackground>
      <SafeAreaView edges={["top", "bottom"]} style={m.root}>
        <AppStatusBar />
        <MarketingHeader
          title="Marketing"
          subtitle="WhatsApp campaigns & limits"
          right={
            <View style={m.row}>
              {can("view_inbox") && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Inbox"
                  style={m.iconButton}
                  onPress={() => router.push("/inbox" as Href)}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={19}
                    color={pearl.ink}
                  />
                </Pressable>
              )}
              {can("view_marketing_analytics") && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Insights"
                  style={m.iconButton}
                  onPress={() => router.push("/marketing/insights" as Href)}
                >
                  <Ionicons
                    name="bar-chart-outline"
                    size={19}
                    color={pearl.ink}
                  />
                </Pressable>
              )}
            </View>
          }
        />
        {!allowed ? (
          <Text translate style={m.empty}>
            You don’t have permission to view the marketing dashboard.
          </Text>
        ) : (
          <ScrollView
            contentContainerStyle={m.content}
            refreshControl={
              <RefreshControl
                refreshing={loading && revision > 0}
                onRefresh={refresh}
                tintColor={pearl.accent}
              />
            }
          >
            {loading ? (
              <ActivityIndicator style={{ margin: 32 }} color={pearl.accent} />
            ) : error ? (
              <View style={m.card}>
                <Text translate style={m.error}>{error}</Text>
                <MarketingChip label="Retry" onPress={refresh} />
              </View>
            ) : (
              data && (
                <>
                  <View style={m.card}>
                    <View style={m.row}>
                      <View style={[m.icon, { width: 40, height: 40 }]}>
                        <Ionicons
                          name="logo-whatsapp"
                          size={20}
                          color={pearl.accentDeep}
                        />
                      </View>
                      <View style={m.fill}>
                        <Text style={m.title}>
                          {config?.displayPhone || "Number unavailable"}
                        </Text>
                        <Text style={m.small}>
                          {config?.isVerified
                            ? `Connected · Quality ${quality}`
                            : "Not connected"}
                        </Text>
                      </View>
                      {config?.isVerified && (
                        <Text translate
                          style={[
                            m.badge,
                            quality !== "High" && {
                              color: pearl.warningText,
                              backgroundColor: pearl.warningBg,
                            },
                          ]}
                        >
                          {quality === "High"
                            ? "● Healthy"
                            : quality === "Low"
                              ? "● Low quality"
                              : quality === "Medium"
                                ? "● Medium quality"
                                : "Quality unavailable"}
                        </Text>
                      )}
                    </View>
                    <View>
                      <View style={[m.between, { flexWrap: "wrap" }]}>
                        <Text translate style={m.small}>Daily message limit</Text>
                        <Text style={[m.title, { fontSize: 11 }]}>
                          {unlimited
                            ? `${fmt(used)} used today · Unlimited`
                            : limit > 0
                              ? `${fmt(used)} of ${fmt(limit)} used today (${Math.round(usage)}%)`
                              : "—"}
                        </Text>
                      </View>
                      <View style={m.track}>
                        <View style={[m.bar, { width: `${usage}%` }]} />
                      </View>
                    </View>
                  </View>
                  <View style={m.grid}>
                    <MarketingStat
                      label="Campaigns"
                      value={fmt(data.stats.totalCampaigns)}
                      hint={`${fmt(data.stats.completedCampaigns)} finished`}
                      icon="paper-plane-outline"
                    />
                    <MarketingStat
                      label="Delivered"
                      value={`${percent(data.stats.totalDelivered, data.stats.totalSent)}%`}
                      icon="checkmark-outline"
                      tone="lilac"
                    />
                    <MarketingStat
                      label="Read"
                      value={`${percent(data.stats.totalRead, data.stats.totalSent)}%`}
                      icon="eye-outline"
                      tone="peach"
                    />
                  </View>
                  <View style={m.between}>
                    <Text style={m.section}>
                      Messages sent
                      {series.length
                        ? ` · ${new Date(`${series[series.length - 1].date}T12:00:00`).toLocaleDateString("en-IN", { month: "long" })}`
                        : ""}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setDatesOpen(true)}
                    >
                      <Text style={[m.small, { color: pearl.accentDeep }]}>
                        {start && end
                          ? dateRangeLabel(start, end)
                          : "Last 30 days"}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={[m.card, { padding: 12 }]}>
                    <View style={m.chart}>
                      {series.map((day) => (
                        <Pressable
                          key={day.date}
                          accessibilityRole="button"
                          accessibilityLabel={`${day.label}: ${fmt(day.sent)} sent`}
                          onPress={() => setHotDate(day.date)}
                          style={m.barSlot}
                        >
                          <View
                            style={{
                              height: Math.max(6, (day.sent / max) * 100),
                              backgroundColor: day.sent
                                ? pearl.accent
                                : "rgba(126,120,176,.10)",
                              overflow: "hidden",
                              borderRadius: 4,
                              opacity:
                                hotDate && hotDate !== day.date ? 0.55 : 1,
                            }}
                          >
                            {!day.sent &&
                              [0, 5, 10, 15].map((left) => (
                                <View
                                  key={left}
                                  style={{
                                    position: "absolute",
                                    left,
                                    top: -2,
                                    height: 12,
                                    width: 2,
                                    backgroundColor: "rgba(126,120,176,.25)",
                                    transform: [{ rotate: "35deg" }],
                                  }}
                                />
                              ))}
                          </View>
                        </Pressable>
                      ))}
                    </View>
                    <View style={m.between}>
                      {[
                        0,
                        Math.floor((series.length - 1) / 2),
                        series.length - 1,
                      ]
                        .filter((i) => i >= 0)
                        .map((i, index) => (
                          <Text translate key={index} style={m.small}>
                            {series[i]?.label}
                          </Text>
                        ))}
                    </View>
                    {hot && (
                      <Text accessibilityLiveRegion="polite" style={m.body}>
                        {hot.label} · {fmt(hot.sent)} sent
                      </Text>
                    )}
                    <Text style={[m.small, { textAlign: "center" }]}>
                      {activeDays === 0
                        ? "No messages sent in this period."
                        : `${activeDays < 7 ? "Quiet month: " : ""}${activeDays} campaign ${activeDays === 1 ? "day" : "days"}. Striped bars mean nothing was sent.`}
                    </Text>
                  </View>
                  <Text translate style={m.section}>Campaigns</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={m.chips}
                  >
                    {["ALL", "RUNNING", "SCHEDULED", "COMPLETED", "FAILED"].map(
                      (value) => (
                        <MarketingChip
                          key={value}
                          label={
                            value === "ALL"
                              ? "All"
                              : `${statusLabel(value)} ${count(value)}`
                          }
                          selected={status === value}
                          onPress={() => setStatus(value)}
                        />
                      ),
                    )}
                  </ScrollView>
                  {filtered.length ? (
                    filtered.map((c) => (
                      <View key={c.id} style={m.card}>
                        <View style={m.between}>
                          <View style={m.fill}>
                            <Text style={m.title}>{c.name}</Text>
                            <Text style={m.small}>
                              {sentDate(c.created_at)}
                            </Text>
                          </View>
                          <Text
                            style={[
                              m.badge,
                              c.status === "FAILED"
                                ? {
                                    color: pearl.dangerText,
                                    backgroundColor: pearl.dangerBg,
                                  }
                                : c.status !== "COMPLETED"
                                  ? {
                                      color: pearl.warningText,
                                      backgroundColor: pearl.warningBg,
                                    }
                                  : {},
                            ]}
                          >
                            ● {statusLabel(c.status)}
                          </Text>
                        </View>
                        <View style={[m.row, { paddingVertical: 8 }]}>
                          {[
                            { label: "Sent", n: c.sent_count },
                            { label: "Delivered", n: c.delivered_count },
                            { label: "Read", n: c.read_count },
                          ].map((item) => (
                            <View key={item.label} style={[m.fill, { gap: 4 }]}>
                              <Text translate style={m.small}>{item.label}</Text>
                              <Text style={m.title}>{fmt(item.n)}</Text>
                            </View>
                          ))}
                        </View>
                        <Text style={m.small}>
                          {fmt(c.failed_count)} failed
                        </Text>
                      </View>
                    ))
                  ) : (
                    <View style={m.card}>
                      <Text translate style={m.empty}>
                        {status === "ALL"
                          ? "No campaigns yet. Your campaign performance will appear here."
                          : "No campaigns to show."}
                      </Text>
                    </View>
                  )}
                </>
              )
            )}
          </ScrollView>
        )}
        <DateRangePickerSheet
          pearlStyle
          centered={false}
          visible={datesOpen}
          startDate={start}
          endDate={end}
          allowAllTime
          onClose={() => setDatesOpen(false)}
          onApply={(a, b) => {
            setStart(a);
            setEnd(b);
            setHotDate(null);
            setDatesOpen(false);
          }}
        />
      </SafeAreaView>
    </PearlBackground>
  );
}
