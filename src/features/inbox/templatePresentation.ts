import type { InboxTemplate } from "@/types/inbox";

export const templateSlots = (body: string): string[] =>
  [
    ...new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((match) => match[1])),
  ].sort((a, b) => Number(a) - Number(b));
export const renderInboxTemplate = (
  body: string,
  values: Record<string, string>,
) =>
  body.replace(
    /\{\{(\d+)\}\}/g,
    (_match, slot: string) => values[slot]?.trim() || "…",
  );
export function validateInboxTemplate(
  template: InboxTemplate,
  values: Record<string, string>,
  coupon: string,
  expiry: Date | null,
  now = Date.now(),
): string | null {
  const missing = templateSlots(template.body).find(
    (slot) => !values[slot]?.trim(),
  );
  if (missing) return `Please fill in value ${missing}.`;
  if (
    templateSlots(template.body).some(
      (slot) => values[slot].trim().length > 1024,
    )
  )
    return "Each value must be 1,024 characters or fewer.";
  if (template.needsCoupon && !coupon.trim())
    return "Enter the coupon code customers will copy.";
  if (template.needsExpiry && (!expiry || !Number.isFinite(expiry.getTime())))
    return "Pick when the offer expires.";
  if (template.needsExpiry && expiry!.getTime() <= now)
    return "The offer expiry must be in the future.";
  return null;
}
