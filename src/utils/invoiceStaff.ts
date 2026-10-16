import type { StaffMember } from "@/data/teamData";
import type { SaleLineItem } from "@/types/sales";

// Sale items only carry staff_id (the backend falls back to the sale's own
// staff), so names are looked up by id the same way the web receipt does.
export const saleStaffIds = (items: SaleLineItem[]) =>
  [...new Set(items.map((item) => item.staffId).filter((id): id is string => Boolean(id)))];

export const staffNamesFromRoster = (roster: StaffMember[]) => {
  const names: Record<string, string> = {};
  for (const member of roster) {
    for (const id of [member.id, ...(member.staffIdAliases ?? [])]) {
      if (id && member.name) names[id] = member.name;
    }
  }
  return names;
};

export async function resolveStaffNames(
  staffIds: string[],
  known: Record<string, string>,
  fetchName: (staffId: string) => Promise<string | undefined>,
) {
  const names: Record<string, string> = {};
  const missing: string[] = [];
  for (const id of staffIds) {
    if (known[id]) names[id] = known[id];
    else missing.push(id);
  }
  const fetched = await Promise.allSettled(missing.map((id) => fetchName(id)));
  fetched.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) names[missing[index]] = result.value;
  });
  return names;
}

export const withStaffNames = (items: SaleLineItem[], names: Record<string, string>): SaleLineItem[] =>
  items.map((item) => {
    const staffName = item.staffName || (item.staffId ? names[item.staffId] : undefined);
    return staffName ? { ...item, staffName } : item;
  });

export const invoiceStaffDisplay = (items: SaleLineItem[]) =>
  [...new Set(items.map((item) => item.staffName).filter(Boolean))].join(", ");
