export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}s ${m}dk`;
  return `${m} dk`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

export function formatScore(points: number, max: number): string {
  return `${points} / ${max} (%${max > 0 ? Math.round((points / max) * 100) : 0})`;
}

export function formatPercentage(value: number): string {
  return `%${Math.round(value)}`;
}
