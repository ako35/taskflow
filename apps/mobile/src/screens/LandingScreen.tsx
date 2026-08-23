import { Pressable, StyleSheet, Text, View } from "react-native";
import { Compass } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "../components/Button";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";

type LandingScreenProps = {
  onGoToLogin: () => void;
};

export default function LandingScreen({ onGoToLogin }: LandingScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Compass color="#fff" size={18} strokeWidth={2} />
        </View>
        <Text style={[styles.brandText, { color: colors.text }]}>TaskFlow</Text>
      </View>

      <View style={styles.hero}>
        <LinearGradient
          colors={["#5b8cff", "#2d5ff0", "#1d4ed8"]}
          locations={[0, 0.58, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBadge}
        >
          <Compass color="#fff" size={52} strokeWidth={1.75} />
        </LinearGradient>

        <Text style={[styles.eyebrow, { color: colors.primary }]}>YAPAY ZEKA TABANLI</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          Kod Gerektirmeyen İş Yönetim Platformu
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Ekibinizle görevleri hızlı ve esnek şekilde yönetin.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button title="Hemen Başla" onPress={onGoToLogin} />
        <Pressable onPress={onGoToLogin} hitSlop={8} style={styles.secondaryLink}>
          <Text style={styles.secondaryLinkText}>
            <Text style={{ color: colors.textMuted }}>Zaten hesabınız var mı? </Text>
            <Text style={{ color: colors.primary, fontFamily: fonts.sansBold }}>Giriş Yap</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 17,
    fontFamily: fonts.displayBold,
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#1d4ed8",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 6,
  },
  eyebrow: {
    fontSize: 12,
    fontFamily: fonts.sansBold,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
    fontFamily: fonts.displayBold,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    fontFamily: fonts.sansRegular,
    paddingHorizontal: 12,
  },
  actions: {
    gap: 12,
  },
  secondaryLink: {
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryLinkText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
});
