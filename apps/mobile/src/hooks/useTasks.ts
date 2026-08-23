import { useCallback, useEffect, useState } from "react";
import type { Task } from "@taskflow/shared";
import {
  ApiError,
  createTask as createTaskRequest,
  deleteTask as deleteTaskRequest,
  fetchTasks,
  updateTask as updateTaskRequest,
  type CreateTaskPayload,
  type UpdateTaskPayload,
} from "../lib/api";

export default function useTasks(idToken: string, workspaceId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setTasks([]);
      return;
    }
    try {
      setError(null);
      const items = await fetchTasks(idToken, workspaceId);
      setTasks(items);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return;
      }
      setError("Görevler yüklenemedi. Bağlantınızı kontrol edin.");
    }
  }, [idToken, workspaceId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const createTask = useCallback(
    async (payload: Omit<CreateTaskPayload, "workspaceId">) => {
      if (!workspaceId) throw new Error("Önce bir çalışma alanı seçin.");
      const created = await createTaskRequest(idToken, { ...payload, workspaceId });
      setTasks((current) => [created, ...current]);
      return created;
    },
    [idToken, workspaceId],
  );

  const updateTask = useCallback(
    async (taskId: number, payload: UpdateTaskPayload) => {
      const updated = await updateTaskRequest(idToken, taskId, payload);
      setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)));
      return updated;
    },
    [idToken],
  );

  const deleteTask = useCallback(
    async (taskId: number) => {
      await deleteTaskRequest(idToken, taskId);
      setTasks((current) => current.filter((task) => task.id !== taskId));
    },
    [idToken],
  );

  return {
    tasks,
    loading,
    error,
    reload: load,
    createTask,
    updateTask,
    deleteTask,
  };
}
