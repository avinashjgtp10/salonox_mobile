import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigationContainerRef } from "expo-router";
import { Platform } from "react-native";
import { notificationDeviceStorage } from "@/services/notificationDeviceStorage";

import { unregisterDeviceThunk } from "@/middleware/notification/notification.thunk";
import * as Notifications from "expo-notifications";
import { pauseNotificationRegistration, resumeNotificationRegistration } from "@/services/notificationRegistrationLifecycle";
import { fetchCurrentUserThunk } from "@/middleware/user/user.thunk";
import { useAppForeground } from "@/hooks/useAppForeground";
import { ApiError, cancelProtectedApiRequests, getApiErrorMessage } from "@/services/api";
import { beginUserLogout, finishUserLogin } from "@/services/authLifecycle";
import { appAlert } from "@/services/appAlert";
import { authService } from "@/services/authService";
import { guideStorage } from "@/features/userGuide/guideStorage";
import {
  getAuthErrorStatus,
  logAuthEvent,
  shouldInvalidateSession,
} from "@/services/authSession";
import { branchStorage } from "@/services/branchStorage";
import { salonService } from "@/services/salon.service";
import { realtimeSocket } from "@/services/realtimeSocket";
import { addSessionInvalidationListener } from "@/services/sessionInvalidation";
import { tokenStorage } from "@/services/tokenStorage";
import { resetAppState, store } from "@/store";
import { setActiveBranchId } from "@/store/branch/branch.slice";
import { setCurrentUser } from "@/store/user/user.slice";
import type {
  AuthUser,
  LoginCredentials,
  LoginResponseData,
  RegisterCredentials,
  RegisterResponseData,
} from "@/types/auth";
import { preserveSalonId } from "@/utils/authUser";
import { branchSessionStorage, connectedBranchesService } from "@/services/connectedBranches.service";

