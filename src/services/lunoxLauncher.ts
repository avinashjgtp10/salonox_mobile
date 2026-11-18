// A push tap is handled in usePushNotifications, which lives outside the
// owner-tabs React tree that owns the Lunox sheet state. This tiny module-level
// bridge lets that handler (or any non-React caller) ask the tabs layout to open
// Lunox AI. If the request arrives before the tabs layout has mounted and
// subscribed — e.g. a cold start from a tapped notification — it is held and
// replayed as soon as the listener attaches.

type LunoxLaunchListener = (seed: string | null) => void;

let listener: LunoxLaunchListener | null = null;
let pending: { seed: string | null } | null = null;

export const lunoxLauncher = {
  /** The owner-tabs layout subscribes once; the latest subscriber wins. */
  subscribe(next: LunoxLaunchListener) {
    listener = next;

    if (pending) {
      const replay = pending;
      pending = null;
      next(replay.seed);
    }

    return () => {
      if (listener === next) listener = null;
    };
  },

  /** Open Lunox AI now, or queue it until the tabs layout is ready. */
  open(seed: string | null = null) {
    if (listener) {
      listener(seed);
    } else {
      pending = { seed };
    }
  },
};
