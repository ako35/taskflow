import React from "react";
import { UiGlyph, WorkspaceGlyph } from "../../ui/Icons";
import type { Workspace } from "../../../types";

type WorkspaceListProps = {
  workspaces: Workspace[];
  selectedWorkspace: Workspace;
  editingWorkspaceId: string | null;
  editingWorkspaceName: string;
  workspaceMenuOpenId: string | null;
  onEditingWorkspaceNameChange: (value: string) => void;
  onSubmitWorkspaceRename: () => void;
  onCancelWorkspaceRename: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onToggleWorkspaceMenu: (workspaceId: string) => void;
  onStartWorkspaceRename: (workspaceId: string) => void;
  onArchiveWorkspace: (workspaceId: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
};

export default function WorkspaceList({
  workspaces,
  selectedWorkspace,
  editingWorkspaceId,
  editingWorkspaceName,
  workspaceMenuOpenId,
  onEditingWorkspaceNameChange,
  onSubmitWorkspaceRename,
  onCancelWorkspaceRename,
  onSelectWorkspace,
  onToggleWorkspaceMenu,
  onStartWorkspaceRename,
  onArchiveWorkspace,
  onDeleteWorkspace,
}: WorkspaceListProps) {
  return (
    <nav className="sidebar-nav">
      {workspaces.map((workspace) => (
        <div
          key={workspace.id}
          className={`workspace-item-row ${selectedWorkspace.id === workspace.id ? "active" : ""}`}
        >
          {editingWorkspaceId === workspace.id ? (
            <div className="sidebar-item active workspace-editing-row">
              <span
                className="workspace-icon"
                style={{ backgroundColor: workspace.color }}
                aria-hidden="true"
              >
                <WorkspaceGlyph icon={workspace.icon} />
              </span>
              <input
                autoFocus
                className="workspace-rename-input"
                value={editingWorkspaceName}
                onChange={(event) =>
                  onEditingWorkspaceNameChange(event.target.value)
                }
                onBlur={onSubmitWorkspaceRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onSubmitWorkspaceRename();
                  }
                  if (event.key === "Escape") {
                    onCancelWorkspaceRename();
                  }
                }}
              />
            </div>
          ) : (
            <button
              className={`sidebar-item ${selectedWorkspace.id === workspace.id ? "active" : ""}`}
              onClick={() => onSelectWorkspace(workspace.id)}
            >
              <span
                className="workspace-icon"
                style={{ backgroundColor: workspace.color }}
                aria-hidden="true"
              >
                <WorkspaceGlyph icon={workspace.icon} />
              </span>
              <span className="workspace-name">{workspace.name}</span>
            </button>
          )}

          <button
            type="button"
            className={`workspace-menu-btn ${workspaceMenuOpenId === workspace.id ? "open" : ""}`}
            aria-label={`${workspace.name} seçenekleri`}
            onClick={() => onToggleWorkspaceMenu(workspace.id)}
          >
            <UiGlyph icon="dots" />
          </button>

          {workspaceMenuOpenId === workspace.id && (
            <div className="workspace-menu-dropdown">
              <button
                type="button"
                className="workspace-menu-action"
                onClick={() => onStartWorkspaceRename(workspace.id)}
              >
                Yeniden adlandır
              </button>
              <button
                type="button"
                className="workspace-menu-action"
                onClick={() => onArchiveWorkspace(workspace.id)}
              >
                Arşiv
              </button>
              <button
                type="button"
                className="workspace-menu-action workspace-menu-danger"
                onClick={() => onDeleteWorkspace(workspace.id)}
              >
                Sil
              </button>
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
