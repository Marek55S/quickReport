"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Wordmark } from "@/components/ui";

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
    <main className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-rule px-5 py-3">
        <Wordmark />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border border-rule bg-paper p-8">
          <p className="label">Panel urzędu</p>
          <h1 className="display mt-1 text-3xl leading-tight">Zaloguj się</h1>
          <p className="mt-2 text-ink-muted">Dostęp tylko dla pracowników urzędu.</p>

          <label className="mt-8 block">
            <span className="label">Hasło</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
              aria-invalid={Boolean(error)}
              className="input mt-2"
            />
          </label>
          {error && (
            <p className="mt-2 text-sm font-medium text-sev-high" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy || !password} className="btn-primary mt-6">
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Zaloguj
          </button>
        </form>
      </div>
    </main>
  );
}
