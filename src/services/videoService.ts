import { ContentItem } from "../types/content";
import { isSafeHttpUrl } from "../utils/safe-url";
import { timeAgo } from "../utils/time";
import { fetchFromProxy } from "./apiConfig";
import { sortChronologically } from "./contentService";

/**
 * Vídeos (YouTube) dos interesses do usuário, via proxy local.
 * Lança erro se TODAS as buscas falharem; falhas parciais são ignoradas.
 */
export async function getVideos(interests: string[]): Promise<ContentItem[]> {
  const queries = [...new Set(interests.map((i) => i.trim()).filter(Boolean))];
  if (queries.length === 0) return [];

  const settled = await Promise.allSettled(
    queries.map(async (query) => {
      const results = await fetchFromProxy("/video-search", query);
      return results
        .filter((r) => isSafeHttpUrl(r.link))
        .map(
          (r): ContentItem => ({
            id: r.link,
            title: r.title,
            summary: r.snippet,
            author: r.author,
            createdAt: r.publishedAt ? timeAgo(r.publishedAt) : "Sem data",
            publishedAt: r.publishedAt ?? undefined,
            imageUrl: isSafeHttpUrl(r.thumbnail) ? r.thumbnail : undefined,
            type: "video",
            videoPlatform: "youtube",
            platform: r.platform,
            duration: r.duration,
            interest: query,
            url: r.link,
          }),
        );
    }),
  );

  const ok = settled.filter(
    (s): s is PromiseFulfilledResult<ContentItem[]> => s.status === "fulfilled",
  );
  if (ok.length === 0) {
    const first = settled[0] as PromiseRejectedResult;
    throw first.reason instanceof Error
      ? first.reason
      : new Error("Não foi possível carregar os vídeos.");
  }

  const unique = [...new Map(ok.flatMap((s) => s.value).map((v) => [v.id, v])).values()];
  return sortChronologically(unique);
}
