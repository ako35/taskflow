import React from "react";
import {
  priorityClassNames,
  statusClassNames,
  tableDisplayColumns,
} from "../../constants";
import type { Task, ViewMode } from "../../types";
import { UiGlyph } from "../ui/Icons";
import InlineSelectMenu from "./InlineSelectMenu";

type TasksTableBodyProps = {
  loading: boolean;
  tasks: Task[];
  visibleTasks: Task[];
  viewMode: ViewMode;
  columnWidths: Record<string, number>;
  collapsedStatusGroups: Record<string, boolean>;
  statusGroupCounts: Record<string, number>;
  editingCell: { id: number; field: string } | null;
  editingValue: string;
  activePreviewCell: { id: number; field: "title" } | null;
  aiImprovingCell: { id: number; field: "title" } | null;
  archivedTaskIds: number[];
  onToggleStatusGroup: (status: string) => void;
  onStartColumnResize: (
    field: string,
    event: React.MouseEvent<HTMLDivElement>,
  ) => void;
  onFitColumnToContent: (field: string) => void;
  onTogglePreviewCell: (id: number, field: "title") => void;
  onOpenTaskDetails: (task: Task) => void;
  onAiImproveTaskField: (taskId: number, field: "title") => Promise<void>;
  onAiImproveEditingCell: () => Promise<void>;
  onStartEditingCell: (task: Task, field: string) => void;
  onSetEditingValue: (value: string) => void;
  onSaveCellEdit: (nextValue?: string) => void | Promise<void>;
  onCancelCellEdit: () => void;
  onRestoreTask: (taskId: number) => void;
  onArchiveTask: (taskId: number) => void;
  onDeleteTask: (taskId: number) => void;
};

