"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Camera, Loader2, RefreshCw } from "lucide-react";
import { CATEGORY_ICONS } from "@/components/categories";
import { StatusTag, ticketNumber } from "@/components/ui";
import { CATEGORY_LABELS, type MyReport } from "@/lib/types";
import { getReporterId } from "./reporter";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; reports: MyReport[] };

export default function MyReports() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    const reporter = getReporterId();
    if (!reporter) return setState({ kind: "ready", reports: [] });
    try {
      const res = await fetch(`/api/my-reports?reporter=${reporter}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setState({ kind: "ready", reports: await res.json() });
    } catch {
      setState({ kind: "error" });
    }
  }, []);

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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-rule bg-paper px-3 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link href="/" aria-label="Wstecz" className="rounded-[4px] p-2 hover:bg-ink/5">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="display flex-1 text-xl leading-none">Moje zgłoszenia</h1>
        <button onClick={load} aria-label="Odśwież" className="rounded-[4px] p-2 text-ink-muted hover:bg-ink/5">
          <RefreshCw className="size-5" />
        </button>
      </header>

      <div className="flex-1 px-5 pb-10">
        {state.kind === "loading" && <Loader2 className="mx-auto mt-16 size-8 animate-spin" aria-label="Ładowanie" />}
        {state.kind === "error" && (
          <p className="mt-16 text-ink-muted" role="alert">
            Nie udało się pobrać zgłoszeń. Spróbuj ponownie.
          </p>
        )}
        {state.kind === "ready" && state.reports.length === 0 && (
          <div className="mt-12">
            <h2 className="display text-3xl leading-none">Nic tu jeszcze nie ma</h2>
            <p className="mt-3 text-ink-muted">Nie masz jeszcze zgłoszeń wysłanych z tego urządzenia.</p>
            <Link href="/" className="btn-primary mt-8">
              <Camera className="size-5" aria-hidden /> Zgłoś problem
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

const STAGES = ["Przyjęte", "W realizacji", "Rozwiązane"] as const;

function ReportRow({ report: r }: { report: MyReport }) {
  const Icon = CATEGORY_ICONS[r.category];
  const stage = r.status === "RESOLVED" ? 3 : r.status === "IN_PROGRESS" ? 2 : 1;
  const dates = [r.created_at, r.in_progress_at, r.resolved_at];
  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "short" }) : "");

  return (
    <li className="border-b border-rule py-4">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- served by /api/images */}
        <img src={r.image_url} alt="" className="size-16 shrink-0 rounded-[4px] bg-rule object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="ticket-no">{ticketNumber(r.ticket_id)}</span>
            <StatusTag status={r.status} />
          </div>
          <h2 className="mt-1 truncate text-lg font-medium leading-tight">{r.title}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{CATEGORY_LABELS[r.category]}</span>
          </p>
          {r.severity_score > 1 && (
            <p className="text-sm text-ink-muted">
              Zgłoszeń tego problemu: <b className="font-semibold tabular-nums text-ink">{r.severity_score}</b>
            </p>
          )}
        </div>
      </div>

      {/* Three-segment progress, like a route indicator. */}
      <ol className="mt-3 grid grid-cols-3 gap-1" aria-label={`Etap ${stage} z 3: ${STAGES[stage - 1]}`}>
        {STAGES.map((label, i) => {
          const done = i < stage;
          return (
            <li key={label}>
              <div className={`h-1.5 ${done ? (stage === 3 ? "bg-ok" : "bg-ink") : "bg-rule"}`} />
              <p className={`mt-1 text-[13px] leading-tight ${done ? "font-medium" : "text-ink-faint"}`}>
                {label}
                {done && dates[i] && <span className="block font-mono text-[11px] text-ink-muted">{fmt(dates[i])}</span>}
              </p>
            </li>
          );
        })}
      </ol>
    </li>
  );
}
