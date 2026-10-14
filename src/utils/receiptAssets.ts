import { environmentConfig } from "@/config/environment";

/** Receipt assets may be returned as upload paths rather than absolute URLs. */
export function receiptAssetUrl(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  const url = value.trim();
  if (/^(data:|file:|https?:)/i.test(url)) return url;
  return new URL(url, new URL(environmentConfig.apiBaseUrl).origin + "/").href;
}
