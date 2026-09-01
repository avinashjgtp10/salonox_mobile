import Constants from "expo-constants";

import { api } from "@/services/api";
import type { ApiResponse } from "@/types/auth";

export type AppUpdatePayload = {
  appStoreUrl?: string | null;
  androidStoreUrl?: string | null;
  forceUpdate?: boolean;
  iosStoreUrl?: string | null;
  latestVersion: string;
  message?: string | null;
  minimumSupportedVersion?: string | null;
  minimumVersion?: string | null;
  playStoreUrl?: string | null;
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
  title?: string | null;
};

export type AppUpdateInfo = NormalizedAppUpdatePayload & {
  currentVersion: string;
  isUpdateAvailable: boolean;
};

const APP_VERSION_ENDPOINT = "/app/version";

export const getInstalledAppVersion = () =>
  Constants.expoConfig?.version ??
  Constants.manifest2?.extra?.expoClient?.version ??
  "0.0.0";

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

export const appUpdateService = {
  async checkForUpdate(): Promise<AppUpdateInfo | null> {
    const currentVersion = getInstalledAppVersion();
    const response = await api.get<ApiResponse<AppUpdatePayload>>(APP_VERSION_ENDPOINT, {
      params: { currentVersion },
    });
    const data = response.data.data;

    if (!data?.latestVersion) {
      return null;
    }

    const minimumVersion = data.minimumSupportedVersion ?? data.minimumVersion ?? null;
    const isUpdateAvailable =
      typeof data.updateAvailable === "boolean"
        ? data.updateAvailable
        : compareVersions(currentVersion, data.latestVersion) < 0;
    const isMandatory =
      Boolean(data.forceUpdate) ||
      (minimumVersion ? compareVersions(currentVersion, minimumVersion) < 0 : false);

    return {
      androidStoreUrl: data.androidStoreUrl ?? data.playStoreUrl ?? null,
      currentVersion,
      iosStoreUrl: data.iosStoreUrl ?? data.appStoreUrl ?? null,
      isMandatory,
      isUpdateAvailable,
      latestVersion: data.latestVersion,
      message: data.message,
      minimumVersion,
      title: data.title,
    };
  },
};
