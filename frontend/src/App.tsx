import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Task = {
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

type TaskForm = {
  title: string;
  description: string;
  priority: string;
  status: string;
};

type User = {
  name: string;
  email: string;
  picture?: string;
};

type Workspace = {
  id: string;
  name: string;
  color: string;
  icon: WorkspaceIcon;
};

type WorkspaceIcon =
  | "compass"
  | "layers"
  | "target"
  | "spark"
  | "shield"
  | "orbit";

type ThemeMode = "dark" | "light";
type ViewMode = "workspaces" | "archive";
type GuestView = "landing" | "login";

const API_URL = "http://localhost:4000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const isClientIdPlaceholder =
  !GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("your-google-client-id");
const DEFAULT_WORKSPACE_ID = "workspace-inbox";
const DEFAULT_WORKSPACES: Workspace[] = [
  {
    id: DEFAULT_WORKSPACE_ID,
    name: "Genel",
    color: "#5b8cff",
    icon: "compass",
  },
];
const WORKSPACE_COLORS = [
  "#5b8cff",
  "#34d399",
  "#f97316",
  "#f43f5e",
  "#38bdf8",
  "#a78bfa",
];
const WORKSPACE_ICONS: WorkspaceIcon[] = [
  "compass",
  "layers",
  "target",
  "spark",
  "shield",
  "orbit",
];

const initialForm: TaskForm = {
  title: "",
  description: "",
  priority: "Orta",
  status: "Yapılacak",
};

const priorityOrder: Record<string, number> = {
  Acil: 0,
  Yüksek: 1,
  Orta: 2,
  Düşük: 3,
};

const statusOrder: Record<string, number> = {
  Yapılacak: 0,
  Tamamlandı: 1,
};

function getStatusRank(status?: string) {
  const normalized = (status ?? "Yapılacak").trim().toLocaleLowerCase("tr-TR");
  if (normalized === "yapılacak" || normalized === "yapilacak") return 0;
  if (normalized === "tamamlandı" || normalized === "tamamlandi") return 1;
  return 999;
}

function getPriorityRank(priority?: string) {
  const normalized = (priority ?? "Orta").trim().toLocaleLowerCase("tr-TR");
  if (normalized === "acil") return 0;
  if (normalized === "yüksek" || normalized === "yuksek") return 1;
  if (normalized === "orta") return 2;
  if (normalized === "düşük" || normalized === "dusuk") return 3;
  return 999;
}

const priorityClassNames: Record<string, string> = {
  Acil: "badge-acil",
  Yüksek: "badge-yuksek",
  Orta: "badge-orta",
  Düşük: "badge-dusuk",
};

const statusClassNames: Record<string, string> = {
  Yapılacak: "badge-status-blue",
  Tamamlandı: "badge-status-green",
};

const tableColumns = [
  { field: "index", label: "No", minWidth: 44 },
  { field: "status", label: "Durum", minWidth: 144 },
  { field: "title", label: "Görev", minWidth: 240 },
  { field: "priority", label: "Önem", minWidth: 150 },
  { field: "description", label: "Açıklama", minWidth: 640 },
];
const tableDisplayColumns = [
  ...tableColumns,
  { field: "__spacer", label: "", minWidth: 0 },
];

const COLUMN_WIDTHS_STORAGE_KEY = "taskflow_column_widths";
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  index: 44,
  title: 260,
  status: 150,
  priority: 160,
  description: 700,
};

function fitColumnWidthsToContainer(
  widths: Record<string, number>,
  containerWidth: number,
) {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return widths;
  }

  const next = tableColumns.reduce<Record<string, number>>((acc, column) => {
    acc[column.field] = Math.max(
      column.minWidth,
      widths[column.field] ??
        DEFAULT_COLUMN_WIDTHS[column.field] ??
        column.minWidth,
    );
    return acc;
  }, {});

  const totalWidth = tableColumns.reduce(
    (sum, column) => sum + next[column.field],
    0,
  );

  if (totalWidth > containerWidth) {
    const adjustableColumns = tableColumns.filter(
      (column) => column.field !== "index",
    );
    let overflow = totalWidth - containerWidth;
    let remaining = adjustableColumns.map((column) => column.field);

    while (overflow > 0 && remaining.length > 0) {
      const shrinkPerColumn = overflow / remaining.length;
      const nextRemaining: string[] = [];

      for (const field of remaining) {
        const column = tableColumns.find((item) => item.field === field);
        if (!column) continue;

        const currentWidth = next[field];
        const availableShrink = currentWidth - column.minWidth;
        const appliedShrink = Math.min(availableShrink, shrinkPerColumn);
        next[field] = currentWidth - appliedShrink;
        overflow -= appliedShrink;

        if (next[field] - column.minWidth > 0.5) {
          nextRemaining.push(field);
        }
      }

      if (nextRemaining.length === remaining.length) {
        break;
      }

      remaining = nextRemaining;
    }
  } else if (totalWidth < containerWidth) {
    next.description += containerWidth - totalWidth;
  }

  return next;
}

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1];
    const payload = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(payload)));
  } catch {
    return null;
  }
}

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getUserInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const first = parts[0][0]?.toLocaleUpperCase("tr-TR") || "?";
    const second = parts[0][1]?.toLocaleUpperCase("tr-TR") || first;
    return `${first}${second}`;
  }

  const firstNameInitial = parts[0][0]?.toLocaleUpperCase("tr-TR") || "";
  const lastNameInitial =
    parts[parts.length - 1][0]?.toLocaleUpperCase("tr-TR") || "";
  return `${firstNameInitial}${lastNameInitial}`;
}

function matchesSearch(task: Task, searchText: string) {
  const normalizedQuery = normalizeQuery(searchText);
  if (!normalizedQuery) return true;

  const searchable = [task.title, task.description].join(" ").toLowerCase();

  return normalizedQuery.split(" ").every((token) => {
    if (!token) return true;
    if (!token.includes(":")) {
      return searchable.includes(token);
    }

    const [field, rawValue] = token.split(":");
    const value = rawValue.trim();
    if (!value) return searchable.includes(token);

    switch (field) {
      case "title":
      case "başlık":
        return task.title.toLowerCase().includes(value);
      case "description":
      case "açıklama":
        return task.description.toLowerCase().includes(value);
      default:
        return searchable.includes(token);
    }
  });
}

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickWorkspaceIcon(seed: string): WorkspaceIcon {
  return WORKSPACE_ICONS[hashString(seed) % WORKSPACE_ICONS.length];
}

function normalizeWorkspaces(
  items: Array<Partial<Workspace> & { id?: string; name?: string }>,
) {
  return items
    .filter(
      (item) => typeof item.id === "string" && typeof item.name === "string",
    )
    .map((item) => ({
      id: item.id as string,
      name: item.name as string,
      color: item.color || "#5b8cff",
      icon: WORKSPACE_ICONS.includes(item.icon as WorkspaceIcon)
        ? (item.icon as WorkspaceIcon)
        : pickWorkspaceIcon(item.id as string),
    }));
}