export default function TasksTableBody({
  loading,
  tasks,
  visibleTasks,
  viewMode,
  columnWidths,
  collapsedStatusGroups,
  statusGroupCounts,
  editingCell,
  editingValue,
  activePreviewCell,
  aiImprovingCell,
  archivedTaskIds,
  onToggleStatusGroup,
  onStartColumnResize,
  onFitColumnToContent,
  onTogglePreviewCell,
  onOpenTaskDetails,
  onAiImproveTaskField,
  onAiImproveEditingCell,
  onStartEditingCell,
  onSetEditingValue,
  onSaveCellEdit,
  onCancelCellEdit,
  onRestoreTask,
  onArchiveTask,
  onDeleteTask,
}: TasksTableBodyProps) {
  return (
    <tbody>
      {loading && tasks.length === 0 ? (
        <tr>
          <td colSpan={tableDisplayColumns.length} className="no-data">
            Görevler yükleniyor...
          </td>
        </tr>
      ) : visibleTasks.length === 0 ? (
        <tr>
          <td colSpan={tableDisplayColumns.length} className="no-data">
            {viewMode === "archive"
              ? "Arşivde görüntülenecek görev bulunamadı."
              : "Bu çalışma alanında görev bulunamadı. Yeni görev ekleyin."}
          </td>
        </tr>
      ) : (
        (() => {
          let currentStatus = "";
          let visibleIndex = 0;

          return visibleTasks.map((task) => {
            const status = task.status ?? "Yapılacak";
            const groupKey = `${viewMode}:${status}`;
            const groupChanged = status !== currentStatus;
            if (groupChanged) {
              currentStatus = status;
            }

            const isCollapsed = collapsedStatusGroups[groupKey] ?? false;
            const rowIndex = visibleIndex + 1;
            if (!isCollapsed) {
              visibleIndex += 1;
            }

            return (
              <React.Fragment key={task.id}>
                {groupChanged ? (
                  <tr className="status-group-row">
                    <td
                      colSpan={tableDisplayColumns.length}
                      className="status-group-cell"
                    >
                      <button
                        type="button"
                        className="status-group-toggle"
                        onClick={() => onToggleStatusGroup(status)}
                        aria-expanded={!isCollapsed}
                      >
                        <span className="status-group-leading">
                          <span
                            className="status-group-chevron"
                            aria-hidden="true"
                          >
                            <UiGlyph icon="chevron-down" />
                          </span>
                          <span className="status-group-count">
                            {statusGroupCounts[status] ?? 0}
                          </span>
                        </span>
                        <span className="status-group-label">{status}</span>
                      </button>
                    </td>
                  </tr>
                ) : null}

                {groupChanged && !isCollapsed ? (
                  <tr className="status-columns-row">
                    {tableDisplayColumns.map((column) => (
                      <th
                        key={`${status}-${column.field}`}
                        className={
                          column.field === "__spacer"
                            ? "table-spacer-head"
                            : column.field === "status" ||
                                column.field === "priority"
                              ? "centered-head"
                              : undefined
                        }
                        style={{
                          width:
                            column.field === "__spacer"
                              ? 0
                              : columnWidths[column.field],
                        }}
                      >
                        {column.field === "__spacer" ? null : (
                          <div className="header-cell">
                            <span>{column.label}</span>
                            <div
                              className="resize-handle resize-handle-right"
                              onMouseDown={(event) =>
                                onStartColumnResize(column.field, event)
                              }
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                onFitColumnToContent(column.field);
                              }}
                              aria-label={`Autofit ${column.label} column`}
                              title="Sürükleyerek genişliği ayarlayın. Çift tıklama içeriğe göre otomatik sığdırır."
                            />
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ) : null}

                {isCollapsed ? null : (
                  <tr
                    className={`task-row ${editingCell?.id === task.id ? "task-row-editing" : ""}`}
                  >
                    {tableDisplayColumns.map((column) => {
                      const isEditing =
                        editingCell?.id === task.id &&
                        editingCell.field === column.field;

                      return (
                        <td
                          key={column.field}
                          className={
                            column.field === "__spacer"
                              ? "table-spacer-cell"
                              : column.field === "status"
                                ? "status-cell"
                                : column.field === "priority"
                                  ? "priority-cell"
                                  : column.field === "title"
                                    ? "preview-cell"
                                    : undefined
                          }
                          data-preview-open={
                            activePreviewCell?.id === task.id &&
                            activePreviewCell.field === column.field
                              ? "true"
                              : "false"
                          }
                          data-inline-editing={
                            isEditing &&
                            (column.field === "status" ||
                              column.field === "priority")
                              ? "true"
                              : "false"
                          }
                          style={{
                            width:
                              column.field === "__spacer"
                                ? 0
                                : columnWidths[column.field],
                          }}
                          onClick={() => {
                            if (column.field === "title") {
                              onOpenTaskDetails(task);
                              return;
                            }

                            if (
                              column.field === "status" ||
                              column.field === "priority"
                            ) {
                              onStartEditingCell(task, column.field);
                            }
                          }}
                          onDoubleClick={() =>
                            onStartEditingCell(task, column.field)
                          }
                        >
                          {column.field === "__spacer" ? null : column.field ===
                            "index" ? (
                            <span className="task-index-badge">{rowIndex}</span>
                          ) : isEditing ? (
                            column.field === "status" ? (
                              <InlineSelectMenu
                                value={editingValue}
                                fallbackValue="Yapılacak"
                                options={["Yapılacak", "Tamamlandı"]}
                                getOptionClassName={(option) =>
                                  statusClassNames[option] ??
                                  "badge-status-blue"
                                }
                                badgeClassName="task-status-badge"
                                onSelect={(option) => {
                                  onSetEditingValue(option);
                                  void onSaveCellEdit(option);
                                }}
                                onCancel={onCancelCellEdit}
                              />
                            ) : column.field === "priority" ? (
                              <InlineSelectMenu
                                value={editingValue}
                                fallbackValue="Orta"
                                options={["Acil", "Yüksek", "Orta", "Düşük"]}
                                getOptionClassName={(option) =>
                                  priorityClassNames[option] ?? "badge-orta"
                                }
                                badgeClassName="task-priority-badge"
                                onSelect={(option) => {
                                  onSetEditingValue(option);
                                  void onSaveCellEdit(option);
                                }}
                                onCancel={onCancelCellEdit}
                              />
                            ) : column.field === "title" ? (
                              <div
                                className="inline-edit-shell"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="task-action-btn task-action-ai-btn inline-edit-floating-action"
                                  onMouseDown={(event) =>
                                    event.preventDefault()
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void onAiImproveEditingCell();
                                  }}
                                  disabled={
                                    aiImprovingCell?.id === task.id &&
                                    aiImprovingCell.field === "title"
                                  }
                                >
                                  <span aria-hidden="true">
                                    <UiGlyph icon="spark" />
                                  </span>
                                  {aiImprovingCell?.id === task.id &&
                                  aiImprovingCell.field === "title"
                                    ? "AI iyilestiriyor..."
                                    : "AI ile metni iyilestir"}
                                </button>
                                <input
                                  className="inline-cell-input"
                                  autoFocus
                                  type="text"
                                  value={editingValue}
                                  onChange={(event) =>
                                    onSetEditingValue(event.target.value)
                                  }
                                  onBlur={() => {
                                    void onSaveCellEdit();
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      void onSaveCellEdit();
                                    }
                                    if (event.key === "Escape") {
                                      onCancelCellEdit();
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <input
                                className="inline-cell-input"
                                autoFocus
                                type="text"
                                value={editingValue}
                                onChange={(event) =>
                                  onSetEditingValue(event.target.value)
                                }
                                onBlur={() => {
                                  void onSaveCellEdit();
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    void onSaveCellEdit();
                                  }
                                  if (event.key === "Escape") {
                                    onCancelCellEdit();
                                  }
                                }}
                              />
                            )
                          ) : column.field === "title" ? (
                            <>
                              <div className="task-title-stack">
                                <span
                                  className="task-title-text"
                                  title={task.title}
                                >
                                  {task.title}
                                </span>
                              </div>
                              <div className="cell-preview">
                                <div className="cell-preview-body">
                                  {task.title}
                                </div>
                                <div className="cell-preview-actions">
                                  <button
                                    type="button"
                                    className="task-action-btn task-action-ai-btn"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void onAiImproveTaskField(
                                        task.id,
                                        "title",
                                      );
                                    }}
                                    disabled={
                                      aiImprovingCell?.id === task.id &&
                                      aiImprovingCell.field === "title"
                                    }
                                  >
                                    <span aria-hidden="true">
                                      <UiGlyph icon="spark" />
                                    </span>
                                    {aiImprovingCell?.id === task.id &&
                                    aiImprovingCell.field === "title"
                                      ? "AI iyilestiriyor..."
                                      : "AI ile metni iyilestir"}
                                  </button>
                                  {viewMode === "archive" ? (
                                    archivedTaskIds.includes(task.id) ? (
                                      <button
                                        type="button"
                                        className="task-action-btn"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          onRestoreTask(task.id);
                                        }}
                                      >
                                        <span aria-hidden="true">
                                          <UiGlyph icon="restore" />
                                        </span>
                                        Geri Getir
                                      </button>
                                    ) : (
                                      <span className="task-action-note">
                                        <span aria-hidden="true">
                                          <UiGlyph icon="archive" />
                                        </span>
                                        Çalışmayı geri getir
                                      </span>
                                    )
                                  ) : (
                                    <button
                                      type="button"
                                      className="task-action-btn"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        onArchiveTask(task.id);
                                      }}
                                    >
                                      <span aria-hidden="true">
                                        <UiGlyph icon="archive" />
                                      </span>
                                      Arşivle
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="task-action-btn danger"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onDeleteTask(task.id);
                                    }}
                                  >
                                    <span aria-hidden="true">
                                      <UiGlyph icon="trash" />
                                    </span>
                                    Sil
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : column.field === "status" ? (
                            <span
                              className={`task-badge task-status-badge ${
                                statusClassNames[task.status ?? "Yapılacak"] ??
                                ""
                              }`}
                            >
                              {task.status ?? "Yapılacak"}
                            </span>
                          ) : column.field === "priority" ? (
                            <span
                              className={`task-badge task-priority-badge ${
                                priorityClassNames[task.priority] ?? ""
                              }`}
                            >
                              {task.priority}
                            </span>
                          ) : (
                            task[column.field as keyof Task]
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
              </React.Fragment>
            );
          });
        })()
      )}
    </tbody>
  );
}
