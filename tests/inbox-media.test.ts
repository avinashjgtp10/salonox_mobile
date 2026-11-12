import { api } from "@/services/api";
import { loadInboxImage } from "@/features/inbox/inboxMedia";

jest.mock("@/services/api", () => ({ api: { get: jest.fn() }, getFreshAccessToken: jest.fn() }));
jest.mock("expo-file-system/legacy", () => ({}));
jest.mock("expo-sharing", () => ({}));

describe("inbox image loading", () => {
  const originalReader = global.FileReader;
  beforeEach(() => {
    global.FileReader = class {
      result = "data:image/png;base64,aW1hZ2U=";
      onload?: () => void;
      readAsDataURL() { this.onload?.(); }
    } as unknown as typeof FileReader;
  });
  afterEach(() => { global.FileReader = originalReader; });

  it("loads protected image bytes with the authenticated API client", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: {} });
    const source = { uri: "https://example.test/api/v1/inbox/media/123", authenticated: true };
    expect(await loadInboxImage(source)).toBe("data:image/png;base64,aW1hZ2U=");
    expect(api.get).toHaveBeenCalledWith(source.uri, { responseType: "blob" });
  });

  it("allows retry after a backend 404 instead of caching permanent deletion", async () => {
    (api.get as jest.Mock).mockRejectedValueOnce(new Error("404")).mockResolvedValueOnce({ data: {} });
    const source = { uri: "https://example.test/api/v1/inbox/media/123", authenticated: true };
    await expect(loadInboxImage(source)).rejects.toThrow("404");
    await expect(loadInboxImage(source)).resolves.toMatch(/^data:image/);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it("does not attach app credentials to external image URLs", async () => {
    const uri = "https://external.test/photo.png";
    expect(await loadInboxImage({ uri, authenticated: false })).toBe(uri);
    expect(api.get).not.toHaveBeenCalled();
  });
});
