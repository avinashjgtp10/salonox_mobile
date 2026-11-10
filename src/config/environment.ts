import Constants from "expo-constants";

const trimTrailingSlash = (value: string) => value.trim().replace(/\/+$/, "");

type PublicEnvKey =
  | "EXPO_PUBLIC_API_BASE_URL"
  | "EXPO_PUBLIC_SOCKET_URL"
  | "EXPO_PUBLIC_WEB_REGISTRATION_URL";

const PUBLIC_ENV: Record<PublicEnvKey, string | undefined> = {
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL,
  EXPO_PUBLIC_WEB_REGISTRATION_URL: process.env.EXPO_PUBLIC_WEB_REGISTRATION_URL,
};

const readPublicEnv = (key: PublicEnvKey) => {
  const value = PUBLIC_ENV[key]?.trim();

  return value ? trimTrailingSlash(value) : "";
};

export const appEnv = (Constants.expoConfig?.extra?.appEnv as string | undefined) ?? "production";

export const environmentConfig = {
  apiBaseUrl: readPublicEnv("EXPO_PUBLIC_API_BASE_URL"),
  socketUrl: readPublicEnv("EXPO_PUBLIC_SOCKET_URL"),
  webRegistrationUrl: readPublicEnv("EXPO_PUBLIC_WEB_REGISTRATION_URL"),
} as const;

/**
 * Native Google sign-in (optional: the Google button explains it isn't available
 * when unset, nothing fails at startup). Both come from the Google Cloud project's
 * OAuth clients: the "Web application" client and the iOS client for this bundle ID.
 */
export const googleSignInConfig = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "",
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? "",
} as const;

export const getMissingEnvironmentVariables = () =>
  (Object.keys(PUBLIC_ENV) as PublicEnvKey[]).filter((key) => !PUBLIC_ENV[key]?.trim());

export const getEnvironmentConfigurationError = () => {
  const missingVariables = getMissingEnvironmentVariables();

  return missingVariables.length > 0
    ? `Missing Expo environment variable${missingVariables.length > 1 ? "s" : ""}: ${missingVariables.join(", ")}. Configure them in the active Expo environment file or EAS build profile.`
    : null;
};
