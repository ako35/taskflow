import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACES,
  WORKSPACE_COLORS,
} from "../constants";
import type { ViewMode, Workspace } from "../types";
import { normalizeWorkspaces, pickWorkspaceIcon, safeParseJson } from "../utils";

type UseWorkspaceManagerArgs = {
  setError: Dispatch<SetStateAction<string | null>>;
};

export default function useWorkspaceManager({
  setError,
}: UseWorkspaceManagerArgs) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const stored = safeParseJson<Array<Partial<Workspace>>>(
      localStorage.getItem("taskflow_workspaces"),
      DEFAULT_WORKSPACES,
    );

    if (!Array.isArray(stored) || stored.length === 0) {
      return DEFAULT_WORKSPACES;
    }

    const normalized = normalizeWorkspaces(stored);
    return normalized.length > 0 ? normalized : DEFAULT_WORKSPACES;
  });
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(() => {
    return (
      localStorage.getItem("taskflow_selected_workspace") ||
      DEFAULT_WORKSPACE_ID
    );
  });
  const [taskWorkspaceMap, setTaskWorkspaceMap] = useState<Record<number, string>>(
    () =>
      safeParseJson<Record<number, string>>(
        localStorage.getItem("taskflow_task_workspace_map"),
        {},
      ),
  );
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [showWorkspaceInput, setShowWorkspaceInput] = useState(false);
  const [workspaceMenuOpenId, setWorkspaceMenuOpenId] = useState<string | null>(
    null,
  );
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(
    null,
  );
  const [editingWorkspaceName, setEditingWorkspaceName] = useState("");
  const [archivedWorkspaceIds, setArchivedWorkspaceIds] = useState<string[]>(
    () =>
      safeParseJson<string[]>(
        localStorage.getItem("taskflow_archived_workspaces"),
        [],
      ),
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
      DEFAULT_WORKSPACES[0]
    );
  }, [activeWorkspaces, selectedWorkspaceId]);

  const handleCreateWorkspace = useCallback(() => {
    const name = newWorkspaceName.trim();
    if (!name) return;

    const exists = workspaces.some(
      (workspace) => workspace.name.toLowerCase() === name.toLowerCase(),
    );
    if (exists) {
      setError("Bu isimde bir çalışma alanı zaten var.");
      return;
    }

    const id = `workspace-${Date.now()}`;
    const color = WORKSPACE_COLORS[workspaces.length % WORKSPACE_COLORS.length];
    const workspace: Workspace = {
      id,
      name,
      color,
      icon: pickWorkspaceIcon(id),
    };

    setWorkspaces((prev) => [...prev, workspace]);
    setSelectedWorkspaceId(id);
    setNewWorkspaceName("");
    setShowWorkspaceInput(false);
    setError(null);
  }, [newWorkspaceName, setError, workspaces]);

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

  const submitWorkspaceRename = useCallback(() => {
    if (!editingWorkspaceId) return;

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

    setWorkspaces((prev) =>
      prev.map((item) =>
        item.id === editingWorkspaceId ? { ...item, name: trimmed } : item,
      ),
    );
    setError(null);
    setEditingWorkspaceId(null);
    setEditingWorkspaceName("");
  }, [editingWorkspaceId, editingWorkspaceName, setError, workspaces]);

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
    (workspaceId: string) => {
      if (workspaceId === DEFAULT_WORKSPACE_ID) {
        setError("Genel çalışma alanı silinemez.");
        return;
      }

      setWorkspaces((prev) => prev.filter((item) => item.id !== workspaceId));
      setArchivedWorkspaceIds((prev) =>
        prev.filter((itemId) => itemId !== workspaceId),
      );
      setTaskWorkspaceMap((prev) => {
        const next = { ...prev };
        for (const [taskId, mappedWorkspaceId] of Object.entries(next)) {
          if (mappedWorkspaceId === workspaceId) {
            next[Number(taskId)] = DEFAULT_WORKSPACE_ID;
          }
        }
        return next;
      });
      setWorkspaceMenuOpenId(null);
      setError(null);
    },
    [setError],
  );

  useEffect(() => {
    localStorage.setItem("taskflow_workspaces", JSON.stringify(workspaces));
  }, [workspaces]);

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
    localStorage.setItem(
      "taskflow_task_workspace_map",
      JSON.stringify(taskWorkspaceMap),
    );
  }, [taskWorkspaceMap]);

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
    taskWorkspaceMap,
    setTaskWorkspaceMap,
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
  };
}
