/** Load a complete collection for local filtering, rejecting stalled pagination. */
export async function loadAllPages<T extends { id: string }>(
  fetchPage: (page: number) => Promise<{ items: T[]; hasMore: boolean }>,
): Promise<T[]> {
  const items = new Map<string, T>();
  for (let page = 1; ; page += 1) {
    const result = await fetchPage(page);
    const previousSize = items.size;
    result.items.forEach((item) => items.set(item.id, item));
    if (!result.hasMore) return [...items.values()];
    if (items.size === previousSize) throw new Error("Unable to load the complete catalog. Please retry.");
  }
}
