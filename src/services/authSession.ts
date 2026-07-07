import { isAxiosError } from "axios";

const EXPIRY_REFRESH_BUFFER_MS = 60_000;

type JwtPayload = {
  exp?: number;
  iat?: number;
  [key: string]: unknown;
};

const normalizeBase64 = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = normalized.length % 4;

  return remainder === 0 ? normalized : normalized.padEnd(normalized.length + (4 - remainder), "=");
};

const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const [, payload] = token.split(".");

    if (!payload || typeof globalThis.atob !== "function") {
      return null;
    }

    return JSON.parse(globalThis.atob(normalizeBase64(payload))) as JwtPayload;
  } catch {
    return null;
  }
};

export const getTokenExpiryTimestamp = (token: string) => {
  const payload = decodeJwtPayload(token);

  return typeof payload?.exp === "number" ? payload.exp * 1000 : null;
};

export const shouldRefreshToken = (token: string, bufferMs = EXPIRY_REFRESH_BUFFER_MS) => {
  const expiryTimestamp = getTokenExpiryTimestamp(token);

  if (!expiryTimestamp) {
    return false;
  }

  return Date.now() >= expiryTimestamp - bufferMs;
};

export const getAuthErrorStatus = (error: unknown) => {
  if (isAxiosError(error)) {
    return error.response?.status;
  }

  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;

    return typeof status === "number" ? status : undefined;
  }

  return undefined;
};

export const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown auth error";
};

export const shouldInvalidateSession = (error: unknown) => {
  const status = getAuthErrorStatus(error);

  if (status && [400, 401, 403].includes(status)) {
    return true;
  }

  const message = getAuthErrorMessage(error).toLowerCase();

  return (
    (message.includes("refresh") || message.includes("session")) &&
    (message.includes("expired") || message.includes("invalid"))
  );
};

export const logAuthEvent = (_event: string, _details?: Record<string, unknown>) => {};
