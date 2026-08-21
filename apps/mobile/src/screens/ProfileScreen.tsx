import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import useProfile from "../hooks/useProfile";

export default function ProfileScreen() {
  const { idToken } = useAuth();
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

  if (loading) {
    return <ActivityIndicator style={styles.spacing} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {profile?.authEmail ? (
        <Text style={styles.hint}>Google hesabı: {profile.authEmail}</Text>
      ) : null}

      <Text style={styles.label}>Ad</Text>
      <TextInput
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Adınız"
      />

      <Text style={styles.label}>Soyad</Text>
      <TextInput
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
        placeholder="Soyadınız"
      />

      <Text style={styles.label}>Telefon</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="05xx xxx xx xx"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>E-posta</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="ornek@firma.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={styles.saveButton}>
        <Button
          title={saving ? "Kaydediliyor..." : "Kaydet"}
          onPress={onSave}
          disabled={saving}
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
  spacing: {
    marginTop: 32,
  },
  error: {
    color: "#dc2626",
    marginBottom: 12,
  },
  hint: {
    color: "#999",
    fontSize: 12,
    marginBottom: 16,
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
  saveButton: {
    marginTop: 28,
  },
});
