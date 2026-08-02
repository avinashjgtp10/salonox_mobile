import fs from "node:fs";
import path from "node:path";
import type { ConfigContext, ExpoConfig } from "expo/config";

import { ENVIRONMENTS, resolveAppEnv } from "./config/environments";

const appEnv = resolveAppEnv(process.env.APP_ENV);
const env = ENVIRONMENTS[appEnv];

const existsInProject = (relativePath: string) => fs.existsSync(path.resolve(__dirname, relativePath));

// Dev/QA badged icons and per-environment Firebase apps are provisioned
// gradually — fall back to the production asset/omit the field instead of
// failing the build when an environment-specific file hasn't been added yet.
const resolveWithFallback = (candidatePath: string, fallbackPath: string) =>
  existsInProject(candidatePath) ? candidatePath : fallbackPath;

const icon = resolveWithFallback(env.iconPath, ENVIRONMENTS.production.iconPath);
const adaptiveIconForeground = resolveWithFallback(
  env.adaptiveIconForegroundPath,
  ENVIRONMENTS.production.adaptiveIconForegroundPath,
);

const googleServicesFile = existsInProject(env.googleServicesFile) ? env.googleServicesFile : undefined;

if (!googleServicesFile) {
  console.warn(
    `[app.config.ts] Missing ${env.googleServicesFile} — push notifications (FCM) will be disabled for ` +
      `"${env.androidPackage}" until a Firebase Android app is registered for that package and its ` +
      `google-services.json is placed at ${env.googleServicesFile}.`,
  );
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: env.appName,
  slug: "SalonOX",
  version: "1.0.0",
  orientation: "portrait",
  icon,
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  ios: {
    ...config.ios,
    icon: "./assets/expo.icon",
    bundleIdentifier: env.iosBundleIdentifier,
  },
  android: {
    ...config.android,
    package: env.androidPackage,
    adaptiveIcon: {
      backgroundColor: "#FAFBFA",
      foregroundImage: adaptiveIconForeground,
      backgroundImage: "./assets/images/android-launcher-background.png",
      monochromeImage: "./assets/images/android-launcher-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    softwareKeyboardLayoutMode: "resize",
    permissions: [
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.POST_NOTIFICATIONS",
    ],
    ...(googleServicesFile ? { googleServicesFile } : {}),
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-location",
      {
        locationWhenInUsePermission: "Allow SalonOX to detect your salon address during onboarding.",
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#FAFBFA",
        dark: {
          backgroundColor: "#08111F",
          image: "./assets/images/splash-icon.png",
        },
        android: {
          image: "./assets/images/splash-icon.png",
          imageWidth: 76,
        },
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Allow SalonOX to access your photos so you can set a profile picture.",
        cameraPermission: "Allow SalonOX to use your camera so you can take a profile picture.",
      },
    ],
    "@react-native-community/datetimepicker",
    [
      "expo-notifications",
      {
        icon: "./assets/images/android-icon-foreground.png",
        color: "#3D6F59",
        defaultChannel: "salonox",
        enableBackgroundRemoteNotifications: true,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...config.extra,
    router: {},
    appEnv,
    eas: {
      projectId: "e0788543-1dc3-4071-91ad-69929ad0d266",
    },
  },
});
