import axios from "axios";
import { type PlacePrediction, type GoogleGeocodeResult } from "../../types/location";

const GOOGLE_API_BASE = "https://maps.googleapis.com/maps/api";

// Fetch the key securely. Can be restricted to process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.
const getApiKey = (): string => {
  return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
};

/**
 * MapsService - Handles places queries and reverse geocoding.
 * 
 * Note: If migrating to a backend proxy later, you can simply change 
 * the target URLs in the requests below to point to your Node.js API 
 * endpoints (e.g. `/api/maps/autocomplete`, `/api/maps/details`, `/api/maps/reverse-geocode`)
 * and remove the client-side API key references.
 */
export const MapsService = {
  /**
   * Search address autocomplete suggestions.
   * Debouncing and session-caching should be handled by the caller/hooks.
   */
  async autocomplete(query: string): Promise<PlacePrediction[]> {
    const key = getApiKey();
    if (!key) {
      throw new Error("Google Maps API key is not configured.");
    }
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const response = await axios.get(`${GOOGLE_API_BASE}/place/autocomplete/json`, {
        params: {
          input: query,
          key,
          types: "address|establishment",
        },
      });

      if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
        throw new Error(response.data.error_message || `Google Places Error: ${response.data.status}`);
      }

      const predictions = response.data.predictions || [];
      return predictions.map((p: any) => ({
        placeId: p.place_id,
        description: p.description,
        structuredFormatting: p.structured_formatting
          ? {
              mainText: p.structured_formatting.main_text,
              secondaryText: p.structured_formatting.secondary_text,
            }
          : undefined,
      }));
    } catch (error: any) {
      console.error("[MapsService] Autocomplete error:", error.message || error);
      throw new Error(
        error.message?.includes("Google Places Error")
          ? error.message
          : "Search suggestions are currently unavailable. Please verify your internet connection or enter your address manually."
      );
    }
  },

  /**
   * Retrieve full geometry and component details for a place ID.
   */
  async getPlaceDetails(placeId: string): Promise<GoogleGeocodeResult> {
    const key = getApiKey();
    if (!key) {
      throw new Error("Google Maps API key is not configured.");
    }

    try {
      const response = await axios.get(`${GOOGLE_API_BASE}/place/details/json`, {
        params: {
          place_id: placeId,
          fields: "address_component,geometry,formatted_address,place_id",
          key,
        },
      });

      if (response.data.status !== "OK") {
        throw new Error(response.data.error_message || `Google Place Details Error: ${response.data.status}`);
      }

      return response.data.result as GoogleGeocodeResult;
    } catch (error: any) {
      console.error("[MapsService] Place Details error:", error.message || error);
      throw new Error(
        error.message?.includes("Google Place Details Error")
          ? error.message
          : "Failed to fetch place details. Please check your internet connection or enter details manually."
      );
    }
  },

  /**
   * Reverse geocode a set of coordinates into address components.
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<GoogleGeocodeResult> {
    const key = getApiKey();
    if (!key) {
      throw new Error("Google Maps API key is not configured.");
    }

    try {
      const response = await axios.get(`${GOOGLE_API_BASE}/geocode/json`, {
        params: {
          latlng: `${latitude},${longitude}`,
          key,
        },
      });

      if (response.data.status !== "OK") {
        throw new Error(response.data.error_message || `Google Geocoding Error: ${response.data.status}`);
      }

      const results = response.data.results || [];
      if (results.length === 0) {
        throw new Error("No address coordinates found.");
      }

      // Return the most specific result (first in list)
      return results[0] as GoogleGeocodeResult;
    } catch (error: any) {
      console.error("[MapsService] Reverse geocode error:", error.message || error);
      throw new Error(
        error.message?.includes("Google Geocoding Error")
          ? error.message
          : "Failed to resolve coordinates to an address. Please check your internet connection or input details manually."
      );
    }
  },
};
