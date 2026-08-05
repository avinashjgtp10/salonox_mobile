export type ProductType = "retail" | "consumable" | "both";

export type ProductUnit =
  | "ml"
  | "L"
  | "g"
  | "kg"
  | "pcs"
  | "bottle"
  | "tube"
  | "pack"
  | "box"
  | "roll";

export const PRODUCT_UNITS: ProductUnit[] = [
  "ml",
  "L",
  "g",
  "kg",
  "pcs",
  "bottle",
  "tube",
  "pack",
  "box",
  "roll",
];

export const isConsumableType = (type: ProductType | string | null | undefined): boolean =>
  type === "consumable" || type === "both";

export type TaxType = "no_tax" | "gst_5" | "gst_12" | "gst_18" | "gst_28" | "custom";

export const TAX_TYPE_OPTIONS: { value: TaxType; label: string }[] = [
  { value: "no_tax", label: "No tax" },
  { value: "gst_5", label: "GST 5%" },
  { value: "gst_12", label: "GST 12%" },
  { value: "gst_18", label: "GST 18%" },
  { value: "gst_28", label: "GST 28%" },
  { value: "custom", label: "Custom" },
];

export interface Product {
  id: string;
  name: string;
  barcode: string | null;
  brand_id: string | null;
  category_id: string | null;
  supplier_id: string | null;
  amount: number;
  qty_alert: number;
  description: string | null;
  supply_price: number;
  retail_sales_enabled: boolean;
  retail_price: number | null;
  markup_percentage: number | null;
  product_type: ProductType;
  unit: ProductUnit | null;
  size: string | null;
  bottle_size: number | null;
  is_active: boolean;
  tax_type: TaxType;
  custom_tax_rate: number | null;
  hsn_sac: string | null;
  created_at?: string;
  updated_at?: string;
}
