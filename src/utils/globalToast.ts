// Lets any component fire the exact same floating "toast" card used for
// live notifications (see DashboardTopbar.tsx's showToast/notif-toast) —
// even components mounted outside DashboardTopbar's own subtree, like the
// cash-counter open/close flows, without prop-drilling or a new context.
// DashboardTopbar listens for this event once and renders it through its
// existing toast pipeline, so styling/animation/positioning stays identical
// to every other notification.
export type GlobalToastType = "success" | "error" | "info" | "warning";

export interface GlobalToastDetail {
  type: GlobalToastType;
  title: string;
  body?: string;
}

const EVENT_NAME = "app:toast";

export function showGlobalToast(type: GlobalToastType, title: string, body?: string) {
  window.dispatchEvent(new CustomEvent<GlobalToastDetail>(EVENT_NAME, { detail: { type, title, body } }));
}

export function onGlobalToast(handler: (detail: GlobalToastDetail) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<GlobalToastDetail>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
