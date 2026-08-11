import {
  type AddressDetails,
  type NominatimReverseResponse,
  type PhotonResponse,
  type PlacePrediction,
} from "../../types/location";
import { mapNominatimAddress, mapPhotonFeature } from "../../utils/addressMapper";

const PHOTON_AUTOCOMPLETE_URL = "https://photon.komoot.io/api/";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
export const MAPS_PROVIDER_HEADERS = {
  Accept: "application/json",
  "User-Agent": "SalonOX-Mobile-App/1.0 (https://salonox.com)",
};

const fetchJson = async <T>(url: string, fallbackMessage: string): Promise<T> => {
  try {
    const response = await fetch(url, {
      headers: MAPS_PROVIDER_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error: any) {
    console.error("[MapsService] Provider request failed:", error.message || error);
    throw new Error(fallbackMessage);
  }
};

/**
 * MapsService - Handles address search and reverse geocoding through the same
 * OpenStreetMap provider architecture used by the SalonOX web app.
 */
export const MapsService = {
  /**
   * Search address autocomplete suggestions through Photon.
   * Debouncing and session-caching are handled by the caller/hooks.
   */
  async autocomplete(query: string): Promise<PlacePrediction[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return [];
    }

    const url = `${PHOTON_AUTOCOMPLETE_URL}?q=${encodeURIComponent(trimmed)}&limit=7&lang=en`;
    const data = await fetchJson<PhotonResponse>(
      url,
      "Search suggestions are currently unavailable. Please verify your internet connection or enter your address manually.",
    );

    return (data.features ?? []).map((feature, index) => {
      const details = mapPhotonFeature(feature);
      const mainText =
        feature.properties.name ||
        feature.properties.street ||
        details.address_line_1 ||
        details.formatted_address;
      const secondaryText = [
        details.area,
        details.city,
        details.state,
        details.country,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        placeId: details.place_id || `photon:${index}`,
        description: details.formatted_address,
        details,
        structuredFormatting: {
          mainText,
          secondaryText,
        },
      };
    });
  },

  /**
   * Photon already returns coordinates and address properties in autocomplete
   * results, so place details are resolved locally from the selected suggestion.
   */
  async getPlaceDetails(prediction: PlacePrediction): Promise<AddressDetails> {
    return prediction.details;
  },

  /**
   * Reverse geocode coordinates into address fields through Nominatim.
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<AddressDetails> {
    const url =
      `${NOMINATIM_REVERSE_URL}?format=json&addressdetails=1&zoom=18&accept-language=en&lat=${encodeURIComponent(
        String(latitude),
      )}&lon=${encodeURIComponent(String(longitude))}`;

    const data = await fetchJson<NominatimReverseResponse>(
      url,
      "Failed to resolve coordinates to an address. Please check your internet connection or input details manually.",
    );

    return mapNominatimAddress(data, latitude, longitude);
  },
};
