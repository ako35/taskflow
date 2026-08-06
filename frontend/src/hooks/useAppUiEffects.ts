import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { TableDensity, ThemeMode } from "../types";

type UseAppUiEffectsArgs = {
  themeMode: ThemeMode;
  tableDensity: TableDensity;
  settingsMenuRef: MutableRefObject<HTMLDivElement | null>;
  profileMenuRef: MutableRefObject<HTMLDivElement | null>;
  tasksTableWrapperRef: MutableRefObject<HTMLDivElement | null>;
  setWorkspaceMenuOpenId: Dispatch<SetStateAction<string | null>>;
  setEditingWorkspaceId: Dispatch<SetStateAction<string | null>>;
  setEditingWorkspaceName: Dispatch<SetStateAction<string>>;
  setSettingsMenuOpen: Dispatch<SetStateAction<boolean>>;
  setThemeMenuOpen: Dispatch<SetStateAction<boolean>>;
  setProfileMenuOpen: Dispatch<SetStateAction<boolean>>;
  setActivePreviewCell: Dispatch<
    SetStateAction<{ id: number; field: "title" } | null>
  >;
};

export default function useAppUiEffects({
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
}: UseAppUiEffectsArgs) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
    localStorage.setItem("taskflow_theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-table-density", tableDensity);
    localStorage.setItem("taskflow_table_density", tableDensity);
  }, [tableDensity]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;

      if (event.target instanceof HTMLElement) {
        const isWorkspaceMenuClick = event.target.closest(".workspace-item-row");
        if (!isWorkspaceMenuClick) {
          setWorkspaceMenuOpenId(null);
          setEditingWorkspaceId(null);
          setEditingWorkspaceName("");
        }
      }

      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target)
      ) {
        setSettingsMenuOpen(false);
        setThemeMenuOpen(false);
      }

      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }

      if (
        tasksTableWrapperRef.current &&
        !tasksTableWrapperRef.current.contains(event.target)
      ) {
        setActivePreviewCell(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [
    profileMenuRef,
    setActivePreviewCell,
    setEditingWorkspaceId,
    setEditingWorkspaceName,
    setProfileMenuOpen,
    setSettingsMenuOpen,
    setThemeMenuOpen,
    setWorkspaceMenuOpenId,
    settingsMenuRef,
    tasksTableWrapperRef,
  ]);
}
