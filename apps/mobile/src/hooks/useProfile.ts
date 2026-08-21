import { useCallback, useEffect, useState } from "react";
import { fetchProfile, updateProfile, type UpdateProfilePayload } from "../lib/api";
import type { UserProfile } from "../types";

export default function useProfile(idToken: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const item = await fetchProfile(idToken);
      setProfile(item);
    } catch {
      setError("Profil yüklenemedi.");
    }
  }, [idToken]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const save = useCallback(
    async (payload: UpdateProfilePayload) => {
      setSaving(true);
      try {
        const updated = await updateProfile(idToken, payload);
        setProfile(updated);
        return updated;
      } finally {
        setSaving(false);
      }
    },
    [idToken],
  );

  return { profile, loading, error, saving, save, reload: load };
}
