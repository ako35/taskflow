import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  onOpenMembersPanel: () => void;
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
  onOpenMembersPanel,
  onOpenProfileDetails,
  onSetThemeMode,
  onSignOut,
  onNavigateToNotification,
}: AppTopBarProps) {
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const themeFlyoutRef = useRef<HTMLDivElement | null>(null);
  const [themeFlyoutStyle, setThemeFlyoutStyle] = useState<React.CSSProperties>(
    {
      position: "fixed",
      top: -9999,
      left: -9999,
      visibility: "hidden",
    },
  );

  useLayoutEffect(() => {
    if (!themeMenuOpen) {
      return;
    }

    const updateThemeFlyoutPosition = () => {
      const trigger = themeTriggerRef.current;
      const flyout = themeFlyoutRef.current;
      if (!trigger || !flyout) {
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const flyoutRect = flyout.getBoundingClientRect();
      const viewportPadding = 8;
      const gap = 2;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const fitsOnLeft =
        triggerRect.left - gap - flyoutRect.width >= viewportPadding;
      const requestedLeft = fitsOnLeft
        ? triggerRect.left - gap - flyoutRect.width
        : triggerRect.right + gap;
      const left = Math.min(
        Math.max(requestedLeft, viewportPadding),
        Math.max(
          viewportPadding,
          viewportWidth - flyoutRect.width - viewportPadding,
        ),
      );
      const top = Math.min(
        Math.max(triggerRect.top, viewportPadding),
        Math.max(
          viewportPadding,
          viewportHeight - flyoutRect.height - viewportPadding,
        ),
      );

      setThemeFlyoutStyle({
        position: "fixed",
        top: Math.round(top),
        left: Math.round(left),
        visibility: "visible",
      });
    };

    updateThemeFlyoutPosition();
    window.addEventListener("resize", updateThemeFlyoutPosition);
    window.addEventListener("scroll", updateThemeFlyoutPosition, true);

    return () => {
      window.removeEventListener("resize", updateThemeFlyoutPosition);
      window.removeEventListener("scroll", updateThemeFlyoutPosition, true);
    };
  }, [themeMenuOpen]);

  useLayoutEffect(() => {
    if (!profileMenuOpen) {
      setThemeMenuOpen(false);
    }
  }, [profileMenuOpen]);

  const themeFlyoutOptions = themeMenuOpen ? (
    <div
      ref={themeFlyoutRef}
      id="profile-theme-flyout-options"
      className="theme-menu-options profile-theme-flyout"
      role="group"
      aria-label="Tema seçenekleri"
      style={themeFlyoutStyle}
    >
      <button
        type="button"
        className={`theme-option ${themeMode === "light" ? "active" : ""}`}
        aria-pressed={themeMode === "light"}
        onClick={() => {
          onSetThemeMode("light");
          setThemeMenuOpen(false);
        }}
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
        onClick={() => {
          onSetThemeMode("dark");
          setThemeMenuOpen(false);
        }}
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
  ) : null;

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

        <button
          type="button"
          className="notifications-trigger"
          aria-label="Üye davet et"
          title="Üye davet et"
          onClick={onOpenMembersPanel}
        >
          <UiGlyph icon="mail" />
        </button>

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
              onClick={onOpenMembersPanel}
            >
              <span className="dropdown-item-content">
                <span className="sidebar-link-icon" aria-hidden="true">
                  <UiGlyph icon="mail" />
                </span>
                <span>E-posta ile Davet Et</span>
              </span>
            </button>
            <button
              ref={themeTriggerRef}
              type="button"
              className="dropdown-item profile-theme-trigger"
              onClick={() => setThemeMenuOpen((current) => !current)}
              aria-expanded={themeMenuOpen}
              aria-controls="profile-theme-flyout-options"
            >
              <span className="dropdown-item-content">
                <span className="sidebar-link-icon" aria-hidden="true">
                  <UiGlyph icon={themeMode === "light" ? "sun" : "moon"} />
                </span>
                <span>Tema</span>
              </span>
              <span className="settings-popover-chevron" aria-hidden="true">
                <UiGlyph icon="chevron-right" />
              </span>
            </button>
            {themeFlyoutOptions && typeof document !== "undefined"
              ? createPortal(themeFlyoutOptions, document.body)
              : themeFlyoutOptions}
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
