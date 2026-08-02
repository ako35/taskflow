import React from "react";
import type { Workspace } from "../../../types";

type ArchivedWorkspacesSectionProps = {
  archivedWorkspaces: Workspace[];
  onRestoreWorkspace: (workspaceId: string) => void;
};

export default function ArchivedWorkspacesSection({
  archivedWorkspaces,
  onRestoreWorkspace,
}: ArchivedWorkspacesSectionProps) {
  return (
    <div className="archive-workspaces">
      <strong>Arşivlenen Çalışma Alanları</strong>
      {archivedWorkspaces.length === 0 ? (
        <p>Henüz arşivlenen çalışma alanı yok.</p>
      ) : (
        <div className="archive-workspace-list">
          {archivedWorkspaces.map((workspace) => (
            <div key={workspace.id} className="archive-workspace-chip">
              <span>{workspace.name}</span>
              <button
                type="button"
                className="archive-restore-btn"
                onClick={() => onRestoreWorkspace(workspace.id)}
              >
                Geri Getir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
