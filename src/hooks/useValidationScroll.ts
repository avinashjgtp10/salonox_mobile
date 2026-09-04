import { useCallback, useRef } from "react";
import { findNodeHandle, type ScrollView } from "react-native";

import type { KeyboardAwareScrollViewHandle } from "@/components/ui/KeyboardAwareScrollView";

type FocusableValidationTarget = {
  focus?: () => void;
};

type ValidationErrors<Field extends string> = Partial<Record<Field, unknown>>;

const SCROLL_RETRY_DELAYS_MS = [0, 120, 260] as const;

/**
 * Registers form controls and scrolls/focuses the first invalid one after submit.
 * The retry passes cover the keyboard opening and inline error text changing layout.
 */
export function useValidationScroll<Field extends string>(fieldOrder: readonly Field[]) {
  const scrollViewRef = useRef<KeyboardAwareScrollViewHandle | null>(null);
  const targetsRef = useRef<Partial<Record<Field, unknown>>>({});

  const setFieldRef = useCallback((field: Field, target: unknown) => {
    targetsRef.current[field] = target;
  }, []);

  const scrollToField = useCallback((field: Field) => {
    const target = targetsRef.current[field];
    if (!target) return;

    (target as FocusableValidationTarget).focus?.();

    SCROLL_RETRY_DELAYS_MS.forEach((delay) => {
      setTimeout(() => {
        const scrollView = scrollViewRef.current;
        const responder = scrollView?.getScrollResponder?.() ?? scrollView;
        const targetNode = findNodeHandle(target as never);

        if (!responder || !targetNode) return;

        if (typeof responder.scrollResponderScrollNativeHandleToKeyboard === "function") {
          responder.scrollResponderScrollNativeHandleToKeyboard(targetNode, 72, true);
          return;
        }

        (scrollView as ScrollView | null)?.scrollTo?.({ animated: true, y: 0 });
      }, delay);
    });
  }, []);

  const scrollToFirstError = useCallback((errors: ValidationErrors<Field>) => {
    const firstInvalidField = fieldOrder.find((field) => Boolean(errors[field]));
    if (firstInvalidField) scrollToField(firstInvalidField);
  }, [fieldOrder, scrollToField]);

  return {
    scrollToField,
    scrollToFirstError,
    scrollViewRef,
    setFieldRef,
  };
}
