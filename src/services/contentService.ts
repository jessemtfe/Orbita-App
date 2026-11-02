import { ContentItem } from "../types/content";
import { timeAgo } from "../utils/time";
import { isSafeHttpUrl } from "../utils/safe-url";
import { fetchFromProxy, fetchWithTimeout } from "./apiConfig";

// api.bsky.app (NÃO public.api.bsky.app, que devolve 403 na busca).
// Busca pública, sem chave, e já em ordem cronológica (sort=latest).
const BLUESKY_SEARCH_URL = "https://api.bsky.app/xrpc/app.bsky.feed.searchPosts";

export interface SocialResult {
  items: ContentItem[];
  /** Mensagens de fontes que falharam, mas sem impedir as demais. */
  warnings: string[];
}

function displayDate(publishedAt?: string | null): string {
  return publishedAt ? timeAgo(publishedAt) : "Sem data";
}

/** Mais recente primeiro (RN02). Itens sem data vão para o fim. */
export function sortChronologically<T extends { publishedAt?: string }>(
  items: T[],
): T[] {
  const ts = (i: T) => (i.publishedAt ? Date.parse(i.publishedAt) || 0 : 0);
  return [...items].sort((a, b) => ts(b) - ts(a));
}

async function searchBluesky(query: string): Promise<ContentItem[]> {
  const params = new URLSearchParams({ q: query, limit: "25", sort: "latest" });
  const response = await fetchWithTimeout(`${BLUESKY_SEARCH_URL}?${params}`);
  if (!response.ok) throw new Error(`Bluesky respondeu ${response.status}`);

  const data = await response.json();
  return (data.posts ?? []).flatMap((post: any): ContentItem[] => {
    const handle: string | undefined = post?.author?.handle;
    const rkey: string | undefined = post?.uri?.split("/").pop();
    if (!handle || !rkey) return [];

    const record = post.record ?? {};
    const text: string = record.text ?? "";
    const publishedAt: string | undefined = Number.isNaN(
      Date.parse(record.createdAt),
    )
      ? undefined
      : new Date(record.createdAt).toISOString();
    const thumb: unknown = post.embed?.images?.[0]?.thumb;

    return [
      {
        id: `bsky:${post.uri}`,
        title: text.split("\n")[0].slice(0, 120) || "Publicação no Bluesky",
        summary: text,
        author: post.author.displayName
          ? `${post.author.displayName} (@${handle})`
          : `@${handle}`,
        createdAt: displayDate(publishedAt),
        publishedAt,
        imageUrl: isSafeHttpUrl(thumb) ? thumb : undefined,
        type: "social",
        interest: query,
        platform: "Bluesky",
        url: `https://bsky.app/profile/${handle}/post/${rkey}`,
      },
    ];
  });
}

async function searchSocialProxy(query: string): Promise<ContentItem[]> {
  const results = await fetchFromProxy("/social-search", query);
  return results
    .filter((r) => isSafeHttpUrl(r.link))
    .map((r) => ({
      id: r.link,
      title: r.title,
      summary: r.snippet,
      author: r.author,
      createdAt: displayDate(r.publishedAt),
      publishedAt: r.publishedAt ?? undefined,
      imageUrl: isSafeHttpUrl(r.thumbnail) ? r.thumbnail : undefined,
      type: "social" as const,
      interest: query,
      platform: r.platform,
      url: r.link,
    }));
}

/**
 * Conteúdo social dos interesses do usuário (RF03), em ordem cronológica
 * estrita (RN02). Nada de "recomendações": só o que o usuário pediu.
 *
 * - Bluesky: direto, grátis, sem chave.
 * - Instagram/TikTok/X/Facebook/LinkedIn/Reddit: via proxy local (SerpApi).
 * Se uma fonte cair, as outras continuam e o motivo vai em `warnings`.
 */
export async function getContentsSocial(
  interests: string[],
): Promise<SocialResult> {
  const queries = [...new Set(interests.map((i) => i.trim()).filter(Boolean))];
  if (queries.length === 0) return { items: [], warnings: [] };

  const jobs = queries.flatMap((q) => [
    { source: "Bluesky", run: () => searchBluesky(q) },
    { source: "Outras redes", run: () => searchSocialProxy(q) },
  ]);
  const settled = await Promise.allSettled(jobs.map((j) => j.run()));

  const items: ContentItem[] = [];
  const failures = new Map<string, string>();
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") items.push(...result.value);
    else if (!failures.has(jobs[index].source))
      failures.set(
        jobs[index].source,
        result.reason instanceof Error ? result.reason.message : "erro",
      );
  });

  const unique = [...new Map(items.map((i) => [i.id, i])).values()];
  const warnings = [...failures].map(([source, msg]) => `${source}: ${msg}`);

  if (unique.length === 0 && failures.size === jobs.length / queries.length) {
    // Todas as fontes falharam: deixa a tela mostrar o erro de verdade.
    throw new Error(warnings.join("\n"));
  }

  return { items: sortChronologically(unique), warnings };
}
