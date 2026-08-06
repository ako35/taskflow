import type { Task, User, Workspace, WorkspaceIcon } from "./types";
import {
  DEFAULT_COLUMN_WIDTHS,
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACES,
  tableColumns,
  WORKSPACE_ICONS,
} from "./constants";

export function fitColumnWidthsToContainer(
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

  return next;
}

export function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1];
    const payload = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(payload)));
  } catch {
    return null;
  }
}

export function splitPersonName(fullName?: string) {
  const normalized = (fullName || "").trim().replace(/\s+/g, " ");

  if (!normalized) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  const parts = normalized.split(" ");
  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "",
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

export function buildUserDisplayName(
  firstName?: string,
  lastName?: string,
  fallbackEmail?: string,
) {
  const displayName = [firstName, lastName]
    .map((value) => value?.trim() || "")
    .filter(Boolean)
    .join(" ");

  return displayName || fallbackEmail || "Kullanici";
}

export function hasTokenExpired(token: string) {
  const payload = parseJwt(token);
  if (!payload || typeof payload.exp !== "number") {
    return true;
  }
  return Date.now() >= payload.exp * 1000;
}

export function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getUserInitials(name: string) {
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

export function matchesSearch(task: Task, searchText: string) {
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

export function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function pickWorkspaceIcon(seed: string): WorkspaceIcon {
  return WORKSPACE_ICONS[hashString(seed) % WORKSPACE_ICONS.length];
}

export function normalizeWorkspaces(
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

export function getStatusRank(status?: string) {
  const normalized = (status ?? "Yapılacak").trim().toLocaleLowerCase("tr-TR");
  if (normalized === "yapılacak" || normalized === "yapilacak") return 0;
  if (normalized === "tamamlandı" || normalized === "tamamlandi") return 1;
  return 999;
}

export function getPriorityRank(priority?: string) {
  const normalized = (priority ?? "Orta").trim().toLocaleLowerCase("tr-TR");
  if (normalized === "acil") return 0;
  if (normalized === "yüksek" || normalized === "yuksek") return 1;
  if (normalized === "orta") return 2;
  if (normalized === "düşük" || normalized === "dusuk") return 3;
  return 999;
}
