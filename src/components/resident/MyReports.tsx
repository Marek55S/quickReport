"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Camera, Check, ClipboardList, Loader2, RefreshCw, Users } from "lucide-react";
import { CATEGORY_STYLE } from "@/components/categories";
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-background/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <Link href="/" aria-label="Wstecz" className="rounded-full p-2 hover:bg-slate-100">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="flex-1 text-lg font-semibold">Moje zgłoszenia</h1>
        <button onClick={load} aria-label="Odśwież" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
          <RefreshCw className="size-5" />
        </button>
      </header>

      <div className="flex-1 space-y-3 px-5 pb-10">
        {state.kind === "loading" && <Loader2 className="mx-auto mt-16 size-8 animate-spin text-brand" />}
        {state.kind === "error" && (
          <p className="mt-16 text-center text-slate-600">Nie udało się pobrać zgłoszeń. Spróbuj ponownie.</p>
        )}
        {state.kind === "ready" && state.reports.length === 0 && (
          <div className="mt-16 text-center">
            <ClipboardList className="mx-auto size-12 text-slate-300" />
            <p className="mt-3 text-slate-600">Nie masz jeszcze zgłoszeń wysłanych z tego urządzenia.</p>
            <Link href="/" className="btn-primary mt-8 flex items-center justify-center gap-2">
              <Camera className="size-5" /> Zgłoś problem
            </Link>
          </div>
        )}
        {state.kind === "ready" && state.reports.map((r) => <ReportCard key={r.id} report={r} />)}
      </div>
    </main>
  );
}

function ReportCard({ report: r }: { report: MyReport }) {
  const { icon: Icon, chip } = CATEGORY_STYLE[r.category];
  const steps = [
    { label: "Przyjęte", done: true, date: r.created_at },
    { label: "W realizacji", done: r.status !== "OPEN", date: r.in_progress_at },
    { label: "Rozwiązane", done: r.status === "RESOLVED", date: r.resolved_at },
  ];
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- served by /api/images */}
        <img src={r.image_url} alt="" className="size-16 shrink-0 rounded-xl bg-slate-200 object-cover" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{r.title}</h2>
          <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${chip}`}>
            <Icon className="size-3" /> {CATEGORY_LABELS[r.category]}
          </span>
          {r.severity_score > 1 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
              <Users className="size-3.5" /> Zgłoszeń tego problemu: {r.severity_score}
            </p>
          )}
        </div>
      </div>

      <ol className="mt-4 grid grid-cols-3 gap-1">
        {steps.map((step, i) => (
          <li key={step.label} className="flex flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? "invisible" : step.done ? "bg-emerald-500" : "bg-slate-200"}`} />
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                  step.done ? "bg-emerald-500 text-white" : "border-2 border-slate-200 bg-white"
                }`}
              >
                {step.done && <Check className="size-4" />}
              </span>
              <span
                className={`h-0.5 flex-1 ${i === steps.length - 1 ? "invisible" : steps[i + 1].done ? "bg-emerald-500" : "bg-slate-200"}`}
              />
            </div>
            <span className={`mt-1 text-xs font-medium ${step.done ? "text-slate-900" : "text-slate-400"}`}>
              {step.label}
            </span>
            {step.done && step.date && (
              <span className="text-[11px] text-slate-500">
                {new Date(step.date).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
              </span>
            )}
          </li>
        ))}
      </ol>
    </article>
  );
}
