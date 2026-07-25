// Build-time environment registry consumed by app.config.ts (Node/CommonJS —
// Expo's dynamic-config loader only transpiles app.config.ts itself, so
// anything it requires must already be plain JS). Runtime values (API/socket
// URLs) stay solely in .env.* / eas.json via EXPO_PUBLIC_* vars — see
// src/config/environment.ts — so they are not duplicated here.
// Types for this module live in ./environments.d.ts.

const ENVIRONMENTS = {
  development: {
    appName: "SalonOX Dev",
    androidPackage: "com.salonox.app.dev",
    iosBundleIdentifier: "com.salonox.app.dev",
    scheme: "salonoxdev",
    iconPath: "./assets/images/icon-dev.png",
    adaptiveIconForegroundPath: "./assets/images/android-launcher-foreground-dev.png",
    googleServicesFile: "./google-services.dev.json",
  },
  qa: {
    appName: "SalonOX QA",
    androidPackage: "com.salonox.app.qa",
    iosBundleIdentifier: "com.salonox.app.qa",
    scheme: "salonoxqa",
    iconPath: "./assets/images/icon-qa.png",
    adaptiveIconForegroundPath: "./assets/images/android-launcher-foreground-qa.png",
    googleServicesFile: "./google-services.qa.json",
  },
  production: {
    appName: "SalonOX",
    androidPackage: "com.salonox.app",
    iosBundleIdentifier: "com.salonox.app",
    scheme: "salonox",
    iconPath: "./assets/images/icon.png",
    adaptiveIconForegroundPath: "./assets/images/android-launcher-foreground.png",
    googleServicesFile: "./google-services.json",
  },
};

const DEFAULT_APP_ENV = "production";

const resolveAppEnv = (value) =>
  value === "development" || value === "qa" || value === "production" ? value : DEFAULT_APP_ENV;

module.exports = { ENVIRONMENTS, DEFAULT_APP_ENV, resolveAppEnv };
