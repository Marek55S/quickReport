"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { CATEGORY_ICONS } from "@/components/categories";
import { CATEGORY_LABELS, DANGER_LABELS, type Stats } from "@/lib/types";
import { dangerColor } from "./severity";

// Single-series charts in the city blue; values and labels use text colours (dataviz skill).
export default function StatsView({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/stats", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) return onUnauthorized();
        if (!res.ok) throw new Error();
        setStats(await res.json());
      })
      .catch(() => setError(true));
  }, [onUnauthorized]);

  if (error) return <p className="p-8 text-ink-muted">Nie udało się wczytać statystyk.</p>;
  if (!stats)
    return (
      <div className="flex flex-1 justify-center p-16 text-ink-muted">
        <Loader2 className="size-6 animate-spin" aria-label="Ładowanie" />
      </div>
    );

  const open = stats.by_status.OPEN + stats.by_status.IN_PROGRESS;
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">
        <section aria-label="Podsumowanie" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Tile label="Do załatwienia" value={open} hint={`w tym ${stats.by_status.IN_PROGRESS} w realizacji`} />
          <Tile label="Rozwiązane" value={stats.by_status.RESOLVED} />
          <Tile label="Głosy mieszkańców" value={stats.total_reports} hint="wszystkie zgłoszenia" />
          <Tile
            label="Średni czas naprawy"
            value={stats.avg_resolution_hours === null ? "—" : formatDuration(stats.avg_resolution_hours)}
            hint={stats.resolved_count ? `z ${stats.resolved_count} rozwiązanych` : "brak rozwiązanych"}
          />
          <Tile
            label="Zgłoszenia z 14 dni"
            value={stats.daily_reports.reduce((sum, d) => sum + d.count, 0)}
            hint="nowe zdjęcia od mieszkańców"
          />
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card title="Zgłoszenia według kategorii" subtitle="Liczba zgłoszeń mieszkańców (wszystkie statusy)">
            <CategoryBars rows={stats.by_category} />
          </Card>
          <Card title="Nowe zgłoszenia – ostatnie 14 dni" subtitle="Liczba zdjęć przesłanych dziennie">
            <DailyColumns days={stats.daily_reports} />
          </Card>
        </div>

        <Card title="Największe zagrożenie według AI" subtitle="Otwarte zgłoszenia o najwyższej ocenie zagrożenia">
          <table className="w-full text-left text-sm">
            <thead className="text-ink-muted">
              <tr className="border-b border-rule">
                <th className="py-2 pr-3 font-bold">Zgłoszenie</th>
                <th className="py-2 pr-3 font-bold">Adres</th>
                <th className="py-2 pr-3 text-right font-bold">Zgłoszeń</th>
                <th className="py-2 font-bold">Zagrożenie</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_danger.map((t) => (
                <tr key={t.id} className="border-b border-rule last:border-0">
                  <td className="py-2.5 pr-3 font-bold">{t.title}</td>
                  <td className="py-2.5 pr-3 text-ink-muted">{t.address ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{t.severity_score}</td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: dangerColor(t.danger_level) }} aria-hidden />
                      <span className="tabular-nums">{t.danger_level}/5</span>
                      <span className="text-ink-muted">{DANGER_LABELS[t.danger_level]}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="text-xs text-ink-faint">Dane demonstracyjne w prototypie są częściowo ilustracyjne.</p>
      </div>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-rule p-4">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-black text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-rule p-5">
      <h2 className="text-lg font-black">{title}</h2>
      <p className="text-sm text-ink-muted">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CategoryBars({ rows }: { rows: Stats["by_category"] }) {
  const max = Math.max(1, ...rows.map((r) => r.reports));
  if (!rows.length) return <p className="text-ink-muted">Brak danych.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const Icon = CATEGORY_ICONS[r.category];
        return (
          <li key={r.category} className="group grid grid-cols-[minmax(0,15rem)_1fr] items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 truncate text-ink">
              <Icon className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
              <span className="truncate">{CATEGORY_LABELS[r.category]}</span>
            </span>
            <span className="relative flex items-center gap-2">
              <span
                className="h-4 rounded-r-[4px] bg-primary transition-opacity group-hover:opacity-80"
                style={{ width: `${(r.reports / max) * 85}%` }}
              />
              <span className="tabular-nums text-ink">{r.reports}</span>
              <span className="pointer-events-none absolute -top-8 left-0 z-10 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white group-hover:block">
                {r.reports} zgłoszeń · {r.tickets} {r.tickets === 1 ? "problem" : "problemy/ów"}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function DailyColumns({ days }: { days: Stats["daily_reports"] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const fmt = (date: string) => new Date(date).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  return (
    <div>
      {/* The top gridline marks the maximum, so bars are scaled to the full plot height. */}
      <p className="text-xs tabular-nums text-ink-muted">{max}</p>
      <div className="relative mt-1 flex h-40 items-end gap-1 border-b border-t border-rule" aria-hidden>
        {days.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end justify-center">
            <div
              className="w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 0 }}
            />
            <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white group-hover:block">
              {fmt(d.date)}: {d.count}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-ink-muted" aria-hidden>
        <span>{fmt(days[0].date)}</span>
        <span>dziś</span>
      </div>
      <table className="sr-only">
        <caption>Nowe zgłoszenia dziennie</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th>{fmt(d.date)}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDuration(hours: number): string {
  return hours < 48 ? `${Math.round(hours)} h` : `${(hours / 24).toFixed(1).replace(".", ",")} dni`;
}
