import React from "react";
import type { User } from "../../types";

type AppTopBarProps = {
  user: User;
  userInitials: string;
  profileMenuOpen: boolean;
  profileMenuRef: React.RefObject<HTMLDivElement | null>;
  onToggleProfileMenu: () => void;
  onSignOut: () => void;
};

export default function AppTopBar({
  user,
  userInitials,
  profileMenuOpen,
  profileMenuRef,
  onToggleProfileMenu,
  onSignOut,
}: AppTopBarProps) {
  return (
    <div className="topbar">
      <div className="topbar-brand" aria-label="TaskFlow">
        <span className="topbar-logo" aria-hidden="true">
          <span className="topbar-logo-ring" />
          <span className="topbar-logo-core" />
        </span>
        <span className="topbar-brand-text">TaskFlow</span>
      </div>
      <div className="user-bar" ref={profileMenuRef}>
        <button
          type="button"
          className={`profile-trigger ${profileMenuOpen ? "open" : ""}`}
          aria-label="Profil menüsü"
          aria-expanded={profileMenuOpen}
          onClick={onToggleProfileMenu}
        >
          <span>{userInitials}</span>
        </button>
        <div className={`profile-dropdown ${profileMenuOpen ? "open" : ""}`}>
          <div className="profile-summary">
            <div className="profile-avatar-large" aria-hidden="true">
              <span>{userInitials}</span>
            </div>
            <div className="profile-summary-text">
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          <button type="button" className="dropdown-item" onClick={onSignOut}>
            Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  );
}
