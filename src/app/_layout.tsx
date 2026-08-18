import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider, type Theme } from '@react-navigation/native';
import { Stack, usePathname, useRootNavigationState, useRouter, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SimpleSplash from '../components/simple-splash';
import { NetworkErrorModal } from '@/components/ui/NetworkErrorModal';
import { PortalProvider } from '@/components/ui/PortalProvider';
import { UpdateAnnouncementModal } from '@/components/ui/UpdateAnnouncementModal';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import type { ThemeColors } from '@/constants/theme';
import { useAppUpdateAnnouncement } from '@/hooks/useAppUpdateAnnouncement';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNetworkMonitor } from '@/hooks/useNetworkMonitor';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { fetchBranchesThunk } from '@/middleware/branch/branch.thunk';
import { resolveCurrentStaffThunk } from '@/middleware/staff/staff.thunk';
import { branchStorage } from '@/services/branchStorage';
import { isSubscriptionActive, subscriptionService } from '@/services/subscription.service';
import { store } from '@/store';
import { resetBranchState, selectActiveBranchId, setActiveBranchId } from '@/store/branch/branch.slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearCurrentStaff } from '@/store/staff/staff.slice';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/theme/ThemeProvider';
import {
  isOwnerRouteGroup,
  isOwnerOnlyRoute,
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

const PUBLIC_ROUTES = new Set([
  "index",
  "welcome",
  "login",
  "forgot-password",
  "verify-otp",
  "reset-password",
  "invite",
]);

function AuthNavigationHandler({ onReady }: { onReady: () => void }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [subscriptionCheck, setSubscriptionCheck] = useState<{
    isActive: boolean;
    salonId: string | null;
    status: "idle" | "loading" | "ready";
  }>({ isActive: false, salonId: null, status: "idle" });
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isAuthenticated) {
      setSubscriptionCheck({ isActive: false, salonId: null, status: "idle" });
      return;
    }

    const salonId = user?.salonId?.trim() ?? "";

    if (!salonId) {
      // SCRUM-1838: no salon yet (onboarding no longer runs before this
      // check can fire) — there's nothing to check a subscription against,
      // so fail open rather than blocking the user behind the subscription
      // paywall route.
      setSubscriptionCheck({ isActive: true, salonId: null, status: "ready" });
      return;
    }

    let isMounted = true;
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
          setSubscriptionCheck({ isActive: false, salonId, status: "ready" });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, pathname, user?.salonId]);

  useEffect(() => {
    if (!rootNavigationState?.key || isLoading) {
      return;
    }

    const topLevelSegment = String(segments[0] ?? "index");
    const isPublicRoute = PUBLIC_ROUTES.has(topLevelSegment);
    const isOnboardingRoute = topLevelSegment === "onboarding";
    const isVerifyEmailRoute = topLevelSegment === "verify-email";
    const isSubscriptionRoute = topLevelSegment === "subscription";

    if (isAuthenticated) {
      if (isVerifyEmailRoute) {
        onReady();
        return;
      }

      // SCRUM-1838: onboarding no longer gates authenticated routing — every
      // authenticated user goes straight through the subscription check into
      // their dashboard/home, regardless of isOnboardingComplete. A user who
      // somehow lands on /onboarding (e.g. a stale deep link) is bounced back
      // out via isOnboardingRoute below, same as any other unexpected route.
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
        (shouldUseStaffApp && isOwnerRouteGroup(topLevelSegment)) ||
        (shouldUseStaffApp && isOwnerOnlyRoute(topLevelSegment)) ||
        (!shouldUseStaffApp && isStaffRouteGroup(topLevelSegment));

      if (isPublicRoute || isOnboardingRoute || isSubscriptionRoute || isWrongAuthenticatedApp) {
        router.replace(resolveAuthenticatedRoute(user));
      } else {
        // The target authenticated route (dashboard/home) is now active in the navigator.
        onReady();
      }
    } else {
      if (!isPublicRoute) {
        if (router.canDismiss()) {
          router.dismissAll();
        }
        router.replace("/login" as Href);
      } else {
        // The public route (login/welcome) is active in the navigator.
        onReady();
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    onReady,
    pathname,
    rootNavigationState?.key,
    router,
    segments,
    subscriptionCheck.isActive,
    subscriptionCheck.status,
    user,
  ]);

  return null;
}

// Owns the single, app-wide push-notification listener/registration
// lifecycle — deliberately its own component (rather than folded into
// AuthNavigationHandler) so its one job stays obvious, and so it only ever
// mounts once regardless of how navigation logic evolves.
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

function AppUpdateSetup() {
  const { close, isVisible, updateInfo } = useAppUpdateAnnouncement();

  if (!updateInfo) {
    return null;
  }

  return (
    <UpdateAnnouncementModal
      androidStoreUrl={updateInfo.androidStoreUrl}
      currentVersion={updateInfo.currentVersion}
      description={updateInfo.message}
      iosStoreUrl={updateInfo.iosStoreUrl}
      isMandatory={updateInfo.isMandatory}
      latestVersion={updateInfo.latestVersion}
      onClose={close}
      title={updateInfo.title}
      visible={isVisible}
    />
  );
}

// Owns loading the current user's branch list and restoring/clearing the
// persisted active branch across login/logout — deliberately its own
// component (mirrors PushNotificationsSetup) so AuthContext itself stays
// untouched.
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

function AppShell() {
  const { colors, isHydrated: isThemeHydrated, scheme } = useAppTheme();
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const handleNavigationReady = useCallback(() => setIsNavigationReady(true), []);
  const navigationTheme = useMemo(() => buildNavigationTheme(scheme, colors), [scheme, colors]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <Provider store={store}>
        <AuthProvider>
          <PortalProvider>
            <AuthNavigationHandler onReady={handleNavigationReady} />
            <NetworkSetup />
            <AppUpdateSetup />
            <PushNotificationsSetup />
            <RealtimeSyncSetup />
            <BranchBootstrap />
            <StaffIdentityBootstrap />
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
              <Stack.Screen name="welcome" />
              <Stack.Screen name="forgot-password" />
              <Stack.Screen name="verify-otp" />
              <Stack.Screen name="reset-password" />
              <Stack.Screen name="verify-email" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="subscription" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="change-password" />
              <Stack.Screen name="salon-settings" />
              <Stack.Screen name="appearance" />
              <Stack.Screen name="privacy-policy" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(staff)" />
              <Stack.Screen name="index" />
              <Stack.Screen name="explore" />
            </Stack>
            <SimpleSplash backgroundColor={colors.bg} isReady={isThemeHydrated && isNavigationReady} />
            <NetworkErrorModal />
          </PortalProvider>
        </AuthProvider>
      </Provider>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AppShell />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
