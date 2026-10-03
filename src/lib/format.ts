/** Short, readable reference shown to residents and officials, e.g. "ZGŁ-AB12CD". */
export function ticketNumber(id: string): string {
  return `ZGŁ-${id.slice(0, 6).toUpperCase()}`;
}
