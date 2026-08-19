import React from "react";
import { tableDisplayColumns } from "../../constants";
import type { TaskForm } from "../../types";

type TasksTableHeadProps = {
  showForm: boolean;
  form: TaskForm;
  columnWidths: Record<string, number>;
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

export default function TasksTableHead({
  showForm,
  form,
  columnWidths,
  loading,
  isFormValid,
  onChangeForm,
  onSubmit,
  onHideForm,
}: TasksTableHeadProps) {
  return (
    <thead>
      {showForm && (
        <>
          <tr className="form-row">
            {tableDisplayColumns.map((column) => (
              <td
                key={column.field}
                className={
                  column.field === "__spacer"
                    ? "table-spacer-cell"
                    : column.field === "priority"
                      ? "priority-column"
                      : undefined
                }
                style={{
                  width:
                    column.field === "__spacer"
                      ? 0
                      : columnWidths[column.field],
                }}
              >
                {column.field === "__spacer" ||
                column.field === "index" ? null : column.field ===
                  "priority" ? (
                  <select
                    className="theme-select"
                    value={form.priority}
                    onChange={onChangeForm("priority")}
                  >
                    <option value="Acil">Acil</option>
                    <option value="Yüksek">Yüksek</option>
                    <option value="Orta">Orta</option>
                    <option value="Düşük">Düşük</option>
                  </select>
                ) : column.field === "status" ? (
                  <select
                    className="theme-select"
                    value={form.status}
                    onChange={onChangeForm("status")}
                  >
                    <option value="Yapılacak">Yapılacak</option>
                    <option value="Tamamlandı">Tamamlandı</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Görev başlığı"
                    value={form[column.field as keyof TaskForm]}
                    onChange={onChangeForm(column.field as keyof TaskForm)}
                  />
                )}
              </td>
            ))}
          </tr>
          <tr className="form-actions-row">
            <td colSpan={tableDisplayColumns.length}>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onSubmit}
                  disabled={loading || !isFormValid}
                >
                  Kaydet
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onHideForm}
                >
                  İptal
                </button>
              </div>
            </td>
          </tr>
        </>
      )}
    </thead>
  );
}
