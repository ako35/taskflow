import React from "react";
import TasksTable from "../tasks/TasksTable";
import KnowledgeTable from "../tasks/KnowledgeTable";
import AddTaskPanel from "../tasks/AddTaskPanel";
import ArchivedWorkspacesSection from "./workspace/ArchivedWorkspacesSection";
import TaskDetailsPanel from "./workspace/TaskDetailsPanel";
import WorkspaceContextBar from "./workspace/WorkspaceContextBar";
import WorkspacePanelHeader from "./workspace/WorkspacePanelHeader";
import { UiGlyph } from "../ui/Icons";
import type {
  TableDensity,
  Task,
  TaskComment,
  User,
  ViewMode,
  Workspace,
  WorkspaceMemberInfo,
} from "../../types";

type WorkspacePanelProps = {
  viewMode: ViewMode;
  selectedWorkspace: Workspace;
  query: string;
  onQueryChange: (value: string) => void;
  archivedWorkspaces: Workspace[];
  error: string | null;
  onDismissError: () => void;
  successMessage: string | null;
  onDismissSuccessMessage: () => void;
  showForm: boolean;
  tableDensity: TableDensity;
  onSetTableDensity: (density: TableDensity) => void;
  onToggleShowForm: () => void;
  onRestoreWorkspace: (workspaceId: string) => void;
  tasksTableProps: React.ComponentProps<typeof TasksTable>;
  assignableMembers: WorkspaceMemberInfo[];
  selectedTask: Task | null;
  taskDetailsOpen: boolean;
  comments: TaskComment[];
  commentsLoading: boolean;
  commentDraft: string;
  commentSubmitting: boolean;
  taskUpdating: boolean;
  currentUser: User | null;
  isWorkspaceOwner: boolean;
  idToken: string | null;
  onCloseTaskDetails: () => void;
  onUnauthorized: () => void;
  onCommentDraftChange: (value: string) => void;
  onSubmitComment: () => void;
  onDeleteComment: (commentId: number) => void;
  onSaveTaskDetails: (payload: {
    title?: string;
    status?: string;
    priority?: string;
    remindAt?: string | null;
    assigneeId?: number | null;
    assigneeDone?: boolean;
  }) => Promise<void>;
  onDeleteTask: (taskId: number) => void;
};

export default function WorkspacePanel({
  viewMode,
  selectedWorkspace,
  query,
  onQueryChange,
  archivedWorkspaces,
  error,
  onDismissError,
  successMessage,
  onDismissSuccessMessage,
  showForm,
  tableDensity,
  onSetTableDensity,
  onToggleShowForm,
  onRestoreWorkspace,
  tasksTableProps,
  assignableMembers,
  selectedTask,
  taskDetailsOpen,
  comments,
  commentsLoading,
  commentDraft,
  commentSubmitting,
  taskUpdating,
  currentUser,
  isWorkspaceOwner,
  idToken,
  onCloseTaskDetails,
  onUnauthorized,
  onCommentDraftChange,
  onSubmitComment,
  onDeleteComment,
  onSaveTaskDetails,
  onDeleteTask,
}: WorkspacePanelProps) {
  return (
    <main className="workspace">
      <WorkspaceContextBar
        viewMode={viewMode}
        selectedWorkspace={selectedWorkspace}
        tableDensity={tableDensity}
        onSetTableDensity={onSetTableDensity}
      />

      <div className={`workspace-main ${taskDetailsOpen ? "has-details" : ""}`}>
        <section className="tasks-panel compact">
          <WorkspacePanelHeader
            query={query}
            showForm={showForm}
            showAddButton={
              viewMode === "workspaces" &&
              (isWorkspaceOwner || selectedWorkspace.type === "KNOWLEDGE")
            }
            workspaceType={selectedWorkspace.type}
            onToggleShowForm={onToggleShowForm}
            onQueryChange={onQueryChange}
          />

          {viewMode === "archive" ? (
            <ArchivedWorkspacesSection
              archivedWorkspaces={archivedWorkspaces}
              onRestoreWorkspace={onRestoreWorkspace}
            />
          ) : null}

          {error && (
            <div className="toast-error" role="alert">
              <span>{error}</span>
              <button
                type="button"
                className="toast-error-close"
                aria-label="Uyarıyı kapat"
                title="Uyarıyı kapat"
                onClick={onDismissError}
              >
                <UiGlyph icon="close" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="toast-success" role="status">
              <span>{successMessage}</span>
              <button
                type="button"
                className="toast-success-close"
                aria-label="Bildirimi kapat"
                title="Bildirimi kapat"
                onClick={onDismissSuccessMessage}
              >
                <UiGlyph icon="close" />
              </button>
            </div>
          )}

          {showForm &&
          isWorkspaceOwner &&
          selectedWorkspace.type !== "KNOWLEDGE" ? (
            <AddTaskPanel
              form={tasksTableProps.form}
              loading={tasksTableProps.loading}
              isFormValid={tasksTableProps.isFormValid}
              members={assignableMembers}
              onChangeForm={tasksTableProps.onChangeForm}
              onClearReminder={tasksTableProps.onClearReminder}
              onSubmit={tasksTableProps.onSubmit}
              onHideForm={tasksTableProps.onHideForm}
            />
          ) : null}

          {selectedWorkspace.type === "KNOWLEDGE" &&
          viewMode === "workspaces" ? (
            <KnowledgeTable {...tasksTableProps} />
          ) : (
            <TasksTable {...tasksTableProps} />
          )}
        </section>

        {viewMode === "workspaces" && selectedWorkspace.type === "TASKS" ? (
          <TaskDetailsPanel
            open={taskDetailsOpen}
            task={selectedTask}
            currentUser={currentUser}
            isWorkspaceOwner={isWorkspaceOwner}
            members={assignableMembers}
            comments={comments}
            commentsLoading={commentsLoading}
            commentDraft={commentDraft}
            commentSubmitting={commentSubmitting}
            taskUpdating={taskUpdating}
            idToken={idToken}
            onClose={onCloseTaskDetails}
            onUnauthorized={onUnauthorized}
            onCommentDraftChange={onCommentDraftChange}
            onSubmitComment={onSubmitComment}
            onDeleteComment={onDeleteComment}
            onSaveTaskDetails={onSaveTaskDetails}
            onDeleteTask={onDeleteTask}
          />
        ) : null}
      </div>
    </main>
  );
}
