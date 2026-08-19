import React from "react";
import type { Workspace } from "../../../types";

type WorkspaceCreateModalProps = {
  open: boolean;
  value: string;
  type: Workspace["type"];
  onValueChange: (value: string) => void;
  onTypeChange: (type: Workspace["type"]) => void;
  onCreate: () => void;
  onClose: () => void;
};

export default function WorkspaceCreateModal({
  open,
  value,
  type,
  onValueChange,
  onTypeChange,
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
        <p>Alan türünü seçin, adını girin ve oluşturun.</p>

        <div
          className="workspace-type-options"
          role="radiogroup"
          aria-label="Çalışma alanı türü"
        >
          <button
            type="button"
            className={type === "TASKS" ? "active" : ""}
            role="radio"
            aria-checked={type === "TASKS"}
            onClick={() => onTypeChange("TASKS")}
          >
            <strong>Görev Takibi</strong>
            <span>Görev, durum ve önem bilgilerini yönetin.</span>
          </button>
          <button
            type="button"
            className={type === "KNOWLEDGE" ? "active" : ""}
            role="radio"
            aria-checked={type === "KNOWLEDGE"}
            onClick={() => onTypeChange("KNOWLEDGE")}
          >
            <strong>Bilgi Alanı</strong>
            <span>No, Konu ve Açıklama sütunlarında bilgi saklayın.</span>
          </button>
        </div>

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
