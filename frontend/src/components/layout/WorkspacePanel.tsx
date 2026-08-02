import React from "react";
import TasksTable from "../tasks/TasksTable";
import ArchivedWorkspacesSection from "./workspace/ArchivedWorkspacesSection";
import WorkspaceContextBar from "./workspace/WorkspaceContextBar";
import WorkspacePanelHeader from "./workspace/WorkspacePanelHeader";
import type { ViewMode, Workspace } from "../../types";

type WorkspacePanelProps = {
  viewMode: ViewMode;
  selectedWorkspace: Workspace;
  query: string;
  onQueryChange: (value: string) => void;
  archivedWorkspaces: Workspace[];
  error: string | null;
  showForm: boolean;
  onToggleShowForm: () => void;
  onRestoreWorkspace: (workspaceId: string) => void;
  tasksTableProps: React.ComponentProps<typeof TasksTable>;
};

export default function WorkspacePanel({
  viewMode,
  selectedWorkspace,
  query,
  onQueryChange,
  archivedWorkspaces,
  error,
  showForm,
  onToggleShowForm,
  onRestoreWorkspace,
  tasksTableProps,
}: WorkspacePanelProps) {
  return (
    <main className="workspace">
      <WorkspaceContextBar
        viewMode={viewMode}
        selectedWorkspace={selectedWorkspace}
      />

      <section className="tasks-panel compact">
        <WorkspacePanelHeader
          viewMode={viewMode}
          selectedWorkspace={selectedWorkspace}
          query={query}
          onQueryChange={onQueryChange}
        />

        {viewMode === "archive" ? (
          <ArchivedWorkspacesSection
            archivedWorkspaces={archivedWorkspaces}
            onRestoreWorkspace={onRestoreWorkspace}
          />
        ) : null}

        {error && <div className="toast-error">{error}</div>}

        {viewMode === "workspaces" && (
          <div className="table-action-frame">
            <button className="btn-primary" onClick={onToggleShowForm}>
              {showForm ? "Formu Gizle" : "Görev Ekle"}
            </button>
          </div>
        )}

        <TasksTable {...tasksTableProps} />
      </section>
    </main>
  );
}
