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
  /** Real physical cell size (mm) to print at — same Small/Medium/Large/
   *  Custom concept as the Print Coupon modal (couponPrintSheet.ts). Drives
   *  how many fit per A4 page; takes priority over perPage if both are set. */
  sizeMm?: { width: number; height: number };
  cropMarks?: boolean;
  /** Total copies wanted, spanning as many A4 pages as it takes (1–500).
   *  Omitted = exactly one page's worth, however many fit at the chosen size. */
  quantity?: number;
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
