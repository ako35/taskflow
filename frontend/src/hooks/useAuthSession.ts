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

const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";

function loadGoogleIdentityScript() {
  return new Promise<void>((resolve, reject) => {
    const google = (window as any).google;
    if (google?.accounts?.id) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT}"]`,
    );

    if (existingScript) {
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Google kimlik doğrulama scripti yüklenemedi."));
      };
      const cleanup = () => {
        existingScript.removeEventListener("load", onLoad);
        existingScript.removeEventListener("error", onError);
      };

      existingScript.addEventListener("load", onLoad);
      existingScript.addEventListener("error", onError);
      window.setTimeout(() => {
        const nextGoogle = (window as any).google;
        cleanup();
        if (nextGoogle?.accounts?.id) {
          resolve();
          return;
        }
        reject(new Error("Google kimlik doğrulama scripti yüklenemedi."));
      }, 10000);
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;

    const onLoad = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Google kimlik doğrulama scripti yüklenemedi."));
    };

    const cleanup = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    document.head.appendChild(script);
  });
}

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

    let cancelled = false;

    const initializeGoogle = async () => {
      try {
        await loadGoogleIdentityScript();
        if (cancelled) {
          return;
        }

        const google = (window as any).google;
        if (!google?.accounts?.id) {
          setGoogleError("Google kimlik doğrulama scripti yüklenemedi.");
          return;
        }

        if (!googleInitialized.current) {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            ux_mode: "popup",
            itp_support: true,
            auto_select: false,
            use_fedcm_for_prompt: false,
            use_fedcm_for_button: false,
            button_auto_select: false,
          });
          googleInitialized.current = true;
        }

        if (guestView === "login") {
          const loginButton = document.getElementById("google-signin-button");
          if (loginButton) {
            loginButton.innerHTML = "";
            google.accounts.id.renderButton(loginButton, {
              type: "icon",
              theme: "outline",
              size: "large",
              shape: "square",
              logo_alignment: "left",
              locale: "tr",
            });
          }
        }
      } catch {
        if (!cancelled) {
          setGoogleError("Google kimlik doğrulama scripti yüklenemedi.");
        }
      }
    };

    initializeGoogle();

    return () => {
      cancelled = true;
    };
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
          throw new Error("Profil bilgileri yüklenemedi.");
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
        console.error("Profil bilgileri yüklenemedi", error);
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
