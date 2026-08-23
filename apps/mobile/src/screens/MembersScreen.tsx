import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Archive, Mail, Trash2, UserPlus, X } from "lucide-react-native";
import type { WorkspaceInvitePerson } from "@taskflow/shared";
import { useAuth } from "../context/AuthContext";
import useWorkspaceMembers from "../hooks/useWorkspaceMembers";
import { acceptInvitation, deleteWorkspace, renameWorkspace } from "../lib/api";
import { extractInviteTokenFromInput } from "../lib/inviteToken";
import {
  getStoredArchivedWorkspaceIds,
  setStoredArchivedWorkspaceIds,
} from "../lib/secureStorage";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";
import AppButton from "../components/Button";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Members">;

function inviteName(invite: WorkspaceInvitePerson) {
  const fullName = [invite.firstName, invite.lastName].filter(Boolean).join(" ").trim();
  return fullName || invite.email;
}

export default function MembersScreen({ route, navigation }: Props) {
  const { workspaceId, workspaceName, isOwner } = route.params;
  const { idToken, user } = useAuth();
  const { colors } = useTheme();
  const { members, invitations, loading, error, sending, removingId, invite, removeMember } =
    useWorkspaceMembers(idToken, workspaceId);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  const [joinInput, setJoinInput] = useState("");
  const [joining, setJoining] = useState(false);

  const [nameDraft, setNameDraft] = useState(workspaceName);
  const [renaming, setRenaming] = useState(false);
  const [deletingWorkspace, setDeletingWorkspace] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const onArchive = async () => {
    setArchiving(true);
    try {
      const current = await getStoredArchivedWorkspaceIds();
      if (!current.includes(workspaceId)) {
        await setStoredArchivedWorkspaceIds([...current, workspaceId]);
      }
      navigation.goBack();
    } finally {
      setArchiving(false);
    }
  };

  const onRename = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      Alert.alert("Eksik bilgi", "Çalışma alanı adı boş olamaz.");
      return;
    }
    setRenaming(true);
    try {
      const updated = await renameWorkspace(idToken, workspaceId, trimmed);
      navigation.setParams({ workspaceName: updated.name });
    } catch {
      Alert.alert("Hata", "Çalışma alanı güncellenemedi.");
    } finally {
      setRenaming(false);
    }
  };

  const onDeleteWorkspace = () => {
    Alert.alert(
      "Çalışma alanını sil",
      `"${workspaceName}" çalışma alanı ve içindeki tüm görevler silinsin mi?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            setDeletingWorkspace(true);
            try {
              await deleteWorkspace(idToken, workspaceId);
              navigation.goBack();
            } catch {
              Alert.alert("Hata", "Çalışma alanı silinemedi.");
              setDeletingWorkspace(false);
            }
          },
        },
      ],
    );
  };

  const onSendInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteStatus("E-posta adresi girin.");
      return;
    }
    try {
      await invite(inviteEmail.trim(), inviteMessage.trim() || undefined);
      setInviteStatus("Davet gönderildi.");
      setInviteEmail("");
      setInviteMessage("");
    } catch {
      setInviteStatus("Davet gönderilemedi.");
    }
  };

  const onRemove = (memberUserId: number, name: string) => {
    Alert.alert("Üyeyi çıkar", `${name} bu çalışma alanından çıkarılsın mı?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkar",
        style: "destructive",
        onPress: () => {
          removeMember(memberUserId).catch(() => {
            Alert.alert("Hata", "Üye çıkarılamadı.");
          });
        },
      },
    ]);
  };

  const onJoin = async () => {
    const token = extractInviteTokenFromInput(joinInput);
    if (!token) {
      Alert.alert("Eksik bilgi", "Davet kodu veya linki girin.");
      return;
    }
    setJoining(true);
    try {
      const result = await acceptInvitation(idToken, token);
      setJoinInput("");
      Alert.alert(
        "Katıldınız",
        result.alreadyAccepted
          ? `"${result.workspace.name}" çalışma alanına zaten üyesiniz.`
          : `"${result.workspace.name}" çalışma alanına katıldınız.`,
      );
    } catch {
      Alert.alert("Hata", "Davet kabul edilemedi. Kod veya link geçersiz olabilir.");
    } finally {
      setJoining(false);
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text },
  ];

  const inputExtraProps = {
    selectionColor: colors.primary,
    cursorColor: colors.primary,
    underlineColorAndroid: "transparent" as const,
    autoCorrect: false,
    spellCheck: false,
    importantForAutofill: "no" as const,
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.workspaceName, { color: colors.text }]}>{workspaceName}</Text>

      <View style={styles.inlineButton}>
        <AppButton
          title="Bu Alanı Arşivle"
          variant="secondary"
          icon={<Archive color={colors.text} size={16} strokeWidth={2} />}
          onPress={onArchive}
          loading={archiving}
          disabled={archiving}
        />
      </View>

      {isOwner ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Çalışma Alanını Yönet
          </Text>
          <TextInput
            style={inputStyle}
            value={nameDraft}
            onChangeText={setNameDraft}
            {...inputExtraProps}
          />
          <View style={styles.manageRow}>
            <View style={styles.inlineButton}>
              <AppButton
                title="Adı Kaydet"
                onPress={onRename}
                loading={renaming}
                disabled={renaming || deletingWorkspace}
              />
            </View>
            <View style={styles.inlineButton}>
              <AppButton
                title="Çalışma Alanını Sil"
                variant="danger"
                icon={<Trash2 color="#fff" size={16} strokeWidth={2} />}
                onPress={onDeleteWorkspace}
                loading={deletingWorkspace}
                disabled={renaming || deletingWorkspace}
              />
            </View>
          </View>
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Davet Gönder</Text>
      <TextInput
        style={inputStyle}
        value={inviteEmail}
        onChangeText={setInviteEmail}
        placeholder="ornek@firma.com"
        placeholderTextColor={colors.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        {...inputExtraProps}
      />
      <TextInput
        style={[inputStyle, styles.multiline]}
        value={inviteMessage}
        onChangeText={setInviteMessage}
        placeholder="Kısa not (opsiyonel)"
        placeholderTextColor={colors.textMuted}
        multiline
        {...inputExtraProps}
      />
      <View style={styles.inlineButton}>
        <AppButton
          title="Davet Gönder"
          icon={<Mail color="#fff" size={16} strokeWidth={2} />}
          onPress={onSendInvite}
          loading={sending}
          disabled={sending}
        />
      </View>
      {inviteStatus ? (
        <Text style={[styles.status, { color: colors.primary }]}>{inviteStatus}</Text>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Davet Kodu ile Katıl</Text>
      <TextInput
        style={inputStyle}
        value={joinInput}
        onChangeText={setJoinInput}
        placeholder="Davet linki veya kodu"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        {...inputExtraProps}
      />
      <View style={styles.inlineButton}>
        <AppButton
          title="Katıl"
          icon={<UserPlus color="#fff" size={16} strokeWidth={2} />}
          onPress={onJoin}
          loading={joining}
          disabled={joining}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Üyeler ve Davetler</Text>
      {loading ? (
        <ActivityIndicator style={styles.spacing} color={colors.primary} />
      ) : error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : (
        <>
          <Text style={[styles.subTitle, { color: colors.textMuted }]}>Bekleyen Davetler</Text>
          {invitations.pending.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>Bekleyen davet yok.</Text>
          ) : (
            invitations.pending.map((item) => (
              <View key={item.id} style={[styles.row, { borderColor: colors.border }]}>
                <Text style={[styles.rowName, { color: colors.text }]}>{inviteName(item)}</Text>
                <Text style={[styles.rowMeta, { color: colors.textMuted }]}>{item.email}</Text>
              </View>
            ))
          )}

          <Text style={[styles.subTitle, { color: colors.textMuted }]}>Üyeler</Text>
          {members.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>Üye yok.</Text>
          ) : (
            members.map((member) => {
              const isSelf = member.email.toLowerCase() === (user?.email ?? "").toLowerCase();
              return (
                <View key={member.id} style={[styles.row, { borderColor: colors.border }]}>
                  <View style={styles.rowContent}>
                    <Text style={[styles.rowName, { color: colors.text }]}>
                      {[member.firstName, member.lastName].filter(Boolean).join(" ") ||
                        member.email}
                    </Text>
                    <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
                      {member.email} · {member.role === "OWNER" ? "Yönetici" : "Üye"}
                    </Text>
                  </View>
                  {isOwner && !isSelf ? (
                    <Pressable
                      onPress={() =>
                        onRemove(
                          member.id,
                          [member.firstName, member.lastName].filter(Boolean).join(" ") ||
                            member.email,
                        )
                      }
                      hitSlop={16}
                      style={styles.removeLink}
                    >
                      <X color={colors.danger} size={14} strokeWidth={2} />
                      <Text style={[styles.removeLinkText, { color: colors.danger }]}>
                        {removingId === member.id ? "..." : "Çıkar"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 48,
  },
  workspaceName: {
    fontSize: 19,
    fontFamily: fonts.displayBold,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fonts.displayBold,
    marginTop: 24,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    marginTop: 16,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.sansRegular,
    marginBottom: 8,
  },
  multiline: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  inlineButton: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  manageRow: {
    flexDirection: "row",
    gap: 12,
  },
  status: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: fonts.sansMedium,
  },
  spacing: {
    marginTop: 16,
  },
  error: {},
  empty: {
    fontSize: 13,
    fontFamily: fonts.sansRegular,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  rowContent: {
    flex: 1,
  },
  rowName: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
  },
  rowMeta: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: fonts.sansRegular,
  },
  removeLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  removeLinkText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
  },
});
