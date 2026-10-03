export default function ResidentHome() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10 pt-12">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">QuickReport</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight">
          Widzisz problem w mieście? Zgłoś go jednym zdjęciem.
        </h1>
        <p className="mt-3 text-slate-600">
          AI rozpozna usterkę i przygotuje oficjalne pismo do urzędu. Ty tylko potwierdzasz.
        </p>
      </header>

      <div className="mt-auto pt-10">
        {/* Capture flow is implemented in Task 5. */}
        <button
          type="button"
          disabled
          className="w-full rounded-2xl bg-brand py-5 text-lg font-semibold text-white shadow-lg shadow-blue-900/20 disabled:opacity-60"
        >
          📷 Zgłoś problem
        </button>
        <p className="mt-3 text-center text-xs text-slate-500">Wkrótce: zdjęcie + lokalizacja GPS</p>
      </div>
    </main>
  );
}
