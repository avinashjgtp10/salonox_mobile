export const uniqueByKey = <T,>(items: T[], getKey: (item: T) => string | null | undefined): T[] => {
  const seen = new Set<string>();
  const uniqueItems: T[] = [];

  items.forEach((item) => {
    const key = getKey(item)?.trim();

    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    uniqueItems.push(item);
  });

  return uniqueItems;
};

export const uniqueById = <T extends { id: string }>(items: T[]) => uniqueByKey(items, (item) => item.id);
