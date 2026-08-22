import { Compass, Layers3, Orbit, Shield, Sparkles, Target } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { WorkspaceIcon } from "@taskflow/shared";

export const WORKSPACE_ICONS: Record<WorkspaceIcon, LucideIcon> = {
  compass: Compass,
  layers: Layers3,
  target: Target,
  spark: Sparkles,
  shield: Shield,
  orbit: Orbit,
};
