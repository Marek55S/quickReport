"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  Check,
  FileText,
  Hammer,
  Loader2,
  LogOut,
  MapPin,
  Maximize2,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  X,
} from "lucide-react";
import { routeCategory } from "@/lib/routing";
import { Lightbox, PhotoButton, type LightboxImage } from "@/components/Lightbox";
import { CATEGORY_ICONS } from "@/components/categories";
import { StatusTag, ticketNumber, Wordmark } from "@/components/ui";
import {
  CATEGORY_LABELS,
  DANGER_LABELS,
  LOCATION_SOURCE_LABELS,
  REJECTION_LABELS,
  REJECTION_NOTE_MAX_LENGTH,
  REJECTION_REASONS,
  REPORTABLE_CATEGORIES,
  type Category,
  type RejectionReason,
  type Ticket,
  type TicketStatus,
} from "@/lib/types";
import { dangerColor, severityColor, severityInk, severityLabel } from "./severity";
import StatsView from "./StatsView";

const TicketMap = dynamic(() => import("./TicketMap"), {
  ssr: false,
  loading: () => <div className="flex size-full items-center justify-center text-ink-muted">Ładowanie mapy…</div>,
});

const REFRESH_MS = 10_000;

const TABS: { status: TicketStatus; label: string; empty: string }[] = [
  { status: "OPEN", label: "Otwarte", empty: "Brak otwartych zgłoszeń. Nowe zgłoszenia mieszkańców pojawią się tu automatycznie." },
  { status: "IN_PROGRESS", label: "W realizacji", empty: "Żadne zgłoszenie nie jest teraz w realizacji." },
  { status: "RESOLVED", label: "Rozwiązane", empty: "Nie ma jeszcze rozwiązanych zgłoszeń." },
  { status: "REJECTED", label: "Odrzucone", empty: "Nie ma odrzuconych zgłoszeń." },
];

export type Rejection = { reason: RejectionReason; note: string };

type Sort = "reports" | "danger" | "newest";
type Filters = { query: string; category: Category | "ALL"; minDanger: number; sort: Sort };
const NO_FILTERS: Filters = { query: "", category: "ALL", minDanger: 1, sort: "reports" };

function applyFilters(list: Ticket[], f: Filters): Ticket[] {
  const q = f.query.trim().toLowerCase();
  return list
    .filter((t) => f.category === "ALL" || t.category === f.category)
    .filter((t) => t.danger_level >= f.minDanger)
    .filter(
      (t) =>
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.address ?? "").toLowerCase().includes(q) ||
        ticketNumber(t.id).toLowerCase().includes(q),
    )
    .sort((a, b) => {
      if (f.sort === "danger") return b.danger_level - a.danger_level || b.severity_score - a.severity_score;
      if (f.sort === "newest") return b.created_at.localeCompare(a.created_at);
      return b.severity_score - a.severity_score || b.danger_level - a.danger_level;
    });
}

