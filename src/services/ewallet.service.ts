import { api } from "@/services/api";
import { EWALLET } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type { EWalletBalance } from "@/types/wallet";

type AnyRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is AnyRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const firstValue = (record: AnyRecord | null | undefined, keys: string[]) => {
  if (!record) return undefined;

  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
};

const toSafeNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const normalizeBalance = (payload: unknown): EWalletBalance => {
  const record = isRecord(payload) ? payload : {};
  const data = isRecord(record.data) ? record.data : record;

  return {
    balance: toSafeNumber(firstValue(data, ["balance", "eWalletBalance", "ewallet_balance", "amount"])),
  };
};

export const ewalletService = {
  async getBalance(clientId: string, salonId?: string | null): Promise<EWalletBalance> {
    const response = await api.get<ApiResponse<AnyRecord>>(EWALLET.BALANCE(clientId), {
      params: {
        ...(salonId ? { salon_id: salonId } : {}),
      },
      validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
    });

    if (response.status === 404) {
      return { balance: 0 };
    }

    return normalizeBalance(response.data);
  },
};
