import { useCallback, useEffect, useState } from "react";
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
import { LogOut, Moon, Sun } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import useProfile from "../hooks/useProfile";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";
import AppButton from "../components/Button";

export default function ProfileScreen() {
  const { idToken, signOut } = useAuth();
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

  const handleSignOutPress = useCallback(() => {
    Alert.alert("Çıkış Yap", "Çıkış yapmak istediğinizden emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış Yap", style: "destructive", onPress: signOut },
    ]);
  }, [signOut]);

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
          const Icon = option === "dark" ? Moon : Sun;
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
              <Icon color={active ? "#fff" : colors.text} size={14} strokeWidth={2} />
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? "#fff" : colors.text },
                ]}
              >
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
        {...inputExtraProps}
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Soyad</Text>
      <TextInput
        style={inputStyle}
        value={lastName}
        onChangeText={setLastName}
        placeholder="Soyadınız"
        placeholderTextColor={colors.textMuted}
        {...inputExtraProps}
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Telefon</Text>
      <TextInput
        style={inputStyle}
        value={phone}
        onChangeText={setPhone}
        placeholder="05xx xxx xx xx"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
        {...inputExtraProps}
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
        {...inputExtraProps}
      />

      <View style={styles.saveButton}>
        <AppButton title="Kaydet" onPress={onSave} loading={saving} disabled={saving} />
      </View>

      <View style={styles.signOutButton}>
        <AppButton
          title="Çıkış Yap"
          variant="danger"
          onPress={handleSignOutPress}
          icon={<LogOut color="#fff" size={16} strokeWidth={2} />}
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
    fontFamily: fonts.sansMedium,
  },
  hint: {
    fontSize: 12,
    marginBottom: 16,
    fontFamily: fonts.sansRegular,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.sansRegular,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  segmentText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
  },
  saveButton: {
    marginTop: 28,
  },
  signOutButton: {
    marginTop: 12,
  },
});
