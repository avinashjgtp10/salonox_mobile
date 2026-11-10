import { create, isAxiosError } from "axios";
import { environmentConfig } from "@/config/environment";
import { protectedTokenStorage } from "./protectedTokenStorage";
import { tokenStorage } from "./tokenStorage";
import { shouldRefreshToken } from "./authSession";
import { normalizeAuthUser } from "@/utils/authUser";
import type { AuthTokens, AuthUser, LoginResponseData } from "@/types/auth";
import type { RegisterDeviceRequest } from "@/types/notification";
import type { SalonApiItem } from "@/types/salon";

export type ConnectedBranch = { id: string; branchSalonId: string; name: string | null; removable?: boolean; subscription: { state: string | null; expiresAt: string | null; live: boolean } };
export type ConnectedBranchesData = { login: { username: string; createdAt: string } | null; branches: ConnectedBranch[] };
type MainSession = AuthTokens & { user: AuthUser };
export type BranchSession = { main: MainSession; portal: AuthTokens; salonId: string };
const KEY = "salonox.branch.main-session";
let sessionRevision = 0;
let storageQueue: Promise<unknown> = Promise.resolve();
function storageOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation);
  storageQueue = result.catch(() => undefined);
  return result;
}
// Separate transport: portal/main requests must never inherit the selected
// salon's bearer token or the ordinary client's automatic refresh interceptor.
const transport = create({ baseURL: environmentConfig.apiBaseUrl, timeout: 20000, headers: { "X-Client-Type": "mobile", "X-Salonox-Client": "mobile" } });
async function request<T>(token: string, method: "get" | "post" | "patch" | "delete", url: string, data?: unknown): Promise<T> {
  try {
    const response = await transport.request({ method, url, data, headers: { Authorization: `Bearer ${token}` } });
    return response.data.data as T;
  } catch (error) {
    if (isAxiosError(error)) throw Object.assign(new Error(error.response?.data?.error?.message || error.response?.data?.message || error.message), { status: error.response?.status });
    throw error;
  }
}
export const branchSessionStorage = {
  read(): Promise<BranchSession | null> { return storageOperation(async () => {
    const raw = await protectedTokenStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as BranchSession;
    return value?.main?.user?.id && value.main.refreshToken && value.salonId ? value : null;
  }); },
  write(value: BranchSession | null) { sessionRevision += 1; return storageOperation(() => protectedTokenStorage.setItem(KEY, value ? JSON.stringify(value) : "")); },
};
async function fresh(tokens: AuthTokens): Promise<AuthTokens> {
  if (!shouldRefreshToken(tokens.accessToken)) return tokens;
  const next = await request<{ accessToken: string; refreshToken?: string }>("", "post", "/auth/refresh", { refreshToken: tokens.refreshToken });
  return { accessToken: next.accessToken, refreshToken: next.refreshToken ?? tokens.refreshToken };
}
async function mainSession(): Promise<MainSession> {
  const revision = sessionRevision;
  const branch = await branchSessionStorage.read();
  const current = branch?.main ?? await tokenStorage.getSession();
  if (!current.user || !current.accessToken || !current.refreshToken) throw new Error("Sign in to your main salon account to manage branches.");
  const tokens = await fresh({ accessToken: current.accessToken, refreshToken: current.refreshToken });
  if (revision !== sessionRevision) throw new Error("Your session changed. Please retry.");
  const main = { ...tokens, user: current.user };
  if (branch) {
    const live = await branchSessionStorage.read();
    if (live?.main.user.id === main.user.id && tokens.accessToken !== current.accessToken) await branchSessionStorage.write({ ...live, main });
  }
  else if (tokens.accessToken !== current.accessToken) {
    if ((await tokenStorage.getStoredUser())?.id !== main.user.id) throw new Error("Your session changed. Please retry.");
    await tokenStorage.setTokens(tokens);
  }
  return main;
}
export const connectedBranchesService = {
  async list() { const main = await mainSession(); return request<ConnectedBranchesData>(main.accessToken, "get", "/salon-branches"); },
  async connect(email: string, password: string, onVerified?: () => void) {
    const main = await mainSession();
    const verified = await request<{ verifyToken: string }>(main.accessToken, "post", "/salon-branches/verify", { email: email.trim(), password });
    onVerified?.();
    return request(main.accessToken, "post", "/salon-branches", { verifyToken: verified.verifyToken });
  },
  async createLogin(username: string, password: string) { const main = await mainSession(); return request(main.accessToken, "post", "/salon-branches/login", { username, password }); },
  async updateLogin(data: { username?: string; password?: string }) { const main = await mainSession(); return request(main.accessToken, "patch", "/salon-branches/login", data); },
  async disconnect(id: string) { const main = await mainSession(); return request(main.accessToken, "delete", `/salon-branches/${encodeURIComponent(id)}`); },
  async main() { return mainSession(); },
  async mainSalonName() {
    const main = await mainSession();
    // Resolve the real business name with the original account's token, even
    // while another connected salon is selected.
    const payload = await request<SalonApiItem & { salon?: SalonApiItem; data?: SalonApiItem }>(main.accessToken, "get", "/salons/current");
    const salon = payload.salon ?? payload.data ?? payload;
    return salon.name?.trim() || salon.business_name?.trim() || main.user.businessName?.trim() || "Salon";
  },
  async moveNotificationDevice(accessToken: string, payload: RegisterDeviceRequest) {
    return request(accessToken, "post", "/notifications/register-device", payload);
  },
  async prepareSwitch(salonId: string): Promise<{ session: LoginResponseData; branch: BranchSession | null }> {
    const main = await mainSession();
    if (salonId === main.user.salonId) {
      const user = normalizeAuthUser(await request(main.accessToken, "get", "/users/profile"));
      return { session: { ...main, user, isOnboardingComplete: user.isOnboardingComplete ?? true }, branch: null };
    }
    const saved = await branchSessionStorage.read();
    const portal = saved ? await fresh(saved.portal) : await request<AuthTokens>(main.accessToken, "post", "/salon-branches/portal/open");
    const result = await request<{ token: string; isOnboardingComplete: boolean }>(portal.accessToken, "post", `/branch-owner/salons/${encodeURIComponent(salonId)}/enter`);
    const user = normalizeAuthUser(await request(result.token, "get", "/users/profile"));
    if (user.salonId !== salonId) throw new Error("The server did not return the selected salon. Please try again.");
    return { session: { accessToken: result.token, refreshToken: portal.refreshToken, user, isOnboardingComplete: result.isOnboardingComplete }, branch: { main, portal, salonId } };
  },
};

/** Renew the selected salon's delegated token; never refresh it into a portal user. */
export async function renewBranchAccess(): Promise<AuthTokens | null> {
  const revision = sessionRevision;
  const branch = await branchSessionStorage.read();
  if (!branch) return null;
  let portal: AuthTokens, result: { token: string };
  try {
    portal = await fresh(branch.portal);
    result = await request<{ token: string }>(portal.accessToken, "post", `/branch-owner/salons/${encodeURIComponent(branch.salonId)}/enter`);
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && (error.status === 401 || error.status === 403)) {
      // A revoked portal is not evidence that the stashed owner's login ended.
      throw new Error("Branch access is no longer available. Open Your salons and choose Back to main account.");
    }
    throw error;
  }
  if (revision !== sessionRevision || (await branchSessionStorage.read())?.salonId !== branch.salonId) throw new Error("The selected salon changed. Please retry.");
  await branchSessionStorage.write({ ...branch, portal });
  return { accessToken: result.token, refreshToken: portal.refreshToken };
}
