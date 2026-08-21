import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Task } from "@taskflow/shared";
import { useAuth } from "../context/AuthContext";
import useWorkspaces from "../hooks/useWorkspaces";
import useTasks from "../hooks/useTasks";
import useNotifications from "../hooks/useNotifications";
import WorkspaceSwitcher from "../components/WorkspaceSwitcher";
import NotificationBell from "../components/NotificationBell";
import { PRIORITY_COLORS, STATUS_COLORS, STATUSES } from "../constants";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "TaskList">;

export default function TaskListScreen({ navigation }: Props) {
  const { idToken, user, signOut } = useAuth();
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    loading: workspacesLoading,
    error: workspacesError,
    reload: reloadWorkspaces,
  } = useWorkspaces(idToken);
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    reload: reloadTasks,
    updateTask,
    deleteTask,
  } = useTasks(idToken, activeWorkspaceId);
  const { unreadCount, reload: reloadNotifications } = useNotifications(idToken);
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reloadTasks();
      reloadWorkspaces();
      reloadNotifications();
    }, [reloadTasks, reloadWorkspaces, reloadNotifications]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([reloadTasks(), reloadWorkspaces(), reloadNotifications()]).finally(() =>
      setRefreshing(false),
    );
  }, [reloadTasks, reloadWorkspaces, reloadNotifications]);

  const toggleStatus = useCallback(
    (task: Task) => {
      const nextStatus =
        task.status === "Tamamlandı" ? STATUSES[0] : STATUSES[1];
      updateTask(task.id, { status: nextStatus }).catch(() => {
        Alert.alert("Hata", "Görev durumu güncellenemedi.");
      });
    },
    [updateTask],
  );

  const confirmDelete = useCallback(
    (task: Task) => {
      Alert.alert("Görevi sil", `"${task.title}" silinsin mi?`, [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            deleteTask(task.id).catch(() => {
              Alert.alert("Hata", "Görev silinemedi.");
            });
          },
        },
      ]);
    },
    [deleteTask],
  );

  const loading = workspacesLoading || tasksLoading;
  const error = workspacesError || tasksError;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{user?.name ?? user?.email ?? "TaskFlow"}</Text>
        <View style={styles.headerActions}>
          {activeWorkspace ? (
            <Pressable
              hitSlop={8}
              onPress={() =>
                navigation.navigate("Members", {
                  workspaceId: activeWorkspace.id,
                  workspaceName: activeWorkspace.name,
                  isOwner: activeWorkspace.role === "OWNER",
                })
              }
            >
              <Text style={styles.iconButton}>👥</Text>
            </Pressable>
          ) : null}
          <Pressable hitSlop={8} onPress={() => navigation.navigate("Profile")}>
            <Text style={styles.iconButton}>👤</Text>
          </Pressable>
          <NotificationBell
            unreadCount={unreadCount}
            onPress={() => navigation.navigate("Notifications")}
          />
          <Button title="Çıkış" onPress={signOut} />
        </View>
      </View>

      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelect={setActiveWorkspaceId}
      />

      {loading ? (
        <ActivityIndicator style={styles.spacing} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>Henüz görev yok.</Text>}
          contentContainerStyle={tasks.length === 0 ? styles.emptyList : undefined}
          renderItem={({ item }) => (
            <View style={styles.taskCard}>
              <Pressable
                onPress={() =>
                  activeWorkspaceId &&
                  navigation.navigate("TaskForm", {
                    task: item,
                    workspaceId: activeWorkspaceId,
                  })
                }
              >
                <Text style={styles.taskTitle}>{item.title}</Text>
                {item.description ? (
                  <Text style={styles.taskDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <View style={styles.badgeRow}>
                  <Text
                    style={[
                      styles.badge,
                      { color: STATUS_COLORS[item.status ?? "Yapılacak"] },
                    ]}
                  >
                    {item.status ?? "Yapılacak"}
                  </Text>
                  <Text style={[styles.badge, { color: PRIORITY_COLORS[item.priority] }]}>
                    {item.priority}
                  </Text>
                </View>
              </Pressable>
              <View style={styles.actionRow}>
                <Pressable onPress={() => toggleStatus(item)} hitSlop={8}>
                  <Text style={styles.actionLink}>
                    {item.status === "Tamamlandı" ? "Yapılacak yap" : "Tamamlandı yap"}
                  </Text>
                </Pressable>
                <Pressable onPress={() => confirmDelete(item)} hitSlop={8}>
                  <Text style={styles.actionLinkDanger}>Sil</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      {activeWorkspaceId ? (
        <Pressable
          style={styles.fab}
          onPress={() =>
            navigation.navigate("TaskForm", { workspaceId: activeWorkspaceId })
          }
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    fontSize: 20,
  },
  spacing: {
    marginTop: 16,
  },
  error: {
    marginTop: 16,
    color: "#dc2626",
  },
  empty: {
    textAlign: "center",
    color: "#999",
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
  taskCard: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  taskDescription: {
    marginTop: 4,
    color: "#555",
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  badge: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f2f2f2",
  },
  actionLink: {
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: "600",
  },
  actionLinkDanger: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: {
    color: "#fff",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "400",
  },
});
