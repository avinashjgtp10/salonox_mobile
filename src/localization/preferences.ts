import { useSyncExternalStore } from "react";
import { getCurrencyDef } from "@/config/currencies";
import { normalizeLanguage } from "@/config/languages";

export type RegionalPreferences = { salonId: string | null; language: string; currency: string };
let current: RegionalPreferences = { salonId: null, language: "en", currency: "INR" };
const listeners = new Set<() => void>();
export const getRegionalPreferences = () => current;
export function setRegionalPreferences(next: { salonId: string | null; language?: string | null; currency?: string | null }) {
  const value = { salonId: next.salonId, language: normalizeLanguage(next.language), currency: getCurrencyDef(next.currency).code };
  if (value.salonId === current.salonId && value.language === current.language && value.currency === current.currency) return;
  current = value;
  listeners.forEach(listener => listener());
}
export function useRegionalPreferences() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getRegionalPreferences, getRegionalPreferences);
}
