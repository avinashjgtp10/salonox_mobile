// Shared formatter for Name/Title fields, ported verbatim in behaviour from the
// web app's src/utils/titleCase.ts so both clients store a typed name the same
// way. Do NOT use it on emails, URLs, passwords, GSTIN/PAN/HSN, barcodes,
// invoice numbers, phone numbers, usernames, API keys, IDs, or other
// exact-input/code fields.

const LOWERCASE_PARTICLES = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in",
  "nor", "of", "on", "or", "per", "so", "the", "to", "vs", "with",
]);

/**
 * Converts free text to Title Case while preserving numbers, punctuation, and
 * internal casing for tokens that already contain an uppercase letter after the
 * first character (e.g. "iPhone", "McDonald's", "USA").
 */
export const toTitleCase = (value: string): string => {
  if (!value) return value;

  const leading = /^\s*/.exec(value)?.[0] ?? "";
  const trailing = /\s*$/.exec(value)?.[0] ?? "";
  const core = value.slice(leading.length, value.length - trailing.length);
  if (!core) return value;

  const words = core.split(" ");
  const lastIndex = words.length - 1;

  const formatted = words.map((word, index) => {
    if (word === "") return word;

    // Preserve tokens with mixed/internal casing (iPhone, McDonald's).
    const hasInternalUpper = /[A-Z]/.test(word.slice(1)) && /[a-z]/.test(word);
    if (hasInternalUpper) return word;

    const lower = word.toLowerCase();
    const isParticle = LOWERCASE_PARTICLES.has(lower.replace(/[^a-z']/g, ""));
    if (isParticle && index !== 0 && index !== lastIndex) return lower;

    // Capitalize the first letter, leaving leading digits/symbols untouched, and
    // handle hyphenated / apostrophe'd segments ("mary-jane", "o'neil").
    return lower.replace(/(^|[-'])([a-z])/g, (_match, separator: string, character: string) =>
      separator + character.toUpperCase());
  });

  return leading + formatted.join(" ") + trailing;
};
