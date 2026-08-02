import React from "react";
import { UiGlyph } from "../../ui/Icons";
import type { ViewMode, Workspace } from "../../../types";

type WorkspacePanelHeaderProps = {
  viewMode: ViewMode;
  selectedWorkspace: Workspace;
  query: string;
  onQueryChange: (value: string) => void;
};

export default function WorkspacePanelHeader({
  viewMode,
  selectedWorkspace,
  query,
  onQueryChange,
}: WorkspacePanelHeaderProps) {
  return (
    <div className="panel-header compact">
      <div>
        <div className="panel-kicker">
          <span className="inline-glyph" aria-hidden="true">
            <UiGlyph icon="spark" />
          </span>
          Canlı pano
        </div>
        <h2>
          {viewMode === "archive"
            ? "Arşiv Görevleri"
            : `${selectedWorkspace.name} Görevleri`}
        </h2>
        <p>
          {viewMode === "archive"
            ? "Arşivlenen çalışma alanları ve görevler burada listelenir."
            : "Bu çalışma alanı içindeki görevleri görüntülüyorsunuz."}
        </p>
      </div>
      <div className="panel-actions">
        <label className="search-shell" aria-label="Görev ara">
          <span className="search-icon" aria-hidden="true">
            <UiGlyph icon="search" />
          </span>
          <input
            className="search"
            placeholder="Bul: başlık, açıklama..."
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
