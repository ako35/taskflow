import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
  type Theme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import useAuthSession from "./src/hooks/useAuthSession";
import usePushNotifications from "./src/hooks/usePushNotifications";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { useAppFonts, fonts } from "./src/theme/fonts";
import { acceptInvitation, fetchTask } from "./src/lib/api";
import { extractInviteTokenFromUrl } from "./src/lib/inviteToken";
import LoginScreen from "./src/screens/LoginScreen";
import TaskListScreen from "./src/screens/TaskListScreen";
import TaskFormScreen from "./src/screens/TaskFormScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import MembersScreen from "./src/screens/MembersScreen";
import WorkspaceCreateScreen from "./src/screens/WorkspaceCreateScreen";
import ArchivedWorkspacesScreen from "./src/screens/ArchivedWorkspacesScreen";
import type { RootStackParamList } from "./src/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

async function openTaskFromNotification(idToken: string, data: unknown) {
  const record = data as Record<string, unknown> | undefined;
  const taskId = Number(record?.taskId);
  if (!navigationRef.isReady() || !Number.isInteger(taskId)) return;

  try {
    const task = await fetchTask(idToken, taskId);
    navigationRef.navigate("TaskForm", { task, workspaceId: task.workspaceId });
  } catch {
    // Task may have been deleted since the notification was sent; ignore.
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { idToken, user, restoring, error, canSignIn, signIn, signOut } =
    useAuthSession();
  const { mode, colors } = useTheme();
  const fontsLoaded = useAppFonts();
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);

  usePushNotifications(idToken);

  useEffect(() => {
    if (!idToken) return;

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      openTaskFromNotification(idToken, lastResponse.notification.request.content.data);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openTaskFromNotification(idToken, response.notification.request.content.data);
    });
    return () => subscription.remove();
  }, [idToken]);

  useEffect(() => {
    function handleUrl(url: string) {
      const token = extractInviteTokenFromUrl(url);
      if (token) setPendingInviteToken(token);
    }

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const subscription = Linking.addEventListener("url", (event) => handleUrl(event.url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!idToken || !pendingInviteToken) return;
    const token = pendingInviteToken;
    setPendingInviteToken(null);

    acceptInvitation(idToken, token)
      .then((result) => {
        Alert.alert(
          "Katıldınız",
          result.alreadyAccepted
            ? `"${result.workspace.name}" çalışma alanına zaten üyesiniz.`
            : `"${result.workspace.name}" çalışma alanına katıldınız.`,
        );
      })
      .catch(() => {
        Alert.alert(
          "Hata",
          "Davet kabul edilemedi. Link geçersiz veya süresi dolmuş olabilir.",
        );
      });
  }, [idToken, pendingInviteToken]);

  const navigationTheme: Theme = {
    ...(mode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.bg,
      card: colors.bg,
      text: colors.text,
      border: colors.border,
    },
  };

  if (restoring || !fontsLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      {idToken ? (
        <AuthProvider value={{ idToken, user, signOut }}>
          <Stack.Navigator
            screenOptions={{
              headerTitleStyle: { fontFamily: fonts.displayBold },
              headerBackTitleStyle: { fontFamily: fonts.sansMedium },
            }}
          >
            <Stack.Screen
              name="TaskList"
              component={TaskListScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TaskForm"
              component={TaskFormScreen}
              options={({ route }) => ({
                title: route.params.task ? "Görevi Düzenle" : "Yeni Görev",
              })}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ title: "Bildirimler" }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: "Profilim" }}
            />
            <Stack.Screen
              name="Members"
              component={MembersScreen}
              options={({ route }) => ({ title: route.params.workspaceName })}
            />
            <Stack.Screen
              name="WorkspaceCreate"
              component={WorkspaceCreateScreen}
              options={{ title: "Yeni Çalışma Alanı" }}
            />
            <Stack.Screen
              name="ArchivedWorkspaces"
              component={ArchivedWorkspacesScreen}
              options={{ title: "Arşivlenmiş Alanlar" }}
            />
          </Stack.Navigator>
        </AuthProvider>
      ) : (
        <LoginScreen canSignIn={canSignIn} error={error} onSignIn={signIn} />
      )}
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
