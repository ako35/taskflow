import { useCallback, useEffect, useState } from "react";
import type { WorkspaceInvitationsOverview, WorkspaceMemberInfo } from "@taskflow/shared";
import {
  ApiError,
  cancelWorkspaceInvitation,
  fetchWorkspaceInvitations,
  fetchWorkspaceMembers,
  removeWorkspaceMember,
  sendInvitation,
} from "../lib/api";

export default function useWorkspaceMembers(idToken: string, workspaceId: string) {
  const [members, setMembers] = useState<WorkspaceMemberInfo[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitationsOverview>({
    pending: [],
    accepted: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<
    string | null
  >(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [memberList, invitationsOverview] = await Promise.all([
        fetchWorkspaceMembers(idToken, workspaceId),
        fetchWorkspaceInvitations(idToken, workspaceId),
      ]);
      setMembers(memberList);
      setInvitations(invitationsOverview);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return;
      }
      setError("Üyeler yüklenemedi.");
    }
  }, [idToken, workspaceId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const invite = useCallback(
    async (inviteeEmail: string, message?: string) => {
      setSending(true);
      try {
        const result = await sendInvitation(idToken, { inviteeEmail, workspaceId, message });
        await load();
        return result;
      } finally {
        setSending(false);
      }
    },
    [idToken, workspaceId, load],
  );

  const removeMember = useCallback(
    async (memberUserId: number) => {
      setRemovingId(memberUserId);
      try {
        await removeWorkspaceMember(idToken, workspaceId, memberUserId);
        await load();
      } finally {
        setRemovingId(null);
      }
    },
    [idToken, workspaceId, load],
  );

  const cancelInvitation = useCallback(
    async (invitationId: string) => {
      setCancellingInvitationId(invitationId);
      try {
        await cancelWorkspaceInvitation(idToken, workspaceId, invitationId);
        await load();
      } finally {
        setCancellingInvitationId(null);
      }
    },
    [idToken, workspaceId, load],
  );

  return {
    members,
    invitations,
    loading,
    error,
    sending,
    removingId,
    cancellingInvitationId,
    invite,
    removeMember,
    cancelInvitation,
    reload: load,
  };
}
