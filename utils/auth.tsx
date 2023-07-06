import { useEffect } from "react";
import { UserStore, useUserStore } from "../src/zustand/useUserStore";
import { usePathname, useRouter, useSegments } from "expo-router";
import { supabase } from "./supabase";
import type { AuthChangeEvent } from "@supabase/supabase-js";

const AUTH_EVENTS: Record<AuthChangeEvent, string> = {
  INITIAL_SESSION: "INITIAL_SESSION",
  SIGNED_IN: "SIGNED_IN",
  SIGNED_OUT: "SIGNED_OUT",
  TOKEN_REFRESHED: "TOKEN_REFRESHED",
  USER_UPDATED: "USER_UPDATED",
  PASSWORD_RECOVERY: "PASSWORD_RECOVERY",
  MFA_CHALLENGE_VERIFIED: "MFA_CHALLENGE_VERIFIED"
} as const;

type SupabaseAuthChangeCallback = Parameters<
  typeof supabase.auth.onAuthStateChange
>[0];

const onAuthStateChangedSupabase: SupabaseAuthChangeCallback = (
  event,
  session
) => {
  const isAuthed = [
    AUTH_EVENTS.SIGNED_IN,
    AUTH_EVENTS.USER_UPDATED,
    AUTH_EVENTS.TOKEN_REFRESHED
  ].includes(event);

  if (isAuthed) {
    UserStore.set({ session });
    return;
  }

  if (event === AUTH_EVENTS.SIGNED_OUT) {
    UserStore.clear();
  }
};

function useAuthListener() {
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(
      onAuthStateChangedSupabase
    );
    return data.subscription.unsubscribe;
  }, []);
}

export function useIsAuth() {
  const { session } = useUserStore();

  return !!session;
}

function useAutoLogin() {
  const { session } = useUserStore();

  useEffect(() => {
    if (session?.access_token) return;

    async function run() {
      const nextSession = await supabase.auth.getSession();
      UserStore.set({ session: nextSession.data.session });
    }

    run();
  }, [session?.access_token]);
}

// This hook will protect the route access based on user authentication.
function useProtectedRoute() {
  const router = useRouter();
  const pathName = usePathname();
  const segments = useSegments();
  const isAuth = useIsAuth();

  useAutoLogin();

  useEffect(() => {
    const onLoginPage = pathName === "/";

    if (
      // If the user is not signed in
      // and the initial segment is not anything in the auth group.
      !isAuth &&
      !onLoginPage
    ) {
      // Redirect to the sign-in page.
      router.replace("/");
      return;
    }

    if (isAuth && onLoginPage) {
      // Redirect away from the sign-in page.
      router.replace("/chat");
    }
  }, [isAuth, segments, router, pathName]);
}

export function AuthProtector({ children }: any) {
  useAuthListener();
  useProtectedRoute();

  return children;
}
