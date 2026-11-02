import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { VideoCard, videoToFavorite } from "../../components/video-card";
import { useApp, useAppTheme } from "../../context/AppContext";
import { getVideos } from "../../services/videoService";
import { ContentItem } from "../../types/content";

export default function VideosScreen() {
  const { colors } = useAppTheme();
  const { interests, toggleFavorite, isFavorite } = useApp();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [videos, setVideos] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null); // null = todos

  const interestsKey = interests.join("|");

  const load = useCallback(
    async (isPull = false) => {
      if (interests.length === 0) {
        setLoading(false);
        return;
      }
      if (isPull) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setVideos(await getVideos(interests));
      } catch (e) {
        setVideos([]);
        setError(
          e instanceof Error && e.message
            ? e.message
            : "Não foi possível carregar os vídeos.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interestsKey],
  );

  // Carrega ao abrir a aba e quando os interesses mudam (RN03: nada em segundo plano)
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (activeFilter && !interests.includes(activeFilter))
      setActiveFilter(null);
  }, [interestsKey, activeFilter, interests]);

  const visible = useMemo(
    () =>
      activeFilter ? videos.filter((v) => v.interest === activeFilter) : videos,
    [videos, activeFilter],
  );

  const Chip = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        selected && {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? "#FFF" : colors.text,
          fontSize: 13,
          fontWeight: "500",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ height: 44 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Chip
            label="Todos"
            selected={activeFilter === null}
            onPress={() => setActiveFilter(null)}
          />
          {interests.map((i) => (
            <Chip
              key={i}
              label={i}
              selected={activeFilter === i}
              onPress={() => setActiveFilter(i)}
            />
          ))}
        </ScrollView>
      </View>

      {error ? (
        <View style={styles.center}>
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={colors.textSecondary}
          />
          <Text style={styles.message}>{error}</Text>
          <TouchableOpacity onPress={() => load()} style={styles.retry}>
            <Text style={{ color: "#FFF", fontWeight: "bold" }}>
              Tentar novamente
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.message, { marginTop: 48 }]}>
              Nenhum vídeo encontrado para os seus interesses.
            </Text>
          }
          renderItem={({ item }) => {
            const fav = videoToFavorite(item);
            return (
              <VideoCard
                item={fav}
                colors={colors}
                isFavorite={isFavorite(fav.id)}
                onToggleFavorite={() => toggleFavorite(fav)}
              />
            );
          }}
        />
      )}
    </View>
  );
}

type ThemeColors = ReturnType<typeof useAppTheme>["colors"];

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, paddingTop: 12 },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
      gap: 12,
      backgroundColor: c.background,
    },
    message: { textAlign: "center", fontSize: 14, color: c.textSecondary },
    retry: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginTop: 4,
      backgroundColor: c.primary,
    },
    filterRow: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
    chip: {
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.backgroundElement,
    },
    list: { padding: 16, paddingBottom: 32 },
    card: {
      backgroundColor: c.backgroundElement,
      borderRadius: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    thumbnail: {
      position: "relative",
      width: "100%",
      height: 190,
      backgroundColor: "#1E293B",
    },
    cardImage: { width: "100%", height: "100%" },
    placeholder: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#334155",
    },
    platformBadge: {
      position: "absolute",
      top: 10,
      left: 10,
      backgroundColor: "rgba(0,0,0,0.7)",
      padding: 6,
      borderRadius: 20,
    },
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
    durationBadge: {
      position: "absolute",
      bottom: 8,
      right: 8,
      backgroundColor: "rgba(0,0,0,0.75)",
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
    },
    durationText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },
    cardContent: { padding: 16 },
    tagRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
      gap: 8,
    },
    tag: { fontSize: 12, fontWeight: "700", flexShrink: 1 },
    time: { fontSize: 12 },
    title: {
      fontSize: 16,
      fontWeight: "bold",
      lineHeight: 22,
      marginBottom: 6,
    },
    author: { fontSize: 12, fontWeight: "500" },
  });
