import React from "react";
import { SidebarGlyph, UiGlyph } from "../../ui/Icons";
import type { ThemeMode, ViewMode, WorkspaceMemberInfo } from "../../../types";

type SidebarFooterProps = {
  viewMode: ViewMode;
  settingsMenuOpen: boolean;
  themeMenuOpen: boolean;
  themeMode: ThemeMode;
  invitedMembers: WorkspaceMemberInfo[];
  invitedMembersLoading: boolean;
  invitedMembersError: string | null;
  settingsMenuRef: React.RefObject<HTMLDivElement | null>;
  onSetArchiveView: () => void;
  onToggleSettingsMenu: () => void;
  onToggleThemeMenu: () => void;
  onSetThemeMode: (mode: ThemeMode) => void;
  onSignOut: () => void;
};

export default function SidebarFooter({
  viewMode,
  settingsMenuOpen,
  themeMenuOpen,
  themeMode,
  invitedMembers,
  invitedMembersLoading,
  invitedMembersError,
  settingsMenuRef,
  onSetArchiveView,
  onToggleSettingsMenu,
  onToggleThemeMenu,
  onSetThemeMode,
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
              <button
                type="button"
                className="theme-menu-row"
                onClick={onToggleThemeMenu}
              >
                <span className="settings-popover-title">Tema</span>
                <span
                  className={`settings-popover-chevron ${themeMenuOpen ? "open" : ""}`}
                  aria-hidden="true"
                >
                  <UiGlyph icon="chevron-down" />
                </span>
              </button>
              {themeMenuOpen && (
                <div className="theme-menu-options">
                  <button
                    type="button"
                    className={`theme-option ${themeMode === "light" ? "active" : ""}`}
                    onClick={() => onSetThemeMode("light")}
                  >
                    <span>Açık</span>
                    {themeMode === "light" ? (
                      <span className="theme-option-check" aria-hidden="true">
                        <UiGlyph icon="check" />
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className={`theme-option ${themeMode === "dark" ? "active" : ""}`}
                    onClick={() => onSetThemeMode("dark")}
                  >
                    <span>Koyu</span>
                    {themeMode === "dark" ? (
                      <span className="theme-option-check" aria-hidden="true">
                        <UiGlyph icon="check" />
                      </span>
                    ) : null}
                  </button>
                </div>
              )}

              <div className="settings-members">
                <div className="settings-popover-title">Davetli Uyeler</div>
                {invitedMembersLoading ? (
                  <p className="settings-members-note">Uyeler yukleniyor...</p>
                ) : invitedMembersError ? (
                  <p className="settings-members-error">
                    {invitedMembersError}
                  </p>
                ) : invitedMembers.length === 0 ? (
                  <p className="settings-members-note">
                    Henuz davetli uye yok.
                  </p>
                ) : (
                  <div className="settings-members-list">
                    {invitedMembers.map((member) => {
                      const fullName = [member.firstName, member.lastName]
                        .filter(Boolean)
                        .join(" ")
                        .trim();

                      return (
                        <div key={member.id} className="settings-member-item">
                          <strong>{fullName || member.email}</strong>
                          <span>{member.email}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
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
