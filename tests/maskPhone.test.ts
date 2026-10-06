import { maskPhone } from "@/utils/maskPhone";

test.each([
  ["+91 9876543210", "+91 98******10"],
  ["9876543210", "+91 98******10"],
  ["+1 (415) 555-2671", "+1 41******71"],
  ["+44 7700 900123", "+44 77******23"],
  ["+91 98******10", "+91 98******10"],
  ["", "-"],
  ["-", "-"],
])("masks %s for display", (input, expected) => {
  expect(maskPhone(input)).toBe(expected);
});

test("preserves a supplied calling code", () => {
  expect(maskPhone("9876543210", "+91")).toBe("+91 98******10");
});

test("short numbers never reveal the complete original", () => {
  expect(maskPhone("123")).not.toContain("123");
});

test("does not mutate the original phone used in requests", () => {
  const client = { phone: "+919876543210" };
  expect(maskPhone(client.phone)).toBe("+91 98******10");
  expect(client.phone).toBe("+919876543210");
});
