
export interface AddressDetails {
  formatted_address: string;
  address_line_1: string;
  area: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  place_id: string;
}

export interface PlacePrediction {
  placeId: string;
  description: string;
  details: AddressDetails;
  structuredFormatting?: {
    mainText: string;
    secondaryText: string;
  };
}

export interface PhotonFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    osm_id?: number | string;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export interface PhotonResponse {
  features?: PhotonFeature[];
}

export interface NominatimReverseResponse {
  place_id?: number | string;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    footway?: string;
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
    name?: string;
    amenity?: string;
    shop?: string;
    building?: string;
  };
}
