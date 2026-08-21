import type { Task } from "@taskflow/shared";

export type RootStackParamList = {
  TaskList: undefined;
  TaskForm: { task: Task; workspaceId: string } | { task?: undefined; workspaceId: string };
  Notifications: undefined;
  Profile: undefined;
  Members: { workspaceId: string; workspaceName: string; isOwner: boolean };
  WorkspaceCreate: undefined;
};
