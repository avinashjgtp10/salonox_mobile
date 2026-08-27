import type { SpotlightFeature } from "../types";
import { SPOTLIGHT_SEED_DATA } from "../data/spotlightMockData";

const FEATURES_KEY = "spotlight_features";
const READ_IDS_KEY = "spotlight_read_ids";

export function getAllFeatures(): SpotlightFeature[] {
  try {
    const raw = localStorage.getItem(FEATURES_KEY);
    if (!raw) {
      saveFeatures(SPOTLIGHT_SEED_DATA);
      return SPOTLIGHT_SEED_DATA;
    }
    const stored = JSON.parse(raw) as SpotlightFeature[];

    // New seed entries added to spotlightMockData.ts after a browser already
    // cached an older seed wouldn't otherwise show up — merge in any seed ids
    // missing from storage so shipping a new sample feature doesn't require
    // clearing localStorage by hand.
    const storedIds = new Set(stored.map((f) => f.id));
    const missing = SPOTLIGHT_SEED_DATA.filter((f) => !storedIds.has(f.id));
    if (missing.length > 0) {
      const merged = [...missing, ...stored];
      saveFeatures(merged);
      return merged;
    }

    return stored;
  } catch {
    return SPOTLIGHT_SEED_DATA;
  }
}

export function saveFeatures(features: SpotlightFeature[]): void {
  localStorage.setItem(FEATURES_KEY, JSON.stringify(features));
}

export function getReadIds(): string[] {
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function markIdRead(id: string): string[] {
  const ids = getReadIds();
  if (ids.includes(id)) return ids;
  const next = [...ids, id];
  localStorage.setItem(READ_IDS_KEY, JSON.stringify(next));
  return next;
}
