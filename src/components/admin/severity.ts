// Priority scale in Kraków's heraldic colours: beige (low) → yellow (medium) → red (high).
export function severityColor(score: number): string {
  if (score >= 5) return "#e40521";
  if (score >= 3) return "#ffcc00";
  return "#cdb794";
}

/** Text colour that keeps contrast on the severity colour. */
export function severityInk(score: number): string {
  return score >= 5 ? "#ffffff" : "#1b2733";
}

export function severityLabel(score: number): string {
  if (score >= 5) return "Wysoki";
  if (score >= 3) return "Średni";
  return "Niski";
}

export function markerRadius(score: number): number {
  return Math.min(9 + score * 3, 32);
}
