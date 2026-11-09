import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl } from "@/components/auth/pearl/tokens";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { hasCustomPermission } from "@/utils/permissions";
import { getApiErrorMessage } from "@/services/api";
import { marketingService } from "@/services/marketing.service";
import type { MarketingInsights } from "@/types/marketing";
import {
  MarketingHeader,
  MarketingChip,
  MarketingStat,
  m,
} from "./MarketingPearl";
const integer = (n: number) => n.toLocaleString("en-IN");
const percent = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;
const dateLabel = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
export default function MarketingInsightsScreen() {
  const user = useAppSelector(selectCurrentUser);
  return <Insights key={`${user?.id}:${user?.salonId}`} />;
}

function Insights() {
  const user = useAppSelector(selectCurrentUser);
  const allowed = Boolean(
    user &&
      (["salon_owner", "admin"].includes((user.role || "").toLowerCase()) ||
        hasCustomPermission(user, "view_marketing_analytics")),
  );
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [revision, setRevision] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [result, setResult] = useState<{
    data: MarketingInsights | null;
    error: string | null;
    loading: boolean;
  }>({ data: null, error: null, loading: true });
  useFocusEffect(
    useCallback(() => {
      if (!allowed) return;
      const controller = new AbortController();
      setSelectedDate(null);
      setResult({ data: null, error: null, loading: true });
      void marketingService
        .getInsights(days, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted)
            setResult({ data, error: null, loading: false });
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setResult({
              data: null,
              error: getApiErrorMessage(error),
              loading: false,
            });
        });
      return () => controller.abort();
      // The revision intentionally reruns the request for pull-to-refresh and Retry.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowed, days, revision]),
  );
  const { data, loading, error } = result;
  const refresh = () => setRevision((v) => v + 1);
  const money = (value: number) => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: data?.currency || "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${data?.currency || "INR"} ${value.toFixed(2)}`;
    }
  };
  const unavailable = data?.errors.some((e) => e.startsWith("Spend:"));
  const templatesUnavailable = data?.errors.some((e) =>
    e.startsWith("Templates:"),
  );
  const maxDaily = Math.max(
    0.0001,
    ...(data?.daily.map((day) => day.cost) ?? []),
  );
  const selectedDay = data?.daily.find((day) => day.date === selectedDate);
  const categoryNames: Record<string, string> = {
    MARKETING: "Marketing",
    UTILITY: "Utility",
    AUTHENTICATION: "Authentication",
    SERVICE: "Service (replies)",
  };
  return (
    <PearlBackground>
      <SafeAreaView edges={["top", "bottom"]} style={m.root}>
        <AppStatusBar />
        <MarketingHeader
          title="WhatsApp insights"
          subtitle="From Meta billing"
        />
        {!allowed ? (
          <Text style={m.empty}>
            You don’t have permission to view marketing insights.
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
            <View style={m.chips}>
              {([7, 30, 90] as const).map((period) => (
                <MarketingChip
                  key={period}
                  label={period + " days"}
                  selected={days === period}
                  onPress={() => {
                    if (days !== period) {
                      setDays(period);
                      setResult({ data: null, loading: true, error: null });
                    }
                  }}
                />
              ))}
            </View>
            <View style={m.note}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={pearl.warningText}
              />
              <Text style={[m.body, m.fill, { color: pearl.warningText }]}>
                Amounts exclude 18% GST and can lag up to 24 hours behind Meta.
              </Text>
            </View>
            {loading ? (
              <ActivityIndicator color={pearl.accent} style={{ margin: 32 }} />
            ) : error ? (
              <View accessibilityRole="alert" style={m.card}>
                <Text style={m.error}>{error}</Text>
                <MarketingChip label="Retry" onPress={refresh} />
              </View>
            ) : (
              data && (
                <>
                  {!!data.errors.length && (
                    <View accessibilityRole="alert" style={m.card}>
                      <Text style={m.title}>Some insights are unavailable</Text>
                      {data.errors.map((message, index) => (
                        <Text key={index} style={m.body}>
                          {message}
                        </Text>
                      ))}
                      <MarketingChip label="Retry" onPress={refresh} />
                    </View>
                  )}
                  <View style={m.grid}>
                    <MarketingStat
                      label="Billed amount"
                      value={unavailable ? "—" : money(data.totals.cost)}
                      hint={`Last ${data.days} days · before GST`}
                      icon="wallet-outline"
                    />
                    <MarketingStat
                      label="Billed messages"
                      value={
                        unavailable ? "—" : integer(data.totals.billableVolume)
                      }
                      icon="paper-plane-outline"
                      tone="lilac"
                      hint={
                        unavailable
                          ? "Unavailable"
                          : data.totals.billableVolume > 0
                            ? `${money(data.totals.cost / data.totals.billableVolume)} per message on average`
                            : "No billed messages"
                      }
                    />
                  </View>
                  <View style={m.grid}>
                    <MarketingStat
                      label="Free messages"
                      value={
                        unavailable ? "—" : integer(data.totals.freeVolume)
                      }
                      hint="Replies & free entry points"
                      icon="gift-outline"
                      tone="peach"
                    />
                    <MarketingStat
                      label="All messages"
                      value={unavailable ? "—" : integer(data.totals.volume)}
                      icon="chatbubble-outline"
                      hint={
                        unavailable
                          ? "Unavailable"
                          : `${percent(data.totals.freeVolume, data.totals.volume)}% were free`
                      }
                    />
                  </View>
                  <Text style={m.section}>Spend by message type</Text>
                  <View style={m.card}>
                    {unavailable ? (
                      <Text style={m.body}>
                        Meta’s spend data is currently unavailable.
                      </Text>
                    ) : !data.byCategory.length ? (
                      <Text style={m.empty}>No messages in this period.</Text>
                    ) : (
                      data.byCategory.map((category, index) => (
                        <View key={category.category}>
                          <View style={m.between}>
                            <Text style={m.title}>
                              {categoryNames[category.category] ||
                                category.category}
                            </Text>
                            <Text style={m.body}>{money(category.cost)}</Text>
                          </View>
                          <View style={m.track}>
                            <View
                              style={[
                                m.bar,
                                {
                                  width: `${data.totals.cost > 0 ? Math.min(100, (category.cost / data.totals.cost) * 100) : 0}%`,
                                  backgroundColor:
                                    index === 1 ? "#A497C4" : pearl.accent,
                                },
                              ]}
                            />
                          </View>
                          <View style={[m.row, { marginTop: 8 }]}>
                            {[
                              {
                                label: "Messages",
                                value: integer(category.volume),
                              },
                              {
                                label: "Free",
                                value: integer(category.freeVolume),
                              },
                              {
                                label: "Share",
                                value: `${percent(category.cost, data.totals.cost)}%`,
                              },
                            ].map((item) => (
                              <View key={item.label} style={m.fill}>
                                <Text style={m.small}>{item.label}</Text>
                                <Text style={m.title}>{item.value}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                  <Text style={m.section}>Daily spend</Text>
                  <View style={m.card}>
                    {unavailable ? (
                      <Text style={m.body}>
                        Daily spend is currently unavailable.
                      </Text>
                    ) : !data.daily.length ? (
                      <Text style={m.empty}>No spend data in this period.</Text>
                    ) : (
                      <>
                        <Text style={m.small}>
                          Tap a bar to see spend and message count.
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          <View style={[m.chart, { height: 140, gap: 4 }]}>
                            {data.daily.map((day) => (
                              <Pressable
                                key={day.date}
                                accessibilityRole="button"
                                accessibilityState={{
                                  selected: selectedDate === day.date,
                                }}
                                accessibilityLabel={`${dateLabel(day.date)}: ${money(day.cost)}, ${integer(day.volume)} messages`}
                                onPress={() => setSelectedDate(day.date)}
                                style={{
                                  height: 140,
                                  width: 22,
                                  justifyContent: "flex-end",
                                  alignItems: "center",
                                }}
                              >
                                <View
                                  style={{
                                    width: 16,
                                    height: Math.max(
                                      3,
                                      (day.cost / maxDaily) * 140,
                                    ),
                                    borderTopLeftRadius: 4,
                                    borderTopRightRadius: 4,
                                    backgroundColor: pearl.accent,
                                    opacity:
                                      selectedDate === day.date ? 1 : 0.5,
                                  }}
                                />
                              </Pressable>
                            ))}
                          </View>
                        </ScrollView>
                        <View style={m.between}>
                          <Text style={m.small}>
                            {dateLabel(data.daily[0].date)}
                          </Text>
                          <Text style={m.small}>
                            {dateLabel(data.daily[data.daily.length - 1].date)}
                          </Text>
                        </View>
                        {selectedDay && (
                          <View
                            accessibilityLiveRegion="polite"
                            style={{
                              backgroundColor: pearl.accentWash,
                              padding: 12,
                              borderRadius: 12,
                              gap: 4,
                            }}
                          >
                            <Text style={m.title}>
                              {dateLabel(selectedDay.date)} ·{" "}
                              {money(selectedDay.cost)}
                            </Text>
                            <Text style={m.body}>
                              {integer(selectedDay.volume)} messages
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                  <Text style={m.section}>Template performance</Text>
                  <View style={m.card}>
                    <Text style={m.small}>
                      Delivery and engagement, as counted by Meta
                    </Text>
                    {!data.templates.length ? (
                      <Text style={m.empty}>
                        {templatesUnavailable
                          ? "Template results are currently unavailable."
                          : "Meta has no template results for this period yet. Template analytics only counts messages sent after it was switched on for your account."}
                      </Text>
                    ) : (
                      data.templates.map((template) => (
                        <View
                          key={template.template_id}
                          style={{
                            backgroundColor: pearl.glass,
                            borderRadius: 16,
                            padding: 14,
                            gap: 12,
                          }}
                        >
                          <Text style={m.title}>{template.name}</Text>
                          <View style={m.grid}>
                            {[
                              {
                                label: "Sent",
                                count: template.sent,
                                rate: null,
                              },
                              {
                                label: "Delivered",
                                count: template.delivered,
                                rate: percent(
                                  template.delivered,
                                  template.sent,
                                ),
                              },
                              {
                                label: "Read",
                                count: template.read,
                                rate: percent(template.read, template.sent),
                              },
                              {
                                label: "Button clicks",
                                count: template.clicked,
                                rate: percent(template.clicked, template.sent),
                              },
                            ].map((item) => (
                              <View
                                key={item.label}
                                style={{
                                  flexBasis: "45%",
                                  flexGrow: 1,
                                  gap: 4,
                                }}
                              >
                                <Text style={m.small}>{item.label}</Text>
                                <View style={m.row}>
                                  <Text style={m.title}>
                                    {integer(item.count)}
                                  </Text>
                                  {item.rate !== null && (
                                    <Text
                                      style={[
                                        m.badge,
                                        {
                                          color: pearl.accentDeep,
                                          backgroundColor: pearl.accentWash,
                                        },
                                      ]}
                                    >
                                      {item.rate}%
                                    </Text>
                                  )}
                                </View>
                              </View>
                            ))}
                          </View>
                          {Object.entries(template.clicks).map(
                            ([label, count]) => (
                              <View key={label} style={m.between}>
                                <Text style={[m.body, m.fill]}>{label}</Text>
                                <Text style={m.title}>
                                  {integer(count)} clicks
                                </Text>
                              </View>
                            ),
                          )}
                        </View>
                      ))
                    )}
                  </View>
                </>
              )
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </PearlBackground>
  );
}
