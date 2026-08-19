import React from "react";
import { UiGlyph } from "../../ui/Icons";
import type { Workspace } from "../../../types";

type WorkspacePanelHeaderProps = {
  query: string;
  showForm: boolean;
  showAddButton: boolean;
  workspaceType: Workspace["type"];
  onToggleShowForm: () => void;
  onQueryChange: (value: string) => void;
};

export default function WorkspacePanelHeader({
  query,
  showForm,
  showAddButton,
  workspaceType,
  onToggleShowForm,
  onQueryChange,
}: WorkspacePanelHeaderProps) {
  return (
    <div className="panel-header compact panel-header-toolbar-only">
      <div className="panel-actions">
        {showAddButton ? (
          <button
            type="button"
            className="btn-primary toolbar-add-task-btn"
            onClick={onToggleShowForm}
          >
            {showForm
              ? "Formu Gizle"
              : workspaceType === "KNOWLEDGE"
                ? "Bilgi Ekle"
                : "Görev Ekle"}
          </button>
        ) : null}
        <label
          className="search-shell"
          aria-label={workspaceType === "KNOWLEDGE" ? "Bilgi ara" : "Görev ara"}
        >
          <span className="search-icon" aria-hidden="true">
            <UiGlyph icon="search" />
          </span>
          <input
            className="search"
            placeholder={
              workspaceType === "KNOWLEDGE"
                ? "Bul: konu veya açıklama..."
                : "Bul: görev başlığı..."
            }
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
