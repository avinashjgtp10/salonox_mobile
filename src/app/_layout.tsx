import { canAccessLunox, hasBusinessDashboard } from "@/utils/staffExperience";
import { RegionalPreferencesSync } from "@/localization/RegionalPreferencesSync";
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider, type Theme } from '@react-navigation/native';
import { Stack, useNavigationContainerRef, usePathname, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Provider } from 'react-redux';
import { AppState, LogBox } from "react-native";
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SimpleSplash from '../components/simple-splash';
import { AndroidNavigationBarScrim } from '@/components/ui/AndroidNavigationBarScrim';
import { AppToast } from '@/components/ui/AppToast';
import { OfflineTouchNotice } from '@/components/ui/OfflineTouchNotice';
import { AppAlertHost } from '@/components/ui/AppAlertHost';
import { StaffAttendanceGate } from '@/features/attendance/components/StaffAttendanceGate';
import { PortalProvider } from '@/components/ui/PortalProvider';
import { UpdateAnnouncementModal } from '@/components/ui/UpdateAnnouncementModal';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppRatingPrompt } from '@/features/appRating/AppRatingPrompt';
import { FirstLoginGuide } from '@/features/userGuide/UserGuide';
import type { ThemeColors } from '@/constants/theme';
import { useAppTimezone } from '@/hooks/useAppTimezone';
import { useAppUpdateAnnouncement } from '@/hooks/useAppUpdateAnnouncement';
import { useIsOnHomeScreen } from '@/hooks/useIsOnHomeScreen';
import { useOtaUpdate } from '@/hooks/useOtaUpdate';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { scheduleLunoxPromoNotification } from '@/services/lunoxPromoNotification';
import { useNetworkMonitor } from '@/hooks/useNetworkMonitor';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useStaffCalendarAccessSync } from '@/hooks/useStaffCalendarAccess';
import { useStaffProductAuditAccessSync } from '@/hooks/useStaffProductAuditAccess';
import { useStaffClientNameAccessSync } from '@/hooks/useStaffClientNameAccess';
import { fetchBranchesThunk } from '@/middleware/branch/branch.thunk';
import { resolveCurrentStaffThunk } from '@/middleware/staff/staff.thunk';
import { refreshOwnerProfilePhoto, resetOwnerProfilePhoto, usesSalonLogoAsProfilePhoto } from '@/features/profile/utils/ownerProfilePhoto';
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
import { setLoginNotice, SUBSCRIPTION_ENDED_NOTICE } from '@/utils/loginNotice';

SplashScreen.preventAutoHideAsync().catch(() => {});
LogBox.ignoreAllLogs();

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
  const subscriptionSignOutRef = useRef(false);
  const { isAuthenticated, isLoading, signOut, user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [subscriptionCheck, setSubscriptionCheck] = useState<{
    isActive: boolean;
    salonId: string | null;
    status: "idle" | "loading" | "ready" | "error";
  }>({ isActive: false, salonId: null, status: "idle" });
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const navigationRef = useNavigationContainerRef();
  const router = useRouter();
  const segments: string[] = useSegments();

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

    // Offline: open the app with what is already on the device instead of a
    // blocking error, and verify the subscription once the connection is back.
    if (!isOnline) {
      setSubscriptionCheck((current) =>
        current.salonId === salonId && current.status === "ready" ? current : { isActive: true, salonId, status: "ready" },
      );
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
  }, [isAuthenticated, isOnline, pathname, subscriptionRetry, user?.salonId]);

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
        // Staff can't renew: sign them out, and the login screen says why.
        // Owners and admins get the "subscription ended" screen to renew.
        if (isStaffExperienceUser(user)) {
          if (!subscriptionSignOutRef.current) {
            subscriptionSignOutRef.current = true;
            setLoginNotice(SUBSCRIPTION_ENDED_NOTICE);
            void signOut().finally(() => { subscriptionSignOutRef.current = false; });
          }
          return;
        }
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
        (!shouldUseStaffApp && isStaffRouteGroup(topLevelSegment)) ||
        (shouldUseStaffApp && hasBusinessDashboard(user) && isStaffRouteGroup(topLevelSegment) && String(segments[1]) === "home");

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
    signOut,
    subscriptionCheck.isActive,
    subscriptionCheck.status,
    user,
  ]);

  // A failed subscription check no longer blocks the app. The routing effect
  // above already calls onReady() on "error", so the user carries on into the
  // app, and the 15s retry timer keeps re-checking in the background — so a
  // genuinely expired subscription still gates once the API answers again.
  return null;
}

function PushNotificationsSetup() {
  const { isAuthenticated, user } = useAuth();

  usePushNotifications(isAuthenticated);

  // Queue the one-time "Meet Lunox AI" nudge for owners/managers who can use it.
  // Runs at startup, so existing installs schedule it on their next launch after
  // this update; a persisted flag keeps it to a single send per device.
  useEffect(() => {
    if (isAuthenticated && canAccessLunox(user)) {
      void scheduleLunoxPromoNotification();
    }
  }, [isAuthenticated, user]);

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
  const announcement = useAppUpdateAnnouncement(ready);
  const ota = useOtaUpdate(ready);
  const { isVisible, updateInfo } = announcement;
  const showsOtaUpdate = !updateInfo?.isUpdateAvailable && !updateInfo?.isMandatory && ota.hasUpdate;
  const updateVisible = showsOtaUpdate ? ota.visible : Boolean(updateInfo) && isVisible;
  const onHome = useIsOnHomeScreen();

  // Kept outside UpdateAnnouncements' branches so an open rating sheet survives update info arriving.
  return (
    <>
    <AppRatingPrompt enabled={ready && !updateVisible} />
    <UpdateAnnouncements announcement={announcement} onHome={onHome} ota={ota} ready={ready} showsOtaUpdate={showsOtaUpdate} />
    </>
  );
}

