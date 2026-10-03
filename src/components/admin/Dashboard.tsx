"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Flame, Hammer, Loader2, LogOut, RefreshCw, Users } from "lucide-react";
import { CATEGORY_STYLE } from "@/components/categories";
import { CATEGORY_LABELS, LOCATION_SOURCE_LABELS, type Ticket, type TicketStatus } from "@/lib/types";
import { severityColor, severityLabel } from "./severity";

const TicketMap = dynamic(() => import("./TicketMap"), {
  ssr: false,
  loading: () => <div className="flex size-full items-center justify-center text-slate-400">Ładowanie mapy…</div>,
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
    <div className="flex min-h-dvh flex-col bg-slate-100 lg:h-dvh">
      <header className="bg-brand-dark px-4 py-3 text-white sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold sm:text-xl">Panel zgłoszeń miejskich</h1>
            <p className="hidden text-sm text-blue-200 sm:block">
              QuickReport · priorytety wyliczane z liczby zgłoszeń mieszkańców
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="flex items-center gap-1.5 text-xs text-blue-200">
              <RefreshCw className="size-3.5" />
              {updatedAt ? `Odświeżono ${updatedAt.toLocaleTimeString("pl-PL")}` : "Ładowanie…"}
            </p>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
            >
              <LogOut className="size-4" /> Wyloguj
            </button>
          </div>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 p-4 sm:p-6 lg:min-h-0 lg:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
        <section className="h-72 min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm sm:h-[28rem] lg:h-auto">
          <TicketMap tickets={list} selectedId={selectedId} onSelect={setSelectedId} />
        </section>

        <section className="flex min-h-0 min-w-0 flex-col rounded-2xl bg-white shadow-sm">
          <nav className="flex gap-1 p-2" aria-label="Status zgłoszeń">
            {TABS.map((tab) => (
              <button
                key={tab.status}
                onClick={() => switchTab(tab.status)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  status === tab.status ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          {/* Summary of the active tab; replaces the large stat tiles. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-slate-200 px-4 pb-3 text-sm text-slate-600">
            <Stat icon={ClipboardList} label="zgłoszeń" value={list.length} />
            <Stat icon={Users} label="głosów mieszkańców" value={totalReports} />
            <Stat icon={Flame} label="wysoki priorytet" value={highPriority} accent={highPriority > 0} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {tickets === null ? (
              <div className="flex justify-center p-10 text-slate-400">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : list.length === 0 ? (
              <p className="px-6 py-12 text-center text-slate-500">{TABS.find((t) => t.status === status)?.empty}</p>
            ) : (
              <ol className="divide-y divide-slate-100">
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
      </div>
    </div>
  );
}

function Stat(props: { icon: typeof Users; label: string; value: number; accent?: boolean }) {
  const { icon: Icon } = props;
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`size-4 ${props.accent ? "text-red-600" : "text-slate-400"}`} aria-hidden />
      <span className={`font-semibold tabular-nums ${props.accent ? "text-red-600" : "text-slate-900"}`}>{props.value}</span>
      <span>{props.label}</span>
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
  const { icon: Icon, chip } = CATEGORY_STYLE[t.category];
  return (
    <li className={selected ? "bg-blue-50/60" : undefined}>
      <button onClick={props.onSelect} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
        <span className="w-5 shrink-0 text-center text-sm font-semibold text-slate-400">{props.rank}</span>
        {/* eslint-disable-next-line @next/next/no-img-element -- served by /api/images */}
        <img src={t.image_url} alt="" className="size-14 shrink-0 rounded-lg bg-slate-200 object-cover" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-slate-900">{t.title}</span>
          <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${chip}`}>
            <Icon className="size-3" /> {CATEGORY_LABELS[t.category]}
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">Ostatnie zgłoszenie {timeAgo(t.updated_at)}</span>
        </span>
        <span className="flex shrink-0 flex-col items-center">
          <span
            className="flex size-10 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: severityColor(t.severity_score) }}
            title="Liczba zgłoszeń mieszkańców"
          >
            {t.severity_score}
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase text-slate-500">{severityLabel(t.severity_score)}</span>
        </span>
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
    <div className="space-y-4 px-4 pb-5 pl-12">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- served by /api/images
          <img key={`${src}-${i}`} src={src} alt={`Zdjęcie ${i + 1}`} className="h-28 rounded-lg object-cover" />
        ))}
      </div>
      <div>
        <p className="label">Treść zgłoszenia do urzędu</p>
        <p className="mt-1 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
          {t.formal_report}
        </p>
      </div>
      <p className="text-xs text-slate-500">
        GPS {t.gps_lat.toFixed(5)}, {t.gps_lng.toFixed(5)}
        {t.location_source && ` (${LOCATION_SOURCE_LABELS[t.location_source]})`} · geohash{" "}
        <span className="font-mono">{t.geohash}</span> ·
        pierwsze zgłoszenie {new Date(t.created_at).toLocaleString("pl-PL")}
      </p>
      <div className="flex gap-2">
        {t.status !== "IN_PROGRESS" && t.status !== "RESOLVED" && (
          <button
            disabled={busy}
            onClick={() => update("IN_PROGRESS")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Hammer className="size-4" /> Przyjmij do realizacji
          </button>
        )}
        {t.status !== "RESOLVED" && (
          <button
            disabled={busy}
            onClick={() => update("RESOLVED")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <CheckCircle2 className="size-4" /> Oznacz jako rozwiązane
          </button>
        )}
      </div>
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
