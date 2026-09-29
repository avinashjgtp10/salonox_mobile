const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_SIZE_BYTES = 999 * 1024;

/** The subset of an image-picker asset the avatar checks need. */
export type PickedImage = {
  fileName?: string | null;
  fileSize?: number;
  mimeType?: string;
  uri: string;
};

const getPickedFileName = (uri: string, fallback: string) => {
  const fileName = uri.split("/").pop()?.split("?")[0];
  return fileName && fileName.includes(".") ? fileName : fallback;
};

export const getAvatarFileName = (asset: PickedImage) =>
  asset.fileName?.trim() || getPickedFileName(asset.uri, "avatar.jpg");

/** Prefers the picker's MIME type, falling back to the file extension. */
export const getAvatarMimeType = (asset: PickedImage) => {
  if (asset.mimeType?.trim()) {
    return asset.mimeType.trim().toLowerCase();
  }

  const extension = getAvatarFileName(asset).split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
};

/** Returns a user-facing error, or null when the image can be uploaded. */
export const validateAvatar = (asset: PickedImage, mimeType: string): string | null => {
  if (!ALLOWED_AVATAR_MIME_TYPES.has(mimeType)) {
    return "Only JPEG, PNG, or WebP images are supported.";
  }

  if (typeof asset.fileSize === "number" && asset.fileSize > MAX_AVATAR_SIZE_BYTES) {
    return "Profile photo must be smaller than 999 KB.";
  }

  return null;
};

/** Busts image caches after an upload that keeps the same avatar URL. */
export const withAvatarCacheKey = (uri: string, cacheKey: number) => {
  if (!cacheKey) {
    return uri;
  }

  return `${uri}${uri.includes("?") ? "&" : "?"}v=${cacheKey}`;
};
