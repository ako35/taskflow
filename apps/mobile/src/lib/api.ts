import Constants from "expo-constants";
import type {
  Task,
  TaskComment,
  TaskForm,
  UserNotificationsResponse,
  Workspace,
  WorkspaceInvitationsOverview,
  WorkspaceMemberInfo,
} from "@taskflow/shared";
import type { UserProfile } from "../types";

export const API_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "http://localhost:4000/api";

export type ApiHealth = {
  status: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

async function authRequest<T>(
  idToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (response.status === 401) {
      unauthorizedHandler?.();
    }
    throw new ApiError(
      body?.error || `İstek başarısız oldu: ${response.status}`,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchHealth(): Promise<ApiHealth> {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return (await response.json()) as ApiHealth;
}

export async function fetchWorkspaces(idToken: string): Promise<Workspace[]> {
  return authRequest<Workspace[]>(idToken, "/workspaces");
}

export async function createWorkspace(idToken: string, name: string): Promise<Workspace> {
  return authRequest<Workspace>(idToken, "/workspaces", {
    method: "POST",
    body: JSON.stringify({ name, type: "TASKS" }),
  });
}

export async function renameWorkspace(
  idToken: string,
  workspaceId: string,
  name: string,
): Promise<Workspace> {
  return authRequest<Workspace>(idToken, `/workspaces/${workspaceId}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export async function deleteWorkspace(idToken: string, workspaceId: string): Promise<void> {
  await authRequest<void>(idToken, `/workspaces/${workspaceId}`, { method: "DELETE" });
}

export async function fetchTasks(
  idToken: string,
  workspaceId?: string,
): Promise<Task[]> {
  const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
  return authRequest<Task[]>(idToken, `/tasks${query}`);
}

export type CreateTaskPayload = Pick<TaskForm, "title" | "description" | "priority" | "status"> & {
  workspaceId: string;
  remindAt?: string | null;
};

export async function createTask(idToken: string, payload: CreateTaskPayload): Promise<Task> {
  return authRequest<Task>(idToken, "/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type UpdateTaskPayload = Partial<
  Pick<TaskForm, "title" | "description" | "priority" | "status">
> & {
  remindAt?: string | null;
};

export async function updateTask(
  idToken: string,
  taskId: number,
  payload: UpdateTaskPayload,
): Promise<Task> {
  return authRequest<Task>(idToken, `/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteTask(idToken: string, taskId: number): Promise<void> {
  await authRequest<void>(idToken, `/tasks/${taskId}`, { method: "DELETE" });
}

export async function fetchTask(idToken: string, taskId: number): Promise<Task> {
  return authRequest<Task>(idToken, `/tasks/${taskId}`);
}

export async function fetchTaskComments(
  idToken: string,
  taskId: number,
): Promise<TaskComment[]> {
  return authRequest<TaskComment[]>(idToken, `/tasks/${taskId}/comments`);
}

export async function createTaskComment(
  idToken: string,
  taskId: number,
  content: string,
): Promise<TaskComment> {
  return authRequest<TaskComment>(idToken, `/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function deleteTaskComment(
  idToken: string,
  taskId: number,
  commentId: number,
): Promise<void> {
  await authRequest<void>(idToken, `/tasks/${taskId}/comments/${commentId}`, {
    method: "DELETE",
  });
}

export async function fetchNotifications(
  idToken: string,
  limit = 20,
): Promise<UserNotificationsResponse> {
  return authRequest<UserNotificationsResponse>(
    idToken,
    `/notifications?limit=${limit}`,
  );
}

export async function markNotificationRead(idToken: string, id: number): Promise<void> {
  await authRequest<void>(idToken, `/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(idToken: string): Promise<void> {
  await authRequest<void>(idToken, "/notifications/read-all", { method: "POST" });
}

export async function fetchProfile(idToken: string): Promise<UserProfile> {
  return authRequest<UserProfile>(idToken, "/profile");
}

export type UpdateProfilePayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export async function updateProfile(
  idToken: string,
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  return authRequest<UserProfile>(idToken, "/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function fetchWorkspaceMembers(
  idToken: string,
  workspaceId: string,
): Promise<WorkspaceMemberInfo[]> {
  return authRequest<WorkspaceMemberInfo[]>(idToken, `/workspaces/${workspaceId}/members`);
}

export async function fetchWorkspaceInvitations(
  idToken: string,
  workspaceId: string,
): Promise<WorkspaceInvitationsOverview> {
  return authRequest<WorkspaceInvitationsOverview>(
    idToken,
    `/workspaces/${workspaceId}/invitations`,
  );
}

export async function removeWorkspaceMember(
  idToken: string,
  workspaceId: string,
  memberUserId: number,
): Promise<void> {
  await authRequest<void>(idToken, `/workspaces/${workspaceId}/members/${memberUserId}`, {
    method: "DELETE",
  });
}

export type SendInvitationPayload = {
  inviteeEmail: string;
  workspaceId: string;
  message?: string;
};

export async function sendInvitation(
  idToken: string,
  payload: SendInvitationPayload,
): Promise<{ success: boolean; immediateAccessGranted: boolean }> {
  return authRequest(idToken, "/invitations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function acceptInvitation(
  idToken: string,
  token: string,
): Promise<{ success: boolean; workspace: Workspace; alreadyAccepted?: boolean }> {
  return authRequest(idToken, "/invitations/accept", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function registerPushToken(idToken: string, token: string): Promise<void> {
  await authRequest<void>(idToken, "/push-tokens", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function refineText(
  idToken: string,
  field: "title" | "description",
  text: string,
): Promise<string> {
  const result = await authRequest<{ text: string }>(idToken, "/ai/refine-text", {
    method: "POST",
    body: JSON.stringify({ field, text }),
  });
  return result.text;
}
