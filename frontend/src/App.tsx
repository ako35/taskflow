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
import type { TableDensity, ThemeMode } from "./types";
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
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 860);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
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
    setProfileDetailsOpen(false);
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
    tasksTableWrapperRef,
    setWorkspaceMenuOpenId,
    setEditingWorkspaceId,
    setEditingWorkspaceName,
    setSettingsMenuOpen,
    setThemeMenuOpen,
    setProfileMenuOpen,
    setActivePreviewCell,
  });

  const handleHideForm = useCallback(() => {
    setShowForm(false);
  }, [setShowForm]);

  const handleToggleProfileMenu = useCallback(() => {
    setProfileMenuOpen((current) => !current);
  }, []);

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
      startWorkspaceRename,
      submitWorkspaceRename,
      themeMenuOpen,
      themeMode,
      viewMode,
      workspaceMenuOpenId,
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
    themeMode,
    onToggleProfileMenu: handleToggleProfileMenu,
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
    </div>
  );
}
