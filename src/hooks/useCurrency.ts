import { useCallback, useMemo } from "react";
import { useAppSelector } from "./useAppRedux";
import { getCurrencyDef } from "../config/currencies";

/**
 * Canonical, reactive source of "what currency is this salon using right
 * now" — reads the salon's own `currency` setting (Settings → Profile) out
 * of Redux, so every component using this re-renders the instant it changes,
 * with no page reload needed.
 */
export function useCurrency() {
  const code = useAppSelector((s) => s.salon.currentSalon?.currency);
  const def = useMemo(() => getCurrencyDef(code), [code]);
  const formatAmount = useCallback(
    (n: number) =>
      `${def.symbol}${(Number(n) || 0).toLocaleString(def.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    [def],
  );
  return {
    currencyCode: def.code,
    currencySymbol: def.symbol,
    formatAmount,
  };
}
