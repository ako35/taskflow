import React from "react";
import { UiGlyph } from "../ui/Icons";
import SidebarFooter from "./sidebar/SidebarFooter";
import WorkspaceCreateForm from "./sidebar/WorkspaceCreateForm";
import WorkspaceList from "./sidebar/WorkspaceList";
import type { ThemeMode, ViewMode, Workspace } from "../../types";

type AppSidebarProps = {
  activeWorkspaces: Workspace[];
  selectedWorkspace: Workspace;
  editingWorkspaceId: string | null;
  editingWorkspaceName: string;
  workspaceMenuOpenId: string | null;
  showWorkspaceInput: boolean;
  newWorkspaceName: string;
  viewMode: ViewMode;
  settingsMenuOpen: boolean;
  themeMenuOpen: boolean;
  themeMode: ThemeMode;
  settingsMenuRef: React.RefObject<HTMLDivElement | null>;
  onToggleWorkspaceInput: () => void;
  onNewWorkspaceNameChange: (value: string) => void;
  onCreateWorkspace: () => void;
  onCancelWorkspaceCreate: () => void;
  onStartWorkspaceRename: (workspaceId: string) => void;
  onEditingWorkspaceNameChange: (value: string) => void;
  onSubmitWorkspaceRename: () => void;
  onCancelWorkspaceRename: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onToggleWorkspaceMenu: (workspaceId: string) => void;
  onArchiveWorkspace: (workspaceId: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onSetArchiveView: () => void;
  onToggleSettingsMenu: () => void;
  onToggleThemeMenu: () => void;
  onSetThemeMode: (mode: ThemeMode) => void;
  onSignOut: () => void;
};

export default function AppSidebar({
  activeWorkspaces,
  selectedWorkspace,
  editingWorkspaceId,
  editingWorkspaceName,
  workspaceMenuOpenId,
  showWorkspaceInput,
  newWorkspaceName,
  viewMode,
  settingsMenuOpen,
  themeMenuOpen,
  themeMode,
  settingsMenuRef,
  onToggleWorkspaceInput,
  onNewWorkspaceNameChange,
  onCreateWorkspace,
  onCancelWorkspaceCreate,
  onStartWorkspaceRename,
  onEditingWorkspaceNameChange,
  onSubmitWorkspaceRename,
  onCancelWorkspaceRename,
  onSelectWorkspace,
  onToggleWorkspaceMenu,
  onArchiveWorkspace,
  onDeleteWorkspace,
  onSetArchiveView,
  onToggleSettingsMenu,
  onToggleThemeMenu,
  onSetThemeMode,
  onSignOut,
}: AppSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <strong>TaskFlow</strong>
        <span>Çalışma akışları</span>
      </div>

      <div className="workspace-switcher">
        <div className="workspace-switcher-head">
          <span>
            <span className="inline-glyph" aria-hidden="true">
              <UiGlyph icon="spark" />
            </span>
            Çalışma alanları
          </span>
          <button
            type="button"
            className="workspace-add-btn"
            aria-label="Yeni çalışma alanı ekle"
            onClick={onToggleWorkspaceInput}
          >
            <UiGlyph icon="plus" />
          </button>
        </div>

        {showWorkspaceInput ? (
          <WorkspaceCreateForm
            value={newWorkspaceName}
            onValueChange={onNewWorkspaceNameChange}
            onCreate={onCreateWorkspace}
            onCancel={onCancelWorkspaceCreate}
          />
        ) : null}

        <WorkspaceList
          workspaces={activeWorkspaces}
          selectedWorkspace={selectedWorkspace}
          editingWorkspaceId={editingWorkspaceId}
          editingWorkspaceName={editingWorkspaceName}
          workspaceMenuOpenId={workspaceMenuOpenId}
          onEditingWorkspaceNameChange={onEditingWorkspaceNameChange}
          onSubmitWorkspaceRename={onSubmitWorkspaceRename}
          onCancelWorkspaceRename={onCancelWorkspaceRename}
          onSelectWorkspace={onSelectWorkspace}
          onToggleWorkspaceMenu={onToggleWorkspaceMenu}
          onStartWorkspaceRename={onStartWorkspaceRename}
          onArchiveWorkspace={onArchiveWorkspace}
          onDeleteWorkspace={onDeleteWorkspace}
        />
      </div>

      <SidebarFooter
        viewMode={viewMode}
        settingsMenuOpen={settingsMenuOpen}
        themeMenuOpen={themeMenuOpen}
        themeMode={themeMode}
        settingsMenuRef={settingsMenuRef}
        onSetArchiveView={onSetArchiveView}
        onToggleSettingsMenu={onToggleSettingsMenu}
        onToggleThemeMenu={onToggleThemeMenu}
        onSetThemeMode={onSetThemeMode}
        onSignOut={onSignOut}
      />
    </aside>
  );
}
