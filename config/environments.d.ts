export type AppEnvName = "development" | "qa" | "production";

export type EnvironmentDefinition = {
  appName: string;
  androidPackage: string;
  iosBundleIdentifier: string;
  scheme: string;
  iconPath: string;
  adaptiveIconForegroundPath: string;
  googleServicesFile: string;
};

export const ENVIRONMENTS: Record<AppEnvName, EnvironmentDefinition>;
export const DEFAULT_APP_ENV: AppEnvName;
export function resolveAppEnv(value: string | undefined): AppEnvName;
