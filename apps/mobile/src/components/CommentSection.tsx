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
import type { TaskComment } from "@taskflow/shared";
import { useAuth } from "../context/AuthContext";
import useTaskComments from "../hooks/useTaskComments";
import { formatDateTime } from "../lib/format";

type CommentSectionProps = {
  taskId: number;
};

function authorName(author: TaskComment["author"]) {
  const full = [author.firstName, author.lastName].filter(Boolean).join(" ").trim();
  return full || author.email;
}

export default function CommentSection({ taskId }: CommentSectionProps) {
  const { user, idToken } = useAuth();
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
    <View style={styles.container}>
      <Text style={styles.title}>Yorumlar</Text>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Bir yorum yaz..."
          multiline
        />
        <Pressable
          style={[styles.sendButton, (!draft.trim() || submitting) && styles.sendButtonDisabled]}
          onPress={onSubmit}
          disabled={!draft.trim() || submitting}
        >
          <Text style={styles.sendButtonText}>{submitting ? "..." : "Gönder"}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.spacing} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : comments.length === 0 ? (
        <Text style={styles.empty}>Henüz yorum yok.</Text>
      ) : (
        comments.map((comment) => (
          <View key={comment.id} style={styles.comment}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentAuthor}>{authorName(comment.author)}</Text>
              <Text style={styles.commentDate}>{formatDateTime(comment.createdAt)}</Text>
            </View>
            <Text style={styles.commentContent}>{comment.content}</Text>
            {comment.author.email === user?.email ? (
              <Pressable onPress={() => onDelete(comment)} hitSlop={8}>
                <Text style={styles.deleteLink}>Sil</Text>
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
    borderTopColor: "#eee",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
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
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  spacing: {
    marginTop: 8,
  },
  error: {
    color: "#dc2626",
  },
  empty: {
    color: "#999",
    fontSize: 13,
  },
  comment: {
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commentAuthor: {
    fontWeight: "600",
    fontSize: 13,
  },
  commentDate: {
    fontSize: 11,
    color: "#999",
  },
  commentContent: {
    fontSize: 14,
    color: "#333",
  },
  deleteLink: {
    marginTop: 6,
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "600",
  },
});
