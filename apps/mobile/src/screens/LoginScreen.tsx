import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Compass, Eye, EyeOff } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppButton from "../components/Button";
import GoogleIcon from "../components/GoogleIcon";
import { loginWithEmail, registerWithEmail, ApiError } from "../lib/api";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/fonts";

type LoginScreenProps = {
  canSignIn: boolean;
  error: string | null;
  onSignIn: () => void;
  onEmailAuthSuccess: (token: string) => void;
};

type AuthMode = "login" | "register";

export default function LoginScreen({
  canSignIn,
  error,
  onSignIn,
  onEmailAuthSuccess,
}: LoginScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<AuthMode>("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text },
  ];

  const toggleMode = () => {
    setMode((current) => (current === "login" ? "register" : "login"));
    setFormError(null);
  };

  const handleSubmit = async () => {
    setFormError(null);
    setSubmitting(true);

    try {
      const result =
        mode === "register"
          ? await registerWithEmail(email, password, firstName, lastName || undefined)
          : await loginWithEmail(email, password);
      onEmailAuthSuccess(result.token);
    } catch (submitError) {
      setFormError(
        submitError instanceof ApiError
          ? submitError.message
          : "Beklenmedik bir hata oluştu.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Compass color="#fff" size={18} strokeWidth={2} />
        </View>
        <Text style={[styles.brandText, { color: colors.text }]}>TaskFlow</Text>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        {mode === "register" ? "Hesap Oluştur" : "Oturum Aç"}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        TaskFlow uygulamasına devam edin
      </Text>

      <View style={styles.form}>
        {mode === "register" ? (
          <>
            <Text style={[styles.label, { color: colors.textMuted }]}>Ad</Text>
            <TextInput
              style={inputStyle}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Ad"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { color: colors.textMuted }]}>Soyad</Text>
            <TextInput
              style={inputStyle}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Soyad"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
              autoCapitalize="words"
            />
          </>
        ) : null}

        <Text style={[styles.label, { color: colors.textMuted }]}>E-posta adresiniz</Text>
        <TextInput
          style={inputStyle}
          value={email}
          onChangeText={setEmail}
          placeholder="E-posta"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>Parolayı girin</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[inputStyle, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            placeholder="Şifre"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            secureTextEntry={!showPassword}
          />
          <Pressable
            style={styles.passwordToggle}
            onPress={() => setShowPassword((current) => !current)}
            hitSlop={10}
          >
            {showPassword ? (
              <EyeOff color={colors.textMuted} size={18} strokeWidth={2} />
            ) : (
              <Eye color={colors.textMuted} size={18} strokeWidth={2} />
            )}
          </Pressable>
        </View>

        {formError ? (
          <Text style={[styles.error, { color: colors.danger }]}>{formError}</Text>
        ) : null}

        <AppButton
          title={mode === "register" ? "Kayıt ol" : "Oturum aç"}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!email.trim() || !password.trim() || (mode === "register" && !firstName.trim())}
          style={styles.submitButton}
        />

        <Text style={[styles.toggleLink, { color: colors.primary }]} onPress={toggleMode}>
          {mode === "register"
            ? "Zaten hesabınız var mı? Oturum açın"
            : "Hesabınız yok mu? Kayıt olun"}
        </Text>
      </View>

      <View style={styles.separatorRow}>
        <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.separatorText, { color: colors.textMuted }]}>veya</Text>
        <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
      </View>

      <AppButton
        title="Google ile Devam Et"
        variant="secondary"
        onPress={onSignIn}
        disabled={!canSignIn}
        icon={<GoogleIcon size={18} />}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : !canSignIn ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Google girişi şu anda kullanılamıyor.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 32,
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
  title: {
    fontSize: 26,
    fontFamily: fonts.displayBold,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.sansRegular,
    marginBottom: 24,
  },
  form: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: fonts.sansRegular,
  },
  passwordRow: {
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 44,
  },
  passwordToggle: {
    position: "absolute",
    right: 14,
    height: 46,
    justifyContent: "center",
  },
  submitButton: {
    marginTop: 16,
  },
  toggleLink: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
  },
  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 28,
    marginBottom: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    fontSize: 13,
    fontFamily: fonts.sansRegular,
  },
  error: {
    marginTop: 10,
    fontSize: 13,
    textAlign: "center",
    fontFamily: fonts.sansMedium,
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    textAlign: "center",
    fontFamily: fonts.sansRegular,
  },
});
