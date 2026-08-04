import React, { useMemo, useState } from "react";
import { API_URL } from "../../constants";

type ContactViewProps = {
  onBackToLanding: () => void;
  onGoToLogin: () => void;
};

type ContactFormState = {
  fullName: string;
  email: string;
  phone: string;
  requestType: string;
  company: string;
  message: string;
};

const INITIAL_FORM: ContactFormState = {
  fullName: "",
  email: "",
  phone: "",
  requestType: "",
  company: "",
  message: "",
};

export default function ContactView({
  onBackToLanding,
  onGoToLogin,
}: ContactViewProps) {
  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSubmitDisabled = useMemo(() => {
    return (
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.requestType ||
      !form.message.trim()
    );
  }, [form]);

  const handleFieldChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = event.target;
    setFormNotice(null);
    setFormError(null);
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormNotice(null);
    setFormError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/contact-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || "Talep gonderilemedi.");
      }

      setFormNotice(
        "Talebiniz alindi. TaskFlow ekibi en kisa surede sizinle iletisime gececek.",
      );
      setForm(INITIAL_FORM);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Talep gonderilirken beklenmedik bir hata olustu.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <header className="contact-topbar">
        <button
          type="button"
          className="auth-brand auth-brand-button"
          onClick={onBackToLanding}
          aria-label="TaskFlow ana sayfasına dön"
        >
          <span className="topbar-logo" aria-hidden="true">
            <span className="topbar-logo-ring" />
            <span className="topbar-logo-core" />
          </span>
          <strong>TaskFlow</strong>
        </button>

        <button
          type="button"
          className="landing-link-btn"
          onClick={onGoToLogin}
        >
          Giriş yap
        </button>
      </header>

      <main className="contact-shell">
        <h1 className="contact-heading">Satış ekibiyle iletişime geçin</h1>

        <section
          className="contact-panel"
          aria-label="TaskFlow iletişim paneli"
        >
          <article className="contact-panel-info">
            <h2>Özel ihtiyaçlarınız için çözümler edinin</h2>
            <p>
              Güncelleme ve yenilik taleplerinizi, isteklerinizi veya
              şikayetlerinizi doğrudan ekibimize iletin. Sizin için en uygun
              çözümü birlikte planlayalım.
            </p>
            <p className="contact-callout">
              Acil durumlar için:{" "}
              <a href="tel:+908504802780">+90 850 480 2780</a>
            </p>
            <ul className="contact-feature-list">
              <li>Güncelleme talepleri</li>
              <li>Yenilik ve geliştirme önerileri</li>
              <li>İstek ve şikayet yönetimi</li>
            </ul>
          </article>

          <form className="contact-form-card" onSubmit={handleSubmit}>
            <h2>Talep formu</h2>

            <label htmlFor="fullName">Ad soyad *</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={handleFieldChange}
              placeholder="Ad soyad"
              required
            />

            <label htmlFor="email">E-posta *</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleFieldChange}
              placeholder="ornek@sirket.com"
              required
            />

            <label htmlFor="phone">Telefon *</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleFieldChange}
              placeholder="+90 5XX XXX XX XX"
              required
            />

            <label htmlFor="requestType">Talep türü *</label>
            <select
              id="requestType"
              name="requestType"
              value={form.requestType}
              onChange={handleFieldChange}
              required
            >
              <option value="">Seçiniz</option>
              <option value="guncelleme">Güncelleme talebi</option>
              <option value="yenilik">Yenilik talebi</option>
              <option value="istek">İstek</option>
              <option value="sikayet">Şikayet</option>
            </select>

            <label htmlFor="company">Şirket</label>
            <input
              id="company"
              name="company"
              type="text"
              value={form.company}
              onChange={handleFieldChange}
              placeholder="Şirket adı"
            />

            <label htmlFor="message">Mesajınız *</label>
            <textarea
              id="message"
              name="message"
              value={form.message}
              onChange={handleFieldChange}
              placeholder="Güncelleme, yenilik talebi, istek veya şikayetinizi yazın"
              rows={4}
              required
            />

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitDisabled || isSubmitting}
            >
              {isSubmitting ? "Gonderiliyor..." : "Iletisime gecin"}
            </button>

            {formNotice ? (
              <p className="contact-form-notice">{formNotice}</p>
            ) : null}

            {formError ? (
              <p className="contact-form-error">{formError}</p>
            ) : null}
          </form>
        </section>
      </main>
    </div>
  );
}
