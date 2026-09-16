// Renders the downloadable/printable "poster" for the Digital Menu QR modal:
// salon name + tagline, a right-side category list, a gold-framed QR code
// with a small center logo badge, a dark pill "scan with your phone" button,
// a row of category icons, and a bottom black curved band with a closing
// line — composited onto a single canvas and exported as one PNG so it
// prints/shares as one branded image rather than a bare QR code.
//
//   ┌──────────────────────────────────────┐
//   │  [logo] SALON NAME          HAIR      │
//   │                              BEAUTY   │
//   │                              WELLNESS │
//   │                                       │
//   │        SCAN TO VIEW OUR              │
//   │          SERVICE MENU                │
//   │      explore · choose · enjoy         │
//   │                                       │
//   │         ┌──────────────┐              │
//   │         │  ┌────────┐  │              │
//   │         │  │  QR   [S] │              │
//   │         │  └────────┘  │              │
//   │         └──────────────┘              │
//   │                                       │
//   │      ( 📱  SCAN WITH YOUR PHONE )     │
//   │                                       │
//   │   ✂     🧴      🌿      🧴            │
//   │  HAIR  BEAUTY WELLNESS PRODUCTS        │
//   │                                       │
//   │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
//   │         SELF CARE STARTS HERE         │
//   └──────────────────────────────────────┘

const CARD_WIDTH = 900;
const CARD_HEIGHT = 1260;
const QR_SIZE = 360;

// ── Brand palette ────────────────────────────────────────────────────────────
const GOLD = "#b8935a";
const GOLD_DARK = "#9c7a45";
const INK = "#161513";
const MUTED = "#6b6863";
const PAPER = "#fbf9f6";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// A logo hosted on a different origin (or one that 404s) would otherwise
// throw at draw time and abort the whole poster — falling back to no logo
// keeps the rest of the card (which matters far more) generating regardless.
async function tryLoadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  try {
    return await loadImage(src);
  } catch {
    return null;
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws text with manual letter-spacing (canvas has no native property for it). */
function drawSpacedText(
  ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number,
) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((w, cw) => w + cw + spacing, -spacing);
  let x = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
}

type IconKind = "scissors" | "face" | "leaf" | "bottle";

/** Simple single-color line icons, drawn to fit inside a `size`×`size` box centered at (cx, cy). */
function drawIcon(ctx: CanvasRenderingContext2D, kind: IconKind, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const s = size / 2;

  switch (kind) {
    case "scissors": {
      // Two blade lines crossing from a shared pivot, with a ring "handle" at each end.
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.6, cy - s * 0.6);
      ctx.lineTo(cx + s * 0.5, cy + s * 0.5);
      ctx.moveTo(cx - s * 0.6, cy + s * 0.6);
      ctx.lineTo(cx + s * 0.5, cy - s * 0.5);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - s * 0.7, cy - s * 0.7, s * 0.16, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - s * 0.7, cy + s * 0.7, s * 0.16, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case "face": {
      // A face oval with two simple closed eyes — echoes a "facial/beauty treatment" glyph.
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * 0.55, s * 0.72, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.28, cy - s * 0.08); ctx.lineTo(cx - s * 0.08, cy - s * 0.08);
      ctx.moveTo(cx + s * 0.08, cy - s * 0.08); ctx.lineTo(cx + s * 0.28, cy - s * 0.08);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.28, s * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      break;
    }
    case "leaf": {
      ctx.beginPath();
      ctx.moveTo(cx, cy + s * 0.65);
      ctx.quadraticCurveTo(cx - s * 0.7, cy + s * 0.2, cx - s * 0.05, cy - s * 0.65);
      ctx.quadraticCurveTo(cx + s * 0.7, cy + s * 0.1, cx, cy + s * 0.65);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy + s * 0.55);
      ctx.lineTo(cx - s * 0.02, cy - s * 0.4);
      ctx.stroke();
      break;
    }
    case "bottle": {
      const neckW = s * 0.28, bodyW = s * 0.62, bodyTop = cy - s * 0.1, bodyH = s * 1.15;
      ctx.beginPath();
      ctx.rect(cx - neckW / 2, cy - s * 0.75, neckW, s * 0.3);
      ctx.stroke();
      drawRoundedRect(ctx, cx - bodyW / 2, bodyTop, bodyW, bodyH, s * 0.14);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - bodyW / 2 + 3, cy + s * 0.2);
      ctx.lineTo(cx + bodyW / 2 - 3, cy + s * 0.2);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

