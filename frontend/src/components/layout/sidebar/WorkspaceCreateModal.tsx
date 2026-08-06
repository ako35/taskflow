import React from "react";

type WorkspaceCreateModalProps = {
  open: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onCreate: () => void;
  onClose: () => void;
};

export default function WorkspaceCreateModal({
  open,
  value,
  onValueChange,
  onCreate,
  onClose,
}: WorkspaceCreateModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="workspace-create-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-create-title"
      onClick={onClose}
    >
      <div
        className="workspace-create-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="workspace-create-title">Yeni Çalışma Alanı</h2>
        <p>Çalışma alanı adını girin ve oluşturun.</p>

        <input
          type="text"
          value={value}
          autoFocus
          placeholder="Örn: Pazarlama Sprint"
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onCreate();
            }
            if (event.key === "Escape") {
              onClose();
            }
          }}
        />

        <div className="workspace-create-modal-actions">
          <button type="button" className="btn-primary" onClick={onCreate}>
            Oluştur
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}
