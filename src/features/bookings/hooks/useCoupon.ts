import { useState, useCallback } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { applyCouponThunk } from "../../../middleware/booking/payment.thunk";
import { currencySymbol } from "../../../utils/currency";

export interface CouponState {
  input: string;
  applied: string;
  discount: number;
  message: string;
  error: string;
  loading: boolean;
}

export function useCoupon(salonId?: string) {
  const dispatch = useAppDispatch();
  const [state, setState] = useState<CouponState>({
    input: "", applied: "", discount: 0,
    message: "", error: "", loading: false,
  });

  const apply = useCallback(async (subtotal: number) => {
    if (!state.input.trim()) return;
    setState((s) => ({ ...s, loading: true, error: "", message: "" }));
    const result: any = await dispatch(
      applyCouponThunk({ code: state.input.trim(), subtotal, salonId })
    );
    if (applyCouponThunk.fulfilled.match(result)) {
      const data = result.payload;
      setState((s) => ({
        ...s, loading: false,
        applied: data.code || s.input,
        discount: data.discount_amount || 0,
        message: data.message || `Coupon applied! -${currencySymbol}${data.discount_amount}`,
        error: "",
      }));
    } else {
      setState((s) => ({
        ...s, loading: false,
        error: (result.payload as string) || "Invalid coupon",
        message: "",
      }));
    }
  }, [dispatch, state.input, salonId]);

  const clear = useCallback(() => {
    setState({ input: "", applied: "", discount: 0, message: "", error: "", loading: false });
  }, []);

  const setInput = useCallback((v: string) => {
    setState((s) => ({ ...s, input: v }));
  }, []);

  return { ...state, apply, clear, setInput };
}
