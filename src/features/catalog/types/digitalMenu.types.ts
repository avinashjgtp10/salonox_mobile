export type DigitalMenuStatus = "active" | "inactive";
export type DigitalMenuServiceMode = "all_active" | "specific";

export interface DigitalMenu {
  id: string;
  name: string;
  status: DigitalMenuStatus;
  service_selection_mode: DigitalMenuServiceMode;
  selected_service_ids: string[];
  public_token: string;
  service_count: number;
  category_count: number;
  updated_at: string;
}

export interface SaveDigitalMenuPayload {
  id?: string;
  name: string;
  status: DigitalMenuStatus;
  service_selection_mode: DigitalMenuServiceMode;
  selected_service_ids: string[];
}

export interface PublicMenuSalon {
  name: string;
  logo_url?: string | null;
  cover_image_url?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface PublicMenuService {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: string | number;
  price_type?: "fixed" | "from" | "free";
  duration: number;
  online_booking?: boolean;
}

export interface PublicMenuCategory {
  name: string;
  services: PublicMenuService[];
}

export interface PublicMenuResponse {
  status: DigitalMenuStatus;
  name: string;
  salon: PublicMenuSalon;
  // ISO 4217 code (e.g. "INR", "USD") — the salon's configured currency, sent
  // explicitly because this page is unauthenticated and never loads the
  // owner's salon slice, so useCurrency()'s Redux-based lookup isn't available.
  currency?: string;
  categories: PublicMenuCategory[];
  booking_slug: string | null;
}
