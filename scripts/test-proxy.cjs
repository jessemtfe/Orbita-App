/**
 * Testa o proxy sem gastar créditos: sobe uma "SerpApi falsa" local e confere
 * validação, filtros de segurança, cache, CORS e rate limit.
 * Rodar:  npm run test:proxy
 */
const http = require("node:http");
const assert = require("node:assert/strict");

let upstreamCalls = 0;
const fakeSerpApi = http.createServer((req, res) => {
  upstreamCalls++;
  const url = new URL(req.url, "http://x");
  res.setHeader("Content-Type", "application/json");
  if (url.searchParams.get("api_key") !== "chave-de-teste") {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Invalid API key" }));
    return;
  }
  if (url.searchParams.get("engine") === "youtube") {
    res.end(
      JSON.stringify({
        video_results: [
          {
            title: "Review do filme",
            link: "https://www.youtube.com/watch?v=abc123",
            thumbnail: { static: "https://i.ytimg.com/vi/abc123/hq.jpg" },
            channel: { name: "Canal Cine" },
            published_date: "há 3 dias",
            length: "12:34",
            description: "Resenha completa",
          },
          { title: "Duplicado", link: "https://www.youtube.com/watch?v=abc123" },
          { title: "Link malicioso", link: "javascript:alert(1)" },
          { title: "Outro site", link: "https://evil.example/watch?v=1" },
        ],
      }),
    );
    return;
  }
  res.end(
    JSON.stringify({
      organic_results: [
        {
          title: "Cinema brasileiro em alta",
          snippet: "O cinema nacional cresce",
          link: "https://www.instagram.com/p/AAA/",
          displayed_link: "instagram.com › p › AAA · há 2 dias",
          thumbnail: "https://cdn.example/img.jpg",
        },
        {
          title: "Cinema no Reddit",
          snippet: "discussão",
          link: "https://old.reddit.com/r/filmes/comments/1/",
          date: "5 hours ago",
        },
        { title: "Cinema", snippet: "x", link: "https://evil.example/cinema" },
        { title: "Cinema XSS", snippet: "x", link: "javascript:alert(1)" },
        { title: "Futebol hoje", snippet: "nada a ver", link: "https://x.com/a/status/1" },
        { title: "Cinema repetido", snippet: "x", link: "https://www.instagram.com/p/AAA/" },
      ],
    }),
  );
});

function get(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port, path, headers }, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () =>
          resolve({ status: res.statusCode, headers: res.headers, json: body ? JSON.parse(body) : null }),
        );
      })
      .on("error", reject);
  });
}

