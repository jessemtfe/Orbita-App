// Converte uma data ISO em texto relativo: "Há 2 horas", "Ontem"...
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Agora";
  if (min < 60) return `Há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Há ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Ontem";
  if (d < 30) return `Há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}
