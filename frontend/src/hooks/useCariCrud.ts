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

function monthKeyOf(isoDate: string) {
  return isoDate.slice(0, 7);
}

function currentMonthKey() {
  return monthKeyOf(new Date().toISOString());
}

function shiftMonthKey(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const shifted = new Date(year, month - 1 + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}

function monthKeyLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });
}

type UseCariCrudArgs = {
  idToken: string | null;
  user: User | null;
  selectedWorkspaceId: string;
  isLedgerWorkspace: boolean;
  enableMonthFilter: boolean;
  handleUnauthorized: () => void;
  setError: Dispatch<SetStateAction<string | null>>;
  onEntryAdded: () => void;
};

export default function useCariCrud({
  idToken,
  user,
  selectedWorkspaceId,
  isLedgerWorkspace,
  enableMonthFilter,
  handleUnauthorized,
  setError,
  onEntryAdded,
}: UseCariCrudArgs) {
  const [entries, setEntries] = useState<CariEntry[]>([]);
  const [form, setForm] = useState<CariEntryForm>(initialCariForm);
  const [loading, setLoading] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<CariEntryForm>(initialCariForm);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  useEffect(() => {
    setSelectedMonth(currentMonthKey());
  }, [selectedWorkspaceId]);

  const handlePrevMonth = useCallback(() => {
    setSelectedMonth((current) => shiftMonthKey(current, -1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setSelectedMonth((current) => shiftMonthKey(current, 1));
  }, []);

  const handleGoToCurrentMonth = useCallback(() => {
    setSelectedMonth(currentMonthKey());
  }, []);

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
      if (enableMonthFilter) {
        setSelectedMonth(monthKeyOf(newEntry.date));
      }
      onEntryAdded();
    } catch (err) {
      console.error("Cari kaydı kaydetme hatası", err);
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [
    enableMonthFilter,
    form,
    handleUnauthorized,
    idToken,
    isFormValid,
    onEntryAdded,
    selectedWorkspaceId,
    setError,
  ]);

  const handleStartEdit = useCallback((entry: CariEntry) => {
    setEditingEntryId(entry.id);
    setEditForm({
      date: entry.date.slice(0, 10),
      description: entry.description,
      type: entry.type,
      amount: String(entry.amount),
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingEntryId(null);
  }, []);

  const handleEditChange = useCallback(
    (field: keyof CariEntryForm) =>
      (
        event: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => {
        setEditForm((current) => ({ ...current, [field]: event.target.value }));
      },
    [],
  );

  const isEditFormValid = useMemo(
    () => editForm.date.trim().length > 0 && Number(editForm.amount) > 0,
    [editForm.date, editForm.amount],
  );

  const handleSaveEdit = useCallback(async () => {
    if (editingEntryId === null) return;

    if (!isEditFormValid) {
      setError("Lütfen tarih ve tutarı doğru girin.");
      return;
    }

    if (!idToken) {
      setError("Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.");
      return;
    }

    setEditSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/cari-entries/${editingEntryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          date: new Date(editForm.date).toISOString(),
          description: editForm.description,
          type: editForm.type,
          amount: Number(editForm.amount),
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

      const updatedEntry = responseBody as CariEntry;
      setEntries((prev) =>
        prev
          .map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry))
          .sort((a, b) => a.date.localeCompare(b.date)),
      );
      if (enableMonthFilter) {
        setSelectedMonth(monthKeyOf(updatedEntry.date));
      }
      setEditingEntryId(null);
    } catch (err) {
      console.error("Cari kaydı güncelleme hatası", err);
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setEditSubmitting(false);
    }
  }, [
    editForm,
    editingEntryId,
    enableMonthFilter,
    handleUnauthorized,
    idToken,
    isEditFormValid,
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

    if (user && idToken && isLedgerWorkspace) {
      loadEntries();
    } else {
      setEntries([]);
    }

    return () => controller.abort();
  }, [handleUnauthorized, idToken, isLedgerWorkspace, selectedWorkspaceId, setError, user]);

  const visibleEntries = useMemo(
    () =>
      enableMonthFilter
        ? entries.filter((entry) => monthKeyOf(entry.date) === selectedMonth)
        : entries,
    [enableMonthFilter, entries, selectedMonth],
  );

  const balance = useMemo(
    () =>
      visibleEntries.reduce(
        (total, entry) =>
          entry.type === "ALACAK" ? total + entry.amount : total - entry.amount,
        0,
      ),
    [visibleEntries],
  );

  const isCurrentMonth = selectedMonth === currentMonthKey();
  const monthLabel = useMemo(() => monthKeyLabel(selectedMonth), [selectedMonth]);

  return {
    entries: visibleEntries,
    form,
    loading,
    balance,
    handleChange,
    isFormValid,
    handleSubmit,
    handleDeleteEntry,
    editingEntryId,
    editForm,
    editSubmitting,
    isEditFormValid,
    handleStartEdit,
    handleCancelEdit,
    handleEditChange,
    handleSaveEdit,
    showMonthNav: enableMonthFilter,
    monthLabel,
    isCurrentMonth,
    onPrevMonth: handlePrevMonth,
    onNextMonth: handleNextMonth,
    onGoToCurrentMonth: handleGoToCurrentMonth,
  };
}
