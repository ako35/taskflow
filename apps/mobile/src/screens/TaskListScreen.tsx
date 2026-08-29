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
import {
  Archive,
  ChevronDown,
  Menu,
  Pencil,
  Plus,
  User,
  Users,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Task } from "@taskflow/shared";
import { useAuth } from "../context/AuthContext";
import useWorkspaces from "../hooks/useWorkspaces";
import useTasks from "../hooks/useTasks";
import useNotifications from "../hooks/useNotifications";
import NotificationBell from "../components/NotificationBell";
import SideMenu from "../components/SideMenu";
import Avatar from "../components/Avatar";
import Badge from "../components/Badge";
import AppButton from "../components/Button";
import ConfirmDialog from "../components/ConfirmDialog";
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

  const [signOutConfirmVisible, setSignOutConfirmVisible] = useState(false);

  const handleSignOutPress = useCallback(() => {
    setSignOutConfirmVisible(true);
  }, []);

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
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
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
    setWorkspaceMenuOpen(true);
  }, [activeWorkspace]);

  const onPressRenameFromMenu = useCallback(() => {
    if (!activeWorkspace) return;
    setWorkspaceMenuOpen(false);
    setRenameDraft(activeWorkspace.name);
    // Android needs the workspace-menu Modal to finish tearing down before
    // the rename Modal can reliably mount; opening synchronously in the
    // same tick silently fails to show it.
    setTimeout(() => setRenameModalOpen(true), 300);
  }, [activeWorkspace]);

  const onPressArchiveFromMenu = useCallback(() => {
    setWorkspaceMenuOpen(false);
    onArchiveActiveWorkspace().catch(() => {
      Alert.alert("Hata", "Çalışma alanı arşivlenemedi.");
    });
  }, [onArchiveActiveWorkspace]);

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
          <Pressable
            hitSlop={8}
            style={styles.titleRow}
            onPress={onOpenWorkspaceMenu}
          >
            <Text style={[styles.greeting, { color: colors.text }]} numberOfLines={1}>
              {activeWorkspace?.name ?? "TaskFlow"}
            </Text>
            <ChevronDown color={colors.textMuted} size={18} strokeWidth={2.25} />
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
          <NotificationBell
            unreadCount={unreadCount}
            onPress={() => navigation.navigate("Notifications")}
          />
          <Pressable hitSlop={8} onPress={() => navigation.navigate("Profile")}>
            {user ? (
              <Avatar user={user} size={32} />
            ) : (
              <User color={colors.text} size={20} strokeWidth={2} />
            )}
          </Pressable>
        </View>
      </View>

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
                isOwner: activeWorkspace?.role === "OWNER",
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
                      {activeWorkspace?.role === "OWNER" ? "Düzenle" : "Aç"}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {activeWorkspaceId && activeWorkspace?.role === "OWNER" ? (
        <Pressable
          style={({ pressed }) => [
            styles.fabShadow,
            { bottom: 24 + insets.bottom, opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={() =>
            navigation.navigate("TaskForm", {
              workspaceId: activeWorkspaceId,
              isOwner: true,
            })
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
        visible={workspaceMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setWorkspaceMenuOpen(false)}
      >
        <Pressable
          style={styles.renameOverlay}
          onPress={() => setWorkspaceMenuOpen(false)}
        >
          <Pressable
            style={[
              styles.workspaceMenuCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text
              style={[styles.workspaceMenuTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {activeWorkspace?.name}
            </Text>

            <View style={[styles.workspaceMenuDivider, { backgroundColor: colors.border }]} />

            {activeWorkspace?.role === "OWNER" ? (
              <Pressable
                onPress={onPressRenameFromMenu}
                style={({ pressed }) => [
                  styles.workspaceMenuRow,
                  pressed && { backgroundColor: colors.surfaceHighlight },
                ]}
              >
                <Pencil color={colors.text} size={18} strokeWidth={2} />
                <Text style={[styles.workspaceMenuRowText, { color: colors.text }]}>
                  Yeniden Adlandır
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={onPressArchiveFromMenu}
              style={({ pressed }) => [
                styles.workspaceMenuRow,
                pressed && { backgroundColor: colors.surfaceHighlight },
              ]}
            >
              <Archive color={colors.text} size={18} strokeWidth={2} />
              <Text style={[styles.workspaceMenuRowText, { color: colors.text }]}>
                Arşive Kaldır
              </Text>
            </Pressable>

            <View style={[styles.workspaceMenuDivider, { backgroundColor: colors.border }]} />

            <Pressable
              onPress={() => setWorkspaceMenuOpen(false)}
              style={({ pressed }) => [
                styles.workspaceMenuRow,
                pressed && { backgroundColor: colors.surfaceHighlight },
              ]}
            >
              <Text style={[styles.workspaceMenuRowText, { color: colors.textMuted }]}>
                Vazgeç
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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

      <ConfirmDialog
        visible={signOutConfirmVisible}
        title="Çıkış Yap"
        message="Çıkış yapmak istediğinizden emin misiniz?"
        confirmLabel="Çıkış Yap"
        destructive
        onCancel={() => setSignOutConfirmVisible(false)}
        onConfirm={() => {
          setSignOutConfirmVisible(false);
          signOut();
        }}
      />
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  renameOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2, 6, 23, 0.55)",
    padding: 24,
  },
  workspaceMenuCard: {
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  workspaceMenuTitle: {
    fontSize: 15,
    fontFamily: fonts.sansBold,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  workspaceMenuDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  workspaceMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    minHeight: 48,
  },
  workspaceMenuRowText: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
  renameCard: {
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  renameLabel: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 8,
  },
  renameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.sansRegular,
  },
  renameActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
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
    paddingVertical: 12,
  },
  chevron: {
    width: 16,
    alignItems: "center",
  },
  countChip: {
    minWidth: 22,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
