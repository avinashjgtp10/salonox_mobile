type RequestSignal = {
  readonly aborted: boolean;
  addEventListener?: (event: string, listener: () => void) => void;
  removeEventListener?: (event: string, listener: () => void) => void;
};

export function forwardRequestCancellation(signal: RequestSignal | undefined, controller: AbortController) {
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener?.("abort", abort);
  return () => signal?.removeEventListener?.("abort", abort);
}