function WorkspaceGlyph({ icon }: { icon: WorkspaceIcon }) {
  switch (icon) {
    case "layers":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4 4 8l8 4 8-4-8-4Z" />
          <path d="m4 12 8 4 8-4" />
          <path d="m4 16 8 4 8-4" />
        </svg>
      );
    case "target":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 3 2.1 5.8L20 11l-5.9 2.2L12 19l-2.1-5.8L4 11l5.9-2.2L12 3Z" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 5 6v5c0 4.5 2.8 7.8 7 10 4.2-2.2 7-5.5 7-10V6l-7-3Z" />
        </svg>
      );
    case "orbit":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <ellipse cx="12" cy="12" rx="8" ry="4.5" />
          <circle cx="12" cy="12" r="1.6" />
        </svg>
      );
    case "compass":
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="m10 14 1.4-3.4L15 9l-1.4 3.4L10 14Z" />
        </svg>
      );
  }
}

function SidebarGlyph({ icon }: { icon: "archive" | "settings" | "logout" }) {
  switch (icon) {
    case "archive":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16" />
          <path d="M6 7v11h12V7" />
          <path d="M9 11h6" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="2.2" />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.4 3h-4.8L9.2 6.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2L3 14.5l2 3.4 2.4-1a7 7 0 0 0 1.7 1L9.6 21h4.8l.4-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.6.1-1Z" />
        </svg>
      );
    case "logout":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 7V5a2 2 0 0 1 2-2h6v18h-6a2 2 0 0 1-2-2v-2" />
          <path d="M3 12h11" />
          <path d="m8 8 4 4-4 4" />
        </svg>
      );
  }
}

