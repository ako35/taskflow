import React from "react";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  EllipsisVertical,
  Layers3,
  LogOut,
  Orbit,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Target,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceIcon } from "../../types";

function Glyph({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon aria-hidden="true" />;
}

export function WorkspaceGlyph({ icon }: { icon: WorkspaceIcon }) {
  const iconMap: Record<WorkspaceIcon, LucideIcon> = {
    layers: Layers3,
    target: Target,
    spark: Sparkles,
    shield: Shield,
    orbit: Orbit,
    compass: Compass,
  };

  const Icon = iconMap[icon] ?? Compass;
  return <Glyph icon={Icon} />;
}

export function SidebarGlyph({
  icon,
}: {
  icon: "archive" | "settings" | "logout";
}) {
  const iconMap: Record<"archive" | "settings" | "logout", LucideIcon> = {
    archive: Archive,
    settings: Settings,
    logout: LogOut,
  };

  return <Glyph icon={iconMap[icon]} />;
}

export function UiGlyph({
  icon,
}: {
  icon:
    | "chevron-down"
    | "chevron-left"
    | "chevron-right"
    | "plus"
    | "dots"
    | "search"
    | "check"
    | "spark"
    | "layers"
    | "archive"
    | "restore"
    | "trash";
}) {
  const iconMap: Record<
    | "chevron-left"
    | "chevron-right"
    | "plus"
    | "dots"
    | "search"
    | "check"
    | "spark"
    | "layers"
    | "archive"
    | "restore"
    | "trash",
    LucideIcon
  > = {
    "chevron-down": ChevronDown,
    "chevron-left": ChevronLeft,
    "chevron-right": ChevronRight,
    plus: Plus,
    dots: EllipsisVertical,
    search: Search,
    check: Check,
    spark: Sparkles,
    layers: Layers3,
    archive: Archive,
    restore: RotateCcw,
    trash: Trash2,
  };

  return <Glyph icon={iconMap[icon]} />;
}
