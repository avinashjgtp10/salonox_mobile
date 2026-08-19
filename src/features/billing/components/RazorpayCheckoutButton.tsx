import { useCallback, useState } from "react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Button from "../../../components/ui/Button";
import { useAppSelector } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import type { SubscriptionPlan } from "../types/billing.types";

interface Props {
  plan: SubscriptionPlan;
  onPaid?: () => void;
}

interface CreateOrderResp {
  success: boolean;
  data: {
    order_id: string;
    amount: number;
    currency: string;
    plan_id: string;
    plan_name: string;
    key_id: string;
  };
}

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RazorpayCheckoutButton({ plan, onPaid }: Props) {
  const [loading, setLoading] = useState(false);
  const { currentSalon } = useAppSelector((s) => s.salon);
  const { showError, showSuccess, overlay } = useStatusOverlay();

  const handlePayNow = useCallback(async () => {
    if (!currentSalon?.id) {
      showError("No salon context found");
      return;
    }

    setLoading(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        showError("Could not load Razorpay checkout. Check your connection and try again.");
        return;
      }

      const orderRes = await api.post<CreateOrderResp>("/api/v1/billing/create-order", {
        amount: plan.price,
        plan_id: plan.id,
      });
      const order = orderRes.data.data;

      await new Promise<void>((resolve, reject) => {
        const razorpay = new (window as any).Razorpay({
          key: order.key_id,
          amount: Math.round(order.amount * 100),
          currency: order.currency,
          name: "Salonox",
          description: `${order.plan_name} plan subscription`,
          order_id: order.order_id,
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            try {
              await api.post("/api/v1/billing/verify-payment", {
                plan_id: plan.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              showSuccess("🎉 Payment successful! Subscription activated.");
              onPaid?.();
              resolve();
            } catch (err: any) {
              showError(err?.response?.data?.error?.message || "Payment verification failed. Contact support.");
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              reject(new Error("Payment cancelled"));
            },
          },
          theme: { color: "#111827" },
        });

        razorpay.on("payment.failed", (resp: any) => {
          showError(resp?.error?.description || "Payment failed. Please try again.");
          reject(new Error("Payment failed"));
        });

        razorpay.open();
      });
    } catch (err: any) {
      if (err?.message !== "Payment cancelled" && err?.message !== "Payment failed") {
        showError(err?.response?.data?.error?.message || err?.message || "Failed to start payment");
      }
      throw err; // let Button's autoDisable reset the click-lock on failure
    } finally {
      setLoading(false);
    }
  }, [plan, currentSalon, onPaid]);

  return (
    <>
      {overlay}
      <Button
        fullWidth
        size="sm"
        variant="outline-primary"
        loading={loading}
        disabled={loading}
        autoDisable
        onClick={handlePayNow}
      >
        Pay Now (Card/UPI)
      </Button>
    </>
  );
}