function UiGlyph({
  icon,
}: {
  icon:
    | "plus"
    | "dots"
    | "search"
    | "check"
    | "spark"
    | "archive"
    | "restore"
    | "trash";
}) {
  switch (icon) {
    case "plus":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "dots":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="5.5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="18.5" r="1.7" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 12.5 4.2 4.2L19 7.8" />
        </svg>
      );
    case "archive":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16" />
          <path d="M6 7v11h12V7" />
          <path d="M9 11h6" />
        </svg>
      );
    case "restore":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 12a8 8 0 1 0 2.3-5.7" />
          <path d="M4 4v5h5" />
        </svg>
      );
    case "trash":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16" />
          <path d="M9 7V5h6v2" />
          <path d="M7 7l1 12h8l1-12" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      );
    case "spark":
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 3 1.9 5.3L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.7L12 3Z" />
        </svg>
      );
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("taskflow_user");
    if (!stored) return null;
    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  });

  const [idToken, setIdToken] = useState<string | null>(() => {
    return localStorage.getItem("taskflow_id_token");
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<TaskForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [editingCell, setEditingCell] = useState<{
    id: number;
    field: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const stored = safeParseJson<Array<Partial<Workspace>>>(
      localStorage.getItem("taskflow_workspaces"),
      DEFAULT_WORKSPACES,
    );

    if (!Array.isArray(stored) || stored.length === 0) {
      return DEFAULT_WORKSPACES;
    }

    const normalized = normalizeWorkspaces(stored);
    return normalized.length > 0 ? normalized : DEFAULT_WORKSPACES;
  });
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(() => {
    return (
      localStorage.getItem("taskflow_selected_workspace") ||
      DEFAULT_WORKSPACE_ID
    );
  });
  const [taskWorkspaceMap, setTaskWorkspaceMap] = useState<
    Record<number, string>
  >(() =>
    safeParseJson<Record<number, string>>(
      localStorage.getItem("taskflow_task_workspace_map"),
      {},
    ),
  );
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [showWorkspaceInput, setShowWorkspaceInput] = useState(false);
  const [workspaceMenuOpenId, setWorkspaceMenuOpenId] = useState<string | null>(
    null,
  );
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(
    null,
  );
  const [editingWorkspaceName, setEditingWorkspaceName] = useState("");
  const [archivedWorkspaceIds, setArchivedWorkspaceIds] = useState<string[]>(
    () =>
      safeParseJson<string[]>(
        localStorage.getItem("taskflow_archived_workspaces"),
        [],
      ),
  );
  const [archivedTaskIds, setArchivedTaskIds] = useState<number[]>(() =>
    safeParseJson<number[]>(
      localStorage.getItem("taskflow_archived_tasks"),
      [],
    ),
  );
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem("taskflow_theme");
    return stored === "light" ? "light" : "dark";
  });
  const [guestView, setGuestView] = useState<GuestView>("landing");
  const [viewMode, setViewMode] = useState<ViewMode>("workspaces");
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [collapsedStatusGroups, setCollapsedStatusGroups] = useState<
    Record<string, boolean>
  >({});
  const [activePreviewCell, setActivePreviewCell] = useState<{
    id: number;
    field: "title" | "description";
  } | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const tasksTableWrapperRef = useRef<HTMLDivElement | null>(null);

  const activeWorkspaces = useMemo(
    () =>
      workspaces.filter(
        (workspace) => !archivedWorkspaceIds.includes(workspace.id),
      ),
    [archivedWorkspaceIds, workspaces],
  );

  const archivedWorkspaces = useMemo(
    () =>
      workspaces.filter((workspace) =>
        archivedWorkspaceIds.includes(workspace.id),
      ),
    [archivedWorkspaceIds, workspaces],
  );

  const archivedTasks = useMemo(() => {
    return tasks.filter((task) => {
      const workspaceId = taskWorkspaceMap[task.id] || DEFAULT_WORKSPACE_ID;
      return (
        archivedWorkspaceIds.includes(workspaceId) ||
        archivedTaskIds.includes(task.id)
      );
    });
  }, [archivedTaskIds, archivedWorkspaceIds, taskWorkspaceMap, tasks]);

  const selectedWorkspace = useMemo(() => {
    return (
      activeWorkspaces.find(
        (workspace) => workspace.id === selectedWorkspaceId,
      ) ||
      activeWorkspaces[0] ||
      DEFAULT_WORKSPACES[0]
    );
  }, [activeWorkspaces, selectedWorkspaceId]);

  const startEditingCell = useCallback((task: Task, field: string) => {
    if (field === "index" || field === "__spacer") return;
    setEditingCell({ id: task.id, field });
    const fallback = field === "status" ? "Yapılacak" : "";
    setEditingValue(String(task[field as keyof Task] ?? fallback));
  }, []);

  const cancelCellEdit = useCallback(() => {
    setEditingCell(null);
    setEditingValue("");
  }, []);

  const saveCellEdit = useCallback(
    async (nextValue?: string) => {
      if (!editingCell) return;
      if (!idToken) {
        setError(
          "Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.",
        );
        return;
      }

      const task = tasks.find((item) => item.id === editingCell.id);
      if (!task) {
        cancelCellEdit();
        return;
      }

      const value = (nextValue ?? editingValue).trim();
      const field = editingCell.field;
      if (String(task[field as keyof Task] ?? "") === value) {
        cancelCellEdit();
        return;
      }

      const allowedStatuses = ["Yapılacak", "Tamamlandı"];
      const allowedPriorities = ["Acil", "Yüksek", "Orta", "Düşük"];
      const data: Record<string, string> = {};

      if (field === "status") {
        if (!allowedStatuses.includes(value)) {
          setError("Geçersiz durum değeri.");
          return;
        }
        data.status = value;
      } else if (field === "priority") {
        if (!allowedPriorities.includes(value)) {
          setError("Geçersiz önem değeri.");
          return;
        }
        data.priority = value;
      } else {
        data[field] = value;
      }

      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/tasks/${editingCell.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || response.statusText);
        }

        const updatedTask = (await response.json()) as Task;
        setTasks((prev) =>
          prev.map((item) => (item.id === updatedTask.id ? updatedTask : item)),
        );
        cancelCellEdit();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Güncelleme başarısız oldu.",
        );
      } finally {
        setLoading(false);
      }
    },
    [cancelCellEdit, editingCell, editingValue, idToken, tasks],
  );
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => {
      const stored = safeParseJson<Record<string, number>>(
        localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY),
        {},
      );

      const next: Record<string, number> = { ...DEFAULT_COLUMN_WIDTHS };
      for (const column of tableColumns) {
        if (column.field === "index") {
          next[column.field] = DEFAULT_COLUMN_WIDTHS.index;
          continue;
        }
        const candidate = stored[column.field];
        if (typeof candidate === "number" && Number.isFinite(candidate)) {
          next[column.field] = Math.max(column.minWidth, candidate);
        }
      }

      return next;
    },
  );

  const syncColumnWidthsToContainer = useCallback(() => {
    const containerWidth = tasksTableWrapperRef.current?.clientWidth;
    if (!containerWidth) return;

    setColumnWidths((prev) => fitColumnWidthsToContainer(prev, containerWidth));
  }, []);

  const resizeState = useRef<{
    field: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleColumnMouseMove = useCallback(
    (event: MouseEvent) => {
      const current = resizeState.current;
      if (!current) return;

      const delta = event.clientX - current.startX;
      const minWidth =
        tableColumns.find((column) => column.field === current.field)
          ?.minWidth ?? 80;
      const tableWidth = tasksTableWrapperRef.current?.clientWidth ?? Infinity;
      const otherColumnsWidth = tableColumns.reduce((sum, column) => {
        if (column.field === current.field) return sum;
        return sum + (columnWidths[column.field] ?? column.minWidth);
      }, 0);
      const maxWidth = Math.max(minWidth, tableWidth - otherColumnsWidth);
      setColumnWidths((prev) => ({
        ...prev,
        [current.field]: Math.min(
          maxWidth,
          Math.max(minWidth, current.startWidth + delta),
        ),
      }));
    },
    [columnWidths],
  );

  const handleColumnMouseUp = useCallback(() => {
    if (!resizeState.current) return;
    resizeState.current = null;
    window.removeEventListener("mousemove", handleColumnMouseMove);
    window.removeEventListener("mouseup", handleColumnMouseUp);
  }, [handleColumnMouseMove]);

  const startColumnResize = useCallback(
    (field: string, event: React.MouseEvent<HTMLDivElement>) => {
      if (field === "__spacer") {
        return;
      }
      event.preventDefault();
      resizeState.current = {
        field,
        startX: event.clientX,
        startWidth: columnWidths[field] ?? 120,
      };
      window.addEventListener("mousemove", handleColumnMouseMove);
      window.addEventListener("mouseup", handleColumnMouseUp);
    },
    [columnWidths, handleColumnMouseMove, handleColumnMouseUp],
  );

  const resetColumnWidth = useCallback((field: string) => {
    const containerWidth = tasksTableWrapperRef.current?.clientWidth;
    setColumnWidths((prev) => {
      const next = {
        ...prev,
        [field]: DEFAULT_COLUMN_WIDTHS[field] ?? prev[field],
      };
      return containerWidth
        ? fitColumnWidthsToContainer(next, containerWidth)
        : next;
    });
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const inSelectedWorkspace =
        (taskWorkspaceMap[task.id] || DEFAULT_WORKSPACE_ID) ===
        selectedWorkspace.id;
      if (!inSelectedWorkspace) return false;
      if (archivedTaskIds.includes(task.id)) return false;
      return matchesSearch(task, query);
    });
  }, [archivedTaskIds, query, selectedWorkspace.id, taskWorkspaceMap, tasks]);

  const sortedTasks = useMemo(
    () =>
      [...filteredTasks].sort((a, b) => {
        const statusDiff = getStatusRank(a.status) - getStatusRank(b.status);
        if (statusDiff !== 0) return statusDiff;

        const priorityDiff =
          getPriorityRank(a.priority) - getPriorityRank(b.priority);
        if (priorityDiff !== 0) return priorityDiff;

        const titleDiff = a.title.localeCompare(b.title, "tr-TR", {
          sensitivity: "base",
        });
        if (titleDiff !== 0) return titleDiff;

        return a.id - b.id;
      }),
    [filteredTasks],
  );

  const archivedFilteredTasks = useMemo(
    () => archivedTasks.filter((task) => matchesSearch(task, query)),
    [archivedTasks, query],
  );

  const sortedArchivedTasks = useMemo(
    () =>
      [...archivedFilteredTasks].sort((a, b) => {
        const statusDiff = getStatusRank(a.status) - getStatusRank(b.status);
        if (statusDiff !== 0) return statusDiff;

        const priorityDiff =
          getPriorityRank(a.priority) - getPriorityRank(b.priority);
        if (priorityDiff !== 0) return priorityDiff;

        const titleDiff = a.title.localeCompare(b.title, "tr-TR", {
          sensitivity: "base",
        });
        if (titleDiff !== 0) return titleDiff;

        return a.id - b.id;
      }),
    [archivedFilteredTasks],
  );

  const visibleTasks = useMemo(
    () => (viewMode === "archive" ? sortedArchivedTasks : sortedTasks),
    [sortedArchivedTasks, sortedTasks, viewMode],
  );

  const statusGroupCounts = useMemo(() => {
    return visibleTasks.reduce<Record<string, number>>((acc, task) => {
      const status = task.status ?? "Yapılacak";
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});
  }, [visibleTasks]);

  const toggleStatusGroup = useCallback(
    (status: string) => {
      setCollapsedStatusGroups((prev) => {
        const key = `${viewMode}:${status}`;
        return {
          ...prev,
          [key]: !prev[key],
        };
      });
    },
    [viewMode],
  );

  useEffect(() => {
    async function loadTasks() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/tasks`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (!response.ok) throw new Error("Görevler yüklenemedi.");
        const data = (await response.json()) as Task[];
        setTasks(
          data.map((task) => ({
            ...task,
            status: task.status ?? "Yapılacak",
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bilinmeyen hata");
      } finally {
        setLoading(false);
      }
    }

    if (user && idToken) {
      loadTasks();
    }
  }, [idToken, user]);

  useEffect(() => {
    localStorage.setItem("taskflow_workspaces", JSON.stringify(workspaces));
  }, [workspaces]);

  useEffect(() => {
    localStorage.setItem(
      COLUMN_WIDTHS_STORAGE_KEY,
      JSON.stringify(columnWidths),
    );
  }, [columnWidths]);

  useEffect(() => {
    syncColumnWidthsToContainer();

    const wrapper = tasksTableWrapperRef.current;
    if (!wrapper || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      syncColumnWidthsToContainer();
    });

    observer.observe(wrapper);

    return () => observer.disconnect();
  }, [syncColumnWidthsToContainer]);

  useEffect(() => {
    localStorage.setItem(
      "taskflow_archived_workspaces",
      JSON.stringify(archivedWorkspaceIds),
    );
  }, [archivedWorkspaceIds]);

  useEffect(() => {
    localStorage.setItem(
      "taskflow_archived_tasks",
      JSON.stringify(archivedTaskIds),
    );
  }, [archivedTaskIds]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
    localStorage.setItem("taskflow_theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem("taskflow_selected_workspace", selectedWorkspace.id);
  }, [selectedWorkspace.id]);

  useEffect(() => {
    localStorage.setItem(
      "taskflow_task_workspace_map",
      JSON.stringify(taskWorkspaceMap),
    );
  }, [taskWorkspaceMap]);

  useEffect(() => {
    if (tasks.length === 0) return;
    setTaskWorkspaceMap((prev) => {
      const next: Record<number, string> = {};
      for (const task of tasks) {
        next[task.id] = prev[task.id] || DEFAULT_WORKSPACE_ID;
      }
      return next;
    });
  }, [tasks]);

  useEffect(() => {
    if (activeWorkspaces.length === 0) return;
    const selectedStillActive = activeWorkspaces.some(
      (workspace) => workspace.id === selectedWorkspaceId,
    );
    if (!selectedStillActive) {
      setSelectedWorkspaceId(activeWorkspaces[0].id);
    }
  }, [activeWorkspaces, selectedWorkspaceId]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;

      if (event.target instanceof HTMLElement) {
        const isWorkspaceMenuClick = event.target.closest(
          ".workspace-item-row",
        );
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

      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
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
  }, []);

  const togglePreviewCell = useCallback(
    (taskId: number, field: "title" | "description") => {
      setActivePreviewCell((current) =>
        current?.id === taskId && current.field === field
          ? null
          : { id: taskId, field },
      );
    },
    [],
  );

  const googleInitialized = useRef(false);

  useEffect(() => {
    if (user !== null) return;

    if (!GOOGLE_CLIENT_ID) {
      setGoogleError(
        "Lütfen frontend/.env dosyasına VITE_GOOGLE_CLIENT_ID ekleyin.",
      );
      return;
    }

    if (isClientIdPlaceholder) {
      setGoogleError(
        "Frontend/.env dosyanızda geçerli bir Google Client ID yok. Lütfen Google Cloud Console'dan aldığınız gerçek client ID'yi ekleyin.",
      );
      return;
    }

    let attempts = 0;
    const initializeGoogle = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        attempts += 1;
        if (attempts < 15) {
          window.setTimeout(initializeGoogle, 150);
        } else {
          setGoogleError("Google kimlik doğrulama scripti yüklenemedi.");
        }
        return;
      }

      if (!googleInitialized.current) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          ux_mode: "popup",
        });
        googleInitialized.current = true;
      }

      if (guestView === "login") {
        const proxyButton = document.getElementById(
          "google-signin-button-proxy",
        );
        if (proxyButton) {
          proxyButton.innerHTML = "";
          google.accounts.id.renderButton(proxyButton, {
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            width: 220,
          });
        }
      }
    };

    initializeGoogle();
  }, [guestView, user]);

  const handleCredentialResponse = useCallback((response: any) => {
    if (!response?.credential) {
      setGoogleError("Google kimlik doğrulama başarısız oldu.");
      return;
    }

    const profile = parseJwt(response.credential);
    if (!profile?.email) {
      setGoogleError("Google hesabından kullanıcı bilgisi alınamadı.");
      return;
    }

    const nextUser: User = {
      name: profile.name || profile.email,
      email: profile.email,
      picture: profile.picture,
    };

    setUser(nextUser);
    setIdToken(response.credential);
    localStorage.setItem("taskflow_user", JSON.stringify(nextUser));
    localStorage.setItem("taskflow_id_token", response.credential);
  }, []);

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

  const handleCreateWorkspace = useCallback(() => {
    const name = newWorkspaceName.trim();
    if (!name) return;

    const exists = workspaces.some(
      (workspace) => workspace.name.toLowerCase() === name.toLowerCase(),
    );
    if (exists) {
      setError("Bu isimde bir çalışma alanı zaten var.");
      return;
    }

    const id = `workspace-${Date.now()}`;
    const color = WORKSPACE_COLORS[workspaces.length % WORKSPACE_COLORS.length];
    const workspace: Workspace = {
      id,
      name,
      color,
      icon: pickWorkspaceIcon(id),
    };

    setWorkspaces((prev) => [...prev, workspace]);
    setSelectedWorkspaceId(id);
    setNewWorkspaceName("");
    setShowWorkspaceInput(false);
    setError(null);
  }, [newWorkspaceName, workspaces]);

  const startWorkspaceRename = useCallback(
    (workspaceId: string) => {
      const workspace = workspaces.find((item) => item.id === workspaceId);
      if (!workspace) return;
      setEditingWorkspaceId(workspaceId);
      setEditingWorkspaceName(workspace.name);
      setWorkspaceMenuOpenId(null);
    },
    [workspaces],
  );

  const cancelWorkspaceRename = useCallback(() => {
    setEditingWorkspaceId(null);
    setEditingWorkspaceName("");
  }, []);

  const submitWorkspaceRename = useCallback(() => {
    if (!editingWorkspaceId) return;

    const trimmed = editingWorkspaceName.trim();
    if (!trimmed) {
      setError("Çalışma alanı adı boş olamaz.");
      return;
    }

    const duplicate = workspaces.some(
      (item) =>
        item.id !== editingWorkspaceId &&
        item.name.toLocaleLowerCase("tr-TR") ===
          trimmed.toLocaleLowerCase("tr-TR"),
    );
    if (duplicate) {
      setError("Bu isimde bir çalışma alanı zaten var.");
      return;
    }

    setWorkspaces((prev) =>
      prev.map((item) =>
        item.id === editingWorkspaceId ? { ...item, name: trimmed } : item,
      ),
    );
    setError(null);
    setEditingWorkspaceId(null);
    setEditingWorkspaceName("");
  }, [editingWorkspaceId, editingWorkspaceName, workspaces]);

  const handleArchiveWorkspace = useCallback((workspaceId: string) => {
    setArchivedWorkspaceIds((prev) => {
      if (prev.includes(workspaceId)) return prev;
      return [...prev, workspaceId];
    });
    setViewMode("archive");
    setWorkspaceMenuOpenId(null);
    setError(null);
  }, []);

  const handleRestoreWorkspace = useCallback(
    (workspaceId: string) => {
      const workspace = workspaces.find((item) => item.id === workspaceId);
      if (!workspace) return;

      setArchivedWorkspaceIds((prev) =>
        prev.filter((itemId) => itemId !== workspaceId),
      );
      setSelectedWorkspaceId(workspaceId);
      setViewMode("workspaces");
      setError(null);
    },
    [workspaces],
  );

  const handleDeleteWorkspace = useCallback((workspaceId: string) => {
    if (workspaceId === DEFAULT_WORKSPACE_ID) {
      setError("Genel çalışma alanı silinemez.");
      return;
    }

    setWorkspaces((prev) => prev.filter((item) => item.id !== workspaceId));
    setArchivedWorkspaceIds((prev) =>
      prev.filter((itemId) => itemId !== workspaceId),
    );
    setTaskWorkspaceMap((prev) => {
      const next = { ...prev };
      for (const [taskId, mappedWorkspaceId] of Object.entries(next)) {
        if (mappedWorkspaceId === workspaceId) {
          next[Number(taskId)] = DEFAULT_WORKSPACE_ID;
        }
      }
      return next;
    });
    setWorkspaceMenuOpenId(null);
    setError(null);
  }, []);

  const handleArchiveTask = useCallback((taskId: number) => {
    setArchivedTaskIds((prev) => {
      if (prev.includes(taskId)) return prev;
      return [...prev, taskId];
    });
    setError(null);
  }, []);

  const handleRestoreTask = useCallback((taskId: number) => {
    setArchivedTaskIds((prev) => prev.filter((id) => id !== taskId));
    setError(null);
  }, []);

  const handleDeleteTask = useCallback(
    async (taskId: number) => {
      if (!idToken) {
        setError(
          "Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.",
        );
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || response.statusText);
        }

        setTasks((prev) => prev.filter((task) => task.id !== taskId));
        setArchivedTaskIds((prev) => prev.filter((id) => id !== taskId));
        setTaskWorkspaceMap((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Görev silinemedi.");
      } finally {
        setLoading(false);
      }
    },
    [idToken],
  );

  const handleChange = useCallback(
    (field: keyof TaskForm) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
      },
    [],
  );

  const isFormValid = useMemo(() => {
    return form.title.trim().length > 0;
  }, [form.title]);

  const handleSubmit = useCallback(async () => {
    if (!isFormValid) {
      setError("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    if (!idToken) {
      setError(
        "Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(form),
      });

      const text = await response.text();
      let responseBody: any = null;
      try {
        responseBody = JSON.parse(text);
      } catch {
        responseBody = null;
      }

      if (!response.ok) {
        const message =
          responseBody?.error ||
          responseBody?.message ||
          text ||
          `Hata ${response.status}: ${response.statusText}`;

        if (response.status === 401) {
          setError(
            "Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.",
          );
          handleSignOut();
          return;
        }

        console.error(
          "Task save failed",
          response.status,
          message,
          responseBody,
        );
        throw new Error(message);
      }

      const newTask = responseBody as Task;
      setTaskWorkspaceMap((prev) => ({
        ...prev,
        [newTask.id]: selectedWorkspace.id,
      }));
      setTasks((prev) => [newTask, ...prev]);
      setForm(initialForm);
      setQuery("");
      setShowForm(false);
    } catch (err) {
      console.error("Görev kaydetme hatası", err);
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [form, handleSignOut, idToken, isFormValid, selectedWorkspace.id]);

  const summary = useMemo(
    () => ({
      total: tasks.length,
      urgent: tasks.filter((task) => task.priority === "Acil").length,
      active: tasks.filter((task) => task.priority !== "Düşük").length,
    }),
    [tasks],
  );

  const summaryCards = [
    {
      label: "Toplam görev",
      value: summary.total,
      detail: "Tüm görevleriniz.",
    },
    {
      label: "Acil görevler",
      value: summary.urgent,
      detail: "Hemen işlem gereken görevler.",
    },
    {
      label: "Filtre aktif",
      value: query ? "Evet" : "Hayır",
      detail: "Arama filtresi durumunuz.",
    },
  ];

  if (!user) {
    if (guestView === "login") {
      return (
        <div className="auth-page">
          <header className="auth-topbar">
            <button
              type="button"
              className="auth-brand auth-brand-button"
              aria-label="TaskFlow ana sayfaya dön"
              onClick={() => setGuestView("landing")}
            >
              <span className="topbar-logo" aria-hidden="true">
                <span className="topbar-logo-ring" />
                <span className="topbar-logo-core" />
              </span>
              <strong>TaskFlow</strong>
            </button>
          </header>

          <main className="auth-content">
            <section className="auth-form-shell" aria-label="Giriş formu">
              <h1>Oturum Aç</h1>
              <p className="auth-user-hint">TaskFlow hesabınızla devam edin</p>

              <label htmlFor="email">E-posta adresiniz</label>
              <input id="email" type="email" placeholder="E-posta" />

              <label htmlFor="password">Parolayı girin</label>
              <input id="password" type="password" placeholder="Şifre" />

              <button type="button" className="auth-forgot-link">
                Şifrenizi mi unuttunuz?
              </button>

              <button type="button" className="btn-primary auth-primary-btn">
                Oturum aç
              </button>

              <div className="auth-separator">Veya şununla oturum açın</div>

              <div className="google-button">
                <div className="auth-google-stack">
                  <button type="button" className="auth-google-only-btn">
                    <svg
                      className="auth-google-icon-svg"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="#4285F4"
                        d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.87h5.391c-.232 1.25-.939 2.31-2.004 3.018v2.502h3.243c1.898-1.747 2.97-4.323 2.97-7.345Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 22c2.7 0 4.963-.896 6.617-2.428l-3.243-2.502c-.896.6-2.04.955-3.374.955-2.596 0-4.794-1.753-5.578-4.11H3.07v2.58A9.998 9.998 0 0 0 12 22Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M6.422 13.915A5.995 5.995 0 0 1 6.11 12c0-.665.115-1.31.312-1.915V7.505H3.07A9.998 9.998 0 0 0 2 12c0 1.61.386 3.135 1.07 4.495l3.352-2.58Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.975c1.467 0 2.784.505 3.82 1.496l2.864-2.864C16.96 3.01 14.698 2 12 2A9.998 9.998 0 0 0 3.07 7.505l3.352 2.58c.784-2.357 2.982-4.11 5.578-4.11Z"
                      />
                    </svg>
                    <span>Google</span>
                  </button>
                  <div
                    id="google-signin-button-proxy"
                    className="auth-google-proxy"
                  />
                </div>
              </div>
              {googleError && <div className="toast-error">{googleError}</div>}

              <div className="login-help auth-help">
                <p>
                  Eğer giriş butonu görünmüyorsa <code>frontend/.env</code>{" "}
                  dosyanıza <code>VITE_GOOGLE_CLIENT_ID</code> ekleyin.
                </p>
              </div>

              <button
                type="button"
                className="auth-back-link"
                onClick={() => setGuestView("landing")}
              >
                Başka bir hesaba giriş yapın
              </button>

              <p className="auth-support-note">
                Oturum açamıyor musunuz?{" "}
                <a href="#">Yardım merkezini ziyaret edin.</a>
              </p>
            </section>
          </main>
        </div>
      );
    }

    return (
      <div className="landing-site">
        <header className="landing-nav">
          <div className="landing-brand" aria-label="TaskFlow">
            <span className="topbar-logo" aria-hidden="true">
              <span className="topbar-logo-ring" />
              <span className="topbar-logo-core" />
            </span>
            <strong>TaskFlow</strong>
          </div>
          <nav className="landing-menu" aria-label="Ana menü">
            <a href="#">Ürün</a>
            <a href="#">Çözümler</a>
            <a href="#">Fiyatlar</a>
            <a href="#">Kaynaklar</a>
          </nav>
          <div className="landing-actions">
            <button
              type="button"
              className="landing-link-btn"
              onClick={() => setGuestView("login")}
            >
              Giriş yap
            </button>
            <button
              type="button"
              className="btn-primary landing-main-btn"
              onClick={() => setGuestView("login")}
            >
              Ücretsiz başla
            </button>
          </div>
        </header>

        <main className="landing-main">
          <section className="landing-hero">
            <span className="eyebrow">Yapay Zeka Tabanlı</span>
            <h1>Kod Gerektirmeyen İş Yönetim Platformu</h1>
            <p>
              Ekibinizin iş birliği ihtiyaçları için hızlı, esnek ve tamamen
              özelleştirilebilir bir görev yönetim deneyimi.
            </p>
            <div className="landing-cta-row">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setGuestView("login")}
              >
                Şimdi başlayın
              </button>
              <button
                type="button"
                className="btn-secondary landing-outline-btn"
                onClick={() => setGuestView("login")}
              >
                Giriş ekranına git
              </button>
            </div>
            <small>Kredi kartı bilgisi gerekmez</small>
          </section>

          <section className="landing-preview" aria-label="Uygulama önizleme">
            <div className="preview-window">
              <div className="preview-dots">
                <span />
                <span />
                <span />
              </div>
              <div className="preview-grid" />
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div className="topbar">
        <div className="topbar-brand" aria-label="TaskFlow">
          <span className="topbar-logo" aria-hidden="true">
            <span className="topbar-logo-ring" />
            <span className="topbar-logo-core" />
          </span>
          <span className="topbar-brand-text">TaskFlow</span>
        </div>
        <div className="user-bar" ref={profileMenuRef}>
          <button
            type="button"
            className={`profile-trigger ${profileMenuOpen ? "open" : ""}`}
            aria-label="Profil menüsü"
            aria-expanded={profileMenuOpen}
            onClick={() => setProfileMenuOpen((current) => !current)}
          >
            <span>{getUserInitials(user.name)}</span>
          </button>
          <div className={`profile-dropdown ${profileMenuOpen ? "open" : ""}`}>
            <div className="profile-summary">
              <div className="profile-avatar-large" aria-hidden="true">
                <span>{getUserInitials(user.name)}</span>
              </div>
              <div className="profile-summary-text">
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </div>
            </div>
            <button
              type="button"
              className="dropdown-item"
              onClick={handleSignOut}
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>

      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <strong>TaskFlow</strong>
            <span>Çalışma akışları</span>
          </div>

          <div className="workspace-switcher">
            <div className="workspace-switcher-head">
              <span>
                <span className="inline-glyph" aria-hidden="true">
                  <UiGlyph icon="spark" />
                </span>
                Çalışma alanları
              </span>
              <button
                type="button"
                className="workspace-add-btn"
                aria-label="Yeni çalışma alanı ekle"
                onClick={() => setShowWorkspaceInput((current) => !current)}
              >
                <UiGlyph icon="plus" />
              </button>
            </div>

            {showWorkspaceInput && (
              <div className="workspace-create">
                <input
                  type="text"
                  value={newWorkspaceName}
                  placeholder="Alan adı"
                  onChange={(event) => setNewWorkspaceName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleCreateWorkspace();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCreateWorkspace}
                >
                  Ekle
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setNewWorkspaceName("");
                    setShowWorkspaceInput(false);
                  }}
                >
                  İptal
                </button>
              </div>
            )}

            <nav className="sidebar-nav">
              {activeWorkspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className={`workspace-item-row ${
                    selectedWorkspace.id === workspace.id ? "active" : ""
                  }`}
                >
                  {editingWorkspaceId === workspace.id ? (
                    <div className="sidebar-item active workspace-editing-row">
                      <span
                        className="workspace-icon"
                        style={{ backgroundColor: workspace.color }}
                        aria-hidden="true"
                      >
                        <WorkspaceGlyph icon={workspace.icon} />
                      </span>
                      <input
                        autoFocus
                        className="workspace-rename-input"
                        value={editingWorkspaceName}
                        onChange={(event) =>
                          setEditingWorkspaceName(event.target.value)
                        }
                        onBlur={submitWorkspaceRename}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            submitWorkspaceRename();
                          }
                          if (event.key === "Escape") {
                            cancelWorkspaceRename();
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      className={`sidebar-item ${
                        selectedWorkspace.id === workspace.id ? "active" : ""
                      }`}
                      onClick={() => {
                        setSelectedWorkspaceId(workspace.id);
                        setViewMode("workspaces");
                      }}
                    >
                      <span
                        className="workspace-icon"
                        style={{ backgroundColor: workspace.color }}
                        aria-hidden="true"
                      >
                        <WorkspaceGlyph icon={workspace.icon} />
                      </span>
                      <span className="workspace-name">{workspace.name}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={`workspace-menu-btn ${
                      workspaceMenuOpenId === workspace.id ? "open" : ""
                    }`}
                    aria-label={`${workspace.name} seçenekleri`}
                    onClick={() =>
                      setWorkspaceMenuOpenId((current) =>
                        current === workspace.id ? null : workspace.id,
                      )
                    }
                  >
                    <UiGlyph icon="dots" />
                  </button>

                  {workspaceMenuOpenId === workspace.id && (
                    <div className="workspace-menu-dropdown">
                      <button
                        type="button"
                        className="workspace-menu-action"
                        onClick={() => startWorkspaceRename(workspace.id)}
                      >
                        Yeniden adlandır
                      </button>
                      <button
                        type="button"
                        className="workspace-menu-action"
                        onClick={() => handleArchiveWorkspace(workspace.id)}
                      >
                        Arşiv
                      </button>
                      <button
                        type="button"
                        className="workspace-menu-action workspace-menu-danger"
                        onClick={() => handleDeleteWorkspace(workspace.id)}
                      >
                        Sil
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>

          <div className="sidebar-footer">
            <div className="sidebar-links">
              <button
                type="button"
                className={`sidebar-link ${
                  viewMode === "archive" ? "active" : ""
                }`}
                onClick={() => setViewMode("archive")}
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  <SidebarGlyph icon="archive" />
                </span>
                Arşiv
              </button>
              <div className="settings-block" ref={settingsMenuRef}>
                <button
                  type="button"
                  className="sidebar-link"
                  onClick={() => setSettingsMenuOpen((current) => !current)}
                >
                  <span className="sidebar-link-icon" aria-hidden="true">
                    <SidebarGlyph icon="settings" />
                  </span>
                  Ayarlar
                </button>
                {settingsMenuOpen && (
                  <div className="settings-popover">
                    <button
                      type="button"
                      className="theme-menu-row"
                      onClick={() => setThemeMenuOpen((current) => !current)}
                    >
                      <span className="settings-popover-title">Tema</span>
                      <span
                        className={`settings-popover-chevron ${
                          themeMenuOpen ? "open" : ""
                        }`}
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </span>
                    </button>
                    {themeMenuOpen && (
                      <div className="theme-menu-options">
                        <button
                          type="button"
                          className={`theme-option ${
                            themeMode === "light" ? "active" : ""
                          }`}
                          onClick={() => {
                            setThemeMode("light");
                            setThemeMenuOpen(false);
                          }}
                        >
                          <span>Açık</span>
                          {themeMode === "light" ? (
                            <span
                              className="theme-option-check"
                              aria-hidden="true"
                            >
                              <UiGlyph icon="check" />
                            </span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          className={`theme-option ${
                            themeMode === "dark" ? "active" : ""
                          }`}
                          onClick={() => {
                            setThemeMode("dark");
                            setThemeMenuOpen(false);
                          }}
                        >
                          <span>Koyu</span>
                          {themeMode === "dark" ? (
                            <span
                              className="theme-option-check"
                              aria-hidden="true"
                            >
                              <UiGlyph icon="check" />
                            </span>
                          ) : null}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="sidebar-link danger-link"
                onClick={handleSignOut}
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  <SidebarGlyph icon="logout" />
                </span>
                Çıkış Yap
              </button>
            </div>
          </div>
        </aside>

        <main className="workspace">
          <section className="workspace-actions">
            <div>
              <div className="workspace-kicker">
                <span className="inline-glyph" aria-hidden="true">
                  <UiGlyph icon="spark" />
                </span>
                {viewMode === "archive" ? "Geçmiş görünümü" : "Aktif alan"}
              </div>
              <div className="workspace-selected-name">
                {viewMode === "archive" ? "Arşiv" : selectedWorkspace.name}
              </div>
            </div>
          </section>

          <section className="tasks-panel compact">
            <div className="panel-header compact">
              <div>
                <div className="panel-kicker">
                  <span className="inline-glyph" aria-hidden="true">
                    <UiGlyph icon="spark" />
                  </span>
                  Canlı pano
                </div>
                <h2>
                  {viewMode === "archive"
                    ? "Arşiv Görevleri"
                    : `${selectedWorkspace.name} Görevleri`}
                </h2>
                <p>
                  {viewMode === "archive"
                    ? "Arşivlenen çalışma alanları ve görevler burada listelenir."
                    : "Bu çalışma alanı içindeki görevleri görüntülüyorsunuz."}
                </p>
              </div>
              <div className="panel-actions">
                <label className="search-shell" aria-label="Görev ara">
                  <span className="search-icon" aria-hidden="true">
                    <UiGlyph icon="search" />
                  </span>
                  <input
                    className="search"
                    placeholder="Bul: başlık, açıklama..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
              </div>
            </div>

            {viewMode === "archive" && (
              <div className="archive-workspaces">
                <strong>Arşivlenen Çalışma Alanları</strong>
                {archivedWorkspaces.length === 0 ? (
                  <p>Henüz arşivlenen çalışma alanı yok.</p>
                ) : (
                  <div className="archive-workspace-list">
                    {archivedWorkspaces.map((workspace) => (
                      <div
                        key={workspace.id}
                        className="archive-workspace-chip"
                      >
                        <span>{workspace.name}</span>
                        <button
                          type="button"
                          className="archive-restore-btn"
                          onClick={() => handleRestoreWorkspace(workspace.id)}
                        >
                          Geri Getir
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && <div className="toast-error">{error}</div>}

            {viewMode === "workspaces" && (
              <div className="table-action-frame">
                <button
                  className="btn-primary"
                  onClick={() => setShowForm((current) => !current)}
                >
                  {showForm ? "Formu Gizle" : "Görev Ekle"}
                </button>
              </div>
            )}

            <div className="tasks-table-wrapper" ref={tasksTableWrapperRef}>
              <table className="tasks-table">
                <colgroup>
                  {tableDisplayColumns.map((column) => (
                    <col
                      key={`col-${column.field}`}
                      style={{
                        width:
                          column.field === "__spacer"
                            ? undefined
                            : `${columnWidths[column.field]}px`,
                      }}
                    />
                  ))}
                </colgroup>
                <thead>
                  {showForm && (
                    <>
                      <tr className="form-row">
                        {tableDisplayColumns.map((column) => (
                          <td
                            key={column.field}
                            className={
                              column.field === "__spacer"
                                ? "table-spacer-cell"
                                : undefined
                            }
                            style={{
                              width:
                                column.field === "__spacer"
                                  ? undefined
                                  : columnWidths[column.field],
                            }}
                          >
                            {column.field === "__spacer" ||
                            column.field === "index" ? null : column.field ===
                              "priority" ? (
                              <select
                                className="theme-select"
                                value={form.priority}
                                onChange={handleChange("priority")}
                              >
                                <option value="Acil">Acil</option>
                                <option value="Yüksek">Yüksek</option>
                                <option value="Orta">Orta</option>
                                <option value="Düşük">Düşük</option>
                              </select>
                            ) : column.field === "status" ? (
                              <select
                                className="theme-select"
                                value={form.status}
                                onChange={handleChange("status")}
                              >
                                <option value="Yapılacak">Yapılacak</option>
                                <option value="Tamamlandı">Tamamlandı</option>
                              </select>
                            ) : (
                              <input
                                type="text"
                                placeholder={
                                  column.field === "title"
                                    ? "Görev başlığı"
                                    : "Açıklama"
                                }
                                value={form[column.field as keyof TaskForm]}
                                onChange={handleChange(
                                  column.field as keyof TaskForm,
                                )}
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr className="form-actions-row">
                        <td colSpan={tableDisplayColumns.length}>
                          <div className="form-actions">
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={handleSubmit}
                              disabled={loading || !isFormValid}
                            >
                              Kaydet
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setShowForm(false)}
                            >
                              İptal
                            </button>
                          </div>
                        </td>
                      </tr>
                    </>
                  )}
                </thead>
                <tbody>
                  {loading && tasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={tableDisplayColumns.length}
                        className="no-data"
                      >
                        Görevler yükleniyor...
                      </td>
                    </tr>
                  ) : visibleTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={tableDisplayColumns.length}
                        className="no-data"
                      >
                        {viewMode === "archive"
                          ? "Arşivde görüntülenecek görev bulunamadı."
                          : "Bu çalışma alanında görev bulunamadı. Yeni görev ekleyin."}
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      let currentStatus = "";
                      let visibleIndex = 0;

                      return visibleTasks.map((task) => {
                        const status = task.status ?? "Yapılacak";
                        const groupKey = `${viewMode}:${status}`;
                        const groupChanged = status !== currentStatus;
                        if (groupChanged) {
                          currentStatus = status;
                        }

                        const isCollapsed =
                          collapsedStatusGroups[groupKey] ?? false;
                        const rowIndex = visibleIndex + 1;
                        if (!isCollapsed) {
                          visibleIndex += 1;
                        }

                        return (
                          <React.Fragment key={task.id}>
                            {groupChanged ? (
                              <tr className="status-group-row">
                                <td
                                  colSpan={tableDisplayColumns.length}
                                  className="status-group-cell"
                                >
                                  <button
                                    type="button"
                                    className="status-group-toggle"
                                    onClick={() => toggleStatusGroup(status)}
                                    aria-expanded={!isCollapsed}
                                  >
                                    <span className="status-group-leading">
                                      <span
                                        className="status-group-chevron"
                                        aria-hidden="true"
                                      >
                                        <svg viewBox="0 0 24 24">
                                          <path d="m6 9 6 6 6-6" />
                                        </svg>
                                      </span>
                                      <span className="status-group-count">
                                        {statusGroupCounts[status] ?? 0}
                                      </span>
                                    </span>
                                    <span className="status-group-label">
                                      {status}
                                    </span>
                                  </button>
                                </td>
                              </tr>
                            ) : null}

                            {groupChanged && !isCollapsed ? (
                              <tr className="status-columns-row">
                                {tableDisplayColumns.map((column) => (
                                  <th
                                    key={`${status}-${column.field}`}
                                    className={
                                      column.field === "__spacer"
                                        ? "table-spacer-head"
                                        : column.field === "status" ||
                                            column.field === "priority"
                                          ? "centered-head"
                                          : undefined
                                    }
                                    style={{
                                      width:
                                        column.field === "__spacer"
                                          ? undefined
                                          : columnWidths[column.field],
                                    }}
                                  >
                                    {column.field === "__spacer" ? null : (
                                      <div className="header-cell">
                                        <span>{column.label}</span>
                                        <div
                                          className={`resize-handle ${
                                            column.field === "description"
                                              ? "resize-handle-left"
                                              : "resize-handle-right"
                                          }`}
                                          onMouseDown={(event) =>
                                            startColumnResize(
                                              column.field,
                                              event,
                                            )
                                          }
                                          onDoubleClick={(event) => {
                                            event.stopPropagation();
                                            resetColumnWidth(column.field);
                                          }}
                                          aria-label={`Resize ${column.label} column`}
                                          title="Sürükleyerek genişliği ayarlayın. Çift tıklama varsayılana döndürür."
                                        />
                                      </div>
                                    )}
                                  </th>
                                ))}
                              </tr>
                            ) : null}

                            {isCollapsed ? null : (
                              <tr className="task-row">
                                {tableDisplayColumns.map((column) => {
                                  const isEditing =
                                    editingCell?.id === task.id &&
                                    editingCell.field === column.field;

                                  return (
                                    <td
                                      key={column.field}
                                      className={
                                        column.field === "__spacer"
                                          ? "table-spacer-cell"
                                          : column.field === "description"
                                            ? "description-cell"
                                            : column.field === "status"
                                              ? "status-cell"
                                              : column.field === "priority"
                                                ? "priority-cell"
                                                : column.field === "title"
                                                  ? "preview-cell"
                                                  : undefined
                                      }
                                      data-preview-open={
                                        activePreviewCell?.id === task.id &&
                                        activePreviewCell.field === column.field
                                          ? "true"
                                          : "false"
                                      }
                                      style={{
                                        width:
                                          column.field === "__spacer"
                                            ? undefined
                                            : columnWidths[column.field],
                                      }}
                                      onClick={() => {
                                        if (column.field === "title") {
                                          togglePreviewCell(task.id, "title");
                                        }
                                        if (column.field === "description") {
                                          togglePreviewCell(
                                            task.id,
                                            "description",
                                          );
                                        }
                                      }}
                                      onDoubleClick={() =>
                                        startEditingCell(task, column.field)
                                      }
                                    >
                                      {column.field ===
                                      "__spacer" ? null : column.field ===
                                        "index" ? (
                                        <span className="task-index-badge">
                                          {rowIndex}
                                        </span>
                                      ) : isEditing ? (
                                        column.field === "status" ? (
                                          <div className="inline-options-menu">
                                            {["Yapılacak", "Tamamlandı"].map(
                                              (status) => (
                                                <button
                                                  key={status}
                                                  type="button"
                                                  autoFocus={
                                                    editingValue === status
                                                  }
                                                  className={`inline-option-chip task-badge task-status-badge ${
                                                    statusClassNames[status] ??
                                                    "badge-status-blue"
                                                  } ${
                                                    editingValue === status
                                                      ? "active"
                                                      : ""
                                                  }`}
                                                  onClick={() => {
                                                    setEditingValue(status);
                                                    void saveCellEdit(status);
                                                  }}
                                                  onKeyDown={(event) => {
                                                    if (
                                                      event.key === "Escape"
                                                    ) {
                                                      cancelCellEdit();
                                                    }
                                                  }}
                                                >
                                                  {status}
                                                </button>
                                              ),
                                            )}
                                          </div>
                                        ) : column.field === "priority" ? (
                                          <div className="inline-options-menu">
                                            {[
                                              "Acil",
                                              "Yüksek",
                                              "Orta",
                                              "Düşük",
                                            ].map((priority) => (
                                              <button
                                                key={priority}
                                                type="button"
                                                autoFocus={
                                                  editingValue === priority
                                                }
                                                className={`inline-option-chip task-badge task-priority-badge ${
                                                  priorityClassNames[
                                                    priority
                                                  ] ?? "badge-orta"
                                                } ${
                                                  editingValue === priority
                                                    ? "active"
                                                    : ""
                                                }`}
                                                onClick={() => {
                                                  setEditingValue(priority);
                                                  void saveCellEdit(priority);
                                                }}
                                                onKeyDown={(event) => {
                                                  if (event.key === "Escape") {
                                                    cancelCellEdit();
                                                  }
                                                }}
                                              >
                                                {priority}
                                              </button>
                                            ))}
                                          </div>
                                        ) : (
                                          <input
                                            autoFocus
                                            type="text"
                                            value={editingValue}
                                            onChange={(event) =>
                                              setEditingValue(
                                                event.target.value,
                                              )
                                            }
                                            onBlur={saveCellEdit}
                                            onKeyDown={(event) => {
                                              if (event.key === "Enter") {
                                                saveCellEdit();
                                              }
                                              if (event.key === "Escape") {
                                                cancelCellEdit();
                                              }
                                            }}
                                          />
                                        )
                                      ) : column.field === "title" ? (
                                        <>
                                          <div className="task-title-stack">
                                            <span className="task-title-text">
                                              {task.title}
                                            </span>
                                          </div>
                                          <div className="cell-preview">
                                            {task.title}
                                          </div>
                                        </>
                                      ) : column.field === "status" ? (
                                        <span
                                          className={`task-badge task-status-badge ${
                                            statusClassNames[
                                              task.status ?? "Yapılacak"
                                            ] ?? ""
                                          }`}
                                        >
                                          {task.status ?? "Yapılacak"}
                                        </span>
                                      ) : column.field === "priority" ? (
                                        <span
                                          className={`task-badge task-priority-badge ${
                                            priorityClassNames[task.priority] ??
                                            ""
                                          }`}
                                        >
                                          {task.priority}
                                        </span>
                                      ) : column.field === "description" ? (
                                        <>
                                          <div className="task-description-stack">
                                            <span className="description-text">
                                              {task.description || "-"}
                                            </span>
                                          </div>
                                          <div className="cell-preview">
                                            {task.description || "-"}
                                          </div>
                                          <div
                                            className="task-actions"
                                            onClick={(event) =>
                                              event.stopPropagation()
                                            }
                                          >
                                            {viewMode === "archive" ? (
                                              archivedTaskIds.includes(
                                                task.id,
                                              ) ? (
                                                <button
                                                  type="button"
                                                  className="task-action-btn"
                                                  onClick={() =>
                                                    handleRestoreTask(task.id)
                                                  }
                                                >
                                                  <span aria-hidden="true">
                                                    <UiGlyph icon="restore" />
                                                  </span>
                                                  Geri Getir
                                                </button>
                                              ) : (
                                                <span className="task-action-note">
                                                  <span aria-hidden="true">
                                                    <UiGlyph icon="archive" />
                                                  </span>
                                                  Çalışmayı geri getir
                                                </span>
                                              )
                                            ) : (
                                              <button
                                                type="button"
                                                className="task-action-btn"
                                                onClick={() =>
                                                  handleArchiveTask(task.id)
                                                }
                                              >
                                                <span aria-hidden="true">
                                                  <UiGlyph icon="archive" />
                                                </span>
                                                Arşivle
                                              </button>
                                            )}

                                            <button
                                              type="button"
                                              className="task-action-btn danger"
                                              onClick={() =>
                                                handleDeleteTask(task.id)
                                              }
                                            >
                                              <span aria-hidden="true">
                                                <UiGlyph icon="trash" />
                                              </span>
                                              Sil
                                            </button>
                                          </div>
                                        </>
                                      ) : (
                                        (task[
                                          column.field as keyof Task
                                        ] as any)
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
