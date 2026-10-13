export interface PaperProfile {
  widthMm: number;
  heightMm: number;
  margins: { top: number; bottom: number; left: number; right: number };
  contentWidthMm: number;
  isThermal: boolean;
  fontScale: number;
  logoPx: number;
}

export function receiptPaper(size: "A4" | "80mm" | "58mm" = "A4"): PaperProfile {
  const widthMm = size === "A4" ? 210 : size === "58mm" ? 58 : 80;
  const margin = size === "A4" ? 0 : size === "58mm" ? 3 : 4;
  const contentWidthMm = widthMm - margin * 2;
  return {
    widthMm, heightMm: size === "A4" ? 297 : 0,
    margins: { top: margin, bottom: margin, left: margin, right: margin },
    contentWidthMm, isThermal: size !== "A4",
    fontScale: size === "A4" ? 1 : Math.min(1.15, Math.max(0.78, Number((contentWidthMm / 72).toFixed(3)))),
    logoPx: size === "A4" ? 68 : Math.round(contentWidthMm * 0.9),
  };
}
