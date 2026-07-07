import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { fetchCurrentUserThunk } from "@/middleware/user/user.thunk";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/authService";
import {
  getAuthErrorStatus,
  logAuthEvent,
  shouldInvalidateSession,
} from "@/services/authSession";
import { tokenStorage } from "@/services/tokenStorage";
import { store } from "@/store";
import { clearUser, setCurrentUser } from "@/store/user/user.slice";
import type {
  AuthUser,
  GoogleAuthResult,
  LoginCredentials,
  LoginResponseData,
  RegisterCredentials,
  RegisterResponseData,
} from "@/types/auth";

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

  const applyAuthenticatedUserState = useCallback((nextUser: AuthUser, source: string) => {
    store.dispatch(setCurrentUser(nextUser));
    setUser(nextUser);
  }, []);

  const persistAuthenticatedUser = useCallback(async (nextUser: AuthUser, source: string) => {
    await tokenStorage.setStoredUser(nextUser);
    applyAuthenticatedUserState(nextUser, `${source}:persisted`);
  }, [applyAuthenticatedUserState]);

  const clearAuthenticatedUser = useCallback(() => {
    store.dispatch(clearUser());
    setUser(null);
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

  const syncCurrentUserProfile = useCallback(async () => {
    const resultAction = await store.dispatch(fetchCurrentUserThunk());

    if (fetchCurrentUserThunk.fulfilled.match(resultAction)) {
      await persistAuthenticatedUser(resultAction.payload, "users_me");

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
          if (session.user) {
            await tokenStorage.clearSession();
          }

          if (isMounted) {
            clearAuthenticatedUser();
          }

          logAuthEvent("bootstrap_no_stored_session");
          return;
        }

        if (session.user && isMounted) {
          applyAuthenticatedUserState(session.user, "bootstrap:cached_session");
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
          await tokenStorage.clearSession();
        }

        if (isMounted) {
          if (shouldClearSession) {
            clearAuthenticatedUser();
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
  }, [applyAuthenticatedUserState, clearAuthenticatedUser, syncCurrentUserProfile]);

  const signIn = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const authData = await authService.login(credentials);
      await persistAuthenticatedUser(authData.user, "login_response_partial");

      try {
        await syncCurrentUserProfile();
      } catch (profileError) {
        logAuthEvent("login_profile_fetch_failed", {
          status: getAuthErrorStatus(profileError),
          message: getApiErrorMessage(profileError),
        });
      }

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
      await persistAuthenticatedUser(authData.user, "register_response_partial");

      try {
        await syncCurrentUserProfile();
      } catch (profileError) {
        logAuthEvent("register_profile_fetch_failed", {
          status: getAuthErrorStatus(profileError),
          message: getApiErrorMessage(profileError),
        });
      }

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

      try {
        await syncCurrentUserProfile();
      } catch (profileError) {
        logAuthEvent("google_login_profile_fetch_failed", {
          status: getAuthErrorStatus(profileError),
          message: getApiErrorMessage(profileError),
        });
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
      await authService.logout();

      clearAuthenticatedUser();
    } catch (signOutError) {
      const message = getApiErrorMessage(signOutError);

      setError(message);
      clearAuthenticatedUser();
    } finally {
      setIsLoading(false);
    }
  };

  const signOutAll = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.logoutAll();

      clearAuthenticatedUser();
    } catch (signOutAllError) {
      const message = getApiErrorMessage(signOutAllError);

      setError(message);
      clearAuthenticatedUser();
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.deleteAccount();

      clearAuthenticatedUser();
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
        await tokenStorage.clearSession();
        clearAuthenticatedUser();
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
