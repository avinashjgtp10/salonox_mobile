import { Text } from "@/components/ui/AppTypography";
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider, type Theme } from '@react-navigation/native';
import { Stack, useNavigationContainerRef, usePathname, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Provider } from 'react-redux';
import { Pressable, View } from "react-native";
import { PaperProvider } from 'react-native-paper';
import { Portal } from '@/components/ui/Portal';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SimpleSplash from '../components/simple-splash';
import { AppToast } from '@/components/ui/AppToast';
import { NetworkErrorModal } from '@/components/ui/NetworkErrorModal';
import { AppAlertHost } from '@/components/ui/AppAlertHost';
import { StaffAttendanceGate } from '@/features/attendance/components/StaffAttendanceGate';
import { PortalProvider } from '@/components/ui/PortalProvider';
import { UpdateAnnouncementModal } from '@/components/ui/UpdateAnnouncementModal';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { FirstLoginGuide } from '@/features/userGuide/UserGuide';
import type { ThemeColors } from '@/constants/theme';
import { useAppUpdateAnnouncement } from '@/hooks/useAppUpdateAnnouncement';
import { useOtaUpdate } from '@/hooks/useOtaUpdate';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNetworkMonitor } from '@/hooks/useNetworkMonitor';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useStaffCalendarAccessSync } from '@/hooks/useStaffCalendarAccess';
import { fetchBranchesThunk } from '@/middleware/branch/branch.thunk';
import { resolveCurrentStaffThunk } from '@/middleware/staff/staff.thunk';
import { branchStorage } from '@/services/branchStorage';
import { isSubscriptionActive, subscriptionService } from '@/services/subscription.service';
import { store } from '@/store';
import { resetBranchState, selectActiveBranchId, setActiveBranchId } from '@/store/branch/branch.slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearCurrentStaff } from '@/store/staff/staff.slice';
import { PaperIcon } from '@/theme/paperIcon';
import { buildPaperTheme } from '@/theme/paperTheme';
import { appFontAssets } from '@/theme/fontAssets';
import { AppFonts } from '@/theme/typography';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/theme/ThemeProvider';
import {
  isStaffAllowedRoute,
  isStaffExperienceUser,
  isStaffRouteGroup,
  resolveAuthenticatedRoute,
  SUBSCRIPTION_ROUTE,
} from '@/utils/routeResolver';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  initialRouteName: 'login',
};

function buildNavigationTheme(scheme: 'light' | 'dark', colors: ThemeColors): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return {
    ...base,
    dark: scheme === 'dark',
    fonts: {
      regular: { fontFamily: AppFonts.regular, fontWeight: '400' },
      medium: { fontFamily: AppFonts.medium, fontWeight: '400' },
      bold: { fontFamily: AppFonts.bold, fontWeight: '400' },
      heavy: { fontFamily: AppFonts.extrabold, fontWeight: '400' },
    },
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.card,
      text: colors.heading,
      border: colors.border,
      notification: colors.gold,
    },
  };
}

const PAPER_SETTINGS = { icon: PaperIcon };

const PUBLIC_ROUTES = new Set([
  "index",
  "login",
  "forgot-password",
  "verify-otp",
  "verify-email",
  "reset-password",
  "invite",
]);

