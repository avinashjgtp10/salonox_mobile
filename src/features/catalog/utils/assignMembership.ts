// src/features/catalog/utils/assignMembership.ts
//
// The one code path that turns "this client, this membership name, this expiry"
// into a real client_memberships row — shared by the single-client form and the
// bulk import so the two can't drift apart on the parts that are easy to get
// subtly wrong (the zero-price plan, the silent flag).
import api from "../../../services/api/axios";
import { toTitleCase } from "../../../utils/titleCase";
import type { AppDispatch } from "../../../store/store";
import { createMembershipThunk } from "../../../middleware/membership/membership.thunk";

export const DEFAULT_COLOUR = "#1a1a2e";

/** Days between today and an ISO date, floored at 1 — plans store expiry as a
 *  relative "valid for N days" duration, not an absolute date. */
export function daysFromToday(iso: string): number {
  if (!iso) return 0;
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const picked = new Date(`${iso}T00:00:00`);
  return Math.max(1, Math.round((picked.getTime() - midnight.getTime()) / 86400000));
}

/**
 * Find-or-create the zero-price plan backing a free-form tag name.
 *
 * A client membership needs a plan to point at (client_memberships.membership_id
 * is NOT NULL), so a typed name is resolved to a plan of the same name — reused
 * when one already exists, so tagging fifty clients "Gold" creates one plan and
 * not fifty. The zero price is load-bearing: the backend funds the membership
 * wallet from the *plan's* price, never from pricePaid, so a zero-price plan
 * credits nothing and the tag never becomes spendable balance at checkout.
 *
 * `cache` is per-import-run memoization — without it a 500-row file with one
 * tag name would issue 500 identical lookups, and worse, rows racing ahead of
 * the first create would each create their own duplicate plan.
 */
export async function resolvePlanId(
  dispatch: AppDispatch,
  tagName: string,
  expiryIso: string,
  cache?: Map<string, string>,
): Promise<string> {
  const wanted = tagName.trim().toLowerCase();
  const cached = cache?.get(wanted);
  if (cached) return cached;

  let planId: string | null = null;

  // The list endpoint's `search` is a partial ILIKE — "Gold" also returns
  // "Gold Plus" — so the exact, case-insensitive match happens here.
  try {
    const res = await api.get("/api/v1/memberships", { params: { search: tagName.trim(), limit: 50 } });
    const items: Array<{ id: string; name: string }> = res.data?.data?.items ?? [];
    const hit = items.find((m) => (m.name ?? "").trim().toLowerCase() === wanted);
    if (hit) planId = String(hit.id);
  } catch { /* fall through to create */ }

  if (!planId) {
    const result = await dispatch(createMembershipThunk({
      name: toTitleCase(tagName.trim()),
      description: JSON.stringify({ description: "", bonusCredit: 0 }),
      includedServices: [],
      sessionType: "unlimited",
      validFor: `${daysFromToday(expiryIso)} days`,
      price: 0,
      colour: DEFAULT_COLOUR,
      pricingType: "value",
      enableOnlineSales: false,
      enableOnlineRedemption: false,
      appliesTo: "both",
      serviceCategoryIds: [],
      productCategoryIds: [],
      serviceIds: [],
      productIds: [],
    }));
    if (!createMembershipThunk.fulfilled.match(result)) {
      throw new Error((result.payload as string) || "Could not create the membership");
    }
    planId = String((result.payload as any).id);
  }

  cache?.set(wanted, planId);
  return planId;
}

/** Assigns one membership. Throws on failure so callers can report per-row. */
export async function assignMembership(
  dispatch: AppDispatch,
  args: {
    clientId: string;
    name: string;
    expiryIso: string;
    /** When the client actually got this membership. Omitted by the
     *  single-client form, which is always assigning something as of today —
     *  the backend then leaves purchased_at on its DEFAULT NOW(). Supplied by
     *  the bulk import, where the rows are historical: without it every
     *  imported membership is stamped with the minute the file was uploaded. */
    purchasedIso?: string;
  },
  cache?: Map<string, string>,
): Promise<void> {
  const membershipId = await resolvePlanId(dispatch, args.name, args.expiryIso, cache);
  await api.post("/api/v1/client-memberships", {
    clientId: args.clientId,
    membershipId,
    membershipName: toTitleCase(args.name.trim()),
    colour: DEFAULT_COLOUR,
    totalSessions: 0,          // 0 = unlimited; this tag doesn't meter sessions
    expiresAt: args.expiryIso,
    // Only sent when there's a real date to send — an explicit undefined would
    // serialize away anyway, but keeping the key out entirely makes the
    // "defaults to now" path identical to what it has always posted.
    ...(args.purchasedIso ? { purchasedAt: args.purchasedIso } : {}),
    pricePaid: 0,
    paymentMethod: "complimentary",
    // Suppresses the membership_purchased WhatsApp + purchase-receipt PDF —
    // the client never bought this. See client-memberships.service.ts purchase().
    silent: true,
  });
}

/** Accepts "YYYY-MM-DD", "DD-MM-YYYY" and "DD/MM/YYYY" — the same shapes the
 *  client import accepts — and normalizes to ISO. Null when blank or unparseable. */
export function parseDateToISO(raw: string): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  const dmy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s) || /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  let y: number, m: number, d: number;
  if (iso) { y = Number(iso[1]); m = Number(iso[2]); d = Number(iso[3]); }
  else if (dmy) { d = Number(dmy[1]); m = Number(dmy[2]); y = Number(dmy[3]); }
  else return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
