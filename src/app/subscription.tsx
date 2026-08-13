import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/api";
import {
  isSubscriptionActive,
  subscriptionService,
} from "@/services/subscription.service";
import { useAppTheme } from "@/theme/ThemeProvider";
import type { SubscriptionPlan } from "@/types/subscription";
import { canManageStaffLifecycle } from "@/utils/userProfile";
import { resolveAuthenticatedRoute } from "@/utils/routeResolver";

const DEFAULT_TOTAL_COUNT = 12;
const IS_RAZORPAY_PAYMENT_ENABLED = false;
const PAYMENT_UNAVAILABLE_MESSAGE = "Payment is currently unavailable. Please try again later.";

export default function SubscriptionScreen() {
  const { colors, scheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, scheme), [colors, scheme]);
  const insets = useSafeAreaInsets();
  const { refreshCurrentUser, signOut, user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPayingPlanId, setIsPayingPlanId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const salonId = user?.salonId?.trim() ?? "";
  const canPurchaseSubscription = canManageStaffLifecycle(user?.role);
  const userName = user?.firstName || user?.fullName || "there";

  const handleCancelSubscription = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      // signOut handles its own errors; navigation guard will redirect to login
    } finally {
      setIsSigningOut(false);
    }
  };

  const loadPlans = useCallback(async () => {
    setError(null);

    try {
      const [nextPlans, subscription] = await Promise.all([
        canPurchaseSubscription ? subscriptionService.getPlans() : Promise.resolve([]),
        salonId ? subscriptionService.getSalonSubscription(salonId) : Promise.resolve(null),
      ]);

      if (isSubscriptionActive(subscription)) {
        router.replace(resolveAuthenticatedRoute(user));
        return;
      }

      setPlans(nextPlans);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    }
  }, [canPurchaseSubscription, salonId, user]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsLoading(true);
      await loadPlans();

      if (isMounted) {
        setIsLoading(false);
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [loadPlans]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPlans();
    setIsRefreshing(false);
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!IS_RAZORPAY_PAYMENT_ENABLED) {
      setSuccess(null);
      setError(PAYMENT_UNAVAILABLE_MESSAGE);
      return;
    }

    if (!salonId) {
      setError("Salon details are still loading. Please try again in a moment.");
      return;
    }

    if (!canPurchaseSubscription) {
      setError("Please ask your salon owner or admin to activate the subscription.");
      return;
    }

    if (isPayingPlanId) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsPayingPlanId(plan.id);

    try {
      const subscription = await subscriptionService.createSubscription({
        plan_id: plan.id,
        salon_id: salonId,
        total_count: plan.totalCount || DEFAULT_TOTAL_COUNT,
      });

      if (!subscription.shortUrl) {
        throw new Error("Payment link was not returned. Please try again.");
      }

      const callbackUrl = Linking.createURL("subscription/callback");
      const result = await WebBrowser.openAuthSessionAsync(subscription.shortUrl, callbackUrl);

      if (result.type !== "success") {
        setError("Payment was not completed. You can try again when ready.");
        return;
      }

      const verificationPayload = subscriptionService.readRazorpayValuesFromUrl(result.url);

      if (verificationPayload) {
        const verified = await subscriptionService.verifySubscription(salonId, verificationPayload);

        if (!isSubscriptionActive(verified.subscription)) {
          throw new Error("Payment was received, but the subscription is not active yet. Please refresh.");
        }
      }

      const activeSubscription = await subscriptionService.getSalonSubscription(salonId);

      if (!isSubscriptionActive(activeSubscription)) {
        throw new Error("We could not confirm an active subscription yet. Please refresh after payment.");
      }

      setSuccess("Subscription activated successfully.");
      await refreshCurrentUser();
      router.replace(resolveAuthenticatedRoute(user));
    } catch (paymentError) {
      setError(getApiErrorMessage(paymentError));
    } finally {
      setIsPayingPlanId(null);
    }
  };

  return (
    <LinearGradient colors={[colors.bg, colors.bg2]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom + 32, 48), paddingTop: Math.max(insets.top + 28, 44) },
        ]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroIcon}>
          <Ionicons name="sparkles-outline" size={28} color={colors.onPrimary} />
        </View>

        <Text style={styles.eyebrow}>SalonOX Subscription</Text>
        <Text style={styles.title}>Choose a plan to continue</Text>
        <Text style={styles.subtitle}>
          Hi {userName}, activate your salon subscription to unlock the SalonOX workspace.
        </Text>

        {!canPurchaseSubscription && (
          <View style={styles.noticeCard}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.warning} />
            <View style={styles.noticeTextWrap}>
              <Text style={styles.noticeTitle}>Owner action required</Text>
              <Text style={styles.noticeText}>
                Staff accounts do not manage subscription payments. Please ask the salon owner or admin to activate access.
              </Text>
            </View>
          </View>
        )}

        {canPurchaseSubscription && (
          <View style={styles.noticeCard}>
            <Ionicons name="time-outline" size={22} color={colors.warning} />
            <View style={styles.noticeTextWrap}>
              <Text style={styles.noticeTitle}>Payment temporarily unavailable</Text>
              <Text style={styles.noticeText}>{PAYMENT_UNAVAILABLE_MESSAGE}</Text>
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorCard} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={styles.successCard} accessibilityRole="alert">
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading subscription plans...</Text>
          </View>
        ) : (
          <View style={styles.planList}>
            {plans.map((plan) => {
              const isPayingThisPlan = isPayingPlanId === plan.id;

              return (
                <View key={plan.id} style={styles.planCard}>
                  <View style={styles.planHeader}>
                    <View>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planDescription}>
                        {plan.description || "Premium SalonOX access for your salon."}
                      </Text>
                    </View>
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>Premium</Text>
                    </View>
                  </View>

                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{subscriptionService.getPlanAmountLabel(plan)}</Text>
                    <Text style={styles.interval}>{subscriptionService.getPlanIntervalLabel(plan)}</Text>
                  </View>

                  <Pressable
                    accessibilityLabel={`Subscribe to ${plan.name}`}
                    accessibilityState={{ disabled: !IS_RAZORPAY_PAYMENT_ENABLED || Boolean(isPayingPlanId) }}
                    disabled={Boolean(isPayingPlanId)}
                    onPress={() => handleSelectPlan(plan)}
                    style={({ pressed }) => [
                      styles.subscribeButton,
                      (pressed || isPayingThisPlan) && styles.subscribeButtonPressed,
                      (!IS_RAZORPAY_PAYMENT_ENABLED || (Boolean(isPayingPlanId) && !isPayingThisPlan)) &&
                        styles.subscribeButtonDisabled,
                    ]}
                  >
                    <LinearGradient
                      colors={
                        IS_RAZORPAY_PAYMENT_ENABLED
                          ? [colors.primaryDark, colors.primary, colors.purple]
                          : [colors.backgroundElement, colors.backgroundSelected, colors.backgroundSelected]
                      }
                      end={{ x: 1, y: 0 }}
                      start={{ x: 0, y: 0 }}
                      style={styles.subscribeButtonGradient}
                    >
                      {isPayingThisPlan ? (
                        <ActivityIndicator color={colors.onPrimary} />
                      ) : (
                        <>
                          <Text
                            style={[
                              styles.subscribeButtonText,
                              !IS_RAZORPAY_PAYMENT_ENABLED && styles.subscribeButtonTextDisabled,
                            ]}
                          >
                            Payment Unavailable
                          </Text>
                          <Ionicons
                            name="lock-closed-outline"
                            size={18}
                            color={IS_RAZORPAY_PAYMENT_ENABLED ? colors.onPrimary : colors.text2}
                          />
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>
              );
            })}

            {canPurchaseSubscription && plans.length === 0 && (
              <View style={styles.loadingCard}>
                <Ionicons name="card-outline" size={28} color={colors.text2} />
                <Text style={styles.loadingText}>No subscription plans are available right now.</Text>
              </View>
            )}
          </View>
        )}

        <Pressable
          accessibilityLabel="Cancel subscription and return to login"
          disabled={isSigningOut}
          onPress={handleCancelSubscription}
          style={styles.cancelButton}
        >
          <Text style={[
            styles.cancelButtonText,
            isSigningOut && styles.cancelButtonTextDisabled,
          ]}>
            {isSigningOut ? "Signing out..." : "Cancel / Log In"}
          </Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"], scheme: "light" | "dark") =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 24,
    },
    heroIcon: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: colors.primary,
      borderRadius: 24,
      height: 56,
      justifyContent: "center",
      marginBottom: 22,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: scheme === "dark" ? 0.36 : 0.2,
      shadowRadius: 22,
      width: 56,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.4,
      marginBottom: 8,
      textTransform: "uppercase",
    },
    title: {
      color: colors.heading,
      fontSize: 30,
      fontWeight: "900",
      lineHeight: 36,
    },
    subtitle: {
      color: colors.text2,
      fontSize: 15,
      fontWeight: "500",
      lineHeight: 22,
      marginTop: 10,
      marginBottom: 24,
    },
    noticeCard: {
      alignItems: "flex-start",
      backgroundColor: colors.warningBg,
      borderColor: colors.warning,
      borderRadius: 20,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
      padding: 16,
    },
    noticeTextWrap: {
      flex: 1,
    },
    noticeTitle: {
      color: colors.heading,
      fontSize: 14,
      fontWeight: "800",
      marginBottom: 4,
    },
    noticeText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "500",
      lineHeight: 19,
    },
    errorCard: {
      alignItems: "center",
      backgroundColor: colors.errorBg,
      borderColor: colors.errorBorder,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      marginBottom: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    errorText: {
      color: colors.error,
      flex: 1,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 18,
    },
    successCard: {
      alignItems: "center",
      backgroundColor: colors.successBg,
      borderColor: colors.successBorder,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      marginBottom: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    successText: {
      color: colors.success,
      flex: 1,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 18,
    },
    loadingCard: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 12,
      padding: 24,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: scheme === "dark" ? 0.2 : 0.08,
      shadowRadius: 26,
      elevation: 5,
    },
    loadingText: {
      color: colors.text2,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "center",
    },
    planList: {
      gap: 16,
    },
    planCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 26,
      borderWidth: 1,
      padding: 18,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: scheme === "dark" ? 0.22 : 0.1,
      shadowRadius: 28,
      elevation: 6,
    },
    planHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    planName: {
      color: colors.heading,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 6,
    },
    planDescription: {
      color: colors.text2,
      fontSize: 13,
      fontWeight: "500",
      lineHeight: 19,
      maxWidth: 230,
    },
    planBadge: {
      backgroundColor: colors.purpleBg,
      borderColor: colors.purple,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    planBadgeText: {
      color: colors.purple,
      fontSize: 11,
      fontWeight: "900",
    },
    priceRow: {
      alignItems: "flex-end",
      flexDirection: "row",
      marginTop: 22,
      marginBottom: 18,
    },
    price: {
      color: colors.heading,
      fontSize: 32,
      fontWeight: "900",
      letterSpacing: -0.4,
    },
    interval: {
      color: colors.text2,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 6,
      marginLeft: 4,
    },
    subscribeButton: {
      borderRadius: 18,
      height: 54,
      overflow: "hidden",
    },
    subscribeButtonPressed: {
      opacity: 0.86,
      transform: [{ scale: 0.99 }],
    },
    subscribeButtonDisabled: {
      opacity: 0.62,
    },
    subscribeButtonGradient: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
    },
    subscribeButtonText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: "900",
    },
    subscribeButtonTextDisabled: {
      color: colors.text2,
    },
    cancelButton: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      marginTop: 24,
      paddingVertical: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
    },
    cancelButtonText: {
      color: colors.secondary,
      fontSize: 15,
      fontWeight: "800",
    },
    cancelButtonTextDisabled: {
      opacity: 0.6,
    },
  });
