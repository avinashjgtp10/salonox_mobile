export interface CascadeCatalogEntry {
  key: string;
  depends_on?: string[] | null;
}

// Master toggles whose direct (and transitive) children stay hidden in the
// Roles & Permissions editors until the master itself is switched on, and
// whose children get validated on save (master ON with every child OFF is
// blocked — that combination "opens the section" via the master's own
// VIRTUAL_PERMS OR-grant with nothing usable behind it). Currently just
// view_booking (Online Booking Channels ticket); add a key here only when
// explicitly asked for the same reveal-on-toggle + validate-on-save
// treatment — it changes both display and save behavior for that module.
export const REVEAL_ON_MASTER_TOGGLE: string[] = ["view_booking"];

/**
 * Every permission key that must also switch ON when `key` is toggled ON —
 * every permission `key` itself depends_on, recursively (so a child is
 * never left granted-but-unreachable because its parent stayed off), plus
 * — only when `key` is itself one of REVEAL_ON_MASTER_TOGGLE — that
 * master's own direct children (so switching on "View Booking" reveals and
 * defaults-on its 4 channels). The returned set includes `key` itself.
 *
 * Deliberately does NOT walk downward from every node reached while going
 * up — earlier version did, so toggling any single channel walked up to
 * view_booking and then back down to every sibling channel, turning them
 * all on (found 2026-09-12). Downward only ever starts from the exact key
 * the caller passed in, and only one level (view_marketplace's own
 * dependent, manage_marketplace, is a separate "write needs read"
 * relationship, not a "reveal these on demand" one — it must stay off on
 * its own until someone explicitly turns it on).
 *
 * OFF is never cascaded — turning a parent off must not silently strip
 * someone's individually-granted children, and turning a child off must
 * not lock a sibling out of a parent it still needs. Callers only call
 * this when the new value is `true`.
 */
export function cascadeOnKeys(catalog: CascadeCatalogEntry[], key: string): Set<string> {
  const byKey = new Map(catalog.map((p) => [p.key, p]));
  const result = new Set<string>([key]);

  const goUp = (k: string) => {
    for (const dep of byKey.get(k)?.depends_on ?? []) {
      if (result.has(dep)) continue;
      result.add(dep);
      goUp(dep);
    }
  };
  goUp(key);

  if (REVEAL_ON_MASTER_TOGGLE.includes(key)) {
    for (const perm of catalog) {
      if (perm.depends_on?.includes(key)) result.add(perm.key);
    }
  }

  return result;
}

/**
 * Walks `key`'s depends_on chain upward, transitively, and returns the
 * first REVEAL_ON_MASTER_TOGGLE key found — used to hide a permission
 * (direct or several levels down, e.g. manage_marketplace ->
 * view_marketplace -> view_booking) until that master is effectively on.
 * Returns null if `key` has no such ancestor (including when `key` IS a
 * master itself — a master is never hidden by its own rule).
 */
export function isRevealedChild(catalog: CascadeCatalogEntry[], key: string): string | null {
  const byKey = new Map(catalog.map((p) => [p.key, p]));
  const visited = new Set<string>();

  const walk = (k: string): string | null => {
    if (visited.has(k)) return null;
    visited.add(k);
    for (const dep of byKey.get(k)?.depends_on ?? []) {
      if (REVEAL_ON_MASTER_TOGGLE.includes(dep)) return dep;
      const found = walk(dep);
      if (found) return found;
    }
    return null;
  };

  return walk(key);
}

/**
 * Master toggles that are effectively ON but have zero effectively-ON
 * children — the state the Roles & Permissions editors must block at save
 * time. Returns the offending master keys (empty if none).
 */
export function findEmptyMasterToggles(
  catalog: CascadeCatalogEntry[],
  getEffective: (key: string) => boolean
): string[] {
  const problems: string[] = [];
  for (const masterKey of REVEAL_ON_MASTER_TOGGLE) {
    if (!getEffective(masterKey)) continue;
    const children = catalog.filter((p) => p.depends_on?.includes(masterKey));
    if (children.length > 0 && !children.some((c) => getEffective(c.key))) {
      problems.push(masterKey);
    }
  }
  return problems;
}
