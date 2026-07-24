import { api } from "@/services/api";
import { PAYMENT } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type { CreatePaymentRequest, CreatePaymentResponse, PaymentApiData } from "@/types/payment";

type PaymentApiResponse = ApiResponse<PaymentApiData>;

const getPaymentData = (payload: unknown): PaymentApiData => {
  if (payload && typeof payload === "object" && ("payment" in payload || "data" in payload)) {
    const envelope = payload as { payment?: PaymentApiData | null; data?: PaymentApiData | null };
    return envelope.payment ?? envelope.data ?? ({} as PaymentApiData);
  }

  return payload && typeof payload === "object" ? (payload as PaymentApiData) : ({} as PaymentApiData);
};

export const paymentService = {
  async createPayment(payload: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    const response = await api.post<PaymentApiResponse>(PAYMENT.BASE, payload);

    return {
      data: getPaymentData(response.data.data ?? ({} as PaymentApiData)),
      message: response.data.message,
    };
  },
};
