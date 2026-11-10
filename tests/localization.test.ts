import { getRegionalPreferences, setRegionalPreferences } from "@/localization/preferences";
import { translateUiText } from "@/localization/translate";
import { LANGUAGES, normalizeLanguage } from "@/config/languages";
import { formatCurrency, formatCurrencyRounded, currencyLabel } from "@/utils/currency";
import { salonService } from "@/services/salon.service";
import { api } from "@/services/api";
jest.mock("@/services/api", () => ({ api: { get: jest.fn() } }));

afterEach(() => setRegionalPreferences({ salonId: null }));

it("uses the webapp's language list and dictionaries with an English fallback", () => {
  expect(LANGUAGES.map(item => item.code)).toEqual(["en", "hi", "ar", "zh", "ko", "ja", "th", "id", "vi", "ms"]);
  expect(normalizeLanguage("ar-AE")).toBe("ar");
  expect(normalizeLanguage("unknown")).toBe("en");
  for (const language of LANGUAGES.filter(item => item.code !== "en")) {
    expect(translateUiText("Save", language.code)).not.toBe("Save");
  }
  expect(translateUiText("An untranslated mobile phrase", "hi")).toBe("An untranslated mobile phrase");
});

it("formats the same amount with the salon's saved currency, without conversion", () => {
  setRegionalPreferences({ salonId: "india", currency: "INR", language: "en" });
  expect(formatCurrency(123456.5)).toBe("₹1,23,456.50");
  setRegionalPreferences({ salonId: "uae", currency: "AED", language: "ar" });
  expect(formatCurrency(123456.5)).toBe("AED 123,456.50");
  expect(formatCurrencyRounded(1234.7)).toBe("AED 1,235");
  expect(currencyLabel("Price (₹)")).toBe("Price (AED)");
  expect(currencyLabel("₹200")).toBe("AED 200");
});

it("resets regional preferences when changing salons or signing out", () => {
  setRegionalPreferences({ salonId: "a", currency: "USD", language: "hi" });
  setRegionalPreferences({ salonId: "b" });
  expect(getRegionalPreferences()).toEqual({ salonId: "b", currency: "INR", language: "en" });
  setRegionalPreferences({ salonId: null });
  expect(getRegionalPreferences().salonId).toBeNull();
});

it("refreshes web changes through the same salon endpoint instead of returning its permanent cache", async () => {
  salonService.clearSalonMeCache();
  jest.mocked(api.get).mockResolvedValueOnce({ data: { data: { id: "salon-a", name: "Salon", currency: "INR", language: "en" } } });
  expect((await salonService.getSalonMe()).currency).toBe("INR");
  jest.mocked(api.get).mockResolvedValueOnce({ data: { data: { id: "salon-a", name: "Salon", currency: "AED", language: "ar" } } });
  expect((await salonService.getSalonMe()).currency).toBe("INR");
  const refreshed = await salonService.getSalonMe({ refresh: true });
  expect(refreshed).toMatchObject({ id: "salon-a", currency: "AED", language: "ar" });
  expect(api.get).toHaveBeenLastCalledWith("/salons/current");
  salonService.clearSalonMeCache();
});
