import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import useAuthSession from "./src/hooks/useAuthSession";
import { AuthProvider } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import TaskListScreen from "./src/screens/TaskListScreen";
import TaskFormScreen from "./src/screens/TaskFormScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import MembersScreen from "./src/screens/MembersScreen";
import type { RootStackParamList } from "./src/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { idToken, user, restoring, error, canSignIn, signIn, signOut } =
    useAuthSession();

  if (restoring) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {idToken ? (
        <AuthProvider value={{ idToken, user, signOut }}>
          <Stack.Navigator>
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
          </Stack.Navigator>
        </AuthProvider>
      ) : (
        <LoginScreen canSignIn={canSignIn} error={error} onSignIn={signIn} />
      )}
      <StatusBar style="auto" />
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
