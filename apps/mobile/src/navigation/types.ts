import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Task, Workspace } from "@taskflow/shared";

export type MainTabParamList = {
  TaskList: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  TaskForm: { task: Task; workspaceId: string } | { task?: undefined; workspaceId: string };
  Members: { workspaceId: string; workspaceName: string; isOwner: boolean };
  WorkspaceCreate: undefined;
  ArchivedWorkspaces: { archivedWorkspaces: Workspace[] };
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
