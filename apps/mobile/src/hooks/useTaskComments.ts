import { useCallback, useEffect, useState } from "react";
import type { TaskComment } from "@taskflow/shared";
import {
  ApiError,
  createTaskComment,
  deleteTaskComment,
  fetchTaskComments,
} from "../lib/api";

export default function useTaskComments(idToken: string, taskId: number | null) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!taskId) {
      setComments([]);
      return;
    }
    try {
      setError(null);
      const items = await fetchTaskComments(idToken, taskId);
      setComments(items);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return;
      }
      setError("Yorumlar yüklenemedi.");
    }
  }, [idToken, taskId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const addComment = useCallback(
    async (content: string) => {
      if (!taskId) return;
      setSubmitting(true);
      try {
        const created = await createTaskComment(idToken, taskId, content);
        setComments((current) => [created, ...current]);
      } finally {
        setSubmitting(false);
      }
    },
    [idToken, taskId],
  );

  const removeComment = useCallback(
    async (commentId: number) => {
      if (!taskId) return;
      await deleteTaskComment(idToken, taskId, commentId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
    },
    [idToken, taskId],
  );

  return {
    comments,
    loading,
    error,
    submitting,
    addComment,
    removeComment,
  };
}
