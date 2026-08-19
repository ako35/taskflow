import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import {
  API_URL,
  COLUMN_WIDTHS_STORAGE_KEY,
  DEFAULT_COLUMN_WIDTHS,
  tableColumns,
} from "../constants";
import type { Task, ViewMode } from "../types";
import {
  getPriorityRank,
  getStatusRank,
  fitColumnWidthsToContainer,
  isCompletedStatus,
  matchesSearch,
  safeParseJson,
} from "../utils";

type UseTaskTableInteractionsArgs = {
  tasks: Task[];
  archivedTasks: Task[];
  archivedTaskIds: number[];
  selectedWorkspaceId: string;
  query: string;
  viewMode: ViewMode;
  idToken: string | null;
  tableWrapperRef: RefObject<HTMLDivElement | null>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setTasks: Dispatch<SetStateAction<Task[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
  handleUnauthorized: () => void;
};

export default function useTaskTableInteractions({
  tasks,
  archivedTasks,
  archivedTaskIds,
  selectedWorkspaceId,
  query,
  viewMode,
  idToken,
  tableWrapperRef,
  setLoading,
  setTasks,
  setError,
  handleUnauthorized,
}: UseTaskTableInteractionsArgs) {
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(
    null,
  );
  const [editingValue, setEditingValue] = useState("");
  const [collapsedStatusGroups, setCollapsedStatusGroups] = useState<
    Record<string, boolean>
  >({});
  const [activePreviewCell, setActivePreviewCell] = useState<{
    id: number;
    field: "title";
  } | null>(null);
  const [aiImprovingCell, setAiImprovingCell] = useState<{
    id: number;
    field: "title";
  } | null>(null);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const stored = safeParseJson<Record<string, number>>(
      localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY),
      {},
    );

    const next: Record<string, number> = { ...DEFAULT_COLUMN_WIDTHS };
    for (const column of tableColumns) {
      if (column.field === "index") {
        next[column.field] = DEFAULT_COLUMN_WIDTHS.index;
        continue;
      }
      const candidate = stored[column.field];
      if (typeof candidate === "number" && Number.isFinite(candidate)) {
        next[column.field] = Math.max(column.minWidth, candidate);
      }
    }

    return next;
  });

  const tableTotalWidthRef = useRef<number | null>(null);

  const getTableTotalWidth = useCallback((widths: Record<string, number>) => {
    if (tableTotalWidthRef.current && tableTotalWidthRef.current > 0) {
      return tableTotalWidthRef.current;
    }

    const total = tableColumns.reduce((sum, column) => {
      return sum + (widths[column.field] ?? column.minWidth);
    }, 0);

    tableTotalWidthRef.current = total;
    return total;
  }, []);

  const keepTableWidthFixed = useCallback(
    (prev: Record<string, number>, next: Record<string, number>, changedField: string) => {
      const minimums = tableColumns.reduce<Record<string, number>>((acc, column) => {
        acc[column.field] = column.minWidth;
        return acc;
      }, {});

      const normalized: Record<string, number> = { ...next };
      for (const column of tableColumns) {
        normalized[column.field] = Math.max(
          minimums[column.field],
          next[column.field] ?? prev[column.field] ?? minimums[column.field],
        );
      }

      const targetTotal = getTableTotalWidth(prev);
      const currentTotal = tableColumns.reduce(
        (sum, column) => sum + normalized[column.field],
        0,
      );

      let diff = currentTotal - targetTotal;
      const candidateFields = tableColumns
        .map((column) => column.field)
        .filter((field) => field !== changedField)
        .sort((a, b) => {
          const priority = (field: string) => {
            if (field === "title") return 0;
            if (field === "status") return 1;
            if (field === "priority") return 2;
            return 3;
          };
          return priority(a) - priority(b);
        });

      if (diff > 0) {
        for (const field of candidateFields) {
          if (diff <= 0) break;
          const reducible = Math.max(0, normalized[field] - minimums[field]);
          const amount = Math.min(reducible, diff);
          normalized[field] -= amount;
          diff -= amount;
        }

        if (diff > 0) {
          const minWidth = minimums[changedField] ?? 80;
          normalized[changedField] = Math.max(minWidth, normalized[changedField] - diff);
          diff = 0;
        }
      } else if (diff < 0) {
        const expandableField =
          candidateFields.find((field) => field === "title") ?? candidateFields[0];

        if (expandableField) {
          normalized[expandableField] += Math.abs(diff);
        }
      }

      return normalized;
    },
    [getTableTotalWidth],
  );

  const archivedTaskIdSet = useMemo(
    () => new Set(archivedTaskIds),
    [archivedTaskIds],
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const inSelectedWorkspace = task.workspaceId === selectedWorkspaceId;
      if (!inSelectedWorkspace) return false;
      if (archivedTaskIdSet.has(task.id)) return false;
      return matchesSearch(task, query);
    });
  }, [archivedTaskIdSet, query, selectedWorkspaceId, tasks]);

  const sortedTasks = useMemo(
    () =>
      [...filteredTasks].sort((a, b) => {
        const statusDiff = getStatusRank(a.status) - getStatusRank(b.status);
        if (statusDiff !== 0) return statusDiff;

        const priorityDiff = getPriorityRank(a.priority) - getPriorityRank(b.priority);
        if (priorityDiff !== 0) return priorityDiff;

        const titleDiff = a.title.localeCompare(b.title, "tr-TR", {
          sensitivity: "base",
        });
        if (titleDiff !== 0) return titleDiff;

        return a.id - b.id;
      }),
    [filteredTasks],
  );

  const archivedFilteredTasks = useMemo(
    () => archivedTasks.filter((task) => matchesSearch(task, query)),
    [archivedTasks, query],
  );

  const sortedArchivedTasks = useMemo(
    () =>
      [...archivedFilteredTasks].sort((a, b) => {
        const statusDiff = getStatusRank(a.status) - getStatusRank(b.status);
        if (statusDiff !== 0) return statusDiff;

        const priorityDiff = getPriorityRank(a.priority) - getPriorityRank(b.priority);
        if (priorityDiff !== 0) return priorityDiff;

        const titleDiff = a.title.localeCompare(b.title, "tr-TR", {
          sensitivity: "base",
        });
        if (titleDiff !== 0) return titleDiff;

        return a.id - b.id;
      }),
    [archivedFilteredTasks],
  );

  const visibleTasks = useMemo(
    () => (viewMode === "archive" ? sortedArchivedTasks : sortedTasks),
    [sortedArchivedTasks, sortedTasks, viewMode],
  );

  const statusGroupCounts = useMemo(() => {
    return visibleTasks.reduce<Record<string, number>>((acc, task) => {
      const status = task.status ?? "Yapılacak";
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});
  }, [visibleTasks]);

  const startEditingCell = useCallback((task: Task, field: string) => {
    if (field === "index" || field === "__spacer") return;
    setEditingCell({ id: task.id, field });
    const fallback = field === "status" ? "Yapılacak" : "";
    setEditingValue(String(task[field as keyof Task] ?? fallback));
  }, []);

  const cancelCellEdit = useCallback(() => {
    setEditingCell(null);
    setEditingValue("");
  }, []);

  const saveCellEdit = useCallback(
    async (nextValue?: string) => {
      if (!editingCell) return;
      if (!idToken) {
        setError("Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.");
        return;
      }

      const task = tasks.find((item) => item.id === editingCell.id);
      if (!task) {
        cancelCellEdit();
        return;
      }

      const value = (nextValue ?? editingValue).trim();
      const field = editingCell.field;
      if (String(task[field as keyof Task] ?? "") === value) {
        cancelCellEdit();
        return;
      }

      const allowedStatuses = ["Yapılacak", "Tamamlandı"];
      const allowedPriorities = ["Acil", "Yüksek", "Orta", "Düşük"];
      const data: Record<string, string> = {};

      if (field === "status") {
        if (!allowedStatuses.includes(value)) {
          setError("Geçersiz durum değeri.");
          return;
        }
        data.status = value;
      } else if (field === "priority") {
        if (!allowedPriorities.includes(value)) {
          setError("Geçersiz önem değeri.");
          return;
        }
        data.priority = value;
      } else {
        data[field] = value;
      }

      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/tasks/${editingCell.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(data),
        });

        const text = await response.text();
        let responseBody: any = null;
        try {
          responseBody = text ? JSON.parse(text) : null;
        } catch {
          responseBody = null;
        }

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          const message =
            responseBody?.error ||
            responseBody?.message ||
            text ||
            response.statusText;
          throw new Error(message);
        }

        if (!responseBody || typeof responseBody.id !== "number") {
          throw new Error(
            "Sunucudan beklenmeyen yanıt alındı. API adresini kontrol edin.",
          );
        }

        const updatedTask = {
          ...(responseBody as Task),
          description: (responseBody as Task).description || "",
          status: (responseBody as Task).status ?? "Yapılacak",
        };
        setTasks((prev) =>
          prev.map((item) => (item.id === updatedTask.id ? updatedTask : item)),
        );
        cancelCellEdit();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Güncelleme başarısız oldu.");
      } finally {
        setLoading(false);
      }
    },
    [
      cancelCellEdit,
      editingCell,
      editingValue,
      handleUnauthorized,
      idToken,
      setError,
      setLoading,
      setTasks,
      tasks,
    ],
  );

  const syncColumnWidthsToContainer = useCallback(() => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return;

    setColumnWidths((prev) => {
      const next = fitColumnWidthsToContainer(prev, wrapper.clientWidth - 2);
      tableTotalWidthRef.current = tableColumns.reduce(
        (total, column) => total + next[column.field],
        0,
      );
      return next;
    });
  }, [tableWrapperRef]);

  const resizeState = useRef<{
    field: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleColumnMouseMove = useCallback((event: MouseEvent) => {
    const current = resizeState.current;
    if (!current) return;

    const delta = event.clientX - current.startX;
    const minWidth =
      tableColumns.find((column) => column.field === current.field)?.minWidth ?? 80;
    setColumnWidths((prev) => {
      const nextWidth = Math.max(minWidth, current.startWidth + delta);
      const requested = {
        ...prev,
        [current.field]: nextWidth,
      };

      if (current.field === "title") {
        tableTotalWidthRef.current = tableColumns.reduce(
          (total, column) => total + requested[column.field],
          0,
        );
        return requested;
      }

      return keepTableWidthFixed(prev, requested, current.field);
    });
  }, [keepTableWidthFixed]);

  const handleColumnMouseUp = useCallback(() => {
    if (!resizeState.current) return;
    resizeState.current = null;
    window.removeEventListener("mousemove", handleColumnMouseMove);
    window.removeEventListener("mouseup", handleColumnMouseUp);
  }, [handleColumnMouseMove]);

  const startColumnResize = useCallback(
    (field: string, event: ReactMouseEvent<HTMLDivElement>) => {
      if (field === "__spacer") return;
      event.preventDefault();
      resizeState.current = {
        field,
        startX: event.clientX,
        startWidth: columnWidths[field] ?? 120,
      };
      window.addEventListener("mousemove", handleColumnMouseMove);
      window.addEventListener("mouseup", handleColumnMouseUp);
    },
    [columnWidths, handleColumnMouseMove, handleColumnMouseUp],
  );

  const fitColumnToContent = useCallback(
    (field: string) => {
      if (field === "__spacer") return;

      const column = tableColumns.find((item) => item.field === field);
      if (!column) return;

      if (field === "status" || field === "priority") {
        const selector =
          field === "status" ? ".task-status-badge" : ".task-priority-badge";
        const nodes = Array.from(
          tableWrapperRef.current?.querySelectorAll(selector) ?? [],
        ) as HTMLElement[];

        const frameWidth = nodes.reduce((max, node) => {
          const width = node.getBoundingClientRect().width;
          return Number.isFinite(width) ? Math.max(max, width) : max;
        }, 0);

        const fallbackWidth =
          field === "status"
            ? DEFAULT_COLUMN_WIDTHS.status
            : DEFAULT_COLUMN_WIDTHS.priority;
        const nextWidth = Math.max(fallbackWidth, Math.ceil((frameWidth || 0) + 30));

          setColumnWidths((prev) => {
            const requested = {
              ...prev,
              [field]: nextWidth,
            };

            return keepTableWidthFixed(prev, requested, field);
          });
        return;
      }

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return;

      const baseFont =
        field === "title"
          ? "700 16px Manrope, Segoe UI, sans-serif"
          : "600 14px Manrope, Segoe UI, sans-serif";
      context.font = baseFont;

      const candidates: string[] = [column.label];
      if (field === "index") {
        candidates.push(String(Math.max(visibleTasks.length, 1)));
      } else if (field === "status") {
        for (const task of visibleTasks) {
          candidates.push(task.status ?? "Yapılacak");
        }
      } else if (field === "priority") {
        for (const task of visibleTasks) {
          candidates.push(task.priority ?? "Orta");
        }
      } else if (field === "title") {
        for (const task of visibleTasks) {
          candidates.push(task.title ?? "");
        }
      }

      const widestText = candidates.reduce((max, value) => {
        const text = String(value ?? "").trim();
        if (!text) return max;
        const measured = context.measureText(text).width;
        return Math.max(max, measured);
      }, 0);

      const extraPadding =
        field === "index"
          ? 36
          : field === "status"
            ? 52
            : field === "priority"
              ? 56
              : 72;
      const hardMinimum =
        field === "status" ? 108 : field === "priority" ? 120 : column.minWidth;
      const hardMaximum = 900;

      const nextWidth = Math.min(
        hardMaximum,
        Math.max(hardMinimum, Math.ceil(widestText + extraPadding)),
      );

      setColumnWidths((prev) => {
        const requested = {
          ...prev,
          [field]: nextWidth,
        };

        return keepTableWidthFixed(prev, requested, field);
      });
    },
    [keepTableWidthFixed, tableWrapperRef, visibleTasks],
  );

  const toggleStatusGroup = useCallback(
    (status: string) => {
      setCollapsedStatusGroups((prev) => {
        const key = `${viewMode}:${status}`;
        const isCurrentlyCollapsed = prev[key] ?? isCompletedStatus(status);
        return {
          ...prev,
          [key]: !isCurrentlyCollapsed,
        };
      });
    },
    [viewMode],
  );

  const togglePreviewCell = useCallback(
    (taskId: number, field: "title") => {
      setActivePreviewCell((current) =>
        current?.id === taskId && current.field === field
          ? null
          : { id: taskId, field },
      );
    },
    [],
  );

  const handleAiImproveTaskField = useCallback(
    async (taskId: number, field: "title") => {
      if (!idToken) {
        setError("Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.");
        return;
      }

      const task = tasks.find((item) => item.id === taskId);
      if (!task) return;

      const sourceText = String(task[field] ?? "").trim();
      if (!sourceText) {
        setError("AI iyilestirme icin once metin olusturun.");
        return;
      }

      setAiImprovingCell({ id: taskId, field });
      setError(null);

      try {
        const refineResponse = await fetch(`${API_URL}/ai/refine-text`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            field,
            text: sourceText,
          }),
        });

        const refinePayload = (await refineResponse
          .json()
          .catch(() => null)) as { text?: string; error?: string } | null;

        if (refineResponse.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!refineResponse.ok || !refinePayload?.text) {
          throw new Error(
            refinePayload?.error || "AI metin iyilestirme basarisiz oldu.",
          );
        }

        const refinedText = refinePayload.text.trim();
        if (!refinedText) {
          throw new Error("AI duzenleme sonucu bos dondu.");
        }

        if (refinedText === sourceText) {
          return;
        }

        const updateResponse = await fetch(`${API_URL}/tasks/${taskId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            [field]: refinedText,
          }),
        });

        const updatePayload = (await updateResponse
          .json()
          .catch(() => null)) as Task | { error?: string } | null;

        if (updateResponse.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!updateResponse.ok || !updatePayload || !("id" in updatePayload)) {
          const message =
            (updatePayload as { error?: string } | null)?.error ||
            "AI iyilestirilen metin kaydedilemedi.";
          throw new Error(message);
        }

        const updatedTask = {
          ...(updatePayload as Task),
          description: (updatePayload as Task).description || "",
          status: (updatePayload as Task).status ?? "Yapılacak",
        };
        setTasks((prev) =>
          prev.map((item) => (item.id === updatedTask.id ? updatedTask : item)),
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "AI metin iyilestirme sirasinda bir hata olustu.",
        );
      } finally {
        setAiImprovingCell(null);
      }
    },
    [handleUnauthorized, idToken, setError, setTasks, tasks],
  );

  const handleAiImproveEditingCell = useCallback(async () => {
    if (!editingCell) return;

    const field = editingCell.field;
    if (field !== "title") {
      return;
    }

    if (!idToken) {
      setError("Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.");
      return;
    }

    const sourceText = editingValue.trim();
    if (!sourceText) {
      setError("AI iyilestirme icin once metin olusturun.");
      return;
    }

    setAiImprovingCell({ id: editingCell.id, field });
    setError(null);

    try {
      const refineResponse = await fetch(`${API_URL}/ai/refine-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          field,
          text: sourceText,
        }),
      });

      const refinePayload = (await refineResponse
        .json()
        .catch(() => null)) as { text?: string; error?: string } | null;

      if (refineResponse.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!refineResponse.ok || !refinePayload?.text) {
        throw new Error(
          refinePayload?.error || "AI metin iyilestirme basarisiz oldu.",
        );
      }

      const refinedText = refinePayload.text.trim();
      if (!refinedText) {
        throw new Error("AI duzenleme sonucu bos dondu.");
      }

      setEditingValue(refinedText);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "AI metin iyilestirme sirasinda bir hata olustu.",
      );
    } finally {
      setAiImprovingCell(null);
    }
  }, [editingCell, editingValue, handleUnauthorized, idToken, setError]);

  useEffect(() => {
    localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
  }, [columnWidths]);

  useEffect(() => {
    syncColumnWidthsToContainer();

    const wrapper = tableWrapperRef.current;
    if (!wrapper || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      syncColumnWidthsToContainer();
    });

    observer.observe(wrapper);

    return () => observer.disconnect();
  }, [syncColumnWidthsToContainer, tableWrapperRef]);

  return {
    editingCell,
    editingValue,
    setEditingValue,
    collapsedStatusGroups,
    activePreviewCell,
    aiImprovingCell,
    setActivePreviewCell,
    columnWidths,
    visibleTasks,
    statusGroupCounts,
    startEditingCell,
    cancelCellEdit,
    saveCellEdit,
    startColumnResize,
    fitColumnToContent,
    toggleStatusGroup,
    togglePreviewCell,
    handleAiImproveTaskField,
    handleAiImproveEditingCell,
  };
}
