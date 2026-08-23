import { useCallback, useEffect, useState } from "react";
import type { UserNotification } from "@taskflow/shared";
import {
  ApiError,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/api";

export default function useNotifications(idToken: string) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchNotifications(idToken);
      setNotifications(response.items);
      setUnreadCount(response.unreadCount);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return;
      }
      setError("Bildirimler yüklenemedi.");
    }
  }, [idToken]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const markOneRead = useCallback(
    async (id: number) => {
      await markNotificationRead(idToken, id);
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    },
    [idToken],
  );

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead(idToken);
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  }, [idToken]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    reload: load,
    markOneRead,
    markAllRead,
  };
}
