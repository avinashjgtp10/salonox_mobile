import hi from "./locales/hi.json";
import ar from "./locales/ar.json";
import zh from "./locales/zh.json";
import ko from "./locales/ko.json";
import ja from "./locales/ja.json";
import th from "./locales/th.json";
import id from "./locales/id.json";
import vi from "./locales/vi.json";
import ms from "./locales/ms.json";
import { getRegionalPreferences } from "./preferences";

const dictionaries: Record<string, Record<string, string>> = { hi, ar, zh, ko, ja, th, id, vi, ms };
const key = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const indexes = new Map<string, Record<string, string>>();
/** Uses the webapp's translations, with unchanged English for missing mobile phrases. Never use for client data. */
export function translateUiText(value: string, language = getRegionalPreferences().language): string {
  const dictionary = dictionaries[language];
  if (!dictionary || !value.trim()) return value;
  const trimmed = value.trim();
  const exact = dictionary[trimmed];
  if (exact) return value.replace(trimmed, exact);
  let index = indexes.get(language);
  if (!index) {
    index = {};
    for (const [english, translated] of Object.entries(dictionary)) index[key(english)] ??= translated;
    indexes.set(language, index);
  }
  const translated = index[key(trimmed)];
  if (!translated) return value;
  const tail = /[\s:：—–…?!.%*]+$/.exec(trimmed)?.[0] ?? "";
  return value.replace(trimmed, translated.replace(/[\s:：—–…?!.%*]+$/, "") + tail);
}
