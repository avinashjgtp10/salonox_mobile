/**
 * Procedural SVG ornaments, returned as data URIs.
 *
 * These plug into the EXISTING element types — an ornament is just an `image`
 * element whose src is a data URI, and a pattern is a `shape` with an image
 * fill. No new element type, no schema change, and the server renderer needs
 * no extra code because a data URI needs no network.
 *
 * Everything is drawn from maths rather than shipped as art, which is the only
 * way to get festival decoration without sourcing and licensing an asset pack.
 * The trade: geometric and symmetrical (mandalas, snowflakes, stripes) is
 * excellent; illustrated or photographic is out of reach.
 */

const toDataUri = (svg: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;

/**
 * Radially symmetric mandala — the motif on the Diwali references.
 *
 * Built from concentric rings of petals rotated around the centre. Petal count
 * rises with radius so the density stays even instead of the outer rings
 * looking sparse.
 */
export function mandala(opts: { color?: string; rings?: number; size?: number; stroke?: number } = {}): string {
  const { color = "#c9a227", rings = 5, size = 400, stroke = 1.4 } = opts;
  const c = size / 2;
  const parts: string[] = [];

  for (let ring = 1; ring <= rings; ring++) {
    const r = (c * 0.9 * ring) / rings;
    const petals = 6 + ring * 6;
    const petalR = (c * 0.9) / rings / 1.6;

    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      const px = c + Math.cos(a) * r;
      const py = c + Math.sin(a) * r;
      const deg = (a * 180) / Math.PI + 90;
      // Teardrop petal: a circle plus a tapering triangle pointing outward.
      parts.push(
        `<g transform="translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${deg.toFixed(1)})">` +
        `<ellipse cx="0" cy="0" rx="${(petalR * 0.55).toFixed(1)}" ry="${petalR.toFixed(1)}" ` +
        `fill="none" stroke="${color}" stroke-width="${stroke}"/>` +
        `<circle cx="0" cy="0" r="${(petalR * 0.18).toFixed(1)}" fill="${color}" opacity="0.55"/>` +
        `</g>`,
      );
    }
    parts.push(`<circle cx="${c}" cy="${c}" r="${r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${(stroke * 0.6).toFixed(2)}" opacity="0.5"/>`);
  }

  parts.push(`<circle cx="${c}" cy="${c}" r="${(c * 0.08).toFixed(1)}" fill="${color}"/>`);

  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${parts.join("")}</svg>`,
  );
}

/** Six-fold snowflake, for winter/Christmas designs. */
export function snowflake(color = "#ffffff", size = 200): string {
  const c = size / 2;
  const arms: string[] = [];
  for (let i = 0; i < 6; i++) {
    const deg = i * 60;
    arms.push(
      `<g transform="translate(${c} ${c}) rotate(${deg})">` +
      `<line x1="0" y1="0" x2="0" y2="${-c * 0.85}" stroke="${color}" stroke-width="${size * 0.02}" stroke-linecap="round"/>` +
      `<line x1="0" y1="${-c * 0.45}" x2="${-c * 0.22}" y2="${-c * 0.62}" stroke="${color}" stroke-width="${size * 0.016}" stroke-linecap="round"/>` +
      `<line x1="0" y1="${-c * 0.45}" x2="${c * 0.22}" y2="${-c * 0.62}" stroke="${color}" stroke-width="${size * 0.016}" stroke-linecap="round"/>` +
      `<line x1="0" y1="${-c * 0.68}" x2="${-c * 0.15}" y2="${-c * 0.8}" stroke="${color}" stroke-width="${size * 0.013}" stroke-linecap="round"/>` +
      `<line x1="0" y1="${-c * 0.68}" x2="${c * 0.15}" y2="${-c * 0.8}" stroke="${color}" stroke-width="${size * 0.013}" stroke-linecap="round"/>` +
      `</g>`,
    );
  }
  return toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${arms.join("")}</svg>`);
}

/** Faint repeating motif for a background — the subtle texture behind the
 *  Diwali references. Tiles via background-repeat. */
export function damaskPattern(color = "#ffffff", opacity = 0.06, tile = 40): string {
  const c = tile / 2;
  const petals = Array.from({ length: 4 }, (_, i) =>
    `<ellipse cx="${c}" cy="${c}" rx="${tile * 0.12}" ry="${tile * 0.3}" fill="${color}" ` +
    `transform="rotate(${i * 45} ${c} ${c})"/>`).join("");
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tile} ${tile}" width="${tile}" height="${tile}">` +
    `<g opacity="${opacity}">${petals}</g></svg>`,
  );
}

