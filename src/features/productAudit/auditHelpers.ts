import type { AuditCount, AuditItem } from "@/types/productAudit";

export function parseAuditCount(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0)
    throw new Error("Physical counts must be zero or more.");
  if (n > 999999999.999 || Math.abs(n * 1000 - Math.round(n * 1000)) > 0.000001)
    throw new Error("Physical counts must have at most 3 decimal places and be below 1 billion.");
  return n;
}

export function auditSummary(items: AuditItem[], drafts: Record<string, { count: string; reason: string }>) {
  const result = { total: items.length, counted: 0, matched: 0, over: 0, short: 0, missingReason: 0, invalid: 0 };
  for (const item of items) {
    const draft = drafts[item.id];
    let physical: number | null;
    try { physical = parseAuditCount(draft ? draft.count : item.physical_qty == null ? "" : String(item.physical_qty)); }
    catch { result.invalid++; continue; }
    if (physical === null) continue;
    result.counted++;
    const difference = Math.round((physical - Number(item.system_qty)) * 1000) / 1000;
    if (difference === 0) result.matched++;
    else if (difference > 0) result.over++;
    else result.short++;
    if (difference !== 0 && !(draft?.reason ?? item.reason ?? "").trim()) result.missingReason++;
  }
  return result;
}

export const formatAuditQuantity = (value: number) => Number(value).toLocaleString("en-IN", { maximumFractionDigits: 3 });
export function auditUpdates(
  items: AuditItem[],
  drafts: Record<string, { count: string; reason: string }>,
): AuditCount[] {
  return items.map((item) => {
    const draft = drafts[item.id];
    const physical_qty = draft
      ? parseAuditCount(draft.count)
      : item.physical_qty === null
        ? null
        : Number(item.physical_qty);
    const reason = (draft?.reason ?? item.reason ?? "").trim();
    // The existing web/backend audit permits uncounted rows. Keep those null,
    // so approval skips them instead of inventing a zero count.
    if (physical_qty !== null && physical_qty !== Number(item.system_qty) && !reason)
      throw new Error(
        `Enter a reason for the difference in ${item.product_name}.`,
      );
    return { item_id: item.id, physical_qty, reason: reason || null };
  });
}
