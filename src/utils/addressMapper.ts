import { type GoogleGeocodeComponent, type AddressDetails } from "../types/location";

/**
 * Maps Google API address_components, geometry location, and place_id into a flat AddressDetails object.
 * Designed to be globally compatible and structure-independent.
 */
export function mapGoogleAddress(
  components: GoogleGeocodeComponent[],
  formattedAddress: string,
  lat: number,
  lng: number,
  placeId: string,
): AddressDetails {
  let streetNumber = "";
  let route = "";
  const areaParts: string[] = [];
  let city = "";
  let state = "";
  let country = "";
  let postalCode = "";

  for (const component of components) {
    const types = component.types;

    if (types.includes("street_number")) {
      streetNumber = component.long_name;
    } else if (types.includes("route")) {
      route = component.long_name;
    } else if (
      types.includes("sublocality") ||
      types.includes("sublocality_level_1") ||
      types.includes("sublocality_level_2") ||
      types.includes("neighborhood")
    ) {
      if (component.long_name && !areaParts.includes(component.long_name)) {
        areaParts.push(component.long_name);
      }
    } else if (types.includes("locality")) {
      city = component.long_name;
    } else if (types.includes("postal_town") && !city) {
      city = component.long_name;
    } else if (types.includes("administrative_area_level_2") && !city) {
      city = component.long_name; // fallback to county/district if locality is not set
    } else if (types.includes("administrative_area_level_1")) {
      state = component.long_name;
    } else if (types.includes("country")) {
      country = component.long_name;
    } else if (types.includes("postal_code")) {
      postalCode = component.long_name;
    }
  }

  // Build clean Address Line 1 (e.g. "123 Main Street")
  const addressLine1 = [streetNumber, route].filter(Boolean).join(" ") || formattedAddress.split(",")[0] || "";

  // Build Area (e.g. "Sector 5, Salt Lake")
  const area = areaParts.join(", ");

  return {
    formatted_address: formattedAddress,
    address_line_1: addressLine1,
    area: area,
    city: city || state, // fallback to state if city is empty
    state: state,
    country: country,
    postal_code: postalCode,
    latitude: lat,
    longitude: lng,
    place_id: placeId,
  };
}
