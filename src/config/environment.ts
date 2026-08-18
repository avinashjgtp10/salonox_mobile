import Constants from "expo-constants";

const trimTrailingSlash = (value: string) => value.trim().replace(/\/+$/, "");

type PublicEnvKey = "EXPO_PUBLIC_API_BASE_URL" | "EXPO_PUBLIC_SOCKET_URL";

const PUBLIC_ENV: Record<PublicEnvKey, string | undefined> = {
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL,
};

const readPublicEnv = (key: PublicEnvKey) => {
  const value = PUBLIC_ENV[key]?.trim();

  return value ? trimTrailingSlash(value) : "";
};

// Set by app.config.ts (extra.appEnv) from the APP_ENV build variable — lets
// runtime code (logging, diagnostics, env-specific UI) know which of the
// three installable apps (dev/qa/production) it's running as.
export const appEnv = (Constants.expoConfig?.extra?.appEnv as string | undefined) ?? "production";

export const environmentConfig = {
  apiBaseUrl: readPublicEnv("EXPO_PUBLIC_API_BASE_URL"),
  socketUrl: readPublicEnv("EXPO_PUBLIC_SOCKET_URL"),
} as const;

// SCRUM-1840: Mobile has no dedicated EXPO_PUBLIC_WEB_APP_URL — the Web app
// lives on the same per-environment origin already configured for the
// realtime socket (dev.salonox.com / qa.salonox.com / www.salonox.com), so
// this reuses socketUrl rather than hardcoding a production-only URL (the
// way WEB_APP_URL in more.tsx/StaffSettingsScreen.tsx does for the
// environment-agnostic /terms and /about static pages).
export const webRegistrationUrl = environmentConfig.socketUrl
  ? `${environmentConfig.socketUrl}/register`
  : "";

export const getMissingEnvironmentVariables = () =>
  (Object.keys(PUBLIC_ENV) as PublicEnvKey[]).filter((key) => !PUBLIC_ENV[key]?.trim());

export const getEnvironmentConfigurationError = () => {
  const missingVariables = getMissingEnvironmentVariables();

  return missingVariables.length > 0
    ? `Missing Expo environment variable${missingVariables.length > 1 ? "s" : ""}: ${missingVariables.join(", ")}. Configure them in the active Expo environment file or EAS build profile.`
    : null;
};