function UpdateAnnouncements({ announcement, onHome, ota, ready, showsOtaUpdate }: {
  announcement: ReturnType<typeof useAppUpdateAnnouncement>;
  onHome: boolean;
  ota: ReturnType<typeof useOtaUpdate>;
  ready: boolean;
  showsOtaUpdate: boolean;
}) {
  const { close, reopen, isVisible, updateInfo } = announcement;

  // Only one update popup, and only on the signed-in home screen (never on login).
  // Native release: a newer store version exists, so Update opens the Play Store / App Store.
  // JS-only release: an OTA is available, so Update downloads it and restarts the app.
  if (showsOtaUpdate) {
    return (
      <>
      <FirstLoginGuide enabled={ready && !ota.visible} />
      {onHome ? <UpdateAnnouncementModal
        description={ota.releaseNotes.message ?? "A new version of SalonOX is ready. Update now to get the latest improvements and fixes."}
        isMandatory={false}
        isUpdating={ota.isApplying}
        onClose={ota.dismiss}
        onReopen={ota.reopen}
        onUpdate={ota.apply}
        releaseNotes={ota.releaseNotes.notes}
        title={ota.releaseNotes.title ?? "New Update Available"}
        visible={ota.visible}
      /> : null}
      </>
    );
  }

  if (!updateInfo) {
    return <FirstLoginGuide enabled={ready} />;
  }

  return (
    <>
    <FirstLoginGuide enabled={ready && !isVisible} />
    {onHome ? <UpdateAnnouncementModal
      androidStoreUrl={updateInfo.androidStoreUrl}
      description={updateInfo.message}
      iosStoreUrl={updateInfo.iosStoreUrl}
      isMandatory={updateInfo.isMandatory}
      latestVersion={updateInfo.latestVersion}
      onClose={close}
      onReopen={reopen}
      releaseNotes={updateInfo.releaseNotes}
      title={updateInfo.title}
      visible={isVisible}
    /> : null}
    </>
  );
}

function AppTimezoneBootstrap() {
  useAppTimezone();
  return null;
}

function BranchBootstrap() {
  const { isAuthenticated, user } = useAuth();
  const dispatch = useAppDispatch();
  const wasAuthenticated = useRef<string | null>(null);
  const identity = isAuthenticated ? `${user?.id}:${user?.salonId}` : null;

  useEffect(() => {
    if (identity && wasAuthenticated.current !== identity) {
      wasAuthenticated.current = identity;

      void (async () => {
        const result = await dispatch(fetchBranchesThunk());
        if (wasAuthenticated.current !== identity) return;

        if (fetchBranchesThunk.fulfilled.match(result)) {
          const branches = result.payload;
          const persistedBranchId = await branchStorage.getActiveBranchId();
          const nextBranchId = user?.salonId ??
            branches.find((branch) => branch.id === persistedBranchId)?.id ?? branches[0]?.id ?? null;

          if (nextBranchId) {
            dispatch(setActiveBranchId(nextBranchId));
          }
        }
      })();

      return;
    }

    if (!isAuthenticated && wasAuthenticated.current) {
      wasAuthenticated.current = null;
      dispatch(resetBranchState());
      void branchStorage.clearActiveBranchId();
    }
  }, [dispatch, isAuthenticated, identity, user?.salonId]);

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

// Owners' profile picture is the salon logo (as on the web): load it on sign-in
// and re-read it when the app returns to the foreground, so a change made on the
// web shows up here.
function OwnerProfilePhotoBootstrap() {
  const { isAuthenticated, user } = useAuth();
  const activeBranchId = useAppSelector(selectActiveBranchId);
  const enabled = isAuthenticated && usesSalonLogoAsProfilePhoto(user);

  useEffect(() => {
    if (!enabled) {
      resetOwnerProfilePhoto();
      return;
    }
    void refreshOwnerProfilePhoto();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshOwnerProfilePhoto();
    });
    return () => subscription.remove();
  }, [activeBranchId, enabled, user?.id]);

  return null;
}

function StaffCalendarAccessBootstrap() {
  useStaffCalendarAccessSync();
  useStaffProductAuditAccessSync();
  useStaffClientNameAccessSync();

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
              <RegionalPreferencesSync />
              <AppTimezoneBootstrap />
              <BranchBootstrap />
              <StaffIdentityBootstrap />
              <OwnerProfilePhotoBootstrap />
              <StaffCalendarAccessBootstrap />
              <OfflineTouchNotice>
              <SafeAreaProvider style={{ flex: 1 }}>
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
                <Stack.Screen name="change-password" options={{ presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }} />
                <Stack.Screen name="salon-settings" />
                <Stack.Screen name="region-settings" />
                <Stack.Screen name="appearance" options={{ presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }} />
                <Stack.Screen name="notification-settings" options={{ presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }} />
                <Stack.Screen name="privacy-policy" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(staff)" />
                <Stack.Screen name="index" />
              </Stack>
              </StaffAttendanceGate>
              <AndroidNavigationBarScrim color={colors.bg} />
              </SafeAreaProvider>
              </OfflineTouchNotice>
              <SimpleSplash backgroundColor={colors.bg} isReady={isThemeHydrated && isNavigationReady} />
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
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AppShell />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
