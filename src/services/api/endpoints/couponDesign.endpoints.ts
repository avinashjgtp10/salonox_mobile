export const COUPON_DESIGN = {
  BASE: "/api/v1/coupon-designs",
  BY_ID: (id: string) => `/api/v1/coupon-designs/${id}`,
  DUPLICATE: (id: string) => `/api/v1/coupon-designs/${id}/duplicate`,
  EXPORT: (id: string) => `/api/v1/coupon-designs/${id}/export`,
} as const;

export interface ExportDesignPayload {
  format: "png" | "jpeg" | "pdf";
  dpi?: 72 | 150 | 300;
  /** Token values. Omit and every {{Token}} renders empty. */
  values?: Record<string, string>;
  /** Set to render an A4 sheet of copies instead of one artboard. */
  perPage?: 1 | 2 | 4 | 6 | 8 | 10 | 12;
  cropMarks?: boolean;
}

export interface ExportDesignResult {
  url: string;
  fileName: string;
  bytes: number;
  /** Tokens that had no value — worth warning about before printing. */
  missingTokens: string[];
}

export type DesignKind = "design" | "template";
export type DesignStatus = "draft" | "published" | "archived";

/** Row as returned by the list endpoint — deliberately without `doc`. */
export interface CouponDesignSummary {
  id: string;
  salon_id: string | null;
  name: string;
  kind: DesignKind;
  status: DesignStatus;
  preset: string;
  width_px: number;
  height_px: number;
  thumbnail_url: string | null;
  coupon_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

/** Full row, from GET /:id — includes the design document. */
export interface CouponDesignDetail extends CouponDesignSummary {
  doc: unknown;
}

export interface SaveCouponDesignPayload {
  name?: string;
  preset?: string;
  width_px: number;
  height_px: number;
  doc: unknown;
  coupon_id?: string | null;
  status?: DesignStatus;
}
