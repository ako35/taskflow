import type { ThemeMode } from "./colors";

export type BadgeTone =
  | "acil"
  | "yuksek"
  | "orta"
  | "dusuk"
  | "status-blue"
  | "status-green"
  | "status-red";

type BadgePalette = { bg: string; text: string; border: string };

const darkBadgeColors: Record<BadgeTone, BadgePalette> = {
  acil: { bg: "rgba(251, 113, 133, 0.16)", text: "#fb7185", border: "rgba(251, 113, 133, 0.28)" },
  yuksek: { bg: "rgba(249, 115, 22, 0.16)", text: "#fb923c", border: "rgba(249, 115, 22, 0.28)" },
  orta: { bg: "rgba(59, 130, 246, 0.16)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.28)" },
  dusuk: { bg: "rgba(52, 211, 153, 0.16)", text: "#34d399", border: "rgba(52, 211, 153, 0.28)" },
  "status-blue": { bg: "rgba(59, 130, 246, 0.16)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.28)" },
  "status-green": { bg: "rgba(52, 211, 153, 0.16)", text: "#34d399", border: "rgba(52, 211, 153, 0.28)" },
  "status-red": { bg: "rgba(251, 113, 133, 0.16)", text: "#fb7185", border: "rgba(251, 113, 133, 0.28)" },
};

const lightBadgeColors: Record<BadgeTone, BadgePalette> = {
  acil: { bg: "rgba(220, 38, 38, 0.12)", text: "#b91c1c", border: "rgba(220, 38, 38, 0.32)" },
  yuksek: { bg: "rgba(234, 88, 12, 0.12)", text: "#c2410c", border: "rgba(234, 88, 12, 0.32)" },
  orta: { bg: "rgba(37, 99, 235, 0.12)", text: "#1d4ed8", border: "rgba(37, 99, 235, 0.32)" },
  dusuk: { bg: "rgba(5, 150, 105, 0.12)", text: "#047857", border: "rgba(5, 150, 105, 0.32)" },
  "status-blue": { bg: "rgba(37, 99, 235, 0.12)", text: "#1d4ed8", border: "rgba(37, 99, 235, 0.32)" },
  "status-green": { bg: "rgba(5, 150, 105, 0.12)", text: "#047857", border: "rgba(5, 150, 105, 0.32)" },
  "status-red": { bg: "rgba(220, 38, 38, 0.12)", text: "#b91c1c", border: "rgba(220, 38, 38, 0.32)" },
};

export function getBadgePalette(mode: ThemeMode, tone: BadgeTone): BadgePalette {
  return (mode === "light" ? lightBadgeColors : darkBadgeColors)[tone];
}

export function priorityToBadgeTone(priority: string): BadgeTone {
  switch (priority) {
    case "Acil":
      return "acil";
    case "Yüksek":
      return "yuksek";
    case "Düşük":
      return "dusuk";
    default:
      return "orta";
  }
}

export function statusToBadgeTone(status: string): BadgeTone {
  return status === "Tamamlandı" ? "status-green" : "status-red";
}

/**
 * Görev satırı / rozeti tonu: "Tamamlandı" ya da üye "Bitirdim" işaretlemişse
 * yeşil, aksi halde (Yapılacak) kırmızı.
 */
export function taskToneFor(task: {
  status?: string;
  assigneeDone?: boolean;
}): BadgeTone {
  if (task.status === "Tamamlandı") return "status-green";
  if (task.assigneeDone) return "status-green";
  return "status-red";
}
