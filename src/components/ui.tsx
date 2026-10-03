import type { TicketStatus } from "@/lib/types";

/** Short, readable reference shown to residents and officials, e.g. "ZGŁ-AB12CD". */
export function ticketNumber(id: string): string {
  return `ZGŁ-${id.slice(0, 6).toUpperCase()}`;
}

/** Brand mark: a road-works yellow square with a location pin cut-out. */
export function BrandMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="3" fill="var(--signal)" />
      <path d="M16 6.5c-4.1 0-7.4 3.2-7.4 7.2 0 5.3 7.4 11.8 7.4 11.8s7.4-6.5 7.4-11.8c0-4-3.3-7.2-7.4-7.2z" fill="var(--ink)" />
      <circle cx="16" cy="13.6" r="2.8" fill="var(--signal)" />
    </svg>
  );
}

export function Wordmark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <BrandMark />
      <span className={`display text-xl leading-none ${inverted ? "text-paper" : "text-ink"}`}>QuickReport</span>
    </span>
  );
}

const STATUS_STYLE: Record<TicketStatus, { label: string; className: string }> = {
  OPEN: { label: "Przyjęte", className: "border-ink text-ink" },
  IN_PROGRESS: { label: "W realizacji", className: "border-ink bg-signal text-ink" },
  RESOLVED: { label: "Rozwiązane", className: "border-ok bg-ok text-white" },
};

export function StatusTag({ status }: { status: TicketStatus }) {
  const { label, className } = STATUS_STYLE[status];
  return <span className={`tag ${className}`}>{label}</span>;
}
