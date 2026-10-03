"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardList,
  Image as ImageIcon,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  NotebookPen,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import { CATEGORY_STYLE } from "@/components/categories";
import {
  CATEGORY_LABELS,
  DEFAULT_CATEGORY,
  NOTES_MAX_LENGTH,
  REPORTABLE_CATEGORIES,
  type Analysis,
  type SubmitResult,
} from "@/lib/types";
import { downscaleImage, getPosition, readPhotoPosition, type Position } from "./media";
import { getReporterId } from "./reporter";

const PickerMap = dynamic(() => import("./PickerMap"), {
  ssr: false,
  loading: () => <div className="flex size-full items-center justify-center text-sm text-slate-400">Ładowanie mapy…</div>,
});

type Step = "home" | "analyzing" | "review" | "auth" | "submitting" | "done" | "error";
type LocationChoice = "device" | "exif" | "map";
type AnalyzeResponse = { analysis: Analysis; source: "ai" | "mock" };

async function requestAnalysis(blob: Blob, notes = ""): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("image", blob, "photo.jpg");
  if (notes.trim()) form.append("notes", notes.trim());
  const res = await fetch("/api/analyze", { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.json()).error ?? "Analiza nie powiodła się");
  return res.json();
}

export default function ReportFlow() {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const positionPromise = useRef<Promise<Position> | null>(null);
  const [step, setStep] = useState<Step>("home");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [locations, setLocations] = useState<{ device: Position; exif: Position | null; map: Position | null } | null>(
    null,
  );
  const [locationChoice, setLocationChoice] = useState<LocationChoice>("device");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [aiSource, setAiSource] = useState<"ai" | "mock">("ai");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState("");

  const position = locations ? (locations[locationChoice] ?? locations.device) : null;

  function startReport(source: "camera" | "gallery") {
    // Ask for location while the user is taking or choosing the photo.
    positionPromise.current = getPosition();
    (source === "camera" ? cameraInput : galleryInput).current?.click();
  }

  async function onPhotoSelected(file: File | undefined) {
    if (!file) return;
    setStep("analyzing");
    try {
      const [blob, device, exif] = await Promise.all([
        downscaleImage(file),
        positionPromise.current ?? getPosition(),
        readPhotoPosition(file),
      ]);
      if (photo) URL.revokeObjectURL(photo.url);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
      setLocations({ device, exif, map: null });
      setLocationChoice("device");

      const data = await requestAnalysis(blob);
      setAnalysis(data.analysis);
      setAiSource(data.source);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Coś poszło nie tak");
      setStep("error");
    }
  }

  async function regenerate() {
    if (!photo) return;
    const data = await requestAnalysis(photo.blob, notes);
    setAnalysis(data.analysis);
    setAiSource(data.source);
  }

  async function submit() {
    if (!photo || !position || !analysis) return;
    setStep("submitting");
    try {
      const form = new FormData();
      form.append("image", photo.blob, "photo.jpg");
      form.append("lat", String(position.lat));
      form.append("lng", String(position.lng));
      form.append("location_source", position.source);
      form.append("category", analysis.category);
      form.append("title", analysis.title);
      form.append("formal_report", analysis.formal_report);
      const reporter = getReporterId();
      if (reporter) form.append("reporter_id", reporter);
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
    for (const input of [cameraInput, galleryInput]) if (input.current) input.current.value = "";
    setPhoto(null);
    setLocations(null);
    setAnalysis(null);
    setNotes("");
    setResult(null);
    setError("");
    setStep("home");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPhotoSelected(e.target.files?.[0])}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
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

      {step === "review" && analysis && photo && locations && position && (
        <Review
          photoUrl={photo.url}
          locations={locations}
          locationChoice={locationChoice}
          position={position}
          onLocationChoice={setLocationChoice}
          onMapPick={(lat, lng) => {
            setLocations({ ...locations, map: { lat, lng, source: "map" } });
            setLocationChoice("map");
          }}
          analysis={analysis}
          aiSource={aiSource}
          notes={notes}
          onNotes={setNotes}
          onRegenerate={regenerate}
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

function Home({ onStart }: { onStart: (source: "camera" | "gallery") => void }) {
  const steps = [
    { icon: Camera, text: "Zrób zdjęcie usterki lub bariery" },
    { icon: Sparkles, text: "AI rozpozna problem i napisze oficjalne zgłoszenie" },
    { icon: ShieldCheck, text: "Potwierdź przez mObywatel – gotowe" },
  ];
  return (
    <div className="flex flex-1 flex-col">
      <section className="rounded-b-[2rem] bg-gradient-to-br from-brand to-brand-dark px-6 pb-10 pt-[max(3rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-200">
            <MapPin className="size-4" /> QuickReport
          </p>
          <Link
            href="/moje-zgloszenia"
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white"
          >
            <ClipboardList className="size-4" /> Moje zgłoszenia
          </Link>
        </div>
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
        <button onClick={() => onStart("camera")} className="btn-primary flex items-center justify-center gap-3 py-5 text-lg">
          <Camera className="size-6" /> Zgłoś problem
        </button>
        <button
          onClick={() => onStart("gallery")}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 font-medium text-slate-700"
        >
          <ImageIcon className="size-5" /> Wybierz zdjęcie z galerii
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
  locations: { device: Position; exif: Position | null; map: Position | null };
  locationChoice: LocationChoice;
  position: Position;
  onLocationChoice: (c: LocationChoice) => void;
  onMapPick: (lat: number, lng: number) => void;
  analysis: Analysis;
  aiSource: "ai" | "mock";
  notes: string;
  onNotes: (n: string) => void;
  onRegenerate: () => Promise<void>;
  onChange: (a: Analysis) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const { analysis, onChange } = props;
  const notDetected = analysis.category === DEFAULT_CATEGORY;
  const canSend = !notDetected && analysis.title.trim().length >= 3 && analysis.formal_report.trim().length >= 20;

  const notesSection = (
    <NotesSection notes={props.notes} onNotes={props.onNotes} onRegenerate={props.onRegenerate} highlight={notDetected} />
  );

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Sprawdź zgłoszenie" onBack={props.onBack} />
      <div className="flex-1 space-y-5 px-5 pb-6">
        <PhotoPreview url={props.photoUrl} />

        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-brand">
          <Sparkles className="size-3.5" />
          {props.aiSource === "ai" ? "Wygenerowane przez AI" : "Tryb demo (AI niedostępne)"}
        </span>

        {notDetected && (
          <div className="rounded-2xl bg-amber-50 p-4 text-amber-900">
            <p className="flex items-center gap-2 font-semibold">
              <ScanSearch className="size-5" /> Nie rozpoznaliśmy problemu na zdjęciu
            </p>
            <p className="mt-1 text-sm">Opisz go własnymi słowami – AI przygotuje zgłoszenie na tej podstawie. Możesz też wybrać kategorię ręcznie.</p>
          </div>
        )}
        {notDetected && notesSection}

        <LocationSection {...props} />

        <fieldset>
          <legend className="label">Kategoria</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {REPORTABLE_CATEGORIES.map((c) => {
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
          <span className="mt-1 block text-xs text-slate-500">Lokalizację i datę system dopisze automatycznie.</span>
        </label>

        {!notDetected && notesSection}
      </div>
      <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur pb-[max(1rem,env(safe-area-inset-bottom))]">
        {notDetected && <p className="mb-2 text-center text-xs text-amber-700">Dodaj opis lub wybierz kategorię, aby wysłać.</p>}
        <button onClick={props.onNext} disabled={!canSend} className="btn-primary">
          Dalej – potwierdź i wyślij
        </button>
      </div>
    </div>
  );
}

function LocationSection(props: {
  locations: { device: Position; exif: Position | null; map: Position | null };
  locationChoice: LocationChoice;
  position: Position;
  onLocationChoice: (c: LocationChoice) => void;
  onMapPick: (lat: number, lng: number) => void;
}) {
  const { locations, locationChoice, position } = props;
  const options: { id: LocationChoice; label: string; icon: typeof MapPin; available: boolean }[] = [
    {
      id: "device",
      label: locations.device.source === "demo" ? "Demo" : "Moje położenie",
      icon: LocateFixed,
      available: true,
    },
    { id: "exif", label: "Ze zdjęcia", icon: ImageIcon, available: locations.exif !== null },
    { id: "map", label: "Na mapie", icon: MapIcon, available: true },
  ];
  const visible = options.filter((o) => o.available);

  return (
    <section>
      <p className="label">Lokalizacja</p>
      <div className={`mt-2 grid gap-1 rounded-xl bg-slate-100 p-1 ${visible.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {visible.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => props.onLocationChoice(id)}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm transition ${
              locationChoice === id ? "bg-white font-semibold text-brand shadow-sm" : "text-slate-600"
            }`}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {locationChoice === "map" && (
        <div className="mt-2 h-56 overflow-hidden rounded-xl border border-slate-200">
          <PickerMap
            value={locations.map ?? locations.exif ?? locations.device}
            reference={locations.device}
            onPick={props.onMapPick}
          />
        </div>
      )}

      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
        <MapPin className="size-3.5 shrink-0" />
        {locationChoice === "map" && !locations.map
          ? "Dotknij mapy, aby wskazać miejsce problemu."
          : position.source === "demo"
            ? "Brak dostępu do lokalizacji – użyto lokalizacji demonstracyjnej."
            : `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}${position.accuracy ? ` (±${Math.round(position.accuracy)} m)` : ""}`}
      </p>
    </section>
  );
}

function NotesSection(props: {
  notes: string;
  onNotes: (n: string) => void;
  onRegenerate: () => Promise<void>;
  highlight: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run() {
    setBusy(true);
    setFailed(false);
    try {
      await props.onRegenerate();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={props.highlight ? "rounded-2xl border-2 border-amber-300 bg-white p-3" : undefined}>
      <label className="block">
        <span className="label flex items-center gap-1.5">
          <NotebookPen className="size-3.5" /> Twój opis {props.highlight ? "" : "(opcjonalnie)"}
        </span>
        <textarea
          value={props.notes}
          onChange={(e) => props.onNotes(e.target.value)}
          maxLength={NOTES_MAX_LENGTH}
          rows={3}
          placeholder="Np. dziura jest tu od tygodnia, wieczorem jej nie widać, wpadł w nią rowerzysta"
          className="input mt-2 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={run}
        disabled={busy || !props.notes.trim()}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-brand px-3 py-2.5 text-sm font-semibold text-brand disabled:opacity-40"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {busy ? "Generuję zgłoszenie…" : "Uwzględnij opis w zgłoszeniu"}
      </button>
      {failed && <p className="mt-1 text-xs text-rose-600">Nie udało się wygenerować zgłoszenia. Spróbuj ponownie.</p>}
    </section>
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

      <Link
        href="/moje-zgloszenia"
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 font-medium text-slate-700"
      >
        <ClipboardList className="size-5" /> Śledź status w „Moich zgłoszeniach”
      </Link>
      <button onClick={onAgain} className="btn-primary mt-3">
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
