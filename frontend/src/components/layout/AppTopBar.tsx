import React from "react";
import { SidebarGlyph, UiGlyph } from "../ui/Icons";
import type { User, UserNotification } from "../../types";
import type { ThemeMode } from "../../types";

type AppTopBarProps = {
  user: User;
  userInitials: string;
  profileMenuOpen: boolean;
  profileMenuRef: React.RefObject<HTMLDivElement | null>;
  notificationsMenuRef: React.RefObject<HTMLDivElement | null>;
  themeMode: ThemeMode;
  notificationsMenuOpen: boolean;
  notifications: UserNotification[];
  notificationsLoading: boolean;
  notificationsUnreadCount: number;
  onToggleProfileMenu: () => void;
  onToggleNotificationsMenu: () => void;
  onMarkNotificationsRead: () => void;
  onOpenInviteModal: () => void;
  onOpenProfileDetails: () => void;
  onSetThemeMode: (mode: ThemeMode) => void;
  onSignOut: () => void;
  onNavigateToNotification: (notification: UserNotification) => void;
};

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function AppTopBar({
  user,
  userInitials,
  profileMenuOpen,
  profileMenuRef,
  notificationsMenuRef,
  themeMode,
  notificationsMenuOpen,
  notifications,
  notificationsLoading,
  notificationsUnreadCount,
  onToggleProfileMenu,
  onToggleNotificationsMenu,
  onMarkNotificationsRead,
  onOpenInviteModal,
  onOpenProfileDetails,
  onSetThemeMode,
  onSignOut,
  onNavigateToNotification,
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
      <div className="topbar-actions">
        <div className="notifications-bar" ref={notificationsMenuRef}>
          <button
            type="button"
            className={`notifications-trigger ${notificationsMenuOpen ? "open" : ""} ${notificationsUnreadCount > 0 ? "has-unread" : ""}`}
            aria-label="Bildirimler"
            aria-expanded={notificationsMenuOpen}
            onClick={onToggleNotificationsMenu}
          >
            <svg
              className="bell-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {notificationsUnreadCount > 0 ? (
              <span className="notifications-count" aria-hidden="true">
                {notificationsUnreadCount > 99
                  ? "99+"
                  : notificationsUnreadCount}
              </span>
            ) : null}
          </button>
          <div
            className={`notifications-dropdown ${notificationsMenuOpen ? "open" : ""}`}
          >
            <div className="notifications-head">
              <strong>Bildirimler</strong>
              <button
                type="button"
                className="notifications-read-all"
                onClick={onMarkNotificationsRead}
                disabled={notificationsUnreadCount === 0}
              >
                Tumunu Okundu Yap
              </button>
            </div>

            <div className="notifications-list">
              {notificationsLoading ? (
                <p className="notifications-empty">Bildirimler yükleniyor...</p>
              ) : notifications.length === 0 ? (
                <p className="notifications-empty">Su an bildirimin yok.</p>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className={`notification-item ${notification.isRead ? "" : "unread"}`}
                    onClick={() => onNavigateToNotification(notification)}
                  >
                    <p>{notification.message}</p>
                    <span>
                      {formatNotificationDate(notification.createdAt)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
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
            <button
              type="button"
              className="dropdown-item"
              onClick={onOpenInviteModal}
            >
              <span className="dropdown-item-content">
                <span className="sidebar-link-icon" aria-hidden="true">
                  <UiGlyph icon="mail" />
                </span>
                <span>E-posta ile Davet Et</span>
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
            <button
              type="button"
              className="dropdown-item danger-link"
              onClick={onSignOut}
            >
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
    </div>
  );
}
