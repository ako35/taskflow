import React from "react";
import type TasksTable from "./TasksTable";
import { UiGlyph } from "../ui/Icons";

type TasksTableProps = React.ComponentProps<typeof TasksTable>;

type KnowledgeTableProps = Pick<
  TasksTableProps,
  | "showForm"
  | "form"
  | "loading"
  | "visibleTasks"
  | "editingCell"
  | "editingValue"
  | "onChangeForm"
  | "onSubmit"
  | "onHideForm"
  | "onStartEditingCell"
  | "onSetEditingValue"
  | "onSaveCellEdit"
  | "onCancelCellEdit"
  | "onDeleteTask"
>;

export default function KnowledgeTable({
  showForm,
  form,
  loading,
  visibleTasks,
  editingCell,
  editingValue,
  onChangeForm,
  onSubmit,
  onHideForm,
  onStartEditingCell,
  onSetEditingValue,
  onSaveCellEdit,
  onCancelCellEdit,
  onDeleteTask,
}: KnowledgeTableProps) {
  const handleEditKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (event.key === "Escape") {
      onCancelCellEdit();
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  return (
    <div className="knowledge-table-wrapper">
      <table className="knowledge-table">
        <colgroup>
          <col className="knowledge-number-column" />
          <col className="knowledge-subject-column" />
          <col className="knowledge-description-column" />
        </colgroup>
        <thead>
          <tr>
            <th>No</th>
            <th>Konu</th>
            <th>Açıklama</th>
          </tr>
          {showForm ? (
            <tr className="knowledge-create-row">
              <td aria-hidden="true">Yeni</td>
              <td>
                <input
                  type="text"
                  aria-label="Konu başlığı"
                  value={form.title}
                  autoFocus
                  placeholder="Konu başlığı"
                  onChange={onChangeForm("title")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && form.title.trim()) onSubmit();
                    if (event.key === "Escape") onHideForm();
                  }}
                />
              </td>
              <td>
                <div className="knowledge-description-form">
                  <textarea
                    rows={2}
                    aria-label="Bilgi açıklaması"
                    value={form.description}
                    placeholder="Bilginin açıklaması"
                    onChange={onChangeForm("description")}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        event.ctrlKey &&
                        form.title.trim()
                      )
                        onSubmit();
                      if (event.key === "Escape") onHideForm();
                    }}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={onSubmit}
                    disabled={loading || !form.title.trim()}
                  >
                    {loading ? "Ekleniyor..." : "Ekle"}
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Formu kapat"
                    title="Formu kapat"
                    onClick={onHideForm}
                  >
                    <UiGlyph icon="close" />
                  </button>
                </div>
              </td>
            </tr>
          ) : null}
        </thead>
        <tbody>
          {loading && visibleTasks.length === 0 ? (
            <tr>
              <td colSpan={3} className="no-data">
                Bilgiler yükleniyor...
              </td>
            </tr>
          ) : visibleTasks.length === 0 ? (
            <tr>
              <td colSpan={3} className="no-data">
                Bu alanda kayıtlı bilgi bulunmuyor.
              </td>
            </tr>
          ) : (
            visibleTasks.map((item, index) => (
              <tr key={item.id}>
                <td className="knowledge-number-cell">{index + 1}</td>
                {(["title", "description"] as const).map((field) => (
                  <td
                    key={field}
                    className={`knowledge-editable-cell knowledge-${field}-cell`}
                    onDoubleClick={() => onStartEditingCell(item, field)}
                  >
                    {editingCell?.id === item.id &&
                    editingCell.field === field ? (
                      field === "description" ? (
                        <textarea
                          rows={3}
                          aria-label="Bilgi açıklamasını düzenle"
                          value={editingValue}
                          autoFocus
                          onChange={(event) =>
                            onSetEditingValue(event.target.value)
                          }
                          onKeyDown={handleEditKeyDown}
                          onBlur={() => void onSaveCellEdit()}
                        />
                      ) : (
                        <input
                          type="text"
                          aria-label="Konu başlığını düzenle"
                          value={editingValue}
                          autoFocus
                          onChange={(event) =>
                            onSetEditingValue(event.target.value)
                          }
                          onKeyDown={handleEditKeyDown}
                          onBlur={() => void onSaveCellEdit()}
                        />
                      )
                    ) : (
                      <span>
                        {item[field] ||
                          (field === "description"
                            ? "Açıklama eklemek için çift tıklayın"
                            : "-")}
                      </span>
                    )}
                    {field === "description" ? (
                      <button
                        type="button"
                        className="knowledge-delete-button"
                        aria-label="Bilgiyi sil"
                        title="Bilgiyi sil"
                        disabled={editingCell?.id === item.id}
                        onClick={() => onDeleteTask(item.id)}
                      >
                        <UiGlyph icon="trash" />
                      </button>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
