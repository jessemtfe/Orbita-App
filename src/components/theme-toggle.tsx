import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { useAppTheme } from "../context/AppContext";

// Lua no tema claro (vai para o escuro) / Sol no tema escuro (vai para o claro)
export function ThemeToggle({ style }: { style?: object }) {
  const { scheme, colors, toggleTheme } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={toggleTheme}
      hitSlop={10}
      style={style}
      accessibilityLabel="Alternar tema claro/escuro"
    >
      <Ionicons
        name={scheme === "dark" ? "sunny-outline" : "moon-outline"}
        size={24}
        color={colors.primary}
      />
    </TouchableOpacity>
  );
}
