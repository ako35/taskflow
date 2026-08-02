import React from "react";

type LandingPageProps = {
  onGoToLogin: () => void;
};

export default function LandingPage({ onGoToLogin }: LandingPageProps) {
  return (
    <div className="landing-site">
      <header className="landing-nav">
        <div className="landing-brand" aria-label="TaskFlow">
          <span className="topbar-logo" aria-hidden="true">
            <span className="topbar-logo-ring" />
            <span className="topbar-logo-core" />
          </span>
          <strong>TaskFlow</strong>
        </div>
        <nav className="landing-menu" aria-label="Ana menü">
          <a href="#">Ürün</a>
          <a href="#">Çözümler</a>
          <a href="#">Fiyatlar</a>
          <a href="#">Kaynaklar</a>
        </nav>
        <div className="landing-actions">
          <button
            type="button"
            className="landing-link-btn"
            onClick={onGoToLogin}
          >
            Giriş yap
          </button>
          <button
            type="button"
            className="btn-primary landing-main-btn"
            onClick={onGoToLogin}
          >
            Ücretsiz başla
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <span className="eyebrow">Yapay Zeka Tabanlı</span>
          <h1>Kod Gerektirmeyen İş Yönetim Platformu</h1>
          <p>
            Ekibinizin iş birliği ihtiyaçları için hızlı, esnek ve tamamen
            özelleştirilebilir bir görev yönetim deneyimi.
          </p>
          <div className="landing-cta-row">
            <button type="button" className="btn-primary" onClick={onGoToLogin}>
              Şimdi başlayın
            </button>
            <button
              type="button"
              className="btn-secondary landing-outline-btn"
              onClick={onGoToLogin}
            >
              Giriş ekranına git
            </button>
          </div>
          <small>Kredi kartı bilgisi gerekmez</small>
        </section>

        <section className="landing-preview" aria-label="Uygulama önizleme">
          <div className="preview-window">
            <div className="preview-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="preview-grid" />
          </div>
        </section>
      </main>
    </div>
  );
}
