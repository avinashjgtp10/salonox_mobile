import * as Location from "expo-location";
import { Alert, Linking, Platform } from "react-native";
import { formatAttendancePlaceLabel } from "@/utils/attendancePlaceLabel";

export type AttendanceLocationErrorCode =
  | "cancelled"
  | "permissionDenied"
  | "placeUnavailable"
  | "servicesDisabled"
  | "unavailable";

const ATTENDANCE_LOCATION_MESSAGES: Record<AttendanceLocationErrorCode, string> = {
  cancelled: "Attendance was not recorded. Location confirmation was cancelled.",
  permissionDenied:
    "Location permission is required to record attendance. Enable location access for SalonOX in your device settings and try again.",
  placeUnavailable:
    "Location was detected, but no address or nearby area was available. Please try again.",
  servicesDisabled: "Location services are turned off. Turn on location on your device and try again.",
  unavailable: "We could not get your current location. Move to an open area and try again.",
};

export class AttendanceLocationError extends Error {
  readonly code: AttendanceLocationErrorCode;

  constructor(code: AttendanceLocationErrorCode) {
    super(ATTENDANCE_LOCATION_MESSAGES[code]);
    this.code = code;
    this.name = "AttendanceLocationError";
  }
}

// expo-location's getCurrentPositionAsync has no timeout option and can hang
// indefinitely when the GPS chip never returns a fix (indoors, poor signal).
// Cap the wait so the Check In / Check Out button can never appear stuck.
const POSITION_TIMEOUT_MS = 15000;

// How stale a cached fix may be before it is no longer an acceptable stand-in
// for a live one. Only used as a fallback when the live read times out.
const LAST_KNOWN_MAX_AGE_MS = 60000;

type Coordinates = { latitude: number; longitude: number };

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
};

// Log stages only, never coordinates or address text.
const locationDiagnostic = (stage: string, details: Record<string, unknown> = {}) => {
  if (__DEV__) console.log("[AttendanceLocation]", stage, details);
};

const ensureForegroundPermission = async () => {
  const existing = await Location.getForegroundPermissionsAsync();
  locationDiagnostic("permission", { status: existing.status, canAskAgain: existing.canAskAgain });

  if (existing.status === Location.PermissionStatus.GRANTED) {
    // Android does not repeat its permission dialog once access is granted.
    // Still confirm this attendance capture visibly before reading location.
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Use location for attendance?",
        "SalonOX will capture your current location and save it with this check-in or checkout.",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Continue", onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (!confirmed) {
      throw new AttendanceLocationError("cancelled");
    }
    return;
  }

  // Already denied with no further prompts allowed — asking again is a no-op,
  // so send the user straight to settings via the error message.
  if (!existing.canAskAgain) {
    Alert.alert(
      "Enable location permission",
      "Allow location access in your phone settings, then return and tap Check In or Check Out again.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => { void Linking.openSettings().catch(() => undefined); } },
      ],
    );
    throw new AttendanceLocationError("permissionDenied");
  }

  const requested = await Location.requestForegroundPermissionsAsync();

  if (requested.status !== Location.PermissionStatus.GRANTED) {
    throw new AttendanceLocationError("permissionDenied");
  }
};

const getCurrentCoordinates = async (): Promise<Coordinates> => {
  await ensureForegroundPermission();

  if (!(await Location.hasServicesEnabledAsync())) {
    throw new AttendanceLocationError("servicesDisabled");
  }

  if (Platform.OS === "android") {
    // Prompts the user to switch on the fused/network provider when it is off.
    // Failing here is not fatal — the GPS provider alone may still give a fix.
    await Location.enableNetworkProviderAsync().catch(() => undefined);
  }

  let position: Location.LocationObject | null = null;

  try {
    position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      POSITION_TIMEOUT_MS,
    );
  } catch (error) {
    console.warn("[Attendance] Current position lookup failed", error);
  }

  if (!position) {
    // A recent cached fix is accurate enough for attendance and avoids
    // blocking the punch when the live read stalls.
    position = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS, requiredAccuracy: 50 }).catch(() => null);
    locationDiagnostic("cached-position", { available: Boolean(position) });
  }

  if (!position) {
    throw new AttendanceLocationError("unavailable");
  }

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
};

