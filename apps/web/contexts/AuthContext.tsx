import type { QueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth-client";
import { usePermissionStore } from "@/store/use-permission-store";

export interface StoreUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "super_admin";
  user_metadata?: { full_name?: string };
}

interface AuthState {
  user: StoreUser | null;
  session: any | null;
  loading: boolean;
  error: Error | null;
}

let state: AuthState = { user: null, session: null, loading: true, error: null };
let queryClientRef: QueryClient | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  state = { ...state };
  listeners.forEach((fn) => fn());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AuthState {
  return state;
}

export const authSubscribe = subscribe;
export function getAuthUser(): StoreUser | null {
  return state.user;
}
export async function syncAuthSession() {
  return syncSession();
}

// Global session fetcher
async function syncSession() {
  try {
    const { data, error } = await (authClient as any).getSession();
    if (error) {
      state.user = null;
      state.session = null;
      state.loading = false;
      state.error = new Error(error.message || "Failed to load session");
      usePermissionStore.getState().clearPermissions();
      emitChange();
      return;
    }

    if (data?.session && data?.user) {
      const u: StoreUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: ((data.user as any).role || "user") as any,
        user_metadata: { full_name: data.user.name },
      };
      state.user = u;
      state.session = data.session;
      state.loading = false;
      state.error = null;
      emitChange();
      // Hydrate PBAC store
      usePermissionStore.getState().loadPermissions();
    } else {
      state.user = null;
      state.session = null;
      state.loading = false;
      state.error = null;
      usePermissionStore.getState().clearPermissions();
      emitChange();
    }
  } catch (err: any) {
    state.user = null;
    state.session = null;
    state.loading = false;
    state.error = err;
    emitChange();
  }
}

// Initial bootstrap in browser
if (typeof window !== "undefined") {
  syncSession();
}

// Actions
async function signUpAction(email: string, password: string, fullName: string) {
  try {
    state.loading = true;
    emitChange();
    const res = await authClient.signUp.email({
      email,
      password,
      name: fullName,
    });
    if (res.error) {
      state.loading = false;
      state.error = new Error(res.error.message || "Sign up failed");
      emitChange();
      return { error: state.error, user: null };
    }
    await syncSession();
    return { error: null, user: state.user };
  } catch (err: any) {
    state.loading = false;
    state.error = err;
    emitChange();
    return { error: err, user: null };
  }
}

async function signInAction(email: string, password: string) {
  try {
    state.loading = true;
    emitChange();
    const res = await authClient.signIn.email({
      email,
      password,
    });
    if (res.error) {
      state.loading = false;
      state.error = new Error(res.error.message || "Invalid credentials");
      emitChange();
      return { error: state.error, user: null };
    }
    await syncSession();
    return { error: null, user: state.user };
  } catch (err: any) {
    state.loading = false;
    state.error = err;
    emitChange();
    return { error: err, user: null };
  }
}

async function signInWithGoogleAction() {
  try {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/admin",
    });
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

async function signOutAction() {
  try {
    await (authClient as any).signOut();
    state.user = null;
    state.session = null;
    state.loading = false;
    state.error = null;
    usePermissionStore.getState().clearPermissions();
    if (queryClientRef) {
      queryClientRef.clear();
    }
    emitChange();
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.startsWith("/admin") || path.startsWith("/account")) {
        window.location.href = "/sign-in";
      }
    }
  } catch (err) {
    console.error("Error signing out:", err);
  }
}

async function refreshSessionAction() {
  await syncSession();
}

function clearErrorAction() {
  state.error = null;
  emitChange();
}

export const AuthProvider = ({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient?: QueryClient;
}) => {
  if (queryClient) queryClientRef = queryClient;

  useEffect(() => {
    syncSession();
  }, []);

  return <>{children}</>;
};

export const useAuth = () => {
  const authState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const signUp = useCallback(signUpAction, []);
  const signIn = useCallback(signInAction, []);
  const signInWithGoogle = useCallback(signInWithGoogleAction, []);
  const signOut = useCallback(signOutAction, []);
  const refreshSession = useCallback(refreshSessionAction, []);
  const clearError = useCallback(clearErrorAction, []);

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    error: authState.error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshSession,
    clearError,
  };
};
