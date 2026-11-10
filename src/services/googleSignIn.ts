import { Platform, TurboModuleRegistry } from "react-native";

import { googleSignInConfig } from "@/config/environment";
import { ApiError } from "@/services/api";

type GoogleSignInModule = typeof import("@react-native-google-signin/google-signin");

/** Error codes the login screen maps to prototype messages (see authMessages). */
export const GOOGLE_SIGN_IN_CODES = {
  cancelled: "GOOGLE_SIGN_IN_CANCELLED",
  unavailable: "GOOGLE_SIGN_IN_UNAVAILABLE",
  playServices: "GOOGLE_PLAY_SERVICES_UNAVAILABLE",
  failed: "GOOGLE_SIGN_IN_FAILED",
} as const;

const fail = (message: string, code: string) => new ApiError(message, undefined, undefined, undefined, code);

let googleModule: GoogleSignInModule | null | undefined;
let configured = false;

// App builds made before the package was added have no native side, and
// importing the package there throws. Load it only when the native module exists.
const loadGoogleSignIn = () => {
  if (googleModule === undefined) {
    googleModule = TurboModuleRegistry.get("RNGoogleSignin")
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- must not load on builds without the native module.
      ? (require("@react-native-google-signin/google-signin") as GoogleSignInModule)
      : null;
  }
  return googleModule;
};

/**
 * Opens the phone's own Google account picker (no browser) and resolves with the
 * chosen account's ID token, for the backend to verify. The picker is always
 * shown, so people with several Google accounts can choose which one to use.
 */
export async function pickGoogleAccountIdToken(): Promise<string> {
  const google = loadGoogleSignIn();
  const { webClientId, iosClientId } = googleSignInConfig;
  if (!google || !webClientId || (Platform.OS === "ios" && !iosClientId)) {
    throw fail("Google sign-in is not available in this version of the app.", GOOGLE_SIGN_IN_CODES.unavailable);
  }

  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = google;
  if (!configured) {
    // webClientId makes Google issue the ID token for our backend's client.
    GoogleSignin.configure({ webClientId, iosClientId: iosClientId || undefined, scopes: ["email", "profile"] });
    configured = true;
  }

  try {
    if (Platform.OS === "android") await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Without this Google silently reuses the last chosen account.
    await GoogleSignin.signOut().catch(() => undefined);

    const result = await GoogleSignin.signIn();
    if (!isSuccessResponse(result)) throw fail("Google sign-in was cancelled.", GOOGLE_SIGN_IN_CODES.cancelled);
    if (!result.data.idToken) throw fail("Google sign-in did not return a token.", GOOGLE_SIGN_IN_CODES.failed);
    return result.data.idToken;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) {
        throw fail("Google sign-in was cancelled.", GOOGLE_SIGN_IN_CODES.cancelled);
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw fail("Google Play services are not available.", GOOGLE_SIGN_IN_CODES.playServices);
      }
    }
    throw fail("Google sign-in could not be completed.", GOOGLE_SIGN_IN_CODES.failed);
  }
}
