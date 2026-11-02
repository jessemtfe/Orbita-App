// Item salvo/exibido: notícia vinda de um feed RSS ou vídeo (favoritos aceitam os dois)
export interface NewsItem {
  id: string;
  title: string;
  source: string; // Ex: "G1", "Folha" (vídeo: nome do canal)
  link: string;
  publishedAt: string; // Data ISO (RN02). Vazio quando o vídeo não tem data
  interest: string; // Interesse/palavra-chave que originou o item
  kind?: "news" | "video"; // ausente = notícia (compatível com favoritos já salvos)
  imageUrl?: string; // miniatura (vídeo)
  duration?: string; // duração (vídeo)
}
