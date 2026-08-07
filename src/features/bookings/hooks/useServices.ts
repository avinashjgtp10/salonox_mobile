import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { setServicesList, setMembershipsList, setProductsList, setClientsList } from "../../../store/schedulerSlice";
import type { Client } from "../types";

// Membership `description` is JSON-encoded on wallet-style plans —
// {"description": "...", "bonusCredit": N} — same convention/parsing as the
// backend's own client-memberships.repository.ts. A plain-text description
// (no bonus credit) just fails JSON.parse and passes through as-is.
function parseMembershipDescription(raw: unknown): { description?: string; bonusCredit?: number } {
  if (typeof raw !== "string" || !raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        description: typeof parsed.description === "string" ? parsed.description : undefined,
        bonusCredit: Number(parsed.bonusCredit) || undefined,
      };
    }
  } catch { /* plain text description */ }
  return { description: raw };
}

// salonId is no longer read here (services are now fetched purely on-demand
// by ServiceRow's own search, not eagerly per-salon on mount) — kept in the
// signature so call sites don't need updating.
export function useServices(_salonId?: string | null) {
  const dispatch = useAppDispatch();

  const apiServices    = useAppSelector((s: any) => s.catalog?.services ?? s.services?.items ?? []);
  const apiClients     = useAppSelector((s: any) => s.clients?.clients ?? s.clients?.items ?? []);
  const apiMemberships = useAppSelector((s: any) => s.membership?.memberships ?? s.memberships?.items ?? []);
  const apiProducts    = useAppSelector((s: any) => s.products?.products ?? s.products?.items ?? []);

  // No eager full-catalog fetch — ServiceRow's own search box already hits
  // the services API directly and on demand (debounced, live). The only
  // consumers of scheduler.servicesList (bookingMapper.ts's name/duration
  // fallback, ServiceRow's local-search-merge cache) both have their own
  // independent fallbacks and degrade gracefully when this stays empty, so
  // there's no need to eagerly download the whole catalog on every modal
  // open just to seed a cache nothing actually depends on being pre-filled.

  // Map raw API data → scheduler lists (fires whenever Redux updates from any fetch)
  useEffect(() => {
    if (!apiServices.length) return;
    dispatch(setServicesList(
      apiServices.filter((s: any) => s.is_active !== false).map((s: any) => ({
        id: String(s.id ?? ""), name: s.name,
        price: parseFloat(String(s.price)) || 0,
        duration: Number(s.duration || s.duration_minutes) || 30,
        categoryId: s.category_id ?? undefined,
        // Without this, ServiceRow's search dropdown keeps serving an empty
        // recipe for any service it already has cached (mergeServiceResults
        // prefers this local entry over a fresh API result on id match) —
        // configuring a service's consumables would silently never show up
        // in the appointment flow until the whole modal was closed/reopened.
        consumables_used: s.consumables_used ?? [],
      }))
    ));
  }, [apiServices, dispatch]);

  useEffect(() => {
    if (!apiClients.length) return;
    const mapped: Client[] = apiClients.map((c: any) => ({
      id: String(c.id),
      name: c.fullName || c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "",
      phone: c.phone || c.phone_number || c.mobile || "",
      email: c.email || c.email_address || "",
      eWallet: c.wallet_balance || 0,
    }));
    dispatch(setClientsList(mapped));
  }, [apiClients, dispatch]);

  // Products + memberships mapping (data arrives from on-demand fetches in AppointmentModal)
  useEffect(() => {
    if (!apiMemberships.length) return;
    // Loyalty plans are free and unlock automatically off visit count — they
    // have no price to charge, so they must never appear in the "+ Membership"
    // row's picker, which sells a plan to the client for its price.
    dispatch(setMembershipsList(
      apiMemberships
        .filter((m: any) => (m.pricingType ?? m.pricing_type) !== "loyalty")
        .map((m: any) => {
          const { description, bonusCredit } = parseMembershipDescription(m.description);
          return {
            id: String(m.id || ""), name: m.name, price: m.price || 0,
            description, bonusCredit,
          };
        })
    ));
  }, [apiMemberships, dispatch]);

  useEffect(() => {
    if (!apiProducts.length) return;
    dispatch(setProductsList(apiProducts.map((p: any) => ({
      id: String(p.id || ""),
      name: p.name,
      price: parseFloat(String(p.retail_price ?? p.selling_price ?? p.sellingPrice ?? p.price)) || 0,
      stock: Number(p.amount ?? p.stock_quantity ?? p.current_stock ?? 0),
      barcode: p.barcode ?? p.BarcodeID ?? p.bar_code ?? p.sku ?? null,
      retailPrice: p.retail_price != null ? parseFloat(String(p.retail_price)) || 0 : null,
      sellingPrice: p.selling_price != null ? parseFloat(String(p.selling_price)) || 0 : null,
      retail_price: p.retail_price != null ? parseFloat(String(p.retail_price)) || 0 : null,
      selling_price: p.selling_price != null ? parseFloat(String(p.selling_price)) || 0 : null,
      sellingPriceRaw: p.sellingPrice != null ? parseFloat(String(p.sellingPrice)) || 0 : null,
      categoryId: p.category_id ?? undefined,
      productType: p.product_type ?? undefined,
    }))));
  }, [apiProducts, dispatch]);
}
