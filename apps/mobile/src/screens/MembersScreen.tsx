import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Alert,
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { WorkspaceInvitePerson } from "@taskflow/shared";
import { useAuth } from "../context/AuthContext";
import useWorkspaceMembers from "../hooks/useWorkspaceMembers";
import { acceptInvitation } from "../lib/api";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Members">;

function inviteName(invite: WorkspaceInvitePerson) {
  const fullName = [invite.firstName, invite.lastName].filter(Boolean).join(" ").trim();
  return fullName || invite.email;
}

function extractInviteToken(input: string) {
  const trimmed = input.trim();
  const marker = "inviteToken=";
  const index = trimmed.indexOf(marker);
  if (index === -1) {
    return trimmed;
  }
  const rest = trimmed.slice(index + marker.length);
  const ampersandIndex = rest.indexOf("&");
  const raw = ampersandIndex === -1 ? rest : rest.slice(0, ampersandIndex);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function MembersScreen({ route }: Props) {
  const { workspaceId, workspaceName, isOwner } = route.params;
  const { idToken, user } = useAuth();
  const { members, invitations, loading, error, sending, removingId, invite, removeMember } =
    useWorkspaceMembers(idToken, workspaceId);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  const [joinInput, setJoinInput] = useState("");
  const [joining, setJoining] = useState(false);

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
    const token = extractInviteToken(joinInput);
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.workspaceName}>{workspaceName}</Text>

      <Text style={styles.sectionTitle}>Davet Gönder</Text>
      <TextInput
        style={styles.input}
        value={inviteEmail}
        onChangeText={setInviteEmail}
        placeholder="ornek@firma.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        value={inviteMessage}
        onChangeText={setInviteMessage}
        placeholder="Kısa not (opsiyonel)"
        multiline
      />
      <View style={styles.inlineButton}>
        <Button
          title={sending ? "Gönderiliyor..." : "Davet Gönder"}
          onPress={onSendInvite}
          disabled={sending}
        />
      </View>
      {inviteStatus ? <Text style={styles.status}>{inviteStatus}</Text> : null}

      <Text style={styles.sectionTitle}>Davet Kodu ile Katıl</Text>
      <TextInput
        style={styles.input}
        value={joinInput}
        onChangeText={setJoinInput}
        placeholder="Davet linki veya kodu"
        autoCapitalize="none"
      />
      <View style={styles.inlineButton}>
        <Button title={joining ? "Katılıyor..." : "Katıl"} onPress={onJoin} disabled={joining} />
      </View>

      <Text style={styles.sectionTitle}>Üyeler ve Davetler</Text>
      {loading ? (
        <ActivityIndicator style={styles.spacing} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <Text style={styles.subTitle}>Bekleyen Davetler</Text>
          {invitations.pending.length === 0 ? (
            <Text style={styles.empty}>Bekleyen davet yok.</Text>
          ) : (
            invitations.pending.map((item) => (
              <View key={item.id} style={styles.row}>
                <Text style={styles.rowName}>{inviteName(item)}</Text>
                <Text style={styles.rowMeta}>{item.email}</Text>
              </View>
            ))
          )}

          <Text style={styles.subTitle}>Üyeler</Text>
          {members.length === 0 ? (
            <Text style={styles.empty}>Üye yok.</Text>
          ) : (
            members.map((member) => {
              const isSelf = member.email.toLowerCase() === (user?.email ?? "").toLowerCase();
              return (
                <View key={member.id} style={styles.row}>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowName}>
                      {[member.firstName, member.lastName].filter(Boolean).join(" ") ||
                        member.email}
                    </Text>
                    <Text style={styles.rowMeta}>
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
                      hitSlop={8}
                    >
                      <Text style={styles.removeLink}>
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
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
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
  status: {
    marginTop: 8,
    fontSize: 13,
    color: "#1d4ed8",
  },
  spacing: {
    marginTop: 16,
  },
  error: {
    color: "#dc2626",
  },
  empty: {
    color: "#999",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  rowContent: {
    flex: 1,
  },
  rowName: {
    fontWeight: "600",
    fontSize: 14,
  },
  rowMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#666",
  },
  removeLink: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "600",
  },
});
