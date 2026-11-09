import { AppBackButton } from "@/components/ui/AppBackButton";
import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/AppTypography";

import { pearl, pearlShadow, pearlType } from "./tokens";

/** SalonOX brand block: logo mark in a pearl tile, wordmark and slogan. */
export function BrandHeader() {
  return (
    <View style={styles.brand} accessibilityRole="header" accessibilityLabel="SalonOX">
      <View style={styles.tile}>
        <Image source={require("../../../../assets/images/brand/salonox-mark.png")} style={styles.mark} resizeMode="contain" />
      </View>
      <Image source={require("../../../../assets/images/brand/salonox-wordmark.png")} style={styles.wordmark} resizeMode="contain" />
      <Text translate style={pearlType.slogan}>{"Bookings, billing & happy clients\nfor beauty and wellness"}</Text>
    </View>
  );
}

/** Top bar with a glass back button and centred title. */
export function TopBar({ title, onBack }: { title?: string; onBack?: () => void }) {
  return (
    <View style={styles.top}>
      {onBack ? (
        <AppBackButton onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} />
      ) : <View style={styles.spacer} />}
      <Text translate style={[pearlType.h3, styles.title]} numberOfLines={1}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const HERO_TONES = {
  lilac: { bg: "rgba(214,196,240,0.7)", fg: "#6A4F98" },
  rose: { bg: "rgba(230,227,243,0.9)", fg: pearl.accentDeep },
  peach: { bg: "rgba(217,231,241,0.75)", fg: "#4F7896" },
} as const;

/** Rounded tinted icon at the top of the recovery screens. */
export function HeroIcon({ name, tone = "lilac", size = 64 }: { name: keyof typeof Ionicons.glyphMap; tone?: keyof typeof HERO_TONES; size?: number }) {
  const palette = HERO_TONES[tone];
  return (
    <View style={[styles.hero, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: palette.bg }]}>
      <Ionicons name={name} size={size * 0.42} color={palette.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: "center", gap: 6, marginTop: 6, marginBottom: 2 },
  tile: {
    width: 72,
    height: 72,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: pearl.white,
    ...pearlShadow.card,
  },
  mark: { width: 44, height: 45 },
  wordmark: { width: 143, height: 30, marginTop: 6, marginBottom: 2 },
  top: { flexDirection: "row", alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: pearl.glass,
    borderWidth: 1,
    borderColor: pearl.glassBorder,
    ...pearlShadow.card,
  },
  spacer: { width: 42 },
  title: { flex: 1, textAlign: "center" },
  hero: { alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 6 },
});
