import { useCallback, useEffect, useMemo, useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import type { User } from "@taskflow/shared";
import {
  clearStoredIdToken,
  getStoredIdToken,
  setStoredIdToken,
} from "../lib/secureStorage";
import { parseJwt } from "../lib/jwt";

WebBrowser.maybeCompleteAuthSession();

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

function buildUserFromIdToken(idToken: string): User | null {
  const payload = parseJwt(idToken);
  if (!payload?.email) return null;

  return {
    authEmail: payload.email,
    firstName: payload.given_name ?? payload.name ?? payload.email,
    lastName: payload.family_name,
    name: payload.name ?? payload.email,
    email: payload.email,
    picture: payload.picture,
  };
}

export default function useAuthSession() {
  const [idToken, setIdTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: extra.googleWebClientId || undefined,
    iosClientId: extra.googleIosClientId || undefined,
    androidClientId: extra.googleAndroidClientId || undefined,
  });

  useEffect(() => {
    let cancelled = false;
    getStoredIdToken().then((token) => {
      if (cancelled) return;
      if (token) {
        setIdTokenState(token);
        setUser(buildUserFromIdToken(token));
      }
      setRestoring(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const applySession = useCallback((token: string) => {
    const nextUser = buildUserFromIdToken(token);
    if (!nextUser) return false;

    setIdTokenState(token);
    setUser(nextUser);
    void setStoredIdToken(token);
    setError(null);
    return true;
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      const token =
        response.authentication?.idToken ?? (response.params as { id_token?: string })?.id_token;
      if (!token || !applySession(token)) {
        setError("Google oturumu idToken döndürmedi.");
      }
    } else if (response?.type === "error") {
      setError("Google ile giriş başarısız oldu.");
    }
  }, [response, applySession]);

  const signOut = useCallback(() => {
    setIdTokenState(null);
    setUser(null);
    void clearStoredIdToken();
  }, []);

  return useMemo(
    () => ({
      idToken,
      user,
      restoring,
      error,
      canSignIn: !!request,
      signIn: () => promptAsync(),
      signOut,
      applySession,
    }),
    [idToken, user, restoring, error, request, promptAsync, signOut, applySession],
  );
}
