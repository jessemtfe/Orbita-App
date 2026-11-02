import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/theme";
import { ContentItem } from "../types/content";
import { NewsItem } from "../types/news";
import { openLink } from "../utils/safe-url";
import { timeAgo } from "../utils/time";

interface Props {
  item: NewsItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  colors: (typeof Colors)["light"] | (typeof Colors)["dark"];
}

/** Converte o vídeo da aba Vídeos para o formato que os favoritos guardam. */
export function videoToFavorite(v: ContentItem): NewsItem {
  return {
    id: v.id,
    title: v.title,
    source: v.author,
    link: v.url ?? v.id,
    publishedAt: v.publishedAt ?? "",
    interest: v.interest,
    kind: "video",
    imageUrl: v.imageUrl,
    duration: v.duration,
  };
}

export function VideoCard({ item, isFavorite, onToggleFavorite, colors }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => openLink(item.link)}
      accessibilityRole="link"
      accessibilityLabel={`Assistir: ${item.title}`}
      style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
    >
      <View style={styles.thumbnail}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.cardImage} contentFit="cover" transition={150} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="videocam" size={40} color="#CBD5E1" />
          </View>
        )}
        <View style={styles.platformBadge}>
          <Ionicons name="logo-youtube" size={16} color="#FFFFFF" />
        </View>
        <View style={styles.playButton}>
          <Ionicons name="play" size={24} color="#FFFFFF" />
        </View>
        {item.duration ? (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.tagRow}>
          <Text style={[styles.tag, { color: colors.primary }]} numberOfLines={1}>
            {item.interest}
          </Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {item.publishedAt ? timeAgo(item.publishedAt) : "Sem data"}
          </Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
          {item.title}
        </Text>
        <View style={styles.bottomRow}>
          <Text style={[styles.author, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.source}
          </Text>
          <TouchableOpacity
            onPress={onToggleFavorite}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Ionicons
              name={isFavorite ? "star" : "star-outline"}
              size={22}
              color={isFavorite ? "#F59E0B" : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, marginBottom: 16, borderWidth: 1, overflow: "hidden" },
  thumbnail: { position: "relative", width: "100%", height: 190, backgroundColor: "#1E293B" },
  cardImage: { width: "100%", height: "100%" },
  placeholder: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center", backgroundColor: "#334155" },
  platformBadge: { position: "absolute", top: 10, left: 10, backgroundColor: "rgba(0,0,0,0.7)", padding: 6, borderRadius: 20 },
  playButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -22 }, { translateY: -22 }],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.8)",
  },
  durationBadge: { position: "absolute", bottom: 8, right: 8, backgroundColor: "rgba(0,0,0,0.75)", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  durationText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },
  cardContent: { padding: 16 },
  tagRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, gap: 8 },
  tag: { fontSize: 12, fontWeight: "700", flexShrink: 1 },
  time: { fontSize: 12 },
  title: { fontSize: 16, fontWeight: "bold", lineHeight: 22, marginBottom: 6 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  author: { fontSize: 12, fontWeight: "500", flexShrink: 1 },
});
