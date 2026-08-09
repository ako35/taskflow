import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { API_URL, initialForm } from "../constants";
import type { Task, TaskForm, User } from "../types";
import { safeParseJson } from "../utils";

type UseTaskCrudArgs = {
  idToken: string | null;
  user: User | null;
  selectedWorkspaceId: string;
  handleUnauthorized: () => void;
  setError: Dispatch<SetStateAction<string | null>>;
};

export default function useTaskCrud({
  idToken,
  user,
  selectedWorkspaceId,
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
          ...form,
          workspaceId: selectedWorkspaceId,
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Görev silinemedi.");
      } finally {
        setLoading(false);
      }
    },
    [handleUnauthorized, idToken, setError],
  );

  useEffect(() => {
    async function loadTasks() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/tasks`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
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
            "Görevler yüklenemedi.";
          throw new Error(message);
        }

        if (!Array.isArray(responseBody)) {
          throw new Error(
            "Sunucudan beklenmeyen yanıt alındı. API adresini kontrol edin.",
          );
        }

        const data = responseBody as Task[];
        setTasks(
          data.map((task) => ({
            ...task,
            description: task.description || "",
            status: task.status ?? "Yapılacak",
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bilinmeyen hata");
      } finally {
        setLoading(false);
      }
    }

    if (user && idToken) {
      loadTasks();
    }
  }, [handleUnauthorized, idToken, setError, user]);

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
    handleChange,
    isFormValid,
    handleSubmit,
    handleArchiveTask,
    handleRestoreTask,
    handleDeleteTask,
  };
}
