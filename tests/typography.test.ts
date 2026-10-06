import { AppFonts, fontForWeight, resolveFontStyle } from "@/theme/typography";

test("text weights use the matching bundled font files", () => {
  expect(fontForWeight()).toBe(AppFonts.regular);
  expect(fontForWeight("500")).toBe(AppFonts.medium);
  expect(fontForWeight("600")).toBe(AppFonts.semibold);
  expect(fontForWeight("bold")).toBe(AppFonts.bold);
  expect(fontForWeight("800")).toBe(AppFonts.extrabold);
  expect(fontForWeight("900")).toBe(AppFonts.black);
});

test("legacy serif headings become Manrope with their original emphasis", () => {
  expect(resolveFontStyle({ fontFamily: "serif", fontWeight: "800" })).toEqual({
    fontFamily: AppFonts.extrabold,
    fontWeight: "normal",
  });
});

test("icons and monospace text preserve their glyph families", () => {
  expect(resolveFontStyle({ fontFamily: "Ionicons" })).toEqual({});
  expect(resolveFontStyle({ fontFamily: "monospace" })).toEqual({});
});

test("italic copy retains the selected app family", () => {
  expect(resolveFontStyle({ fontStyle: "italic" })).toEqual({
    fontFamily: AppFonts.regular,
    fontWeight: "normal",
  });
});
