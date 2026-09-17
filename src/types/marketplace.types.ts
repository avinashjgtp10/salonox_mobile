// ─── Enums ────────────────────────────────────────────────────────────────────
export type Amenity =
  | "parking_available"
  | "near_public_transport"
  | "showers"
  | "lockers"
  | "bath_towels"
  | "swimming_pool"
  | "sauna";

export type Highlight =
  | "pet_friendly"
  | "adults_only"
  | "kid_friendly"
  | "wheelchair_accessible";

export type Value =
  | "organic_products_only"
  | "vegan_products_only"
  | "environmentally_friendly"
  | "lgbtq_plus"
  | "black_owned"
  | "woman_owned"
  | "asian_owned"
  | "hispanic_owned"
  | "indigenous_owned";

export type FeatureType = "amenity" | "highlight" | "value";

// ─── Marketplace Profile ──────────────────────────────────────────────────────

export interface MarketplaceProfile {
  id: string;
  salon_id: string;
  display_name: string;
  tagline: string | null;
  website: string | null;
  business_phone: string | null;
  business_phone_country_code: string | null;
  business_email: string | null;
  venue_description: string | null;
  max_advance_days: number;
  min_notice_hours: number;
  cancellation_notice_hours: number;
  slot_interval_minutes: number;
  // Optional because the columns may not be migrated yet — absent reads as ON.
  allow_same_day_booking?: boolean;
  allow_multiple_services?: boolean;
  about_enabled?: boolean;
  instagram_url?: string | null;
  facebook_url?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Business Location ────────────────────────────────────────────────────────

export interface MarketplaceLocation {
  id: string;
  profile_id: string;
  address_line: string;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Working Hours ────────────────────────────────────────────────────────────

export interface WorkingHourSlot {
  open_time: string;   // "10:00:00"
  close_time: string;  // "19:00:00"
}

export interface WorkingHoursDay {
  day_of_week: number; // 0=Sun, 1=Mon ... 6=Sat
  is_open: boolean;
  slots: WorkingHourSlot[];
}

// ─── Venue Images ─────────────────────────────────────────────────────────────

export interface MarketplaceImage {
  id: string;
  profile_id: string;
  image_url: string;
  is_cover: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Full Profile (aggregated) ────────────────────────────────────────────────

export interface MarketplaceProfileFull extends MarketplaceProfile {
  location: MarketplaceLocation | null;
  working_hours: WorkingHoursDay[];
  images: MarketplaceImage[];
  amenities: Amenity[];
  highlights: Highlight[];
  values: Value[];
}
