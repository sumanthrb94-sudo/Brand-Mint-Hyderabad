import { startLogin } from "@/const";
import { firebaseAuth, firebaseLogout, finishFirebaseRedirectLogin } from "@/lib/firebase";
import { trpc } from "@/lib/trpc";
import { onIdTokenChanged, type User as FirebaseUser } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => firebaseAuth()?.currentUser ?? null);
  const [firebaseLoading, setFirebaseLoading] = useState(Boolean(firebaseAuth()));

  useEffect(() => {
    const auth = firebaseAuth();
    if (!auth) {
      setFirebaseLoading(false);
      return;
    }
    return onIdTokenChanged(auth, (user) => {
      setFirebaseUser(user);
      setFirebaseLoading(false);
      if (!user) {
        void utils.auth.me.invalidate();
        return;
      }

      // onIdTokenChanged only fires after Firebase has restored a usable
      // session. Do not force an additional token refresh here: normal Google
      // sign-in already supplies a valid ID token, while a forced refresh can
      // fail independently and strand a completed session on the sign-in page.
      void utils.auth.me.invalidate();
    });
  }, [utils.auth.me]);

  useEffect(() => {
    void finishFirebaseRedirectLogin().catch((error) => {
      console.error("[Firebase Redirect Sign-in Error]", error);
    });
  }, []);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: Boolean(firebaseUser),
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    await firebaseLogout();
    await logoutMutation.mutateAsync().catch(() => undefined);
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      loading: firebaseLoading || (Boolean(firebaseUser) && meQuery.isLoading) || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(firebaseUser && meQuery.data),
      hasFirebaseSession: Boolean(firebaseUser),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
    firebaseLoading,
    firebaseUser,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (firebaseLoading || meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      void startLogin();
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
    firebaseLoading,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
