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
            <div className="auth-google-compact">
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
