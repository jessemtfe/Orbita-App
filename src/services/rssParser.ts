// Parser de RSS (XML) leve, sem dependências externas.
// Suficiente para os campos que usamos: title, link, pubDate e source.

function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function getTag(block: string, name: string): string {
  const match = block.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`),
  );
  return match ? decode(match[1]).trim() : "";
}

export interface RawRssItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export function parseRss(xml: string): RawRssItem[] {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return blocks.map((block) => ({
    title: getTag(block, "title"),
    link: getTag(block, "link"),
    pubDate: getTag(block, "pubDate"),
    source: getTag(block, "source"),
  }));
}
