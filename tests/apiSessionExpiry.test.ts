import { api, ApiError } from "@/services/api";
import { tokenStorage } from "@/services/tokenStorage";
import { addSessionInvalidationListener } from "@/services/sessionInvalidation";
import { beginUserLogout, finishUserLogin } from "@/services/authLifecycle";

jest.mock("@/config/environment", () => ({ environmentConfig: { apiBaseUrl: "http://localhost/api/v1" } }));
jest.mock("@/services/tokenStorage", () => ({ tokenStorage: {
  getAccessToken: jest.fn().mockResolvedValue(null),
  getRefreshToken: jest.fn().mockResolvedValue(null),
  clearSession: jest.fn().mockResolvedValue(undefined),
} }));
jest.mock("@/services/networkStatus", () => ({
  isNetworkOnline: () => true, waitForNetworkOnline: jest.fn().mockResolvedValue(undefined),
}));

test("missing refresh credentials notify the app and retain the unauthorized status", async () => {
  const invalidated = jest.fn();
  const unsubscribe = addSessionInvalidationListener(invalidated);
  try {
    await expect(api.get("/dashboard/all", { adapter: async (config) => {
      throw Object.assign(new Error("Unauthorized"), {
        isAxiosError: true, config, response: { status: 401, data: {} },
      });
    } })).rejects.toMatchObject({ status: 401, message: "Your session has expired." });
    expect(tokenStorage.clearSession).toHaveBeenCalled();
    expect(invalidated).toHaveBeenCalledWith("missing_refresh_token");
  } finally { unsubscribe(); }
});

test("an already normalized API error retains its status and response data", async () => {
  const failure = new ApiError("Forbidden", 403, undefined, { reason: "permission" });
  await expect(api.get("/dashboard/all", { adapter: async () => { throw failure; } })).rejects.toBe(failure);
});

test("a failed refresh does not keep a rejected promise for subsequent sessions", async () => {
  const storageFailure = new Error("storage temporarily unavailable");
  jest.mocked(tokenStorage.getRefreshToken).mockRejectedValueOnce(storageFailure);
  const request = () => api.get("/dashboard/all", { adapter: async (config) => {
    throw Object.assign(new Error("Unauthorized"), {
      isAxiosError: true, config, response: { status: 401, data: {} },
    });
  } });
  await expect(request()).rejects.toThrow("storage temporarily unavailable");
  await expect(request()).rejects.toMatchObject({ status: 401, message: "Your session has expired." });
  expect(tokenStorage.getRefreshToken).toHaveBeenCalledTimes(2);
});

test.each(["/auth/register", "/auth/send-email-otp", "/auth/verify-email-otp"])(
  "%s remains accessible after logout without reading session tokens", async (url) => {
    beginUserLogout();
    try {
      await expect(api.post(url, {}, { adapter: async (config) => ({
        config, status: 200, statusText: "OK", headers: {}, data: { success: true },
      }) })).resolves.toMatchObject({ status: 200 });
      expect(tokenStorage.getAccessToken).not.toHaveBeenCalled();
    } finally { finishUserLogin(); }
  },
);