const withOnboardingStatus = <T extends AuthUser>(
  user: T,
  authData: { isOnboardingComplete?: boolean },
) => ({
  ...user,
  isOnboardingComplete: user.isOnboardingComplete ?? authData.isOnboardingComplete,
});

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (credentials: LoginCredentials) => Promise<LoginResponseData>;
  signUp: (credentials: RegisterCredentials) => Promise<RegisterResponseData>;
  signInWithGoogle: () => Promise<LoginResponseData>;
  signOut: () => Promise<void>;
  signOutAll: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  updateUser: (updatedFields: Partial<AuthUser>) => Promise<void>;
  clearError: () => void;
  switchSalon: (salonId: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const navigation = useNavigationContainerRef();
  const resetNavigationAfterSwitch = useRef(false);
  const switchingSalon = useRef(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (resetNavigationAfterSwitch.current && !isLoading && navigation.isReady()) {
      resetNavigationAfterSwitch.current = false;
      navigation.resetRoot({ index: 0, routes: [{ name: "(tabs)", state: { index: 0, routes: [{ name: "dashboard" }] } }] });
    }
  }, [user?.id, user?.salonId, isLoading, navigation]);

  const applyAuthenticatedUserState = useCallback((nextUser: AuthUser) => {
    const userWithKnownSalon = preserveSalonId(nextUser, store.getState().user.user);

    store.dispatch(setCurrentUser(userWithKnownSalon));
    setUser((currentUser) => preserveSalonId(userWithKnownSalon, currentUser));
  }, []);

  const persistAuthenticatedUser = useCallback(async (nextUser: AuthUser) => {
    const userWithKnownSalon = preserveSalonId(nextUser, store.getState().user.user);

    await tokenStorage.setStoredUser(userWithKnownSalon);
    applyAuthenticatedUserState(userWithKnownSalon);
  }, [applyAuthenticatedUserState]);

  const applyAuthenticatedUserAndPersistLater = useCallback((nextUser: AuthUser) => {
    const userWithKnownSalon = preserveSalonId(nextUser, store.getState().user.user);

    applyAuthenticatedUserState(userWithKnownSalon);
    tokenStorage.setStoredUser(userWithKnownSalon).catch(() => {});
  }, [applyAuthenticatedUserState]);

  const clearLocalSession = useCallback(async (source: string) => {
    await Promise.all([
      tokenStorage.clearSession(),
      branchSessionStorage.write(null),
      branchStorage.clearActiveBranchId(),
    ]);
      // Token storage is cleared only after successful server unregistration.
      // Preserve it on session expiry so the next session can clean it up.
      await Promise.allSettled([
        Notifications.dismissAllNotificationsAsync(),
        Notifications.cancelAllScheduledNotificationsAsync(),
        Notifications.setBadgeCountAsync(0),
        Notifications.clearLastNotificationResponseAsync(),
      ]);
    salonService.clearSalonMeCache();
    realtimeSocket.disconnect();

    store.dispatch(resetAppState());
    setUser(null);
    logAuthEvent("local_session_cleared", { source });
  }, []);

  const updateUser = useCallback(async (updatedFields: Partial<AuthUser>) => {
    // The store mirrors the signed-in user (applyAuthenticatedUserState keeps
    // them in sync). Side effects stay out of the setUser updater: React may
    // run it during render, and dispatching there updates other components
    // mid-render ("Cannot update a component while rendering ...").
    const currentUser = store.getState().user.user;
    if (!currentUser) {
      return;
    }
    const updatedUser = { ...currentUser, ...updatedFields };
    store.dispatch(setCurrentUser(updatedUser));
    setUser((stateUser) => (stateUser ? { ...stateUser, ...updatedFields } : null));
    await tokenStorage.setStoredUser(updatedUser).catch(() => {});
  }, []);

  const unregisterNotificationDevice = useCallback(async () => {
    pauseNotificationRegistration();
    try {
      await store.dispatch(unregisterDeviceThunk()).unwrap();
    } catch (unregisterError) {
      logAuthEvent("notification_device_unregister_failed", {
        message: getApiErrorMessage(unregisterError),
      });
      resumeNotificationRegistration();
      const message = "Could not disconnect this phone from salon notifications. Check your connection and try logging out again.";
      setError(message);
      throw new Error(message);
    }
  }, []);

  const syncCurrentUserProfile = useCallback(async () => {
    const resultAction = await store.dispatch(fetchCurrentUserThunk());

    if (fetchCurrentUserThunk.fulfilled.match(resultAction)) {
      await persistAuthenticatedUser(resultAction.payload);

      return resultAction.payload;
    }

    throw new ApiError(
      resultAction.payload?.message ??
      resultAction.error.message ??
      "Unable to load user profile.",
      resultAction.payload?.status,
    );
  }, [persistAuthenticatedUser]);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const session = await tokenStorage.getSession();

        if (!session.accessToken && !session.refreshToken) {
          await clearLocalSession("bootstrap_no_tokens");

          if (isMounted) {
            setUser(null);
          }

          logAuthEvent("bootstrap_no_stored_session");
          return;
        }

        if (session.user && isMounted) {
          applyAuthenticatedUserState(session.user);
          logAuthEvent("bootstrap_restored_cached_user", {
            userId: session.user.id,
          });
          // Open with the saved user; the profile sync below finishes in the
          // background (and waits for the connection when offline).
          setIsLoading(false);
        }

        const currentUser = await syncCurrentUserProfile();

        logAuthEvent("bootstrap_session_restored", {
          userId: currentUser.id,
        });
      } catch (bootstrapError) {
        const shouldClearSession = shouldInvalidateSession(bootstrapError);

        logAuthEvent("bootstrap_restore_failed", {
          shouldClearSession,
          status: getAuthErrorStatus(bootstrapError),
          message: getApiErrorMessage(bootstrapError),
        });

        if (shouldClearSession) {
          await clearLocalSession("bootstrap_invalid");
        }

        if (isMounted) {
          if (shouldClearSession) {
            setUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, [applyAuthenticatedUserState, clearLocalSession, syncCurrentUserProfile]);

  // A profile photo or name changed on the web must show up here without a cold start.
  useAppForeground(() => {
    if (!user) return;
    void syncCurrentUserProfile().catch((profileError) => {
      logAuthEvent("foreground_profile_fetch_failed", {
        status: getAuthErrorStatus(profileError),
        message: getApiErrorMessage(profileError),
      });
    });
  });

  useEffect(() => addSessionInvalidationListener(async (reason) => {
    await clearLocalSession(reason);
    if (reason === "session_replaced") {
      appAlert.alert("Signed out", "You were signed out because this account was logged in on another device.");
    }
  }), [clearLocalSession]);

  const signIn = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      await branchSessionStorage.write(null);
      const authData = await authService.login(credentials);
      finishUserLogin();
      applyAuthenticatedUserAndPersistLater(withOnboardingStatus(authData.user, authData));

      void syncCurrentUserProfile().catch((profileError) => {
        logAuthEvent("login_profile_fetch_failed", {
          status: getAuthErrorStatus(profileError),
          message: getApiErrorMessage(profileError),
        });
      });

      return authData;
    } catch (signInError) {
      const message = getApiErrorMessage(signInError);
      setError(message);
      throw signInError;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      await branchSessionStorage.write(null);
      const authData = await authService.register(credentials);
      finishUserLogin();
      applyAuthenticatedUserAndPersistLater(withOnboardingStatus(authData.user, authData));

      if (authData.user?.id) {
        void guideStorage.markJustRegistered(authData.user.id);
      }

      void syncCurrentUserProfile().catch((profileError) => {
        logAuthEvent("register_profile_fetch_failed", {
          status: getAuthErrorStatus(profileError),
          message: getApiErrorMessage(profileError),
        });
      });

      return authData;
    } catch (signUpError) {
      const message = getApiErrorMessage(signUpError);
      setError(message);
      throw signUpError;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await branchSessionStorage.write(null);
      const authData = await authService.loginWithGoogle();
      // Same session setup as email sign-in (the backend returns the same login response).
      finishUserLogin();
      applyAuthenticatedUserAndPersistLater(withOnboardingStatus(authData.user, authData));
      void syncCurrentUserProfile().catch((profileError) => {
        logAuthEvent("google_login_profile_fetch_failed", {
          status: getAuthErrorStatus(profileError),
          message: getApiErrorMessage(profileError),
        });
      });

      return authData;
    } catch (googleError) {
      const message = getApiErrorMessage(googleError);
      setError(message);
      throw googleError;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const session = (await branchSessionStorage.read())?.main ?? await tokenStorage.getSession();

      await unregisterNotificationDevice();
      beginUserLogout();
      cancelProtectedApiRequests();
      await clearLocalSession("logout");

      void authService.logout({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      }).catch((signOutError) => {
        logAuthEvent("logout_request_failed_after_local_clear", {
          status: getAuthErrorStatus(signOutError),
          message: getApiErrorMessage(signOutError),
        });
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signOutAll = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const session = await tokenStorage.getSession();

      await unregisterNotificationDevice();
      beginUserLogout();
      cancelProtectedApiRequests();
      await clearLocalSession("logout_all");

      void authService.logoutAll({ accessToken: session.accessToken }).catch((signOutAllError) => {
        logAuthEvent("logout_all_request_failed_after_local_clear", {
          status: getAuthErrorStatus(signOutAllError),
          message: getApiErrorMessage(signOutAllError),
        });
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await unregisterNotificationDevice();
      await authService.deleteAccount();

      beginUserLogout();
      cancelProtectedApiRequests();
      await clearLocalSession("delete_account");
    } catch (deleteAccountError) {
      resumeNotificationRegistration();
      const message = getApiErrorMessage(deleteAccountError);

      setError(message);
      throw deleteAccountError;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCurrentUser = async () => {
    try {
      await syncCurrentUserProfile();
    } catch (refreshError) {
      const shouldClearSession = shouldInvalidateSession(refreshError);

      logAuthEvent("refresh_current_user_failed", {
        shouldClearSession,
        status: getAuthErrorStatus(refreshError),
        message: getApiErrorMessage(refreshError),
      });

      if (shouldClearSession) {
        await clearLocalSession("refresh_current_user_invalid");
      }

      throw refreshError;
    }
  };

  const switchSalon = async (salonId: string) => {
    if (store.getState().user.user?.salonId === salonId) return;
    if (switchingSalon.current) throw new Error("A salon switch is already in progress.");
    switchingSalon.current = true;
    try {
    const previous = await tokenStorage.getSession();
    const previousBranch = await branchSessionStorage.read();
    // Resolve and validate the server-issued identity before touching this session.
    const prepared = await connectedBranchesService.prepareSwitch(salonId);
    if (store.getState().user.user?.id !== previous.user?.id || store.getState().user.user?.salonId !== previous.user?.salonId) throw new Error("Your session changed. Please retry from the current salon.");
    try {
      await unregisterNotificationDevice();
    } catch (failure) {
      if (!previousBranch || salonId !== previousBranch.main.user.salonId) throw failure;
      // A revoked delegated token cannot unregister itself. The owner's valid
      // session can move this installation back via the existing registration API.
      pauseNotificationRegistration();
      try {
        const token = await notificationDeviceStorage.getRegisteredToken();
        if (token && (Platform.OS === "android" || Platform.OS === "ios")) await connectedBranchesService.moveNotificationDevice(prepared.session.accessToken, { token, platform: Platform.OS, installation_id: await notificationDeviceStorage.getInstallationId() });
        setError(null);
      } catch (moveFailure) { resumeNotificationRegistration(); throw moveFailure; }
    }
    setIsLoading(true);
    beginUserLogout();
    cancelProtectedApiRequests();
    realtimeSocket.disconnect();
    try {
      await branchSessionStorage.write(prepared.branch);
      await tokenStorage.setTokens(prepared.session);
      await tokenStorage.setStoredUser(withOnboardingStatus(prepared.session.user, prepared.session));
      await branchStorage.setActiveBranchId(salonId);
      salonService.clearSalonMeCache();
      store.dispatch(resetAppState());
      store.dispatch(setActiveBranchId(salonId));
      resetNavigationAfterSwitch.current = true;
      applyAuthenticatedUserState(withOnboardingStatus(prepared.session.user, prepared.session));
    } catch (failure) {
      await branchSessionStorage.write(previousBranch);
      if (previous.accessToken && previous.refreshToken) await tokenStorage.setTokens({ accessToken: previous.accessToken, refreshToken: previous.refreshToken });
      if (previous.user) { await tokenStorage.setStoredUser(previous.user); applyAuthenticatedUserState(previous.user); }
      if (previous.user?.salonId) { await branchStorage.setActiveBranchId(previous.user.salonId); store.dispatch(setActiveBranchId(previous.user.salonId)); }
      throw failure;
    } finally {
      finishUserLogin();
      resumeNotificationRegistration();
      setIsLoading(false);
    }
    } finally { switchingSalon.current = false; }
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    signOutAll,
    deleteAccount,
    refreshCurrentUser,
    updateUser,
    switchSalon,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
