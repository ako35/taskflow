import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  Archive,
  Compass,
  LogOut,
  Moon,
  Plus,
  Settings,
  X,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { User, Workspace } from "@taskflow/shared";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";
import { WORKSPACE_ICONS } from "../lib/workspaceIcons";
import Avatar from "./Avatar";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PANEL_WIDTH = Math.min(300, SCREEN_WIDTH * 0.8);

type SideMenuProps = {
  visible: boolean;
  user: User | null;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  archivedCount: number;
  onClose: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
  onOpenArchive: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
};

export default function SideMenu({
  visible,
  user,
  workspaces,
  activeWorkspaceId,
  archivedCount,
  onClose,
  onSelectWorkspace,
  onCreateWorkspace,
  onOpenArchive,
  onOpenSettings,
  onSignOut,
}: SideMenuProps) {
  const { colors, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: visible ? 0 : -PANEL_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateX, backdropOpacity]);

  const runAndClose = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
          <BlurView
            intensity={45}
            tint={mode === "dark" ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.backdropTint]} />
        </Animated.View>
      </Pressable>

      <Animated.View
        style={[
          styles.panel,
          {
            width: PANEL_WIDTH,
            backgroundColor: colors.surface,
            borderRightColor: colors.border,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.header}>
          {user ? (
            <View style={styles.profileRow}>
              <Avatar user={user} size={40} />
              <View style={styles.profileTextCol}>
                <Text
                  style={[styles.profileName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {user.name ?? user.email}
                </Text>
                <Text
                  style={[styles.profileEmail, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {user.email}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.brand}>
              <View style={[styles.logo, { backgroundColor: colors.primary }]}>
                <Compass color="#fff" size={16} strokeWidth={2} />
              </View>
              <Text style={[styles.brandText, { color: colors.text }]}>TaskFlow</Text>
            </View>
          )}
          <Pressable onPress={onClose} hitSlop={14}>
            <X color={colors.textMuted} size={20} strokeWidth={2} />
          </Pressable>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.accordionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              ÇALIŞMA ALANLARI
            </Text>
          </View>

          {workspaces.map((workspace) => {
            const active = workspace.id === activeWorkspaceId;
            const Icon = WORKSPACE_ICONS[workspace.icon] ?? Compass;
            return (
              <Pressable
                key={workspace.id}
                onPress={() => runAndClose(() => onSelectWorkspace(workspace.id))}
                style={[
                  styles.workspaceRow,
                  active && { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <View
                  style={[styles.workspaceIcon, { backgroundColor: workspace.color }]}
                >
                  <Icon color="#fff" size={14} strokeWidth={2} />
                </View>
                <Text
                  style={[styles.workspaceName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {workspace.name}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            onPress={() => runAndClose(onCreateWorkspace)}
            style={styles.workspaceRow}
          >
            <View
              style={[styles.workspaceIcon, styles.createIcon, { borderColor: colors.border }]}
            >
              <Plus color={colors.textMuted} size={14} strokeWidth={2} />
            </View>
            <Text style={[styles.workspaceName, { color: colors.textMuted }]}>
              Yeni çalışma alanı
            </Text>
          </Pressable>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={[styles.footerRow, styles.themeToggleRow]}>
            <View style={styles.footerRowLeft}>
              <Moon color={colors.text} size={16} strokeWidth={2} />
              <Text style={[styles.footerText, { color: colors.text }]}>Koyu Tema</Text>
            </View>
            <Switch
              value={mode === "dark"}
              onValueChange={(value) => setMode(value ? "dark" : "light")}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          <Pressable
            onPress={() => runAndClose(onOpenArchive)}
            style={styles.footerRow}
          >
            <Archive color={colors.text} size={16} strokeWidth={2} />
            <Text style={[styles.footerText, { color: colors.text }]}>
              {archivedCount > 0 ? `Arşiv (${archivedCount})` : "Arşiv"}
            </Text>
          </Pressable>
          <Pressable onPress={() => runAndClose(onOpenSettings)} style={styles.footerRow}>
            <Settings color={colors.text} size={16} strokeWidth={2} />
            <Text style={[styles.footerText, { color: colors.text }]}>Ayarlar</Text>
          </Pressable>
          <Pressable onPress={() => runAndClose(onSignOut)} style={styles.footerRow}>
            <LogOut color={colors.danger} size={16} strokeWidth={2} />
            <Text style={[styles.footerText, { color: colors.danger }]}>Çıkış Yap</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropTint: {
    backgroundColor: "rgba(2, 6, 23, 0.32)",
  },
  panel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
  },
  profileRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginRight: 12,
  },
  profileTextCol: {
    flex: 1,
  },
  profileName: {
    fontSize: 14,
    fontFamily: fonts.sansBold,
  },
  profileEmail: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: fonts.sansMedium,
  },
  body: {
    flex: 1,
    marginTop: 20,
    paddingHorizontal: 12,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.sansBold,
    letterSpacing: 0.6,
  },
  workspaceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  workspaceIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  createIcon: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  workspaceName: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    gap: 4,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  themeToggleRow: {
    justifyContent: "space-between",
  },
  footerRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  footerText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
});
