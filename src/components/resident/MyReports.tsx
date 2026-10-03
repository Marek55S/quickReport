"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Lightbox, PhotoButton } from "@/components/Lightbox";
import { ArrowLeft, Camera, ChevronDown, Loader2, MapPin, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { CATEGORY_ICONS } from "@/components/categories";
import { ticketNumber } from "@/components/ui";
import type { MyReport } from "@/lib/types";
import { useLang, useT } from "./i18n";
import { getReporterId, signInCitizen, signOutCitizen } from "./reporter";

type Ready = { kind: "ready"; reports: MyReport[]; citizen: { name: string; pesel: string } | null; loginAvailable: boolean };
type State = { kind: "loading" } | { kind: "error" } | Ready;

export default function MyReports() {
  const t = useT();
  const [state, setState] = useState<State>({ kind: "loading" });

  const [authError, setAuthError] = useState(false);

  const load = useCallback(async () => {
    const reporter = getReporterId();
    try {
      // Device reports by anonymous id; with a citizen session the server adds reports from other devices.
      const res = await fetch(`/api/my-reports${reporter ? `?reporter=${reporter}` : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setState({ kind: "ready", reports: data.reports, citizen: data.citizen, loginAvailable: data.login_available });
    } catch {
      setState({ kind: "error" });
    }
  }, []);

  async function signIn() {
    setAuthError(false);
    if (await signInCitizen()) await load();
    else setAuthError(true);
  }

  async function signOut() {
    await signOutCitizen();
    await load();
  }

  useEffect(() => {
    const initial = setTimeout(load, 0);
    // Statuses change in the city office; refresh when the resident comes back to the app.
    window.addEventListener("focus", load);
    return () => {
      clearTimeout(initial);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper lg:max-w-3xl">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-rule bg-paper px-3 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] lg:px-6 lg:py-4">
        <Link href="/" aria-label={t.back} className="rounded-lg p-2 hover:bg-surface">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="display flex-1 text-xl leading-none">{t.myReports}</h1>
        <button onClick={load} aria-label={t.refresh} className="rounded-lg p-2 text-ink-muted hover:bg-surface">
          <RefreshCw className="size-5" />
        </button>
      </header>

      <div className="flex-1 px-5 pb-10 lg:px-8">
        {state.kind === "loading" && <Loader2 className="mx-auto mt-16 size-8 animate-spin" aria-label={t.loading} />}
        {state.kind === "error" && (
          <p className="mt-16 text-ink-muted" role="alert">
            {t.myError}
          </p>
        )}
        {state.kind === "ready" && (state.citizen || state.loginAvailable) && (
          <div className="mt-4 flex items-start gap-3 rounded-lg bg-surface px-3 py-2.5 text-sm">
            <ShieldCheck className={`mt-0.5 size-4 shrink-0 ${state.citizen ? "text-ok" : "text-ink-muted"}`} aria-hidden />
            <div className="flex-1">
              <p>{state.citizen ? t.signedInAs(state.citizen.name) : t.deviceOnly}</p>
              <button onClick={state.citizen ? signOut : signIn} className="link mt-1 text-sm">
                {state.citizen ? t.signOut : t.signIn}
              </button>
              {authError && <p className="mt-1 text-sev-high">{t.signInFailed}</p>}
            </div>
          </div>
        )}
        {state.kind === "ready" && state.reports.length === 0 && (
          <div className="mt-12">
            <h2 className="display text-3xl leading-none">{t.emptyTitle}</h2>
            <p className="mt-3 text-ink-muted">{t.emptyBody}</p>
            <Link href="/" className="btn-primary mt-8">
              <Camera className="size-5" aria-hidden /> {t.reportCta}
            </Link>
          </div>
        )}
        {state.kind === "ready" && state.reports.length > 0 && (
          <ol className="mt-1">
            {state.reports.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}

const LOCALES = { pl: "pl-PL", en: "en-GB", uk: "uk-UA" } as const;

function ReportRow({ report: r }: { report: MyReport }) {
  const t = useT();
  const locale = LOCALES[useLang()];
  const [open, setOpen] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const photos = [
    { src: r.image_url, alt: `${r.title} – ${t.before}`, caption: t.before },
    ...(r.resolution_image_url ? [{ src: r.resolution_image_url, alt: `${r.title} – ${t.after}`, caption: t.after }] : []),
  ];
  const Icon = CATEGORY_ICONS[r.category];
  // Received → letter sent to the unit → in progress → resolved.
  const done = [true, Boolean(r.dispatched_at), r.status !== "OPEN", r.status === "RESOLVED"];
  const stage = done.lastIndexOf(true) + 1;
  const dates = [r.created_at, r.dispatched_at, r.in_progress_at, r.resolved_at];
  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" }) : "");
  const fmtFull = (iso: string) => new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  const detailsId = `report-${r.id}-details`;

  return (
    <li className="border-b border-rule py-4">
      <div className="flex gap-3">
        <PhotoButton
          src={r.image_url}
          alt={photos[0].alt}
          openLabel={t.enlarge}
          onOpen={() => setViewer(0)}
          className="size-16 rounded-lg bg-rule object-cover lg:size-20"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="ticket-no">{ticketNumber(r.ticket_id)}</span>
            <span className={`tag ${STAGE_STYLE[stage - 1]}`}>{t.stages[stage - 1]}</span>
          </div>
          <h2 className="mt-1 truncate text-lg font-bold leading-tight">{r.title}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{r.address ?? t.categories[r.category]}</span>
          </p>
          {r.severity_score > 1 && <p className="text-sm text-ink-muted">{t.reportsCount(r.severity_score)}</p>}
        </div>
      </div>

      {/* Four-segment progress, like a route indicator. */}
      <ol className="mt-3 grid grid-cols-4 gap-1" aria-label={t.stageOf(stage, t.stages[stage - 1])}>
        {t.stages.map((label, i) => (
          <li key={label}>
            <div className={`h-1.5 rounded-full ${done[i] ? (stage === 4 ? "bg-ok" : "bg-primary") : "bg-rule"}`} />
            <p className={`mt-1 text-xs leading-tight ${done[i] ? "font-bold" : "text-ink-faint"}`}>
              {label}
              {done[i] && dates[i] && <span className="block font-mono text-[11px] font-normal text-ink-muted">{fmt(dates[i])}</span>}
            </p>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={detailsId}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-rule-strong py-2 text-sm font-bold text-primary hover:border-primary"
      >
        {open ? t.hideDetails : t.showDetails}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div id={detailsId} className="mt-4 space-y-4">
          <div>
            <p className="label">{t.dPhotos}</p>
            <div className={`mt-1.5 grid gap-2 ${photos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {photos.map((photo, i) => (
                <div key={photo.caption}>
                  <PhotoButton
                    src={photo.src}
                    alt={photo.alt}
                    openLabel={t.enlarge}
                    onOpen={() => setViewer(i)}
                    className="aspect-[4/3] w-full rounded-lg bg-rule object-cover"
                  />
                  {photos.length > 1 && <p className="mt-1 text-xs font-bold text-ink-muted">{photo.caption}</p>}
                </div>
              ))}
            </div>
          </div>

          {r.resolved_note && (
            <div className="rounded-lg bg-ok-tint px-3 py-2.5 text-sm">
              <p className="font-bold text-ok">{t.dOfficeNote}</p>
              <p className="mt-0.5">{r.resolved_note}</p>
            </div>
          )}

          <div>
            <p className="label">{t.dText}</p>
            <p className="mt-1.5 whitespace-pre-line rounded-lg bg-surface px-3 py-2.5 text-[15px] leading-relaxed" lang="pl">
              {r.formal_report}
            </p>
            {t.letterPolish && <p className="mt-1 text-xs text-ink-muted">{t.letterPolish}</p>}
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-ink-muted">{t.category}</dt>
            <dd className="flex items-center gap-1.5">
              <Icon className="size-3.5 shrink-0" aria-hidden /> {t.categories[r.category]}
            </dd>
            <dt className="text-ink-muted">{t.dPlace}</dt>
            <dd>
              {r.address && (
                <span className="block">
                  {t.approx} {r.address}
                </span>
              )}
              <span className="block font-mono text-xs text-ink-muted">
                {r.gps_lat.toFixed(5)}, {r.gps_lng.toFixed(5)}
              </span>
              <a
                href={`https://www.openstreetmap.org/?mlat=${r.gps_lat}&mlon=${r.gps_lng}#map=18/${r.gps_lat}/${r.gps_lng}`}
                target="_blank"
                rel="noopener"
                className="link mt-0.5 inline-flex items-center gap-1 text-sm"
              >
                <MapPin className="size-3.5" aria-hidden /> {t.dOpenMap}
              </a>
            </dd>
            <dt className="text-ink-muted">{t.dReportedAt}</dt>
            <dd>{fmtFull(r.created_at)}</dd>
            <dt className="text-ink-muted">{t.dReporters}</dt>
            <dd>{r.severity_score}</dd>
            <dt className="text-ink-muted">{t.dLetter}</dt>
            <dd>
              {r.dispatch_unit && r.dispatched_at ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <Send className="size-3.5 shrink-0 text-primary" aria-hidden /> {r.dispatch_unit}
                  </span>
                  <span className="block text-ink-muted">
                    {fmtFull(r.dispatched_at)}
                    {r.dispatch_receipt && <> · <span className="font-mono text-xs">{r.dispatch_receipt}</span></>}
                  </span>
                </>
              ) : (
                <span className="text-ink-muted">{t.dLetterNotSent}</span>
              )}
            </dd>
          </dl>
        </div>
      )}
      {viewer !== null && <Lightbox images={photos} index={viewer} labels={t.viewer} onClose={() => setViewer(null)} />}
    </li>
  );
}

const STAGE_STYLE = [
  "bg-surface text-ink-muted ring-1 ring-inset ring-rule-strong",
  "bg-primary-tint text-primary-dark",
  "bg-primary-tint text-primary-dark",
  "bg-ok-tint text-ok",
];
