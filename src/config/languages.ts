// ═══════════════════════════════════════════════════════════════════════════════
// The languages SalonOX can speak — the single list the switcher, the settings page and the date formatting read.
//
// Adding a language:
//   1. add it here;
//   2. add src/locales/<code>/translation.json (copy en/translation.json and translate the values);
//   3. add its loader to LOADERS in src/i18n.ts;
//   4. add it to the backend list: salon_mgm_backend/src/config/language.ts.
// src/locales/locales.test.ts fails when a dictionary is missing keys English has, so a language cannot silently
// drift. Anything untranslated falls back to English — a gap never shows a blank or a raw key.
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_LANGUAGE = "en";

export interface LanguageDef {
  code: string;
  /** Name in its own script — what the picker shows. */
  nativeName: string;
  /** Writing direction. Right-to-left languages need the page mirrored. */
  dir: "ltr" | "rtl";
  /** Locale for dates and clock times when this language is shown (month names in the language). Omitted = the currency's. */
  dateLocale?: string;
}

export const LANGUAGES: LanguageDef[] = [
  { code: "en", nativeName: "English", dir: "ltr" },
  { code: "hi", nativeName: "हिन्दी", dir: "ltr", dateLocale: "hi-IN" },
  { code: "ar", nativeName: "العربية", dir: "rtl", dateLocale: "ar-AE" },
  { code: "zh", nativeName: "简体中文", dir: "ltr", dateLocale: "zh-CN" },
  { code: "ko", nativeName: "한국어", dir: "ltr", dateLocale: "ko-KR" },
  { code: "ja", nativeName: "日本語", dir: "ltr", dateLocale: "ja-JP" },
  { code: "th", nativeName: "ไทย", dir: "ltr", dateLocale: "th-TH-u-ca-gregory" },
  { code: "id", nativeName: "Bahasa Indonesia", dir: "ltr", dateLocale: "id-ID" },
  { code: "vi", nativeName: "Tiếng Việt", dir: "ltr", dateLocale: "vi-VN" },
  { code: "ms", nativeName: "Bahasa Melayu", dir: "ltr", dateLocale: "ms-MY" },
];

/** A supported language code, or the default for anything else (blank, unknown, a regional tag like "ar-AE"). */
export function normalizeLanguage(code: string | null | undefined): string {
  const base = String(code ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return LANGUAGES.some((l) => l.code === base) ? base : DEFAULT_LANGUAGE;
}

export function getLanguageDef(code: string | null | undefined): LanguageDef {
  const c = normalizeLanguage(code);
  return LANGUAGES.find((l) => l.code === c)!;
}

export function languageDir(code: string | null | undefined): "ltr" | "rtl" {
  return getLanguageDef(code).dir;
}

/**
 * Kill switch for mirroring the signed-in app. true = a right-to-left language flips the whole screen (<html dir="rtl">
 * plus the generated [dir="rtl"] stylesheet rules and the data grid). false = the app stays left-to-right in every
 * language (text is still translated). Receipts, the legal pages and the public booking page follow languageDir()
 * on their own and are not affected by this.
 */
export const MIRROR_RTL = true;

export type ScreenDirection = "ltr" | "rtl";

// A person's own choice of layout direction for a right-to-left language (the small RTL / LTR button beside the language picker, see
// utils/direction.ts). null = no choice made: follow the language. It never applies to a left-to-right language.
let directionChoice: ScreenDirection | null = null;
export const setDirectionChoice = (d: ScreenDirection | null): void => { directionChoice = d; };

/** The direction the app SCREEN uses for a language: languageDir(), unless mirroring is switched off above or the person chose otherwise. */
export function screenDir(code: string | null | undefined): ScreenDirection {
  if (!MIRROR_RTL || languageDir(code) !== "rtl") return "ltr";
  return directionChoice ?? "rtl";
}
