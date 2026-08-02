import React from "react";
import { UiGlyph } from "../../ui/Icons";
import type { ViewMode, Workspace } from "../../../types";

type WorkspaceContextBarProps = {
  viewMode: ViewMode;
  selectedWorkspace: Workspace;
};

export default function WorkspaceContextBar({
  viewMode,
  selectedWorkspace,
}: WorkspaceContextBarProps) {
  return (
    <section className="workspace-actions">
      <div>
        <div className="workspace-kicker">
          <span className="inline-glyph" aria-hidden="true">
            <UiGlyph icon="spark" />
          </span>
          {viewMode === "archive" ? "Geçmiş görünümü" : "Aktif alan"}
        </div>
        <div className="workspace-selected-name">
          {viewMode === "archive" ? "Arşiv" : selectedWorkspace.name}
        </div>
      </div>
    </section>
  );
}
