import React from "react";

type LoginViewProps = {
  googleError: string | null;
  onBackToLanding: () => void;
};

export default function LoginView({
  googleError,
  onBackToLanding,
}: LoginViewProps) {
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
          <h1>Oturum Aç</h1>
          <p className="auth-user-hint">TaskFlow uygulamasına devam edin</p>

          <label htmlFor="email">E-posta adresiniz</label>
          <input id="email" type="email" placeholder="E-posta" />

          <label htmlFor="password">Parolayı girin</label>
          <input id="password" type="password" placeholder="Şifre" />

          <button type="button" className="auth-forgot-link">
            Şifrenizi mi unuttunuz?
          </button>

          <button type="button" className="btn-primary auth-primary-btn">
            Oturum aç
          </button>

          <div className="auth-separator">Veya şununla oturum açın</div>

          <div className="google-button">
            <div className="auth-google-stack">
              <button type="button" className="auth-google-only-btn">
                <svg
                  className="auth-google-icon-svg"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.87h5.391c-.232 1.25-.939 2.31-2.004 3.018v2.502h3.243c1.898-1.747 2.97-4.323 2.97-7.345Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 22c2.7 0 4.963-.896 6.617-2.428l-3.243-2.502c-.896.6-2.04.955-3.374.955-2.596 0-4.794-1.753-5.578-4.11H3.07v2.58A9.998 9.998 0 0 0 12 22Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.422 13.915A5.995 5.995 0 0 1 6.11 12c0-.665.115-1.31.312-1.915V7.505H3.07A9.998 9.998 0 0 0 2 12c0 1.61.386 3.135 1.07 4.495l3.352-2.58Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.975c1.467 0 2.784.505 3.82 1.496l2.864-2.864C16.96 3.01 14.698 2 12 2A9.998 9.998 0 0 0 3.07 7.505l3.352 2.58c.784-2.357 2.982-4.11 5.578-4.11Z"
                  />
                </svg>
                <span>Google</span>
              </button>
              <div
                id="google-signin-button-proxy"
                className="auth-google-proxy"
              />
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
