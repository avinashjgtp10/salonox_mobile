import { useCurrency } from "../../../hooks/useCurrency";
import { usePermissions } from "../../../hooks/usePermissions";

// Dashboard-only wrapper around useCurrency() — every currency figure on the
// Dashboard is financial by definition, so this is the single place that
// decides whether to show the real amount or a masked placeholder, driven
// by view_dashboard_financials. The backend independently redacts the same
// fields (salon-dashboard.controller.ts) — this is the UX layer on top of
// that, not the security boundary itself.
export function useMaskedCurrency() {
  const { currencyCode, currencySymbol, formatAmount: realFormatAmount } = useCurrency();
  const { can } = usePermissions();
  const canSeeFinancials = can("view_dashboard_financials");

  const formatAmount = (n: number) =>
    canSeeFinancials ? realFormatAmount(n) : `${currencySymbol}******`;

  return { currencyCode, currencySymbol, formatAmount, canSeeFinancials };
}
