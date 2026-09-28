import { shouldInvalidateSession, shouldRefreshToken } from "@/services/authSession";

test.each([undefined, 403, 500, 503])("a temporary/permission failure (%s) preserves the session", (status) => {
  expect(shouldInvalidateSession({ status, message: "Request failed" })).toBe(false);
});
test("unauthorized credentials invalidate the session", () => {
  expect(shouldInvalidateSession({ status: 401 })).toBe(true);
});
test("an expired refresh token returned as a 400 invalidates the session", () => {
  const error = Object.assign(new Error("Refresh token expired"), { status: 400 });
  expect(shouldInvalidateSession(error)).toBe(true);
});
test("tokens refresh within the expiry buffer, not on every request", () => {
  jest.spyOn(Date, "now").mockReturnValue(1_000_000);
  const token = (exp: number) => `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`;
  try {
    expect(shouldRefreshToken(token(1059))).toBe(true);
    expect(shouldRefreshToken(token(1061))).toBe(false);
    expect(shouldRefreshToken("malformed-token")).toBe(false);
  } finally {
    jest.restoreAllMocks();
  }
});
