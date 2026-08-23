import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ChevronDown, Menu, MoreHorizontal, Pencil, Plus, User, Users } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Task } from "@taskflow/shared";
import { useAuth } from "../context/AuthContext";
import useWorkspaces from "../hooks/useWorkspaces";
import useTasks from "../hooks/useTasks";
import useNotifications from "../hooks/useNotifications";
import NotificationBell from "../components/NotificationBell";
import SideMenu from "../components/SideMenu";
import Badge from "../components/Badge";
import AppButton from "../components/Button";
import { renameWorkspace } from "../lib/api";
import { formatDateTime } from "../lib/format";
import {
  getStoredArchivedWorkspaceIds,
  setStoredArchivedWorkspaceIds,
} from "../lib/secureStorage";
import { groupTasksByStatus, isCompletedStatus } from "../lib/taskSort";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";
import { priorityToBadgeTone, statusToBadgeTone } from "../theme/badgeColors";
import { STATUSES } from "../constants";
import type { MainTabScreenProps } from "../navigation/types";

type Props = MainTabScreenProps<"TaskList">;

export default function TaskListScreen({ navigation }: Props) {
  const { idToken, user, signOut } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const handleSignOutPress = useCallback(() => {
    Alert.alert("Çıkış Yap", "Çıkış yapmak istediğinizden emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış Yap", style: "destructive", onPress: signOut },
    ]);
  }, [signOut]);

  const {
    activeWorkspaces,
    archivedWorkspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    loading: workspacesLoading,
    error: workspacesError,
    reload: reloadWorkspaces,
    reloadArchived,
  } = useWorkspaces(idToken);
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    reload: reloadTasks,
    updateTask,
  } = useTasks(idToken, activeWorkspaceId);
  const { unreadCount, reload: reloadNotifications } = useNotifications(idToken);
  const activeWorkspace = activeWorkspaces.find(
    (workspace) => workspace.id === activeWorkspaceId,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsedOverrides, setCollapsedOverrides] = useState<Record<string, boolean>>({});
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [archivingWorkspace, setArchivingWorkspace] = useState(false);

  const onArchiveActiveWorkspace = useCallback(async () => {
    if (!activeWorkspace) return;
    setArchivingWorkspace(true);
    try {
      const current = await getStoredArchivedWorkspaceIds();
      if (!current.includes(activeWorkspace.id)) {
        await setStoredArchivedWorkspaceIds([...current, activeWorkspace.id]);
      }
      await reloadArchived();
    } finally {
      setArchivingWorkspace(false);
    }
  }, [activeWorkspace, reloadArchived]);

  const onOpenWorkspaceMenu = useCallback(() => {
    if (!activeWorkspace) return;
    const options: Array<{
      text: string;
      style?: "cancel" | "destructive" | "default";
      onPress?: () => void;
    }> = [];

    if (activeWorkspace.role === "OWNER") {
      options.push({
        text: "Yeniden Adlandır",
        onPress: () => {
          setRenameDraft(activeWorkspace.name);
          // Android needs the Alert's own dialog to finish tearing down
          // before a new Modal can reliably mount; opening synchronously
          // in the same tick silently fails to show it.
          setTimeout(() => setRenameModalOpen(true), 300);
        },
      });
    }

    options.push({
      text: "Arşive Kaldır",
      onPress: () => {
        onArchiveActiveWorkspace().catch(() => {
          Alert.alert("Hata", "Çalışma alanı arşivlenemedi.");
        });
      },
    });
    options.push({ text: "Vazgeç", style: "cancel" });

    Alert.alert(activeWorkspace.name, undefined, options);
  }, [activeWorkspace, onArchiveActiveWorkspace]);

  const onConfirmRename = useCallback(async () => {
    if (!activeWorkspace) return;
    const trimmed = renameDraft.trim();
    if (!trimmed) {
      Alert.alert("Eksik bilgi", "Çalışma alanı adı boş olamaz.");
      return;
    }
    setRenaming(true);
    try {
      await renameWorkspace(idToken, activeWorkspace.id, trimmed);
      setRenameModalOpen(false);
      await reloadWorkspaces();
    } catch {
      Alert.alert("Hata", "Çalışma alanı güncellenemedi.");
    } finally {
      setRenaming(false);
    }
  }, [activeWorkspace, idToken, renameDraft, reloadWorkspaces]);

  const isGroupCollapsed = useCallback(
    (status: string) => collapsedOverrides[status] ?? isCompletedStatus(status),
    [collapsedOverrides],
  );

  const toggleGroup = useCallback(
    (status: string) => {
      setCollapsedOverrides((current) => ({
        ...current,
        [status]: !isGroupCollapsed(status),
      }));
    },
    [isGroupCollapsed],
  );

  const sections = useMemo(() => groupTasksByStatus(tasks), [tasks]);

  const indexById = useMemo(() => {
    const map = new Map<number, number>();
    let counter = 0;
    for (const section of sections) {
      if (isGroupCollapsed(section.status)) continue;
      for (const task of section.data) {
        counter += 1;
        map.set(task.id, counter);
      }
    }
    return map;
  }, [sections, isGroupCollapsed]);

  const visibleSections = useMemo(
    () =>
      sections.map((section) => ({
        status: section.status,
        count: section.data.length,
        data: isGroupCollapsed(section.status) ? [] : section.data,
      })),
    [sections, isGroupCollapsed],
  );

  useFocusEffect(
    useCallback(() => {
      reloadTasks();
      reloadWorkspaces();
      reloadArchived();
      reloadNotifications();
    }, [reloadTasks, reloadWorkspaces, reloadArchived, reloadNotifications]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      reloadTasks(),
      reloadWorkspaces(),
      reloadArchived(),
      reloadNotifications(),
    ]).finally(() => setRefreshing(false));
  }, [reloadTasks, reloadWorkspaces, reloadArchived, reloadNotifications]);

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

  const loading = workspacesLoading || tasksLoading;
  const error = workspacesError || tasksError;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg, paddingTop: insets.top + 16 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable hitSlop={14} onPress={() => setMenuOpen(true)}>
            <Menu color={colors.text} size={22} strokeWidth={2} />
          </Pressable>
          <Pressable hitSlop={8} onPress={() => navigation.navigate("Profile")}>
            <Text style={[styles.greeting, { color: colors.text }]}>
              {user?.name ?? user?.email ?? "TaskFlow"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.headerActions}>
          {activeWorkspace ? (
            <Pressable
              hitSlop={14}
              onPress={() =>
                navigation.navigate("Members", {
                  workspaceId: activeWorkspace.id,
                  workspaceName: activeWorkspace.name,
                  isOwner: activeWorkspace.role === "OWNER",
                })
              }
            >
              <Users color={colors.text} size={20} strokeWidth={2} />
            </Pressable>
          ) : null}
          <Pressable hitSlop={14} onPress={() => navigation.navigate("Profile")}>
            <User color={colors.text} size={20} strokeWidth={2} />
          </Pressable>
          <NotificationBell
            unreadCount={unreadCount}
            onPress={() => navigation.navigate("Notifications")}
          />
        </View>
      </View>

      {activeWorkspace ? (
        <View style={styles.activeWorkspaceRow}>
          <View style={styles.activeWorkspaceInfo}>
            <View
              style={[styles.workspaceDot, { backgroundColor: activeWorkspace.color }]}
            />
            <Text
              style={[styles.activeWorkspaceText, { color: colors.text }]}
              numberOfLines={1}
            >
              {activeWorkspace.name}
            </Text>
          </View>
          <Pressable
            hitSlop={14}
            onPress={onOpenWorkspaceMenu}
            disabled={archivingWorkspace}
          >
            <MoreHorizontal color={colors.textMuted} size={20} strokeWidth={2} />
          </Pressable>
        </View>
      ) : null}

      {archivedWorkspaces.length > 0 ? (
        <Pressable
          onPress={() => navigation.navigate("ArchivedWorkspaces", { archivedWorkspaces })}
          style={styles.archivedLink}
        >
          <Text style={[styles.archivedLinkText, { color: colors.textMuted }]}>
            Arşivlenmiş alanlar ({archivedWorkspaces.length})
          </Text>
        </Pressable>
      ) : null}

      {loading ? (
        <ActivityIndicator style={styles.spacing} color={colors.primary} />
      ) : error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : tasks.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>Henüz görev yok.</Text>
      ) : (
        <SectionList
          sections={visibleSections}
          keyExtractor={(item) => String(item.id)}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderSectionHeader={({ section }) => {
            const collapsed = isGroupCollapsed(section.status);
            return (
              <Pressable
                onPress={() => toggleGroup(section.status)}
                style={[styles.sectionHeader, { backgroundColor: colors.bg }]}
              >
                <View
                  style={[
                    styles.chevron,
                    { transform: [{ rotate: collapsed ? "-90deg" : "0deg" }] },
                  ]}
                >
                  <ChevronDown color={colors.textMuted} size={16} strokeWidth={2.25} />
                </View>
                <View style={[styles.countChip, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={[styles.countChipText, { color: colors.textMuted }]}>
                    {section.count}
                  </Text>
                </View>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>
                  {section.status}
                </Text>
              </Pressable>
            );
          }}
          renderItem={({ item }) => {
            const openEdit = () =>
              activeWorkspaceId &&
              navigation.navigate("TaskForm", {
                task: item,
                workspaceId: activeWorkspaceId,
              });

            return (
              <Pressable
                onPress={openEdit}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed ? colors.surfaceHighlight : colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.rowTopLine}>
                  <Text style={[styles.indexText, { color: colors.textMuted }]}>
                    {indexById.get(item.id)}
                  </Text>
                  <Text
                    style={[styles.taskTitle, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                </View>

                {item.remindAt ? (
                  <Text style={[styles.reminderText, { color: colors.textMuted }]}>
                    ⏰ {formatDateTime(item.remindAt)}
                  </Text>
                ) : null}

                <View style={styles.rowBottomLine}>
                  <View style={styles.badgesGroup}>
                    <Pressable onPress={() => toggleStatus(item)} hitSlop={13}>
                      <Badge
                        label={item.status ?? "Yapılacak"}
                        tone={statusToBadgeTone(item.status ?? "Yapılacak")}
                      />
                    </Pressable>
                    <Badge label={item.priority} tone={priorityToBadgeTone(item.priority)} />
                  </View>

                  <Pressable
                    onPress={openEdit}
                    hitSlop={12}
                    style={[styles.editBtn, { borderColor: colors.border }]}
                  >
                    <Pencil color={colors.primary} size={13} strokeWidth={2} />
                    <Text style={[styles.editBtnText, { color: colors.primary }]}>
                      Düzenle
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {activeWorkspaceId ? (
        <Pressable
          style={({ pressed }) => [
            styles.fabShadow,
            { bottom: 24 + insets.bottom, opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={() =>
            navigation.navigate("TaskForm", { workspaceId: activeWorkspaceId })
          }
        >
          <LinearGradient
            colors={["#5b8cff", "#2d5ff0", "#1d4ed8"]}
            locations={[0, 0.58, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Plus color="#fff" size={26} strokeWidth={2.5} />
          </LinearGradient>
        </Pressable>
      ) : null}

      <SideMenu
        visible={menuOpen}
        user={user}
        workspaces={activeWorkspaces}
        activeWorkspaceId={activeWorkspaceId}
        archivedCount={archivedWorkspaces.length}
        onClose={() => setMenuOpen(false)}
        onSelectWorkspace={setActiveWorkspaceId}
        onCreateWorkspace={() => navigation.navigate("WorkspaceCreate")}
        onOpenArchive={() =>
          navigation.navigate("ArchivedWorkspaces", { archivedWorkspaces })
        }
        onOpenSettings={() => navigation.navigate("Profile")}
        onSignOut={handleSignOutPress}
      />

      <Modal
        visible={renameModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalOpen(false)}
      >
        <Pressable
          style={styles.renameOverlay}
          onPress={() => setRenameModalOpen(false)}
        >
          <Pressable
            style={[
              styles.renameCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={[styles.renameLabel, { color: colors.textMuted }]}>Alan Adı</Text>
            <TextInput
              style={[
                styles.renameInput,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={renameDraft}
              onChangeText={setRenameDraft}
              autoFocus
              selectionColor={colors.primary}
              cursorColor={colors.primary}
              underlineColorAndroid="transparent"
              autoCorrect={false}
              spellCheck={false}
              importantForAutofill="no"
            />
            <View style={styles.renameActions}>
              <AppButton
                title="Kaydet"
                onPress={onConfirmRename}
                loading={renaming}
                disabled={renaming}
              />
              <AppButton
                title="Vazgeç"
                variant="secondary"
                onPress={() => setRenameModalOpen(false)}
                disabled={renaming}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 1,
  },
  greeting: {
    fontSize: 19,
    fontFamily: fonts.displayBold,
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  activeWorkspaceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  activeWorkspaceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  workspaceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeWorkspaceText: {
    fontSize: 15,
    fontFamily: fonts.sansBold,
  },
  renameOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2, 6, 23, 0.55)",
    padding: 24,
  },
  renameCard: {
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  renameLabel: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 6,
  },
  renameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: fonts.sansRegular,
  },
  renameActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  archivedLink: {
    marginBottom: 12,
  },
  archivedLinkText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
  },
  spacing: {
    marginTop: 16,
  },
  error: {
    marginTop: 16,
  },
  empty: {
    marginTop: 32,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  chevron: {
    width: 16,
    alignItems: "center",
  },
  countChip: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    alignItems: "center",
  },
  countChipText: {
    fontSize: 11,
    fontFamily: fonts.sansBold,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: fonts.sansBold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  row: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  rowTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  indexText: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
  reminderText: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: fonts.sansMedium,
  },
  rowBottomLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  badgesGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  editBtnText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
  },
  fabShadow: {
    position: "absolute",
    right: 20,
    borderRadius: 28,
    shadowColor: "#1d4ed8",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
