import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemeToggle } from "../components/theme-toggle";
import { MAX_INTERESTS, useApp, useAppTheme } from "../context/AppContext";

// Lista de interesses padrões do Órbita App
const standardInterests = [
  "Cinema",
  "Séries",
  "Músicas",
  "Jogos",
  "Realities",
  "Esporte",
  "Saúde e bem-estar",
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { ready, interests: savedInterests, saveInterests } = useApp();

  const { scheme, colors } = useAppTheme();

  const [selectedInterests, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState("");

  // Enquanto lê o AsyncStorage, mostra um loading
  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Se o usuário já fez o onboarding antes, vai direto para o feed (RNF04)
  if (savedInterests.length > 0) {
    return <Redirect href="/(tabs)" />;
  }

  // Chips exibidos = padrões + palavras-chave personalizadas já selecionadas
  const extraChips = selectedInterests.filter(
    (i) => !standardInterests.includes(i),
  );
  const allChips = [...standardInterests, ...extraChips];

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelected(selectedInterests.filter((item) => item !== interest));
    } else if (selectedInterests.length >= MAX_INTERESTS) {
      Alert.alert("Limite atingido", `Você pode escolher até ${MAX_INTERESTS} interesses.`);
    } else {
      setSelected([...selectedInterests, interest]);
    }
  };

  const addCustom = () => {
    const name = custom.trim();
    if (name.length < 2) return;
    const exists = [...standardInterests, ...selectedInterests].find(
      (i) => i.toLowerCase() === name.toLowerCase(),
    );
    if (exists) {
      if (!selectedInterests.includes(exists)) toggleInterest(exists);
    } else {
      toggleInterest(name);
    }
    setCustom("");
  };

  const start = () => {
    if (selectedInterests.length === 0) {
      Alert.alert(
        "Atenção",
        "Você precisa selecionar pelo menos 1 assunto de interesse para continuar.",
      );
      return;
    }
    saveInterests(selectedInterests); // salva no AsyncStorage (RNF04 / RN05)
    router.replace("/(tabs)");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ThemeToggle style={styles.themeToggle} />
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Image
          source={
            scheme === "dark"
              ? require("../../assets/images/LogoApp_Dark.png")
              : require("../../assets/images/LogoApp_Light.png")
          }
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: colors.text }]}>Bem-vindo ao Órbita</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Um espaço livre de algoritmos. Selecione pelo menos 1 assunto de seu
          interesse ou digite sua própria palavra-chave:
        </Text>
      </View>

      <View style={styles.interestList}>
        {allChips.map((item) => {
          const isSelected = selectedInterests.includes(item);
          return (
            <TouchableOpacity
              key={item}
              style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: colors.backgroundElement },
                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => toggleInterest(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.textChip, { color: isSelected ? "#FFF" : colors.text }]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.customRow}>
        <TextInput
          value={custom}
          onChangeText={setCustom}
          onSubmitEditing={addCustom}
          placeholder="Ex: Fórmula 1, Inteligência Artificial..."
          placeholderTextColor={colors.textSecondary}
          returnKeyType="done"
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundElement },
          ]}
        />
        <TouchableOpacity
          onPress={addCustom}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.counter, { color: colors.textSecondary }]}>
        {selectedInterests.length}/{MAX_INTERESTS} selecionados
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: selectedInterests.length === 0 ? "#94a3b8" : colors.primary },
        ]}
        onPress={start}
        activeOpacity={0.8}
      >
        <Text style={styles.textButton}>Começar!</Text>
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  themeToggle: { position: "absolute", top: 56, right: 20, zIndex: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flexGrow: 1, padding: 24, justifyContent: "center" },
  header: { marginBottom: 32, alignItems: "center" },
  logo: { width: 90, height: 90, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 16, lineHeight: 22, textAlign: "center", paddingHorizontal: 10 },
  interestList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
    justifyContent: "center",
  },
  chip: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1 },
  textChip: { fontSize: 14, fontWeight: "500" },
  customRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  addBtn: { width: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  addBtnText: { color: "#FFF", fontSize: 24, fontWeight: "bold" },
  counter: { textAlign: "center", fontSize: 12, marginBottom: 24 },
  button: { paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  textButton: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
