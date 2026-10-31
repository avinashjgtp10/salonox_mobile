import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ThemeColors } from "@/constants/theme";
import { useFooterClearance } from "@/hooks/useFooterClearance";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { marketingService } from "@/services/marketing.service";

const SUPPORT_EMAIL = "support@salonox.com";

// Last answer per salon, so switching tabs doesn't flash a loader every time.
const knownConnection = new Map<string, boolean>();

/**
 * Shows the WhatsApp screens (tab, inbox, marketing) only once SalonOX support has
 * connected the salon's WhatsApp Business number — the same check as the web's
 * MarketingRoutes. Until then it shows a "not set up yet" screen instead.
 * `embedded` = rendered as a tab (no back button, tab bar owns the bottom inset).
 */
export function WhatsAppSetupGate({ children, embedded = false }: { children: ReactNode; embedded?: boolean }) {
  const user = useAppSelector(selectCurrentUser);
  const salonId = user?.salonId ?? "";
  return <Gate key={salonId} salonId={salonId} embedded={embedded}>{children}</Gate>;
}

function Gate({ children, embedded, salonId }: { children: ReactNode; embedded: boolean; salonId: string }) {
  const [connected, setConnected] = useState<boolean | undefined>(() => knownConnection.get(salonId));
  const [checking, setChecking] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const check = useCallback(() => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setChecking(true);
    marketingService.isWhatsAppConnected(current.signal)
      .then(value => {
        if (current.signal.aborted) return;
        knownConnection.set(salonId, value);
        setConnected(value);
      })
      // Couldn't tell (offline, no permission…): let the screen show its own state.
      .catch(() => { if (!current.signal.aborted) setConnected(value => value ?? true); })
      .finally(() => { if (!current.signal.aborted) setChecking(false); });
  }, [salonId]);

  useFocusEffect(useCallback(() => {
    check();
    return () => controller.current?.abort();
  }, [check]));

  if (connected) return <>{children}</>;
  return <SetupScreen loading={connected === undefined} checking={checking} embedded={embedded} onCheckAgain={check} />;
}

function SetupScreen({ checking, embedded, loading, onCheckAgain }: { checking: boolean; embedded: boolean; loading: boolean; onCheckAgain: () => void }) {
  const colors = useThemeColors();
  const s = useMemo(() => styles(colors), [colors]);
  const footerClearance = useFooterClearance();
  return <SafeAreaView edges={embedded ? ["top"] : ["top", "bottom"]} style={s.root}>
    <AppStatusBar />
    {!embedded && <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => router.canGoBack() ? router.back() : router.replace("/dashboard" as Href)} style={s.back}>
        <Ionicons name="arrow-back" size={22} color={colors.heading} />
      </Pressable>
    </View>}
    <View style={[s.center, embedded && { paddingBottom: footerClearance }]}>
      {loading ? <ActivityIndicator color={colors.heading} /> : <View style={s.card}>
        <View style={s.iconBox}><Ionicons name="logo-whatsapp" size={40} color={colors.hint} /></View>
        <Text accessibilityRole="header" style={s.title}>WhatsApp Not Set Up</Text>
        <Text style={s.body}>{"Your salon's WhatsApp Business number hasn't been connected yet.\nPlease contact SalonOX support to set it up. Your chats and campaigns will appear here once it's done."}</Text>
        <Pressable accessibilityRole="button" onPress={() => { void Linking.openURL(`mailto:${SUPPORT_EMAIL}`); }} style={({ pressed }) => [s.button, pressed && s.pressed]}>
          <Ionicons name="mail-outline" size={22} color={colors.card} />
          <Text style={s.buttonText}>Contact Support</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ busy: checking }} disabled={checking} onPress={onCheckAgain} hitSlop={8} style={s.secondary}>
          {checking ? <ActivityIndicator color={colors.hint} /> : <Text style={s.secondaryText}>Check again</Text>}
        </Pressable>
      </View>}
    </View>
  </SafeAreaView>;
}

const styles = (c: ThemeColors) => StyleSheet.create({
  root: { backgroundColor: c.bg, flex: 1 },
  header: { paddingHorizontal: 12, paddingTop: 8 },
  back: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  center: { flex: 1, justifyContent: "center", padding: 22 },
  card: { alignItems: "center", backgroundColor: c.card, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 40 },
  iconBox: { alignItems: "center", backgroundColor: c.backgroundElement, borderRadius: 28, height: 92, justifyContent: "center", marginBottom: 26, width: 92 },
  title: { color: c.heading, fontSize: 20, fontWeight: "700", marginBottom: 14, textAlign: "center" },
  body: { color: c.text2, fontSize: 14, lineHeight: 21, marginBottom: 32, textAlign: "center" },
  button: { alignItems: "center", alignSelf: "stretch", backgroundColor: c.heading, borderRadius: 14, flexDirection: "row", gap: 12, justifyContent: "center", marginHorizontal: 16, minHeight: 52, paddingHorizontal: 18 },
  pressed: { opacity: 0.85 },
  buttonText: { color: c.card, fontSize: 16, fontWeight: "600" },
  secondary: { alignItems: "center", justifyContent: "center", marginTop: 16, minHeight: 32 },
  secondaryText: { color: c.text2, fontSize: 14, fontWeight: "600" },
});
