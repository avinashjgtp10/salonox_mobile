type SessionInvalidationReason =
  | "bootstrap_invalid"
  | "logout"
  | "logout_all"
  | "delete_account"
  | "refresh_failed"
  | "missing_refresh_token"
  | "unauthorized_response";

type SessionInvalidationListener = (reason: SessionInvalidationReason) => void | Promise<void>;

const listeners = new Set<SessionInvalidationListener>();

export const addSessionInvalidationListener = (listener: SessionInvalidationListener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const notifySessionInvalidated = (reason: SessionInvalidationReason) => {
  listeners.forEach((listener) => {
    void listener(reason);
  });
};

