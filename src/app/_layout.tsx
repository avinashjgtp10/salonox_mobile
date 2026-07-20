import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider, type Theme } from '@react-navigation/native';
import { Stack, usePathname, useRootNavigationState, useRouter, useSegments, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SimpleSplash from '../components/simple-splash';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { PortalProvider } from '@/components/ui/PortalProvider';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import type { ThemeColors } from '@/constants/theme';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNetworkMonitor } from '@/hooks/useNetworkMonitor';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { fetchBranchesThunk } from '@/middleware/branch/branch.thunk';
import { branchStorage } from '@/services/branchStorage';
import { store } from '@/store';
import { resetBranchState, setActiveBranchId } from '@/store/branch/branch.slice';
import { useAppDispatch } from '@/store/hooks';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/theme/ThemeProvider';

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
  "login",
  "forgot-password",
  "verify-otp",
  "reset-password",
  "invite",
]);

function AuthNavigationHandler({ onReady }: { onReady: () => void }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!rootNavigationState?.key || isLoading) {
      return;
    }

    // The session check (and, on the very first run, the redirect below) has
    // now resolved — safe to let the splash overlay hand off to whichever
    // screen we land on, instead of hiding on a fixed timer regardless of
    // whether auth actually finished checking.
    onReady();

    const topLevelSegment = segments[0] ?? "index";
    const isPublicRoute = PUBLIC_ROUTES.has(topLevelSegment);
    const isOnboardingRoute = topLevelSegment === "onboarding";
    const isVerifyEmailRoute = topLevelSegment === "verify-email";

    if (isAuthenticated) {
      // Email verification is an authenticated-only screen that manages its own
      // exit navigation (verify / resend / "verify later"). Don't let the guard
      // bounce the user off it in either onboarding state.
      if (isVerifyEmailRoute) {
        return;
      }

      if (user?.isOnboardingComplete) {
        if (isPublicRoute || isOnboardingRoute) {
          router.replace("/dashboard" as Href);
        }
      } else {
        if (!isOnboardingRoute) {
          router.replace("/onboarding" as Href);
        }
      }
    } else {
      if (!isPublicRoute) {
        if (router.canDismiss()) {
          router.dismissAll();
        }
        router.replace("/login" as Href);
      }
    }
  }, [isAuthenticated, isLoading, onReady, user, pathname, rootNavigationState?.key, router, segments]);

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
            <PushNotificationsSetup />
            <RealtimeSyncSetup />
            <BranchBootstrap />
            <SimpleSplash backgroundColor={colors.bg} isReady={isThemeHydrated && isNavigationReady} />
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
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="change-password" />
              <Stack.Screen name="salon-settings" />
              <Stack.Screen name="appearance" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="index" />
              <Stack.Screen name="explore" />
            </Stack>
            <OfflineBanner />
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
