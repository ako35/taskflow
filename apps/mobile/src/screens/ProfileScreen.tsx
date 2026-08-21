import { useEffect, useState } from "react";
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
import { useAuth } from "../context/AuthContext";
import useProfile from "../hooks/useProfile";
import { useTheme } from "../theme/ThemeContext";

export default function ProfileScreen() {
  const { idToken } = useAuth();
  const { colors, mode, setMode } = useTheme();
  const { profile, loading, error, saving, save } = useProfile(idToken);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
      setEmail(profile.email ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const onSave = async () => {
    if (!firstName.trim() || !email.trim()) {
      Alert.alert("Eksik bilgi", "Ad ve e-posta alanları zorunludur.");
      return;
    }
    try {
      await save({ firstName, lastName, email, phone });
      Alert.alert("Kaydedildi", "Profil bilgileriniz güncellendi.");
    } catch {
      Alert.alert("Hata", "Profil kaydedilemedi.");
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
  ];

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator style={styles.spacing} color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {profile?.authEmail ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Google hesabı: {profile.authEmail}
        </Text>
      ) : null}

      <Text style={[styles.label, { color: colors.textMuted }]}>Görünüm</Text>
      <View style={styles.segmentRow}>
        {(["dark", "light"] as const).map((option) => {
          const active = mode === option;
          return (
            <Pressable
              key={option}
              onPress={() => setMode(option)}
              style={[
                styles.segment,
                { borderColor: colors.border },
                active && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "600", fontSize: 13 }}>
                {option === "dark" ? "Koyu" : "Açık"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.textMuted }]}>Ad</Text>
      <TextInput
        style={inputStyle}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Adınız"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Soyad</Text>
      <TextInput
        style={inputStyle}
        value={lastName}
        onChangeText={setLastName}
        placeholder="Soyadınız"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Telefon</Text>
      <TextInput
        style={inputStyle}
        value={phone}
        onChangeText={setPhone}
        placeholder="05xx xxx xx xx"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>E-posta</Text>
      <TextInput
        style={inputStyle}
        value={email}
        onChangeText={setEmail}
        placeholder="ornek@firma.com"
        placeholderTextColor={colors.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={styles.saveButton}>
        <Button
          title={saving ? "Kaydediliyor..." : "Kaydet"}
          onPress={onSave}
          disabled={saving}
          color={colors.primary}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
  },
  spacing: {
    marginTop: 32,
  },
  error: {
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  saveButton: {
    marginTop: 28,
  },
});