export default function Dashboard() {
  const router = useRouter();
  const [view, setView] = useState<"tickets" | "stats">("tickets");
  const [status, setStatus] = useState<TicketStatus>("OPEN");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

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

  async function reject(id: string, rejection: Rejection) {
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED", rejection_reason: rejection.reason, rejection_note: rejection.note }),
    });
    if (res.status === 401) return toLogin();
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Nie udało się odrzucić zgłoszenia");
    setSelectedId(null);
    await load();
  }

  async function resolve(id: string, form: FormData) {
    const res = await fetch(`/api/tickets/${id}/resolution`, { method: "POST", body: form });
    if (res.status === 401) return toLogin();
    if (!res.ok) throw new Error((await res.json()).error ?? "Nie udało się zapisać");
    setSelectedId(null);
    await load();
  }

  const all = useMemo(() => tickets ?? [], [tickets]);
  const list = useMemo(() => applyFilters(all, filters), [all, filters]);
  const filtered = list.length !== all.length;
  const totalReports = list.reduce((sum, t) => sum + t.severity_score, 0);
  const highDanger = list.filter((t) => t.danger_level >= 4).length;

  return (
    <div className="flex min-h-dvh flex-col bg-paper lg:h-dvh">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-rule bg-paper px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Wordmark />
          <nav className="flex gap-1 rounded-lg bg-surface p-1" aria-label="Widok panelu">
            {(
              [
                ["tickets", "Zgłoszenia"],
                ["stats", "Statystyki"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                aria-pressed={view === id}
                className={`rounded-md px-3 py-1.5 text-[15px] font-bold transition-colors ${
                  view === id ? "bg-paper text-primary shadow-sm ring-1 ring-rule" : "text-ink-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden text-sm text-ink-muted sm:block" aria-live="polite">
            {updatedAt ? `Odświeżono ${updatedAt.toLocaleTimeString("pl-PL")}` : "Ładowanie…"}
          </p>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-rule-strong px-3 py-1.5 text-sm font-bold hover:border-primary hover:text-primary"
          >
            <LogOut className="size-4" aria-hidden /> Wyloguj
          </button>
        </div>
      </header>

      {view === "stats" ? (
        <StatsView onUnauthorized={toLogin} />
      ) : (
        <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-[minmax(420px,500px)_minmax(0,1fr)]">
          <section className="order-2 flex min-h-0 min-w-0 flex-col border-rule lg:order-1 lg:border-r">
            <div className="px-4 pt-4 sm:px-5">
              <nav className="flex gap-1 rounded-lg bg-surface p-1" aria-label="Status zgłoszeń">
                {TABS.map((tab) => (
                  <button
                    key={tab.status}
                    onClick={() => switchTab(tab.status)}
                    aria-pressed={status === tab.status}
                    className={`flex-1 rounded-md px-2 py-1.5 text-[15px] font-bold transition-colors ${
                      status === tab.status ? "bg-paper text-primary shadow-sm ring-1 ring-rule" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
              <FilterBar filters={filters} onChange={setFilters} />
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm text-ink-muted">
                <span>
                  <b className="font-bold tabular-nums text-ink">{list.length}</b> zgłoszeń
                  {filtered && <> z {all.length}</>}
                </span>
                <span>
                  <b className="font-bold tabular-nums text-ink">{totalReports}</b> głosów mieszkańców
                </span>
                <span className={highDanger ? "text-sev-high" : undefined}>
                  <b className="font-bold tabular-nums">{highDanger}</b> wysokie zagrożenie (AI)
                </span>
                {filtered && (
                  <button onClick={() => setFilters(NO_FILTERS)} className="link ml-auto text-sm">
                    Wyczyść filtry
                  </button>
                )}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto border-t border-rule">
              {tickets === null ? (
                <div className="flex justify-center p-10 text-ink-muted">
                  <Loader2 className="size-6 animate-spin" aria-label="Ładowanie" />
                </div>
              ) : list.length === 0 ? (
                <p className="px-5 py-12 text-ink-muted">
                  {filtered ? "Żadne zgłoszenie nie pasuje do filtrów." : TABS.find((t) => t.status === status)?.empty}
                </p>
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
                      onResolve={(form) => resolve(t.id, form)}
                      onReject={(rejection) => reject(t.id, rejection)}
                      onChanged={load}
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
      )}
    </div>
  );
}

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });
  const select = "w-full rounded-lg border border-rule-strong bg-paper px-2 py-2 text-sm font-bold text-ink";
  return (
    <div className="mt-3 space-y-2">
      <label className="relative block">
        <span className="sr-only">Szukaj</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => set("query", e.target.value)}
          placeholder="Szukaj: tytuł, adres lub numer zgłoszenia"
          className="input py-2 pl-9 text-sm"
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label>
          <span className="sr-only">Kategoria</span>
          <select value={filters.category} onChange={(e) => set("category", e.target.value as Filters["category"])} className={select}>
            <option value="ALL">Wszystkie kategorie</option>
            {REPORTABLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Zagrożenie wg AI</span>
          <select value={filters.minDanger} onChange={(e) => set("minDanger", Number(e.target.value))} className={select}>
            <option value={1}>Każde zagrożenie</option>
            <option value={3}>Zagrożenie ≥ 3</option>
            <option value={4}>Zagrożenie ≥ 4</option>
            <option value={5}>Tylko krytyczne</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sortowanie</span>
          <select value={filters.sort} onChange={(e) => set("sort", e.target.value as Sort)} className={select}>
            <option value="reports">Najwięcej zgłoszeń</option>
            <option value="danger">Największe zagrożenie</option>
            <option value="newest">Najnowsze</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function DangerBadge({ level, compact = false }: { level: number; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-muted" title={`Zagrożenie wg AI: ${level}/5`}>
      <ShieldAlert className="size-3.5" aria-hidden />
      {!compact && "Zagrożenie"}
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="h-2 w-1.5 rounded-[1px]" style={{ backgroundColor: i <= level ? dangerColor(level) : "var(--rule)" }} />
        ))}
      </span>
      <span className="tabular-nums text-ink">{level}/5</span>
    </span>
  );
}

type TicketActionsProps = {
  onStatus: (s: TicketStatus) => void;
  onResolve: (form: FormData) => Promise<void>;
  onReject: (rejection: Rejection) => Promise<void>;
  onChanged: () => Promise<void> | void;
};

function TicketRow(props: TicketActionsProps & {
  rank: number;
  ticket: Ticket;
  selected: boolean;
  onSelect: () => void;
}) {
  const { ticket: t, selected } = props;
  const Icon = CATEGORY_ICONS[t.category];
  return (
    <li className={`border-b border-rule ${selected ? "bg-primary-tint/40 shadow-[inset_3px_0_0_var(--primary)]" : ""}`}>
      <button
        onClick={props.onSelect}
        aria-expanded={selected}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface sm:px-5"
      >
        <span
          className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg"
          style={{ backgroundColor: severityColor(t.severity_score), color: severityInk(t.severity_score) }}
          title={`Zgłoszeń mieszkańców: ${t.severity_score} (${severityLabel(t.severity_score).toLowerCase()} priorytet)`}
        >
          <span className="display text-2xl leading-none tabular-nums" style={{ color: "inherit" }}>
            {t.severity_score}
          </span>
          <span className="text-[10px] font-bold leading-none">zgł.</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="ticket-no">
              #{props.rank} · {ticketNumber(t.id)}
            </span>
            <DangerBadge level={t.danger_level} compact />
          </span>
          <span className="mt-0.5 block truncate text-[17px] font-bold leading-tight">{t.title}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{t.address ?? CATEGORY_LABELS[t.category]}</span>
            <span className="shrink-0">· {timeAgo(t.updated_at)}</span>
            {t.dispatch && <Send className="size-3.5 shrink-0 text-primary" aria-label="Pismo wysłane" />}
          </span>
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element -- served by /api/images */}
        <img src={t.image_url} alt="" className="hidden size-12 shrink-0 rounded-lg bg-rule object-cover sm:block" />
      </button>
      {selected && <TicketDetails ticket={t} {...actionProps(props)} />}
    </li>
  );
}

