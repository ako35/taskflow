import React, { useEffect, useRef, useState } from "react";
import { UiGlyph } from "../../ui/Icons";
import type { TableDensity, ViewMode, Workspace } from "../../../types";

type WorkspaceContextBarProps = {
  viewMode: ViewMode;
  selectedWorkspace: Workspace;
  tableDensity: TableDensity;
  onSetTableDensity: (density: TableDensity) => void;
};

export default function WorkspaceContextBar({
  viewMode,
  selectedWorkspace,
  tableDensity,
  onSetTableDensity,
}: WorkspaceContextBarProps) {
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target)) {
        setIsViewMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const currentWorkspaceName =
    viewMode === "archive" ? "Arşiv" : selectedWorkspace.name;

  return (
    <section className="workspace-actions">
      <div className="workspace-title-block">
        <div className="workspace-kicker">
          <span className="inline-glyph" aria-hidden="true">
            <UiGlyph icon="spark" />
          </span>
          {viewMode === "archive" ? "Geçmiş görünümü" : "Aktif alan"}
        </div>
        <div className="workspace-selected-row">
          <div className="workspace-selected-name">{currentWorkspaceName}</div>

          <div className="workspace-view-menu-shell" ref={viewMenuRef}>
            <button
              type="button"
              className="workspace-view-trigger"
              aria-expanded={isViewMenuOpen}
              onClick={() => setIsViewMenuOpen((current) => !current)}
            >
              <span className="workspace-view-trigger-label">
                <span className="inline-glyph" aria-hidden="true">
                  <UiGlyph icon="layers" />
                </span>
                Tablo görünümü
              </span>
              <span
                className="workspace-view-trigger-chevron"
                aria-hidden="true"
              >
                <UiGlyph icon="chevron-down" />
              </span>
            </button>

            <div
              className={`workspace-view-menu ${isViewMenuOpen ? "open" : ""}`}
            >
              <button
                type="button"
                className={`workspace-view-option ${
                  tableDensity === "normal" ? "active" : ""
                }`}
                onClick={() => {
                  onSetTableDensity("normal");
                  setIsViewMenuOpen(false);
                }}
              >
                Normal görünüm
              </button>
              <button
                type="button"
                className={`workspace-view-option ${
                  tableDensity === "dense" ? "active" : ""
                }`}
                onClick={() => {
                  onSetTableDensity("dense");
                  setIsViewMenuOpen(false);
                }}
              >
                Daha kompakt
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
