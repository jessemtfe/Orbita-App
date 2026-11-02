import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useAppTheme } from "../context/AppContext";

function Root() {
  const { scheme, colors } = useAppTheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}
