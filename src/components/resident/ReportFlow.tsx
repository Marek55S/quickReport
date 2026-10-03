"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import { CATEGORY_STYLE } from "@/components/categories";
import { CATEGORIES, CATEGORY_LABELS, type Analysis, type SubmitResult } from "@/lib/types";
import { downscaleImage, getPosition, type Position } from "./media";

type Step = "home" | "analyzing" | "review" | "auth" | "submitting" | "done" | "error";

export default function ReportFlow() {
  const fileInput = useRef<HTMLInputElement>(null);
  const positionPromise = useRef<Promise<Position> | null>(null);
  const [step, setStep] = useState<Step>("home");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [aiSource, setAiSource] = useState<"ai" | "mock">("ai");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState("");

  function startReport() {
    // Ask for location while the user is taking the photo.
    positionPromise.current = getPosition();
    fileInput.current?.click();
  }

  async function onPhotoSelected(file: File | undefined) {
    if (!file) return;
    setStep("analyzing");
    try {
      const [blob, pos] = await Promise.all([
        downscaleImage(file),
        positionPromise.current ?? getPosition(),
      ]);
      if (photo) URL.revokeObjectURL(photo.url);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
      setPosition(pos);

      const form = new FormData();
      form.append("image", blob, "photo.jpg");
      form.append("lat", String(pos.lat));
      form.append("lng", String(pos.lng));
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error ?? "Analiza nie powiodła się");
      const data = (await res.json()) as { analysis: Analysis; source: "ai" | "mock" };
      setAnalysis(data.analysis);
      setAiSource(data.source);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Coś poszło nie tak");
      setStep("error");
    }
  }

  async function submit() {
    if (!photo || !position || !analysis) return;
    setStep("submitting");
    try {
      const form = new FormData();
      form.append("image", photo.blob, "photo.jpg");
      form.append("lat", String(position.lat));
      form.append("lng", String(position.lng));
      form.append("category", analysis.category);
      form.append("title", analysis.title);
      form.append("formal_report", analysis.formal_report);
      const res = await fetch("/api/reports", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error ?? "Nie udało się wysłać zgłoszenia");
      setResult(await res.json());
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Coś poszło nie tak");
      setStep("error");
    }
  }

  function reset() {
    if (photo) URL.revokeObjectURL(photo.url);
    if (fileInput.current) fileInput.current.value = "";
    setPhoto(null);
    setAnalysis(null);
    setResult(null);
    setError("");
    setStep("home");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPhotoSelected(e.target.files?.[0])}
      />

      {step === "home" && <Home onStart={startReport} />}

      {step === "analyzing" && (
        <Centered>
          {photo && <PhotoPreview url={photo.url} />}
          <Loader2 className="mx-auto mt-8 size-10 animate-spin text-brand" />
          <h2 className="mt-4 text-xl font-semibold">Analizuję zdjęcie…</h2>
          <p className="mt-1 text-slate-600">AI rozpoznaje problem i przygotowuje pismo do urzędu.</p>
        </Centered>
      )}

      {step === "review" && analysis && photo && position && (
        <Review
          photoUrl={photo.url}
          position={position}
          analysis={analysis}
          aiSource={aiSource}
          onChange={setAnalysis}
          onBack={reset}
          onNext={() => setStep("auth")}
        />
      )}

      {(step === "auth" || step === "submitting") && (
        <AuthMock busy={step === "submitting"} onBack={() => setStep("review")} onConfirm={submit} />
      )}

      {step === "done" && result && <Done result={result} title={analysis?.title} onAgain={reset} />}

      {step === "error" && (
        <Centered>
          <TriangleAlert className="mx-auto size-12 text-rose-500" />
          <h2 className="mt-4 text-xl font-semibold">Nie udało się</h2>
          <p className="mt-1 text-slate-600">{error}</p>
          <button onClick={reset} className="btn-primary mt-8">
            Spróbuj ponownie
          </button>
        </Centered>
      )}
    </main>
  );
}

