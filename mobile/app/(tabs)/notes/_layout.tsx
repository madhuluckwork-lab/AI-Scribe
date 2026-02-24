import { Stack } from "expo-router";
import { COLORS } from "../../../lib/constants";

export default function NotesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.white,
        },
        headerTitleStyle: {
          fontWeight: "600",
          color: COLORS.text,
        },
        headerShadowVisible: false,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Notes" }} />
      <Stack.Screen name="[id]" options={{ title: "Note" }} />
    </Stack>
  );
}
