import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ContactView from "./components/auth/ContactView";
import LandingPage from "./components/auth/LandingPage";
import LoginView from "./components/auth/LoginView";
import AppSidebar from "./components/layout/AppSidebar";
import InviteTeammateModal from "./components/layout/InviteTeammateModal";
import MembersPanelModal from "./components/layout/MembersPanelModal";
import ProfileDetailsModal from "./components/layout/ProfileDetailsModal";
import AppTopBar from "./components/layout/AppTopBar";
import WorkspacePanel from "./components/layout/WorkspacePanel";
import WorkspaceCreateModal from "./components/layout/sidebar/WorkspaceCreateModal";
import { API_URL } from "./constants";
import useAppUiEffects from "./hooks/useAppUiEffects";
import useAuthSession from "./hooks/useAuthSession";
import useTaskCrud from "./hooks/useTaskCrud";
import useTaskTableInteractions from "./hooks/useTaskTableInteractions";
import useWorkspaceManager from "./hooks/useWorkspaceManager";
import type {
  TableDensity,
  Task,
  TaskComment,
  ThemeMode,
  UserNotification,
  UserNotificationsResponse,
  WorkspaceInvitationsOverview,
} from "./types";
import { buildUserDisplayName, getUserInitials, safeParseJson } from "./utils";

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type InviteStatus = {
  type: "success" | "error";
  message: string;
} | null;

