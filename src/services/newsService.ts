import { NewsItem } from "../types/news";
import { parseRss } from "./rssParser";

// Interesses padrão têm uma busca mais precisa do que só o nome.
// Qualquer outro interesse (palavra-chave digitada) é buscado como está.
const QUERY_BY_INTEREST: Record<string, string> = {
  Cinema: "cinema filmes",
  Séries: "séries streaming",
  Músicas: "música lançamentos",
  Jogos: "games jogos",
  Realities: "reality show",
  Esporte: "esporte",
  "Saúde e bem-estar": "saúde bem-estar",
};

const ITEMS_PER_INTEREST = 15;
const TIMEOUT_MS = 8000;

function buildUrl(interest: string): string {
  const query = QUERY_BY_INTEREST[interest] ?? interest;
  // "when:7d" = só notícias da última semana
  const q = encodeURIComponent(`${query} when:7d`);
  return `https://news.google.com/rss/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
}

async function fetchInterest(interest: string): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(buildUrl(interest), { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    return parseRss(xml)
      .filter((raw) => raw.title && raw.link)
      .slice(0, ITEMS_PER_INTEREST)
      .map((raw) => {
        // O Google News envia "Título - Fonte"; removemos o sufixo repetido
        const suffix = raw.source ? ` - ${raw.source}` : "";
        const title =
          suffix && raw.title.endsWith(suffix)
            ? raw.title.slice(0, -suffix.length)
            : raw.title;
        const date = new Date(raw.pubDate);
        return {
          id: raw.link,
          title,
          source: raw.source || "Notícias",
          link: raw.link,
          publishedAt: isNaN(date.getTime())
            ? new Date(0).toISOString()
            : date.toISOString(),
          interest,
        };
      });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Busca as notícias de todos os interesses em paralelo, junta tudo,
 * remove duplicadas e ordena da mais nova para a mais antiga (RN02).
 * Lança erro apenas se TODAS as buscas falharem.
 */
export async function fetchNews(interests: string[]): Promise<NewsItem[]> {
  if (interests.length === 0) return [];

  const results = await Promise.allSettled(interests.map(fetchInterest));
  const fulfilled = results.filter(
    (r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled",
  );

  if (fulfilled.length === 0) {
    throw new Error("Não foi possível carregar as notícias.");
  }

  const seen = new Set<string>();
  return fulfilled
    .flatMap((r) => r.value)
    .filter((item) => {
      const key = item.title.toLowerCase();
      if (seen.has(item.id) || seen.has(key)) return false;
      seen.add(item.id);
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
}