/** Candy-cane stripes — the border on the Christmas voucher reference. */
export function candyStripes(a = "#b3202c", b = "#f7f2e7", gold = "#c9a227", w = 48): string {
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${w}" width="${w}" height="${w}">` +
    `<rect width="${w}" height="${w}" fill="${b}"/>` +
    `<g transform="rotate(45 ${w / 2} ${w / 2})">` +
    `<rect x="0" y="0" width="${w * 0.3}" height="${w * 2}" y2="0" fill="${a}"/>` +
    `<rect x="${w * 0.5}" y="0" width="${w * 0.12}" height="${w * 2}" fill="${gold}"/>` +
    `</g></svg>`,
  );
}

/** Simple decorative corner flourish. */
export function cornerFlourish(color = "#c9a227", size = 120): string {
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    `<path d="M4 ${size - 4} L4 ${size * 0.45} Q4 4 ${size * 0.45} 4 L${size - 4} 4" ` +
    `fill="none" stroke="${color}" stroke-width="2"/>` +
    `<path d="M14 ${size - 4} L14 ${size * 0.48} Q14 14 ${size * 0.48} 14 L${size - 4} 14" ` +
    `fill="none" stroke="${color}" stroke-width="1" opacity="0.7"/>` +
    `<circle cx="${size * 0.48}" cy="14" r="3" fill="${color}"/>` +
    `<circle cx="14" cy="${size * 0.48}" r="3" fill="${color}"/>` +
    `</svg>`,
  );
}

/** Diwali oil lamp. Flame is two stacked teardrops so it reads at thumbnail size. */
export function diya(color = "#c9a227", flame = "#f59e0b", size = 200): string {
  const c = size / 2;
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    // Bowl: a half-ellipse with a pinched lip on the left where the wick sits.
    `<path d="M${c * 0.35} ${c * 1.12} Q${c} ${c * 1.85} ${c * 1.65} ${c * 1.12} Z" fill="${color}"/>` +
    `<ellipse cx="${c}" cy="${c * 1.12}" rx="${c * 0.65}" ry="${c * 0.14}" fill="${color}" opacity="0.75"/>` +
    `<path d="M${c * 0.35} ${c * 1.12} q${-c * 0.16} ${-c * 0.05} ${-c * 0.02} ${-c * 0.14}" fill="none" stroke="${color}" stroke-width="${size * 0.02}" stroke-linecap="round"/>` +
    // Flame
    `<path d="M${c * 0.33} ${c * 0.98} q${c * 0.02} ${-c * 0.34} ${c * 0.2} ${-c * 0.46} q${-c * 0.04} ${c * 0.3} ${-c * 0.06} ${c * 0.46} Z" fill="${flame}"/>` +
    `<path d="M${c * 0.36} ${c * 0.98} q${c * 0.01} ${-c * 0.2} ${c * 0.12} ${-c * 0.28} q${-c * 0.02} ${c * 0.18} ${-c * 0.04} ${c * 0.28} Z" fill="#fde68a"/>` +
    // Glow
    `<circle cx="${c * 0.43}" cy="${c * 0.78}" r="${c * 0.34}" fill="${flame}" opacity="0.12"/>` +
    `</svg>`,
  );
}

/** Crescent and star, for Eid designs. The crescent is a circle with a second circle punched out. */
export function crescentStar(color = "#c9a227", size = 200): string {
  const c = size / 2;
  const star = (cx: number, cy: number, r: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 === 0 ? r : r * 0.4;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(" ")}" fill="${color}"/>`;
  };
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    `<defs><mask id="m"><rect width="${size}" height="${size}" fill="#fff"/>` +
    `<circle cx="${c * 1.28}" cy="${c * 0.86}" r="${c * 0.62}" fill="#000"/></mask></defs>` +
    `<circle cx="${c * 0.98}" cy="${c}" r="${c * 0.72}" fill="${color}" mask="url(#m)"/>` +
    star(c * 1.52, c * 0.62, c * 0.2) +
    `</svg>`,
  );
}

/** Sunburst rays — the classic backdrop for a big SALE number. */
export function starburst(color = "#c9a227", rays = 24, size = 300): string {
  const c = size / 2;
  const wedges: string[] = [];
  for (let i = 0; i < rays; i += 2) {
    const a0 = (i / rays) * 360;
    const a1 = ((i + 1) / rays) * 360;
    const p = (deg: number) => {
      const r = (deg * Math.PI) / 180;
      return `${(c + Math.cos(r) * c).toFixed(1)} ${(c + Math.sin(r) * c).toFixed(1)}`;
    };
    wedges.push(`<path d="M${c} ${c} L${p(a0)} L${p(a1)} Z" fill="${color}"/>`);
  }
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${wedges.join("")}</svg>`,
  );
}

/** Four-point sparkle. Concave sides are what separate a sparkle from a plus sign. */
export function sparkle(color = "#c9a227", size = 120): string {
  const c = size / 2, r = c * 0.92, w = c * 0.16;
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    `<path d="M${c} ${c - r} Q${c + w} ${c - w} ${c + r} ${c} Q${c + w} ${c + w} ${c} ${c + r} ` +
    `Q${c - w} ${c + w} ${c - r} ${c} Q${c - w} ${c - w} ${c} ${c - r} Z" fill="${color}"/>` +
    `</svg>`,
  );
}

