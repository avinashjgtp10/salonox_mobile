import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Linking } from "react-native";
import { getFreshAccessToken } from "@/services/api";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/3gpp": "3gp", "video/quicktime": "mov",
  "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac", "audio/amr": "amr",
  "application/pdf": "pdf", "text/plain": "txt",
  "application/msword": "doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt", "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};
const FALLBACK_TYPES: Record<string, string> = { image: "image/jpeg", video: "video/mp4", audio: "audio/ogg" };

export async function inboxMediaHeaders(): Promise<Record<string, string> | undefined> {
  const token = await getFreshAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

/** WhatsApp deletes media 30 days after upload; the backend then answers 404. */
export class InboxMediaGoneError extends Error {}

/** True when the backend says the attachment no longer exists (not a network or auth hiccup). */
export async function isInboxMediaGone(source: { uri: string; authenticated: boolean }) {
  if (!source.authenticated) return false;
  try {
    const response = await fetch(source.uri, { headers: await inboxMediaHeaders() });
    return response.status === 404;
  } catch {
    return false;
  }
}

/** Downloads an authed inbox attachment and hands it to the system preview/share
 * sheet, since the app has no in-app video/document player. */
export async function openInboxMedia(source: { uri: string; authenticated: boolean }, mediaId: string, mediaType: string) {
  if (!source.authenticated) {
    await Linking.openURL(source.uri);
    return;
  }
  const folder = `${FileSystem.cacheDirectory}inbox-media/`;
  await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  const name = mediaId.replace(/[^\w.-]/g, "_");
  const download = await FileSystem.downloadAsync(source.uri, `${folder}${name}`, { headers: await inboxMediaHeaders() });
  if (download.status < 200 || download.status >= 300) {
    await FileSystem.deleteAsync(download.uri, { idempotent: true });
    if (download.status === 404) throw new InboxMediaGoneError("Media is no longer available");
    throw new Error(`Media download failed (${download.status})`);
  }
  // Share sheets pick the viewer from the file extension, so name it after the real type.
  const mimeType = download.mimeType?.split(";")[0].trim().toLowerCase() || FALLBACK_TYPES[mediaType];
  const extension = mimeType ? EXTENSIONS[mimeType] : undefined;
  const uri = extension ? `${folder}${name}.${extension}` : download.uri;
  if (uri !== download.uri) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    await FileSystem.moveAsync({ from: download.uri, to: uri });
  }
  await Sharing.shareAsync(uri, mimeType ? { mimeType } : undefined);
}
