import React from "react";
import { tableDisplayColumns } from "../../constants";
import type { Task, TaskForm, ViewMode } from "../../types";
import TasksTableBody from "./TasksTableBody";
import TasksTableHead from "./TasksTableHead";

type TasksTableProps = {
  tableWrapperRef: React.RefObject<HTMLDivElement | null>;
  showForm: boolean;
  form: TaskForm;
  columnWidths: Record<string, number>;
  loading: boolean;
  tasks: Task[];
  visibleTasks: Task[];
  viewMode: ViewMode;
  collapsedStatusGroups: Record<string, boolean>;
  statusGroupCounts: Record<string, number>;
  editingCell: { id: number; field: string } | null;
  editingValue: string;
  activePreviewCell: { id: number; field: "title" } | null;
  archivedTaskIds: number[];
  isFormValid: boolean;
  aiImprovingCell: { id: number; field: "title" } | null;
  onAiImproveTaskField: (taskId: number, field: "title") => Promise<void>;
  onAiImproveEditingCell: () => Promise<void>;
  onChangeForm: (
    field: keyof TaskForm,
  ) => (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  onSubmit: () => void;
  onHideForm: () => void;
  onToggleStatusGroup: (status: string) => void;
  onStartColumnResize: (
    field: string,
    event: React.MouseEvent<HTMLDivElement>,
  ) => void;
  onFitColumnToContent: (field: string) => void;
  onTogglePreviewCell: (id: number, field: "title") => void;
  onOpenTaskDetails: (task: Task) => void;
  onStartEditingCell: (task: Task, field: string) => void;
  onSetEditingValue: (value: string) => void;
  onSaveCellEdit: (nextValue?: string) => void | Promise<void>;
  onCancelCellEdit: () => void;
  onRestoreTask: (taskId: number) => void;
  onArchiveTask: (taskId: number) => void;
  onDeleteTask: (taskId: number) => void;
};

export default function TasksTable({
  tableWrapperRef,
  showForm,
  form,
  columnWidths,
  loading,
  tasks,
  visibleTasks,
  viewMode,
  collapsedStatusGroups,
  statusGroupCounts,
  editingCell,
  editingValue,
  activePreviewCell,
  archivedTaskIds,
  isFormValid,
  aiImprovingCell,
  onAiImproveTaskField,
  onAiImproveEditingCell,
  onChangeForm,
  onSubmit,
  onHideForm,
  onToggleStatusGroup,
  onStartColumnResize,
  onFitColumnToContent,
  onTogglePreviewCell,
  onOpenTaskDetails,
  onStartEditingCell,
  onSetEditingValue,
  onSaveCellEdit,
  onCancelCellEdit,
  onRestoreTask,
  onArchiveTask,
  onDeleteTask,
}: TasksTableProps) {
  const tableWidth = tableDisplayColumns.reduce((total, column) => {
    if (column.field === "__spacer") {
      return total;
    }

    return total + (columnWidths[column.field] ?? 0);
  }, 0);

  return (
    <div className="tasks-table-wrapper" ref={tableWrapperRef}>
      <table className="tasks-table" style={{ width: `${tableWidth}px` }}>
        <colgroup>
          {tableDisplayColumns.map((column) => (
            <col
              key={`col-${column.field}`}
              style={{
                width:
                  column.field === "__spacer"
                    ? "0px"
                    : `${columnWidths[column.field]}px`,
              }}
            />
          ))}
        </colgroup>
        <TasksTableHead
          showForm={showForm}
          form={form}
          columnWidths={columnWidths}
          loading={loading}
          isFormValid={isFormValid}
          onChangeForm={onChangeForm}
          onSubmit={onSubmit}
          onHideForm={onHideForm}
        />
        <TasksTableBody
          loading={loading}
          tasks={tasks}
          visibleTasks={visibleTasks}
          viewMode={viewMode}
          columnWidths={columnWidths}
          collapsedStatusGroups={collapsedStatusGroups}
          statusGroupCounts={statusGroupCounts}
          editingCell={editingCell}
          editingValue={editingValue}
          activePreviewCell={activePreviewCell}
          aiImprovingCell={aiImprovingCell}
          archivedTaskIds={archivedTaskIds}
          onToggleStatusGroup={onToggleStatusGroup}
          onStartColumnResize={onStartColumnResize}
          onFitColumnToContent={onFitColumnToContent}
          onTogglePreviewCell={onTogglePreviewCell}
          onOpenTaskDetails={onOpenTaskDetails}
          onStartEditingCell={onStartEditingCell}
          onSetEditingValue={onSetEditingValue}
          onSaveCellEdit={onSaveCellEdit}
          onAiImproveTaskField={onAiImproveTaskField}
          onAiImproveEditingCell={onAiImproveEditingCell}
          onCancelCellEdit={onCancelCellEdit}
          onRestoreTask={onRestoreTask}
          onArchiveTask={onArchiveTask}
          onDeleteTask={onDeleteTask}
        />
      </table>
    </div>
  );
}
