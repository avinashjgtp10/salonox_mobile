import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import local JSON translation dictionaries
import enTranslation from "./locales/en/translation.json";
import esTranslation from "./locales/es/translation.json";

const resources = {
  en: { translation: enTranslation },
  es: { translation: esTranslation },
};

i18n
  // Detects the user's browser language and persists their choice in localStorage
  .use(LanguageDetector)
  // Passes the i18n instance along to react-i18next
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en", // Default to English if language is unknown

    interpolation: {
      escapeValue: false, // React already escapes values, preventing XSS
    },
  });

export default i18n;
