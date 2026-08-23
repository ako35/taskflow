import { Image, StyleSheet, Text, View } from "react-native";
import type { User } from "@taskflow/shared";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";
import { getUserInitials } from "../lib/format";

type AvatarProps = {
  user: User;
  size?: number;
};

export default function Avatar({ user, size = 34 }: AvatarProps) {
  const { colors } = useTheme();
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.container, dimension, { backgroundColor: colors.primary }]}>
      {user.picture ? (
        <Image source={{ uri: user.picture }} style={dimension} />
      ) : (
        <Text style={[styles.text, { fontSize: size * 0.4 }]}>{getUserInitials(user)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  text: {
    color: "#fff",
    fontFamily: fonts.sansBold,
  },
});