function Home({ onStart }: { onStart: () => void }) {
  const steps = [
    { icon: Camera, text: "Zrób zdjęcie usterki lub bariery" },
    { icon: Sparkles, text: "AI rozpozna problem i napisze oficjalne zgłoszenie" },
    { icon: ShieldCheck, text: "Potwierdź przez mObywatel – gotowe" },
  ];
  return (
    <div className="flex flex-1 flex-col">
      <section className="rounded-b-[2rem] bg-gradient-to-br from-brand to-brand-dark px-6 pb-10 pt-[max(3rem,env(safe-area-inset-top))] text-white">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-200">
          <MapPin className="size-4" /> QuickReport
        </p>
        <h1 className="mt-4 text-3xl font-bold leading-tight">Widzisz problem w mieście? Zgłoś go jednym zdjęciem.</h1>
        <p className="mt-3 text-blue-100">Bez formularzy i szukania właściwego wydziału.</p>
      </section>

      <ol className="space-y-4 px-6 py-8">
        {steps.map(({ icon: Icon, text }, i) => (
          <li key={text} className="flex items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-brand">
              <Icon className="size-5" />
            </span>
            <span className="text-slate-700">
              <span className="font-semibold text-slate-900">{i + 1}. </span>
              {text}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-auto px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <button onClick={onStart} className="btn-primary flex items-center justify-center gap-3 py-5 text-lg">
          <Camera className="size-6" /> Zgłoś problem
        </button>
        <p className="mt-3 text-center text-xs text-slate-500">
          Zdjęcia z tego samego miejsca łączymy w jedno zgłoszenie – im więcej osób, tym wyższy priorytet.
        </p>
      </div>
    </div>
  );
}

function Review(props: {
  photoUrl: string;
  position: Position;
  analysis: Analysis;
  aiSource: "ai" | "mock";
  onChange: (a: Analysis) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const { analysis, onChange, position } = props;
  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Sprawdź zgłoszenie" onBack={props.onBack} />
      <div className="flex-1 space-y-5 px-5 pb-6">
        <PhotoPreview url={props.photoUrl} />

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-medium text-brand">
            <Sparkles className="size-3.5" />
            {props.aiSource === "ai" ? "Wygenerowane przez AI" : "Tryb demo (AI niedostępne)"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
            <MapPin className="size-3.5" />
            {position.demo
              ? "Lokalizacja demonstracyjna"
              : `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}${position.accuracy ? ` (±${Math.round(position.accuracy)} m)` : ""}`}
          </span>
        </div>

        <fieldset>
          <legend className="label">Kategoria</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => {
              const { icon: Icon } = CATEGORY_STYLE[c];
              const active = analysis.category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ ...analysis, category: c })}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    active ? "border-brand bg-blue-50 font-semibold text-brand" : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {CATEGORY_LABELS[c]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="block">
          <span className="label">Tytuł</span>
          <input
            value={analysis.title}
            onChange={(e) => onChange({ ...analysis, title: e.target.value })}
            className="input mt-2"
          />
        </label>

        <label className="block">
          <span className="label">Treść zgłoszenia do urzędu</span>
          <textarea
            value={analysis.formal_report}
            onChange={(e) => onChange({ ...analysis, formal_report: e.target.value })}
            rows={9}
            className="input mt-2 text-sm leading-relaxed"
          />
        </label>
      </div>
      <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          onClick={props.onNext}
          disabled={analysis.title.trim().length < 3 || analysis.formal_report.trim().length < 20}
          className="btn-primary"
        >
          Dalej – potwierdź i wyślij
        </button>
      </div>
    </div>
  );
}

function AuthMock({ busy, onBack, onConfirm }: { busy: boolean; onBack: () => void; onConfirm: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Potwierdzenie tożsamości" onBack={busy ? undefined : onBack} />
      <div className="flex flex-1 flex-col px-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-rose-600 text-white">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <p className="text-lg font-semibold">mObywatel</p>
              <p className="text-xs text-slate-500">Symulacja logowania (prototyp)</p>
            </div>
          </div>
          <p className="mt-5 text-slate-700">
            Urząd przyjmie zgłoszenie jako oficjalne pismo. Potwierdź, że zgłaszasz je Ty:
          </p>
          <dl className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Imię i nazwisko</dt>
              <dd className="font-medium">Jan Kowalski</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">PESEL</dt>
              <dd className="font-mono">•••••••1234</dd>
            </div>
          </dl>
        </div>
        <div className="mt-auto pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 py-4 font-semibold text-white shadow-lg shadow-rose-900/20 disabled:opacity-70"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />}
            {busy ? "Wysyłanie zgłoszenia…" : "Potwierdź w mObywatel i wyślij"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Done({ result, title, onAgain }: { result: SubmitResult; title?: string; onAgain: () => void }) {
  return (
    <Centered>
      <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
      <h2 className="mt-4 text-2xl font-bold">Zgłoszenie wysłane</h2>
      {title && <p className="mt-1 text-slate-600">{title}</p>}

      {result.merged ? (
        <div className="mt-6 rounded-2xl bg-amber-50 p-5 text-left text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <Users className="size-5" /> {reportersText(result.severity_score)}
          </p>
          <p className="mt-1 text-sm">
            Dołączyliśmy Twoje zdjęcie do istniejącego zgłoszenia i podnieśliśmy jego priorytet w urzędzie.
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-left text-emerald-900">
          <p className="font-semibold">Jesteś pierwszą osobą, która to zgłosiła</p>
          <p className="mt-1 text-sm">Urząd otrzymał nowe zgłoszenie z Twoim zdjęciem i lokalizacją.</p>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-500">
        Numer zgłoszenia: <span className="font-mono">{result.ticketId}</span>
      </p>

      <button onClick={onAgain} className="btn-primary mt-8">
        Zgłoś kolejny problem
      </button>
    </Centered>
  );
}

// Polish plural: 2–4 (except 12–14) "osoby zgłosiły", otherwise "osób zgłosiło".
function reportersText(n: number) {
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
  return few ? `Ten problem zgłosiły już ${n} osoby` : `Ten problem zgłosiło już ${n} osób`;
}

function TopBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 bg-background/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
      {onBack ? (
        <button onClick={onBack} aria-label="Wstecz" className="rounded-full p-2 hover:bg-slate-100">
          <ArrowLeft className="size-5" />
        </button>
      ) : (
        <span className="size-9" />
      )}
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col justify-center px-6 py-10 text-center">{children}</div>;
}

function PhotoPreview({ url }: { url: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- local object URL
  return <img src={url} alt="Zdjęcie zgłoszenia" className="aspect-[4/3] w-full rounded-2xl object-cover shadow-sm" />;
}
