import React from "react";
import { UiGlyph } from "../../ui/Icons";

type WorkspacePanelHeaderProps = {
  query: string;
  showForm: boolean;
  showAddButton: boolean;
  onToggleShowForm: () => void;
  onQueryChange: (value: string) => void;
};

export default function WorkspacePanelHeader({
  query,
  showForm,
  showAddButton,
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
            {showForm ? "Formu Gizle" : "Görev Ekle"}
          </button>
        ) : null}
        <label className="search-shell" aria-label="Görev ara">
          <span className="search-icon" aria-hidden="true">
            <UiGlyph icon="search" />
          </span>
          <input
            className="search"
            placeholder="Bul: görev başlığı..."
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
