import { StyleSheet, Text, View } from "react-native";
import { Compass } from "lucide-react-native";
import AppButton from "../components/Button";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";

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
      <View style={[styles.logo, { backgroundColor: colors.primary }]}>
        <Compass color="#fff" size={28} strokeWidth={2} />
      </View>
      <Text style={[styles.title, { color: colors.text, fontFamily: fonts.displayBold }]}>
        TaskFlow
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: fonts.sansRegular }]}>
        Devam etmek için Google ile giriş yapın
      </Text>
      <View style={styles.spacing}>
        <AppButton title="Google ile Giriş Yap" onPress={onSignIn} disabled={!canSignIn} />
      </View>
      {error ? (
        <Text
          style={[styles.error, { color: colors.danger, fontFamily: fonts.sansMedium }]}
        >
          {error}
        </Text>
      ) : null}
      {!canSignIn ? (
        <Text style={[styles.hint, { color: colors.textMuted, fontFamily: fonts.sansRegular }]}>
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
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
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
