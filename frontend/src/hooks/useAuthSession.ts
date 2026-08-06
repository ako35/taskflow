import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { API_URL, GOOGLE_CLIENT_ID, isClientIdPlaceholder } from "../constants";
import type { GuestView, User } from "../types";
import {
  buildUserDisplayName,
  hasTokenExpired,
  parseJwt,
  splitPersonName,
} from "../utils";

type UseAuthSessionResult = {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  idToken: string | null;
  setIdToken: Dispatch<SetStateAction<string | null>>;
  guestView: GuestView;
  setGuestView: Dispatch<SetStateAction<GuestView>>;
  googleError: string | null;
};

export default function useAuthSession(): UseAuthSessionResult {
  const [user, setUser] = useState<User | null>(() => {
    const storedToken = localStorage.getItem("taskflow_id_token");
    if (!storedToken || hasTokenExpired(storedToken)) {
      localStorage.removeItem("taskflow_user");
      localStorage.removeItem("taskflow_id_token");
      return null;
    }

    const stored = localStorage.getItem("taskflow_user");
    if (!stored) return null;
    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  });

  const [idToken, setIdToken] = useState<string | null>(() => {
    const stored = localStorage.getItem("taskflow_id_token");
    if (!stored || hasTokenExpired(stored)) {
      localStorage.removeItem("taskflow_user");
      localStorage.removeItem("taskflow_id_token");
      return null;
    }
    return stored;
  });

  const [guestView, setGuestView] = useState<GuestView>("landing");
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleCredentialResponse = useCallback((response: any) => {
    if (!response?.credential) {
      setGoogleError("Google kimlik doğrulama başarısız oldu.");
      return;
    }

    const profile = parseJwt(response.credential);
    if (!profile?.email) {
      setGoogleError("Google hesabından kullanıcı bilgisi alınamadı.");
      return;
    }

    const { firstName, lastName } = splitPersonName(profile.name || profile.email);

    const nextUser: User = {
      authEmail: profile.email,
      firstName: firstName || profile.email,
      lastName: lastName || undefined,
      name: buildUserDisplayName(firstName, lastName, profile.email),
      email: profile.email,
      phone: "",
      picture: profile.picture,
    };

    setUser(nextUser);
    setIdToken(response.credential);
    localStorage.setItem("taskflow_user", JSON.stringify(nextUser));
    localStorage.setItem("taskflow_id_token", response.credential);
  }, []);

  const googleInitialized = useRef(false);

  useEffect(() => {
    if (user !== null) return;

    if (!GOOGLE_CLIENT_ID) {
      setGoogleError("Lütfen frontend/.env dosyasına VITE_GOOGLE_CLIENT_ID ekleyin.");
      return;
    }

    if (isClientIdPlaceholder) {
      setGoogleError(
        "Frontend/.env dosyanızda geçerli bir Google Client ID yok. Lütfen Google Cloud Console'dan aldığınız gerçek client ID'yi ekleyin.",
      );
      return;
    }

    let attempts = 0;
    const initializeGoogle = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        attempts += 1;
        if (attempts < 15) {
          window.setTimeout(initializeGoogle, 150);
        } else {
          setGoogleError("Google kimlik doğrulama scripti yüklenemedi.");
        }
        return;
      }

      if (!googleInitialized.current) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          ux_mode: "popup",
        });
        googleInitialized.current = true;
      }

      if (guestView === "login") {
        const proxyButton = document.getElementById("google-signin-button-proxy");
        if (proxyButton) {
          proxyButton.innerHTML = "";
          google.accounts.id.renderButton(proxyButton, {
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            width: 220,
          });
        }
      }
    };

    initializeGoogle();
  }, [guestView, handleCredentialResponse, user]);

  useEffect(() => {
    if (!user?.authEmail || !idToken) {
      return;
    }

    let cancelled = false;

    async function loadUserProfile() {
      try {
        const response = await fetch(`${API_URL}/profile`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (response.status === 401) {
          if (cancelled) {
            return;
          }

          setUser(null);
          setIdToken(null);
          setGuestView("login");
          localStorage.removeItem("taskflow_user");
          localStorage.removeItem("taskflow_id_token");
          return;
        }

        if (!response.ok) {
          throw new Error("Profil bilgileri yuklenemedi.");
        }

        const profile = (await response.json()) as {
          authEmail: string;
          firstName: string;
          lastName: string | null;
          email: string;
          phone: string | null;
          picture?: string | null;
        };

        if (cancelled) {
          return;
        }

        const nextUser: User = {
          authEmail: profile.authEmail,
          firstName: profile.firstName,
          lastName: profile.lastName || undefined,
          name: buildUserDisplayName(
            profile.firstName,
            profile.lastName || undefined,
            profile.email,
          ),
          email: profile.email,
          phone: profile.phone || undefined,
          picture: profile.picture || undefined,
        };

        setUser(nextUser);
        localStorage.setItem("taskflow_user", JSON.stringify(nextUser));
      } catch (error) {
        console.error("Profil bilgileri yuklenemedi", error);
      }
    }

    loadUserProfile();

    return () => {
      cancelled = true;
    };
  }, [idToken, user?.authEmail]);

  return {
    user,
    setUser,
    idToken,
    setIdToken,
    guestView,
    setGuestView,
    googleError,
  };
}
