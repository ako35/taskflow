import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { API_URL, initialForm } from "../constants";
import type { Task, TaskForm, User } from "../types";
import type { ViewMode } from "../types";
import { safeParseJson } from "../utils";

type UseTaskCrudArgs = {
  idToken: string | null;
  user: User | null;
  selectedWorkspaceId: string;
  workspaceIds: string[];
  viewMode: ViewMode;
  handleUnauthorized: () => void;
  setError: Dispatch<SetStateAction<string | null>>;
};

export default function useTaskCrud({
  idToken,
  user,
  selectedWorkspaceId,
  workspaceIds,
  viewMode,
  handleUnauthorized,
  setError,
}: UseTaskCrudArgs) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<TaskForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [archivedTaskIds, setArchivedTaskIds] = useState<number[]>(() =>
    safeParseJson<number[]>(localStorage.getItem("taskflow_archived_tasks"), []),
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successMessageTimerRef = useRef<number | null>(null);

  const dismissSuccessMessage = useCallback(() => {
    if (successMessageTimerRef.current !== null) {
      window.clearTimeout(successMessageTimerRef.current);
      successMessageTimerRef.current = null;
    }
    setSuccessMessage(null);
  }, []);

  const announceSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    if (successMessageTimerRef.current !== null) {
      window.clearTimeout(successMessageTimerRef.current);
    }
    successMessageTimerRef.current = window.setTimeout(() => {
      setSuccessMessage(null);
      successMessageTimerRef.current = null;
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (successMessageTimerRef.current !== null) {
        window.clearTimeout(successMessageTimerRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (field: keyof TaskForm) =>
      (
        event: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
      },
    [],
  );

  const isFormValid = useMemo(() => form.title.trim().length > 0, [form.title]);

  const handleSubmit = useCallback(async () => {
    if (!isFormValid) {
      setError("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    if (!idToken) {
      setError("Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.");
      return;
    }

    if (!selectedWorkspaceId) {
      setError("Lütfen bir çalışma alanı seçin.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          priority: form.priority,
          status: form.status,
          workspaceId: selectedWorkspaceId,
          assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
          remindAt: form.remindAt
            ? new Date(form.remindAt).toISOString()
            : null,
        }),
      });

      const text = await response.text();
      let responseBody: any = null;
      try {
        responseBody = JSON.parse(text);
      } catch {
        responseBody = null;
      }

      if (!response.ok) {
        const message =
          responseBody?.error ||
          responseBody?.message ||
          text ||
          `Hata ${response.status}: ${response.statusText}`;

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        console.error("Task save failed", response.status, message, responseBody);
        throw new Error(message);
      }

      const newTask = responseBody as Task;
      setTasks((prev) => [newTask, ...prev]);
      setForm(initialForm);
      setQuery("");
      setShowForm(false);
    } catch (err) {
      console.error("Görev kaydetme hatası", err);
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [
    form,
    handleUnauthorized,
    idToken,
    isFormValid,
    selectedWorkspaceId,
    setError,
  ]);

  const handleClearReminder = useCallback(() => {
    setForm((current) => ({ ...current, remindAt: "" }));
  }, []);

  const handleArchiveTask = useCallback(
    (taskId: number) => {
      setArchivedTaskIds((prev) => {
        if (prev.includes(taskId)) return prev;
        return [...prev, taskId];
      });
      setError(null);
    },
    [setError],
  );

  const handleRestoreTask = useCallback(
    (taskId: number) => {
      setArchivedTaskIds((prev) => prev.filter((id) => id !== taskId));
      setError(null);
    },
    [setError],
  );

  const handleDeleteTask = useCallback(
    async (taskId: number) => {
      if (!idToken) {
        setError("Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.");
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || response.statusText);
        }

        setTasks((prev) => prev.filter((task) => task.id !== taskId));
        setArchivedTaskIds((prev) => prev.filter((id) => id !== taskId));
        setError(null);
        announceSuccess("Görev silindi.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Görev silinemedi.");
      } finally {
        setLoading(false);
      }
    },
    [announceSuccess, handleUnauthorized, idToken, setError],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadTasks() {
      setLoading(true);
      setError(null);
      try {
        const requestedWorkspaceIds =
          viewMode === "archive" ? workspaceIds : [selectedWorkspaceId];
        const uniqueWorkspaceIds = [...new Set(requestedWorkspaceIds)].filter(Boolean);

        const responses = await Promise.all(
          uniqueWorkspaceIds.map(async (workspaceId) => {
            const params = new URLSearchParams({ workspaceId });
            const response = await fetch(`${API_URL}/tasks?${params}`, {
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
              signal: controller.signal,
            });

            const text = await response.text();
            const responseBody = safeParseJson<any>(text, null);

            if (response.status === 401) {
              handleUnauthorized();
              return [];
            }

            if (!response.ok) {
              throw new Error(
                responseBody?.error ||
                  responseBody?.message ||
                  text ||
                  "Görevler yüklenemedi.",
              );
            }

            if (!Array.isArray(responseBody)) {
              throw new Error(
                "Sunucudan beklenmeyen yanıt alındı. API adresini kontrol edin.",
              );
            }

            return responseBody as Task[];
          }),
        );

        if (controller.signal.aborted) return;

        const data = responses.flat().map((task) => ({
            ...task,
            description: task.description || "",
            status: task.status ?? "Yapılacak",
          }));
        const loadedWorkspaceIds = new Set(uniqueWorkspaceIds);
        setTasks((current) => [
          ...current.filter((task) => !loadedWorkspaceIds.has(task.workspaceId)),
          ...data,
        ]);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Bilinmeyen hata");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    if (user && idToken) {
      loadTasks();
    }

    return () => controller.abort();
  }, [
    handleUnauthorized,
    idToken,
    selectedWorkspaceId,
    setError,
    user,
    viewMode,
    workspaceIds.join(","),
  ]);

  useEffect(() => {
    localStorage.setItem("taskflow_archived_tasks", JSON.stringify(archivedTaskIds));
  }, [archivedTaskIds]);

  return {
    tasks,
    setTasks,
    form,
    loading,
    setLoading,
    showForm,
    setShowForm,
    query,
    setQuery,
    archivedTaskIds,
    successMessage,
    dismissSuccessMessage,
    handleChange,
    handleClearReminder,
    isFormValid,
    handleSubmit,
    handleArchiveTask,
    handleRestoreTask,
    handleDeleteTask,
  };
}
