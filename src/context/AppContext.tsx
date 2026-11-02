import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { Colors } from "../constants/theme";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { NewsItem } from "../types/news";

export const MAX_INTERESTS = 10; // RN04
const KEY_INTERESTS = "@orbita/interests";
const KEY_FAVORITES = "@orbita/favorites";
const KEY_THEME = "@orbita/theme";

export type Scheme = "light" | "dark";

interface AppContextValue {
  ready: boolean; // true quando o AsyncStorage já foi lido
  interests: string[];
  favorites: NewsItem[];
  saveInterests: (list: string[]) => void;
  // Retornam uma mensagem de erro (string) ou null se deu certo
  addInterest: (name: string) => string | null;
  removeInterest: (name: string) => string | null;
  toggleFavorite: (item: NewsItem) => void;
  isFavorite: (id: string) => boolean;
  scheme: Scheme;
  colors: (typeof Colors)[Scheme];
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<NewsItem[]>([]);

  // Tema: usa a escolha salva; se nunca escolheu, segue o tema do sistema
  const systemScheme = useColorScheme();
  const [themeChoice, setThemeChoice] = useState<Scheme | null>(null);
  const scheme: Scheme = themeChoice ?? (systemScheme === "dark" ? "dark" : "light");

  // Carrega as preferências salvas ao abrir o app (RNF04 / RN05)
  useEffect(() => {
    (async () => {
      try {
        const [i, f, t] = await Promise.all([
          AsyncStorage.getItem(KEY_INTERESTS),
          AsyncStorage.getItem(KEY_FAVORITES),
          AsyncStorage.getItem(KEY_THEME),
        ]);
        if (t === "light" || t === "dark") setThemeChoice(t);
        if (i) setInterests(JSON.parse(i));
        if (f) setFavorites(JSON.parse(f));
      } catch (e) {
        console.error("Erro ao ler armazenamento local:", e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persistInterests = (list: string[]) => {
    setInterests(list);
    AsyncStorage.setItem(KEY_INTERESTS, JSON.stringify(list)).catch(
      console.error,
    );
  };

  const saveInterests = useCallback((list: string[]) => {
    persistInterests(list.slice(0, MAX_INTERESTS));
  }, []);

  const addInterest = useCallback(
    (raw: string) => {
      const name = raw.trim();
      if (name.length < 2) return "Digite pelo menos 2 caracteres.";
      if (interests.length >= MAX_INTERESTS)
        return `Limite de ${MAX_INTERESTS} interesses atingido.`;
      if (interests.some((i) => i.toLowerCase() === name.toLowerCase()))
        return "Esse interesse já está na sua lista.";
      persistInterests([...interests, name]);
      return null;
    },
    [interests],
  );

  const removeInterest = useCallback(
    (name: string) => {
      if (interests.length <= 1) return "Você precisa manter pelo menos 1 interesse."; // RN01
      persistInterests(interests.filter((i) => i !== name));
      return null;
    },
    [interests],
  );

  const toggleFavorite = useCallback((item: NewsItem) => {
    setFavorites((prev) => {
      const next = prev.some((f) => f.id === item.id)
        ? prev.filter((f) => f.id !== item.id)
        : [item, ...prev];
      AsyncStorage.setItem(KEY_FAVORITES, JSON.stringify(next)).catch(
        console.error,
      );
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.some((f) => f.id === id),
    [favorites],
  );

  const toggleTheme = useCallback(() => {
    const next: Scheme = scheme === "dark" ? "light" : "dark";
    setThemeChoice(next);
    AsyncStorage.setItem(KEY_THEME, next).catch(console.error);
  }, [scheme]);

  const value = useMemo(
    () => ({
      ready,
      interests,
      favorites,
      saveInterests,
      addInterest,
      removeInterest,
      toggleFavorite,
      isFavorite,
      scheme,
      colors: Colors[scheme],
      toggleTheme,
    }),
    [ready, interests, favorites, saveInterests, addInterest, removeInterest, toggleFavorite, isFavorite, scheme, toggleTheme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp precisa estar dentro de <AppProvider>");
  return ctx;
}

// Atalho para quem só precisa do tema
export function useAppTheme() {
  const { scheme, colors, toggleTheme } = useApp();
  return { scheme, colors, toggleTheme };
}
