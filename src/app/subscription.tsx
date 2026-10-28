import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useAppForeground } from "@/hooks/useAppForeground";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { isSubscriptionActive, PLAN_CYCLES, subscriptionService } from "@/services/subscription.service";
import { useAppTheme } from "@/theme/ThemeProvider";
import type { CatalogPlan, PlanCycle, PlanPaymentStatus } from "@/types/subscription";
import { formatAppDate } from "@/utils/dateTime";
import { resolveAuthenticatedRoute } from "@/utils/routeResolver";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
// Razorpay's hosted page has no "return to app" redirect: remember that a payment was started so a
// reopened app keeps checking until the webhook activates the plan.
const CHECKOUT_PENDING_KEY = "salonox_checkout_pending";
const CHECKOUT_PENDING_MAX_AGE_MS = 30 * 60 * 1000;

const CYCLE_LABEL: Record<PlanCycle, string> = { monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };
const CYCLE_UNIT: Record<PlanCycle, string> = { monthly: "month", quarterly: "quarter", yearly: "year" };
const TAGLINE: Record<CatalogPlan["slug"], string> = {
  basic: "For business looking for essential management features to get started.",
  advance: "For business that need complete salon management functionality.",
  growth: "For growing business that need advanced digital and multi-branch capabilities.",
};

// Whole rupees stay whole (₹7,998); anything else gets paise (₹1,439.64). Same as the web.
const inr = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    style: "currency",
  }).format(amount);

const checkoutErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Only the salon owner can change the plan.";
    if (error.status === 409 && error.code === "PLAN_NOT_SYNCED") return "This plan isn't available right now. Please contact support.";
  }
  return getApiErrorMessage(error);
};

type Phase =
  | { kind: "idle" }
  | { kind: "waiting"; startedAt: number; url: string | null }
  | { kind: "timeout" }
  | { kind: "paid"; status: PlanPaymentStatus };

