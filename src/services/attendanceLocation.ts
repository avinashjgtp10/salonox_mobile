import * as Location from "expo-location";

export type AttendanceLocation = {
  latitude: number;
  longitude: number;
  location: string | null;
};

const POSITION_TIMEOUT_MS = 10000;

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

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

    if (permission.status !== Location.PermissionStatus.GRANTED) return null;

    const position =
      (await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        POSITION_TIMEOUT_MS,
      )) ?? (await Location.getLastKnownPositionAsync());

    if (!position) return null;

    const { latitude, longitude } = position.coords;
    const addresses = await withTimeout(Location.reverseGeocodeAsync({ latitude, longitude }), 5000).catch(() => null);

    return { latitude, longitude, location: formatAddress(addresses?.[0]) };
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
