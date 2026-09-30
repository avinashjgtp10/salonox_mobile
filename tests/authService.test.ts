import { api } from "@/services/api";
import { authService } from "@/services/authService";
import { tokenStorage } from "@/services/tokenStorage";

jest.mock("expo-linking", () => ({}));
jest.mock("expo-web-browser", () => ({}));
jest.mock("@/services/api", () => ({ api: { post: jest.fn(), delete: jest.fn() } }));
jest.mock("@/services/tokenStorage", () => ({ tokenStorage: {
  clearSession: jest.fn(), getRefreshToken: jest.fn(),
} }));

test.each(["logout", "logoutAll"] as const)(
  "a delayed %s response cannot erase a newly established local session", async (method) => {
    let finish!: (value: unknown) => void;
    jest.mocked(api.post).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = authService[method]({ accessToken: "old-access", refreshToken: "old-refresh" });
    // The caller has cleared the old session and may now persist a new login.
    await Promise.resolve();
    finish({ data: {} });
    await pending;
    expect(tokenStorage.clearSession).not.toHaveBeenCalled();
  },
);

test("failed account deletion preserves the local session", async () => {
  jest.mocked(api.delete).mockRejectedValueOnce(new Error("Server unavailable"));
  await expect(authService.deleteAccount()).rejects.toThrow("Server unavailable");
  expect(tokenStorage.clearSession).not.toHaveBeenCalled();
});
