import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Sparkles, Trash2 } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { createTask, deleteTask, refineText, updateTask } from "../lib/api";
import { PRIORITIES, STATUSES } from "../constants";
import { formatReminderInput } from "../lib/format";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";
import AppButton from "../components/Button";
import CommentSection from "../components/CommentSection";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "TaskForm">;

const REMINDER_PRESETS: { label: string; compute: () => Date }[] = [
  {
    label: "1 saat sonra",
    compute: () => new Date(Date.now() + 60 * 60 * 1000),
  },
  {
    label: "Yarın 09:00",
    compute: () => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      date.setHours(9, 0, 0, 0);
      return date;
    },
  },
  {
    label: "1 hafta sonra",
    compute: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
];

function combineDateAndTime(datePart: Date, timePart: Date): Date {
  const combined = new Date(datePart);
  combined.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return combined;
}

export default function TaskFormScreen({ route, navigation }: Props) {
  const { task, workspaceId } = route.params;
  const { idToken } = useAuth();
  const { colors, mode } = useTheme();
  const [title, setTitle] = useState(task?.title ?? "");
  const [priority, setPriority] = useState(task?.priority ?? PRIORITIES[2]);
  const [status, setStatus] = useState(task?.status ?? STATUSES[0]);
  const [reminderDate, setReminderDate] = useState<Date | null>(
    task?.remindAt ? new Date(task.remindAt) : null,
  );
  const [pickerStep, setPickerStep] = useState<"idle" | "date" | "time">("idle");
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aiImproving, setAiImproving] = useState(false);

  const onAiImprove = async () => {
    if (!title.trim()) {
      Alert.alert("Eksik bilgi", "AI iyileştirme için önce metin oluşturun.");
      return;
    }
    setAiImproving(true);
    try {
      const refined = await refineText(idToken, "title", title);
      setTitle(refined);
    } catch {
      Alert.alert("Hata", "AI metin iyileştirme başarısız oldu.");
    } finally {
      setAiImproving(false);
    }
  };

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert("Eksik bilgi", "Görev metni zorunludur.");
      return;
    }

    const remindAt = reminderDate ? reminderDate.toISOString() : null;

    setSaving(true);
    try {
      if (task) {
        await updateTask(idToken, task.id, { title, priority, status, remindAt });
      } else {
        await createTask(idToken, {
          title,
          description: "",
          priority,
          status,
          workspaceId,
          remindAt,
        });
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

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.label, { color: colors.textMuted }]}>Görev Metni</Text>
      <TextInput
        style={[inputStyle, styles.multiline]}
        value={title}
        onChangeText={setTitle}
        placeholder="Görev adını yazın"
        placeholderTextColor={colors.textMuted}
        multiline
      />
      <Pressable
        style={styles.aiLink}
        onPress={onAiImprove}
        disabled={aiImproving}
      >
        <Sparkles color={colors.primary} size={13} strokeWidth={2} />
        <Text style={[styles.aiLinkText, { color: colors.primary }]}>
          {aiImproving ? "AI iyileştiriyor..." : "AI ile metni iyileştir"}
        </Text>
      </Pressable>

      <Text style={[styles.label, { color: colors.textMuted }]}>Önem</Text>
      <View style={styles.segmentRow}>
        {PRIORITIES.map((option) => {
          const active = priority === option;
          return (
            <Pressable
              key={option}
              onPress={() => setPriority(option)}
              style={[
                styles.segment,
                { borderColor: colors.border },
                active && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? "#fff" : colors.text },
                ]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.textMuted }]}>Durum</Text>
      <View style={styles.segmentRow}>
        {STATUSES.map((option) => {
          const active = status === option;
          return (
            <Pressable
              key={option}
              onPress={() => setStatus(option)}
              style={[
                styles.segment,
                { borderColor: colors.border },
                active && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? "#fff" : colors.text },
                ]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.textMuted }]}>Hatırlatıcı</Text>
      <Text style={[styles.reminderValue, { color: colors.text }]}>
        {reminderDate ? formatReminderInput(reminderDate) : "Hatırlatıcı yok"}
      </Text>
      <View style={styles.segmentRow}>
        <Pressable
          style={[styles.segment, { borderColor: colors.border }]}
          onPress={() => {
            setPendingDate(reminderDate ?? new Date());
            setPickerStep("date");
          }}
        >
          <Text style={[styles.segmentText, { color: colors.text }]}>Tarih/Saat Seç</Text>
        </Pressable>
        {REMINDER_PRESETS.map((preset) => (
          <Pressable
            key={preset.label}
            style={[styles.segment, { borderColor: colors.border }]}
            onPress={() => setReminderDate(preset.compute())}
          >
            <Text style={[styles.segmentText, { color: colors.text }]}>{preset.label}</Text>
          </Pressable>
        ))}
        {reminderDate ? (
          <Pressable
            style={[styles.segment, { borderColor: colors.border }]}
            onPress={() => setReminderDate(null)}
          >
            <Text style={[styles.segmentText, { color: colors.text }]}>Temizle</Text>
          </Pressable>
        ) : null}
      </View>

      {pickerStep === "date" ? (
        <DateTimePicker
          value={pendingDate ?? new Date()}
          mode="date"
          themeVariant={mode}
          onChange={(event, selectedDate) => {
            if (event.type === "set" && selectedDate) {
              setPendingDate(selectedDate);
              setPickerStep("time");
            } else {
              setPickerStep("idle");
            }
          }}
        />
      ) : null}

      {pickerStep === "time" ? (
        <DateTimePicker
          value={pendingDate ?? new Date()}
          mode="time"
          themeVariant={mode}
          onChange={(event, selectedTime) => {
            if (event.type === "set" && selectedTime && pendingDate) {
              setReminderDate(combineDateAndTime(pendingDate, selectedTime));
            }
            setPickerStep("idle");
          }}
        />
      ) : null}

      <View style={styles.saveButton}>
        <AppButton
          title="Kaydet"
          onPress={onSave}
          loading={saving}
          disabled={saving || deleting}
        />
      </View>

      {task ? (
        <View style={styles.deleteButton}>
          <AppButton
            title="Görevi Sil"
            variant="danger"
            icon={<Trash2 color="#fff" size={16} strokeWidth={2} />}
            onPress={onDelete}
            loading={deleting}
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
    fontFamily: fonts.sansSemiBold,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: fonts.sansRegular,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  aiLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  aiLinkText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
  },
  reminderValue: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: fonts.sansRegular,
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segment: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
  },
  saveButton: {
    marginTop: 28,
  },
  deleteButton: {
    marginTop: 12,
  },
});
