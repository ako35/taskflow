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
  activePreviewCell: { id: number; field: "title" | "description" } | null;
  archivedTaskIds: number[];
  onToggleStatusGroup: (status: string) => void;
  onStartColumnResize: (
    field: string,
    event: React.MouseEvent<HTMLDivElement>,
  ) => void;
  onFitColumnToContent: (field: string) => void;
  onTogglePreviewCell: (id: number, field: "title" | "description") => void;
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
  archivedTaskIds,
  onToggleStatusGroup,
  onStartColumnResize,
  onFitColumnToContent,
  onTogglePreviewCell,
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
                              className={`resize-handle ${
                                column.field === "description"
                                  ? "resize-handle-left"
                                  : "resize-handle-right"
                              }`}
                              onMouseDown={(event) =>
                                onStartColumnResize(
                                  column.field === "description"
                                    ? "priority"
                                    : column.field,
                                  event,
                                )
                              }
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                onFitColumnToContent(
                                  column.field === "description"
                                    ? "priority"
                                    : column.field,
                                );
                              }}
                              aria-label={`Autofit ${
                                column.field === "description"
                                  ? "Önem"
                                  : column.label
                              } column`}
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
                              : column.field === "description"
                                ? "description-cell"
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
                              onTogglePreviewCell(task.id, "title");
                            }
                            if (column.field === "description") {
                              onTogglePreviewCell(task.id, "description");
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
                            ) : column.field === "description" ? (
                              <textarea
                                className="inline-cell-input inline-cell-textarea"
                                autoFocus
                                value={editingValue}
                                rows={Math.max(
                                  2,
                                  editingValue.split("\n").length,
                                )}
                                onChange={(event) =>
                                  onSetEditingValue(event.target.value)
                                }
                                onBlur={() => {
                                  void onSaveCellEdit();
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Escape") {
                                    onCancelCellEdit();
                                  }
                                  if (
                                    event.key === "Enter" &&
                                    (event.ctrlKey || event.metaKey)
                                  ) {
                                    event.preventDefault();
                                    void onSaveCellEdit();
                                  }
                                }}
                              />
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
                                <span className="task-title-text">
                                  {task.title}
                                </span>
                              </div>
                              <div className="cell-preview">{task.title}</div>
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
                          ) : column.field === "description" ? (
                            <>
                              <div className="task-description-stack">
                                <span className="description-text">
                                  {task.description || "-"}
                                </span>
                              </div>
                              <div className="cell-preview">
                                {task.description || "-"}
                              </div>
                              <div
                                className="task-actions"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {viewMode === "archive" ? (
                                  archivedTaskIds.includes(task.id) ? (
                                    <button
                                      type="button"
                                      className="task-action-btn"
                                      onClick={() => onRestoreTask(task.id)}
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
                                    onClick={() => onArchiveTask(task.id)}
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
                                  onClick={() => onDeleteTask(task.id)}
                                >
                                  <span aria-hidden="true">
                                    <UiGlyph icon="trash" />
                                  </span>
                                  Sil
                                </button>
                              </div>
                            </>
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
