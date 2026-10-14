import type { AuditCount, AuditItem } from "@/types/productAudit";

export function parseAuditCount(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0)
    throw new Error("Physical counts must be zero or more.");
  return n;
}
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
