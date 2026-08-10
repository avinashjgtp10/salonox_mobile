/**
 * Read-only. There is no editor for the brand kit — see the memory note
 * project-brand-kit-no-ui — this endpoint exists only so CouponDesignerPage
 * can resolve {{Tagline}}/{{Instagram}}/{{Facebook}}/{{WhatsApp}} tokens.
 */
export const BRAND_KIT = {
  BASE: "/api/v1/brand-kit",
} as const;

/**
 * The kit merged with the salon's own record — salon_name/phone/website/address
 * come from `salons`, the rest from `salon_brand_kits`. The API always returns
 * a complete object with defaults, so callers never handle a missing kit.
 */
export interface BrandKit {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  heading_font: string;
  body_font: string;
  logo_url: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp_number: string | null;
  tagline: string | null;
  salon_name: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
}
