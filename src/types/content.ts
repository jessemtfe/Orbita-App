export type ContentType = "news" | "social" | "video";
export type VideoPlatform = "youtube" | "tiktok" | "instagram";

export interface ContentItem {
  id: string;
  title: string;
  interest: string; // Ex: "Cinema", "Jogos", "Músicas"
  type: ContentType;
  summary: string;
  author: string;
  /** Texto de data para exibição (fallback quando não há publishedAt). */
  createdAt: string;
  /** Data real em ISO — usada na ordenação cronológica estrita (RN02). */
  publishedAt?: string;
  imageUrl?: string; // URL da imagem associada ao conteúdo (opcional)
  url?: string; // Link original da publicação (sempre http/https)
  videoPlatform?: VideoPlatform;
  duration?: string;
  platform?: string;
}
