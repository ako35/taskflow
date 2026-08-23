import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
};

export default function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  style,
}: ButtonProps) {
  const { colors, mode } = useTheme();
  const isDisabled = disabled || loading;

  const textColor = variant === "secondary" ? colors.text : "#fff";
  const borderColor =
    variant === "primary"
      ? "rgba(125, 211, 252, 0.26)"
      : variant === "secondary"
        ? colors.border
        : "transparent";
  const shadowColor =
    variant === "primary" ? "#1d4ed8" : variant === "danger" ? colors.danger : "#020617";

  const content = loading ? (
    <ActivityIndicator size="small" color={textColor} />
  ) : (
    <>
      {icon}
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.shadowWrap,
        {
          shadowColor,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
          transform: [{ translateY: pressed && !isDisabled ? -1 : 0 }],
        },
        style,
      ]}
    >
      {variant === "danger" ? (
        <View style={[styles.button, { backgroundColor: colors.danger, borderColor }]}>
          {content}
        </View>
      ) : (
        <LinearGradient
          colors={
            variant === "primary"
              ? ["#5b8cff", "#2d5ff0", "#1d4ed8"]
              : mode === "light"
                ? ["#ffffff", "#f8fbff", "#edf3ff"]
                : ["rgba(25, 35, 55, 0.95)", "rgba(19, 28, 46, 0.95)", "rgba(13, 22, 39, 0.95)"]
          }
          locations={[0, 0.58, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, { borderColor }]}
        >
          {content}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: Platform.OS === "android" ? 6 : 0,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  text: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
  },
});
