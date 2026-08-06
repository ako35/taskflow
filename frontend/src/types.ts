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
  workspaceId: string;
};

export type TaskCommentAuthor = {
  id: number;
  firstName: string;
  lastName?: string | null;
  email: string;
  picture?: string | null;
};

export type TaskComment = {
  id: number;
  taskId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: TaskCommentAuthor;
};

export type TaskForm = {
  title: string;
  description: string;
  priority: string;
  status: string;
};

export type User = {
  authEmail: string;
  firstName: string;
  lastName?: string;
  name: string;
  email: string;
  phone?: string;
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
  role?: "OWNER" | "MEMBER";
};

export type ThemeMode = "dark" | "light";
export type TableDensity = "normal" | "dense";
export type ViewMode = "workspaces" | "archive";
export type GuestView = "landing" | "login" | "contact";
