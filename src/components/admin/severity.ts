// Visual priority scale shared by the map and the list.
export function severityColor(score: number): string {
  if (score >= 5) return "#dc2626";
  if (score >= 3) return "#f97316";
  return "#f59e0b";
}

export function severityLabel(score: number): string {
  if (score >= 5) return "Wysoki";
  if (score >= 3) return "Średni";
  return "Niski";
}

export function markerRadius(score: number): number {
  return Math.min(10 + score * 3, 34);
}
