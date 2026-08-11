import {
  type AddressDetails,
  type NominatimReverseResponse,
  type PhotonFeature,
} from "../types/location";

const firstValue = (...values: (string | undefined | null)[]) =>
  values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";

const compactJoin = (values: string[], separator = ", ") =>
  values.map((value) => value.trim()).filter(Boolean).join(separator);

const uniqueCompactJoin = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).join(", ");

export function mapPhotonFeature(feature: PhotonFeature): AddressDetails {
  const properties = feature.properties ?? {};
  const [longitude, latitude] = feature.geometry.coordinates;

  const street = firstValue(properties.street);
  const houseNumber = firstValue(properties.housenumber);
  const name = firstValue(properties.name);
  const addressLine1 = compactJoin([houseNumber, street], " ") || name;
  const city = firstValue(
    properties.city,
    properties.town,
    properties.village,
    properties.municipality,
    properties.county,
  );
  const area = uniqueCompactJoin([
    firstValue(properties.district),
    firstValue(properties.county),
  ].filter((value) => value && value !== city));
  const state = firstValue(properties.state);
  const country = firstValue(properties.country);
  const postalCode = firstValue(properties.postcode);
  const formattedAddress = uniqueCompactJoin([
    addressLine1,
    area,
    city,
    state,
    postalCode,
    country,
  ]);

  return {
    formatted_address: formattedAddress || name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    address_line_1: addressLine1 || formattedAddress,
    area,
    city: city || state,
    state,
    country,
    postal_code: postalCode,
    latitude,
    longitude,
    place_id: `photon:${properties.osm_type ?? "osm"}:${properties.osm_id ?? `${latitude},${longitude}`}`,
  };
}

export function mapNominatimAddress(
  response: NominatimReverseResponse,
  fallbackLatitude: number,
  fallbackLongitude: number,
): AddressDetails {
  const address = response.address ?? {};
  const latitude = Number(response.lat) || fallbackLatitude;
  const longitude = Number(response.lon) || fallbackLongitude;

  const street = firstValue(address.road, address.pedestrian, address.footway);
  const houseNumber = firstValue(address.house_number);
  const placeName = firstValue(address.name, address.amenity, address.shop, address.building);
  const addressLine1 = compactJoin([houseNumber, street], " ") || placeName;
  const city = firstValue(
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.county,
  );
  const area = uniqueCompactJoin([
    firstValue(address.neighbourhood),
    firstValue(address.suburb),
    firstValue(address.quarter),
    firstValue(address.city_district),
  ].filter((value) => value && value !== city && value !== addressLine1));
  const state = firstValue(address.state);
  const country = firstValue(address.country);
  const postalCode = firstValue(address.postcode);
  const formattedAddress =
    firstValue(response.display_name) ||
    uniqueCompactJoin([addressLine1, area, city, state, postalCode, country]);

  return {
    formatted_address: formattedAddress || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    address_line_1: addressLine1,
    area,
    city: city || state,
    state,
    country,
    postal_code: postalCode,
    latitude,
    longitude,
    place_id: response.place_id ? `nominatim:${response.place_id}` : `coords:${latitude},${longitude}`,
  };
}
