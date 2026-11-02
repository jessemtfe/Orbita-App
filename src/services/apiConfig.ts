import Constants from "expo-constants";
import { Platform } from "react-native";

const PROXY_PORT = 3002;
const REQUEST_TIMEOUT_MS = 10_000;

export class ProxyError extends Error {}

/**
 * Descobre onde está o proxy (scripts/social-api-proxy.cjs).
 * 1) EXPO_PUBLIC_SOCIAL_API_URL, se definida (necessário com túnel do Expo)
 * 2) o mesmo IP do computador que serve o app no Expo Go (LAN)
 * 3) emulador Android -> 10.0.2.2 | iOS/web -> localhost
 */
export function getProxyBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_SOCIAL_API_URL?.trim();
  if (override) return override.replace(/\/+$/, "");

  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host && (host.endsWith(".exp.direct") || host.includes("ngrok"))) {
    throw new ProxyError(
      "Você está usando o túnel do Expo. Defina EXPO_PUBLIC_SOCIAL_API_URL com o IP do computador (ex.: http://192.168.0.10:3002) ou use a rede local.",
    );
  }
  const fallback = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  return `http://${host || fallback}:${PROXY_PORT}`;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface ProxyResult {
  title: string;
  snippet: string;
  link: string;
  platform: string;
  author: string;
  publishedAt: string | null;
  duration?: string;
  thumbnail?: string;
}

/** Chama uma rota do proxy e devolve a lista já normalizada. */
export async function fetchFromProxy(
  route: "/social-search" | "/video-search",
  query: string,
): Promise<ProxyResult[]> {
  const url = `${getProxyBaseUrl()}${route}?q=${encodeURIComponent(query)}`;
  let response: Response;
  try {
    response = await fetchWithTimeout(url);
  } catch {
    throw new ProxyError(
      "Não consegui falar com o servidor do Órbita. Ele está rodando? (npm run social-api)",
    );
  }

  if (response.status === 429) {
    throw new ProxyError("Muitas buscas seguidas. Aguarde um minuto.");
  }
  if (!response.ok) {
    let detail = "";
    try {
      detail = (await response.json())?.error ?? "";
    } catch {
      /* corpo não era JSON */
    }
    throw new ProxyError(detail || `O servidor respondeu ${response.status}.`);
  }

  const data = await response.json();
  return Array.isArray(data?.results) ? data.results : [];
}
