import type { Task } from "@taskflow/shared";

export function getStatusRank(status?: string): number {
  const normalized = (status ?? "Yapılacak").trim().toLocaleLowerCase("tr-TR");
  if (normalized === "yapılacak" || normalized === "yapilacak") return 0;
  if (normalized === "tamamlandı" || normalized === "tamamlandi") return 1;
  return 999;
}

export function isCompletedStatus(status?: string): boolean {
  return getStatusRank(status) === 1;
}

export function getPriorityRank(priority?: string): number {
  const normalized = (priority ?? "Orta").trim().toLocaleLowerCase("tr-TR");
  if (normalized === "acil") return 0;
  if (normalized === "yüksek" || normalized === "yuksek") return 1;
  if (normalized === "orta") return 2;
  if (normalized === "düşük" || normalized === "dusuk") return 3;
  return 999;
}

export function sortTasksForTable(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const statusDiff = getStatusRank(a.status) - getStatusRank(b.status);
    if (statusDiff !== 0) return statusDiff;

    const priorityDiff = getPriorityRank(a.priority) - getPriorityRank(b.priority);
    if (priorityDiff !== 0) return priorityDiff;

    const titleDiff = a.title.localeCompare(b.title, "tr-TR", { sensitivity: "base" });
    if (titleDiff !== 0) return titleDiff;

    return a.id - b.id;
  });
}

export type TaskSection = {
  status: string;
  data: Task[];
};

export function groupTasksByStatus(tasks: Task[]): TaskSection[] {
  const sorted = sortTasksForTable(tasks);
  const groups = new Map<string, Task[]>();

  for (const task of sorted) {
    const status = task.status ?? "Yapılacak";
    const bucket = groups.get(status);
    if (bucket) {
      bucket.push(task);
    } else {
      groups.set(status, [task]);
    }
  }

  return Array.from(groups.entries()).map(([status, data]) => ({ status, data }));
}
