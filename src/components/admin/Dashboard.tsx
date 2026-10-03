"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Check, Hammer, Loader2, LogOut } from "lucide-react";
import { CATEGORY_ICONS } from "@/components/categories";
import { StatusTag, ticketNumber, Wordmark } from "@/components/ui";
import { CATEGORY_LABELS, LOCATION_SOURCE_LABELS, type Ticket, type TicketStatus } from "@/lib/types";
import { severityColor, severityInk, severityLabel } from "./severity";

const TicketMap = dynamic(() => import("./TicketMap"), {
  ssr: false,
  loading: () => <div className="flex size-full items-center justify-center text-ink-muted">Ładowanie mapy…</div>,
});

const REFRESH_MS = 10_000;

const TABS: { status: TicketStatus; label: string; empty: string }[] = [
  { status: "OPEN", label: "Otwarte", empty: "Brak otwartych zgłoszeń. Nowe zgłoszenia mieszkańców pojawią się tu automatycznie." },
  { status: "IN_PROGRESS", label: "W realizacji", empty: "Żadne zgłoszenie nie jest teraz w realizacji." },
  { status: "RESOLVED", label: "Rozwiązane", empty: "Nie ma jeszcze rozwiązanych zgłoszeń." },
];

export default function Dashboard() {
  const router = useRouter();
  const [status, setStatus] = useState<TicketStatus>("OPEN");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const toLogin = useCallback(() => router.replace("/admin/login?next=/admin"), [router]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    toLogin();
  }

  const load = useCallback(async () => {
    const res = await fetch(`/api/tickets?status=${status}`, { cache: "no-store" });
    if (res.status === 401) return toLogin();
    if (res.ok) {
      setTickets(await res.json());
      setUpdatedAt(new Date());
    }
  }, [status, toLogin]);

  useEffect(() => {
    // Poll so reports sent from a phone appear live during the demo.
    const initial = setTimeout(load, 0);
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [load]);

  function switchTab(next: TicketStatus) {
    setStatus(next);
    setTickets(null);
    setSelectedId(null);
  }

  async function changeStatus(id: string, next: TicketStatus) {
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.status === 401) return toLogin();
    if (res.ok) {
      setSelectedId(null);
      await load();
    }
  }

  const list = tickets ?? [];
  const totalReports = list.reduce((sum, t) => sum + t.severity_score, 0);
  const highPriority = list.filter((t) => t.severity_score >= 5).length;

  return (
    <div className="flex min-h-dvh flex-col bg-paper lg:h-dvh">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-ink px-4 py-2.5 text-paper sm:px-6">
        <div className="flex items-center gap-4">
          <Wordmark inverted />
          <span className="hidden border-l border-paper/30 pl-4 font-display text-[15px] font-semibold uppercase tracking-[0.08em] text-paper/80 sm:block">
            Panel zgłoszeń miejskich
          </span>
        </div>
        <div className="flex items-center gap-4">
          <p className="font-mono text-xs text-paper/70" aria-live="polite">
            {updatedAt ? `Odświeżono ${updatedAt.toLocaleTimeString("pl-PL")}` : "Ładowanie…"}
          </p>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-[4px] border border-paper/40 px-3 py-1.5 font-display text-sm font-semibold uppercase tracking-[0.04em] hover:bg-paper hover:text-ink"
          >
            <LogOut className="size-4" aria-hidden /> Wyloguj
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-[minmax(380px,460px)_minmax(0,1fr)]">
        <section className="order-2 flex min-h-0 min-w-0 flex-col border-rule lg:order-1 lg:border-r">
          <div className="px-4 pt-4 sm:px-5">
            <h1 className="display text-3xl leading-none">Zgłoszenia</h1>
            <nav className="mt-3 flex border-b-2 border-ink" aria-label="Status zgłoszeń">
              {TABS.map((tab) => (
                <button
                  key={tab.status}
                  onClick={() => switchTab(tab.status)}
                  aria-pressed={status === tab.status}
                  className={`-mb-0.5 flex-1 border-b-4 px-2 pb-2 pt-1 font-display text-[15px] font-semibold uppercase tracking-[0.04em] transition-colors ${
                    status === tab.status ? "border-signal text-ink" : "border-transparent text-ink-muted hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <p className="flex flex-wrap gap-x-4 gap-y-1 py-2.5 text-sm text-ink-muted">
              <span>
                <b className="font-semibold tabular-nums text-ink">{list.length}</b> zgłoszeń
              </span>
              <span>
                <b className="font-semibold tabular-nums text-ink">{totalReports}</b> głosów mieszkańców
              </span>
              <span className={highPriority ? "text-sev-high" : undefined}>
                <b className="font-semibold tabular-nums">{highPriority}</b> wysoki priorytet
              </span>
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto border-t border-rule">
            {tickets === null ? (
              <div className="flex justify-center p-10 text-ink-muted">
                <Loader2 className="size-6 animate-spin" aria-label="Ładowanie" />
              </div>
            ) : list.length === 0 ? (
              <p className="px-5 py-12 text-ink-muted">{TABS.find((t) => t.status === status)?.empty}</p>
            ) : (
              <ol>
                {list.map((t, i) => (
                  <TicketRow
                    key={t.id}
                    rank={i + 1}
                    ticket={t}
                    selected={t.id === selectedId}
                    onSelect={() => setSelectedId(t.id === selectedId ? null : t.id)}
                    onStatus={(next) => changeStatus(t.id, next)}
                  />
                ))}
              </ol>
            )}
          </div>
        </section>

        <section className="order-1 h-64 min-w-0 border-b border-rule sm:h-96 lg:order-2 lg:h-auto lg:border-b-0">
          <TicketMap tickets={list} selectedId={selectedId} onSelect={setSelectedId} />
        </section>
      </div>
    </div>
  );
}

function TicketRow(props: {
  rank: number;
  ticket: Ticket;
  selected: boolean;
  onSelect: () => void;
  onStatus: (s: TicketStatus) => void;
}) {
  const { ticket: t, selected } = props;
  const Icon = CATEGORY_ICONS[t.category];
  return (
    <li className={`border-b border-rule ${selected ? "border-l-4 border-l-ink bg-white" : "border-l-4 border-l-transparent"}`}>
      <button
        onClick={props.onSelect}
        aria-expanded={selected}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white sm:px-5"
      >
        <span
          className="flex size-12 shrink-0 flex-col items-center justify-center rounded-[3px]"
          style={{ backgroundColor: severityColor(t.severity_score), color: severityInk(t.severity_score) }}
          title={`Priorytet: ${severityLabel(t.severity_score)} · zgłoszeń: ${t.severity_score}`}
        >
          <span className="display text-2xl leading-none tabular-nums">{t.severity_score}</span>
          <span className="font-display text-[9px] font-semibold uppercase leading-none tracking-[0.06em]">
            {severityLabel(t.severity_score)}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="ticket-no">
              #{props.rank} · {ticketNumber(t.id)}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[17px] font-medium leading-tight">{t.title}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{CATEGORY_LABELS[t.category]}</span>
            <span className="shrink-0">· {timeAgo(t.updated_at)}</span>
          </span>
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element -- served by /api/images */}
        <img src={t.image_url} alt="" className="hidden size-12 shrink-0 rounded-[3px] bg-rule object-cover sm:block" />
      </button>
      {selected && <TicketDetails ticket={t} onStatus={props.onStatus} />}
    </li>
  );
}

function TicketDetails({ ticket: t, onStatus }: { ticket: Ticket; onStatus: (s: TicketStatus) => void }) {
  const [images, setImages] = useState<string[]>([t.image_url]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/tickets/${t.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.images?.length && setImages(data.images));
  }, [t.id, t.severity_score]);

  async function update(next: TicketStatus) {
    setBusy(true);
    await onStatus(next);
    setBusy(false);
  }

  return (
    <div className="space-y-4 px-4 pb-5 sm:px-5">
      <div className="flex items-center justify-between">
        <StatusTag status={t.status} />
        <span className="text-sm text-ink-muted">Zdjęcia od mieszkańców: {images.length}</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- served by /api/images
          <img key={`${src}-${i}`} src={src} alt={`Zdjęcie ${i + 1}`} className="h-24 shrink-0 rounded-[3px] object-cover" />
        ))}
      </div>
      <div>
        <p className="label">Treść pisma</p>
        <p className="mt-1.5 whitespace-pre-line border-l-4 border-ink bg-paper px-3 py-2 text-[15px] leading-relaxed">
          {t.formal_report}
        </p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs text-ink-muted">
        <dt>GPS</dt>
        <dd>
          {t.gps_lat.toFixed(5)}, {t.gps_lng.toFixed(5)}
          {t.location_source && ` (${LOCATION_SOURCE_LABELS[t.location_source]})`}
        </dd>
        <dt>Geohash</dt>
        <dd>{t.geohash}</dd>
        <dt>Pierwsze</dt>
        <dd>{new Date(t.created_at).toLocaleString("pl-PL")}</dd>
      </dl>
      {t.status !== "RESOLVED" && (
        <div className="flex flex-col gap-2">
          {t.status !== "IN_PROGRESS" && (
            <button disabled={busy} onClick={() => update("IN_PROGRESS")} className="btn-primary py-2.5 text-base">
              <Hammer className="size-4" aria-hidden /> Przyjmij do realizacji
            </button>
          )}
          <button disabled={busy} onClick={() => update("RESOLVED")} className="btn-secondary py-2.5 text-base">
            <Check className="size-4" aria-hidden /> Oznacz jako rozwiązane
          </button>
        </div>
      )}
    </div>
  );
}

const rtf = new Intl.RelativeTimeFormat("pl", { numeric: "auto" });

function timeAgo(iso: string): string {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}
