import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Send, Trash2 } from "lucide-react-native";
import type { TaskComment } from "@taskflow/shared";
import { useAuth } from "../context/AuthContext";
import useTaskComments from "../hooks/useTaskComments";
import { formatDateTime } from "../lib/format";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";

type CommentSectionProps = {
  taskId: number;
};

function authorName(author: TaskComment["author"]) {
  const full = [author.firstName, author.lastName].filter(Boolean).join(" ").trim();
  return full || author.email;
}

export default function CommentSection({ taskId }: CommentSectionProps) {
  const { user, idToken } = useAuth();
  const { colors } = useTheme();
  const { comments, loading, error, submitting, addComment, removeComment } =
    useTaskComments(idToken, taskId);
  const [draft, setDraft] = useState("");

  const onSubmit = async () => {
    const content = draft.trim();
    if (!content) return;
    try {
      await addComment(content);
      setDraft("");
    } catch {
      Alert.alert("Hata", "Yorum gönderilemedi.");
    }
  };

  const onDelete = (comment: TaskComment) => {
    Alert.alert("Yorumu sil", "Bu yorum silinsin mi?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => {
          removeComment(comment.id).catch(() => {
            Alert.alert("Hata", "Yorum silinemedi.");
          });
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { borderTopColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Yorumlar</Text>

      <View style={styles.composer}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text },
          ]}
          value={draft}
          onChangeText={setDraft}
          placeholder="Bir yorum yaz..."
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          underlineColorAndroid="transparent"
          autoCorrect={false}
          spellCheck={false}
          importantForAutofill="no"
          multiline
        />
        <Pressable
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary },
            (!draft.trim() || submitting) && styles.sendButtonDisabled,
          ]}
          onPress={onSubmit}
          disabled={!draft.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send color="#fff" size={16} strokeWidth={2} />
          )}
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.spacing} color={colors.primary} />
      ) : error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : comments.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>Henüz yorum yok.</Text>
      ) : (
        comments.map((comment) => (
          <View key={comment.id} style={[styles.comment, { borderColor: colors.border }]}>
            <View style={styles.commentHeader}>
              <Text style={[styles.commentAuthor, { color: colors.text }]}>
                {authorName(comment.author)}
              </Text>
              <Text style={[styles.commentDate, { color: colors.textMuted }]}>
                {formatDateTime(comment.createdAt)}
              </Text>
            </View>
            <Text style={[styles.commentContent, { color: colors.text }]}>{comment.content}</Text>
            {comment.author.email === user?.email ? (
              <Pressable onPress={() => onDelete(comment)} hitSlop={16} style={styles.deleteLink}>
                <Trash2 color={colors.danger} size={13} strokeWidth={2} />
                <Text style={[styles.deleteLinkText, { color: colors.danger }]}>Sil</Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    marginBottom: 12,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: fonts.sansRegular,
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: 10,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  spacing: {
    marginTop: 8,
  },
  error: {},
  empty: {
    fontSize: 13,
  },
  comment: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commentAuthor: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
  },
  commentDate: {
    fontSize: 11,
  },
  commentContent: {
    fontSize: 14,
    fontFamily: fonts.sansRegular,
  },
  deleteLink: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  deleteLinkText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
  },
});
