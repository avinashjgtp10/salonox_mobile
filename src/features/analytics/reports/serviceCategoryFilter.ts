import type { FilterDropdownOption } from "../../../components/ui";

export interface CategorizedService {
  id: string | number;
  name: string;
  category_id?: string | number | null;
}

/** Options for a Service filter field narrowed to `categoryIds`.
 *  Uncategorized services (null category_id) are excluded while any category
 *  is selected — they are only reachable with Category cleared. Services
 *  already ticked (`ownIds`) are always kept, appended in their original
 *  order, so switching category never silently drops a user's selection. */
export function servicesInCategories(
  services: CategorizedService[],
  categoryIds: string[],
  ownIds: string[] = [],
): FilterDropdownOption[] {
  const cats = new Set(categoryIds.map(String));
  const kept = new Set(ownIds.map(String));
  return services
    .filter((s) => cats.has(String(s.category_id)) || kept.has(String(s.id)))
    .map((s) => ({ id: String(s.id), label: String(s.name) }));
}
