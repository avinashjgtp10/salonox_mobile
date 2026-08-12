import { router } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  LuxuryBackground,
  LuxuryButtonSurface,
} from "@/components/auth/LuxuryAuth";
import {
  LuxurySpacing,
  LuxuryTypography,
  useLuxuryColors,
  type LuxuryColors,
} from "@/components/auth/luxuryTheme";

const WELCOME_HERO_IMAGE = require("../../assets/images/auth/salon-welcome-hero.png");

export default function WelcomeScreen() {
  const Colors = useLuxuryColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      duration: 450,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <LuxuryBackground>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View pointerEvents="none" style={styles.welcomeBackground}>
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel="Salon manager"
            resizeMode="cover"
            source={WELCOME_HERO_IMAGE}
            style={styles.welcomeBackgroundImage}
          />
          <View style={styles.welcomeBackgroundScrim} />
        </View>
        <Animated.View style={[styles.contentArea, { opacity }]}>
          <WelcomePage />
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

function WelcomePage() {
  const Colors = useLuxuryColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.page}>
      <View style={styles.welcomeHeadingBlock}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.welcomeEyebrow}>
          Welcome to
        </Text>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.welcomeBrand}>
          SalonOX
        </Text>
      </View>
      <View style={styles.heroWrap}>
        <View style={styles.appointmentCard}>
          <Text style={styles.widgetTitle}>Appointments</Text>
          <MonthCalendar />
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

function MonthCalendar() {
  const Colors = useLuxuryColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const weeks = [];
  let week = [];

  for (let i = 0; i < startingDayOfWeek; i++) {
    week.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null);
    }
    weeks.push(week);
  }

  const isToday = (day: number) => {
    return day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
  };

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <Text style={styles.monthTitle}>
          {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Text>
      </View>
      <View style={styles.calendarDaysRow}>
        {dayNames.map((name, index) => (
          <Text key={index} style={styles.calendarDayName}>{name}</Text>
        ))}
      </View>
      <View style={styles.calendarWeeks}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.calendarWeek}>
            {week.map((day, dayIndex) => (
              <Text
                key={dayIndex}
                style={[
                  styles.calendarDay,
                  day === null && styles.calendarDayEmpty,
                  day !== null && isToday(day) && styles.calendarDayToday,
                ]}
              >
                {day ?? ''}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function MiniBarChart() {
  const Colors = useLuxuryColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.chart}>
      {[12, 20, 28, 38, 46].map((barHeight, index) => (
        <View
          key={index}
          style={[styles.chartBar, { height: barHeight }]}
        />
      ))}
    </View>
  );
}

const createStyles = (Colors: LuxuryColors) => StyleSheet.create({
  safeArea: { flex: 1, position: "relative" },
  welcomeBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  welcomeBackgroundImage: {
    height: "100%",
    width: "100%",
  },
  welcomeBackgroundScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    opacity: 0.18,
  },
  contentArea: { flex: 1, minHeight: 0 },
  page: { flex: 1, paddingHorizontal: 24 },
  welcomeHeadingBlock: {
    alignItems: "center",
    paddingTop: 18,
  },
  welcomeEyebrow: {
    color: "#10243A",
    fontFamily: LuxuryTypography.serif,
    fontSize: 38,
    lineHeight: 41,
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.78)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  welcomeBrand: {
    color: Colors.accent,
    fontFamily: LuxuryTypography.serif,
    fontSize: 46,
    lineHeight: 50,
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.82)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 12,
  },
  heroWrap: {
    flex: 1,
    marginHorizontal: -12,
    marginTop: 18,
    minHeight: 280,
    overflow: "hidden",
    position: "relative",
  },
  appointmentCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    elevation: 5,
    left: 0,
    padding: 10,
    position: "absolute",
    top: 0,
    width: 116,
  },
  calendarContainer: {
    paddingHorizontal: 4,
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 6,
  },
  monthTitle: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calendarDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  calendarDayName: {
    color: Colors.muted,
    fontSize: 7,
    fontWeight: '700',
    width: 13,
    textAlign: 'center',
  },
  calendarWeeks: {
    gap: 1,
  },
  calendarWeek: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarDay: {
    color: Colors.text,
    fontSize: 8,
    fontWeight: '600',
    width: 13,
    height: 13,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  calendarDayEmpty: {
    color: 'transparent',
  },
  calendarDayToday: {
    color: Colors.accent,
    fontWeight: '900',
    backgroundColor: Colors.accent + '20',
    borderRadius: 6,
  },
  revenueCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    bottom: 2,
    elevation: 5,
    padding: 10,
    position: "absolute",
    right: 0,
    width: 100,
  },
  widgetTitle: { color: Colors.text, fontSize: 11, fontWeight: "700" },
  revenueValue: { color: Colors.accent, fontSize: 10, marginTop: 3 },
  chart: { alignItems: "flex-end", flexDirection: "row", gap: 4, height: 32, marginTop: 4 },
  chartBar: { backgroundColor: Colors.accent, borderRadius: 2, flex: 1 },
  actions: { gap: 10, paddingBottom: LuxurySpacing.sm, paddingHorizontal: 24, zIndex: 1 },
  primaryText: { color: Colors.white, fontSize: 17, fontWeight: "700" },
  secondaryText: { color: Colors.accentDark, fontSize: 17, fontWeight: "700" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