const joinPlaceParts = (name: string, locality: string) => {
  const trimmedName = formatAttendancePlaceLabel(name);
  const trimmedLocality = formatAttendancePlaceLabel(locality);

  if (!trimmedName) {
    return trimmedLocality;
  }

  // Avoid "Baramati, Baramati" when the venue name already carries the town.
  if (!trimmedLocality || trimmedName.toLowerCase().includes(trimmedLocality.toLowerCase())) {
    return trimmedName;
  }

  return `${trimmedName}, ${trimmedLocality}`;
};

// Use only the device geocoder. Prefer a specific address across all results,
// then fall back to the reported surrounding area without inventing a venue.
const resolvePlaceNameWithDevice = async ({ latitude, longitude }: Coordinates) => {
  locationDiagnostic("reverse-geocode-start");
  const results = await withTimeout(
    Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => {
      locationDiagnostic("reverse-geocode-failed");
      return [];
    }),
    10000,
  ) ?? [];
  locationDiagnostic("reverse-geocode-results", { count: results.length });
  for (const address of results) {
    const locality = formatAttendancePlaceLabel(address.city || address.subregion || address.region);
    const broadLabels = [address.city, address.subregion, address.region, address.country]
      .map((value) => formatAttendancePlaceLabel(value).toLowerCase()).filter(Boolean);
    const name = formatAttendancePlaceLabel(address.name);
    const street = formatAttendancePlaceLabel(address.street);
    const venue = name && !broadLabels.includes(name.toLowerCase()) && !/^\d+$/.test(name) ? name : "";
    const label = venue || (street ? [address.streetNumber, street].filter(Boolean).join(" ") : "");
    if (label && !broadLabels.includes(label.toLowerCase())) {
      locationDiagnostic("resolved-address");
      return joinPlaceParts(label, locality);
    }
  }
  // Android may provide a complete address without populating name/street.
  // Do not discard that address, but do not mistake city/postcode for a venue.
  for (const address of results) {
    const formatted = formatAttendancePlaceLabel(address.formattedAddress);
    const broadParts = [address.city, address.subregion, address.region, address.country, address.isoCountryCode, address.postalCode]
      .map((value) => formatAttendancePlaceLabel(value).toLowerCase()).filter(Boolean);
    const hasDetail = formatted.split(",").some((part) => {
      let remainder = part.toLowerCase().trim();
      for (const broad of broadParts) remainder = remainder.split(broad).join("").trim();
      return /\p{L}/u.test(remainder);
    });
    if (formatted && hasDetail) {
      locationDiagnostic("resolved-formatted-address");
      return formatted;
    }
  }
  for (const address of results) {
    const area = formatAttendancePlaceLabel(address.district || address.subregion);
    const city = formatAttendancePlaceLabel(address.city || address.region);
    const label = joinPlaceParts(area, city);
    if (label) {
      locationDiagnostic("resolved-area");
      return `Area: ${label}`;
    }
  }
  return "";
};

/**
 * Resolves the human-readable place name to stamp on an attendance punch.
 *
 * Coordinates are fetched and used only to look the place up — they are never
 * returned to the caller, so nothing upstream can persist them.
 *
 * Throws an {@link AttendanceLocationError} carrying user-facing copy when
 * permission is denied, location services are off, no fix is obtainable, or
 * no place name could be resolved — so the caller can abort the punch rather
 * than saving an incomplete attendance record.
 */
export const getCurrentAttendancePlaceName = async (): Promise<string> => {
  locationDiagnostic("expo-only-capture-start");
  const coordinates = await getCurrentCoordinates();
  locationDiagnostic("position-acquired");
  const placeName = await resolvePlaceNameWithDevice(coordinates);

  if (!placeName.trim()) {
    throw new AttendanceLocationError("placeUnavailable");
  }

  return placeName.trim();
};

export const getAttendanceLocationErrorMessage = (error: unknown): string =>
  error instanceof AttendanceLocationError ? error.message : ATTENDANCE_LOCATION_MESSAGES.unavailable;
