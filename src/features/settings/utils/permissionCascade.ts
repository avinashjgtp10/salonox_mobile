export interface CascadeCatalogEntry {
  key: string;
  depends_on?: string[] | null;
  // Where this permission renders — the editors group by module, then by
  // group_name into one collapsible subgroup each. isRevealedChild needs it
  // to tell "hidden until the switch right above it" from "hidden with no
  // switch anywhere on screen"; optional so cascade-only callers that never
  // hide anything can keep passing bare {key, depends_on} entries.
  module?: string | null;
  group_name?: string | null;
}

// Master toggles whose direct (and transitive) children stay hidden in the
// Roles & Permissions editors until the master itself is switched on.
// view_booking (Online Booking Channels ticket) also gets the
// findEmptyMasterToggles save validation below, since view_booking itself
// does nothing on its own once backend-dead (see marketplace.routes.ts).
// Every other "View X" master here does NOT get that validation: each is
// still independently meaningful on its own (viewing the list without any
// write/download child granted is a valid, intentional configuration), so
// only view_booking is singled out below.
//
// Deliberately excludes Reports' view_reports/view_reports_<category>
// masters — that module's master lives in a different subgroup ("General")
// than its category children, and categories in turn have their own report
// children, so the same "hide until toggled" rule would show a completely
// empty subgroup screen (no visible master switch to explain why) whenever
// the relevant master is off. Needs its own explicit decision, not a
// silent inclusion in this generic list.
export const REVEAL_ON_MASTER_TOGGLE: string[] = [
  "view_booking",
  "view_marketplace",
  "view_link_builder",
  // Reports — the 8 category masters only, NOT view_reports itself.
  // view_reports lives in a different subgroup ("General") than its
  // categories; including it here would hide a category's own master
  // toggle along with its reports whenever view_reports is off, leaving a
  // blank subgroup screen with nothing visible to explain why. Anchoring
  // the reveal one level down at the category avoids that: the category's
  // own toggle is always visible when you open its subgroup, and only its
  // reports stay hidden until it's switched on.
  "view_reports_sales",
  "view_reports_payments",
  "view_reports_customers",
  "view_reports_appointments",
  "view_reports_inventory",
  "view_reports_staff",
  "view_reports_packages",
  "view_reports_marketing",
  // Reports — each individual report's own View key, so toggling it
  // reveals+enables that report's Download sibling (3-level chain:
  // category -> view_report_<id> -> download_report_<id>). Toggling the
  // category itself only cascades one level down to these View keys, same
  // "one level at a time" behavior already used for Calendar's
  // view_calendar -> view_appointment nesting — the Download for a report
  // needs that report's own View toggled to reveal/enable it.
  "view_report_sales_summary", "view_report_daily_sheet", "view_report_product_sale",
  "view_report_service_sale", "view_report_taxes", "view_report_product_margin",
  "view_report_reward", "view_report_ewallet", "view_report_payment_collection",
  "view_report_pending_payment", "view_report_cash_management", "view_report_all_clients",
  "view_report_client_revenue", "view_report_customer_frequency", "view_report_lost_customers",
  "view_report_customer_spend", "view_report_service_frequency", "view_report_referral_report",
  "view_report_client_rating", "view_report_enquiry_report", "view_report_appointment_detail",
  "view_report_upcoming_appointments", "view_report_no_show_recovery", "view_report_product_sale_inventory",
  "view_report_product_margin_inventory", "view_report_product_inventory", "view_report_slow_moving_products",
  "view_report_fast_moving_products", "view_report_brand_performance", "view_report_purchase_vs_sales",
  "view_report_consumable_usage", "view_report_supplier_report", "view_report_purchase_history",
  "view_report_stock_movement",
  "view_report_staff_sales", "view_report_staff_performance", "view_report_staff_item_sales",
  "view_report_commission_report", "view_report_tip_report", "view_report_attendance_report",
  "view_report_payroll_history", "view_report_rebooking_rate", "view_report_package_sale",
  "view_report_package_history", "view_report_member_sale", "view_report_membership_history",
  "view_report_wa_campaign", "view_report_mkt_feedback", "view_report_open_rate",
  "view_report_reply_rate", "view_report_birthday_campaign", "view_report_new_client_follow_up",
  "view_report_cancellation_recovery", "view_report_membership_opportunity",
  "view_report_birthday", "view_report_anniversary",
  // Catalog
  "view_memberships",
  "view_services",
  "view_digital_menu",
  "view_products",
  "view_packages",
  "view_client_packages",
  "view_package_templates",
  // Calendar
  "view_calendar",
  "view_appointment",
  // Cash Management
  "view_cash_management",
  // Clients
  "view_clients",
  // Coupons
  "view_coupons",
  // Dashboard
  "view_dashboard",
  // Enquiries
  "view_enquiries",
  // Marketing
  "view_campaigns",
  "view_inbox",
  "view_scheduled_templates",
  "view_templates",
  "view_whatsapp_config",
  // Quick Sale
  "view_sales",
  "create_sales",
  // Settings — Roles & Permissions
  "view_roles",
  // Staff
  "view_payroll",
  "view_scheduled_shifts",
  "view_team",
  "view_commissions",
  "view_tips",
  // Warehouse
  "view_consumable_inventory",
  "view_orders",
  "view_product_audit",
  "view_product_inventory",
  "view_inventory",
  "view_stock_ledger",
  "view_suppliers",
];

