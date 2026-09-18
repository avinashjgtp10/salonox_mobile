import { api } from "@/services/api";
import { SPOTLIGHT } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type { SpotlightFeature, SpotlightList } from "@/types/spotlight";
import { asRecord, firstValue, toSafeString, type UnknownRecord } from "@/utils/apiNormalize";

type SpotlightListApiData = {
  features?: UnknownRecord[] | null;
  readIds?: unknown[] | null;
  read_ids?: unknown[] | null;
};

const toIdList = (payload: SpotlightListApiData) => {
  const raw = payload.readIds ?? payload.read_ids ?? [];

  return (Array.isArray(raw) ? raw : []).map((value) => toSafeString(value)).filter(Boolean);
};

const normalizeFeature = (entry: UnknownRecord): SpotlightFeature | null => {
  const id = toSafeString(firstValue(entry, ["id", "_id"]));
  const featureName = toSafeString(firstValue(entry, ["featureName", "feature_name"]));

  // A feature with no id can't be marked explored, and one with no name has
  // nothing to announce — skip rather than render a blank card.
  if (!id || !featureName) {
    return null;
  }

  return {
    featureName,
    id,
    module: toSafeString(firstValue(entry, ["module"])),
    moduleRoute: toSafeString(firstValue(entry, ["moduleRoute", "module_route"])) || null,
    releaseDate: toSafeString(firstValue(entry, ["releaseDate", "release_date"])) || null,
    shortDescription: toSafeString(firstValue(entry, ["shortDescription", "short_description"])),
  };
};

export const spotlightService = {
  async getFeatures(): Promise<SpotlightList> {
    const response = await api.get<ApiResponse<SpotlightListApiData>>(SPOTLIGHT.LIST);
    const data = response.data.data ?? {};
    const features = (Array.isArray(data.features) ? data.features : [])
      .map((entry) => normalizeFeature(asRecord(entry)))
      .filter((feature): feature is SpotlightFeature => feature !== null);

    return { features, readIds: toIdList(data) };
  },
};
