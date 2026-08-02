import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

interface UseTableSearchSortOptions<T> {
  rows: T[];
  /** Fields whose stringified value the free-text search box matches against. */
  searchFields: (keyof T)[];
  defaultSortKey?: keyof T;
  defaultSortDir?: SortDir;
}

/**
 * Shared search+sort behavior for every Client History tab's table — none of
 * the 11 tabs had per-tab search/sort before this (only a bill-level date/
 * service/staff filter did), so this is the one place that logic lives
 * instead of being duplicated 11 times. Pagination stays external (the
 * existing `Pagination` component already owns page/pageSize state) — this
 * hook only returns the fully filtered+sorted list; the caller slices it.
 */
export function useTableSearchSort<T>({
  rows, searchFields, defaultSortKey, defaultSortDir = "desc",
}: UseTableSearchSortOptions<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);

  const toggleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filteredSortedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? rows.filter((row) =>
          searchFields.some((f) => String(row[f] ?? "").toLowerCase().includes(q))
        )
      : rows;

    if (!sortKey) return filtered;

    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      // Numeric compare when both values are genuinely numeric (covers ₹
      // amounts/quantities stored as numbers or numeric strings); otherwise
      // fall back to string compare (dates as ISO strings sort correctly
      // this way too).
      const an = Number(av);
      const bn = Number(bv);
      const bothNumeric = !isNaN(an) && !isNaN(bn) && av !== "" && bv !== "";
      const cmp = bothNumeric ? an - bn : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, search, searchFields, sortKey, sortDir]);

  return { search, setSearch, sortKey, sortDir, toggleSort, filteredSortedRows };
}
