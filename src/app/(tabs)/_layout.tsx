import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Tabs } from "expo-router";
import { ThemeToggle } from "../../components/theme-toggle";
import { useAppTheme } from "../../context/AppContext";

export default function TabLayout() {
  const { scheme, colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.backgroundElement,
          borderTopColor: colors.border,
        },
        sceneStyle: { backgroundColor: colors.background },
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleAlign: "center",
        headerTitle: () => (
          <Image
            source={
              scheme === "dark"
                ? require("../../../assets/images/LogoApp_Dark.png")
                : require("../../../assets/images/LogoApp_Light.png")
            }
            style={{ width: 46, height: 46 }}
            contentFit="contain"
          />
        ),
        // Ícone sol/lua no canto superior direito
        headerRight: () => <ThemeToggle style={{ marginRight: 16 }} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Notícias",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="videos"
        options={{
          title: "Vídeos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="logo-youtube" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favoritos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
