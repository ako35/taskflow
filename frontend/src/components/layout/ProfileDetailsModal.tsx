import React from "react";

type ProfileDetailsModalProps = {
  open: boolean;
  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  saving: boolean;
  onFieldChange: (
    field: "firstName" | "lastName" | "email" | "phone",
    value: string,
  ) => void;
  onSave: () => void;
  onClose: () => void;
};

export default function ProfileDetailsModal({
  open,
  form,
  saving,
  onFieldChange,
  onSave,
  onClose,
}: ProfileDetailsModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="workspace-create-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-details-title"
      onClick={onClose}
    >
      <div
        className="workspace-create-modal profile-details-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="profile-details-title">Profil Bilgilerim</h2>
        <p>Ad, soyad, telefon ve e-posta bilgilerinizi güncelleyin.</p>

        <div className="profile-form-grid">
          <label className="profile-form-field">
            <span>Ad</span>
            <input
              type="text"
              value={form.firstName}
              autoFocus
              placeholder="Adiniz"
              onChange={(event) =>
                onFieldChange("firstName", event.target.value)
              }
            />
          </label>

          <label className="profile-form-field">
            <span>Soyad</span>
            <input
              type="text"
              value={form.lastName}
              placeholder="Soyadiniz"
              onChange={(event) =>
                onFieldChange("lastName", event.target.value)
              }
            />
          </label>

          <label className="profile-form-field">
            <span>Telefon</span>
            <input
              type="tel"
              value={form.phone}
              placeholder="05xx xxx xx xx"
              onChange={(event) => onFieldChange("phone", event.target.value)}
            />
          </label>

          <label className="profile-form-field profile-form-field-full">
            <span>E-posta</span>
            <input
              type="email"
              value={form.email}
              placeholder="ornek@firma.com"
              onChange={(event) => onFieldChange("email", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  onClose();
                }
                if (event.key === "Enter") {
                  onSave();
                }
              }}
            />
          </label>
        </div>

        <div className="workspace-create-modal-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}
