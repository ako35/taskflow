import * as SecureStore from "expo-secure-store";
import type { ThemeMode } from "../theme/colors";

const ID_TOKEN_KEY = "taskflow_id_token";
const THEME_MODE_KEY = "taskflow_theme_mode";

export async function getStoredIdToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ID_TOKEN_KEY);
}

export async function setStoredIdToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ID_TOKEN_KEY, token);
}

export async function clearStoredIdToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ID_TOKEN_KEY);
}

export async function getStoredThemeMode(): Promise<ThemeMode | null> {
  const value = await SecureStore.getItemAsync(THEME_MODE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export async function setStoredThemeMode(mode: ThemeMode): Promise<void> {
  await SecureStore.setItemAsync(THEME_MODE_KEY, mode);
}

const ARCHIVED_WORKSPACES_KEY = "taskflow_archived_workspaces";

export async function getStoredArchivedWorkspaceIds(): Promise<string[]> {
  const value = await SecureStore.getItemAsync(ARCHIVED_WORKSPACES_KEY);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export async function setStoredArchivedWorkspaceIds(ids: string[]): Promise<void> {
  await SecureStore.setItemAsync(ARCHIVED_WORKSPACES_KEY, JSON.stringify(ids));
}
