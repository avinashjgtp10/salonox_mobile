import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import Button from "../../../components/ui/Button";
import { useAppSelector } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import type { SubscriptionPlan } from "../types/billing.types";

interface Props {
  plan: SubscriptionPlan;
}

interface CreateSubResp {
  success: boolean;
  data: {
    short_url: string;
    razorpay_subscription_id: string;
  };
}

export default function UpgradeButton({ plan }: Props) {
  const [loading, setLoading] = useState(false);
  const { currentSalon } = useAppSelector((s) => s.salon);

  const handleUpgrade = useCallback(async () => {
    if (!currentSalon?.id) {
      toast.error("No salon context found");
      return;
    }

    setLoading(true);
    try {
      const totalCountMap: Record<string, number> = { monthly: 12, yearly: 1, weekly: 52, daily: 365 };
      const res = await api.post<CreateSubResp>("/api/v1/subscriptions", {
        plan_id: plan.id,
        salon_id: currentSalon.id,
        total_count: totalCountMap[plan.billing_cycle] ?? 12,
      });

      const { short_url } = res.data.data;

      if (!short_url) {
        toast.error("Could not get payment link. Please try again.");
        return;
      }

      // Razorpay callback_url must be configured server-side during subscription creation.
      // Just redirect to the short_url directly.
      window.location.href = short_url;

    } catch (err: any) {
      toast.error(err?.message || "Failed to initiate payment");
      throw err; // let Button's autoDisable reset the click-lock on failure
    } finally {
      setLoading(false);
    }
  }, [plan, currentSalon]);

  return (
    <Button
      fullWidth
      size="sm"
      variant="primary"
      loading={loading}
      disabled={loading}
      autoDisable
      onClick={handleUpgrade}
    >
      Upgrade
    </Button>
  );
}