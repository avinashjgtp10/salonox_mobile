import { api, ApiError } from "@/services/api";
import { inboxService } from "@/services/inbox.service";
import type { InboxMediaFile } from "@/types/inbox";

jest.mock("@/services/api", () => ({
  api: { post: jest.fn() },
  ApiError: class ApiError extends Error {},
  getFreshAccessToken: jest.fn(),
}));
jest.mock("@/services/client.service", () => ({ clientService: {} }));

const photo: InboxMediaFile = {
  uri: "file:///tmp/photo.jpg",
  name: "photo.jpg",
  type: "image/jpeg",
  size: 1024,
};

const fieldsOf = (form: FormData) => {
  // RN's FormData keeps entries on _parts; fall back to the DOM iterator.
  const parts = (form as unknown as { _parts?: [string, unknown][] })._parts;
  return parts ?? [...(form as unknown as Iterable<[string, unknown]>)];
};

describe("sending inbox media", () => {
  beforeEach(() => {
    (api.post as jest.Mock).mockReset();
    (api.post as jest.Mock).mockResolvedValue({ data: { data: null } });
  });

  it("posts the file as multipart form data to the conversation media route", async () => {
    await inboxService.sendMedia({ phone: "+919876543210", file: photo });

    const [url, body, config] = (api.post as jest.Mock).mock.calls[0];
    expect(url).toBe("/inbox/conversations/%2B919876543210/media");
    expect(config.headers["Content-Type"]).toBe("multipart/form-data");
    // RN FormData keeps the { uri, name, type } object; jsdom coerces it to a
    // string, so assert the field is present rather than its serialized shape.
    expect(fieldsOf(body as FormData).map(([key]) => key)).toContain("file");
  });

  it("sends a trimmed caption and omits an empty one", async () => {
    await inboxService.sendMedia({ phone: "+91", file: photo, caption: "  hello  " });
    expect(fieldsOf((api.post as jest.Mock).mock.calls[0][1] as FormData)).toContainEqual([
      "caption",
      "hello",
    ]);

    (api.post as jest.Mock).mockClear();
    await inboxService.sendMedia({ phone: "+91", file: photo, caption: "   " });
    expect(
      fieldsOf((api.post as jest.Mock).mock.calls[0][1] as FormData).map(([key]) => key),
    ).not.toContain("caption");
  });

  it("applies the backend's per-type size limits: 5 MB photos, 16 MB everything else", () => {
    expect(inboxService.mediaLimitMb("image/png")).toBe(5);
    expect(inboxService.mediaLimitMb("IMAGE/JPEG")).toBe(5);
    expect(inboxService.mediaLimitMb("application/pdf")).toBe(16);
    expect(inboxService.mediaLimitMb("video/mp4")).toBe(16);
  });

  it("rejects an oversized file before it is uploaded", async () => {
    const huge: InboxMediaFile = { ...photo, size: 6 * 1024 * 1024 };
    await expect(inboxService.sendMedia({ phone: "+91", file: huge })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  it("still uploads when the picker reports no size", async () => {
    await inboxService.sendMedia({ phone: "+91", file: { ...photo, size: null } });
    expect(api.post).toHaveBeenCalled();
  });
});
