import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel urzędnika – QuickReport",
};

export default function AdminDashboard() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="bg-brand-dark px-6 py-4 text-white">
        <h1 className="text-xl font-semibold">Panel zgłoszeń miejskich</h1>
        <p className="text-sm text-blue-200">Otwarte zgłoszenia według priorytetu</p>
      </header>

      {/* Map and prioritized ticket table are implemented in Task 6. */}
      <div className="grid flex-1 gap-4 p-6 lg:grid-cols-2">
        <section className="flex min-h-80 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400">
          Mapa zgłoszeń
        </section>
        <section className="flex min-h-80 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400">
          Tabela zgłoszeń
        </section>
      </div>
    </main>
  );
}
