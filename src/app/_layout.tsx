import { DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { Stack, usePathname, useRootNavigationState, useRouter, useSegments, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import SimpleSplash from '../components/simple-splash';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SageGold } from '@/constants/theme';
import { store } from '@/store';

export const unstable_settings = {
  initialRouteName: 'login',
};

const SalonOXTheme: Theme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: SageGold.primary,
    background: SageGold.background,
    card: SageGold.card,
    text: SageGold.heading,
    border: SageGold.border,
    notification: SageGold.accentGold,
  },
};

const PUBLIC_ROUTES = new Set([
  "index",
  "login",
  "forgot-password",
  "verify-otp",
  "reset-password",
  "invite",
]);

function AuthNavigationHandler() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!rootNavigationState?.key || isLoading) {
      return;
    }

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
  }, [isAuthenticated, isLoading, user, pathname, rootNavigationState?.key, router, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider value={SalonOXTheme}>
      <Provider store={store}>
        <AuthProvider>
          <AuthNavigationHandler />
          <SimpleSplash />
          <Stack initialRouteName="login" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="verify-otp" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="verify-email" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="change-password" />
            <Stack.Screen name="salon-settings" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="index" />
            <Stack.Screen name="explore" />
          </Stack>
        </AuthProvider>
      </Provider>
    </ThemeProvider>
  );
}
