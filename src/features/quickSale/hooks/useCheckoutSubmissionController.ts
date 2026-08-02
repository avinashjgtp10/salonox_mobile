import { useCallback, useRef, useState } from "react";

export type CheckoutSubmissionPhase =
  | "idle"
  | "saving"
  | "checkingOut"
  | "saveSucceeded"
  | "checkoutSucceeded";

type CheckoutSubmissionKind = Extract<CheckoutSubmissionPhase, "saving" | "checkingOut">;

export const useCheckoutSubmissionController = () => {
  const [phase, setPhase] = useState<CheckoutSubmissionPhase>("idle");
  const phaseRef = useRef<CheckoutSubmissionPhase>("idle");

  const begin = useCallback((kind: CheckoutSubmissionKind) => {
    if (phaseRef.current !== "idle") {
      return false;
    }

    phaseRef.current = kind;
    setPhase(kind);
    return true;
  }, []);

  const commitSuccess = useCallback(() => {
    const currentPhase = phaseRef.current;
    if (currentPhase !== "saving" && currentPhase !== "checkingOut") {
      return false;
    }

    const successPhase =
      currentPhase === "saving" ? "saveSucceeded" : "checkoutSucceeded";
    phaseRef.current = successPhase;
    setPhase(successPhase);
    return true;
  }, []);

  const finish = useCallback(() => {
    if (
      phaseRef.current === "saveSucceeded" ||
      phaseRef.current === "checkoutSucceeded"
    ) {
      return;
    }

    phaseRef.current = "idle";
    setPhase("idle");
  }, []);

  const reset = useCallback(() => {
    phaseRef.current = "idle";
    setPhase("idle");
  }, []);

  return {
    begin,
    commitSuccess,
    finish,
    isCheckingOut: phase === "checkingOut",
    isSaving: phase === "saving",
    isSuccess: phase === "checkoutSucceeded",
    phase,
    reset,
  };
};
