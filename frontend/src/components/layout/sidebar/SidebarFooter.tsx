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
  onSettingsInviteEmailChange,
  onSendSettingsInvite,
  onRemoveWorkspaceMember,
  onSignOut,
}: SidebarFooterProps) {
  const renderInviteName = (invite: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  }) => {
    const fullName = [invite.firstName, invite.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return fullName || invite.email;
  };

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

              <div className="settings-invite-management">
                <div className="settings-popover-title">Davet Gonder</div>
                <div className="settings-invite-actions">
                  <input
                    type="email"
                    value={settingsInviteEmail}
                    placeholder="ornek@firma.com"
                    onChange={(event) =>
                      onSettingsInviteEmailChange(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        onSendSettingsInvite();
                      }
                    }}
                    disabled={settingsInviteSending}
                  />
                  <button
                    type="button"
                    className="btn-primary settings-invite-send-btn"
                    onClick={onSendSettingsInvite}
                    disabled={settingsInviteSending}
                  >
                    {settingsInviteSending ? "Gonderiliyor..." : "Davet Gonder"}
                  </button>
                </div>
                {settingsInviteStatus ? (
                  <p
                    className="settings-members-note settings-invite-status"
                    role="status"
                  >
                    {settingsInviteStatus}
                  </p>
                ) : null}
              </div>

              <div className="settings-invitations">
                <div className="settings-popover-title">Davetli Uyeler</div>
                {invitationsLoading ? (
                  <p className="settings-members-note">
                    Davetler yukleniyor...
                  </p>
                ) : invitationsError ? (
                  <p className="settings-members-error">{invitationsError}</p>
                ) : (
                  <div className="settings-invitation-groups">
                    <section className="settings-invitation-group">
                      <h5>Davet Gonderilen</h5>
                      {invitationsOverview.pending.length === 0 ? (
                        <p className="settings-members-note">
                          Bekleyen davet yok.
                        </p>
                      ) : (
                        <div className="settings-members-list">
                          {invitationsOverview.pending.map((invite) => (
                            <div
                              key={invite.id}
                              className="settings-member-item"
                            >
                              <strong>{renderInviteName(invite)}</strong>
                              <span>{invite.email}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="settings-invitation-group">
                      <h5>Daveti Kabul Edenler</h5>
                      {invitationsOverview.accepted.length === 0 ? (
                        <p className="settings-members-note">
                          Kabul edilen davet yok.
                        </p>
                      ) : (
                        <div className="settings-members-list">
                          {invitationsOverview.accepted.map((invite) => (
                            <div
                              key={invite.id}
                              className="settings-member-item"
                            >
                              <div className="settings-member-head">
                                <strong>{renderInviteName(invite)}</strong>
                                {invite.userProfileId ? (
                                  <button
                                    type="button"
                                    className="settings-member-remove-btn"
                                    onClick={() =>
                                      onRemoveWorkspaceMember(
                                        invite.userProfileId as number,
                                      )
                                    }
                                    disabled={
                                      removingMemberUserId ===
                                      invite.userProfileId
                                    }
                                  >
                                    {removingMemberUserId ===
                                    invite.userProfileId
                                      ? "Cikariliyor..."
                                      : "Uye Cikar"}
                                  </button>
                                ) : null}
                              </div>
                              <span>{invite.email}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
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
