import { createTokenVault } from "../src/services/tokenVault";

const ACCESS = "salonox.accessToken";
const REFRESH = "salonox.refreshToken";
const MARKER = "salonox.secureStorageInstalled.v1";
const KEY = "salonox.tokens.v1";
const oldTokens = { accessToken: "old-access", refreshToken: "old-refresh" };
const newTokens = { accessToken: "new-access", refreshToken: "new-refresh" };
const empty = { accessToken: null, refreshToken: null };

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { values.delete(key); }),
  };
}
function setup() {
  const legacy = memoryStorage({ [ACCESS]: oldTokens.accessToken, [REFRESH]: oldTokens.refreshToken });
  const secure = memoryStorage();
  return { legacy, secure, vault: createTokenVault(secure, legacy) };
}

test("migrates an existing session and removes both plaintext tokens", async () => {
  const { legacy, secure, vault } = setup();
  expect(await vault.getTokens()).toEqual(oldTokens);
  expect(JSON.parse(secure.values.get(KEY)!)).toEqual(oldTokens);
  expect(legacy.values.has(ACCESS)).toBe(false);
  expect(legacy.values.has(REFRESH)).toBe(false);
  expect(await createTokenVault(secure, legacy).getTokens()).toEqual(oldTokens);
});

test("a protected write failure preserves legacy tokens and can be retried", async () => {
  const { legacy, secure, vault } = setup();
  secure.setItem.mockRejectedValueOnce(new Error("Keychain unavailable"));
  await expect(vault.getTokens()).rejects.toThrow("Keychain unavailable");
  expect(legacy.values.get(ACCESS)).toBe(oldTokens.accessToken);
  expect(legacy.values.get(REFRESH)).toBe(oldTokens.refreshToken);
  expect(legacy.values.has(MARKER)).toBe(false);
  expect(await vault.getTokens()).toEqual(oldTokens);
});

test("interrupted marker persistence retains tokens for a safe retry", async () => {
  const { legacy, vault } = setup();
  legacy.setItem.mockRejectedValueOnce(new Error("disk full"));
  await expect(vault.getTokens()).rejects.toThrow("disk full");
  expect(legacy.values.has(REFRESH)).toBe(true);
  expect(await vault.getTokens()).toEqual(oldTokens);
});

test("cleanup retry cannot replace newer protected tokens with a legacy session", async () => {
  const { legacy, secure, vault } = setup();
  legacy.removeItem.mockRejectedValueOnce(new Error("cleanup failed"));
  await expect(vault.setTokens(newTokens)).rejects.toThrow("cleanup failed");
  expect(await createTokenVault(secure, legacy).getTokens()).toEqual(newTokens);
});

test("concurrent migration and refresh keep the newest complete token pair", async () => {
  const { secure, vault } = setup();
  await Promise.all([vault.getTokens(), vault.setTokens(newTokens)]);
  expect(await vault.getTokens()).toEqual(newTokens);
  expect(JSON.parse(secure.values.get(KEY)!)).toEqual(newTokens);
});

test("logout during migration cannot resurrect the old session", async () => {
  const { legacy, secure, vault } = setup();
  await Promise.all([vault.getTokens(), vault.clear()]);
  expect(await createTokenVault(secure, legacy).getTokens()).toEqual(empty);
  expect(legacy.values.has(REFRESH)).toBe(false);
});

test("logout remains effective after interrupted legacy cleanup", async () => {
  const { legacy, secure, vault } = setup();
  legacy.removeItem.mockRejectedValueOnce(new Error("cleanup failed"));
  await expect(vault.clear()).rejects.toThrow("cleanup failed");
  expect(await createTokenVault(secure, legacy).getTokens()).toEqual(empty);
});

test("a failed token rotation does not leave a mixed pair", async () => {
  const { secure, vault } = setup();
  await vault.getTokens();
  secure.setItem.mockRejectedValueOnce(new Error("storage locked"));
  await expect(vault.setTokens(newTokens)).rejects.toThrow("storage locked");
  expect(await vault.getTokens()).toEqual(oldTokens);
});

test("access token updates preserve the refresh token", async () => {
  const { vault } = setup();
  await vault.updateAccessToken("refreshed-access");
  expect(await vault.getTokens()).toEqual({ ...oldTokens, accessToken: "refreshed-access" });
});

test("fresh installation discards credentials that survived in the iOS Keychain", async () => {
  const legacy = memoryStorage();
  const secure = memoryStorage({ [KEY]: JSON.stringify(oldTokens) });
  expect(await createTokenVault(secure, legacy).getTokens()).toEqual(empty);
});

test("restored install marker without protected data does not revive backup tokens", async () => {
  const { legacy, vault } = setup();
  legacy.values.set(MARKER, "1");
  expect(await vault.getTokens()).toEqual(empty);
  expect(legacy.values.has(ACCESS)).toBe(false);
});

test("protected read failure is surfaced instead of falling back to plaintext", async () => {
  const { secure, vault } = setup();
  await vault.getTokens();
  secure.getItem.mockRejectedValueOnce(new Error("device locked"));
  await expect(vault.getTokens()).rejects.toThrow("device locked");
  expect(await vault.getTokens()).toEqual(oldTokens);
});

test("malformed protected data is rejected, while logout can recover it", async () => {
  const { secure, vault } = setup();
  await vault.getTokens();
  secure.values.set(KEY, '{"accessToken":123,"refreshToken":null}');
  await expect(vault.getTokens()).rejects.toThrow("Stored session is invalid");
  await vault.clear();
  expect(await vault.getTokens()).toEqual(empty);
});
