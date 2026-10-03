// Visual priority scale shared by the map and the list (signage: yellow → orange → red).
export function severityColor(score: number): string {
  if (score >= 5) return "#c8261b";
  if (score >= 3) return "#f07d00";
  return "#ffcc00";
}

/** Text colour that keeps contrast on the severity colour. */
export function severityInk(score: number): string {
  return score >= 5 ? "#ffffff" : "#17181a";
}

export function severityLabel(score: number): string {
  if (score >= 5) return "Wysoki";
  if (score >= 3) return "Średni";
  return "Niski";
}

export function markerRadius(score: number): number {
  return Math.min(9 + score * 3, 32);
}
