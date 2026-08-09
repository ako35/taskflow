import React from "react";
import { SidebarGlyph, UiGlyph } from "../../ui/Icons";
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
                <button
                  type="button"
                  className="theme-menu-row settings-theme-trigger"
                  onClick={onToggleThemeMenu}
                  aria-expanded={themeMenuOpen}
                  aria-controls="settings-theme-options"
                >
                  <span className="settings-popover-title">Tema</span>
                  <span
                    className={`settings-popover-chevron ${themeMenuOpen ? "open" : ""}`}
                    aria-hidden="true"
                  >
                    <UiGlyph icon="chevron-down" />
                  </span>
                </button>
                {themeMenuOpen ? (
                  <div
                    id="settings-theme-options"
                    className="theme-menu-options settings-theme-options"
                    role="group"
                    aria-label="Tema secenekleri"
                  >
                    <button
                      type="button"
                      className={`theme-option ${themeMode === "light" ? "active" : ""}`}
                      aria-pressed={themeMode === "light"}
                      onClick={() => onSetThemeMode("light")}
                    >
                      <span className="theme-option-label">
                        <span className="sidebar-link-icon" aria-hidden="true">
                          <UiGlyph icon="sun" />
                        </span>
                        <span>Açık</span>
                      </span>
                      {themeMode === "light" ? (
                        <span className="theme-option-check" aria-hidden="true">
                          <UiGlyph icon="check" />
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      className={`theme-option ${themeMode === "dark" ? "active" : ""}`}
                      aria-pressed={themeMode === "dark"}
                      onClick={() => onSetThemeMode("dark")}
                    >
                      <span className="theme-option-label">
                        <span className="sidebar-link-icon" aria-hidden="true">
                          <UiGlyph icon="moon" />
                        </span>
                        <span>Koyu</span>
                      </span>
                      {themeMode === "dark" ? (
                        <span className="theme-option-check" aria-hidden="true">
                          <UiGlyph icon="check" />
                        </span>
                      ) : null}
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="settings-members-entry">
                <button
                  type="button"
                  className="settings-members-trigger"
                  onClick={onOpenMembersPanel}
                >
                  Üyeler
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
