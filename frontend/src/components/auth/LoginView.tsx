import React, { useCallback, useState } from "react";
import { API_URL } from "../../constants";

type LoginViewProps = {
  googleError: string | null;
  onBackToLanding: () => void;
  onEmailAuthSuccess: (credential: string) => void;
};

type AuthMode = "login" | "register";

export default function LoginView({
  googleError,
  onBackToLanding,
  onEmailAuthSuccess,
}: LoginViewProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const triggerGoogleLogin = useCallback(() => {
    const googleButton = document.querySelector(
      "#google-signin-button div[role='button']",
    ) as HTMLElement | null;
    googleButton?.click();
  }, []);

  const handleGoogleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        triggerGoogleLogin();
      }
    },
    [triggerGoogleLogin],
  );

  const toggleMode = () => {
    setMode((current) => (current === "login" ? "register" : "login"));
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const path = mode === "register" ? "/auth/register" : "/auth/login";
      const body =
        mode === "register"
          ? { email, password, firstName, lastName: lastName || undefined }
          : { email, password };

      const response = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await response.json().catch(() => null)) as
        | { token?: string; error?: string }
        | null;

      if (!response.ok || !data?.token) {
        throw new Error(data?.error || "İşlem gerçekleştirilemedi.");
      }

      onEmailAuthSuccess(data.token);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Beklenmedik bir hata oluştu.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-topbar">
        <button
          type="button"
          className="auth-brand auth-brand-button"
          aria-label="TaskFlow ana sayfasına dön"
          onClick={onBackToLanding}
        >
          <span className="topbar-logo" aria-hidden="true">
            <span className="topbar-logo-ring" />
            <span className="topbar-logo-core" />
          </span>
          <strong>TaskFlow</strong>
        </button>
      </header>

      <main className="auth-content">
        <section className="auth-form-shell" aria-label="Giriş formu">
          <h1>{mode === "register" ? "Hesap Oluştur" : "Oturum Aç"}</h1>
          <p className="auth-user-hint">TaskFlow uygulamasına devam edin</p>

          <form onSubmit={handleSubmit}>
            {mode === "register" ? (
              <>
                <label htmlFor="firstName">Ad</label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Ad"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                />

                <label htmlFor="lastName">Soyad</label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Soyad"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
              </>
            ) : null}

            <label htmlFor="email">E-posta adresiniz</label>
            <input
              id="email"
              type="email"
              placeholder="E-posta"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="password">Parolayı girin</label>
            <input
              id="password"
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />

            {mode === "login" ? (
              <button type="button" className="auth-forgot-link">
                Şifrenizi mi unuttunuz?
              </button>
            ) : null}

            {formError ? <div className="toast-error">{formError}</div> : null}

            <button
              type="submit"
              className="btn-primary auth-primary-btn"
              disabled={submitting}
            >
              {submitting
                ? "Gönderiliyor..."
                : mode === "register"
                  ? "Kayıt ol"
                  : "Oturum aç"}
            </button>
          </form>

          <button type="button" className="auth-forgot-link" onClick={toggleMode}>
            {mode === "register"
              ? "Zaten hesabınız var mı? Oturum açın"
              : "Hesabınız yok mu? Kayıt olun"}
          </button>

          <div className="auth-separator">Veya şununla oturum açın</div>

          <div className="google-button">
            <div
              className="auth-google-compact"
              role="button"
              tabIndex={0}
              aria-label="Google ile oturum aç"
              onClick={triggerGoogleLogin}
              onKeyDown={handleGoogleKeyDown}
            >
              <div id="google-signin-button" className="auth-google-button" />
              <span className="auth-google-label">Google</span>
            </div>
          </div>

          {googleError ? (
            <div className="toast-error">{googleError}</div>
          ) : null}

          <button
            type="button"
            className="auth-back-link"
            onClick={onBackToLanding}
          >
            TaskFlow'a farklı bir hesapla giriş yapın
          </button>

          <p className="auth-support-note">
            Oturum açamıyor musunuz?{" "}
            <a href="#">Yardım merkezini ziyaret edin.</a>
          </p>
        </section>
      </main>
    </div>
  );
}
