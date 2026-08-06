import React from "react";
import { UiGlyph } from "../ui/Icons";
import type { WorkspaceInvitationsOverview } from "../../types";

type MembersPanelModalProps = {
  open: boolean;
  workspaceName: string;
  currentUserEmail: string;
  invitationsOverview: WorkspaceInvitationsOverview;
  invitationsLoading: boolean;
  invitationsError: string | null;
  settingsInviteEmail: string;
  settingsInviteSending: boolean;
  settingsInviteStatus: string | null;
  removingMemberUserId: number | null;
  onInviteEmailChange: (value: string) => void;
  onSendInvite: () => void;
  onRemoveWorkspaceMember: (memberUserId: number) => void;
  onClose: () => void;
};

export default function MembersPanelModal({
  open,
  workspaceName,
  currentUserEmail,
  invitationsOverview,
  invitationsLoading,
  invitationsError,
  settingsInviteEmail,
  settingsInviteSending,
  settingsInviteStatus,
  removingMemberUserId,
  onInviteEmailChange,
  onSendInvite,
  onRemoveWorkspaceMember,
  onClose,
}: MembersPanelModalProps) {
  if (!open) {
    return null;
  }

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

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  return (
    <div
      className="workspace-create-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="members-panel-title"
      onClick={onClose}
    >
      <div
        className="workspace-create-modal members-panel-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-title-row">
          <div>
            <h2 id="members-panel-title">Üyeler</h2>
            <p>
              <strong>{workspaceName}</strong> calisma alanindaki davet ve uye
              bilgilerini yonetin.
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            aria-label="Kapat"
            onClick={onClose}
          >
            <UiGlyph icon="close" />
          </button>
        </div>

        <div className="members-panel-content">
          <div className="settings-invite-management members-panel-section">
            <div className="settings-popover-title">Davet Gonder</div>
            <div className="settings-invite-actions">
              <input
                type="email"
                value={settingsInviteEmail}
                placeholder="ornek@firma.com"
                onChange={(event) => onInviteEmailChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onSendInvite();
                  }
                }}
                disabled={settingsInviteSending}
              />
              <button
                type="button"
                className="btn-primary settings-invite-send-btn"
                onClick={onSendInvite}
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

          <div className="settings-invitations members-panel-section">
            <div className="settings-popover-title">Davetli Üyeler</div>
            {invitationsLoading ? (
              <p className="settings-members-note">Davetler yukleniyor...</p>
            ) : invitationsError ? (
              <p className="settings-members-error">{invitationsError}</p>
            ) : (
              <div className="settings-invitation-groups">
                <section className="settings-invitation-group">
                  <h5>Davet Gonderilen</h5>
                  {invitationsOverview.pending.length === 0 ? (
                    <p className="settings-members-note">Bekleyen davet yok.</p>
                  ) : (
                    <div className="settings-members-list">
                      {invitationsOverview.pending.map((invite) => (
                        <div key={invite.id} className="settings-member-item">
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
                      {invitationsOverview.accepted.map((invite) => {
                        const isMainUser =
                          normalizeEmail(invite.email) ===
                          normalizeEmail(currentUserEmail);
                        const memberRole = isMainUser ? "Yonetici" : "Uye";

                        return (
                          <div key={invite.id} className="settings-member-item">
                            <div className="settings-member-head">
                              <div className="settings-member-identity">
                                <strong>{renderInviteName(invite)}</strong>
                                <span className="settings-member-role">
                                  {memberRole}
                                </span>
                              </div>
                              {invite.userProfileId && !isMainUser ? (
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
                                  {removingMemberUserId === invite.userProfileId
                                    ? "Cikariliyor..."
                                    : "Uye Cikar"}
                                </button>
                              ) : null}
                            </div>
                            <span>{invite.email}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
