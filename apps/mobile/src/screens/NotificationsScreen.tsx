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
import type { UserNotification } from "@taskflow/shared";
import { useAuth } from "../context/AuthContext";
import useNotifications from "../hooks/useNotifications";
import { fetchTask } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;

export default function NotificationsScreen({ navigation }: Props) {
  const { idToken } = useAuth();
  const { notifications, unreadCount, loading, error, reload, markOneRead, markAllRead } =
    useNotifications(idToken);
  const [refreshing, setRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    reload().finally(() => setRefreshing(false));
  }, [reload]);

  const onOpen = useCallback(
    async (item: UserNotification) => {
      setOpeningId(item.id);
      try {
        if (!item.isRead) {
          await markOneRead(item.id);
        }
        const task = await fetchTask(idToken, item.taskId);
        navigation.navigate("TaskForm", { task, workspaceId: task.workspaceId });
      } catch {
        Alert.alert("Hata", "Görev açılamadı. Silinmiş olabilir.");
      } finally {
        setOpeningId(null);
      }
    },
    [idToken, markOneRead, navigation],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Bildirimler{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </Text>
        {unreadCount > 0 ? (
          <Pressable onPress={() => markAllRead().catch(() => undefined)} hitSlop={8}>
            <Text style={styles.markAllLink}>Tümünü okundu işaretle</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.spacing} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>Bildirim yok.</Text>}
          contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.item, !item.isRead && styles.itemUnread]}
              onPress={() => onOpen(item)}
              disabled={openingId === item.id}
            >
              {!item.isRead ? <View style={styles.dot} /> : null}
              <View style={styles.itemContent}>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  markAllLink: {
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: "600",
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
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  itemUnread: {
    backgroundColor: "#eff4ff",
    borderColor: "#dbe6ff",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1d4ed8",
    marginTop: 5,
  },
  itemContent: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: "#222",
  },
  date: {
    marginTop: 4,
    fontSize: 11,
    color: "#999",
  },
});
