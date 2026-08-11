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
          salonOX
        </Text>
      </View>
      <View style={styles.heroWrap}>
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
    top: 72,
    width: 116,
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
  calendarDays: { color: Colors.muted, fontSize: 6, marginTop: 7 },
  calendarNumbers: { color: Colors.text, fontSize: 6, lineHeight: 13 },
  revenueValue: { color: Colors.accent, fontSize: 10, marginTop: 3 },
  chart: { alignItems: "flex-end", flexDirection: "row", gap: 4, height: 32, marginTop: 4 },
  chartBar: { backgroundColor: Colors.accent, borderRadius: 2, flex: 1 },
  actions: { gap: 10, paddingBottom: LuxurySpacing.sm, paddingHorizontal: 24, zIndex: 1 },
  primaryText: { color: Colors.white, fontSize: 17, fontWeight: "700" },
  secondaryText: { color: Colors.accentDark, fontSize: 17, fontWeight: "700" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
