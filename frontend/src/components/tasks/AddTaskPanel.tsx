import React from "react";
import type { TaskForm } from "../../types";

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
    <section className="add-task-panel" aria-label="Yeni görev ekle">
      <div className="add-task-field">
        <label htmlFor="add-task-title">Görev başlığı</label>
        <input
          id="add-task-title"
          type="text"
          placeholder="Görev başlığı"
          value={form.title}
          onChange={onChangeForm("title")}
          autoFocus
        />
      </div>

      <div className="add-task-field">
        <label htmlFor="add-task-description">Açıklama</label>
        <textarea
          id="add-task-description"
          placeholder="Görev açıklaması (opsiyonel)"
          value={form.description}
          onChange={onChangeForm("description")}
          rows={3}
        />
      </div>

      <div className="add-task-row">
        <div className="add-task-field">
          <label htmlFor="add-task-priority">Önem</label>
          <select
            id="add-task-priority"
            className="theme-select"
            value={form.priority}
            onChange={onChangeForm("priority")}
          >
            <option value="Acil">Acil</option>
            <option value="Yüksek">Yüksek</option>
            <option value="Orta">Orta</option>
            <option value="Düşük">Düşük</option>
          </select>
        </div>

        <div className="add-task-field">
          <label htmlFor="add-task-status">Durum</label>
          <select
            id="add-task-status"
            className="theme-select"
            value={form.status}
            onChange={onChangeForm("status")}
          >
            <option value="Yapılacak">Yapılacak</option>
            <option value="Tamamlandı">Tamamlandı</option>
          </select>
        </div>
      </div>

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
    </section>
  );
}
