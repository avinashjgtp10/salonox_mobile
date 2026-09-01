import type { SpotlightFeature } from "../types";
import { SPOTLIGHT_SEED_DATA } from "../data/spotlightMockData";
import { recompressDataUrl } from "./compressImage";

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

function isQuotaExceeded(err: unknown): boolean {
  return err instanceof DOMException && (err.name === "QuotaExceededError" || err.code === 22);
}

function rawSave(features: SpotlightFeature[]): void {
  localStorage.setItem(FEATURES_KEY, JSON.stringify(features));
}

export function saveFeatures(features: SpotlightFeature[]): void {
  try {
    rawSave(features);
  } catch (err) {
    // Every feature's images are still base64 data URLs until the backend
    // upload endpoint ships (see uploadImage.ts) — a handful of full-size
    // screenshots across features can blow the ~5-10MB localStorage quota.
    // Surface that clearly instead of a generic failure so the person
    // editing knows removing/shrinking images is the actual fix.
    if (isQuotaExceeded(err)) {
      throw new Error(
        "Storage limit reached — this browser can't hold any more Spotlight images. Remove or replace an image on this or another feature, then try saving again."
      );
    }
    throw err;
  }
}

// Shrinks every image already stored across every feature — not just the
// one being edited — since the quota is shared across all of them. Videos
// (data:video/...) are left untouched; recompressDataUrl already no-ops on
// anything that isn't a still image.
async function compactStoredImages(features: SpotlightFeature[]): Promise<SpotlightFeature[]> {
  return Promise.all(
    features.map(async (feature) => {
      const images = feature.images
        ? await Promise.all(
            feature.images.map(async (img) => ({
              ...img,
              imageDataUrl: await recompressDataUrl(img.imageDataUrl),
            }))
          )
        : feature.images;
      const imageDataUrl = feature.imageDataUrl
        ? await recompressDataUrl(feature.imageDataUrl)
        : feature.imageDataUrl;
      return { ...feature, images, imageDataUrl };
    })
  );
}

// Same as saveFeatures, but on a quota failure it first tries to reclaim
// space by re-compressing every already-stored image down further, then
// retries once — so a save doesn't fail just because older screenshots were
// saved larger before compression settings were tightened. Thunks should
// call this instead of saveFeatures for any write that could grow storage
// (create/update); saveFeatures itself stays sync for getAllFeatures' seed
// merge, which never adds new images.
export async function saveFeaturesResilient(features: SpotlightFeature[]): Promise<void> {
  try {
    rawSave(features);
    return;
  } catch (err) {
    if (!isQuotaExceeded(err)) throw err;
  }

  const compacted = await compactStoredImages(features);
  try {
    rawSave(compacted);
  } catch (err) {
    if (isQuotaExceeded(err)) {
      throw new Error(
        "Storage limit reached even after shrinking existing images — please remove an image from one of your Spotlight features, then try saving again."
      );
    }
    throw err;
  }
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
