import React, { useCallback, useMemo, useRef, useState } from "react";
import ContactView from "./components/auth/ContactView";
import LandingPage from "./components/auth/LandingPage";
import LoginView from "./components/auth/LoginView";
import AppSidebar from "./components/layout/AppSidebar";
import AppTopBar from "./components/layout/AppTopBar";
import WorkspacePanel from "./components/layout/WorkspacePanel";
import useAppUiEffects from "./hooks/useAppUiEffects";
import useAuthSession from "./hooks/useAuthSession";
import useTaskCrud from "./hooks/useTaskCrud";
import useTaskTableInteractions from "./hooks/useTaskTableInteractions";
import useWorkspaceManager from "./hooks/useWorkspaceManager";
import { DEFAULT_WORKSPACE_ID } from "./constants";
import type { ThemeMode } from "./types";
import { getUserInitials } from "./utils";

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
    localStorage.removeItem("taskflow_user");
    localStorage.removeItem("taskflow_id_token");
  }, []);

  const {
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    taskWorkspaceMap,
    setTaskWorkspaceMap,
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
  } = useWorkspaceManager({
    setError,
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
    setTaskWorkspaceMap,
    setError,
  });

  const archivedTasks = useMemo(() => {
    return tasks.filter((task) => {
      const workspaceId = taskWorkspaceMap[task.id] || DEFAULT_WORKSPACE_ID;
      return (
        archivedWorkspaces.some((workspace) => workspace.id === workspaceId) ||
        archivedTaskIds.includes(task.id)
      );
    });
  }, [archivedTaskIds, archivedWorkspaces, taskWorkspaceMap, tasks]);

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
    startEditingCell,
    cancelCellEdit,
    saveCellEdit,
    startColumnResize,
    fitColumnToContent,
    toggleStatusGroup,
    togglePreviewCell,
  } = useTaskTableInteractions({
    tasks,
    archivedTasks,
    archivedTaskIds,
    taskWorkspaceMap,
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
    tasks,
    settingsMenuRef,
    profileMenuRef,
    tasksTableWrapperRef,
    setTaskWorkspaceMap,
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
      handleChange,
      handleDeleteTask,
      handleHideForm,
      handleRestoreTask,
      handleSubmit,
      isFormValid,
      loading,
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
      showWorkspaceInput,
      newWorkspaceName,
      viewMode,
      settingsMenuOpen,
      themeMenuOpen,
      themeMode,
      settingsMenuRef,
      onToggleWorkspaceInput: handleToggleWorkspaceInput,
      onNewWorkspaceNameChange: setNewWorkspaceName,
      onCreateWorkspace: handleCreateWorkspace,
      onCancelWorkspaceCreate: handleCancelWorkspaceCreate,
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
      showWorkspaceInput,
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
      onToggleShowForm: handleToggleShowForm,
      onRestoreWorkspace: handleRestoreWorkspace,
      tasksTableProps,
    }),
    [
      archivedWorkspaces,
      error,
      handleRestoreWorkspace,
      handleToggleShowForm,
      query,
      selectedWorkspace,
      showForm,
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
    onToggleProfileMenu: handleToggleProfileMenu,
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
    </div>
  );
}
