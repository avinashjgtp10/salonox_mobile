import { useState, useCallback } from "react";
import * as Location from "expo-location";
import { requestLocationPermission } from "../utils/locationPermission";
import { MapsService } from "../services/maps/maps.service";
import { type AddressDetails } from "../types/location";

export interface UseCurrentLocationResult {
  fetchLocation: () => Promise<AddressDetails | null>;
  loading: boolean;
  error: string | null;
  loadingState: string | null; // e.g. "Detecting location...", "Fetching details..."
}

/**
 * Custom hook to fetch device GPS coordinates with accuracy loop checking and reverse geocoding.
 */
export function useCurrentLocation(): UseCurrentLocationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<string | null>(null);

  const fetchLocation = useCallback(async (): Promise<AddressDetails | null> => {
    setLoading(true);
    setError(null);
    setLoadingState("Requesting location permission...");

    try {
      // 1. Check and request location permissions
      const permission = await requestLocationPermission();
      if (!permission.granted) {
        setError("Location permission was denied. Please enable permission to detect your address.");
        setLoading(false);
        setLoadingState(null);
        return null;
      }

      // 2. Fetch coordinates with high accuracy check loop (Requirement 3)
      setLoadingState("Detecting current location...");
      let bestLocation: Location.LocationObject | null = null;
      const maxRetries = 3;
      const targetAccuracyMeters = 50;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const accuracy = location.coords.accuracy ?? 999;
        
        // If this location meets or is better than our target accuracy, use it immediately
        if (accuracy <= targetAccuracyMeters) {
          bestLocation = location;
          break;
        }

        // Otherwise keep the one with best accuracy so far
        if (!bestLocation || accuracy < (bestLocation.coords.accuracy ?? 999)) {
          bestLocation = location;
        }

        if (attempt < maxRetries) {
          setLoadingState(`Poor GPS accuracy (${Math.round(accuracy)}m). Retrying (attempt ${attempt + 1}/${maxRetries})...`);
          // Sleep for 1 second before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!bestLocation) {
        throw new Error("Unable to obtain GPS coordinates.");
      }

      const { latitude, longitude } = bestLocation.coords;

      // 3. Reverse geocode coordinates
      setLoadingState("Fetching address details...");
      if (__DEV__) {
        console.log("[MapsService] Current location coordinates", {
          latitude,
          longitude,
          accuracy: bestLocation.coords.accuracy,
        });
      }
      const details = await MapsService.reverseGeocode(latitude, longitude);

      setLoading(false);
      setLoadingState(null);
      return details;
    } catch (err: any) {
      console.error("[useCurrentLocation] Error:", err.message || err);
      setError(err.message || "Failed to retrieve your location. Please type manually.");
      setLoading(false);
      setLoadingState(null);
      return null;
    }
  }, []);

  return {
    fetchLocation,
    loading,
    error,
    loadingState,
  };
}
