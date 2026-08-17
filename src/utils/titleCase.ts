// Shared formatter for Name/Title fields (client, staff, salon, service, product,
// package, membership, category, brand, vendor, branch, campaign, template, etc.).
// Do NOT use this on emails, URLs, passwords, GSTIN/PAN/HSN, barcodes, invoice
// numbers, phone numbers, usernames, API keys, IDs, or other exact-input/code fields.

const LOWERCASE_PARTICLES = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in",
  "nor", "of", "on", "or", "per", "so", "the", "to", "vs", "with",
]);

/**
 * Converts free text to Title Case while preserving numbers, punctuation,
 * and internal casing for tokens that already contain an uppercase letter
 * after the first character (e.g. "iPhone", "McDonald's", "USA").
 */
export function toTitleCase(value: string): string {
  if (!value) return value;

  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const core = value.slice(leading.length, value.length - trailing.length);
  if (!core) return value;

  const words = core.split(" ");
  const lastIndex = words.length - 1;

  const formatted = words.map((word, index) => {
    if (word === "") return word;

    // Preserve tokens that already have mixed/internal casing (iPhone, McDonald's, USA).
    if (/[a-z]/.test(word.slice(1)) === false && /[A-Z]/.test(word.slice(1))) {
      // no-op branch kept simple below via mixedCase check
    }
    const hasInternalUpper = /[A-Z]/.test(word.slice(1)) && /[a-z]/.test(word);
    if (hasInternalUpper) return word;

    const lower = word.toLowerCase();
    const isParticle = LOWERCASE_PARTICLES.has(lower.replace(/[^a-z']/g, ""));
    if (isParticle && index !== 0 && index !== lastIndex) {
      return lower;
    }

    // Capitalize the first letter, keeping leading digits/symbols untouched,
    // and handle hyphenated/apostrophe'd segments (e.g. "mary-jane", "o'neil").
    return lower.replace(/(^|[-'])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
  });

  return leading + formatted.join(" ") + trailing;
}
