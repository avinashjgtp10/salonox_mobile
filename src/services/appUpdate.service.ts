import Constants from "expo-constants";
import { Platform } from "react-native";

import { appEnv } from "@/config/environment";
import { api } from "@/services/api";
import type { ApiResponse } from "@/types/auth";

export type AppUpdatePlatform = "android" | "ios";
export type AppUpdateEnvironment = "development" | "qa" | "production";

export type AppReleaseNote = {
  description: string;
  title: string;
};

export type AppUpdatePayload = {
  appStoreUrl?: string | null;
  androidStoreUrl?: string | null;
  forceUpdate?: boolean;
  iosStoreUrl?: string | null;
  latestVersion?: string | null;
  message?: string | null;
  minimumSupportedVersion?: string | null;
  minimumVersion?: string | null;
  playStoreUrl?: string | null;
  releaseNotes?: unknown;
  title?: string | null;
  updateAvailable?: boolean;
};

type NormalizedAppUpdatePayload = {
  androidStoreUrl?: string | null;
  iosStoreUrl?: string | null;
  isMandatory: boolean;
  latestVersion: string;
  message?: string | null;
  minimumVersion?: string | null;
  releaseNotes: AppReleaseNote[];
  title?: string | null;
};

export type AppUpdateInfo = NormalizedAppUpdatePayload & {
  currentVersion: string;
  isUpdateAvailable: boolean;
};

const APP_VERSION_ENDPOINT = "/app/version";

const APP_VERSION_TIMEOUT_MS = 8000;

export const getInstalledAppVersion = (): string | null => {
  const version =
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version ??
    null;
  const trimmed = typeof version === "string" ? version.trim() : "";

  return trimmed.length > 0 ? trimmed : null;
};

export const getUpdatePlatform = (): AppUpdatePlatform =>
  Platform.OS === "ios" ? "ios" : "android";

export const getUpdateEnvironment = (): AppUpdateEnvironment =>
  appEnv === "development" || appEnv === "qa" ? appEnv : "production";

const normalizeVersion = (value?: string | null) =>
  (value ?? "")
    .trim()
    .split(/[+-]/)[0]
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));

export const compareVersions = (left?: string | null, right?: string | null) => {
  const leftParts = normalizeVersion(left);
  const rightParts = normalizeVersion(right);
  const length = Math.max(leftParts.length, rightParts.length, 3);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart > rightPart) {
      return 1;
    }

    if (leftPart < rightPart) {
      return -1;
    }
  }

  return 0;
};

const isUsableVersion = (value?: string | null) =>
  typeof value === "string" && /^\d+(\.\d+)*([-+].*)?$/.test(value.trim());

const normalizeReleaseNotes = (value: unknown): AppReleaseNote[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const note = entry as { description?: unknown; title?: unknown } | null;
    const title = typeof note?.title === "string" ? note.title.trim() : "";
    const description = typeof note?.description === "string" ? note.description.trim() : "";

    if (!title && !description) {
      return [];
    }

    return [{ description, title }];
  });
};

export const appUpdateService = {
  async checkForUpdate(): Promise<AppUpdateInfo | null> {
    const currentVersion = getInstalledAppVersion();

    if (!currentVersion) {
      return null;
    }

    const response = await api.get<ApiResponse<AppUpdatePayload>>(APP_VERSION_ENDPOINT, {
      params: {
        currentVersion,
        environment: getUpdateEnvironment(),
        platform: getUpdatePlatform(),
      },
      timeout: APP_VERSION_TIMEOUT_MS,
    });
    const data = response.data?.data;

    if (!isUsableVersion(data?.latestVersion)) {
      return null;
    }

    const latestVersion = (data?.latestVersion as string).trim();
    const minimumVersion = data?.minimumSupportedVersion ?? data?.minimumVersion ?? null;
    const isUpdateAvailable =
      typeof data?.updateAvailable === "boolean"
        ? data.updateAvailable
        : compareVersions(currentVersion, latestVersion) < 0;
    const isMandatory =
      Boolean(data?.forceUpdate) ||
      (isUsableVersion(minimumVersion)
        ? compareVersions(currentVersion, minimumVersion) < 0
        : false);

    return {
      androidStoreUrl: data?.androidStoreUrl ?? data?.playStoreUrl ?? null,
      currentVersion,
      iosStoreUrl: data?.iosStoreUrl ?? data?.appStoreUrl ?? null,
      isMandatory,
      isUpdateAvailable,
      latestVersion,
      message: data?.message,
      minimumVersion,
      releaseNotes: normalizeReleaseNotes(data?.releaseNotes),
      title: data?.title,
    };
  },
};
