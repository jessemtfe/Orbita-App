import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#1E1B4B", // Texto principal sofisticado (azul-arroxeado escuro)
    background: "#F8F9FA", // Off-white moderno
    backgroundElement: "#FFFFFF", // Cards e chips brancos puros
    backgroundSelected: "#7C3AED", // Nosso Roxo Tecnológico para elementos selecionados
    textSecondary: "#64748B", // Cinza refinado para subtítulos
    primary: "#7C3AED", // Cor primária do app
    border: "#E2E8F0", // Bordas suaves
  },
  dark: {
    text: "#EDE9FE", // Lavanda bem clara
    background: "#15111F", // Roxo quase preto
    backgroundElement: "#1F1A2E", // Cards e chips em roxo escuro suave
    backgroundSelected: "#7C3AED",
    textSecondary: "#A79BC4", // Lilás acinzentado
    primary: "#A78BFA", // Roxo suave com bom contraste no escuro
    border: "#2E2648", // Bordas roxas discretas
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
