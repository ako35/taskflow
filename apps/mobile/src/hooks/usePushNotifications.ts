import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { registerPushToken } from "../lib/api";

export const ANDROID_CHANNEL_ID = "default";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Sesli + öne çıkan bildirim ve app ikonu rozeti için kanal ayarı.
export async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Genel bildirimler",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    enableVibrate: true,
    vibrationPattern: [0, 250, 250, 250],
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export default function usePushNotifications(idToken: string | null) {
  const registeredForToken = useRef<string | null>(null);

  useEffect(() => {
    if (!idToken) return;
    if (registeredForToken.current === idToken) return;
    registeredForToken.current = idToken;

    (async () => {
      await ensureAndroidNotificationChannel();

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      if (!projectId) return;

      try {
        const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
        await registerPushToken(idToken, pushToken.data);
      } catch (error) {
        console.warn("Push token registration failed", error);
      }
    })();
  }, [idToken]);
}
