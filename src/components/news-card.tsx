import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/theme";
import { NewsItem } from "../types/news";
import { openLink } from "../utils/safe-url";
import { timeAgo } from "../utils/time";

interface Props {
  item: NewsItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  colors: (typeof Colors)["light"] | (typeof Colors)["dark"];
}

export function NewsCard({ item, isFavorite, onToggleFavorite, colors }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => openLink(item.link)}
      style={[
        styles.card,
        { backgroundColor: colors.backgroundElement, borderColor: colors.border },
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.tag, { color: colors.primary }]} numberOfLines={1}>
          {item.interest}
        </Text>
        <Text style={[styles.time, { color: colors.textSecondary }]}>
          {timeAgo(item.publishedAt)}
        </Text>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>

      <View style={styles.bottomRow}>
        <Text style={[styles.source, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.source}
        </Text>
        <TouchableOpacity
          onPress={onToggleFavorite}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isFavorite ? "star" : "star-outline"}
            size={22}
            color={isFavorite ? "#F59E0B" : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  topRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, gap: 8 },
  tag: { fontSize: 12, fontWeight: "700", flexShrink: 1 },
  time: { fontSize: 12 },
  title: { fontSize: 16, fontWeight: "bold", lineHeight: 22, marginBottom: 12 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  source: { fontSize: 12, fontWeight: "500", flexShrink: 1 },
});
