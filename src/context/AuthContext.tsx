import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { unregisterDeviceThunk } from "@/middleware/notification/notification.thunk";
import { fetchCurrentUserThunk } from "@/middleware/user/user.thunk";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { beginUserLogout, finishUserLogin } from "@/services/authLifecycle";
import { authService } from "@/services/authService";
import {
  getAuthErrorStatus,
  logAuthEvent,
  shouldInvalidateSession,
} from "@/services/authSession";
import { branchStorage } from "@/services/branchStorage";
import { notificationDeviceStorage } from "@/services/notificationDeviceStorage";
import { salonService } from "@/services/salon.service";
import { addSessionInvalidationListener } from "@/services/sessionInvalidation";
import { markStartup } from "@/services/startupPerformance";
import { tokenStorage } from "@/services/tokenStorage";
import { resetAppState, store } from "@/store";
import { setCurrentUser } from "@/store/user/user.slice";
import type {
  AuthUser,
  GoogleAuthResult,
  LoginCredentials,
  LoginResponseData,
  RegisterCredentials,
  RegisterResponseData,
} from "@/types/auth";
import { preserveSalonId } from "@/utils/authUser";

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
  signInWithGoogle: () => Promise<GoogleAuthResult>;
  signOut: () => Promise<void>;
  signOutAll: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  updateUser: (updatedFields: Partial<AuthUser>) => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    tokenStorage.setStoredUser(userWithKnownSalon).catch((err) => {
      console.error("Failed to persist authenticated user", err);
    });
  }, [applyAuthenticatedUserState]);

  const clearLocalSession = useCallback(async (source: string) => {
    await Promise.all([
      tokenStorage.clearSession(),
      branchStorage.clearActiveBranchId(),
      notificationDeviceStorage.clearRegisteredToken(),
    ]);
    salonService.clearSalonMeCache();

    store.dispatch(resetAppState());
    setUser(null);
    logAuthEvent("local_session_cleared", { source });
  }, []);

  const updateUser = useCallback(async (updatedFields: Partial<AuthUser>) => {
    setUser((currentUser) => {
      if (!currentUser) {
        return null;
      }
      const updatedUser = { ...currentUser, ...updatedFields };
      tokenStorage.setStoredUser(updatedUser).catch((err) => {
        console.error("Failed to persist updated user", err);
      });
      store.dispatch(setCurrentUser(updatedUser));
      return updatedUser;
    });
  }, []);

  const unregisterNotificationDevice = useCallback(async () => {
    try {
      await store.dispatch(unregisterDeviceThunk());
    } catch (unregisterError) {
      logAuthEvent("notification_device_unregister_failed", {
        message: getApiErrorMessage(unregisterError),
      });
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

  useEffect(() => addSessionInvalidationListener((reason) => clearLocalSession(reason)), [
    clearLocalSession,
  ]);

  const signIn = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const authData = await authService.login(credentials);
      finishUserLogin();
      applyAuthenticatedUserAndPersistLater(withOnboardingStatus(authData.user, authData));
      markStartup("post_login_navigation");

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
      const authData = await authService.register(credentials);
      finishUserLogin();
      applyAuthenticatedUserAndPersistLater(withOnboardingStatus(authData.user, authData));
      markStartup("post_login_navigation");

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
      const authData = await authService.loginWithGoogle();
      finishUserLogin();

      if (authData.user) {
        applyAuthenticatedUserAndPersistLater(authData.user);
        markStartup("post_login_navigation");
        void syncCurrentUserProfile().catch((profileError) => {
          logAuthEvent("google_login_profile_fetch_failed", {
            status: getAuthErrorStatus(profileError),
            message: getApiErrorMessage(profileError),
          });
        });
      } else {
        await syncCurrentUserProfile();
        markStartup("post_login_navigation");
      }

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
      beginUserLogout();
      const session = await tokenStorage.getSession();

      await clearLocalSession("logout");

      void unregisterNotificationDevice();
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
      beginUserLogout();
      const session = await tokenStorage.getSession();

      await clearLocalSession("logout_all");

      void unregisterNotificationDevice();
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
      beginUserLogout();
      await unregisterNotificationDevice();
      await authService.deleteAccount();

      await clearLocalSession("delete_account");
    } catch (deleteAccountError) {
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