(async () => {
  await new Promise((r) => fakeSerpApi.listen(0, "127.0.0.1", r));
  process.env.SERPAPI_BASE_URL = `http://127.0.0.1:${fakeSerpApi.address().port}/search.json`;
  delete process.env.SERPAPI_KEY;

  const proxy = require("./social-api-proxy.cjs");
  const server = proxy.createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  let passed = 0;
  const ok = (name) => console.log(`  ✓ ${name}`) || passed++;

  // --- funções puras
  const NOW = Date.parse("2026-10-24T12:00:00Z");
  assert.equal(proxy.parseRelativeDate("há 3 dias", NOW), "2026-10-21T12:00:00.000Z");
  assert.equal(proxy.parseRelativeDate("5 hours ago", NOW), "2026-10-24T07:00:00.000Z");
  assert.equal(proxy.parseRelativeDate("há 2 semanas", NOW), "2026-10-10T12:00:00.000Z");
  assert.equal(proxy.parseRelativeDate("ontem", NOW), "2026-10-23T12:00:00.000Z");
  assert.equal(proxy.parseRelativeDate("5 de mar. de 2026", NOW)?.slice(0, 4) ?? "ok", "ok");
  assert.equal(proxy.parseRelativeDate("texto sem data", NOW), null);
  ok("parseRelativeDate (pt/en/absoluta/inválida)");
  assert.equal(proxy.sanitizeQuery('  cine"ma \\ '), "cine ma");
  assert.equal(proxy.sanitizeQuery("a"), null);
  assert.equal(proxy.sanitizeQuery("x".repeat(81)), null);
  ok("sanitizeQuery remove aspas/barras e limita tamanho");
  assert.equal(proxy.safeLink("javascript:alert(1)", { "a.com": "A" }), null);
  assert.equal(proxy.safeLink("https://sub.a.com/x", { "a.com": "A" }).platform, "A");
  assert.equal(proxy.safeLink("https://nota.com/x", { "a.com": "A" }), null);
  ok("safeLink bloqueia esquema perigoso e domínio fora da lista");

  // --- HTTP
  let r = await get(port, "/health");
  assert.equal(r.status, 200);
  assert.equal(r.json.serpapi, false);
  ok("/health informa que falta a chave");

  r = await get(port, "/social-search?q=cinema");
  assert.equal(r.status, 500);
  assert.match(r.json.error, /SERPAPI_KEY/);
  ok("sem SERPAPI_KEY -> 500 com mensagem clara");

  process.env.SERPAPI_KEY = "chave-de-teste";

  r = await get(port, "/social-search?q=a");
  assert.equal(r.status, 400);
  r = await get(port, "/social-search");
  assert.equal(r.status, 400);
  ok("q ausente/curto demais -> 400");

  r = await get(port, "/outra-rota");
  assert.equal(r.status, 404);
  ok("rota desconhecida -> 404");

  r = await get(port, "/social-search?q=cinema");
  assert.equal(r.status, 200);
  const links = r.json.results.map((x) => x.link);
  assert.deepEqual(links, [
    "https://www.instagram.com/p/AAA/",
    "https://old.reddit.com/r/filmes/comments/1/",
  ]);
  assert.equal(r.json.results[0].platform, "Instagram");
  assert.equal(r.json.results[1].platform, "Reddit");
  assert.ok(r.json.results[0].publishedAt, "data relativa extraída do displayed_link");
  assert.ok(r.json.results[1].publishedAt, "data relativa extraída de item.date");
  ok("social: filtra domínio/esquema/relevância/duplicados e extrai datas");
  assert.ok(!JSON.stringify(r.json).includes("chave-de-teste"));
  ok("a chave nunca aparece na resposta");

  const callsBefore = upstreamCalls;
  r = await get(port, "/social-search?q=Cinema");
  assert.equal(r.json.cached, true);
  assert.equal(upstreamCalls, callsBefore);
  ok("cache evita nova chamada à SerpApi");

  r = await get(port, "/video-search?q=filmes");
  assert.equal(r.status, 200);
  assert.equal(r.json.results.length, 1);
  const v = r.json.results[0];
  assert.equal(v.platform, "YouTube");
  assert.equal(v.author, "Canal Cine");
  assert.equal(v.duration, "12:34");
  assert.equal(v.thumbnail, "https://i.ytimg.com/vi/abc123/hq.jpg");
  assert.ok(v.publishedAt);
  ok("vídeos: normaliza campos e descarta links inválidos/duplicados");

  r = await get(port, "/health", { Origin: "https://site-malicioso.example" });
  assert.equal(r.headers["access-control-allow-origin"], undefined);
  r = await get(port, "/health", { Origin: "http://localhost:8081" });
  assert.equal(r.headers["access-control-allow-origin"], "http://localhost:8081");
  ok("CORS só para localhost");

  process.env.SERPAPI_KEY = "chave-errada";
  r = await get(port, "/social-search?q=termo-novo");
  assert.equal(r.status, 502);
  assert.ok(!JSON.stringify(r.json).includes("chave"));
  ok("erro da SerpApi vira 502 genérico (sem vazar detalhes)");
  process.env.SERPAPI_KEY = "chave-de-teste";

  let last;
  for (let i = 0; i < 40; i++) last = await get(port, "/social-search?q=cinema");
  assert.equal(last.status, 429);
  ok("rate limit -> 429");

  server.close();
  fakeSerpApi.close();
  console.log(`\n${passed} verificações OK`);
})().catch((e) => {
  console.error("\n✗ FALHOU:", e.message);
  process.exit(1);
});
