const trimTrailingSlash = (value: string) => value.trim().replace(/\/+$/, "");

const readRequiredPublicEnv = (key: "EXPO_PUBLIC_API_BASE_URL" | "EXPO_PUBLIC_SOCKET_URL") => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is required. Configure it in the active Expo environment file or EAS build profile.`);
  }

  return trimTrailingSlash(value);
};

export const environmentConfig = {
  apiBaseUrl: readRequiredPublicEnv("EXPO_PUBLIC_API_BASE_URL"),
  socketUrl: readRequiredPublicEnv("EXPO_PUBLIC_SOCKET_URL"),
} as const;
