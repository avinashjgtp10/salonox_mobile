import { api } from "@/services/api";

export type MonthlyProjection = {
  asOf: string;
  monthLabel: string;
  daysPassed: number;
  daysInMonth: number;
  remainingDays: number;
  mtdSales: number;
  lmmtdSales: number;
  projectedSales: number;
  growthPct: number | null;
  target: number | null;
  achievedPct: number | null;
  remainingTarget: number | null;
  requiredDailySales: number | null;
  todaySales: number;
  todayWalkins: number;
  dayAbv: number | null;
  mtdWalkins: number;
  monthAbv: number | null;
  daily: { day: number; sales: number }[];
};

export type ProjectionGender = "all" | "male" | "female";

export const monthlyProjectionService = {
  async get(gender: ProjectionGender) {
    const response = await api.get<{ data: MonthlyProjection }>("/dashboard/monthly-projection", {
      params: gender === "all" ? undefined : { gender },
    });
    if (!response.data.data) throw new Error("Monthly projection is unavailable.");
    return response.data.data;
  },
  async setTarget(target: number | null) {
    if (target !== null && (!Number.isFinite(target) || target <= 0)) {
      throw new Error("Enter a positive amount.");
    }
    await api.put("/dashboard/monthly-target", { target });
  },
};
