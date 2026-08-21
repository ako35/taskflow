import { Pressable, StyleSheet, Text, View } from "react-native";

type NotificationBellProps = {
  unreadCount: number;
  onPress: () => void;
};

export default function NotificationBell({ unreadCount, onPress }: NotificationBellProps) {
  return (
    <Pressable onPress={onPress} style={styles.container} hitSlop={8}>
      <Text style={styles.icon}>🔔</Text>
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
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
  icon: {
    fontSize: 20,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
