import { useAuth } from "@/context/AuthContext";
import { canAccessLunox } from "@/utils/staffExperience";
/**
 * Dashboard Lunox "AI insight" card (prototype `.lunox-card`): today's tip from
 * GET /mobile/lunox/daily-insight. Hidden when Lunox is off or there's no tip.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";

import { pearlShadow } from "@/components/auth/pearl/tokens";
import { Icon } from "@/components/pearl/Icon";
import { Text } from "@/components/ui/AppTypography";
import { fetchLunoxDailyInsight, type LunoxDailyInsight } from "@/services/lunox.service";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useAppSelector } from "@/store/hooks";
import { useRegionalPreferences } from "@/localization/preferences";
import { localizeCurrencyText } from "@/utils/currency";
import { useOpenLunox } from "./LunoxContext";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import { useAppTheme } from "@/theme/ThemeProvider";
import { themedStyles } from "@/components/auth/pearl/themedStyles";

const LUNOX_MARK = require("../../../assets/images/brand/lunox-mark.png");
const LUNOX_WORD = require("../../../assets/images/brand/lunox-wordmark.png");
const BUTTON_GRADIENT = ["#B3AEDA", "#8D87BF", "#6B669F"] as const;
// Remembers the dismissed tip so closing hides it for good, while a fresh tip on
// a later day still comes through.
const DISMISSED_KEY = "salonox.lunoxInsightDismissed";

/** `refreshKey` changes on a manual pull-to-refresh (the server returns its cached tip). */
function LunoxInsightCardContent({ refreshKey = 0 }: { refreshKey?: number }) {
  const openLunox = useOpenLunox();
  // Re-renders the tip when the salon switches currency or country, so the
  // amounts in it follow straight away.
  useRegionalPreferences();
  const branchId = useAppSelector(selectActiveBranchId);
  const [insight, setInsight] = useState<LunoxDailyInsight | null>(null);
  const [dismissedText, setDismissedText] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then(value => setDismissedText(value))
      .catch(() => setDismissedText(null));
  }, []);

  useEffect(() => {
    let active = true;
    fetchLunoxDailyInsight()
      .then(next => { if (active) setInsight(next); })
      .catch(() => { if (active) setInsight(null); });
    return () => { active = false; };
  }, [branchId, refreshKey]);

  const p = usePearlPalette();
  const dark = useAppTheme().scheme === "dark";

  if (!insight) return null;
  if (dismissedText !== null && dismissedText === insight.text) return null;
  const open = () => openLunox?.({ seed: insight.text });
  const dismiss = () => {
    setDismissedText(insight.text);
    void AsyncStorage.setItem(DISMISSED_KEY, insight.text).catch(() => undefined);
  };

  const surface: [string, string] = dark
    ? [p.glassStrong, p.glass]
    : ["rgba(255,255,255,0.7)", "rgba(231,222,246,0.55)"];

  return (
    <LinearGradient colors={surface} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.head}>
        <View style={styles.brand}>
          <View style={styles.orb}><Image source={LUNOX_MARK} style={{ width: 15, height: 15 }} resizeMode="contain" /></View>
          <Image source={LUNOX_WORD} style={[styles.word, dark && { tintColor: p.ink }]} resizeMode="contain" accessibilityLabel="lunox" />
          <View style={[styles.tag, { backgroundColor: dark ? p.accentTint : "rgba(214,196,240,0.6)" }]}><Text translate style={styles.tagText}>AI insight</Text></View>
        </View>
        <View style={styles.headActions}>
          <Pressable onPress={open} hitSlop={8} accessibilityRole="button" accessibilityLabel="Open Lunox">
            <Icon name="chevronRight" size={16} color={p.muted} />
          </Pressable>
          <Pressable onPress={dismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel="Dismiss insight" style={[styles.close, { backgroundColor: p.glassStrong }]}>
            <Icon name="x" size={13} color={p.muted} />
          </Pressable>
        </View>
      </View>
      <Text style={[styles.text, { color: p.ink }]}>{localizeCurrencyText(insight.text)}</Text>
      <View style={styles.actions}>
        <Pressable onPress={open} accessibilityRole="button" style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
          <LinearGradient colors={BUTTON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.btn, pearlShadow.button]}>
            <Text translate style={styles.btnText}>Ask Lunox</Text>
          </LinearGradient>
        </Pressable>
        <Pressable onPress={() => router.push("/clients" as Href)} accessibilityRole="button" style={({ pressed }) => [styles.ghost, { backgroundColor: p.glassStrong, borderColor: p.glassBorder }, pressed && { opacity: 0.85 }]}>
          <Text translate style={[styles.ghostText, { color: p.accentDeep }]}>Show clients</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = themedStyles((p) => ({
  // .lunox-card.glass
  card: { borderRadius: 22, padding: 14, gap: 10, borderWidth: 1, borderColor: p.glassBorder, ...pearlShadow.card },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  headActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  close: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.6)" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  // .orb-sm
  orb: {
    width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF",
    borderWidth: 1.5, borderColor: "rgba(201,181,236,0.8)",
    shadowColor: "#1F3A45", shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  word: { height: 15, width: 51 },
  // .ai-tag
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  tagText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4, color: "#6A4F98" },
  // .lx-text
  text: { fontSize: 13.5, lineHeight: 19.5, fontWeight: "600", color: p.ink },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  // .lx-btn / .lx-ghost
  btn: { height: 36, paddingHorizontal: 14, borderRadius: 12, justifyContent: "center" },
  btnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  ghost: { height: 36, paddingHorizontal: 12, borderRadius: 12, justifyContent: "center", backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" },
  ghostText: { fontSize: 13, fontWeight: "700", color: p.accentDeep },
}));

export function LunoxInsightCard(props: { refreshKey?: number }) {
 const { user } = useAuth();
 return canAccessLunox(user) ? <LunoxInsightCardContent {...props} /> : null;
}
