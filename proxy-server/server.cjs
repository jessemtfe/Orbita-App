/**
 * Proxy local do Órbita (Social + Vídeos)
 *
 * Por que existe: a chave da SerpApi NUNCA pode ficar dentro do app (qualquer
 * pessoa consegue extrair um bundle). O app chama este servidor e só ele fala
 * com a SerpApi.
 *
 * Rotas:
 *   GET /health                -> { ok: true, serpapi: boolean }
 *   GET /social-search?q=termo -> { results: SocialResult[] }
 *   GET /video-search?q=termo  -> { results: VideoResult[] }
 *
 * Uso:  npm run social-api   (precisa de SERPAPI_KEY no .env)
 */
const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

// ---------------------------------------------------------------- configuração
const PORT = Number(process.env.PORT || process.env.SOCIAL_API_PORT || 3002);
// 0.0.0.0 = acessível pelo celular na mesma rede (Expo Go). Use 127.0.0.1 para fechar.
const HOST = process.env.SOCIAL_API_HOST || "0.0.0.0";
// Só é sobrescrito nos testes (servidor falso da SerpApi).
const SERPAPI_URL =
  process.env.SERPAPI_BASE_URL || "https://serpapi.com/search.json";

const MIN_QUERY = 2;
const MAX_QUERY = 80;
const UPSTREAM_TIMEOUT_MS = 10_000;
const MAX_UPSTREAM_BYTES = 2 * 1024 * 1024;
const CACHE_TTL_MS = 2 * 60 * 1000; // curto: o usuário ainda controla o refresh (RN03)
const CACHE_MAX_ENTRIES = 200;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 60); // requisições por IP...
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // ...por minuto

const SOCIAL_DOMAINS = {
  "instagram.com": "Instagram",
  "tiktok.com": "TikTok",
  "x.com": "Twitter/X",
  "twitter.com": "Twitter/X",
  "facebook.com": "Facebook",
  "linkedin.com": "LinkedIn",
  "reddit.com": "Reddit",
  "bsky.app": "Bluesky",
};
const VIDEO_DOMAINS = { "youtube.com": "YouTube", "youtu.be": "YouTube" };

// ------------------------------------------------------------------- utilitários
function loadEnvValue(name) {
  if (process.env[name]) return process.env[name];
  try {
    const envPath = path.join(__dirname, ".env");
    const line = fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => !l.startsWith("#") && l.startsWith(`${name}=`));
    if (!line) return undefined;
    return line
      .slice(name.length + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2");
  } catch {
    return undefined;
  }
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Limpa o termo vindo do app: remove aspas/barras/controles e limita o tamanho. */
function sanitizeQuery(raw) {
  const q = String(raw || "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (q.length < MIN_QUERY || q.length > MAX_QUERY) return null;
  return q;
}

/** Todas as palavras do termo precisam aparecer no título/snippet. */
function isRelevant(text, query) {
  const haystack = normalizeText(text);
  return normalizeText(query)
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .every((w) => haystack.includes(w));
}

const UNIT_MS = {
  min: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  sem: 7 * 86_400_000,
  w: 7 * 86_400_000,
  mes: 30 * 86_400_000,
  mo: 30 * 86_400_000,
  m: 30 * 86_400_000,
  ano: 365 * 86_400_000,
  y: 365 * 86_400_000,
};

/** "há 3 dias", "3 days ago", "2 semanas atrás", "12 jan. 2026" -> ISO ou null. */
function parseRelativeDate(text, now = Date.now()) {
  if (!text) return null;
  const value = normalizeText(text);
  const match = value.match(
    /(\d+)\s*(minutos?|minutes?|mins?|horas?|hours?|hrs?|h|dias?|days?|d|semanas?|weeks?|w|meses|mes|months?|anos?|years?|y)\b/,
  );
  if (match) {
    const n = Number(match[1]);
    const u = match[2];
    const key = u.startsWith("min")
      ? "min"
      : u.startsWith("h")
        ? "h"
        : u.startsWith("d")
          ? "d"
          : u.startsWith("sem") || u.startsWith("w")
            ? "sem"
            : u.startsWith("mes") || u.startsWith("mo")
              ? "mes"
              : "ano";
    return new Date(now - n * UNIT_MS[key]).toISOString();
  }
  if (/\b(agora|just now|now)\b/.test(value)) return new Date(now).toISOString();
  if (/\b(ontem|yesterday)\b/.test(value))
    return new Date(now - 86_400_000).toISOString();
  const abs = Date.parse(text);
  return Number.isNaN(abs) ? null : new Date(abs).toISOString();
}

/** Devolve a URL se for http(s) e de um dos domínios permitidos; senão null. */
function safeLink(link, domains) {
  try {
    const u = new URL(String(link));
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
    const key = Object.keys(domains).find(
      (d) => host === d || host.endsWith(`.${d}`),
    );
    return key ? { url: u.toString(), platform: domains[key] } : null;
  } catch {
    return null;
  }
}

function pickThumbnail(thumbnail) {
  const value =
    typeof thumbnail === "string"
      ? thumbnail
      : thumbnail && (thumbnail.static || thumbnail.rich);
  return typeof value === "string" && /^https:\/\//i.test(value)
    ? value
    : undefined;
}

// ------------------------------------------------------ cache e limite de requisições
const cache = new Map();
function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}
function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), value });
}

