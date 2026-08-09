import React from "react";
import { UiGlyph } from "../ui/Icons";

type InviteStatus = {
  type: "success" | "error";
  message: string;
} | null;

type InviteTeammateModalProps = {
  open: boolean;
  workspaceName: string;
  inviteeEmail: string;
  message: string;
  sending: boolean;
  status: InviteStatus;
  onInviteeEmailChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
};

export default function InviteTeammateModal({
  open,
  workspaceName,
  inviteeEmail,
  message,
  sending,
  status,
  onInviteeEmailChange,
  onMessageChange,
  onSend,
  onClose,
}: InviteTeammateModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="workspace-create-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-teammate-title"
      onClick={onClose}
    >
      <div
        className="workspace-create-modal profile-details-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-title-row">
          <h2 id="invite-teammate-title">E-posta ile Davet Et</h2>
          <button
            type="button"
            className="modal-close-btn"
            aria-label="Kapat"
            onClick={onClose}
            disabled={sending}
          >
            <UiGlyph icon="close" />
          </button>
        </div>
        <p>
          Takım arkadaşınızı <strong>{workspaceName}</strong> çalışma alanına
          davet etmek için e-posta adresini girin.
        </p>

        <div className="profile-form-grid">
          <label className="profile-form-field profile-form-field-full">
            <span>Davet Edilecek E-posta</span>
            <input
              type="email"
              value={inviteeEmail}
              autoFocus
              placeholder="ornek@firma.com"
              onChange={(event) => onInviteeEmailChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  onClose();
                }
                if (event.key === "Enter") {
                  onSend();
                }
              }}
            />
          </label>

          <label className="profile-form-field profile-form-field-full">
            <span>Kisa Not (Opsiyonel)</span>
            <textarea
              rows={4}
              value={message}
              maxLength={500}
              onChange={(event) => onMessageChange(event.target.value)}
            />
          </label>
        </div>

        {status ? (
          <p className={`invite-status ${status.type}`} role="status">
            {status.message}
          </p>
        ) : null}

        <div className="workspace-create-modal-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={onSend}
            disabled={sending}
          >
            {sending ? "Gönderiliyor..." : "Daveti Gönder"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={sending}
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}
