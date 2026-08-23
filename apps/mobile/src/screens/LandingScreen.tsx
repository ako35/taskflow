import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Compass } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "../components/Button";
import Badge from "../components/Badge";
import { priorityToBadgeTone, statusToBadgeTone } from "../theme/badgeColors";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";

type LandingScreenProps = {
  onGoToLogin: () => void;
};

const previewTasks = [
  { status: "Yapılacak", title: "Mobil onboarding akışını yayına al", priority: "Acil" },
  { status: "Yapılacak", title: "Satış paneli KPI kartlarını güncelle", priority: "Yüksek" },
  { status: "Tamamlandı", title: "Müşteri geri bildirim etiketlerini temizle", priority: "Orta" },
  { status: "Tamamlandı", title: "Sprint planı ve teslim tarihlerini eşitle", priority: "Düşük" },
];

export default function LandingScreen({ onGoToLogin }: LandingScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 48 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Compass color="#fff" size={18} strokeWidth={2} />
          </View>
          <Text style={[styles.brandText, { color: colors.text }]}>TaskFlow</Text>
        </View>
        <Text
          style={[styles.headerLink, { color: colors.textMuted }]}
          onPress={onGoToLogin}
        >
          Giriş yap
        </Text>
      </View>

      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>YAPAY ZEKA TABANLI</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          Kod Gerektirmeyen İş Yönetim Platformu
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Ekibinizin iş birliği ihtiyaçları için hızlı, esnek ve tamamen özelleştirilebilir bir
          görev yönetim deneyimi.
        </Text>
        <View style={styles.ctaRow}>
          <Button title="Şimdi başlayın" onPress={onGoToLogin} />
          <Button title="TaskFlow'a giriş yap" variant="secondary" onPress={onGoToLogin} />
        </View>
      </View>

      <View
        style={[
          styles.previewCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.previewHeader}>
          <View style={styles.previewHeaderText}>
            <Text style={[styles.previewTitle, { color: colors.text }]}>Görev görünümü</Text>
            <Text style={[styles.previewSubtitle, { color: colors.textMuted }]}>
              Ekibinizin önceliklerini tek ekranda yönetin.
            </Text>
          </View>
          <View style={[styles.previewChip, { borderColor: colors.border }]}>
            <Text style={[styles.previewChipText, { color: colors.textMuted }]}>
              CANLI İŞ AKIŞI
            </Text>
          </View>
        </View>

        {previewTasks.map((task) => (
          <View
            key={task.title}
            style={[styles.previewRow, { borderTopColor: colors.border }]}
          >
            <Badge label={task.status} tone={statusToBadgeTone(task.status)} />
            <Text
              style={[styles.previewRowTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {task.title}
            </Text>
            <Badge label={task.priority} tone={priorityToBadgeTone(task.priority)} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 36,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 17,
    fontFamily: fonts.displayBold,
  },
  headerLink: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  hero: {
    alignItems: "center",
    marginBottom: 36,
  },
  eyebrow: {
    fontSize: 12,
    fontFamily: fonts.sansBold,
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    textAlign: "center",
    fontFamily: fonts.displayBold,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    fontFamily: fonts.sansRegular,
    marginBottom: 26,
  },
  ctaRow: {
    gap: 12,
    width: "100%",
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 4,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  previewHeaderText: {
    flexShrink: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
  },
  previewSubtitle: {
    fontSize: 12,
    fontFamily: fonts.sansRegular,
    marginTop: 2,
  },
  previewChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  previewChipText: {
    fontSize: 11,
    fontFamily: fonts.sansBold,
    letterSpacing: 0.4,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  previewRowTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
  },
});
