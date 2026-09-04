import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import {
  createPosPaymentThunk,
  getPosPaymentStatusThunk,
  cancelPosPaymentThunk,
  confirmManualPosPaymentThunk,
} from "../../../middleware/booking/posPayment.thunk";
import type { CreatePosPaymentPayload, PosPaymentRequest } from "../types";

export type PosPaymentPhase = "idle" | "creating" | "waiting" | "success" | "failed" | "cancelled";

const POLL_INTERVAL_MS = 3000;

/**
 * Owns the whole async Payment Machine lifecycle: create the request, poll
 * for confirmation, cancel, or (manual provider only) let staff confirm with
 * the machine's printed transaction id. Polling here is the frontend half of
 * confirmation — the backend scheduler (pos-payments.scheduler.ts) is what
 * still catches it if this tab closes before a provider confirms.
 */
export function usePosPayment() {
  const dispatch = useAppDispatch();
  const [request, setRequest] = useState<PosPaymentRequest | null>(null);
  const [phase, setPhase] = useState<PosPaymentPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref, not state — set once per start() call and read from inside the
  // polling interval's closure without needing to restart the interval.
  const onConfirmedRef = useRef<((request: PosPaymentRequest) => void) | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback((id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const res = await dispatch(getPosPaymentStatusThunk(id));
      if (!getPosPaymentStatusThunk.fulfilled.match(res)) return;
      const updated = res.payload;
      setRequest(updated);
      if (updated.status === "SUCCESS") {
        stopPolling();
        setPhase("success");
        onConfirmedRef.current?.(updated);
      } else if (updated.status === "FAILED" || updated.status === "EXPIRED") {
        stopPolling();
        setPhase("failed");
      } else if (updated.status === "CANCELLED") {
        stopPolling();
        setPhase("cancelled");
      }
    }, POLL_INTERVAL_MS);
  }, [dispatch, stopPolling]);

  const start = useCallback(async (
    payload: CreatePosPaymentPayload,
    onConfirmed: (request: PosPaymentRequest) => void,
  ): Promise<PosPaymentRequest | null> => {
    onConfirmedRef.current = onConfirmed;
    setError(null);
    setRequest(null);
    setPhase("creating");

    const res = await dispatch(createPosPaymentThunk(payload));
    if (createPosPaymentThunk.rejected.match(res)) {
      setError((res.payload as string) || "Failed to start payment");
      setPhase("failed");
      return null;
    }
    const created = res.payload as PosPaymentRequest;
    setRequest(created);
    if (created.status === "FAILED") {
      setPhase("failed");
      return created;
    }
    setPhase("waiting");
    startPolling(created.id);
    return created;
  }, [dispatch, startPolling]);

  const cancel = useCallback(async () => {
    if (!request) return;
    stopPolling();
    const res = await dispatch(cancelPosPaymentThunk(request.id));
    if (!cancelPosPaymentThunk.fulfilled.match(res)) return;
    const updated = res.payload as PosPaymentRequest;
    setRequest(updated);
    // A cancel can lose a race against a webhook/poll that just confirmed
    // SUCCESS — reflect whatever the backend actually settled on, not what
    // was requested.
    if (updated.status === "SUCCESS") {
      setPhase("success");
      onConfirmedRef.current?.(updated);
    } else {
      setPhase("cancelled");
    }
  }, [dispatch, request, stopPolling]);

  const confirmManual = useCallback(async (providerTransactionId: string) => {
    if (!request) return;
    setError(null);
    const res = await dispatch(confirmManualPosPaymentThunk({ id: request.id, providerTransactionId }));
    if (!confirmManualPosPaymentThunk.fulfilled.match(res)) {
      setError((res.payload as string) || "Failed to confirm payment");
      return;
    }
    const updated = res.payload as PosPaymentRequest;
    setRequest(updated);
    if (updated.status === "SUCCESS") {
      stopPolling();
      setPhase("success");
      onConfirmedRef.current?.(updated);
    } else {
      setError("Could not confirm this payment — check the transaction id and try again.");
    }
  }, [dispatch, request, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setRequest(null);
    setPhase("idle");
    setError(null);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return { request, phase, error, start, cancel, confirmManual, reset };
}