const hits = new Map();
function clientIp(request) {
  const fwd = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || request.socket.remoteAddress || "unknown";
}

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 1000) {
    for (const [key, times] of hits) {
      if (now - times[times.length - 1] > RATE_LIMIT_WINDOW_MS)
        hits.delete(key);
    }
  }
  return recent.length > RATE_LIMIT_MAX;
}

// ------------------------------------------------------------------- SerpApi
function serpApiGet(apiKey, params) {
  const url = new URL(SERPAPI_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("api_key", apiKey);
  const client = url.protocol === "http:" ? http : https;

  return new Promise((resolve, reject) => {
    const req = client.get(url, (upstream) => {
      let size = 0;
      const chunks = [];
      upstream.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_UPSTREAM_BYTES) {
          req.destroy(new Error("Resposta da SerpApi grande demais"));
          return;
        }
        chunks.push(chunk);
      });
      upstream.on("end", () => {
        if (upstream.statusCode !== 200) {
          // não repassa o corpo (pode conter detalhes da conta/chave)
          reject(new Error(`SerpApi respondeu ${upstream.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.setTimeout(UPSTREAM_TIMEOUT_MS, () =>
      req.destroy(new Error("Timeout ao consultar a SerpApi")),
    );
    req.on("error", reject);
  });
}

async function searchSocial(apiKey, query) {
  // 1 única consulta (1 crédito) para todas as redes, em vez de 7 sequenciais.
  const sites = Object.keys(SOCIAL_DOMAINS)
    .map((d) => `site:${d}`)
    .join(" OR ");
  const data = await serpApiGet(apiKey, {
    engine: "google",
    q: `"${query}" (${sites}) -inurl:/profile -inurl:/user -inurl:/people -inurl:/accounts`,
    num: "20",
    hl: "pt-br",
    gl: "br",
  });

  const seen = new Set();
  return (data.organic_results || []).flatMap((item) => {
    const link = safeLink(item.link, SOCIAL_DOMAINS);
    if (!link || seen.has(link.url)) return [];
    if (!isRelevant(`${item.title} ${item.snippet}`, query)) return [];
    seen.add(link.url);
    return [
      {
        title: String(item.title || "Publicação em rede social"),
        snippet: String(item.snippet || ""),
        link: link.url,
        platform: link.platform,
        author: String(item.displayed_link || link.platform),
        publishedAt:
          parseRelativeDate(item.date) ||
          parseRelativeDate(item.displayed_link) ||
          null,
        thumbnail: pickThumbnail(
          item.thumbnail || item.original || item.image_url,
        ),
      },
    ];
  });
}

async function searchVideos(apiKey, query) {
  const data = await serpApiGet(apiKey, {
    engine: "youtube",
    search_query: query,
    hl: "pt",
    gl: "br",
  });

  const seen = new Set();
  return (data.video_results || []).flatMap((item) => {
    const link = safeLink(item.link, VIDEO_DOMAINS);
    if (!link || seen.has(link.url)) return [];
    seen.add(link.url);
    return [
      {
        title: String(item.title || "Vídeo"),
        snippet: String(item.description || ""),
        link: link.url,
        platform: link.platform,
        author: String(
          (item.channel && item.channel.name) || item.channel || "YouTube",
        ),
        publishedAt: parseRelativeDate(item.published_date) || null,
        duration: typeof item.length === "string" ? item.length : undefined,
        thumbnail: pickThumbnail(item.thumbnail),
      },
    ];
  });
}

// ------------------------------------------------------------------- servidor
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function sendJson(request, response, statusCode, body) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  // O app nativo não usa CORS. Só liberamos o Expo Web rodando em localhost.
  const origin = request.headers.origin;
  if (origin && LOCAL_ORIGIN.test(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  response.writeHead(statusCode, headers);
  response.end(JSON.stringify(body));
}

const ROUTES = {
  "/social-search": searchSocial,
  "/video-search": searchVideos,
};

function createServer() {
  return http.createServer((request, response) => {
    if (request.method === "OPTIONS") {
      const origin = request.headers.origin;
      response.writeHead(
        204,
        origin && LOCAL_ORIGIN.test(origin)
          ? {
              "Access-Control-Allow-Origin": origin,
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
              Vary: "Origin",
            }
          : {},
      );
      response.end();
      return;
    }

    const requestUrl = new URL(request.url || "/", "http://localhost");

    if (request.method === "GET" && requestUrl.pathname === "/health") {
      sendJson(request, response, 200, {
        ok: true,
        serpapi: Boolean(loadEnvValue("SERPAPI_KEY")),
      });
      return;
    }

    const handler = ROUTES[requestUrl.pathname];
    if (request.method !== "GET" || !handler) {
      sendJson(request, response, 404, { error: "Rota não encontrada." });
      return;
    }

    if (rateLimited(clientIp(request))) {
      sendJson(request, response, 429, {
        error: "Muitas requisições. Aguarde um minuto.",
      });
      return;
    }

    const query = sanitizeQuery(requestUrl.searchParams.get("q"));
    if (!query) {
      sendJson(request, response, 400, {
        error: `Informe uma palavra-chave de ${MIN_QUERY} a ${MAX_QUERY} caracteres.`,
      });
      return;
    }

    const apiKey = loadEnvValue("SERPAPI_KEY");
    if (!apiKey) {
      sendJson(request, response, 500, {
        error: "SERPAPI_KEY não configurada no servidor (.env).",
      });
      return;
    }

    const cacheKey = `${requestUrl.pathname}:${normalizeText(query)}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      sendJson(request, response, 200, { results: cached, cached: true });
      return;
    }

    handler(apiKey, query)
      .then((results) => {
        cacheSet(cacheKey, results);
        sendJson(request, response, 200, { results });
      })
      .catch((error) => {
        console.error(`Erro em ${requestUrl.pathname}:`, error.message);
        sendJson(request, response, 502, {
          error: "Não foi possível consultar o serviço externo.",
        });
      });
  });
}

module.exports = {
  createServer,
  parseRelativeDate,
  sanitizeQuery,
  isRelevant,
  safeLink,
};

if (require.main === module) {
  createServer().listen(PORT, HOST, () => {
    const scope =
      HOST === "0.0.0.0" ? "toda a rede local" : `apenas ${HOST}`;
    console.log(`Proxy do Órbita na porta ${PORT} (${scope}).`);
    if (!loadEnvValue("SERPAPI_KEY")) {
      console.warn("⚠ SERPAPI_KEY não encontrada. Copie .env.example para .env.");
    }
  });
}