export interface QrPosterOptions {
  salonName: string;
  logoUrl?: string | null;
  qrDataUri: string;
  serviceCount?: number;
  categoryCount?: number;
}

/**
 * Draws the branded poster and returns it as a PNG data URI, ready to hand
 * to an <a download> link (or a print window's <img src>).
 */
export async function renderQrPoster(opts: QrPosterOptions): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const centerX = CARD_WIDTH / 2;
  const marginX = 72;

  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // ── Header: logo + salon name (left), category list (right) ─────────────
  let y = 100;
  const logoSize = 64;
  const logo = await tryLoadImage(opts.logoUrl ?? "");
  ctx.save();
  ctx.beginPath();
  ctx.arc(marginX + logoSize / 2, y, logoSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  if (logo) {
    ctx.clip();
    const srcSize = Math.min(logo.width, logo.height);
    ctx.drawImage(
      logo,
      (logo.width - srcSize) / 2, (logo.height - srcSize) / 2, srcSize, srcSize,
      marginX, y - logoSize / 2, logoSize, logoSize,
    );
  } else {
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = GOLD;
    ctx.font = "700 30px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((opts.salonName.trim()[0] || "S").toUpperCase(), marginX + logoSize / 2, y);
  }
  ctx.restore();

  ctx.fillStyle = INK;
  ctx.font = "700 34px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.salonName || "Our Salon", marginX + logoSize + 20, y);

  // Right-side category list — a short, generic set (the poster is generated
  // without a live category-name fetch; see DigitalMenuQrModal's Download
  // handler for why) separated from the header by a thin vertical rule.
  const categories = ["HAIR", "BEAUTY", "WELLNESS"];
  const ruleX = CARD_WIDTH - marginX - 150;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ruleX, y - 34);
  ctx.lineTo(ruleX, y + 34);
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = "700 15px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "left";
  categories.forEach((cat, i) => {
    drawSpacedTextLeft(ctx, cat, ruleX + 20, y - 20 + i * 22, 1.5);
  });

  y += 100;

  // ── Headline ──────────────────────────────────────────────────────────────
  ctx.fillStyle = INK;
  ctx.font = "600 30px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  drawSpacedText(ctx, "SCAN TO VIEW OUR", centerX, y, 3);
  y += 62;

  ctx.fillStyle = GOLD_DARK;
  ctx.font = "700 64px Georgia, 'Times New Roman', serif";
  ctx.fillText("SERVICE MENU", centerX, y);
  y += 44;

  ctx.fillStyle = MUTED;
  ctx.font = "600 16px 'Segoe UI', Arial, sans-serif";
  drawSpacedText(ctx, "EXPLORE  ·  CHOOSE  ·  ENJOY", centerX, y, 2);
  y += 56;

  // ── QR code, gold-framed, with a small center logo badge ────────────────
  const qrPad = 28;
  const frameSize = QR_SIZE + qrPad * 2;
  const frameX = centerX - frameSize / 2;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, frameX, y, frameSize, frameSize, 20);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  drawRoundedRect(ctx, frameX + 4, y + 4, frameSize - 8, frameSize - 8, 16);
  ctx.fill();

  const qrImg = await loadImage(opts.qrDataUri);
  const qrX = centerX - QR_SIZE / 2;
  const qrY = y + qrPad;
  ctx.drawImage(qrImg, qrX, qrY, QR_SIZE, QR_SIZE);

  // Center logo badge — sits on top of the QR. errorCorrectionLevel "M" (see
  // codes.ts) tolerates a small covered area like this without breaking scans.
  const badgeSize = 64;
  const badgeCx = centerX, badgeCy = qrY + QR_SIZE / 2;
  ctx.fillStyle = "#ffffff";
  drawRoundedRect(ctx, badgeCx - badgeSize / 2 - 4, badgeCy - badgeSize / 2 - 4, badgeSize + 8, badgeSize + 8, 14);
  ctx.fill();
  ctx.fillStyle = INK;
  drawRoundedRect(ctx, badgeCx - badgeSize / 2, badgeCy - badgeSize / 2, badgeSize, badgeSize, 12);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.font = "700 30px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((opts.salonName.trim()[0] || "S").toUpperCase(), badgeCx, badgeCy);
  ctx.textBaseline = "alphabetic";

  y += frameSize + 48;

  // ── "Scan with your phone" pill ──────────────────────────────────────────
  const pillLabel = "SCAN WITH YOUR PHONE";
  ctx.font = "700 16px 'Segoe UI', Arial, sans-serif";
  const pillPadX = 40, pillH = 56;
  const textW = [...pillLabel].reduce((w, ch) => w + ctx.measureText(ch).width + 2, -2);
  const pillW = textW + pillPadX * 2 + 44;
  const pillX = centerX - pillW / 2;
  ctx.fillStyle = INK;
  drawRoundedRect(ctx, pillX, y, pillW, pillH, pillH / 2);
  ctx.fill();

  // Simple phone glyph on the left of the pill.
  const phoneCx = pillX + pillPadX - 6, phoneCy = y + pillH / 2;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, phoneCx - 9, phoneCy - 14, 18, 28, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(phoneCx - 4, phoneCy + 8);
  ctx.lineTo(phoneCx + 4, phoneCy + 8);
  ctx.stroke();

  ctx.strokeStyle = "rgba(184,147,90,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(phoneCx + 16, y + 12);
  ctx.lineTo(phoneCx + 16, y + pillH - 12);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 15px 'Segoe UI', Arial, sans-serif";
  drawSpacedText(ctx, pillLabel, centerX + 18, y + pillH / 2 + 5, 1.5);

  y += pillH + 64;

  // ── Category icon row ────────────────────────────────────────────────────
  const icons: { kind: IconKind; label: string }[] = [
    { kind: "scissors", label: "HAIR\nSERVICES" },
    { kind: "face", label: "BEAUTY\nTREATMENTS" },
    { kind: "leaf", label: "WELLNESS\nSERVICES" },
    { kind: "bottle", label: "PRODUCT\nRANGE" },
  ];
  const iconCircleR = 44;
  const slotW = (CARD_WIDTH - marginX * 2) / icons.length;
  icons.forEach((item, i) => {
    const cx = marginX + slotW * i + slotW / 2;
    ctx.fillStyle = "#f1e7d8";
    ctx.beginPath();
    ctx.arc(cx, y, iconCircleR, 0, Math.PI * 2);
    ctx.fill();
    drawIcon(ctx, item.kind, cx, y, iconCircleR * 1.1, INK);

    ctx.fillStyle = INK;
    ctx.font = "700 13px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    const lines = item.label.split("\n");
    lines.forEach((line, li) => {
      ctx.fillText(line, cx, y + iconCircleR + 26 + li * 17);
    });

    if (i < icons.length - 1) {
      const dividerX = marginX + slotW * (i + 1);
      ctx.strokeStyle = "#d8ccb4";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dividerX, y - 24);
      ctx.lineTo(dividerX, y + 24);
      ctx.stroke();
    }
  });

  y += iconCircleR + 70;

  // ── Services/categories summary (real data, replaces the mockup's
  //    illustrative category names above with an actual count) ────────────
  const parts: string[] = [];
  if (opts.serviceCount) parts.push(`${opts.serviceCount} Service${opts.serviceCount === 1 ? "" : "s"}`);
  if (opts.categoryCount) parts.push(`${opts.categoryCount} Categor${opts.categoryCount === 1 ? "y" : "ies"}`);
  if (parts.length) {
    ctx.fillStyle = MUTED;
    ctx.font = "500 14px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(parts.join("  •  "), centerX, y);
    y += 30;
  }

  // ── Bottom black curved band ─────────────────────────────────────────────
  const bandH = 90;
  const bandY = CARD_HEIGHT - bandH;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(0, bandY + 40);
  ctx.quadraticCurveTo(centerX, bandY - 30, CARD_WIDTH, bandY + 40);
  ctx.lineTo(CARD_WIDTH, CARD_HEIGHT);
  ctx.lineTo(0, CARD_HEIGHT);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = GOLD;
  ctx.font = "600 15px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  drawSpacedText(ctx, "SELF CARE STARTS HERE", centerX, CARD_HEIGHT - 34, 2.5);

  return canvas.toDataURL("image/png");
}

/** Left-aligned variant of drawSpacedText, for the right-column category list. */
function drawSpacedTextLeft(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number,
) {
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  let cx = x;
  [...text].forEach((ch) => {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  });
  ctx.textAlign = prevAlign;
}
