import * as SecureStore from "expo-secure-store";

const ID_TOKEN_KEY = "taskflow_id_token";

export async function getStoredIdToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ID_TOKEN_KEY);
}

export async function setStoredIdToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ID_TOKEN_KEY, token);
}

export async function clearStoredIdToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ID_TOKEN_KEY);
}
