import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  LuxuryBackground,
  LuxuryButtonSurface,
} from "@/components/auth/LuxuryAuth";
import {
  LuxuryColors,
  LuxurySpacing,
  LuxuryTypography,
} from "@/components/auth/luxuryTheme";

const PAGE_COUNT = 3;
const PAGES = ["welcome", "dashboard", "features"] as const;
type WelcomePageId = (typeof PAGES)[number];

export default function WelcomeScreen() {
  const [activePage, setActivePage] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const { width: pageWidth } = useWindowDimensions();

  useEffect(() => {
    Animated.timing(opacity, {
      duration: 450,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextPage = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    setActivePage(Math.max(0, Math.min(PAGE_COUNT - 1, nextPage)));
  };

  const renderPage = ({ item }: { item: WelcomePageId }) => (
    <View collapsable={false} style={{ width: pageWidth }}>
      {item === "welcome" ? (
        <WelcomePage />
      ) : item === "dashboard" ? (
        <DashboardPage />
      ) : (
        <FeaturesPage />
      )}
    </View>
  );

  return (
    <LuxuryBackground>
      <StatusBar backgroundColor={LuxuryColors.background} barStyle="dark-content" />
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <Animated.View style={[styles.carouselArea, { opacity }]}>
          <FlatList
            bounces={false}
            data={PAGES}
            decelerationRate="fast"
            horizontal
            initialNumToRender={PAGE_COUNT}
            keyExtractor={(item) => item}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            pagingEnabled
            removeClippedSubviews={false}
            renderItem={renderPage}
            showsHorizontalScrollIndicator={false}
            style={styles.pager}
          />

          <View accessibilityLabel={`Page ${activePage + 1} of ${PAGE_COUNT}`} style={styles.pagination}>
            {Array.from({ length: PAGE_COUNT }, (_, index) => (
              <View
                key={index}
                style={[styles.dot, activePage === index && styles.dotActive]}
              />
            ))}
          </View>
        </Animated.View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/login", params: { mode: "register" } })}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <LuxuryButtonSurface>
              <Text style={styles.primaryText}>Create Account</Text>
            </LuxuryButtonSurface>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/login")}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <LuxuryButtonSurface outlined>
              <Text style={styles.secondaryText}>Log In</Text>
            </LuxuryButtonSurface>
          </Pressable>
        </View>
      </SafeAreaView>
    </LuxuryBackground>
  );
}

function PageHeading({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <View style={styles.headingBlock}>
      <Text adjustsFontSizeToFit numberOfLines={2} style={styles.heading}>
        {title}
      </Text>
      <View style={styles.titleRule}>
        <View style={styles.titleRuleLine} />
        <View style={styles.titleRuleDiamond} />
        <View style={styles.titleRuleLine} />
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function WelcomePage() {
  return (
    <View style={styles.page}>
      <PageHeading
        subtitle={"Run your salon beautifully — bookings,\nstaff, sales and growth in one place."}
        title={"Welcome to\nSalonOX"}
      />
      <View style={styles.heroWrap}>
        <Image
          accessibilityLabel="Salon manager"
          resizeMode="contain"
          source={require("../../assets/images/auth/salon-welcome-hero.png")}
          style={styles.hero}
        />
        <View style={styles.appointmentCard}>
          <Text style={styles.widgetTitle}>Appointments</Text>
          <Text style={styles.calendarDays}>S   M   T   W   T   F   S</Text>
          <Text style={styles.calendarNumbers}>1    2    3    4    5    6    7</Text>
          <Text style={styles.calendarNumbers}>8    9   10   11   12   13   14</Text>
        </View>
        <View style={styles.revenueCard}>
          <Text style={styles.widgetTitle}>Revenue</Text>
          <Text style={styles.revenueValue}>+28%</Text>
          <MiniBarChart />
        </View>
      </View>
    </View>
  );
}

function DashboardPage() {
  return (
    <View style={styles.page}>
      <PageHeading
        subtitle="Everything happening in your salon, beautifully organized."
        title="Your Salon at a Glance"
      />
      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <View>
            <Text style={styles.eyebrow}>TODAY</Text>
            <Text style={styles.previewTitle}>Salon Dashboard</Text>
          </View>
          <View style={styles.avatar}>
            <Ionicons color={LuxuryColors.accent} name="person-outline" size={20} />
          </View>
        </View>
        <View style={styles.metricRow}>
          <MetricCard icon="calendar-outline" label="Appointments" value="18" />
          <MetricCard icon="cash-outline" label="Revenue" value="₹24.8k" />
        </View>
        <View style={styles.metricRow}>
          <MetricCard icon="people-outline" label="Staff" value="8 active" />
          <MetricCard icon="trending-up-outline" label="Today's Sales" value="+18%" />
        </View>
        <View style={styles.dashboardChart}>
          <Text style={styles.widgetTitle}>Weekly performance</Text>
          <MiniBarChart large />
        </View>
      </View>
    </View>
  );
}

function FeaturesPage() {
  const features = [
    ["calendar-outline", "Calendar"],
    ["people-outline", "Clients"],
    ["card-outline", "Billing"],
    ["bar-chart-outline", "Reports"],
    ["cube-outline", "Inventory"],
  ] as const;

  return (
    <View style={styles.page}>
      <PageHeading
        subtitle="Powerful tools designed to keep your business moving."
        title="Everything You Need"
      />
      <View style={styles.featuresCard}>
        {features.map(([icon, label]) => (
          <View key={label} style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons color={LuxuryColors.accent} name={icon} size={24} />
            </View>
            <Text style={styles.featureText}>{label}</Text>
            <Ionicons color="#B6A99D" name="chevron-forward" size={18} />
          </View>
        ))}
      </View>
    </View>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Ionicons color={LuxuryColors.accent} name={icon} size={20} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function MiniBarChart({ large = false }: { large?: boolean }) {
  return (
    <View style={[styles.chart, large && styles.chartLarge]}>
      {[12, 20, 28, 38, 46].map((barHeight, index) => (
        <View
          key={index}
          style={[styles.chartBar, { height: large ? barHeight + 10 : barHeight }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  carouselArea: { flex: 1, minHeight: 0 },
  pager: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 24 },
  headingBlock: { alignItems: "center", paddingTop: 12 },
  heading: {
    color: LuxuryColors.text,
    fontFamily: LuxuryTypography.serif,
    fontSize: 42,
    lineHeight: 45,
    textAlign: "center",
  },
  titleRule: { alignItems: "center", flexDirection: "row", marginVertical: 7, width: 74 },
  titleRuleLine: { backgroundColor: LuxuryColors.accent, flex: 1, height: 1 },
  titleRuleDiamond: {
    backgroundColor: LuxuryColors.accent,
    height: 5,
    transform: [{ rotate: "45deg" }],
    width: 5,
  },
  subtitle: {
    color: LuxuryColors.text,
    fontSize: 15,
    lineHeight: 20,
    textAlign: "center",
  },
  heroWrap: {
    flex: 1,
    marginHorizontal: -12,
    marginTop: 8,
    minHeight: 280,
    overflow: "hidden",
    position: "relative",
  },
  hero: { height: "100%", width: "100%" },
  appointmentCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 14,
    elevation: 5,
    padding: 10,
    position: "absolute",
    right: 0,
    top: 0,
    width: 116,
  },
  revenueCard: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 14,
    bottom: 2,
    elevation: 5,
    padding: 10,
    position: "absolute",
    right: 0,
    width: 100,
  },
  widgetTitle: { color: LuxuryColors.text, fontSize: 11, fontWeight: "700" },
  calendarDays: { color: "#A69B91", fontSize: 6, marginTop: 7 },
  calendarNumbers: { color: LuxuryColors.text, fontSize: 6, lineHeight: 13 },
  revenueValue: { color: LuxuryColors.accent, fontSize: 10, marginTop: 3 },
  chart: { alignItems: "flex-end", flexDirection: "row", gap: 4, height: 32, marginTop: 4 },
  chartLarge: { height: 68, marginTop: 12 },
  chartBar: { backgroundColor: LuxuryColors.accent, borderRadius: 2, flex: 1 },
  pagination: { flexDirection: "row", gap: 9, justifyContent: "center", paddingVertical: 10 },
  dot: { backgroundColor: "#DED4C8", borderRadius: 5, height: 9, width: 9 },
  dotActive: { backgroundColor: LuxuryColors.accent, width: 22 },
  actions: { gap: 10, paddingBottom: LuxurySpacing.sm, paddingHorizontal: 24 },
  primaryText: { color: LuxuryColors.white, fontSize: 17, fontWeight: "700" },
  secondaryText: { color: LuxuryColors.accentDark, fontSize: 17, fontWeight: "700" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  previewCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: LuxuryColors.border,
    borderRadius: 28,
    borderWidth: 1,
    elevation: 4,
    marginTop: 24,
    padding: 20,
  },
  previewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  eyebrow: { color: LuxuryColors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  previewTitle: {
    color: LuxuryColors.text,
    fontFamily: LuxuryTypography.serif,
    fontSize: 23,
    marginTop: 3,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#F4E9DC",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  metricRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  metricCard: {
    backgroundColor: "#FBF7F1",
    borderRadius: 18,
    flex: 1,
    minHeight: 96,
    padding: 14,
  },
  metricValue: { color: LuxuryColors.text, fontSize: 19, fontWeight: "700", marginTop: 8 },
  metricLabel: { color: LuxuryColors.muted, fontSize: 11, marginTop: 3 },
  dashboardChart: { backgroundColor: "#FBF7F1", borderRadius: 18, padding: 14 },
  featuresCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: LuxuryColors.border,
    borderRadius: 28,
    borderWidth: 1,
    elevation: 4,
    marginTop: 26,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  featureItem: {
    alignItems: "center",
    borderBottomColor: "#EEE6DC",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 66,
  },
  featureIcon: {
    alignItems: "center",
    backgroundColor: "#F4E9DC",
    borderRadius: 18,
    height: 40,
    justifyContent: "center",
    marginRight: 14,
    width: 40,
  },
  featureText: { color: LuxuryColors.text, flex: 1, fontSize: 16, fontWeight: "600" },
});