// Subset of REVEAL_ON_MASTER_TOGGLE that also requires at least one
// effectively-on child at save time (see findEmptyMasterToggles).
const REQUIRE_ONE_CHILD_ON_SAVE: string[] = ["view_booking"];

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
 *
 * A master only hides a permission when the two render in the SAME subgroup
 * (same module + group_name), because the whole point of "hide until
 * toggled" is that the switch which reveals them sits visibly right above.
 * When the master lives elsewhere there is no such switch on screen, and
 * hiding produced a subgroup that opened to nothing at all:
 *
 *   - Catalog > Products: all 8 rows vanished, because view_products
 *     depends_on view_suppliers, which lives in Warehouse > Suppliers. The
 *     other 7 rows then depend on view_products, which was itself hidden.
 *     Nothing in the Catalog card could unlock it, so the subgroup header
 *     said "8 permissions" and expanded to an empty box.
 *   - Clients > General / Client History / Referral & Rewards: one row
 *     each, all depending on view_clients over in Clients > Clients List.
 *
 * This is the same failure the REVEAL_ON_MASTER_TOGGLE list's own comments
 * call out for Reports ("would show a completely empty subgroup screen, no
 * visible master switch to explain why") — that module dodged it by
 * anchoring the reveal at the category, which does sit in the subgroup with
 * its reports. Co-location is the general form of that rule, so every
 * deliberate nesting still behaves exactly as before: Reports category ->
 * its reports -> their downloads, view_calendar -> view_appointment,
 * view_booking -> its channels, view_sales -> create_sales are all
 * same-subgroup pairs.
 *
 * Nothing is granted by becoming visible. cascadeOnKeys still switches the
 * far-away prerequisite on when the row is toggled, and
 * findMissingPrerequisites still blocks saving it on without that — so the
 * dependency is enforced exactly as before, it just fails loudly with a
 * message instead of silently hiding the row.
 */
export function isRevealedChild(catalog: CascadeCatalogEntry[], key: string): string | null {
  const byKey = new Map(catalog.map((p) => [p.key, p]));
  const self = byKey.get(key);
  const sameSubgroup = (master: CascadeCatalogEntry | undefined) =>
    master != null &&
    (master.module ?? null) === (self?.module ?? null) &&
    (master.group_name ?? null) === (self?.group_name ?? null);

  const visited = new Set<string>();

  const walk = (k: string): string | null => {
    if (visited.has(k)) return null;
    visited.add(k);
    for (const dep of byKey.get(k)?.depends_on ?? []) {
      if (REVEAL_ON_MASTER_TOGGLE.includes(dep)) {
        if (sameSubgroup(byKey.get(dep))) return dep;
        // Master is off in some other card/subgroup — keep checking this
        // key's other prerequisites rather than bailing out, but never hide
        // behind a switch the user can't see from here.
        continue;
      }
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
  for (const masterKey of REQUIRE_ONE_CHILD_ON_SAVE) {
    if (!getEffective(masterKey)) continue;
    const children = catalog.filter((p) => p.depends_on?.includes(masterKey));
    if (children.length > 0 && !children.some((c) => getEffective(c.key))) {
      problems.push(masterKey);
    }
  }
  return problems;
}

/**
 * Every permission that is effectively ON but has at least one depends_on
 * prerequisite that is effectively OFF — a state that must never be
 * saveable (e.g. View Products on with View Suppliers off, since Product
 * List's Supplier column/filter needs Suppliers data — Product List
 * permission ticket). cascadeOnKeys already auto-enables a prerequisite the
 * moment its dependent is toggled on, but that's only a toggle-time nudge —
 * nothing previously stopped someone from separately toggling the
 * prerequisite back off afterward and saving that inconsistent state
 * anyway. This is the save-time backstop that closes that gap, for every
 * depends_on relationship in the catalog, not just this one pair.
 *
 * Returns {key, missing} pairs — `key` is the permission that's on,
 * `missing` is the prerequisite it needs that's currently off.
 */
export function findMissingPrerequisites(
  catalog: CascadeCatalogEntry[],
  getEffective: (key: string) => boolean
): { key: string; missing: string }[] {
  const problems: { key: string; missing: string }[] = [];
  for (const perm of catalog) {
    if (!getEffective(perm.key)) continue;
    for (const dep of perm.depends_on ?? []) {
      if (!getEffective(dep)) problems.push({ key: perm.key, missing: dep });
    }
  }
  return problems;
}
