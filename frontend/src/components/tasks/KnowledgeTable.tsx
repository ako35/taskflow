import React, { useCallback, useEffect, useRef, useState } from "react";
import type TasksTable from "./TasksTable";
import { UiGlyph } from "../ui/Icons";
import { safeParseJson } from "../../utils";

type TasksTableProps = React.ComponentProps<typeof TasksTable>;

type KnowledgeColumnField = "number" | "subject";

const KNOWLEDGE_COLUMN_STORAGE_KEY = "taskflow_knowledge_column_widths";
const KNOWLEDGE_COLUMN_MIN = { number: 48, subject: 140, description: 220 };
const KNOWLEDGE_COLUMN_DEFAULTS: Record<KnowledgeColumnField, number> = {
  number: 72,
  subject: 220,
};

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
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [columnWidths, setColumnWidths] = useState<
    Record<KnowledgeColumnField, number>
  >(() => {
    const stored = safeParseJson<Partial<Record<KnowledgeColumnField, number>>>(
      localStorage.getItem(KNOWLEDGE_COLUMN_STORAGE_KEY),
      {},
    );

    return {
      number: Math.max(
        KNOWLEDGE_COLUMN_MIN.number,
        stored.number ?? KNOWLEDGE_COLUMN_DEFAULTS.number,
      ),
      subject: Math.max(
        KNOWLEDGE_COLUMN_MIN.subject,
        stored.subject ?? KNOWLEDGE_COLUMN_DEFAULTS.subject,
      ),
    };
  });

  useEffect(() => {
    localStorage.setItem(
      KNOWLEDGE_COLUMN_STORAGE_KEY,
      JSON.stringify(columnWidths),
    );
  }, [columnWidths]);

  const resizeState = useRef<{
    field: KnowledgeColumnField;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleColumnMouseMove = useCallback((event: MouseEvent) => {
    const current = resizeState.current;
    const wrapper = wrapperRef.current;
    if (!current || !wrapper) return;

    const delta = event.clientX - current.startX;
    const containerWidth = wrapper.clientWidth - 2;

    setColumnWidths((prev) => {
      const otherField: KnowledgeColumnField =
        current.field === "number" ? "subject" : "number";
      const maxWidth = Math.max(
        KNOWLEDGE_COLUMN_MIN[current.field],
        containerWidth - prev[otherField] - KNOWLEDGE_COLUMN_MIN.description,
      );
      const nextWidth = Math.min(
        maxWidth,
        Math.max(KNOWLEDGE_COLUMN_MIN[current.field], current.startWidth + delta),
      );

      if (nextWidth === prev[current.field]) return prev;
      return { ...prev, [current.field]: nextWidth };
    });
  }, []);

  const handleColumnMouseUp = useCallback(() => {
    if (!resizeState.current) return;
    resizeState.current = null;
    window.removeEventListener("mousemove", handleColumnMouseMove);
    window.removeEventListener("mouseup", handleColumnMouseUp);
  }, [handleColumnMouseMove]);

  const startColumnResize = useCallback(
    (field: KnowledgeColumnField) =>
      (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        resizeState.current = {
          field,
          startX: event.clientX,
          startWidth: columnWidths[field],
        };
        window.addEventListener("mousemove", handleColumnMouseMove);
        window.addEventListener("mouseup", handleColumnMouseUp);
      },
    [columnWidths, handleColumnMouseMove, handleColumnMouseUp],
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleColumnMouseMove);
      window.removeEventListener("mouseup", handleColumnMouseUp);
    };
  }, [handleColumnMouseMove, handleColumnMouseUp]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || typeof ResizeObserver === "undefined") return;

    const clampToContainer = () => {
      const containerWidth = wrapper.clientWidth - 2;
      if (containerWidth <= 0) return;

      setColumnWidths((prev) => {
        const maxNumber = Math.max(
          KNOWLEDGE_COLUMN_MIN.number,
          containerWidth - KNOWLEDGE_COLUMN_MIN.subject - KNOWLEDGE_COLUMN_MIN.description,
        );
        const number = Math.min(prev.number, maxNumber);
        const maxSubject = Math.max(
          KNOWLEDGE_COLUMN_MIN.subject,
          containerWidth - number - KNOWLEDGE_COLUMN_MIN.description,
        );
        const subject = Math.min(prev.subject, maxSubject);

        if (number === prev.number && subject === prev.subject) return prev;
        return { number, subject };
      });
    };

    clampToContainer();
    const observer = new ResizeObserver(clampToContainer);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

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
    <div className="knowledge-table-wrapper" ref={wrapperRef}>
      <table className="knowledge-table">
        <colgroup>
          <col style={{ width: `${columnWidths.number}px` }} />
          <col style={{ width: `${columnWidths.subject}px` }} />
          <col className="knowledge-description-column" />
        </colgroup>
        <thead>
          <tr>
            <th>
              <div className="header-cell">
                <span>No</span>
                <div
                  className="resize-handle resize-handle-right"
                  onMouseDown={startColumnResize("number")}
                />
              </div>
            </th>
            <th>
              <div className="header-cell">
                <span>Konu</span>
                <div
                  className="resize-handle resize-handle-right"
                  onMouseDown={startColumnResize("subject")}
                />
              </div>
            </th>
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
                    onClick={() => {
                      if (editingCell?.id !== item.id || editingCell.field !== field) {
                        onStartEditingCell(item, field);
                      }
                    }}
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
