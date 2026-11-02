import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { NewsCard } from "../../components/news-card";
import { MAX_INTERESTS, useApp, useAppTheme } from "../../context/AppContext";
import { fetchNews } from "../../services/newsService";
import { NewsItem } from "../../types/news";

export default function NewsScreen() {
  const { colors } = useAppTheme();
  const { interests, addInterest, removeInterest, toggleFavorite, isFavorite } = useApp();

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showFilter, setShowFilter] = useState(true); // RF04
  const [activeFilter, setActiveFilter] = useState<string | null>(null); // null = todos
  const [modalOpen, setModalOpen] = useState(false); // RF02
  const [newInterest, setNewInterest] = useState("");

  // Chave estável: só recarrega quando a lista de interesses realmente muda
  const interestsKey = interests.join("|");

  const load = useCallback(
    async (isPull = false) => {
      if (interests.length === 0) return;
      isPull ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setNews(await fetchNews(interests));
      } catch (e) {
        setError("Não foi possível carregar as notícias. Verifique sua conexão.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interestsKey],
  );

  // Carrega ao abrir o app e quando os interesses mudam (RN03: sem refresh em segundo plano)
  useEffect(() => {
    load();
  }, [load]);

  // Se o filtro ativo foi removido da lista de interesses, volta para "Todos"
  useEffect(() => {
    if (activeFilter && !interests.includes(activeFilter)) setActiveFilter(null);
  }, [interestsKey, activeFilter, interests]);

  const visibleNews = useMemo(
    () => (activeFilter ? news.filter((n) => n.interest === activeFilter) : news),
    [news, activeFilter],
  );

  const handleAdd = () => {
    const err = addInterest(newInterest);
    if (err) Alert.alert("Atenção", err);
    else setNewInterest("");
  };

  const handleRemove = (name: string) => {
    const err = removeInterest(name);
    if (err) Alert.alert("Atenção", err);
  };

  const Chip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.filterChip,
        { borderColor: colors.border, backgroundColor: colors.backgroundElement },
        selected && { backgroundColor: colors.primary, borderColor: colors.primary },
      ]}
    >
      <Text style={{ color: selected ? "#FFF" : colors.text, fontSize: 13, fontWeight: "500" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Barra de ações */}
      <View style={styles.toolbar}>
        <Text style={[styles.heading, { color: colors.text }]}>Sua timeline</Text>
        <View style={styles.toolbarIcons}>
          <TouchableOpacity onPress={() => setShowFilter((v) => !v)} hitSlop={8}>
            <Ionicons
              name={showFilter ? "filter" : "filter-outline"}
              size={24}
              color={showFilter ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalOpen(true)} hitSlop={8}>
            <Ionicons name="options-outline" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtro da timeline (RF04) */}
      {showFilter && (
        <View style={{ height: 44 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <Chip label="Todos" selected={activeFilter === null} onPress={() => setActiveFilter(null)} />
            {interests.map((i) => (
              <Chip key={i} label={i} selected={activeFilter === i} onPress={() => setActiveFilter(i)} />
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.message, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity onPress={() => load()} style={[styles.retry, { backgroundColor: colors.primary }]}>
            <Text style={{ color: "#FFF", fontWeight: "bold" }}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visibleNews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <Text style={[styles.message, { color: colors.textSecondary, marginTop: 48 }]}>
              Nenhuma notícia recente encontrada para esse assunto.
            </Text>
          }
          renderItem={({ item }) => (
            <NewsCard
              item={item}
              colors={colors}
              isFavorite={isFavorite(item.id)}
              onToggleFavorite={() => toggleFavorite(item)}
            />
          )}
        />
      )}

      {/* Gerenciamento de interesses (RF02) */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.heading, { color: colors.text }]}>Meus interesses</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textSecondary, marginBottom: 12, fontSize: 13 }}>
              {interests.length}/{MAX_INTERESTS} · toque no ✕ para remover
            </Text>

            <View style={styles.modalChips}>
              {interests.map((i) => (
                <View
                  key={i}
                  style={[styles.tagChip, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.text, fontSize: 14 }}>{i}</Text>
                  <TouchableOpacity onPress={() => handleRemove(i)} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.addRow}>
              <TextInput
                value={newInterest}
                onChangeText={setNewInterest}
                onSubmitEditing={handleAdd}
                placeholder="Nova palavra-chave..."
                placeholderTextColor={colors.textSecondary}
                returnKeyType="done"
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundElement },
                ]}
              />
              <TouchableOpacity onPress={handleAdd} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="add" size={26} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  toolbarIcons: { flexDirection: "row", gap: 18 },
  heading: { fontSize: 20, fontWeight: "bold" },
  filterRow: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  filterChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 },
  list: { padding: 16, paddingBottom: 32 },
  message: { textAlign: "center", fontSize: 14 },
  retry: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, marginTop: 4 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  addRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  addBtn: { width: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
