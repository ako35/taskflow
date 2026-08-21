import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import type { Workspace } from "@taskflow/shared";
import { useTheme } from "../theme/ThemeContext";

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
        <Text style={[styles.chipText, { color: colors.text }]}>+ Yeni</Text>
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
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff",
  },
  createChip: {
    borderStyle: "dashed",
  },
});
