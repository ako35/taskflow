import { Button, StyleSheet, Text, View } from "react-native";

type LoginScreenProps = {
  canSignIn: boolean;
  error: string | null;
  onSignIn: () => void;
};

export default function LoginScreen({
  canSignIn,
  error,
  onSignIn,
}: LoginScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>TaskFlow</Text>
      <Text style={styles.subtitle}>
        Devam etmek için Google ile giriş yapın
      </Text>
      <View style={styles.spacing}>
        <Button
          title="Google ile Giriş Yap"
          onPress={onSignIn}
          disabled={!canSignIn}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!canSignIn ? (
        <Text style={styles.hint}>
          Google OAuth istemci kimlikleri henüz yapılandırılmadı (app.json{" "}
          {"->"} extra).
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 8,
    color: "#666",
    textAlign: "center",
  },
  spacing: {
    marginTop: 24,
  },
  error: {
    marginTop: 16,
    color: "#dc2626",
    textAlign: "center",
  },
  hint: {
    marginTop: 16,
    color: "#999",
    fontSize: 12,
    textAlign: "center",
  },
});
