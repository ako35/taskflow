import React from "react";
import { SidebarGlyph } from "../../ui/Icons";
import type {
  ThemeMode,
  ViewMode,
  WorkspaceInvitationsOverview,
} from "../../../types";

type SidebarFooterProps = {
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
  onSetArchiveView: () => void;
  onToggleSettingsMenu: () => void;
  onToggleThemeMenu: () => void;
  onSetThemeMode: (mode: ThemeMode) => void;
  onOpenMembersPanel: () => void;
  onSettingsInviteEmailChange: (value: string) => void;
  onSendSettingsInvite: () => void;
  onRemoveWorkspaceMember: (memberUserId: number) => void;
  onSignOut: () => void;
};

export default function SidebarFooter({
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
  onSetArchiveView,
  onToggleSettingsMenu,
  onToggleThemeMenu,
  onSetThemeMode,
  onOpenMembersPanel,
  onSettingsInviteEmailChange,
  onSendSettingsInvite,
  onRemoveWorkspaceMember,
  onSignOut,
}: SidebarFooterProps) {
  return (
    <div className="sidebar-footer">
      <div className="sidebar-links">
        <button
          type="button"
          className={`sidebar-link ${viewMode === "archive" ? "active" : ""}`}
          onClick={onSetArchiveView}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            <SidebarGlyph icon="archive" />
          </span>
          Arşiv
        </button>
        <div className="settings-block" ref={settingsMenuRef}>
          <button
            type="button"
            className="sidebar-link"
            onClick={onToggleSettingsMenu}
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              <SidebarGlyph icon="settings" />
            </span>
            Ayarlar
          </button>
          {settingsMenuOpen && (
            <div className="settings-popover">
              <div className="settings-theme-section">
                <span className="settings-popover-title">Tema</span>
                <div
                  className="settings-theme-tabs"
                  role="tablist"
                  aria-label="Tema secimi"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={themeMode === "light"}
                    className={`settings-theme-tab ${themeMode === "light" ? "active" : ""}`}
                    onClick={() => onSetThemeMode("light")}
                  >
                    Acik
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={themeMode === "dark"}
                    className={`settings-theme-tab ${themeMode === "dark" ? "active" : ""}`}
                    onClick={() => onSetThemeMode("dark")}
                  >
                    Koyu
                  </button>
                </div>
              </div>

              <div className="settings-members-entry">
                <div className="settings-popover-title">Uyeler</div>
                <button
                  type="button"
                  className="settings-members-open-btn"
                  onClick={onOpenMembersPanel}
                >
                  Uyeleri Ac
                </button>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          className="sidebar-link danger-link"
          onClick={onSignOut}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            <SidebarGlyph icon="logout" />
          </span>
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}
