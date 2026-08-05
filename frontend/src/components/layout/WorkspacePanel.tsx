import React from "react";
import TasksTable from "../tasks/TasksTable";
import ArchivedWorkspacesSection from "./workspace/ArchivedWorkspacesSection";
import WorkspaceContextBar from "./workspace/WorkspaceContextBar";
import WorkspacePanelHeader from "./workspace/WorkspacePanelHeader";
import type { TableDensity, ViewMode, Workspace } from "../../types";

type WorkspacePanelProps = {
  viewMode: ViewMode;
  selectedWorkspace: Workspace;
  query: string;
  onQueryChange: (value: string) => void;
  archivedWorkspaces: Workspace[];
  error: string | null;
  showForm: boolean;
  tableDensity: TableDensity;
  onSetTableDensity: (density: TableDensity) => void;
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
  tableDensity,
  onSetTableDensity,
  onToggleShowForm,
  onRestoreWorkspace,
  tasksTableProps,
}: WorkspacePanelProps) {
  return (
    <main className="workspace">
      <WorkspaceContextBar
        viewMode={viewMode}
        selectedWorkspace={selectedWorkspace}
        tableDensity={tableDensity}
        onSetTableDensity={onSetTableDensity}
      />

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

        {error && <div className="toast-error">{error}</div>}

        <TasksTable {...tasksTableProps} />
      </section>
    </main>
  );
}