/** Laurel wreath — a neutral "award / premium" frame. */
export function laurel(color = "#c9a227", size = 220): string {
  const c = size / 2;
  const side = (dir: 1 | -1) => {
    const leaves: string[] = [];
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const a = (-70 + t * 140) * (Math.PI / 180);
      const x = c + Math.cos(a) * c * 0.72 * dir;
      const y = c + Math.sin(a) * c * 0.78;
      const deg = (a * 180) / Math.PI + (dir === 1 ? 90 : -90);
      leaves.push(
        `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(c * 0.055).toFixed(1)}" ry="${(c * 0.14).toFixed(1)}" ` +
        `fill="${color}" opacity="0.9" transform="rotate(${deg.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`,
      );
    }
    return leaves.join("");
  };
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    side(1) + side(-1) + `</svg>`,
  );
}

/** Scattered confetti. Deterministic (seeded) so a design re-renders identically. */
export function confetti(colors: string[] = ["#f43f5e", "#f59e0b", "#22c55e", "#3b82f6"], count = 26, size = 300): string {
  // A design doc must render the same every time — Math.random() would give a
  // different scatter on every export and the saved artwork would drift.
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const bits: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = rnd() * size, y = rnd() * size;
    const w = size * (0.018 + rnd() * 0.022), h = w * (0.5 + rnd());
    bits.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(w * 0.3).toFixed(1)}" ` +
      `fill="${colors[i % colors.length]}" transform="rotate(${(rnd() * 360).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`,
    );
  }
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${bits.join("")}</svg>`,
  );
}

/** Tiny repeating dot grid — a quieter texture than damask. */
export function dotGrid(color = "#000000", opacity = 0.08, tile = 16): string {
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tile} ${tile}" width="${tile}" height="${tile}">` +
    `<circle cx="${tile / 2}" cy="${tile / 2}" r="${tile * 0.09}" fill="${color}" opacity="${opacity}"/></svg>`,
  );
}

/** Repeating chevrons — a modern, non-festival texture. */
export function chevronPattern(color = "#000000", opacity = 0.07, tile = 24): string {
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tile} ${tile}" width="${tile}" height="${tile}">` +
    `<path d="M0 ${tile * 0.66} L${tile / 2} ${tile * 0.33} L${tile} ${tile * 0.66}" fill="none" ` +
    `stroke="${color}" stroke-width="${tile * 0.09}" opacity="${opacity}"/></svg>`,
  );
}

/** Soft botanical sprig, for spa / wellness designs. */
export function botanical(color = "#4d7c5f", size = 200): string {
  const c = size / 2;
  const leaves: string[] = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const y = size * 0.9 - t * size * 0.72;
    const len = size * (0.22 - t * 0.1);
    for (const dir of [-1, 1]) {
      leaves.push(
        `<ellipse cx="${(c + dir * len * 0.6).toFixed(1)}" cy="${y.toFixed(1)}" rx="${(len * 0.55).toFixed(1)}" ry="${(len * 0.2).toFixed(1)}" ` +
        `fill="${color}" opacity="0.85" transform="rotate(${dir * -25} ${(c + dir * len * 0.6).toFixed(1)} ${y.toFixed(1)})"/>`,
      );
    }
  }
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    `<path d="M${c} ${size * 0.95} L${c} ${size * 0.14}" stroke="${color}" stroke-width="${size * 0.012}" fill="none"/>` +
    leaves.join("") + `</svg>`,
  );
}

export const ORNAMENTS = [
  { id: "mandala-gold",  label: "Mandala (gold)",  src: () => mandala({ color: "#c9a227" }) },
  { id: "mandala-pink",  label: "Mandala (pink)",  src: () => mandala({ color: "#ec4899" }) },
  { id: "snowflake",     label: "Snowflake",       src: () => snowflake("#ffffff") },
  { id: "flourish",      label: "Corner flourish", src: () => cornerFlourish("#c9a227") },
  { id: "diya",          label: "Diya",            src: () => diya() },
  { id: "crescent",      label: "Crescent & star", src: () => crescentStar() },
  { id: "starburst",     label: "Starburst",       src: () => starburst() },
  { id: "sparkle",       label: "Sparkle",         src: () => sparkle() },
  { id: "laurel",        label: "Laurel wreath",   src: () => laurel() },
  { id: "confetti",      label: "Confetti",        src: () => confetti() },
  { id: "botanical",     label: "Botanical",       src: () => botanical() },
] as const;
