import { DeviceEventEmitter, type EmitterSubscription } from "react-native";

export type RealtimeEntity =
  | "appointments"
  | "attendance"
  | "clients"
  | "clientMemberships"
  | "dashboard"
  | "memberships"
  | "notifications"
  | "products"
  | "sales"
  | "services"
  | "staff";

export type RealtimeEntityChangedPayload = {
  entity: RealtimeEntity;
  payload?: unknown;
};

const REALTIME_ENTITY_CHANGED = "salonox:realtime-entity-changed";

export const emitRealtimeEntityChanged = (payload: RealtimeEntityChangedPayload) => {
  DeviceEventEmitter.emit(REALTIME_ENTITY_CHANGED, payload);
};

export const addRealtimeEntityChangedListener = (
  listener: (payload: RealtimeEntityChangedPayload) => void,
) => {
  const subscription: EmitterSubscription = DeviceEventEmitter.addListener(
    REALTIME_ENTITY_CHANGED,
    listener,
  );

  return () => subscription.remove();
};
