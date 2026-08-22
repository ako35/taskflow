import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";
import { getBadgePalette, type BadgeTone } from "../theme/badgeColors";

type BadgeProps = {
  label: string;
  tone: BadgeTone;
  style?: ViewStyle;
};

export default function Badge({ label, tone, style }: BadgeProps) {
  const { mode } = useTheme();
  const palette = getBadgePalette(mode, tone);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.bg, borderColor: palette.border },
        style,
      ]}
    >
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  text: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
