export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatReminderInput(date: Date): string {
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()} ${pad2(
    date.getHours(),
  )}:${pad2(date.getMinutes())}`;
}
