import { useState, useCallback } from "react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Button from "../../../components/ui/Button";
import { useAppSelector, useAppDispatch } from "../../../hooks/useAppRedux";
import { createSubscriptionThunk } from "../../../store/billingSlice";
import type { SubscriptionPlan } from "../types/billing.types";

interface Props {
  plan: SubscriptionPlan;
}

export default function UpgradeButton({ plan }: Props) {
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const { currentSalon } = useAppSelector((s) => s.salon);
  const { showError, overlay } = useStatusOverlay();

  const handleUpgrade = useCallback(async () => {
    if (!currentSalon?.id) {
      showError("No salon context found");
      return;
    }

    setLoading(true);
    try {
      const totalCountMap: Record<string, number> = { monthly: 12, yearly: 1, weekly: 52, daily: 365 };
      const result = await dispatch(createSubscriptionThunk({
        plan_id: plan.id,
        salon_id: currentSalon.id,
        total_count: totalCountMap[plan.billing_cycle] ?? 12,
      }));

      if (!createSubscriptionThunk.fulfilled.match(result)) {
        showError((result.payload as string) || "Failed to initiate payment");
        return;
      }

      const { short_url } = result.payload;
      if (!short_url) {
        showError("Could not get payment link. Please try again.");
        return;
      }

      // Razorpay callback_url must be configured server-side during subscription creation.
      // Just redirect to the short_url directly.
      window.location.href = short_url;

    } finally {
      setLoading(false);
    }
  }, [plan, currentSalon, dispatch]);

  return (
    <>
      {overlay}
      {/* No autoDisable here: reaching the end of handleUpgrade only means the
          payment link was created and a redirect started — it does NOT mean
          payment succeeded. autoDisable's "click resolved without throwing =
          success" model would permanently lock this into a "✓ Done" state
          (and browser back-forward-cache can restore that locked React state
          verbatim) even when the user backs out of Razorpay without paying. */}
      <Button
        fullWidth
        size="sm"
        variant="primary"
        loading={loading}
        disabled={loading}
        onClick={handleUpgrade}
      >
        Upgrade
      </Button>
    </>
  );
}