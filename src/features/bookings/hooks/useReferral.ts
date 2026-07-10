import { useState, useCallback } from "react";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";

export interface ReferralState {
  input: string;
  applied: boolean;
  message: string;
  error: string;
  loading: boolean;
}

export function useReferral() {
  const [state, setState] = useState<ReferralState>({
    input: "", applied: false, message: "", error: "", loading: false,
  });

  const apply = useCallback(async (clientId?: string | number | null) => {
    if (!state.input.trim() || !clientId || clientId === "walk-in") return;
    setState((s) => ({ ...s, loading: true, error: "", message: "" }));
    try {
      await api.patch(CLIENT.BY_ID(clientId), { referred_by_code: state.input.trim().toUpperCase() });
      setState((s) => ({ ...s, loading: false, applied: true, message: "Referral code applied!", error: "" }));
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "Invalid referral code";
      setState((s) => ({ ...s, loading: false, error: msg, message: "" }));
    }
  }, [state.input]);

  const setInput = useCallback((v: string) => {
    setState((s) => ({ ...s, input: v.toUpperCase() }));
  }, []);

  const clear = useCallback(() => {
    setState({ input: "", applied: false, message: "", error: "", loading: false });
  }, []);

  return { ...state, apply, clear, setInput };
}
