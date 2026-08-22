import { useCallback, useEffect, useMemo, useState } from "react";
import type { Workspace } from "@taskflow/shared";
import { ApiError, fetchWorkspaces } from "../lib/api";
import { getStoredArchivedWorkspaceIds } from "../lib/secureStorage";

export default function useWorkspaces(idToken: string, onUnauthorized?: () => void) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const items = await fetchWorkspaces(idToken);
      setWorkspaces(items);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized?.();
        return;
      }
      setError("Çalışma alanları yüklenemedi.");
    }
  }, [idToken, onUnauthorized]);

  const loadArchived = useCallback(async () => {
    setArchivedIds(await getStoredArchivedWorkspaceIds());
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([load(), loadArchived()]).finally(() => setLoading(false));
  }, [load, loadArchived]);

  const activeWorkspaces = useMemo(
    () => workspaces.filter((workspace) => !archivedIds.includes(workspace.id)),
    [workspaces, archivedIds],
  );

  const archivedWorkspaces = useMemo(
    () => workspaces.filter((workspace) => archivedIds.includes(workspace.id)),
    [workspaces, archivedIds],
  );

  useEffect(() => {
    if (activeWorkspaces.length === 0) return;
    const stillActive = activeWorkspaces.some(
      (workspace) => workspace.id === activeWorkspaceId,
    );
    if (!stillActive) {
      setActiveWorkspaceId(activeWorkspaces[0].id);
    }
  }, [activeWorkspaces, activeWorkspaceId]);

  return {
    workspaces,
    activeWorkspaces,
    archivedWorkspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    loading,
    error,
    reload: load,
    reloadArchived: loadArchived,
  };
}
