import api from "./axios"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type Salon = {
  id: string
  owner_id: string
  business_name: string
  business_type: string | null
  slug: string | null
  description: string | null
  logo_url: string | null
  banner_url: string | null
  email: string | null
  phone: string | null
  website_url: string | null
  gst_number: string | null
  pan_number: string | null
  is_verified: boolean
  is_active: boolean
  onboarding_completed: boolean
  address: string | null
  location_type: "physical" | "mobile" | "virtual" | null
  team_type: "independent" | "team" | null
  team_size: "2-5" | "6-10" | "11+" | null
  created_at: string
  updated_at: string
}

export type CreateSalonPayload = {
  business_name: string
  business_type?: string
  slug?: string
  description?: string
  logo_url?: string
  banner_url?: string
  email?: string
  phone?: string
  website_url?: string
  gst_number?: string
  pan_number?: string
  address?: string
  location_type?: "physical" | "mobile" | "virtual"
  team_type?: "independent" | "team"
  team_size?: "2-5" | "6-10" | "11+"
}

export type UpdateSalonPayload = Partial<CreateSalonPayload> & {
  is_active?: boolean
  onboarding_completed?: boolean
}

export type ApiResponse<T> = {
  success: boolean
  message: string
  data: T
}

// ─────────────────────────────────────────────
// SALON API
// ─────────────────────────────────────────────

export const salonApi = {

  // POST /api/v1/salons
  create: async (payload: CreateSalonPayload): Promise<ApiResponse<Salon>> => {
    const { data } = await api.post("/api/v1/salons", payload)
    return data
  },

  // GET /api/v1/salons/me
  getMySalon: async (): Promise<ApiResponse<Salon>> => {
    const { data } = await api.get("/api/v1/salons/me")
    return data
  },

  // GET /api/v1/salons/:id
  getById: async (id: string): Promise<ApiResponse<Salon>> => {
    const { data } = await api.get(`/api/v1/salons/${id}`)
    return data
  },

  // GET /api/v1/salons  (admin only)
  listAll: async (): Promise<ApiResponse<Salon[]>> => {
    const { data } = await api.get("/api/v1/salons")
    return data
  },

  // PATCH /api/v1/salons/:id
  update: async (
    id: string,
    payload: UpdateSalonPayload
  ): Promise<ApiResponse<Salon>> => {
    const { data } = await api.patch(`/api/v1/salons/${id}`, payload)
    return data
  },

}
