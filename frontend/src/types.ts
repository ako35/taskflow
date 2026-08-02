export type Task = {
  id: number;
  title: string;
  vehicle: string;
  customer: string;
  area: string;
  responsible: string;
  description: string;
  priority: string;
  status?: string;
};

export type TaskForm = {
  title: string;
  description: string;
  priority: string;
  status: string;
};

export type User = {
  name: string;
  email: string;
  picture?: string;
};

export type WorkspaceIcon =
  | "compass"
  | "layers"
  | "target"
  | "spark"
  | "shield"
  | "orbit";

export type Workspace = {
  id: string;
  name: string;
  color: string;
  icon: WorkspaceIcon;
};

export type ThemeMode = "dark" | "light";
export type ViewMode = "workspaces" | "archive";
export type GuestView = "landing" | "login";