export default function SubscriptionScreen() {
  const { colors, scheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, scheme), [colors, scheme]);
  const insets = useSafeAreaInsets();
  const { signOut, user } = useAuth();
  const role = user?.role?.trim().toLowerCase() ?? "";
  // Only the owner/admin can pay (the backend enforces the same).
  const canPay = role === "salon_owner" || role === "admin";
  const salonId = user?.salonId?.trim() ?? "";

  const [catalog, setCatalog] = useState<CatalogPlan[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(canPay);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pickedCycle, setPickedCycle] = useState<PlanCycle | null>(null);
  const [startingTier, setStartingTier] = useState<CatalogPlan["slug"] | null>(null);
  const [checkoutError, setCheckoutError] = useState<{ message: string; plan: CatalogPlan; cycle: PlanCycle } | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [isSigningOut, setIsSigningOut] = useState(false);
  const pollInFlight = useRef(false);

  const cycles = PLAN_CYCLES.filter((cycle) => catalog.some((plan) => plan.prices[cycle] !== null));
  // Longest cycle offered by default, as on the web.
  const cycle: PlanCycle = pickedCycle && cycles.includes(pickedCycle) ? pickedCycle : cycles[cycles.length - 1] ?? "monthly";

  const goToApp = useCallback(() => router.replace(resolveAuthenticatedRoute(user)), [user]);

  // The salon is active again (paid elsewhere, or the webhook landed): leave the wall.
  const recheckSalon = useCallback(async () => {
    if (!salonId) return false;
    try {
      const active = isSubscriptionActive(await subscriptionService.getSalonSubscription(salonId));
      if (active) {
        void AsyncStorage.removeItem(CHECKOUT_PENDING_KEY).catch(() => {});
        goToApp();
      }
      return active;
    } catch {
      return false;
    }
  }, [goToApp, salonId]);

  const loadCatalog = useCallback(async () => {
    if (!canPay) return;
    setCatalogError(null);
    try {
      setCatalog(await subscriptionService.getCatalog());
    } catch (error) {
      setCatalogError(getApiErrorMessage(error));
    }
  }, [canPay]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await loadCatalog();
      if (mounted) setIsLoading(false);
    })();
    // A payment started before the app was closed: keep checking for it.
    if (canPay) {
      void AsyncStorage.getItem(CHECKOUT_PENDING_KEY)
        .then((value) => {
          const startedAt = Number(value);
          if (mounted && Number.isFinite(startedAt) && Date.now() - startedAt < CHECKOUT_PENDING_MAX_AGE_MS) {
            setPhase({ kind: "waiting", startedAt: Date.now(), url: null });
          }
        })
        .catch(() => {});
    }
    return () => { mounted = false; };
  }, [canPay, loadCatalog]);

  const checkPayment = useCallback(async () => {
    if (pollInFlight.current) return;
    pollInFlight.current = true;
    try {
      const status = await subscriptionService.getPaymentStatus();
      if (status.paid) {
        void AsyncStorage.removeItem(CHECKOUT_PENDING_KEY).catch(() => {});
        try { WebBrowser.dismissBrowser(); } catch { /* already closed */ }
        setPhase({ kind: "paid", status });
      }
    } catch {
      // Offline or a failed request: the next tick tries again; the timeout still ends the wait.
    } finally {
      pollInFlight.current = false;
    }
  }, []);

  // Poll my-status every 3s while waiting; stop after 5 minutes or when the screen closes.
  useEffect(() => {
    if (phase.kind !== "waiting") return;
    void checkPayment();
    const timer = setInterval(() => {
      if (Date.now() - phase.startedAt > POLL_TIMEOUT_MS) {
        setPhase({ kind: "timeout" });
        return;
      }
      void checkPayment();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [checkPayment, phase]);

  // Back from the payment page (or the app was in the background): check straight away.
  useAppForeground(() => {
    if (phase.kind === "waiting") void checkPayment();
  });

  const openPaymentPage = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, { dismissButtonStyle: "close", showTitle: true });
    } catch {
      setCheckoutError(null);
      setPhase({ kind: "idle" });
      setCatalogError("Could not open the payment page. Please check your connection and try again.");
    }
  };

  const choosePlan = async (plan: CatalogPlan, planCycle: PlanCycle) => {
    if (startingTier) return;
    setCheckoutError(null);
    setStartingTier(plan.slug);
    try {
      const { shortUrl } = await subscriptionService.startCheckout(plan.slug, planCycle);
      void AsyncStorage.setItem(CHECKOUT_PENDING_KEY, String(Date.now())).catch(() => {});
      setPhase({ kind: "waiting", startedAt: Date.now(), url: shortUrl });
      void openPaymentPage(shortUrl);
    } catch (error) {
      setCheckoutError({ cycle: planCycle, message: checkoutErrorMessage(error), plan });
    } finally {
      setStartingTier(null);
    }
  };

  const stopWaiting = () => {
    void AsyncStorage.removeItem(CHECKOUT_PENDING_KEY).catch(() => {});
    setPhase({ kind: "idle" });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const active = await recheckSalon();
    if (!active) {
      await loadCatalog();
      if (phase.kind === "timeout") setPhase({ kind: "waiting", startedAt: Date.now(), url: null });
    }
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const renderPaymentPanel = () => {
    if (phase.kind === "paid") {
      return (
        <View accessibilityRole="alert" style={[styles.panel, styles.successPanel]}>
          <Ionicons name="checkmark-circle" size={40} color={colors.success} />
          <Text style={styles.panelTitle}>Payment successful</Text>
          <Text style={styles.panelText}>
            {phase.status.planName ? `${phase.status.planName} is active` : "Your plan is active"}
            {phase.status.endsAt ? ` until ${formatAppDate(phase.status.endsAt)}` : ""}.
          </Text>
          <Pressable accessibilityRole="button" onPress={goToApp} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
          </Pressable>
        </View>
      );
    }
    if (phase.kind === "waiting") {
      return (
        <View accessibilityLiveRegion="polite" style={styles.panel}>
          <ActivityIndicator color={colors.primaryText} />
          <Text style={styles.panelTitle}>Waiting for payment confirmation…</Text>
          <Text style={styles.panelText}>{"Complete the payment on Razorpay. This screen updates by itself once it's confirmed."}</Text>
          {phase.url ? (
            <Pressable accessibilityRole="button" onPress={() => void openPaymentPage(phase.url as string)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Open payment page again</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={stopWaiting} style={styles.linkButton}>
            <Text style={styles.linkText}>Stop waiting and choose a plan</Text>
          </Pressable>
        </View>
      );
    }
    if (phase.kind === "timeout") {
      return (
        <View accessibilityRole="alert" style={styles.panel}>
          <Ionicons name="time-outline" size={32} color={colors.warning} />
          <Text style={styles.panelTitle}>Payment is processing</Text>
          <Text style={styles.panelText}>{"We'll update you shortly. If you've paid, tap Retry in a moment."}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPhase({ kind: "waiting", startedAt: Date.now(), url: null })}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={stopWaiting} style={styles.linkButton}>
            <Text style={styles.linkText}>Choose a plan instead</Text>
          </Pressable>
        </View>
      );
    }
    return null;
  };

  const renderPlans = () => {
    if (isLoading) {
      return (
        <View style={styles.panel}>
          <ActivityIndicator color={colors.primaryText} />
          <Text style={styles.panelText}>Loading plans…</Text>
        </View>
      );
    }
    if (catalogError && catalog.length === 0) {
      return (
        <View accessibilityRole="alert" style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
          <Text style={styles.errorText}>{catalogError}</Text>
          <Pressable accessibilityRole="button" onPress={() => { setIsLoading(true); void loadCatalog().finally(() => setIsLoading(false)); }}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    if (catalog.length === 0) {
      return (
        <View style={styles.panel}>
          <Ionicons name="card-outline" size={28} color={colors.text2} />
          <Text style={styles.panelText}>No plans are available right now. Please contact support.</Text>
        </View>
      );
    }
    return (
      <>
        {cycles.length > 1 ? (
          <View accessibilityRole="tablist" style={styles.cycleToggle}>
            {cycles.map((item) => (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: item === cycle }}
                key={item}
                onPress={() => setPickedCycle(item)}
                style={[styles.cycleOption, item === cycle && styles.cycleOptionActive]}
              >
                <Text style={[styles.cycleText, item === cycle && styles.cycleTextActive]}>{CYCLE_LABEL[item]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {checkoutError ? (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
            <Text style={styles.errorText}>{checkoutError.message}</Text>
            <Pressable accessibilityRole="button" onPress={() => void choosePlan(checkoutError.plan, checkoutError.cycle)}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.planList}>
          {catalog.map((plan) => {
            const price = plan.prices[cycle];
            const gstAmount = price !== null ? Math.round(price * plan.gstPercent) / 100 : 0;
            const total = price !== null ? Math.round(price * (100 + plan.gstPercent)) / 100 : 0;
            const popular = plan.slug === "advance";
            const isStarting = startingTier === plan.slug;
            const disabled = price === null || Boolean(startingTier);
            return (
              <View key={plan.slug} style={[styles.planCard, popular && styles.planCardPopular]}>
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  {popular ? (
                    <View style={styles.popularPill}>
                      <Ionicons name="star" size={11} color={colors.onPrimary} />
                      <Text style={styles.popularText}>Most Popular</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.planTagline}>{TAGLINE[plan.slug]}</Text>
                {price !== null ? (
                  <>
                    <View style={styles.priceRow}>
                      <Text style={styles.price}>{inr(price)}</Text>
                      <Text style={styles.per}> /{CYCLE_UNIT[cycle]}</Text>
                    </View>
                    <Text style={styles.gst}>+ {inr(gstAmount)} GST ({plan.gstPercent}%) = {inr(total)}</Text>
                  </>
                ) : (
                  <Text style={styles.gst}>Not available for this billing cycle</Text>
                )}
                <Pressable
                  accessibilityLabel={`Choose ${plan.name} ${CYCLE_LABEL[cycle]}`}
                  accessibilityRole="button"
                  accessibilityState={{ busy: isStarting, disabled }}
                  disabled={disabled}
                  onPress={() => void choosePlan(plan, cycle)}
                  style={[styles.primaryButton, disabled && !isStarting && styles.buttonDisabled]}
                >
                  {isStarting ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Choose {plan.name}</Text>
                      <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
                    </>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      </>
    );
  };

  return (
    <LinearGradient colors={[colors.bg, colors.bg2]} style={styles.screen}>
      <RefreshViewport><ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom + 32, 48), paddingTop: Math.max(insets.top + 28, 44) },
        ]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroIcon}>
          <Ionicons name="alert-circle-outline" size={30} color={colors.error} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>Your subscription has ended</Text>
        <Text style={styles.subtitle}>
          {canPay
            ? "Your SalonOX access has been paused. Choose a plan below to renew and continue managing your salon."
            : "Your salon's subscription has expired. Please contact your salon owner to renew."}
        </Text>

        {canPay ? (phase.kind === "idle" ? renderPlans() : renderPaymentPanel()) : null}

        <Pressable
          accessibilityRole="button"
          disabled={isSigningOut}
          onPress={() => void handleLogout()}
          style={[styles.logoutButton, isSigningOut && styles.buttonDisabled]}
        >
          <Text style={styles.logoutText}>{isSigningOut ? "Signing out…" : "Logout"}</Text>
        </Pressable>
      </ScrollView></RefreshViewport>
    </LinearGradient>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"], scheme: "light" | "dark") =>
  StyleSheet.create({
    screen: { flex: 1 },
    content: { gap: 16, paddingHorizontal: 20 },
    heroIcon: { alignItems: "center", alignSelf: "center", backgroundColor: colors.errorBg, borderRadius: 32, height: 64, justifyContent: "center", width: 64 },
    title: { color: colors.heading, fontSize: 26, fontWeight: "900", lineHeight: 32, textAlign: "center" },
    subtitle: { color: colors.text2, fontSize: 14, fontWeight: "500", lineHeight: 21, textAlign: "center" },
    cycleToggle: { alignSelf: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 999, borderWidth: 1, flexDirection: "row", padding: 4 },
    cycleOption: { borderRadius: 999, minHeight: 40, justifyContent: "center", paddingHorizontal: 16 },
    cycleOptionActive: { backgroundColor: colors.primary },
    cycleText: { color: colors.text2, fontSize: 13, fontWeight: "700" },
    cycleTextActive: { color: colors.onPrimary },
    planList: { gap: 14 },
    planCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 22,
      borderWidth: 1,
      elevation: 4,
      gap: 8,
      padding: 18,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: scheme === "dark" ? 0.2 : 0.08,
      shadowRadius: 22,
    },
    planCardPopular: { borderColor: colors.primaryText, borderWidth: 1.5 },
    planHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
    planName: { color: colors.heading, flexShrink: 1, fontSize: 20, fontWeight: "900" },
    popularPill: { alignItems: "center", backgroundColor: colors.primaryText, borderRadius: 999, flexDirection: "row", gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
    popularText: { color: colors.onPrimary, fontSize: 11, fontWeight: "800" },
    planTagline: { color: colors.text2, fontSize: 13, lineHeight: 19 },
    priceRow: { alignItems: "flex-end", flexDirection: "row", marginTop: 4 },
    price: { color: colors.heading, fontSize: 28, fontWeight: "900" },
    per: { color: colors.text2, fontSize: 14, fontWeight: "600", marginBottom: 4 },
    gst: { color: colors.text2, fontSize: 12 },
    primaryButton: { alignItems: "center", alignSelf: "stretch", backgroundColor: colors.primary, borderRadius: 999, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 8, minHeight: 50, paddingHorizontal: 16 },
    primaryButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: "800" },
    buttonDisabled: { opacity: 0.5 },
    secondaryButton: { alignItems: "center", alignSelf: "stretch", borderColor: colors.primaryText, borderRadius: 999, borderWidth: 1.5, justifyContent: "center", minHeight: 48 },
    secondaryButtonText: { color: colors.primaryText, fontSize: 14, fontWeight: "800" },
    linkButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
    linkText: { color: colors.text2, fontSize: 13, fontWeight: "700", textDecorationLine: "underline" },
    panel: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: 10, padding: 22 },
    successPanel: { borderColor: colors.successBorder },
    panelTitle: { color: colors.heading, fontSize: 17, fontWeight: "800", textAlign: "center" },
    panelText: { color: colors.text2, fontSize: 13, lineHeight: 19, textAlign: "center" },
    errorCard: { alignItems: "center", backgroundColor: colors.errorBg, borderColor: colors.errorBorder, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
    errorText: { color: colors.error, flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 18 },
    retryText: { color: colors.primaryText, fontSize: 13, fontWeight: "800", paddingHorizontal: 4, paddingVertical: 8 },
    logoutButton: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, justifyContent: "center", marginTop: 4, minHeight: 48 },
    logoutText: { color: colors.text, fontSize: 14, fontWeight: "700" },
  });
