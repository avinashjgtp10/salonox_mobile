import api from "../../../services/api/axios";
import { SPOTLIGHT } from "../../../services/api/endpoints";
import { compressImage } from "./compressImage";

// Tries the real backend upload first (see spotlight.endpoints.ts for the
// spec) so images are stored server-side instead of as base64 in
// localStorage. Until the backend adds that endpoint, every call 404s and
// this falls back to the old local-compression path — so the feature keeps
// working either way, and starts using real URLs the moment the endpoint
// ships with no frontend change needed.
export async function uploadSpotlightImage(
  file: File,
  fallbackMaxWidth?: number,
  fallbackQuality?: number
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("image", file);
    const res = await api.post(SPOTLIGHT.UPLOAD_IMAGE, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const url = res.data?.data?.url || res.data?.url;
    if (url) return url;
  } catch {
    // Backend endpoint not available yet — fall back below.
  }
  return compressImage(file, fallbackMaxWidth, fallbackQuality);
}
