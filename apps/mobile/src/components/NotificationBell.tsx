import { Pressable, StyleSheet, Text, View } from "react-native";
import { Bell } from "lucide-react-native";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";

type NotificationBellProps = {
  unreadCount: number;
  onPress: () => void;
};

export default function NotificationBell({ unreadCount, onPress }: NotificationBellProps) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={styles.container} hitSlop={10}>
      <Bell color={colors.text} size={22} strokeWidth={2} />
      {unreadCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text style={[styles.badgeText, { fontFamily: fonts.sansBold }]}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
  },
});
