import fs from "node:fs";
import path from "node:path";
import { AndroidConfig, withAndroidManifest, withDangerousMod } from "@expo/config-plugins";
import type { ConfigPlugin } from "@expo/config-plugins";
import type { ConfigContext, ExpoConfig } from "expo/config";

import { ENVIRONMENTS, resolveAppEnv } from "./config/environments";

const appEnv = resolveAppEnv(process.env.APP_ENV);
const env = ENVIRONMENTS[appEnv];

// Single source of truth for the app's semantic version. Both the Expo
// `version` and `runtimeVersion` below are derived from this, so bumping it
// here moves them together — a runtimeVersion that silently kept reporting an
// old version would let new JS be served to binaries that can't run it.
// ConfigContext's `config.version` is NOT usable for this: the project has no
// app.json, so it is always undefined.
const APP_VERSION = "1.0.0";

const existsInProject = (relativePath: string) => fs.existsSync(path.resolve(__dirname, relativePath));

// Dev/QA badged icons and per-environment Firebase apps are provisioned
// gradually — fall back to the production asset/omit the field instead of
// failing the build when an environment-specific file hasn't been added yet.
const resolveWithFallback = (candidatePath: string, fallbackPath: string) =>
  existsInProject(candidatePath) ? candidatePath : fallbackPath;

const icon = resolveWithFallback(env.iconPath, ENVIRONMENTS.production.iconPath);
const notificationLargeIcon = "./assets/images/logo.png";
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

const withSalonOxLargeNotificationIcon: ConfigPlugin = (config) => {
  const resourceName = "notification_large_icon";
  const metaDataName = "expo.modules.notifications.large_notification_icon";

  config = withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      metaDataName,
      `@drawable/${resourceName}`,
      "resource",
    );

    return config;
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const sourcePath = path.resolve(config.modRequest.projectRoot, notificationLargeIcon);
      const destinationDirectory = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "drawable-nodpi",
      );
      const destinationPath = path.join(destinationDirectory, `${resourceName}.png`);

      await fs.promises.mkdir(destinationDirectory, { recursive: true });
      await fs.promises.copyFile(sourcePath, destinationPath);

      return config;
    },
  ]);

  return config;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const expoConfig: ExpoConfig = {
    ...config,
    owner: "salonox-tech",
    name: env.appName,
    slug: "SalonOX",
    version: APP_VERSION,
    orientation: "portrait",
    icon,
    scheme: env.scheme,
    userInterfaceStyle: "automatic",
    updates: {
      url: "https://u.expo.dev/f049c562-d124-4c6d-a1be-a4405a64d9ec",
    },
    // Namespaced by environment so an update published to one channel can
    // never be served to a build from another: dev/QA/production each have
    // their own runtime version even when the app version matches.
    runtimeVersion: `${appEnv}-${APP_VERSION}`,
    ios: {
      ...config.ios,
      icon,
      bundleIdentifier: env.iosBundleIdentifier,
    },
    android: {
      ...config.android,
      package: env.androidPackage,
      adaptiveIcon: {
        backgroundColor: "#FAFBFA",
        foregroundImage: adaptiveIconForeground,
        backgroundImage: "./assets/images/android-launcher-background.png",
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
      "./plugins/with-launcher-logo-padding",
      // Style mods unwind in reverse order; this override must run last.
      "./plugins/with-plain-launch-screen",
      [
        "expo-location",
        {
          locationWhenInUsePermission: "Allow SalonOX to detect your salon address during onboarding.",
        },
      ],
      [
        "expo-splash-screen",
        {
          backgroundColor: "#f8f5fb",
          dark: {
            backgroundColor: "#f8f5fb",
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
      [
        "expo-contacts",
        {
          contactsPermission: "Allow SalonOX to access your contacts so you can import them as clients.",
        },
      ],
      "@react-native-community/datetimepicker",
      [
        "expo-notifications",
        {
          icon: "./assets/images/notification-icon.png",
          color: "#2f80ed",
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
        projectId: "f049c562-d124-4c6d-a1be-a4405a64d9ec",
      },
    },
  };

  return withSalonOxLargeNotificationIcon(expoConfig) as ExpoConfig;
};
