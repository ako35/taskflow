import React from "react";
import type { TaskForm } from "../../types";
import { UiGlyph } from "../ui/Icons";

type AddTaskPanelProps = {
  form: TaskForm;
  loading: boolean;
  isFormValid: boolean;
  onChangeForm: (
    field: keyof TaskForm,
  ) => (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  onSubmit: () => void;
  onHideForm: () => void;
};

export default function AddTaskPanel({
  form,
  loading,
  isFormValid,
  onChangeForm,
  onSubmit,
  onHideForm,
}: AddTaskPanelProps) {
  return (
    <div className="add-task-overlay" onClick={onHideForm}>
      <section
        className="add-task-page"
        aria-label="Yeni görev sayfası"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="add-task-head">
          <h3>Yeni Görev</h3>
          <button
            type="button"
            className="task-details-close"
            onClick={onHideForm}
            aria-label="Yeni görev sayfasını kapat"
          >
            <UiGlyph icon="close" />
          </button>
        </div>

        <div className="add-task-body">
          <label className="add-task-field">
            <span>Görev Başlığı</span>
            <input
              type="text"
              placeholder="Görev başlığı"
              value={form.title}
              onChange={onChangeForm("title")}
              autoFocus
            />
          </label>

          <label className="add-task-field">
            <span>Önem</span>
            <select value={form.priority} onChange={onChangeForm("priority")}>
              <option value="Acil">Acil</option>
              <option value="Yüksek">Yüksek</option>
              <option value="Orta">Orta</option>
              <option value="Düşük">Düşük</option>
            </select>
          </label>

          <label className="add-task-field">
            <span>Durum</span>
            <select value={form.status} onChange={onChangeForm("status")}>
              <option value="Yapılacak">Yapılacak</option>
              <option value="Tamamlandı">Tamamlandı</option>
            </select>
          </label>

          <div className="form-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={onSubmit}
              disabled={loading || !isFormValid}
            >
              Kaydet
            </button>
            <button type="button" className="btn-secondary" onClick={onHideForm}>
              İptal
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
