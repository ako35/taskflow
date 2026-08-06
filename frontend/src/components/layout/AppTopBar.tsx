import React from "react";
import { SidebarGlyph, UiGlyph } from "../ui/Icons";
import type { User } from "../../types";
import type { ThemeMode } from "../../types";

type AppTopBarProps = {
  user: User;
  userInitials: string;
  profileMenuOpen: boolean;
  profileMenuRef: React.RefObject<HTMLDivElement | null>;
  themeMode: ThemeMode;
  onToggleProfileMenu: () => void;
  onOpenProfileDetails: () => void;
  onSetThemeMode: (mode: ThemeMode) => void;
  onSignOut: () => void;
};

export default function AppTopBar({
  user,
  userInitials,
  profileMenuOpen,
  profileMenuRef,
  themeMode,
  onToggleProfileMenu,
  onOpenProfileDetails,
  onSetThemeMode,
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
          <button
            type="button"
            className="dropdown-item"
            onClick={onOpenProfileDetails}
          >
            <span className="dropdown-item-content">
              <span className="sidebar-link-icon" aria-hidden="true">
                <UiGlyph icon="user" />
              </span>
              <span>Profil Bilgilerim</span>
            </span>
          </button>
          <div className="profile-theme-block">
            <span className="profile-theme-label">Tema</span>
            <div className="theme-menu-options profile-theme-options">
              <button
                type="button"
                className={`theme-option ${themeMode === "light" ? "active" : ""}`}
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
          </div>
          <button type="button" className="dropdown-item" onClick={onSignOut}>
            <span className="dropdown-item-content">
              <span className="sidebar-link-icon" aria-hidden="true">
                <SidebarGlyph icon="logout" />
              </span>
              <span>Çıkış Yap</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
