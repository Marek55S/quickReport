"use client";

import { useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const next = new URLSearchParams(window.location.search).get("next");
      // Only same-site paths, never an absolute URL from the query string.
      window.location.assign(next?.startsWith("/admin") ? next : "/admin");
      return;
    }
    setBusy(false);
    setError(res.status === 401 ? "Nieprawidłowe hasło" : "Nie udało się zalogować");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-dark text-white">
          <LockKeyhole className="size-6" />
        </span>
        <h1 className="mt-5 text-xl font-semibold">Panel zgłoszeń miejskich</h1>
        <p className="mt-1 text-sm text-slate-500">Dostęp tylko dla pracowników urzędu.</p>

        <label className="mt-6 block">
          <span className="label">Hasło</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
            className="input mt-2"
          />
        </label>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={busy || !password}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy && <Loader2 className="size-4 animate-spin" />} Zaloguj
        </button>
      </form>
    </main>
  );
}
