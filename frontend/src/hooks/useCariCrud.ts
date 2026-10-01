import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { API_URL, initialCariForm } from "../constants";
import type { CariEntry, CariEntryForm, User } from "../types";
import { safeParseJson } from "../utils";

type UseCariCrudArgs = {
  idToken: string | null;
  user: User | null;
  selectedWorkspaceId: string;
  isCariWorkspace: boolean;
  handleUnauthorized: () => void;
  setError: Dispatch<SetStateAction<string | null>>;
  onEntryAdded: () => void;
};

export default function useCariCrud({
  idToken,
  user,
  selectedWorkspaceId,
  isCariWorkspace,
  handleUnauthorized,
  setError,
  onEntryAdded,
}: UseCariCrudArgs) {
  const [entries, setEntries] = useState<CariEntry[]>([]);
  const [form, setForm] = useState<CariEntryForm>(initialCariForm);
  const [loading, setLoading] = useState(false);

  const handleChange = useCallback(
    (field: keyof CariEntryForm) =>
      (
        event: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
      },
    [],
  );

  const isFormValid = useMemo(
    () => form.date.trim().length > 0 && Number(form.amount) > 0,
    [form.date, form.amount],
  );

  const handleSubmit = useCallback(async () => {
    if (!isFormValid) {
      setError("Lütfen tarih ve tutarı doğru girin.");
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
      const response = await fetch(`${API_URL}/cari-entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          date: new Date(form.date).toISOString(),
          description: form.description,
          type: form.type,
          amount: Number(form.amount),
        }),
      });

      const text = await response.text();
      const responseBody = safeParseJson<any>(text, null);

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          responseBody?.error || text || `Hata ${response.status}: ${response.statusText}`,
        );
      }

      const newEntry = responseBody as CariEntry;
      setEntries((prev) =>
        [...prev, newEntry].sort((a, b) => a.date.localeCompare(b.date)),
      );
      setForm({ ...initialCariForm, date: form.date });
      onEntryAdded();
    } catch (err) {
      console.error("Cari kaydı kaydetme hatası", err);
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [
    form,
    handleUnauthorized,
    idToken,
    isFormValid,
    onEntryAdded,
    selectedWorkspaceId,
    setError,
  ]);

  const handleDeleteEntry = useCallback(
    async (entryId: number) => {
      if (!idToken) {
        setError("Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.");
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/cari-entries/${entryId}`, {
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

        setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kayıt silinemedi.");
      } finally {
        setLoading(false);
      }
    },
    [handleUnauthorized, idToken, setError],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadEntries() {
      if (!selectedWorkspaceId) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ workspaceId: selectedWorkspaceId });
        const response = await fetch(`${API_URL}/cari-entries?${params}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          signal: controller.signal,
        });

        const text = await response.text();
        const responseBody = safeParseJson<any>(text, null);

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(
            responseBody?.error || text || "Cari kayıtları yüklenemedi.",
          );
        }

        if (!Array.isArray(responseBody)) {
          throw new Error(
            "Sunucudan beklenmeyen yanıt alındı. API adresini kontrol edin.",
          );
        }

        if (controller.signal.aborted) return;
        setEntries(responseBody as CariEntry[]);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Bilinmeyen hata");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    if (user && idToken && isCariWorkspace) {
      loadEntries();
    } else {
      setEntries([]);
    }

    return () => controller.abort();
  }, [handleUnauthorized, idToken, isCariWorkspace, selectedWorkspaceId, setError, user]);

  const balance = useMemo(
    () =>
      entries.reduce(
        (total, entry) =>
          entry.type === "ALACAK" ? total + entry.amount : total - entry.amount,
        0,
      ),
    [entries],
  );

  return {
    entries,
    form,
    loading,
    balance,
    handleChange,
    isFormValid,
    handleSubmit,
    handleDeleteEntry,
  };
}
