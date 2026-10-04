import type { TicketStatus } from "@/lib/types";

export { ticketNumber } from "@/lib/format";

/** App mark: a square with a point – a nod to the square Main Square plan behind Kraków's identity. Not the city logo. */
export function BrandMark({ className = "size-8", inverted = false }: { className?: string; inverted?: boolean }) {
  const bg = inverted ? "#ffffff" : "var(--primary)";
  const fg = inverted ? "var(--primary)" : "#ffffff";
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill={bg} />
      <rect x="8.5" y="8.5" width="15" height="15" rx="2" fill="none" stroke={fg} strokeWidth="2.25" />
      <circle cx="16" cy="16" r="2.75" fill={fg} />
    </svg>
  );
}

export function Wordmark({ inverted = false, place = false }: { inverted?: boolean; place?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark inverted={inverted} />
      <span className="flex items-baseline gap-2 leading-none">
        <span className={`font-brand text-[19px] font-medium ${inverted ? "text-white" : "text-ink"}`}>QuickReport</span>
        {place && (
          <span className={`text-sm font-bold ${inverted ? "text-white/70" : "text-primary"}`}>Kraków</span>
        )}
      </span>
    </span>
  );
}

const STATUS_STYLE: Record<TicketStatus, { label: string; className: string }> = {
  OPEN: { label: "Przyjęte", className: "bg-surface text-ink-muted ring-1 ring-inset ring-rule-strong" },
  IN_PROGRESS: { label: "W realizacji", className: "bg-primary-tint text-primary-dark" },
  RESOLVED: { label: "Rozwiązane", className: "bg-ok-tint text-ok" },
  REJECTED: { label: "Odrzucone", className: "bg-sev-high/10 text-sev-high" },
};

export function StatusTag({ status }: { status: TicketStatus }) {
  const { label, className } = STATUS_STYLE[status];
  return <span className={`tag ${className}`}>{label}</span>;
}
