import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { RotateCcw } from "lucide-react-native";
import type { Workspace } from "@taskflow/shared";
import { getStoredArchivedWorkspaceIds, setStoredArchivedWorkspaceIds } from "../lib/secureStorage";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";
import AppButton from "../components/Button";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "ArchivedWorkspaces">;

export default function ArchivedWorkspacesScreen({ route }: Props) {
  const { colors } = useTheme();
  const [items, setItems] = useState<Workspace[]>(route.params.archivedWorkspaces);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const onRestore = async (workspaceId: string) => {
    setRestoringId(workspaceId);
    try {
      const current = await getStoredArchivedWorkspaceIds();
      await setStoredArchivedWorkspaceIds(current.filter((id) => id !== workspaceId));
      setItems((prev) => prev.filter((workspace) => workspace.id !== workspaceId));
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {items.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          Arşivlenmiş çalışma alanı yok.
        </Text>
      ) : (
        items.map((workspace) => (
          <View key={workspace.id} style={[styles.row, { borderColor: colors.border }]}>
            <View style={styles.rowContent}>
              <View style={[styles.dot, { backgroundColor: workspace.color }]} />
              <Text style={[styles.rowName, { color: colors.text }]}>{workspace.name}</Text>
            </View>
            <AppButton
              title="Geri Yükle"
              variant="secondary"
              icon={<RotateCcw color={colors.text} size={15} strokeWidth={2} />}
              onPress={() => onRestore(workspace.id)}
              loading={restoringId === workspace.id}
              disabled={restoringId === workspace.id}
            />
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  empty: {
    textAlign: "center",
    marginTop: 32,
    fontFamily: fonts.sansRegular,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rowName: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
});
