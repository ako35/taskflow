import React from "react";
import TasksTable from "../tasks/TasksTable";
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
} from "../../types";

type WorkspacePanelProps = {
  viewMode: ViewMode;
  selectedWorkspace: Workspace;
  query: string;
  onQueryChange: (value: string) => void;
  archivedWorkspaces: Workspace[];
  error: string | null;
  onDismissError: () => void;
  showForm: boolean;
  tableDensity: TableDensity;
  onSetTableDensity: (density: TableDensity) => void;
  onToggleShowForm: () => void;
  onRestoreWorkspace: (workspaceId: string) => void;
  tasksTableProps: React.ComponentProps<typeof TasksTable>;
  selectedTask: Task | null;
  taskDetailsOpen: boolean;
  comments: TaskComment[];
  commentsLoading: boolean;
  commentDraft: string;
  commentSubmitting: boolean;
  taskUpdating: boolean;
  currentUser: User | null;
  isWorkspaceOwner: boolean;
  onCloseTaskDetails: () => void;
  onCommentDraftChange: (value: string) => void;
  onSubmitComment: () => void;
  onDeleteComment: (commentId: number) => void;
  onSaveTaskDetails: (payload: {
    title: string;
    status: string;
    priority: string;
  }) => Promise<void>;
};

export default function WorkspacePanel({
  viewMode,
  selectedWorkspace,
  query,
  onQueryChange,
  archivedWorkspaces,
  error,
  onDismissError,
  showForm,
  tableDensity,
  onSetTableDensity,
  onToggleShowForm,
  onRestoreWorkspace,
  tasksTableProps,
  selectedTask,
  taskDetailsOpen,
  comments,
  commentsLoading,
  commentDraft,
  commentSubmitting,
  taskUpdating,
  currentUser,
  isWorkspaceOwner,
  onCloseTaskDetails,
  onCommentDraftChange,
  onSubmitComment,
  onDeleteComment,
  onSaveTaskDetails,
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
            showAddButton={viewMode === "workspaces"}
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

          <TasksTable {...tasksTableProps} />
        </section>

        {viewMode === "workspaces" ? (
          <TaskDetailsPanel
            open={taskDetailsOpen}
            task={selectedTask}
            currentUser={currentUser}
            isWorkspaceOwner={isWorkspaceOwner}
            comments={comments}
            commentsLoading={commentsLoading}
            commentDraft={commentDraft}
            commentSubmitting={commentSubmitting}
            taskUpdating={taskUpdating}
            onClose={onCloseTaskDetails}
            onCommentDraftChange={onCommentDraftChange}
            onSubmitComment={onSubmitComment}
            onDeleteComment={onDeleteComment}
            onSaveTaskDetails={onSaveTaskDetails}
          />
        ) : null}
      </div>
    </main>
  );
}
