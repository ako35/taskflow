import React from "react";

const previewTasks = [
  {
    status: "Yapılacak",
    title: "Mobil onboarding akışını yayına al",
    priority: "Acil",
  },
  {
    status: "Yapılacak",
    title: "Satış paneli KPI kartlarını güncelle",
    priority: "Yüksek",
  },
  {
    status: "Tamamlandı",
    title: "Müşteri geri bildirim etiketlerini temizle",
    priority: "Orta",
  },
  {
    status: "Tamamlandı",
    title: "Sprint planı ve teslim tarihlerini eşitle",
    priority: "Düşük",
  },
];

type LandingPageProps = {
  onGoToContact: () => void;
  onGoToLogin: () => void;
};

export default function LandingPage({
  onGoToContact,
  onGoToLogin,
}: LandingPageProps) {
  return (
    <div className="landing-site landing-site-force-dark">
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
            className="btn-secondary landing-contact-btn"
            onClick={onGoToContact}
          >
            İletişime geçin
          </button>
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
              TaskFlow'a giriş yap
            </button>
          </div>
        </section>

        <section className="landing-preview" aria-label="Uygulama önizleme">
          <div className="preview-window">
            <div className="preview-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="preview-table-shell">
              <div className="preview-table-toolbar">
                <div>
                  <strong>Görev görünümü</strong>
                  <p>Ekibinizin önceliklerini tek ekranda yönetin.</p>
                </div>
                <span className="preview-chip">Canlı iş akışı</span>
              </div>

              <div className="preview-table">
                <div className="preview-table-header">
                  <span>Durum</span>
                  <span>Görev</span>
                  <span>Öncelik</span>
                </div>

                <div className="preview-table-body">
                  {previewTasks.map((task) => (
                    <div className="preview-row" key={task.title}>
                      <span
                        className={`preview-badge preview-status preview-status-${task.status.toLowerCase()}`}
                      >
                        {task.status}
                      </span>
                      <strong>{task.title}</strong>
                      <span
                        className={`preview-badge preview-priority preview-priority-${task.priority.toLowerCase()}`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
