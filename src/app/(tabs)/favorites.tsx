import { Ionicons } from "@expo/vector-icons";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { NewsCard } from "../../components/news-card";
import { VideoCard } from "../../components/video-card";
import { useApp, useAppTheme } from "../../context/AppContext";

export default function FavoritesScreen() {
  const { colors } = useAppTheme();
  const { favorites, toggleFavorite } = useApp();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, favorites.length === 0 && { flex: 1 }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="star-outline" size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
              Você ainda não favoritou nada.{"\n"}Toque na estrela de uma notícia ou vídeo para salvar.
            </Text>
          </View>
        }
        renderItem={({ item }) =>
          item.kind === "video" ? (
            <VideoCard item={item} colors={colors} isFavorite onToggleFavorite={() => toggleFavorite(item)} />
          ) : (
            <NewsCard item={item} colors={colors} isFavorite onToggleFavorite={() => toggleFavorite(item)} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
});
