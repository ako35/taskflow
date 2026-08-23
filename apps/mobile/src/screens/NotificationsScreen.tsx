import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CheckCheck } from "lucide-react-native";
import type { UserNotification } from "@taskflow/shared";
import { useAuth } from "../context/AuthContext";
import useNotifications from "../hooks/useNotifications";
import { fetchTask } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";
import type { MainTabScreenProps } from "../navigation/types";

type Props = MainTabScreenProps<"Notifications">;

export default function NotificationsScreen({ navigation }: Props) {
  const { idToken } = useAuth();
  const { colors } = useTheme();
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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Bildirimler{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </Text>
        {unreadCount > 0 ? (
          <Pressable
            onPress={() => markAllRead().catch(() => undefined)}
            hitSlop={16}
            style={styles.markAllLink}
          >
            <CheckCheck color={colors.primary} size={14} strokeWidth={2} />
            <Text style={[styles.markAllLinkText, { color: colors.primary }]}>
              Tümünü okundu işaretle
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.spacing} color={colors.primary} />
      ) : error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>Bildirim yok.</Text>
          }
          contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.item,
                { borderColor: colors.border },
                !item.isRead && { backgroundColor: colors.surfaceAlt, borderColor: colors.primary },
              ]}
              onPress={() => onOpen(item)}
              disabled={openingId === item.id}
            >
              {!item.isRead ? (
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              ) : null}
              <View style={styles.itemContent}>
                <Text style={[styles.message, { color: colors.text }]}>{item.message}</Text>
                <Text style={[styles.date, { color: colors.textMuted }]}>
                  {formatDateTime(item.createdAt)}
                </Text>
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
    fontSize: 17,
    fontFamily: fonts.displayBold,
  },
  markAllLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  markAllLinkText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
  },
  spacing: {
    marginTop: 16,
  },
  error: {
    marginTop: 16,
  },
  empty: {
    textAlign: "center",
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
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  itemContent: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
  },
  date: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: fonts.sansRegular,
  },
});
