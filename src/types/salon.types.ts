export type Salon = {
  id:                   string
  owner_id:             string
  business_name:        string
  business_type:        string | null
  slug:                 string | null
  description:          string | null
  logo_url:             string | null
  banner_url:           string | null
  email:                string | null
  phone:                string | null
  website_url:          string | null
  gst_number:           string | null
  pan_number:           string | null
  is_verified:          boolean
  is_active:            boolean
  onboarding_completed: boolean
  address:              string | null
  location_type:        "physical" | "mobile" | "virtual" | null
  team_type:            "independent" | "team" | null
  team_size:            "2-5" | "6-10" | "11+" | null
  created_at:           string
  updated_at:           string
}

export type CreateSalonPayload = {
  business_name:   string
  business_type?:  string
  slug?:           string
  description?:    string
  logo_url?:       string
  banner_url?:     string
  email?:          string
  phone?:          string
  website_url?:    string
  gst_number?:     string
  pan_number?:     string
  address?:        string
  location_type?:  "physical" | "mobile" | "virtual"
  team_type?:      "independent" | "team"
  team_size?:      "2-5" | "6-10" | "11+"
  onboarding_completed?: boolean
}

export type UpdateSalonPayload = Partial<CreateSalonPayload> & {
  is_active?:            boolean
  onboarding_completed?: boolean
}

export type ApiResponse<T> = {
  success: boolean
  message: string
  data:    T
}

export type CreateSalonResponse = {
  success: boolean
  message: string
  data: {
    salon:                Salon
    accessToken:          string
    refreshToken:         string
    isOnboardingComplete: boolean
  }
}
