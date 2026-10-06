import type { AuthTokens } from "@/types/auth";

type StoredTokens = { accessToken: string | null; refreshToken: string | null };
type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const TOKEN_KEY = "salonox.tokens.v1";
const INSTALL_KEY = "salonox.secureStorageInstalled.v1";
const LEGACY_KEYS = ["salonox.accessToken", "salonox.refreshToken"];
const emptyTokens = (): StoredTokens => ({ accessToken: null, refreshToken: null });

export function createTokenVault(protectedStorage: Pick<Storage, "getItem" | "setItem">, legacy: Storage) {
  let pending: Promise<unknown> = Promise.resolve();
  const run = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = pending.then(operation);
    pending = result.catch(() => undefined);
    return result;
  };
  const removeLegacyTokens = async () => {
    await Promise.all(LEGACY_KEYS.map((key) => legacy.removeItem(key)));
  };
  const write = (tokens: StoredTokens) => protectedStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  const read = async (): Promise<StoredTokens> => {
    if (!(await legacy.getItem(INSTALL_KEY))) {
      const [accessToken, refreshToken] = await Promise.all(LEGACY_KEYS.map((key) => legacy.getItem(key)));
      await write({ accessToken, refreshToken });
      await legacy.setItem(INSTALL_KEY, "1");
    }
    await removeLegacyTokens();
    const raw = await protectedStorage.getItem(TOKEN_KEY);
    if (raw === null) return emptyTokens();
    const tokens: unknown = JSON.parse(raw);
    if (!tokens || typeof tokens !== "object" ||
      !("accessToken" in tokens) || !("refreshToken" in tokens) ||
      (tokens.accessToken !== null && typeof tokens.accessToken !== "string") ||
      (tokens.refreshToken !== null && typeof tokens.refreshToken !== "string")) {
      throw new Error("Stored session is invalid. Please sign in again.");
    }
    return tokens as StoredTokens;
  };
  const replace = async (tokens: StoredTokens) => {
    await write(tokens);
    await legacy.setItem(INSTALL_KEY, "1");
    await removeLegacyTokens();
  };
  return {
    getTokens: () => run(read),
    setTokens: (tokens: AuthTokens) => run(() => replace(tokens)),
    updateAccessToken: (accessToken: string) => run(async () => {
      const tokens = await read();
      await replace({ ...tokens, accessToken });
    }),
    clear: () => run(() => replace(emptyTokens())),
  };
}
