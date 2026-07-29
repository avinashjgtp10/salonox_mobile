// Non-component counterpart to `hooks/useCurrency.ts` — for plain modules
// (e.g. the printed-receipt builder) that can't call React hooks. Reads the
// salon's currency directly off the Redux store singleton.
import { store } from "../store/store";
import { getCurrencyDef, type CurrencyDef } from "../config/currencies";

export function getCurrentCurrencyDef(): CurrencyDef {
  return getCurrencyDef(store.getState().salon.currentSalon?.currency);
}

export function formatAmount(n: number, def: CurrencyDef = getCurrentCurrencyDef()): string {
  return `${def.symbol}${(Number(n) || 0).toLocaleString(def.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
