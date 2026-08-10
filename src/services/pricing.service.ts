import { api } from "@/services/api";
import { PRICING } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type { CalculateTotalsBody, CalculateTotalsResponse } from "@/types/pricing";

export type PricingCalculateTotalsApiResponse = ApiResponse<CalculateTotalsResponse>;

export const pricingService = {
  async calculateTotals(body: CalculateTotalsBody): Promise<CalculateTotalsResponse> {
    const response = await api.post<PricingCalculateTotalsApiResponse>(
      PRICING.CALCULATE_TOTALS,
      body,
    );
    return response.data.data;
  },
};
