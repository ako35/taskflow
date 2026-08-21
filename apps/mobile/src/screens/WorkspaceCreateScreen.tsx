import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { createWorkspace } from "../lib/api";
import { useTheme } from "../theme/ThemeContext";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "WorkspaceCreate">;

export default function WorkspaceCreateScreen({ navigation }: Props) {
  const { idToken } = useAuth();
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const onCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Eksik bilgi", "Çalışma alanı adı zorunludur.");
      return;
    }
    setCreating(true);
    try {
      await createWorkspace(idToken, trimmed);
      navigation.goBack();
    } catch {
      Alert.alert("Hata", "Çalışma alanı oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>Alan Adı</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
        ]}
        value={name}
        onChangeText={setName}
        placeholder="ör. Pazarlama"
        placeholderTextColor={colors.textMuted}
        autoFocus
      />
      <View style={styles.button}>
        <Button
          title={creating ? "Oluşturuluyor..." : "Oluştur"}
          onPress={onCreate}
          disabled={creating}
          color={colors.primary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  button: {
    marginTop: 20,
  },
});
