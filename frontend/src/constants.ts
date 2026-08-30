import type { TaskForm, Workspace, WorkspaceIcon } from "./types";

export const API_URL = import.meta.env.VITE_API_URL || "/api";
const DEFAULT_GOOGLE_CLIENT_ID =
  "625073924200-3m8cpgu35qtc2mf1jnfg9aet24verhqk.apps.googleusercontent.com";
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
export const isClientIdPlaceholder =
  !GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("your-google-client-id");
export const DEFAULT_WORKSPACE_ID = "workspace-inbox";

// Android APK GitHub Release'in "latest" varlığından servis edilir; her yeni
// mobil sürümde release'e taskflow.apk yüklemek yeterli (URL sabit kalır).
export const MOBILE_APK_URL =
  import.meta.env.VITE_MOBILE_APK_URL ||
  "https://github.com/ako35/taskflow/releases/latest/download/taskflow.apk";

export const DEFAULT_WORKSPACES: Workspace[] = [
  {
    id: DEFAULT_WORKSPACE_ID,
    name: "Genel",
    type: "TASKS",
    color: "#5b8cff",
    icon: "compass",
  },
];

export const WORKSPACE_COLORS = [
  "#5b8cff",
  "#34d399",
  "#f97316",
  "#f43f5e",
  "#38bdf8",
  "#a78bfa",
];

export const WORKSPACE_ICONS: WorkspaceIcon[] = [
  "compass",
  "layers",
  "target",
  "spark",
  "shield",
  "orbit",
];

export const initialForm: TaskForm = {
  title: "",
  description: "",
  priority: "Orta",
  status: "Yapılacak",
  assigneeId: "",
  remindAt: "",
};

export const priorityOrder: Record<string, number> = {
  Acil: 0,
  Yüksek: 1,
  Orta: 2,
  Düşük: 3,
};

export const statusOrder: Record<string, number> = {
  Yapılacak: 0,
  Tamamlandı: 1,
};

export const priorityClassNames: Record<string, string> = {
  Acil: "badge-acil",
  Yüksek: "badge-yuksek",
  Orta: "badge-orta",
  Düşük: "badge-dusuk",
};

export const statusClassNames: Record<string, string> = {
  Yapılacak: "badge-status-blue",
  Tamamlandı: "badge-status-green",
};

export const tableColumns = [
  { field: "index", label: "No", minWidth: 44 },
  { field: "status", label: "Durum", minWidth: 144 },
  { field: "title", label: "Görev", minWidth: 240 },
  { field: "priority", label: "Önem", minWidth: 150 },
];

export const tableDisplayColumns = [
  ...tableColumns,
  { field: "__spacer", label: "", minWidth: 0 },
];

export const COLUMN_WIDTHS_STORAGE_KEY = "taskflow_column_widths";
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  index: 44,
  title: 260,
  status: 150,
  priority: 160,
};
