export type Salon = {
  id: string;
  owner_id: string;
  business_name: string;
  business_type: string | null;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  google_review_url: string | null;
  gst_number: string | null;
  pan_number: string | null;
  is_verified: boolean;
  is_active: boolean;
  onboarding_completed: boolean;
  address: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  timezone: string | null;
  currency: string | null;
  business_category: string | null;
  gst_registration_type: "regular" | "composition" | "unregistered" | null;
  location_type: "physical" | "mobile" | "virtual" | null;
  team_type: "independent" | "team" | null;
  team_size: "2-5" | "6-10" | "11+" | null;
  created_at: string;
  updated_at: string;
};

export type CreateSalonPayload = {
  business_name: string;
  business_type?: string;
  slug?: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  email?: string;
  phone?: string;
  website_url?: string;
  google_review_url?: string;
  gst_number?: string;
  pan_number?: string;
  address?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  timezone?: string;
  currency?: string;
  business_category?: string;
  gst_registration_type?: "regular" | "composition" | "unregistered";
  location_type?: "physical" | "mobile" | "virtual";
  team_type?: "independent" | "team";
  team_size?: "2-5" | "6-10" | "11+";
  onboarding_completed?: boolean;
};

export type UpdateSalonPayload = Partial<CreateSalonPayload> & {
  is_active?: boolean;
  onboarding_completed?: boolean;
};

export type Branch = {
  id: string;
  salon_id: string;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type CreateSalonResponse = {
  success: boolean;
  message: string;
  data: {
    salon: Salon;
    accessToken: string;
    refreshToken: string;
    isOnboardingComplete: boolean;
  };
};
