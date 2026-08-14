import type { Setting } from "../../../types/setting.types";

// Same fixed-key, single-row convention as TAX_MODULE_CONFIG
// (taxModuleSettings.ts) — a salon has one print configuration, JSON-encoded
// into salon_settings' single `value` column. Nothing new is needed on the
// backend: that table already stores arbitrary keyed JSON scoped to the salon,
// which is also what makes the setting inherently per-salon/branch.
export const PRINT_SETTING_KEY = "PRINT_CONFIG";

export type PaperSize = "thermal_58" | "thermal_80" | "a4" | "custom";

export interface PrintConfig {
  paper_size: PaperSize;
  /** Custom paper only — millimetres. */
  custom_width_mm: number;
  /** Custom paper only. 0 = continuous roll: the page grows to fit its content
   *  instead of being padded out to a fixed height, which is what a receipt
   *  printer with no page break actually wants. */
  custom_height_mm: number;
  margin_top_mm: number;
  margin_bottom_mm: number;
  margin_left_mm: number;
  margin_right_mm: number;
}

export const DEFAULT_PRINT_CONFIG: PrintConfig = {
  // A4 keeps the behaviour every existing salon already has — this feature
  // must not silently reformat anyone's invoices on rollout.
  paper_size: "a4",
  custom_width_mm: 80,
  custom_height_mm: 0,
  margin_top_mm: 4,
  margin_bottom_mm: 4,
  margin_left_mm: 4,
  margin_right_mm: 4,
};

/**
 * Everything the renderer needs, resolved from the stored config. Templates
 * read this rather than the raw config so "what size is the paper" is answered
 * once, here, instead of being re-derived (and re-guessed) per template.
 */
export interface PaperProfile {
  size: PaperSize;
  /** Physical paper width in mm. */
  widthMm: number;
  /** Physical height in mm; 0 means continuous/auto. */
  heightMm: number;
  margins: { top: number; bottom: number; left: number; right: number };
  /** Printable width once margins are removed — what content is laid out in. */
  contentWidthMm: number;
  /** Thermal rolls are narrow, monospace-ish, single-column, no colour fills.
   *  A4 is the full tabular invoice. This is the one switch that selects the
   *  layout family. */
  isThermal: boolean;
  /** Multiplies every font size in the template. Thermal paper needs smaller
   *  type to fit a line; very narrow rolls need smaller still. */
  fontScale: number;
  /** Logo edge length in px, scaled to the paper. */
  logoPx: number;
}

// Fixed presets. Thermal margins are deliberately small and fixed: the printer
// itself has an unprintable edge, and a user-set margin on top of that wastes
// most of a 58mm roll.
const PRESETS: Record<Exclude<PaperSize, "custom">, { widthMm: number; heightMm: number; margins: PaperProfile["margins"]; isThermal: boolean }> = {
  thermal_58: { widthMm: 58, heightMm: 0, margins: { top: 3, bottom: 3, left: 3, right: 3 }, isThermal: true },
  thermal_80: { widthMm: 80, heightMm: 0, margins: { top: 4, bottom: 4, left: 4, right: 4 }, isThermal: true },
  a4:         { widthMm: 210, heightMm: 297, margins: { top: 0, bottom: 0, left: 0, right: 0 }, isThermal: false },
};

/** Below this width a page can't hold the multi-column invoice table, so a
 *  custom size is treated as a receipt roll regardless of what it's called. */
const THERMAL_WIDTH_CEILING_MM = 120;

export function resolvePaperProfile(config: PrintConfig): PaperProfile {
  if (config.paper_size !== "custom") {
    const preset = PRESETS[config.paper_size];
    const contentWidthMm = preset.widthMm - preset.margins.left - preset.margins.right;
    return {
      size: config.paper_size,
      widthMm: preset.widthMm,
      heightMm: preset.heightMm,
      margins: preset.margins,
      contentWidthMm,
      isThermal: preset.isThermal,
      fontScale: preset.isThermal ? thermalFontScale(contentWidthMm) : 1,
      logoPx: preset.isThermal ? Math.round(contentWidthMm * 0.9) : 68,
    };
  }

  // Custom — clamped so a typo can't produce an unprintable page (a 0mm width
  // renders a blank sheet, a 5000mm height spools the whole roll).
  const widthMm = clamp(config.custom_width_mm, 30, 300);
  const heightMm = config.custom_height_mm > 0 ? clamp(config.custom_height_mm, 30, 2000) : 0;
  const margins = {
    top: clamp(config.margin_top_mm, 0, 50),
    bottom: clamp(config.margin_bottom_mm, 0, 50),
    left: clamp(config.margin_left_mm, 0, 50),
    right: clamp(config.margin_right_mm, 0, 50),
  };
  // Floor of 20mm: margins wider than the paper would otherwise compute a
  // negative content width and collapse the layout entirely.
  const contentWidthMm = Math.max(20, widthMm - margins.left - margins.right);
  const isThermal = widthMm <= THERMAL_WIDTH_CEILING_MM;
  return {
    size: "custom",
    widthMm,
    heightMm,
    margins,
    contentWidthMm,
    isThermal,
    fontScale: isThermal ? thermalFontScale(contentWidthMm) : 1,
    logoPx: isThermal ? Math.round(contentWidthMm * 0.9) : 68,
  };
}

// 72mm of printable width (an 80mm roll) is the reference at which the thermal
// template's base sizes were chosen; narrower paper scales down from there,
// with a floor so text never becomes unreadable.
function thermalFontScale(contentWidthMm: number): number {
  return clamp(Number((contentWidthMm / 72).toFixed(3)), 0.78, 1.15);
}

function clamp(value: unknown, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export const PAPER_SIZE_LABELS: Record<PaperSize, string> = {
  thermal_58: "Thermal 58mm",
  thermal_80: "Thermal 80mm",
  a4: "A4",
  custom: "Custom",
};

export function parsePrintValue(raw: Setting["value"]): PrintConfig {
  if (raw && typeof raw === "object") return { ...DEFAULT_PRINT_CONFIG, ...(raw as Partial<PrintConfig>) };
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return { ...DEFAULT_PRINT_CONFIG, ...parsed };
    } catch {
      // ignore — fall through to default
    }
  }
  return DEFAULT_PRINT_CONFIG;
}

export function findPrintSetting(items: Setting[]): Setting | undefined {
  return items.find((s) => s.key === PRINT_SETTING_KEY);
}

export function getPrintConfig(items: Setting[]): PrintConfig {
  const setting = findPrintSetting(items);
  return setting ? parsePrintValue(setting.value) : DEFAULT_PRINT_CONFIG;
}

/** Convenience for call sites that only need the resolved profile. */
export function getPaperProfile(items: Setting[]): PaperProfile {
  return resolvePaperProfile(getPrintConfig(items));
}
