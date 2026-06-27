import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { setServicesList, setPackagesList, setMembershipsList, setProductsList, setClientsList } from "../../../store/schedulerSlice";
import { fetchServicesThunk } from "../../../middleware/services/services.thunk";
import { fetchClientsThunk } from "../../../middleware/client/client.thunk";
import { fetchProductsThunk } from "../../../middleware/catalog/products.thunk";
import { fetchMembershipsThunk } from "../../../middleware/membership/membership.thunk";
import { useListPackagesQuery, useListPackageTemplatesQuery } from "../../../services/api/endpoints/packages.endpoints";
import type { Client } from "../types";

export function useServices(salonId?: string | null) {
  const dispatch = useAppDispatch();
  const apiServices    = useAppSelector((s: any) => s.catalog?.services ?? s.services?.items ?? []);
  const apiClients     = useAppSelector((s: any) => s.clients?.clients ?? s.clients?.items ?? []);
  const apiMemberships = useAppSelector((s: any) => s.membership?.memberships ?? s.memberships?.items ?? []);
  const apiProducts    = useAppSelector((s: any) => s.products?.products ?? s.products?.items ?? []);

  const { data: packagesData }          = useListPackagesQuery({});
  const { data: packageTemplatesRaw }   = useListPackageTemplatesQuery();
  const packageTemplates                = packageTemplatesRaw ?? [];

  useEffect(() => {
    if (!salonId) return;
    if (!apiServices.length)    dispatch(fetchServicesThunk({ isActive: true }));
    if (!apiClients.length)     dispatch(fetchClientsThunk());
    if (!apiProducts.length)    dispatch(fetchProductsThunk());
    if (!apiMemberships.length) dispatch(fetchMembershipsThunk());
  }, [dispatch, salonId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      phone: c.phone || c.phone_number || "",
      eWallet: c.wallet_balance || 0,
    }));
    dispatch(setClientsList(mapped));
  }, [apiClients, dispatch]);

  useEffect(() => {
    const fromCatalog = (packagesData?.items || []).map((p: any) => ({
      id: String(p.id || ""), name: p.name || "", price: p.basePrice || 0, services: [] as string[],
    }));
    const fromTemplates = packageTemplates.map((t: any) => ({
      id: String(t.id || ""), name: t.name || "", price: t.basePrice || 0,
      services: (t.services || []).map((s: any) => s.serviceName),
    }));
    const templateNames = new Set(fromTemplates.map((t: any) => t.name.toLowerCase()));
    const merged = [...fromTemplates, ...fromCatalog.filter((c: any) => !templateNames.has(c.name.toLowerCase()))];
    if (merged.length > 0) dispatch(setPackagesList(merged));
  }, [packagesData, packageTemplates, dispatch]);

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
    }))));
  }, [apiProducts, dispatch]);
}