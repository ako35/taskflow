import { Button, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

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
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>TaskFlow</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Devam etmek için Google ile giriş yapın
      </Text>
      <View style={styles.spacing}>
        <Button
          title="Google ile Giriş Yap"
          onPress={onSignIn}
          disabled={!canSignIn}
          color={colors.primary}
        />
      </View>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {!canSignIn ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
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
    textAlign: "center",
  },
  spacing: {
    marginTop: 24,
  },
  error: {
    marginTop: 16,
    textAlign: "center",
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    textAlign: "center",
  },
});
