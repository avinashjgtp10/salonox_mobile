import * as Location from "expo-location";

export type AttendanceLocation = {
  latitude: number;
  longitude: number;
  location: string | null;
};

const POSITION_TIMEOUT_MS = 5000;
const GEOCODE_TIMEOUT_MS = 3000;
// Stop listening as soon as a reading is this precise (metres).
const TARGET_ACCURACY_M = 20;
// Only if no fresh GPS reading arrives in time: a fix at most this old is still
// treated as the punch location; anything older is not recorded.
const FALLBACK_MAX_AGE_MS = 2 * 60_000;

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

/**
 * Listens to live GPS at the highest accuracy for up to POSITION_TIMEOUT_MS and
 * returns the most precise fresh reading, finishing early once it is within
 * TARGET_ACCURACY_M. Never uses a cached position.
 */
const readFreshPosition = () =>
  new Promise<Location.LocationObject | null>((resolve) => {
    let best: Location.LocationObject | null = null;
    let subscription: Location.LocationSubscription | null = null;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      subscription?.remove();
      resolve(best);
    };
    const timer = setTimeout(finish, POSITION_TIMEOUT_MS);

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 500, distanceInterval: 0 },
      (reading) => {
        const accuracy = reading.coords.accuracy ?? Infinity;
        if (!best || accuracy < (best.coords.accuracy ?? Infinity)) best = reading;
        if (accuracy <= TARGET_ACCURACY_M) finish();
      },
    ).then(
      (watch) => {
        subscription = watch;
        if (finished) watch.remove();
      },
      finish,
    );
  });

const formatAddress = (address: Location.LocationGeocodedAddress | undefined) => {
  if (!address) return null;

  const parts = [
    address.name,
    address.street,
    address.district,
    address.city ?? address.subregion,
    address.region,
    address.postalCode,
  ].filter((part): part is string => Boolean(part?.trim()));

  return [...new Set(parts)].join(", ") || null;
};

/**
 * Reads the device's current location for a staff check-in/check-out.
 * Resolves null instead of throwing when permission is denied or GPS is unavailable,
 * so attendance can still be recorded without a location.
 */
export async function getAttendanceLocation(): Promise<AttendanceLocation | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== Location.PermissionStatus.GRANTED) {
      if (__DEV__) console.warn("[Attendance] Location permission not granted:", permission.status);
      return null;
    }

    // Android 12+ lets the user grant only "approximate" location (~1–3 km).
    if (__DEV__ && permission.android?.accuracy === "coarse") {
      console.warn("[Attendance] Only approximate location was granted; the punch location will not be precise");
    }

    const position =
      (await readFreshPosition()) ??
      (await Location.getLastKnownPositionAsync({ maxAge: FALLBACK_MAX_AGE_MS }));

    if (!position) {
      if (__DEV__) console.warn("[Attendance] No GPS position available for this punch");
      return null;
    }

    const { latitude, longitude, accuracy } = position.coords;
    const addresses = await withTimeout(Location.reverseGeocodeAsync({ latitude, longitude }), GEOCODE_TIMEOUT_MS).catch(() => null);
    const result = { latitude, longitude, location: formatAddress(addresses?.[0]) };
    if (__DEV__) console.log("[Attendance] Punch location", { ...result, accuracyMetres: accuracy });

    return result;
  } catch (error) {
    if (__DEV__) console.warn("[Attendance] Unable to read device location", error);
    return null;
  }
}

export const toAttendanceLocationBody = (position: AttendanceLocation | null) =>
  position
    ? {
        latitude: position.latitude,
        longitude: position.longitude,
        lat: position.latitude,
        lng: position.longitude,
        location: position.location ?? `${position.latitude}, ${position.longitude}`,
      }
    : {};
