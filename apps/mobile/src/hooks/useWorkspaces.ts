import { useCallback, useEffect, useState } from "react";
import type { Workspace } from "@taskflow/shared";
import { fetchWorkspaces } from "../lib/api";

export default function useWorkspaces(idToken: string) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const items = await fetchWorkspaces(idToken);
      setWorkspaces(items);
      setActiveWorkspaceId((current) => {
        if (current && items.some((workspace) => workspace.id === current)) {
          return current;
        }
        return items[0]?.id ?? null;
      });
    } catch {
      setError("Çalışma alanları yüklenemedi.");
    }
  }, [idToken]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  return {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    loading,
    error,
    reload: load,
  };
}