function AuthNavigationHandler({ onReady }: { onReady: () => void }) {
  const [subscriptionRetry, setSubscriptionRetry] = useState(0);
  const { isAuthenticated, isLoading, user } = useAuth();
  const [subscriptionCheck, setSubscriptionCheck] = useState<{
    isActive: boolean;
    salonId: string | null;
    status: "idle" | "loading" | "ready" | "error";
  }>({ isActive: false, salonId: null, status: "idle" });
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const navigationRef = useNavigationContainerRef();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isAuthenticated) {
      setSubscriptionCheck({ isActive: false, salonId: null, status: "idle" });
      return;
    }

    const salonId = user?.salonId?.trim() ?? "";

    if (!salonId) {
      setSubscriptionCheck({ isActive: true, salonId: null, status: "ready" });
      return;
    }

    let isMounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    setSubscriptionCheck((current) =>
      current.salonId === salonId && current.status === "ready" && current.isActive
        ? current
        : { isActive: false, salonId, status: "loading" },
    );

    void subscriptionService
      .getSalonSubscription(salonId)
      .then((subscription) => {
        if (isMounted) {
          setSubscriptionCheck({
            isActive: isSubscriptionActive(subscription),
            salonId,
            status: "ready",
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setSubscriptionCheck((current) =>
            current.salonId === salonId && current.status === "ready" && current.isActive
              ? current
              : { isActive: false, salonId, status: "error" },
          );
          retryTimer = setTimeout(() => setSubscriptionRetry((value) => value + 1), 15000);
        }
      });

    return () => {
      isMounted = false;
      clearTimeout(retryTimer);
    };
  }, [isAuthenticated, pathname, subscriptionRetry, user?.salonId]);

  useEffect(() => {
    if (!rootNavigationState?.key || isLoading) {
      return;
    }

    const topLevelSegment = String(segments[0] ?? "index");
    const isPublicRoute = PUBLIC_ROUTES.has(topLevelSegment);
    const isVerifyEmailRoute = topLevelSegment === "verify-email";
    const isSubscriptionRoute = topLevelSegment === "subscription";

    if (isAuthenticated) {
      if (isVerifyEmailRoute) {
        onReady();
        return;
      }

      if (subscriptionCheck.status === "error") {
        onReady();
        return;
      }
      if (subscriptionCheck.status !== "ready") {
        return;
      }

      if (!subscriptionCheck.isActive) {
        if (!isSubscriptionRoute) {
          router.replace(SUBSCRIPTION_ROUTE);
        } else {
          onReady();
        }
        return;
      }

      const shouldUseStaffApp = isStaffExperienceUser(user);
      const isWrongAuthenticatedApp =
        (shouldUseStaffApp && !isStaffAllowedRoute(topLevelSegment, user)) ||
        (!shouldUseStaffApp && isStaffRouteGroup(topLevelSegment));

      if (isPublicRoute || isSubscriptionRoute || isWrongAuthenticatedApp) {
        router.replace(resolveAuthenticatedRoute(user));
      } else {
        onReady();
      }
    } else {
      if (!isPublicRoute) {
        // One reset clears every stacked screen. dismissAll() + replace() raced
        // after a sign-out and logged an unhandled POP_TO_TOP.
        navigationRef.reset({ index: 0, routes: [{ name: "login" }] });
      } else {
        onReady();
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    navigationRef,
    onReady,
    pathname,
    rootNavigationState?.key,
    router,
    segments,
    subscriptionCheck.isActive,
    subscriptionCheck.status,
    user,
  ]);

  if (isAuthenticated && subscriptionCheck.status === "error") {
    return (
      <Portal>
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#FFFFFF', justifyContent: 'center', padding: 28, gap: 16 }}>
          <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '700', color: '#222222' }}>Unable to verify subscription</Text>
          <Text style={{ fontSize: 16, color: '#555555' }}>We could not check your subscription right now. Please check your connection and try again.</Text>
          <Pressable accessibilityRole="button" onPress={() => setSubscriptionRetry((value) => value + 1)} style={{ backgroundColor: '#AD568F', padding: 16, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Try Again</Text>
          </Pressable>
        </View>
      </Portal>
    );
  }
  return null;
}

function PushNotificationsSetup() {
  const { isAuthenticated } = useAuth();

  usePushNotifications(isAuthenticated);

  return null;
}

function RealtimeSyncSetup() {
  const { isAuthenticated } = useAuth();

  useRealtimeSync(isAuthenticated);

  return null;
}

function NetworkSetup() {
  useNetworkMonitor();

  return null;
}

function AppUpdateSetup({ ready }: { ready: boolean }) {
  const { close, reopen, isVisible, updateInfo } = useAppUpdateAnnouncement();
  const ota = useOtaUpdate();

  // A store (binary) update takes priority; otherwise announce a new EAS Update.
  if (!updateInfo?.isUpdateAvailable && !updateInfo?.isMandatory && ota.hasUpdate) {
    return (
      <>
      <FirstLoginGuide enabled={ready && !ota.visible} />
      <UpdateAnnouncementModal
        description="A new version of SalonOX is ready. Update now to get the latest improvements and fixes."
        isMandatory={false}
        isUpdating={ota.isApplying}
        onClose={ota.dismiss}
        onReopen={ota.reopen}
        onUpdate={ota.apply}
        reminderMessage="Tap Show Update whenever you're ready to update."
        title="SalonOX Update"
        visible={ota.visible}
      />
      </>
    );
  }

  if (!updateInfo) {
    return <FirstLoginGuide enabled={ready} />;
  }

  return (
    <>
    <FirstLoginGuide enabled={ready && !isVisible} />
    <UpdateAnnouncementModal
      androidStoreUrl={updateInfo.androidStoreUrl}
      currentVersion={updateInfo.currentVersion}
      description={updateInfo.message}
      iosStoreUrl={updateInfo.iosStoreUrl}
      isMandatory={updateInfo.isMandatory}
      latestVersion={updateInfo.latestVersion}
      onClose={close}
      onReopen={reopen}
      releaseNotes={updateInfo.releaseNotes}
      title={updateInfo.title}
      visible={isVisible}
    />
    </>
  );
}

function BranchBootstrap() {
  const { isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !wasAuthenticated.current) {
      wasAuthenticated.current = true;

      void (async () => {
        const result = await dispatch(fetchBranchesThunk());

        if (fetchBranchesThunk.fulfilled.match(result)) {
          const branches = result.payload;
          const persistedBranchId = await branchStorage.getActiveBranchId();
          const nextBranchId =
            branches.find((branch) => branch.id === persistedBranchId)?.id ?? branches[0]?.id ?? null;

          if (nextBranchId) {
            dispatch(setActiveBranchId(nextBranchId));
          }
        }
      })();

      return;
    }

    if (!isAuthenticated && wasAuthenticated.current) {
      wasAuthenticated.current = false;
      dispatch(resetBranchState());
      void branchStorage.clearActiveBranchId();
    }
  }, [dispatch, isAuthenticated]);

  return null;
}