export default function App() {
  const {
    user,
    setUser,
    idToken,
    setIdToken,
    guestView,
    setGuestView,
    googleError,
  } = useAuthSession();

  const [error, setError] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem("taskflow_theme");
    return stored === "light" ? "light" : "dark";
  });
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileDetailsOpen, setProfileDetailsOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteeEmail, setInviteeEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>(null);
  const [inviteAccepting, setInviteAccepting] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [tableDensity, setTableDensity] = useState<TableDensity>(() => {
    const stored = localStorage.getItem("taskflow_table_density");
    return stored === "dense" ? "dense" : "normal";
  });
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [taskCommentsLoading, setTaskCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [taskUpdating, setTaskUpdating] = useState(false);
  const [notificationsMenuOpen, setNotificationsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);
  const [notificationsMarkingRead, setNotificationsMarkingRead] =
    useState(false);
  const [invitationsOverview, setInvitationsOverview] =
    useState<WorkspaceInvitationsOverview>({ pending: [], accepted: [] });
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [settingsInviteEmail, setSettingsInviteEmail] = useState("");
  const [settingsInviteSending, setSettingsInviteSending] = useState(false);
  const [settingsInviteStatus, setSettingsInviteStatus] = useState<
    string | null
  >(null);
  const [membersPanelOpen, setMembersPanelOpen] = useState(false);
  const [removingMemberUserId, setRemovingMemberUserId] = useState<
    number | null
  >(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 860);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null);
  const tasksTableWrapperRef = useRef<HTMLDivElement | null>(null);

  const collapseSidebarOnMobile = useCallback(() => {
    if (window.innerWidth <= 860) {
      setSidebarOpen(false);
    }
  }, []);

  const handleUnauthorized = useCallback(() => {
    setError("Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.");
    setUser(null);
    setIdToken(null);
    setGuestView("login");
    setProfileDetailsOpen(false);
    setMembersPanelOpen(false);
    setNotificationsMenuOpen(false);
    localStorage.removeItem("taskflow_user");
    localStorage.removeItem("taskflow_id_token");
  }, []);

  useEffect(() => {
    if (!user) {
      setProfileForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
      });
      return;
    }

    setProfileForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || user.authEmail,
      phone: user.phone || "",
    });
  }, [user]);

  const {
    selectedWorkspaceId,
    setSelectedWorkspaceId,
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
    reloadWorkspaces,
  } = useWorkspaceManager({
    idToken,
    user,
    setError,
    handleUnauthorized,
  });

  const {
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
  } = useTaskCrud({
    idToken,
    user,
    selectedWorkspaceId,
    handleUnauthorized,
    setError,
  });

  const archivedTasks = useMemo(() => {
    return tasks.filter((task) => {
      return (
        archivedWorkspaces.some(
          (workspace) => workspace.id === task.workspaceId,
        ) || archivedTaskIds.includes(task.id)
      );
    });
  }, [archivedTaskIds, archivedWorkspaces, tasks]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) {
      return null;
    }

    return tasks.find((task) => task.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasks]);

  const taskDetailsOpen = viewMode === "workspaces" && selectedTask !== null;

  useEffect(() => {
    if (viewMode !== "workspaces") {
      setSelectedTaskId(null);
      setTaskComments([]);
      setCommentDraft("");
      return;
    }

    if (!selectedTaskId) {
      return;
    }

    const taskStillVisible = tasks.some(
      (task) =>
        task.id === selectedTaskId && task.workspaceId === selectedWorkspace.id,
    );

    if (!taskStillVisible) {
      setSelectedTaskId(null);
      setTaskComments([]);
      setCommentDraft("");
    }
  }, [selectedTaskId, selectedWorkspace.id, tasks, viewMode]);

  useEffect(() => {
    if (!idToken || !user || !selectedTaskId || viewMode !== "workspaces") {
      setTaskComments([]);
      setTaskCommentsLoading(false);
      return;
    }

    let cancelled = false;

    const loadComments = async () => {
      setTaskCommentsLoading(true);
      try {
        const response = await fetch(
          `${API_URL}/tasks/${selectedTaskId}/comments`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          },
        );

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const text = await response.text();
        const payload = safeParseJson<TaskComment[] | null>(text, null);

        if (!response.ok) {
          throw new Error(
            (payload as any)?.error || text || "Yorumlar yuklenemedi.",
          );
        }

        if (!cancelled) {
          setTaskComments(Array.isArray(payload) ? payload : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Yorumlar yuklenemedi.",
          );
        }
      } finally {
        if (!cancelled) {
          setTaskCommentsLoading(false);
        }
      }
    };

    void loadComments();

    return () => {
      cancelled = true;
    };
  }, [handleUnauthorized, idToken, selectedTaskId, user, viewMode]);

  const handleOpenTaskDetails = useCallback((task: Task) => {
    setSelectedTaskId((current) => {
      if (current !== task.id) {
        setCommentDraft("");
      }
      return task.id;
    });
  }, []);

  const handleCloseTaskDetails = useCallback(() => {
    setSelectedTaskId(null);
    setTaskComments([]);
    setCommentDraft("");
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!idToken || !user) {
      setNotifications([]);
      setNotificationsUnreadCount(0);
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);

    try {
      const response = await fetch(`${API_URL}/notifications?limit=20`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const text = await response.text();
      const payload = safeParseJson<UserNotificationsResponse | null>(
        text,
        null,
      );

      if (!response.ok) {
        throw new Error(
          (payload as any)?.error || text || "Bildirimler yuklenemedi.",
        );
      }

      setNotifications(Array.isArray(payload?.items) ? payload.items : []);
      setNotificationsUnreadCount(
        typeof payload?.unreadCount === "number" ? payload.unreadCount : 0,
      );
    } catch (_error) {
      // Silent fail to avoid interrupting core task workflow with non-critical badge errors.
    } finally {
      setNotificationsLoading(false);
    }
  }, [handleUnauthorized, idToken, user]);

  const handleMarkNotificationsRead = useCallback(async () => {
    if (!idToken || !user || notificationsUnreadCount === 0) {
      return;
    }

    setNotificationsMarkingRead(true);

    try {
      const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const text = await response.text();
      const payload = safeParseJson<Record<string, any> | null>(text, null);

      if (!response.ok) {
        throw new Error(
          payload?.error || text || "Bildirimler guncellenemedi.",
        );
      }

      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true })),
      );
      setNotificationsUnreadCount(0);
    } catch (_error) {
      // Do not surface as blocking error.
    } finally {
      setNotificationsMarkingRead(false);
    }
  }, [handleUnauthorized, idToken, notificationsUnreadCount, user]);

  const handleSubmitTaskComment = useCallback(async () => {
    const content = commentDraft.trim();

    if (!content || !selectedTaskId || !idToken || !user) {
      return;
    }

    setCommentSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/tasks/${selectedTaskId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ content }),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const text = await response.text();
      const payload = safeParseJson<TaskComment | Record<string, any> | null>(
        text,
        null,
      );

      if (!response.ok || !payload || Array.isArray(payload)) {
        throw new Error((payload as any)?.error || text || "Yorum eklenemedi.");
      }

      setTaskComments((prev) => [payload as TaskComment, ...prev]);
      setCommentDraft("");
      void loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yorum eklenemedi.");
    } finally {
      setCommentSubmitting(false);
    }
  }, [
    commentDraft,
    handleUnauthorized,
    idToken,
    loadNotifications,
    selectedTaskId,
    user,
  ]);

  const handleSaveTaskDetails = useCallback(
    async (payload: { title: string; status: string; priority: string }) => {
      if (!selectedTaskId || !idToken || !user) {
        return;
      }

      setTaskUpdating(true);

      try {
        const response = await fetch(`${API_URL}/tasks/${selectedTaskId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const text = await response.text();
        const responseBody = safeParseJson<Task | Record<string, any> | null>(
          text,
          null,
        );

        if (!response.ok || !responseBody || Array.isArray(responseBody)) {
          throw new Error(
            (responseBody as any)?.error || text || "Gorev guncellenemedi.",
          );
        }

        const updatedTask = {
          ...(responseBody as Task),
          description: (responseBody as Task).description || "",
          status: (responseBody as Task).status ?? "Yapılacak",
        };

        setTasks((prev) =>
          prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
        );
        setError(null);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Gorev guncellenemedi.",
        );
      } finally {
        setTaskUpdating(false);
      }
    },
    [handleUnauthorized, idToken, selectedTaskId, setTasks, user],
  );

  const handleSignOut = useCallback(() => {
    setUser(null);
    setIdToken(null);
    setShowForm(false);
    setQuery("");
    setTasks([]);
    setWorkspaceMenuOpenId(null);
    setEditingWorkspaceId(null);
    setEditingWorkspaceName("");
    setProfileMenuOpen(false);
    setNotificationsMenuOpen(false);
    setProfileDetailsOpen(false);
    setMembersPanelOpen(false);
    setViewMode("workspaces");
    localStorage.removeItem("taskflow_user");
    localStorage.removeItem("taskflow_id_token");
  }, []);

  const {
    editingCell,
    editingValue,
    setEditingValue,
    collapsedStatusGroups,
    activePreviewCell,
    setActivePreviewCell,
    columnWidths,
    visibleTasks,
    statusGroupCounts,
    aiImprovingCell,
    startEditingCell,
    cancelCellEdit,
    saveCellEdit,
    handleAiImproveTaskField,
    handleAiImproveEditingCell,
    startColumnResize,
    fitColumnToContent,
    toggleStatusGroup,
    togglePreviewCell,
  } = useTaskTableInteractions({
    tasks,
    archivedTasks,
    archivedTaskIds,
    selectedWorkspaceId: selectedWorkspace.id,
    query,
    viewMode,
    idToken,
    tableWrapperRef: tasksTableWrapperRef,
    setLoading,
    setTasks,
    setError,
    handleUnauthorized,
  });

  useAppUiEffects({
    themeMode,
    tableDensity,
    settingsMenuRef,
    profileMenuRef,
    notificationsMenuRef,
    tasksTableWrapperRef,
    setWorkspaceMenuOpenId,
    setEditingWorkspaceId,
    setEditingWorkspaceName,
    setSettingsMenuOpen,
    setThemeMenuOpen,
    setProfileMenuOpen,
    setNotificationsMenuOpen,
    setActivePreviewCell,
  });

  const handleHideForm = useCallback(() => {
    setShowForm(false);
  }, [setShowForm]);

  const handleToggleProfileMenu = useCallback(() => {
    setNotificationsMenuOpen(false);
    setProfileMenuOpen((current) => !current);
  }, []);

  const handleToggleNotificationsMenu = useCallback(() => {
    setProfileMenuOpen(false);
    setNotificationsMenuOpen((current) => !current);
    void loadNotifications();
  }, [loadNotifications]);

  const handleOpenProfileDetails = useCallback(() => {
    setProfileMenuOpen(false);
    setProfileDetailsOpen(true);
  }, []);

  const handleOpenInviteModal = useCallback(() => {
    setProfileMenuOpen(false);
    setInviteStatus(null);
    setInviteModalOpen(true);
  }, []);

  const handleCloseInviteModal = useCallback(() => {
    if (inviteSending) {
      return;
    }

    setInviteModalOpen(false);
    setInviteStatus(null);
  }, [inviteSending]);

  const handleCloseProfileDetails = useCallback(() => {
    setProfileDetailsOpen(false);
  }, []);

  const handleProfileFieldChange = useCallback(
    (field: keyof ProfileFormState, value: string) => {
      setProfileForm((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [],
  );

  const handleSaveProfile = useCallback(async () => {
    if (!idToken || !user) {
      handleUnauthorized();
      return;
    }

    if (!profileForm.firstName.trim() || !profileForm.email.trim()) {
      setError("Ad ve e-posta alanlari zorunludur.");
      return;
    }

    setProfileSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          email: profileForm.email,
          phone: profileForm.phone,
        }),
      });

      const text = await response.text();
      const responseBody = safeParseJson<Record<string, any> | null>(
        text,
        null,
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          responseBody?.error || text || "Profil guncellenemedi.",
        );
      }

      if (!responseBody) {
        throw new Error("Profil guncelleme yaniti okunamadi.");
      }

      const nextUser = {
        ...user,
        authEmail: responseBody.authEmail,
        firstName: responseBody.firstName,
        lastName: responseBody.lastName || undefined,
        name: buildUserDisplayName(
          responseBody.firstName,
          responseBody.lastName || undefined,
          responseBody.email,
        ),
        email: responseBody.email,
        phone: responseBody.phone || undefined,
        picture: responseBody.picture || user.picture,
      };

      setUser(nextUser);
      localStorage.setItem("taskflow_user", JSON.stringify(nextUser));
      setProfileDetailsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profil guncellenemedi.");
    } finally {
      setProfileSaving(false);
    }
  }, [handleUnauthorized, idToken, profileForm, setUser, user]);

  const handleSendInvitation = useCallback(async () => {
    if (!idToken || !user) {
      handleUnauthorized();
      return;
    }

    const email = inviteeEmail.trim();
    if (!email) {
      setInviteStatus({
        type: "error",
        message: "Lutfen davet edilecek e-posta adresini girin.",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setInviteStatus({
        type: "error",
        message: "Lutfen gecerli bir e-posta adresi girin.",
      });
      return;
    }

    setInviteSending(true);
    setInviteStatus(null);

    try {
      const response = await fetch(`${API_URL}/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          inviteeEmail: email,
          message: inviteMessage,
          workspaceId: selectedWorkspace.id,
        }),
      });

      const text = await response.text();
      const responseBody = safeParseJson<Record<string, any> | null>(
        text,
        null,
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          responseBody?.error ||
            text ||
            "Davet gonderilemedi. Lutfen tekrar deneyin.",
        );
      }

      setInviteStatus({
        type: "success",
        message: responseBody?.immediateAccessGranted
          ? "Davet gonderildi. Bu hesap zaten kayitli oldugu icin erisim aninda tanimlandi."
          : "Davet e-postasi basariyla gonderildi.",
      });
      setInviteeEmail("");
      setInviteMessage("");
    } catch (err) {
      setInviteStatus({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Davet gonderilemedi. Lutfen tekrar deneyin.",
      });
    } finally {
      setInviteSending(false);
    }
  }, [
    handleUnauthorized,
    idToken,
    inviteMessage,
    inviteeEmail,
    selectedWorkspace.id,
    user,
  ]);

  const loadInvitationsOverview = useCallback(async () => {
    if (!idToken || !user || !selectedWorkspace.id) {
      setInvitationsOverview({ pending: [], accepted: [] });
      setInvitationsError(null);
      setInvitationsLoading(false);
      return;
    }

    setInvitationsLoading(true);
    setInvitationsError(null);

    try {
      const response = await fetch(
        `${API_URL}/workspaces/${selectedWorkspace.id}/invitations`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const text = await response.text();
      const payload = safeParseJson<WorkspaceInvitationsOverview | null>(
        text,
        null,
      );

      if (!response.ok) {
        throw new Error(
          (payload as any)?.error || text || "Davetler yuklenemedi.",
        );
      }

      setInvitationsOverview({
        pending: Array.isArray(payload?.pending) ? payload.pending : [],
        accepted: Array.isArray(payload?.accepted) ? payload.accepted : [],
      });
    } catch (error) {
      setInvitationsOverview({ pending: [], accepted: [] });
      setInvitationsError(
        error instanceof Error ? error.message : "Davetler yuklenemedi.",
      );
    } finally {
      setInvitationsLoading(false);
    }
  }, [handleUnauthorized, idToken, selectedWorkspace.id, user]);

  const handleSendSettingsInvite = useCallback(async () => {
    if (!idToken || !user) {
      handleUnauthorized();
      return;
    }

    const email = settingsInviteEmail.trim();
    if (!email) {
      setSettingsInviteStatus("Lutfen davet edilecek e-posta adresini girin.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setSettingsInviteStatus("Lutfen gecerli bir e-posta adresi girin.");
      return;
    }

    setSettingsInviteSending(true);
    setSettingsInviteStatus(null);

    try {
      const response = await fetch(`${API_URL}/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          inviteeEmail: email,
          message: "",
          workspaceId: selectedWorkspace.id,
        }),
      });

      const text = await response.text();
      const responseBody = safeParseJson<Record<string, any> | null>(
        text,
        null,
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          responseBody?.error ||
            text ||
            "Davet gonderilemedi. Lutfen tekrar deneyin.",
        );
      }

      setSettingsInviteStatus("Davet basariyla gonderildi.");
      setSettingsInviteEmail("");
      await loadInvitationsOverview();
    } catch (err) {
      setSettingsInviteStatus(
        err instanceof Error
          ? err.message
          : "Davet gonderilemedi. Lutfen tekrar deneyin.",
      );
    } finally {
      setSettingsInviteSending(false);
    }
  }, [
    handleUnauthorized,
    idToken,
    loadInvitationsOverview,
    selectedWorkspace.id,
    settingsInviteEmail,
    user,
  ]);

  const handleRemoveWorkspaceMember = useCallback(
    async (memberUserId: number) => {
      if (!idToken || !user) {
        handleUnauthorized();
        return;
      }

      setRemovingMemberUserId(memberUserId);
      setSettingsInviteStatus(null);

      try {
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace.id}/members/${memberUserId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          },
        );

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const text = await response.text();
        const payload = safeParseJson<Record<string, any> | null>(text, null);

        if (!response.ok) {
          throw new Error(payload?.error || text || "Uye cikarilamadi.");
        }

        setSettingsInviteStatus("Uye calisma alanindan cikarildi.");
        await loadInvitationsOverview();
      } catch (error) {
        setSettingsInviteStatus(
          error instanceof Error ? error.message : "Uye cikarilamadi.",
        );
      } finally {
        setRemovingMemberUserId(null);
      }
    },
    [
      handleUnauthorized,
      idToken,
      loadInvitationsOverview,
      selectedWorkspace.id,
      user,
    ],
  );

  useEffect(() => {
    if (!idToken || !user) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("inviteToken");
    if (!inviteToken) {
      return;
    }

    let cancelled = false;

    const acceptInvite = async () => {
      setInviteAccepting(true);
      try {
        const response = await fetch(`${API_URL}/invitations/accept`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ token: inviteToken }),
        });

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const text = await response.text();
        const payload = safeParseJson<Record<string, any> | null>(text, null);

        if (!response.ok) {
          throw new Error(payload?.error || text || "Davet kabul edilemedi.");
        }

        if (cancelled) {
          return;
        }

        const acceptedWorkspaceId =
          typeof payload?.workspace?.id === "string"
            ? payload.workspace.id
            : "";

        if (acceptedWorkspaceId) {
          setSelectedWorkspaceId(acceptedWorkspaceId);
        }

        await reloadWorkspaces();
        setError(null);

        const newUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState({}, document.title, newUrl);
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error ? error.message : "Davet kabul edilemedi.",
          );
        }
      } finally {
        if (!cancelled) {
          setInviteAccepting(false);
        }
      }
    };

    acceptInvite();

    return () => {
      cancelled = true;
    };
  }, [
    handleUnauthorized,
    idToken,
    reloadWorkspaces,
    setSelectedWorkspaceId,
    user,
  ]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((current) => !current);
  }, []);

  const handleToggleWorkspaceInput = useCallback(() => {
    setShowWorkspaceInput((current) => !current);
  }, [setShowWorkspaceInput]);

  const handleCancelWorkspaceCreate = useCallback(() => {
    setNewWorkspaceName("");
    setShowWorkspaceInput(false);
  }, [setNewWorkspaceName, setShowWorkspaceInput]);

  const handleSelectWorkspace = useCallback(
    (workspaceId: string) => {
      setSelectedWorkspaceId(workspaceId);
      setViewMode("workspaces");
      collapseSidebarOnMobile();
    },
    [collapseSidebarOnMobile, setSelectedWorkspaceId, setViewMode],
  );

  const handleToggleWorkspaceMenu = useCallback(
    (workspaceId: string) => {
      setWorkspaceMenuOpenId((current) =>
        current === workspaceId ? null : workspaceId,
      );
    },
    [setWorkspaceMenuOpenId],
  );

  const handleSetArchiveView = useCallback(() => {
    setViewMode("archive");
    collapseSidebarOnMobile();
  }, [collapseSidebarOnMobile, setViewMode]);

  const handleToggleSettingsMenu = useCallback(() => {
    setSettingsMenuOpen((current) => !current);
  }, []);

  const handleOpenMembersPanel = useCallback(() => {
    setSettingsMenuOpen(false);
    setMembersPanelOpen(true);
    setSettingsInviteStatus(null);
    void loadInvitationsOverview();
  }, [loadInvitationsOverview]);

  const handleCloseMembersPanel = useCallback(() => {
    setMembersPanelOpen(false);
  }, []);

  useEffect(() => {
    if (!settingsMenuOpen) {
      return;
    }

    setSettingsInviteStatus(null);
    void loadInvitationsOverview();
  }, [loadInvitationsOverview, settingsMenuOpen]);

  useEffect(() => {
    if (!idToken || !user) {
      setNotifications([]);
      setNotificationsUnreadCount(0);
      return;
    }

    void loadNotifications();

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [idToken, loadNotifications, user]);

  const handleToggleThemeMenu = useCallback(() => {
    setThemeMenuOpen((current) => !current);
  }, []);

  const handleSetThemeMode = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    setThemeMenuOpen(false);
  }, []);

  const handleToggleShowForm = useCallback(() => {
    setShowForm((current) => !current);
  }, [setShowForm]);

  const handleSetTableDensity = useCallback((density: TableDensity) => {
    setTableDensity(density);
  }, []);

  const tasksTableProps = useMemo(
    () => ({
      tableWrapperRef: tasksTableWrapperRef,
      showForm,
      form,
      columnWidths,
      loading,
      tasks,
      visibleTasks,
      viewMode,
      collapsedStatusGroups,
      statusGroupCounts,
      editingCell,
      editingValue,
      activePreviewCell,
      archivedTaskIds,
      isFormValid,
      aiImprovingCell,
      onAiImproveTaskField: handleAiImproveTaskField,
      onAiImproveEditingCell: handleAiImproveEditingCell,
      onChangeForm: handleChange,
      onSubmit: handleSubmit,
      onHideForm: handleHideForm,
      onToggleStatusGroup: toggleStatusGroup,
      onStartColumnResize: startColumnResize,
      onFitColumnToContent: fitColumnToContent,
      onTogglePreviewCell: togglePreviewCell,
      onOpenTaskDetails: handleOpenTaskDetails,
      onStartEditingCell: startEditingCell,
      onSetEditingValue: setEditingValue,
      onSaveCellEdit: saveCellEdit,
      onCancelCellEdit: cancelCellEdit,
      onRestoreTask: handleRestoreTask,
      onArchiveTask: handleArchiveTask,
      onDeleteTask: handleDeleteTask,
    }),
    [
      activePreviewCell,
      archivedTaskIds,
      cancelCellEdit,
      collapsedStatusGroups,
      columnWidths,
      editingCell,
      editingValue,
      fitColumnToContent,
      form,
      handleArchiveTask,
      handleAiImproveTaskField,
      handleAiImproveEditingCell,
      handleChange,
      handleDeleteTask,
      handleHideForm,
      handleRestoreTask,
      handleSubmit,
      isFormValid,
      loading,
      aiImprovingCell,
      saveCellEdit,
      setEditingValue,
      showForm,
      startColumnResize,
      startEditingCell,
      statusGroupCounts,
      tasks,
      togglePreviewCell,
      handleOpenTaskDetails,
      toggleStatusGroup,
      viewMode,
      visibleTasks,
    ],
  );

  const sidebarProps = useMemo(
    () => ({
      sidebarOpen,
      activeWorkspaces,
      selectedWorkspace,
      editingWorkspaceId,
      editingWorkspaceName,
      workspaceMenuOpenId,
      viewMode,
      settingsMenuOpen,
      themeMenuOpen,
      themeMode,
      invitationsOverview,
      invitationsLoading,
      invitationsError,
      settingsInviteEmail,
      settingsInviteSending,
      settingsInviteStatus,
      removingMemberUserId,
      settingsMenuRef,
      onToggleWorkspaceInput: handleToggleWorkspaceInput,
      onStartWorkspaceRename: startWorkspaceRename,
      onEditingWorkspaceNameChange: setEditingWorkspaceName,
      onSubmitWorkspaceRename: submitWorkspaceRename,
      onCancelWorkspaceRename: cancelWorkspaceRename,
      onSelectWorkspace: handleSelectWorkspace,
      onToggleWorkspaceMenu: handleToggleWorkspaceMenu,
      onArchiveWorkspace: handleArchiveWorkspace,
      onDeleteWorkspace: handleDeleteWorkspace,
      onSetArchiveView: handleSetArchiveView,
      onToggleSidebar: handleToggleSidebar,
      onToggleSettingsMenu: handleToggleSettingsMenu,
      onToggleThemeMenu: handleToggleThemeMenu,
      onSetThemeMode: handleSetThemeMode,
      onOpenMembersPanel: handleOpenMembersPanel,
      onSettingsInviteEmailChange: setSettingsInviteEmail,
      onSendSettingsInvite: handleSendSettingsInvite,
      onRemoveWorkspaceMember: handleRemoveWorkspaceMember,
      onSignOut: handleSignOut,
    }),
    [
      activeWorkspaces,
      cancelWorkspaceRename,
      editingWorkspaceId,
      editingWorkspaceName,
      handleArchiveWorkspace,
      handleCancelWorkspaceCreate,
      handleCreateWorkspace,
      handleDeleteWorkspace,
      handleSelectWorkspace,
      handleSetArchiveView,
      handleSetThemeMode,
      handleOpenMembersPanel,
      handleSignOut,
      handleToggleSidebar,
      handleToggleSettingsMenu,
      handleToggleThemeMenu,
      handleToggleWorkspaceInput,
      handleToggleWorkspaceMenu,
      newWorkspaceName,
      sidebarOpen,
      selectedWorkspace,
      settingsMenuOpen,
      invitationsOverview,
      invitationsLoading,
      invitationsError,
      handleRemoveWorkspaceMember,
      handleSendSettingsInvite,
      startWorkspaceRename,
      settingsInviteEmail,
      settingsInviteSending,
      settingsInviteStatus,
      submitWorkspaceRename,
      themeMenuOpen,
      themeMode,
      viewMode,
      workspaceMenuOpenId,
      removingMemberUserId,
    ],
  );

  const workspacePanelProps = useMemo(
    () => ({
      viewMode,
      selectedWorkspace,
      query,
      onQueryChange: setQuery,
      archivedWorkspaces,
      error,
      showForm,
      tableDensity,
      onSetTableDensity: handleSetTableDensity,
      onToggleShowForm: handleToggleShowForm,
      onRestoreWorkspace: handleRestoreWorkspace,
      tasksTableProps,
      selectedTask,
      taskDetailsOpen,
      comments: taskComments,
      commentsLoading: taskCommentsLoading,
      commentDraft,
      commentSubmitting,
      taskUpdating,
      currentUser: user,
      onCloseTaskDetails: handleCloseTaskDetails,
      onCommentDraftChange: setCommentDraft,
      onSubmitComment: handleSubmitTaskComment,
      onSaveTaskDetails: handleSaveTaskDetails,
    }),
    [
      archivedWorkspaces,
      error,
      handleRestoreWorkspace,
      handleSetTableDensity,
      handleToggleShowForm,
      query,
      selectedWorkspace,
      showForm,
      tableDensity,
      taskComments,
      taskCommentsLoading,
      commentDraft,
      commentSubmitting,
      taskUpdating,
      taskDetailsOpen,
      selectedTask,
      user,
      handleCloseTaskDetails,
      handleSaveTaskDetails,
      handleSubmitTaskComment,
      tasksTableProps,
      viewMode,
    ],
  );

  if (!user) {
    if (guestView === "login") {
      return (
        <LoginView
          googleError={googleError}
          onBackToLanding={() => setGuestView("landing")}
        />
      );
    }

    if (guestView === "contact") {
      return (
        <ContactView
          onBackToLanding={() => setGuestView("landing")}
          onGoToLogin={() => setGuestView("login")}
        />
      );
    }

    return (
      <LandingPage
        onGoToContact={() => setGuestView("contact")}
        onGoToLogin={() => setGuestView("login")}
      />
    );
  }

  const topBarProps = {
    user,
    userInitials: getUserInitials(user.name),
    profileMenuOpen,
    profileMenuRef,
    notificationsMenuRef,
    themeMode,
    notificationsMenuOpen,
    notifications,
    notificationsLoading: notificationsLoading || notificationsMarkingRead,
    notificationsUnreadCount,
    onToggleProfileMenu: handleToggleProfileMenu,
    onToggleNotificationsMenu: handleToggleNotificationsMenu,
    onMarkNotificationsRead: handleMarkNotificationsRead,
    onOpenInviteModal: handleOpenInviteModal,
    onOpenProfileDetails: handleOpenProfileDetails,
    onSetThemeMode: handleSetThemeMode,
    onSignOut: handleSignOut,
  };

  return (
    <div className="app-layout">
      <AppTopBar {...topBarProps} />

      <div
        className={`app-shell ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
      >
        <AppSidebar {...sidebarProps} />

        <WorkspacePanel {...workspacePanelProps} />
      </div>

      {sidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <WorkspaceCreateModal
        open={showWorkspaceInput}
        value={newWorkspaceName}
        onValueChange={setNewWorkspaceName}
        onCreate={handleCreateWorkspace}
        onClose={handleCancelWorkspaceCreate}
      />

      <ProfileDetailsModal
        open={profileDetailsOpen}
        form={profileForm}
        saving={profileSaving}
        onFieldChange={handleProfileFieldChange}
        onSave={handleSaveProfile}
        onClose={handleCloseProfileDetails}
      />

      <InviteTeammateModal
        open={inviteModalOpen}
        workspaceName={selectedWorkspace.name}
        inviteeEmail={inviteeEmail}
        message={inviteMessage}
        sending={inviteSending || inviteAccepting}
        status={inviteStatus}
        onInviteeEmailChange={setInviteeEmail}
        onMessageChange={setInviteMessage}
        onSend={handleSendInvitation}
        onClose={handleCloseInviteModal}
      />

      <MembersPanelModal
        open={membersPanelOpen}
        workspaceName={selectedWorkspace.name}
        currentUserEmail={user.email || user.authEmail}
        invitationsOverview={invitationsOverview}
        invitationsLoading={invitationsLoading}
        invitationsError={invitationsError}
        settingsInviteEmail={settingsInviteEmail}
        settingsInviteSending={settingsInviteSending}
        settingsInviteStatus={settingsInviteStatus}
        removingMemberUserId={removingMemberUserId}
        onInviteEmailChange={setSettingsInviteEmail}
        onSendInvite={handleSendSettingsInvite}
        onRemoveWorkspaceMember={handleRemoveWorkspaceMember}
        onClose={handleCloseMembersPanel}
      />
    </div>
  );
}
