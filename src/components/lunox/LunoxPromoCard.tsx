import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { pearl, pearlShadow } from "@/components/auth/pearl/tokens";
import { Icon } from "@/components/pearl/Icon";
import { Text } from "@/components/ui/AppTypography";
import { useAuth } from "@/context/AuthContext";
import { canAccessLunox } from "@/utils/staffExperience";
import { useOpenLunox } from "./LunoxContext";

/**
 * A one-time, Groww-style promo card that markets Lunox AI with its brand image
 * — the rich banner a locally scheduled notification can't show. Pairs with the
 * text push nudge (lunoxPromoNotification): the push pulls the owner back in, and
 * this card greets them on the dashboard with the full image + CTA. Shown once,
 * then dismissed for good via a persisted flag.
 */
const DISMISSED_KEY = "salonox.lunoxPromoCardDismissed";

const LUNOX_MARK = require("../../../assets/images/brand/lunox-mark.png");
const LUNOX_WORD = require("../../../assets/images/brand/lunox-wordmark.png");
const CTA_GRADIENT = ["#B3AEDA", "#8D87BF", "#6B669F"] as const;

function LunoxPromoCardContent() {
  const openLunox = useOpenLunox();
  // null = still loading the dismissed flag; true/false once known.
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((flag) => { if (active) setVisible(!flag); })
      .catch(() => { if (active) setVisible(true); });
    return () => { active = false; };
  }, []);

  const dismiss = () => {
    setVisible(false);
    void AsyncStorage.setItem(DISMISSED_KEY, String(Date.now())).catch(() => undefined);
  };

  const open = () => {
    dismiss();
    openLunox?.();
  };

  if (!visible) return null;

  return (
    <LinearGradient
      colors={["rgba(255,255,255,0.72)", "rgba(231,222,246,0.6)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Pressable onPress={dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss" style={styles.close}>
        <Icon name="x" size={14} color={pearl.muted} />
      </Pressable>

      <View style={styles.row}>
        <LinearGradient colors={["#C9B5EC", "#8D87BF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Image source={LUNOX_MARK} style={styles.heroMark} resizeMode="contain" accessibilityLabel="Lunox AI" />
        </LinearGradient>

        <View style={styles.copy}>
          <View style={styles.brand}>
            <Image source={LUNOX_WORD} style={styles.word} resizeMode="contain" accessibilityLabel="lunox" />
            <View style={styles.tag}><Text translate style={styles.tagText}>NEW</Text></View>
          </View>
          <Text translate style={styles.title}>Meet your salon's AI assistant</Text>
          <Text translate style={styles.body}>
            Ask Lunox about today's revenue, bookings, or what to focus on next — in plain language.
          </Text>
        </View>
      </View>

      <Pressable onPress={open} accessibilityRole="button" style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
        <LinearGradient colors={CTA_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cta, pearlShadow.button]}>
          <Text translate style={styles.ctaText}>Try Lunox AI</Text>
        </LinearGradient>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 14, gap: 12, borderWidth: 1, borderColor: pearl.glassBorder, ...pearlShadow.card },
  close: { position: "absolute", top: 10, right: 10, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.6)", zIndex: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  hero: {
    width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.8)",
    shadowColor: "#1F3A45", shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  heroMark: { width: 36, height: 36 },
  copy: { flex: 1, gap: 4, paddingRight: 18 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  word: { height: 15, width: 51 },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: "rgba(214,196,240,0.6)" },
  tagText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4, color: "#6A4F98" },
  title: { fontSize: 15, fontWeight: "800", color: pearl.ink },
  body: { fontSize: 12.5, lineHeight: 18, fontWeight: "600", color: pearl.muted },
  cta: { height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  ctaText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});

export function LunoxPromoCard() {
  const { user } = useAuth();
  return canAccessLunox(user) ? <LunoxPromoCardContent /> : null;
}