function StaffIdentityBootstrap() {
  const { isAuthenticated, user } = useAuth();
  const dispatch = useAppDispatch();
  const activeBranchId = useAppSelector(selectActiveBranchId);
  const resolvedIdentityKeyRef = useRef<string | null>(null);
  const userId = user?.id?.trim() ?? "";
  const identityKey = `${userId}:${activeBranchId ?? "all-branches"}`;
  const shouldResolveStaff = isAuthenticated && isStaffExperienceUser(user);

  useEffect(() => {
    if (!shouldResolveStaff) {
      resolvedIdentityKeyRef.current = null;
      dispatch(clearCurrentStaff());
      return;
    }

    if (!userId || resolvedIdentityKeyRef.current === identityKey) {
      return;
    }

    resolvedIdentityKeyRef.current = identityKey;
    void dispatch(resolveCurrentStaffThunk(userId));
  }, [dispatch, identityKey, shouldResolveStaff, userId]);

  return null;
}

function StaffCalendarAccessBootstrap() {
  useStaffCalendarAccessSync();

  return null;
}

function AppShell() {
  const { colors, isHydrated: isThemeHydrated, scheme } = useAppTheme();
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const handleNavigationReady = useCallback(() => setIsNavigationReady(true), []);
  const navigationTheme = useMemo(() => buildNavigationTheme(scheme, colors), [scheme, colors]);
  const paperTheme = useMemo(() => buildPaperTheme(scheme, colors), [scheme, colors]);

  return (
    <PaperProvider settings={PAPER_SETTINGS} theme={paperTheme}>
      <NavigationThemeProvider value={navigationTheme}>
        <Provider store={store}>
          <AuthProvider>
            <PortalProvider>
              <AuthNavigationHandler onReady={handleNavigationReady} />
              <NetworkSetup />
              <AppUpdateSetup ready={isThemeHydrated && isNavigationReady} />
              <PushNotificationsSetup />
              <RealtimeSyncSetup />
              <BranchBootstrap />
              <StaffIdentityBootstrap />
              <StaffCalendarAccessBootstrap />
              <StaffAttendanceGate>
              <Stack
                initialRouteName="login"
                screenOptions={{
                  animation: "slide_from_right",
                  contentStyle: { backgroundColor: colors.bg },
                  headerShown: false,
                  navigationBarColor: colors.bg,
                }}
              >
                <Stack.Screen name="login" />
                <Stack.Screen name="forgot-password" />
                <Stack.Screen name="verify-otp" />
                <Stack.Screen name="reset-password" />
                <Stack.Screen name="verify-email" />
                <Stack.Screen name="subscription" />
                <Stack.Screen name="profile" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="inbox" />
                <Stack.Screen name="today-revenue" />
                <Stack.Screen name="change-password" />
                <Stack.Screen name="salon-settings" />
                <Stack.Screen name="appearance" />
                <Stack.Screen name="notification-settings" />
                <Stack.Screen name="privacy-policy" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(staff)" />
                <Stack.Screen name="index" />
                <Stack.Screen name="explore" />
              </Stack>
              </StaffAttendanceGate>
              <SimpleSplash backgroundColor={colors.bg} isReady={isThemeHydrated && isNavigationReady} />
              <NetworkErrorModal />
              <AppToast />
              <AppAlertHost />
            </PortalProvider>
          </AuthProvider>
        </Provider>
      </NavigationThemeProvider>
    </PaperProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(appFontAssets);
  useEffect(() => {
    if (fontError) console.warn('[Typography] Unable to load bundled fonts', fontError);
  }, [fontError]);
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AppShell />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
