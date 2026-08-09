import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { API_URL, DEFAULT_WORKSPACE_ID, DEFAULT_WORKSPACES } from "../constants";
import type { User, ViewMode, Workspace } from "../types";
import { normalizeWorkspaces, safeParseJson } from "../utils";

type UseWorkspaceManagerArgs = {
  idToken: string | null;
  user: User | null;
  setError: Dispatch<SetStateAction<string | null>>;
  handleUnauthorized: () => void;
};

function parseApiError(text: string, fallback: string) {
  try {
    const body = text ? (JSON.parse(text) as { error?: string; message?: string }) : null;
    return body?.error || body?.message || fallback;
  } catch {
    return text || fallback;
  }
}

export default function useWorkspaceManager({
  idToken,
  user,
  setError,
  handleUnauthorized,
}: UseWorkspaceManagerArgs) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(DEFAULT_WORKSPACES);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(() => {
    return localStorage.getItem("taskflow_selected_workspace") || DEFAULT_WORKSPACE_ID;
  });
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [showWorkspaceInput, setShowWorkspaceInput] = useState(false);
  const [workspaceMenuOpenId, setWorkspaceMenuOpenId] = useState<string | null>(null);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState("");
  const [archivedWorkspaceIds, setArchivedWorkspaceIds] = useState<string[]>(() =>
    safeParseJson<string[]>(localStorage.getItem("taskflow_archived_workspaces"), []),
  );
  const [viewMode, setViewMode] = useState<ViewMode>("workspaces");

  const activeWorkspaces = useMemo(
    () =>
      workspaces.filter(
        (workspace) => !archivedWorkspaceIds.includes(workspace.id),
      ),
    [archivedWorkspaceIds, workspaces],
  );

  const archivedWorkspaces = useMemo(
    () =>
      workspaces.filter((workspace) => archivedWorkspaceIds.includes(workspace.id)),
    [archivedWorkspaceIds, workspaces],
  );

  const selectedWorkspace = useMemo(() => {
    return (
      activeWorkspaces.find((workspace) => workspace.id === selectedWorkspaceId) ||
      activeWorkspaces[0] ||
      workspaces[0] ||
      DEFAULT_WORKSPACES[0]
    );
  }, [activeWorkspaces, selectedWorkspaceId, workspaces]);

  const loadWorkspaces = useCallback(async () => {
    if (!idToken || !user) {
      setWorkspaces(DEFAULT_WORKSPACES);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/workspaces`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const text = await response.text();
      if (!response.ok) {
        throw new Error(parseApiError(text, "Çalışma alanları yüklenemedi."));
      }

      const data = safeParseJson<Array<Partial<Workspace>>>(text, []);
      const normalized = normalizeWorkspaces(data);
      setWorkspaces(normalized.length > 0 ? normalized : DEFAULT_WORKSPACES);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Çalışma alanları yüklenemedi.");
    }
  }, [handleUnauthorized, idToken, setError, user]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleCreateWorkspace = useCallback(async () => {
    const name = newWorkspaceName.trim();
    if (!name) return;

    if (!idToken) {
      handleUnauthorized();
      return;
    }

    const exists = workspaces.some(
      (workspace) => workspace.name.toLowerCase() === name.toLowerCase(),
    );
    if (exists) {
      setError("Bu isimde bir çalışma alanı zaten var.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/workspaces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ name }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const text = await response.text();
      if (!response.ok) {
        throw new Error(parseApiError(text, "Çalışma alanı oluşturulamadı."));
      }

      const payload = safeParseJson<Partial<Workspace>>(text, {});
      const [createdWorkspace] = normalizeWorkspaces([payload]);
      if (!createdWorkspace) {
        throw new Error("Çalışma alanı yanıtı geçersiz.");
      }

      setWorkspaces((prev) => [...prev, createdWorkspace]);
      setSelectedWorkspaceId(createdWorkspace.id);
      setNewWorkspaceName("");
      setShowWorkspaceInput(false);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Çalışma alanı oluşturulamadı.");
    }
  }, [handleUnauthorized, idToken, newWorkspaceName, setError, workspaces]);

  const startWorkspaceRename = useCallback(
    (workspaceId: string) => {
      const workspace = workspaces.find((item) => item.id === workspaceId);
      if (!workspace) return;
      setEditingWorkspaceId(workspaceId);
      setEditingWorkspaceName(workspace.name);
      setWorkspaceMenuOpenId(null);
    },
    [workspaces],
  );

  const cancelWorkspaceRename = useCallback(() => {
    setEditingWorkspaceId(null);
    setEditingWorkspaceName("");
  }, []);

  const submitWorkspaceRename = useCallback(async () => {
    if (!editingWorkspaceId) return;

    const workspace = workspaces.find((item) => item.id === editingWorkspaceId);
    if (!workspace) {
      cancelWorkspaceRename();
      return;
    }

    if (workspace.role !== "OWNER") {
      setError("Bu çalışma alanını sadece sahibi yeniden adlandırabilir.");
      return;
    }

    if (!idToken) {
      handleUnauthorized();
      return;
    }

    const trimmed = editingWorkspaceName.trim();
    if (!trimmed) {
      setError("Çalışma alanı adı boş olamaz.");
      return;
    }

    const duplicate = workspaces.some(
      (item) =>
        item.id !== editingWorkspaceId &&
        item.name.toLocaleLowerCase("tr-TR") ===
          trimmed.toLocaleLowerCase("tr-TR"),
    );
    if (duplicate) {
      setError("Bu isimde bir çalışma alanı zaten var.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/workspaces/${editingWorkspaceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ name: trimmed }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const text = await response.text();
      if (!response.ok) {
        throw new Error(parseApiError(text, "Çalışma alanı güncellenemedi."));
      }

      const payload = safeParseJson<Partial<Workspace>>(text, {});
      const [updatedWorkspace] = normalizeWorkspaces([payload]);
      if (!updatedWorkspace) {
        throw new Error("Çalışma alanı yanıtı geçersiz.");
      }

      setWorkspaces((prev) =>
        prev.map((item) => (item.id === updatedWorkspace.id ? updatedWorkspace : item)),
      );
      setError(null);
      setEditingWorkspaceId(null);
      setEditingWorkspaceName("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Çalışma alanı güncellenemedi.");
    }
  }, [
    cancelWorkspaceRename,
    editingWorkspaceId,
    editingWorkspaceName,
    handleUnauthorized,
    idToken,
    setError,
    workspaces,
  ]);

  const handleArchiveWorkspace = useCallback(
    (workspaceId: string) => {
      setArchivedWorkspaceIds((prev) => {
        if (prev.includes(workspaceId)) return prev;
        return [...prev, workspaceId];
      });
      setViewMode("archive");
      setWorkspaceMenuOpenId(null);
      setError(null);
    },
    [setError],
  );

  const handleRestoreWorkspace = useCallback(
    (workspaceId: string) => {
      const workspace = workspaces.find((item) => item.id === workspaceId);
      if (!workspace) return;

      setArchivedWorkspaceIds((prev) =>
        prev.filter((itemId) => itemId !== workspaceId),
      );
      setSelectedWorkspaceId(workspaceId);
      setViewMode("workspaces");
      setError(null);
    },
    [setError, workspaces],
  );

  const handleDeleteWorkspace = useCallback(
    async (workspaceId: string) => {
      const workspace = workspaces.find((item) => item.id === workspaceId);
      if (!workspace) return;

      if (workspace.role !== "OWNER") {
        setError("Bu çalışma alanını sadece sahibi silebilir.");
        return;
      }

      if (!idToken) {
        handleUnauthorized();
        return;
      }

      try {
        const response = await fetch(`${API_URL}/workspaces/${workspaceId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok && response.status !== 204) {
          const text = await response.text();
          throw new Error(parseApiError(text, "Çalışma alanı silinemedi."));
        }

        setWorkspaces((prev) => prev.filter((item) => item.id !== workspaceId));
        setArchivedWorkspaceIds((prev) =>
          prev.filter((itemId) => itemId !== workspaceId),
        );
        setWorkspaceMenuOpenId(null);
        setError(null);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Çalışma alanı silinemedi.");
      }
    },
    [handleUnauthorized, idToken, setError, workspaces],
  );

  useEffect(() => {
    localStorage.setItem(
      "taskflow_archived_workspaces",
      JSON.stringify(archivedWorkspaceIds),
    );
  }, [archivedWorkspaceIds]);

  useEffect(() => {
    localStorage.setItem("taskflow_selected_workspace", selectedWorkspace.id);
  }, [selectedWorkspace.id]);

  useEffect(() => {
    setArchivedWorkspaceIds((prev) =>
      prev.filter((workspaceId) => workspaces.some((item) => item.id === workspaceId)),
    );
  }, [workspaces]);

  useEffect(() => {
    if (activeWorkspaces.length === 0) return;
    const selectedStillActive = activeWorkspaces.some(
      (workspace) => workspace.id === selectedWorkspaceId,
    );
    if (!selectedStillActive) {
      setSelectedWorkspaceId(activeWorkspaces[0].id);
    }
  }, [activeWorkspaces, selectedWorkspaceId]);

  return {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    newWorkspaceName,
    setNewWorkspaceName,
    showWorkspaceInput,
    setShowWorkspaceInput,
    workspaceMenuOpenId,
    setWorkspaceMenuOpenId,
    editingWorkspaceId,
    setEditingWorkspaceId,
    editingWorkspaceName,
    setEditingWorkspaceName,
    archivedWorkspaceIds,
    viewMode,
    setViewMode,
    activeWorkspaces,
    archivedWorkspaces,
    selectedWorkspace,
    handleCreateWorkspace,
    startWorkspaceRename,
    cancelWorkspaceRename,
    submitWorkspaceRename,
    handleArchiveWorkspace,
    handleRestoreWorkspace,
    handleDeleteWorkspace,
    reloadWorkspaces: loadWorkspaces,
  };
}
