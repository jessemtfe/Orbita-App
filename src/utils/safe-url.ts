import * as WebBrowser from "expo-web-browser";

/** Só aceita http/https. Bloqueia javascript:, file:, intent:, esquemas de apps etc. */
export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/** Abre um link externo no navegador interno, depois de validar o esquema. */
export async function openLink(url: string | undefined): Promise<void> {
  if (!isSafeHttpUrl(url)) return;
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch (error) {
    console.warn("Não foi possível abrir o link:", error);
  }
}