function useTicketImages(t: Ticket) {
  const [images, setImages] = useState<string[]>([t.image_url]);
  useEffect(() => {
    fetch(`/api/tickets/${t.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.images?.length && setImages(data.images));
  }, [t.id, t.severity_score]);
  return images;
}

/** All photos of a ticket for the viewer: residents' photos first, then the after-repair photo. */
function viewerImages(t: Ticket, images: string[]): LightboxImage[] {
  const list = images.map((src, i) => ({ src, alt: `${t.title} – zdjęcie ${i + 1}`, caption: `Zdjęcie mieszkańca ${i + 1}` }));
  if (t.resolution_image_url) list.push({ src: t.resolution_image_url, alt: `${t.title} – po naprawie`, caption: "Po naprawie" });
  return list;
}

function TicketDetails(props: TicketActionsProps & { ticket: Ticket }) {
  const { ticket: t } = props;
  const images = useTicketImages(t);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="px-4 pb-5 sm:px-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <StatusTag status={t.status} />
        <button onClick={() => setExpanded(true)} className="link flex items-center gap-1.5 text-sm">
          <Maximize2 className="size-4" aria-hidden /> Otwórz w dużym oknie
        </button>
      </div>
      <TicketContent ticket={t} images={images} wide={false} {...actionProps(props)} />
      {expanded && <TicketModal ticket={t} images={images} onClose={() => setExpanded(false)} {...actionProps(props)} />}
    </div>
  );
}

/** Large view of one ticket: big photos and map next to the letter, details, and actions. */
function actionProps(p: TicketActionsProps): TicketActionsProps {
  return { onStatus: p.onStatus, onResolve: p.onResolve, onReject: p.onReject, onChanged: p.onChanged };
}

function TicketModal(props: TicketActionsProps & { ticket: Ticket; images: string[]; onClose: () => void }) {
  const { ticket: t } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      onClose={(e) => e.target === e.currentTarget && props.onClose()}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      aria-labelledby={`ticket-${t.id}-title`}
      className="m-auto max-h-[92dvh] w-[min(72rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-2xl bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/60"
    >
      <div className="flex max-h-[92dvh] flex-col">
        <header className="flex items-start gap-4 border-b border-rule px-5 py-4 sm:px-6">
          <span
            className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg"
            style={{ backgroundColor: severityColor(t.severity_score), color: severityInk(t.severity_score) }}
          >
            <span className="display text-2xl leading-none tabular-nums" style={{ color: "inherit" }}>
              {t.severity_score}
            </span>
            <span className="text-[10px] font-bold leading-none">zgł.</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="ticket-no">{ticketNumber(t.id)}</span>
              <StatusTag status={t.status} />
              <DangerBadge level={t.danger_level} />
            </p>
            <h2 id={`ticket-${t.id}-title`} className="mt-1 text-2xl font-black leading-tight">
              {t.title}
            </h2>
            <p className="text-sm text-ink-muted">
              {CATEGORY_LABELS[t.category]}
              {t.address && <> · ok. {t.address}</>}
            </p>
          </div>
          <button onClick={() => dialog.current?.close()} aria-label="Zamknij" className="rounded-lg p-2 hover:bg-surface">
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <TicketContent ticket={t} images={props.images} wide {...actionProps(props)} />
        </div>
      </div>
    </dialog>
  );
}

function TicketContent(props: TicketActionsProps & { ticket: Ticket; images: string[]; wide: boolean }) {
  const { ticket: t, images, wide } = props;
  const [viewer, setViewer] = useState<number | null>(null);
  const all = viewerImages(t, images);
  const afterIndex = images.length;

  const photos = wide ? (
    <div className="space-y-2">
      <PhotoButton
        src={all[0].src}
        alt={all[0].alt}
        onOpen={() => setViewer(0)}
        className="aspect-[4/3] w-full rounded-lg bg-rule object-cover"
      />
      {all.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {all.slice(1).map((img, i) => (
            <PhotoButton key={`${img.src}-${i}`} src={img.src} alt={img.alt} onOpen={() => setViewer(i + 1)} className="aspect-square w-full rounded-lg bg-rule object-cover" />
          ))}
        </div>
      )}
    </div>
  ) : (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {images.map((src, i) => (
        <PhotoButton key={`${src}-${i}`} src={src} alt={all[i].alt} onOpen={() => setViewer(i)} className="h-24 rounded-lg object-cover" />
      ))}
    </div>
  );

  const after = t.resolution_image_url && (
    <div>
      <p className="label">Po naprawie</p>
      <div className="mt-1.5">
        <PhotoButton src={t.resolution_image_url} alt={all[afterIndex].alt} onOpen={() => setViewer(afterIndex)} className="h-32 rounded-lg object-cover" />
      </div>
      {t.resolved_note && <p className="mt-1.5 text-sm">{t.resolved_note}</p>}
    </div>
  );

  const danger = (
    <div className="rounded-lg bg-surface px-3 py-2.5">
      <DangerBadge level={t.danger_level} />
      <p className="mt-1 text-sm">
        <b>{DANGER_LABELS[t.danger_level]}.</b> {t.danger_reason || "Brak uzasadnienia (zgłoszenie sprzed oceny AI)."}
      </p>
    </div>
  );

  const letter = (
    <div>
      <p className="label">Treść pisma</p>
      <p className="mt-1.5 whitespace-pre-line rounded-lg bg-surface px-3 py-2.5 text-[15px] leading-relaxed">{t.formal_report}</p>
    </div>
  );

  const meta = (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      <dt className="text-ink-muted">Adres</dt>
      <dd className="flex items-start gap-1">
        <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink-muted" aria-hidden />
        {t.address ? `ok. ${t.address}` : "brak (nie udało się ustalić)"}
      </dd>
      <dt className="text-ink-muted">GPS</dt>
      <dd className="font-mono text-xs leading-5">
        {t.gps_lat.toFixed(5)}, {t.gps_lng.toFixed(5)}
        {t.location_source && ` (${LOCATION_SOURCE_LABELS[t.location_source]})`}
      </dd>
      <dt className="text-ink-muted">Zdjęcia</dt>
      <dd>{images.length}</dd>
      {(t.camera || t.client_device) && (
        <>
          <dt className="text-ink-muted">Urządzenie</dt>
          <dd>
            {t.camera ? `aparat: ${t.camera}` : "aparat: brak danych EXIF"}
            {t.client_device && ` · wysłane z: ${t.client_device}`}
          </dd>
        </>
      )}
      <dt className="text-ink-muted">Pierwsze</dt>
      <dd>{new Date(t.created_at).toLocaleString("pl-PL")}</dd>
    </dl>
  );

  const actions = <TicketActions ticket={t} onStatus={props.onStatus} onResolve={props.onResolve} onReject={props.onReject} />;

  const rejection = t.status === "REJECTED" && t.rejection_reason && (
    <div className="rounded-lg bg-sev-high/10 px-3 py-2.5 text-sm" role="note">
      <p className="flex items-center gap-1.5 font-bold text-sev-high">
        <Ban className="size-4" aria-hidden /> Odrzucone: {REJECTION_LABELS[t.rejection_reason]}
      </p>
      {t.rejection_note && <p className="mt-1">{t.rejection_note}</p>}
      {t.rejected_at && <p className="mt-1 text-ink-muted">{new Date(t.rejected_at).toLocaleString("pl-PL")}</p>}
    </div>
  );
  const dispatch = <DispatchPanel ticket={t} onChanged={props.onChanged} />;

  return (
    <>
      {wide ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            {photos}
            <div className="h-56 overflow-hidden rounded-lg border border-rule">
              <TicketMap tickets={[t]} selectedId={t.id} onSelect={() => {}} focus />
            </div>
          </div>
          <div className="space-y-4">
            {rejection}
            {danger}
            {dispatch}
            {letter}
            {after}
            {meta}
            {actions}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {rejection}
          {danger}
          {dispatch}
          {photos}
          {after}
          {letter}
          {meta}
          {actions}
        </div>
      )}
      {viewer !== null && <Lightbox images={all} index={viewer} onClose={() => setViewer(null)} />}
    </>
  );
}

/** The letter to the responsible unit: preview, send (officials check AI output first), receipt, supplement. */
function DispatchPanel({ ticket: t, onChanged }: { ticket: Ticket; onChanged: () => Promise<void> | void }) {
  const unit = routeCategory(t.category);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const d = t.dispatch;
  const newReports = d ? t.severity_score - d.reports_at_dispatch : 0;

  async function send() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/tickets/${t.id}/dispatch`, { method: "POST" });
    if (res.ok) await onChanged();
    else setError((await res.json().catch(() => null))?.error ?? "Nie udało się wysłać pisma");
    setBusy(false);
  }

  return (
    <section className="rounded-lg border border-rule p-3" aria-label="Pismo do urzędu">
      <p className="flex items-center justify-between gap-2">
        <span className="label">Pismo do urzędu</span>
        <a href={`/api/tickets/${t.id}/letter`} target="_blank" rel="noopener" className="link flex items-center gap-1 text-sm">
          <FileText className="size-4" aria-hidden /> Podgląd PDF
        </a>
      </p>
      <p className="mt-1 text-sm">
        Adresat: <b>{unit.name}</b>
      </p>
      {d ? (
        <div className="mt-2 rounded-md bg-primary-tint/60 px-3 py-2 text-sm">
          <p className="flex items-center gap-1.5 font-bold text-primary-dark">
            <Send className="size-4" aria-hidden /> Wysłano {new Date(d.sent_at).toLocaleString("pl-PL")}
          </p>
          <p className="mt-0.5 text-ink-muted">
            {d.channel === "email" ? "E-mail z PDF (w prototypie na adres testowy)" : "Doręczenie symulowane (brak konfiguracji SMTP)"} ·
            potwierdzenie <span className="font-mono text-xs text-ink">{d.receipt}</span>
          </p>
          <a href={`/api/tickets/${t.id}/letter?sent=1`} target="_blank" rel="noopener" className="link mt-1 inline-block text-sm">
            Otwórz wysłane pismo
          </a>
        </div>
      ) : (
        <p className="mt-1 text-sm text-ink-muted">Pismo nie zostało jeszcze wysłane. Sprawdź kategorię i treść, zanim je wyślesz.</p>
      )}
      {d && newReports > 0 && (
        <p className="mt-2 text-sm text-warn-ink">Od wysyłki: {newReportsText(newReports)}.</p>
      )}
      {error && (
        <p className="mt-2 text-sm font-bold text-sev-high" role="alert">
          {error}
        </p>
      )}
      {(!d || newReports > 0) && (t.status === "OPEN" || t.status === "IN_PROGRESS") && (
        <button onClick={send} disabled={busy} className={`${d ? "btn-secondary" : "btn-primary"} mt-3 py-2.5`}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {d ? "Wyślij uzupełnienie" : `Wyślij pismo do ${unit.short}`}
        </button>
      )}
    </section>
  );
}

function TicketActions(props: {
  ticket: Ticket;
  onStatus: (s: TicketStatus) => void;
  onResolve: (form: FormData) => Promise<void>;
  onReject: (rejection: Rejection) => Promise<void>;
}) {
  const { ticket: t } = props;
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<"resolve" | "reject" | null>(null);

  async function update(next: TicketStatus) {
    setBusy(true);
    await props.onStatus(next);
    setBusy(false);
  }

  if (t.status === "RESOLVED") return null;
  if (t.status === "REJECTED") {
    return (
      <button disabled={busy} onClick={() => update("OPEN")} className="btn-secondary py-2.5">
        <RotateCcw className="size-4" aria-hidden /> Przywróć do otwartych
      </button>
    );
  }
  if (form === "resolve") return <ResolveForm onCancel={() => setForm(null)} onSubmit={props.onResolve} />;
  if (form === "reject") return <RejectForm onCancel={() => setForm(null)} onSubmit={props.onReject} />;
  return (
    <div className="flex flex-col gap-2">
      {t.status !== "IN_PROGRESS" && (
        <button disabled={busy} onClick={() => update("IN_PROGRESS")} className="btn-primary py-2.5">
          <Hammer className="size-4" aria-hidden /> Przyjmij do realizacji
        </button>
      )}
      <button disabled={busy} onClick={() => setForm("resolve")} className="btn-secondary py-2.5">
        <Check className="size-4" aria-hidden /> Oznacz jako rozwiązane
      </button>
      <button
        disabled={busy}
        onClick={() => setForm("reject")}
        className="btn-secondary py-2.5 text-sev-high hover:border-sev-high hover:text-sev-high disabled:text-ink-faint"
      >
        <Ban className="size-4" aria-hidden /> Odrzuć zgłoszenie
      </button>
    </div>
  );
}

/** Closing a ticket without action; the reason (and optional note) is shown to residents. */
function RejectForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (rejection: Rejection) => Promise<void> }) {
  const [reason, setReason] = useState<RejectionReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const noteRequired = reason === "OTHER";
  const canSubmit = reason !== null && (!noteRequired || note.trim().length > 0);

  async function submit() {
    if (!reason) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit({ reason, note: note.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się odrzucić zgłoszenia");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-rule-strong p-3">
      <p className="font-bold">Odrzuć zgłoszenie</p>
      <fieldset>
        <legend className="label">Powód odrzucenia</legend>
        <div className="mt-1.5 space-y-1">
          {REJECTION_REASONS.map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface">
              <input
                type="radio"
                name="rejection-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-sev-high"
              />
              {REJECTION_LABELS[r]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="label">Wyjaśnienie dla mieszkańców {noteRequired ? "(wymagane)" : "(opcjonalnie)"}</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={REJECTION_NOTE_MAX_LENGTH}
          className="input mt-1.5 text-sm"
          placeholder="Np. zgłoszenie dotyczy terenu prywatnego"
        />
      </label>
      {error && (
        <p className="text-sm font-bold text-sev-high" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button onClick={onCancel} disabled={busy} className="btn-secondary py-2.5">
          Anuluj
        </button>
        <button onClick={submit} disabled={busy || !canSubmit} className="btn-primary bg-sev-high py-2.5 hover:bg-sev-high/90 disabled:bg-rule-strong">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Ban className="size-4" aria-hidden />} Odrzuć
        </button>
      </div>
    </div>
  );
}

/** Closing a ticket with optional proof: residents see the after-repair photo in "Moje zgłoszenia". */
function ResolveForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (form: FormData) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    const form = new FormData();
    if (file) form.append("image", file);
    if (note.trim()) form.append("note", note.trim());
    try {
      await onSubmit(form);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się zapisać");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-rule-strong p-3">
      <p className="font-bold">Zamknij zgłoszenie</p>
      <label className="block">
        <span className="label">Zdjęcie po naprawie (opcjonalnie)</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary-tint file:px-3 file:py-1.5 file:font-bold file:text-primary"
        />
      </label>
      <label className="block">
        <span className="label">Notatka dla mieszkańców (opcjonalnie)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="input mt-1.5 text-sm" placeholder="Np. ubytek uzupełniony masą asfaltową" />
      </label>
      {error && (
        <p className="text-sm font-bold text-sev-high" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button onClick={onCancel} disabled={busy} className="btn-secondary py-2.5">
          Anuluj
        </button>
        <button onClick={submit} disabled={busy} className="btn-primary py-2.5">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />} Zapisz jako rozwiązane
        </button>
      </div>
    </div>
  );
}

// Polish plural: 1 "nowe zgłoszenie", 2–4 "nowe zgłoszenia", otherwise "nowych zgłoszeń".
function newReportsText(n: number): string {
  if (n === 1) return "1 nowe zgłoszenie mieszkańca";
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
  return few ? `${n} nowe zgłoszenia mieszkańców` : `${n} nowych zgłoszeń mieszkańców`;
}

const rtf = new Intl.RelativeTimeFormat("pl", { numeric: "auto" });

function timeAgo(iso: string): string {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}
