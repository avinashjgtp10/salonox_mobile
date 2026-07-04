import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { setServicesList, setMembershipsList, setProductsList, setClientsList } from "../../../store/schedulerSlice";
import { fetchServicesThunk } from "../../../middleware/services/services.thunk";
import type { Client } from "../types";

export function useServices(salonId?: string | null) {
  const dispatch = useAppDispatch();

  const apiServices    = useAppSelector((s: any) => s.catalog?.services ?? s.services?.items ?? []);
  const apiClients     = useAppSelector((s: any) => s.clients?.clients ?? s.clients?.items ?? []);
  const apiMemberships = useAppSelector((s: any) => s.membership?.memberships ?? s.memberships?.items ?? []);
  const apiProducts    = useAppSelector((s: any) => s.products?.products ?? s.products?.items ?? []);

  // Fetch only services on modal open — client search uses its own /clients/search endpoint
  useEffect(() => {
    if (!salonId) return;
    dispatch(fetchServicesThunk({ isActive: true }));
  }, [dispatch, salonId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Map raw API data → scheduler lists (fires whenever Redux updates from any fetch)
  useEffect(() => {
    if (!apiServices.length) return;
    dispatch(setServicesList(
      apiServices.filter((s: any) => s.is_active !== false).map((s: any) => ({
        id: String(s.id ?? ""), name: s.name,
        price: parseFloat(String(s.price)) || 0,
        duration: Number(s.duration || s.duration_minutes) || 30,
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
    dispatch(setMembershipsList(apiMemberships.map((m: any) => ({
      id: String(m.id || ""), name: m.name, price: m.price || 0,
    }))));
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
    }))));
  }, [apiProducts, dispatch]);
}
