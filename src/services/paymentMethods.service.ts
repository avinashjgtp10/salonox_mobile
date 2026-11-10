import { api } from "@/services/api";
import { isNetworkOnline } from "@/services/networkStatus";

export type CustomPaymentMethod = {
  id: string; salon_id: string; name: string; is_active: boolean; created_at: string; updated_at: string;
};
export type BuiltInPaymentMethod = { key: "cash" | "card" | "upi"; name: string; is_active: boolean };
export type PaymentMethodConfiguration = { custom: CustomPaymentMethod[]; builtIns: BuiltInPaymentMethod[] };
type Envelope<T> = { data: T };
const BASE = "/payment-methods";

export { paymentMethodLabel } from "@/utils/paymentMethodLabel";

export const normalizePaymentMethodName = (value: string) => value.replace(/\s+/g, " ").trim();
const RESERVED = new Set(["cash", "card", "upi", "ewallet", "e-wallet", "e wallet", "wallet", "payment machine", "pos machine", "pos_machine", "package", "membership", "gift card", "gift_card", "giftcard", "split", "bank", "other"]);
export function paymentMethodNameProblem(raw: string, methods: CustomPaymentMethod[], exceptId?: string): string | null {
  if (/[+"\\\u0000-\u001f]/.test(raw)) return "Names cannot contain +, quotes, backslashes or control characters.";
  const name = normalizePaymentMethodName(raw);
  if (!name) return "Enter a payment method name.";
  if (name.length > 40) return "Use 40 characters or fewer.";
  if (RESERVED.has(name.toLowerCase())) return "This name is reserved for a default payment method.";
  if (methods.some(method => method.id !== exceptId && normalizePaymentMethodName(method.name).toLowerCase() === name.toLowerCase())) return "A payment method with this name already exists.";
  return null;
}

export function activePaymentMethods(config: PaymentMethodConfiguration, offersUpi = true) {
  return [
    ...config.builtIns.filter(method => method.is_active && (method.key !== "upi" || offersUpi)).map(method => ({ id: method.key, value: method.key, label: method.name })),
    ...config.custom.filter(method => method.is_active).map(method => ({ id: method.id, value: method.name, label: method.name })),
  ];
}

// Same-salon screens refresh immediately after an app mutation. Server reads
// remain authoritative; no mutations or configuration are queued offline.
const listeners = new Set<(scope: string) => void>();
export const subscribePaymentMethods = (listener: (scope: string) => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const notifyPaymentMethodsChanged = (scope: string) => listeners.forEach(listener => listener(scope));
export function requirePaymentMethodsOnline() {
  if (!isNetworkOnline()) throw new Error("You're offline. Reconnect to refresh or change payment methods.");
}

export const paymentMethodsService = {
  async configuration(manage = false, signal?: AbortSignal): Promise<PaymentMethodConfiguration> {
    requirePaymentMethodsOnline();
    const [custom, builtIns] = await Promise.all([
      api.get<Envelope<CustomPaymentMethod[]>>(manage ? BASE : `${BASE}/active`, { signal }),
      api.get<Envelope<BuiltInPaymentMethod[]>>(`${BASE}/built-in`, { signal }),
    ]);
    return { custom: custom.data.data, builtIns: builtIns.data.data };
  },
  async create(name: string): Promise<CustomPaymentMethod> {
    requirePaymentMethodsOnline();
    return (await api.post<Envelope<CustomPaymentMethod>>(BASE, { name: normalizePaymentMethodName(name) })).data.data;
  },
  async update(id: string, patch: { name?: string; is_active?: boolean }): Promise<CustomPaymentMethod> {
    requirePaymentMethodsOnline();
    return (await api.put<Envelope<CustomPaymentMethod>>(`${BASE}/${encodeURIComponent(id)}`, patch)).data.data;
  },
  async remove(id: string): Promise<void> {
    requirePaymentMethodsOnline();
    await api.delete(`${BASE}/${encodeURIComponent(id)}`);
  },
  async setBuiltIn(key: BuiltInPaymentMethod["key"], active: boolean): Promise<BuiltInPaymentMethod> {
    requirePaymentMethodsOnline();
    return (await api.put<Envelope<BuiltInPaymentMethod>>(`${BASE}/built-in/${key}`, { is_active: active })).data.data;
  },
};
