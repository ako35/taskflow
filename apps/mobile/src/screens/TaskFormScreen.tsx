import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Alert,
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { createTask, deleteTask, updateTask } from "../lib/api";
import { PRIORITIES, STATUSES } from "../constants";
import CommentSection from "../components/CommentSection";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "TaskForm">;

export default function TaskFormScreen({ route, navigation }: Props) {
  const { task, workspaceId } = route.params;
  const { idToken } = useAuth();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState(task?.priority ?? PRIORITIES[2]);
  const [status, setStatus] = useState(task?.status ?? STATUSES[0]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert("Eksik bilgi", "Görev başlığı zorunludur.");
      return;
    }
    setSaving(true);
    try {
      if (task) {
        await updateTask(idToken, task.id, { title, description, priority, status });
      } else {
        await createTask(idToken, { title, description, priority, status, workspaceId });
      }
      navigation.goBack();
    } catch {
      Alert.alert("Hata", "Görev kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!task) return;
    Alert.alert("Görevi sil", `"${task.title}" silinsin mi?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteTask(idToken, task.id);
            navigation.goBack();
          } catch {
            Alert.alert("Hata", "Görev silinemedi.");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Başlık</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Görev başlığı"
      />

      <Text style={styles.label}>Açıklama</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Görev açıklaması (opsiyonel)"
        multiline
      />

      <Text style={styles.label}>Önem</Text>
      <View style={styles.segmentRow}>
        {PRIORITIES.map((option) => (
          <Pressable
            key={option}
            onPress={() => setPriority(option)}
            style={[styles.segment, priority === option && styles.segmentActive]}
          >
            <Text
              style={[
                styles.segmentText,
                priority === option && styles.segmentTextActive,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Durum</Text>
      <View style={styles.segmentRow}>
        {STATUSES.map((option) => (
          <Pressable
            key={option}
            onPress={() => setStatus(option)}
            style={[styles.segment, status === option && styles.segmentActive]}
          >
            <Text
              style={[
                styles.segmentText,
                status === option && styles.segmentTextActive,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.saveButton}>
        <Button
          title={saving ? "Kaydediliyor..." : "Kaydet"}
          onPress={onSave}
          disabled={saving || deleting}
        />
      </View>

      {task ? (
        <View style={styles.deleteButton}>
          <Button
            title={deleting ? "Siliniyor..." : "Görevi Sil"}
            color="#dc2626"
            onPress={onDelete}
            disabled={saving || deleting}
          />
        </View>
      ) : null}

      {task ? <CommentSection taskId={task.id} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 48,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segment: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  segmentActive: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  segmentTextActive: {
    color: "#fff",
  },
  saveButton: {
    marginTop: 28,
  },
  deleteButton: {
    marginTop: 12,
  },
});
