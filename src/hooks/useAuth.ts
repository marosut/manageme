import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { UserInfo } from "../types/app";

const getCallbackParams = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(
    window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
  );

  return {
    code: searchParams.get("code"),
    error: searchParams.get("error") ?? hashParams.get("error"),
    errorDescription:
      searchParams.get("error_description") ?? hashParams.get("error_description"),
  };
};

const formatAuthError = (message: string) => message.replace(/\+/g, " ").trim();

export function useAuth() {
  const isAuthCallback = window.location.pathname === "/auth/callback";
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const { code, error, errorDescription } = getCallbackParams();
    const callbackError = errorDescription ?? error;

    const syncSession = (nextSession: Session | null, nextError: string | null = null) => {
      setSession(nextSession);
      setUser(nextSession?.user ? { id: nextSession.user.id } : null);
      setAuthError(nextError);
      setIsLoadingUser(false);

      if (nextSession && window.location.pathname === "/auth/callback") {
        window.history.replaceState(null, "", "/");
      }
    };

    const loadSession = async () => {
      if (isAuthCallback) {
        if (callbackError) {
          setAuthError(formatAuthError(callbackError));
          setIsLoadingUser(false);
          return;
        }

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (!isMounted) return;

          if (exchangeError) {
            setAuthError(formatAuthError(exchangeError.message));
            setIsLoadingUser(false);
            return;
          }

          syncSession(data.session);
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        setAuthError("로그인 정보를 불러오지 못했습니다.");
        console.error("getSession error:", error);
        setIsLoadingUser(false);
        return;
      }

      syncSession(data.session);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      if (isAuthCallback && callbackError && !nextSession) return;
      syncSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isAuthCallback]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      setAuthError("Google 로그인을 시작하지 못했습니다.");
      console.error("signInWithOAuth error:", error);
      return;
    }

    if (data.url) {
      window.location.assign(data.url);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthError("로그아웃하지 못했습니다.");
      console.error("signOut error:", error);
    }
  }, []);

  return {
    session,
    user,
    isLoadingUser,
    authError,
    isAuthCallback,
    signInWithGoogle,
    signOut,
  };
}
