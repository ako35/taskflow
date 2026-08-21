export type ThemeMode = "dark" | "light";

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryStrong: string;
  danger: string;
  success: string;
};

export const darkColors: ThemeColors = {
  bg: "#0a1225",
  surface: "rgba(15, 23, 42, 0.95)",
  surfaceAlt: "rgba(30, 41, 59, 0.9)",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  border: "rgba(148, 163, 184, 0.18)",
  primary: "#5b8cff",
  primaryStrong: "#3366ff",
  danger: "#fb7185",
  success: "#34d399",
};

export const lightColors: ThemeColors = {
  bg: "#f3f6fc",
  surface: "#ffffff",
  surfaceAlt: "#eef3ff",
  text: "#0f172a",
  textMuted: "#475569",
  border: "rgba(15, 23, 42, 0.14)",
  primary: "#2f5cd8",
  primaryStrong: "#264fc0",
  danger: "#dc2626",
  success: "#059669",
};

export function getColorsForMode(mode: ThemeMode): ThemeColors {
  return mode === "light" ? lightColors : darkColors;
}
