import React from "react";
import { UiGlyph } from "../ui/Icons";
import SidebarFooter from "./sidebar/SidebarFooter";
import WorkspaceList from "./sidebar/WorkspaceList";
import type {
  ThemeMode,
  ViewMode,
  Workspace,
  WorkspaceInvitationsOverview,
} from "../../types";

type AppSidebarProps = {
  sidebarOpen: boolean;
  activeWorkspaces: Workspace[];
  selectedWorkspace: Workspace;
  editingWorkspaceId: string | null;
  editingWorkspaceName: string;
  workspaceMenuOpenId: string | null;
  viewMode: ViewMode;
  settingsMenuOpen: boolean;
  themeMenuOpen: boolean;
  themeMode: ThemeMode;
  invitationsOverview: WorkspaceInvitationsOverview;
  invitationsLoading: boolean;
  invitationsError: string | null;
  settingsInviteEmail: string;
  settingsInviteSending: boolean;
  settingsInviteStatus: string | null;
  removingMemberUserId: number | null;
  settingsMenuRef: React.RefObject<HTMLDivElement | null>;
  onToggleWorkspaceInput: () => void;
  onStartWorkspaceRename: (workspaceId: string) => void;
  onEditingWorkspaceNameChange: (value: string) => void;
  onSubmitWorkspaceRename: () => void;
  onCancelWorkspaceRename: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onToggleWorkspaceMenu: (workspaceId: string) => void;
  onArchiveWorkspace: (workspaceId: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onSetArchiveView: () => void;
  onToggleSidebar: () => void;
  onToggleSettingsMenu: () => void;
  onToggleThemeMenu: () => void;
  onSetThemeMode: (mode: ThemeMode) => void;
  onSettingsInviteEmailChange: (value: string) => void;
  onSendSettingsInvite: () => void;
  onRemoveWorkspaceMember: (memberUserId: number) => void;
  onSignOut: () => void;
};

export default function AppSidebar({
  sidebarOpen,
  activeWorkspaces,
  selectedWorkspace,
  editingWorkspaceId,
  editingWorkspaceName,
  workspaceMenuOpenId,
  viewMode,
  settingsMenuOpen,
  themeMenuOpen,
  themeMode,
  invitationsOverview,
  invitationsLoading,
  invitationsError,
  settingsInviteEmail,
  settingsInviteSending,
  settingsInviteStatus,
  removingMemberUserId,
  settingsMenuRef,
  onToggleWorkspaceInput,
  onStartWorkspaceRename,
  onEditingWorkspaceNameChange,
  onSubmitWorkspaceRename,
  onCancelWorkspaceRename,
  onSelectWorkspace,
  onToggleWorkspaceMenu,
  onArchiveWorkspace,
  onDeleteWorkspace,
  onSetArchiveView,
  onToggleSidebar,
  onToggleSettingsMenu,
  onToggleThemeMenu,
  onSetThemeMode,
  onSettingsInviteEmailChange,
  onSendSettingsInvite,
  onRemoveWorkspaceMember,
  onSignOut,
}: AppSidebarProps) {
  return (
    <aside className="sidebar" id="app-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <strong>TaskFlow</strong>
          <span>Çalışma akışları</span>
        </div>
        <button
          type="button"
          className={`sidebar-toggle sidebar-toggle-inline ${sidebarOpen ? "open" : ""}`}
          aria-label={sidebarOpen ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          onClick={onToggleSidebar}
        >
          <UiGlyph icon={sidebarOpen ? "chevron-left" : "chevron-right"} />
        </button>
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
        invitationsOverview={invitationsOverview}
        invitationsLoading={invitationsLoading}
        invitationsError={invitationsError}
        settingsInviteEmail={settingsInviteEmail}
        settingsInviteSending={settingsInviteSending}
        settingsInviteStatus={settingsInviteStatus}
        removingMemberUserId={removingMemberUserId}
        settingsMenuRef={settingsMenuRef}
        onSetArchiveView={onSetArchiveView}
        onToggleSettingsMenu={onToggleSettingsMenu}
        onToggleThemeMenu={onToggleThemeMenu}
        onSetThemeMode={onSetThemeMode}
        onSettingsInviteEmailChange={onSettingsInviteEmailChange}
        onSendSettingsInvite={onSendSettingsInvite}
        onRemoveWorkspaceMember={onRemoveWorkspaceMember}
        onSignOut={onSignOut}
      />
    </aside>
  );
}
