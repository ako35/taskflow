import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Compass, Layers3, Orbit, Plus, Shield, Sparkles, Target } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { Workspace, WorkspaceIcon } from "@taskflow/shared";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";

const WORKSPACE_ICONS: Record<WorkspaceIcon, LucideIcon> = {
  compass: Compass,
  layers: Layers3,
  target: Target,
  spark: Sparkles,
  shield: Shield,
  orbit: Orbit,
};

type WorkspaceSwitcherProps = {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelect: (workspaceId: string) => void;
  onCreatePress: () => void;
};

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onSelect,
  onCreatePress,
}: WorkspaceSwitcherProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {workspaces.map((workspace) => {
        const active = workspace.id === activeWorkspaceId;
        const Icon = WORKSPACE_ICONS[workspace.icon] ?? Compass;
        return (
          <Pressable
            key={workspace.id}
            onPress={() => onSelect(workspace.id)}
            style={[
              styles.chip,
              { borderColor: workspace.color },
              active && { backgroundColor: workspace.color },
            ]}
          >
            <Icon color={active ? "#fff" : colors.text} size={14} strokeWidth={2} />
            <Text
              style={[
                styles.chipText,
                { color: colors.text },
                active && styles.chipTextActive,
              ]}
            >
              {workspace.name}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        onPress={onCreatePress}
        style={[styles.chip, styles.createChip, { borderColor: colors.textMuted }]}
      >
        <Plus color={colors.text} size={14} strokeWidth={2} />
        <Text style={[styles.chipText, { color: colors.text }]}>Yeni</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
  },
  chipTextActive: {
    color: "#fff",
  },
  createChip: {
    borderStyle: "dashed",
  },
});
