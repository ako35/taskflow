export const PRIORITIES = ["Acil", "Yüksek", "Orta", "Düşük"] as const;
export const STATUSES = ["Yapılacak", "Tamamlandı"] as const;

export const PRIORITY_COLORS: Record<string, string> = {
  Acil: "#dc2626",
  Yüksek: "#c2410c",
  Orta: "#1d4ed8",
  Düşük: "#047857",
};

export const STATUS_COLORS: Record<string, string> = {
  Yapılacak: "#1d4ed8",
  Tamamlandı: "#047857",
};
