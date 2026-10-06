import type { AlertButton, AlertOptions } from "react-native";

export type AppAlertRequest = {
  id: number;
  title: string;
  message: string;
  buttons: AlertButton[];
  options?: AlertOptions;
};

export function createAppAlertQueue() {
  let nextId = 0;
  let queue: AppAlertRequest[] = [];
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  return {
    alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
      queue = [...queue, { id: ++nextId, title, message: message ?? "", buttons: buttons?.length ? buttons : [{ text: "OK" }], options }];
      notify();
    },
    getSnapshot: () => queue[0] ?? null,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    dismiss(id: number, reason: "action" | "cancel") {
      const current = queue[0];
      if (!current || current.id !== id || (reason === "cancel" && !current.options?.cancelable)) return null;
      queue = queue.slice(1);
      notify();
      if (reason === "cancel") current.options?.onDismiss?.();
      return current;
    },
  };
}

export const appAlert = createAppAlertQueue();
