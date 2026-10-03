"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Image as ImageIcon,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  ScanSearch,
  Sparkles,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { CATEGORY_ICONS } from "@/components/categories";
import { ticketNumber, Wordmark } from "@/components/ui";
import {
  CATEGORY_LABELS,
  DEFAULT_CATEGORY,
  NOTES_MAX_LENGTH,
  REPORTABLE_CATEGORIES,
  type Analysis,
  type Category,
  type SubmitResult,
} from "@/lib/types";
import { downscaleImage, getPosition, readPhotoPosition, type Position } from "./media";
import { getReporterId } from "./reporter";

const PickerMap = dynamic(() => import("./PickerMap"), {
  ssr: false,
  loading: () => <div className="flex size-full items-center justify-center text-sm text-ink-muted">Ładowanie mapy…</div>,
});

const DESKTOP_QUERY = "(min-width: 1024px)";

/** True on wide screens; the mobile layout is the default (also during server rendering). */
function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(DESKTOP_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

type Step = "home" | "analyzing" | "review" | "auth" | "submitting" | "done" | "error";
type LocationChoice = "device" | "exif" | "map";
type AnalyzeResponse = { analysis: Analysis; source: "ai" | "mock"; notes_used: boolean };

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

  /** Desktop drag and drop: same flow as picking a file. */
  function startWithFile(file: File) {
    positionPromise.current = getPosition();
    onPhotoSelected(file);
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

  /** Returns false when the AI found the notes unrelated; the current report is then kept. */
  async function regenerate(): Promise<boolean> {
    if (!photo) return false;
    const data = await requestAnalysis(photo.blob, notes);
    if (!data.notes_used) return false;
    setAnalysis(data.analysis);
    setAiSource(data.source);
    return true;
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper lg:max-w-6xl">
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

      {step === "home" && <Home onStart={startReport} onFile={startWithFile} />}

      {step === "analyzing" && (
        <div className="flex flex-1 flex-col">
          <TopBar title="Analiza zdjęcia" step={1} />
          <div className="flex flex-1 flex-col px-5 pb-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8">
            {photo && <PhotoPreview url={photo.url} />}
            <div>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-primary-tint" role="progressbar" aria-label="Analiza zdjęcia">
              <div className="progress-scan h-full w-2/5 rounded-full bg-primary" />
            </div>
            <h2 className="display mt-6 text-3xl leading-none">Analizuję zdjęcie…</h2>
            <p className="mt-2 text-ink-muted">AI rozpoznaje problem i przygotowuje pismo do urzędu. To zwykle kilka sekund.</p>
            </div>
          </div>
        </div>
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
        <div className="flex flex-1 flex-col justify-center px-5 py-10 lg:mx-auto lg:w-full lg:max-w-lg">
          <TriangleAlert className="size-10 text-sev-high" aria-hidden />
          <h2 className="display mt-4 text-3xl leading-none">Nie udało się</h2>
          <p className="mt-2 text-ink-muted">{error}</p>
          <button onClick={reset} className="btn-primary mt-8">
            Spróbuj ponownie
          </button>
        </div>
      )}
    </main>
  );
}

function Home({ onStart, onFile }: { onStart: (source: "camera" | "gallery") => void; onFile: (file: File) => void }) {
  const steps = [
    "Zrób zdjęcie usterki lub bariery.",
    "AI rozpozna problem i napisze oficjalne pismo do urzędu.",
    "Sprawdź, potwierdź przez mObywatel i gotowe.",
  ];
  return (
    <div className="flex flex-1 flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-8 lg:pt-6">
      <header className="flex items-center justify-between">
        <Wordmark />
        <Link href="/moje-zgloszenia" className="link flex items-center gap-1 text-[15px]">
          Moje zgłoszenia <ArrowRight className="size-4" aria-hidden />
        </Link>
      </header>

      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:pb-16">
        <div className="flex flex-1 flex-col lg:flex-none">
          <section className="mt-12 lg:mt-0">
            <h1 className="display text-[2.35rem] leading-[1.08] lg:text-[3.25rem]">
              Zgłoś problem w mieście <span className="text-primary">jednym zdjęciem</span>
            </h1>
            <p className="mt-4 text-lg leading-snug text-ink-muted lg:max-w-md lg:text-xl">
              Bez formularzy i szukania właściwego wydziału. Resztą zajmie się AI i urząd.
            </p>
          </section>

          <ol className="mt-8 space-y-1">
            {steps.map((text, i) => (
              <li key={text} className="flex items-center gap-3.5 py-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-tint text-sm font-black text-primary tabular-nums">
                  {i + 1}
                </span>
                <span className="leading-snug">{text}</span>
              </li>
            ))}
          </ol>

          {/* Phone: camera first. On desktop the drop zone on the right replaces these buttons. */}
          <div className="mt-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 lg:hidden">
            <button onClick={() => onStart("camera")} className="btn-primary py-5 text-xl">
              <Camera className="size-6" aria-hidden /> Zgłoś problem
            </button>
            <button onClick={() => onStart("gallery")} className="btn-secondary mt-3">
              <ImageIcon className="size-5" aria-hidden /> Wybierz zdjęcie z galerii
            </button>
            <p className="mt-4 text-sm leading-snug text-ink-muted">{CLUSTER_NOTE}</p>
          </div>
        </div>

        <DropZone onPick={() => onStart("gallery")} onFile={onFile} />
      </div>
    </div>
  );
}

const CLUSTER_NOTE =
  "Zgłoszenia z tego samego miejsca łączymy w jedno – im więcej osób, tym wyższy priorytet w urzędzie.";

/** Desktop only: photos usually already sit on the computer, so accept a dropped file. */
function DropZone({ onPick, onFile }: { onPick: () => void; onFile: (file: File) => void }) {
  const [over, setOver] = useState(false);
  return (
    <div className="hidden lg:block">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
          if (file) onFile(file);
        }}
        className={`flex aspect-[4/3] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-10 text-center transition-colors ${
          over ? "border-primary bg-primary-tint" : "border-rule-strong bg-surface"
        }`}
      >
        <span className="flex size-14 items-center justify-center rounded-xl bg-paper text-primary shadow-sm">
          <Upload className="size-7" aria-hidden />
        </span>
        <p className="mt-5 text-xl font-bold">Przeciągnij tutaj zdjęcie problemu</p>
        <p className="mt-1 text-ink-muted">JPG, PNG lub WEBP. Lokalizację odczytamy ze zdjęcia albo wskażesz ją na mapie.</p>
        <button onClick={onPick} className="btn-primary mt-6 w-auto px-6">
          <ImageIcon className="size-5" aria-hidden /> Wybierz zdjęcie z dysku
        </button>
      </div>
      <p className="mt-4 text-sm leading-snug text-ink-muted">{CLUSTER_NOTE}</p>
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
  onRegenerate: () => Promise<boolean>;
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

  const isDesktop = useIsDesktop();
  const location = (
    <Section>
      <LocationSection {...props} />
    </Section>
  );
  const sendBar = (
    <>
      {notDetected && <p className="mb-2 text-sm font-medium text-warn-ink">Dodaj opis lub wybierz kategorię, aby wysłać.</p>}
      <button onClick={props.onNext} disabled={!canSend} className="btn-primary">
        Dalej – potwierdź i wyślij <ArrowRight className="size-5" aria-hidden />
      </button>
    </>
  );

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Sprawdź zgłoszenie" step={2} onBack={props.onBack} />
      {/* Desktop: photo and location stay in view on the left while the text is edited on the right. */}
      <div className="flex-1 px-5 pb-6 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12 lg:px-8 lg:pb-12">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="relative">
            <PhotoPreview url={props.photoUrl} />
            <span className="tag absolute left-2 top-2 bg-paper/95 text-primary shadow-sm">
              <Sparkles className="size-3" aria-hidden />
              {props.aiSource === "ai" ? "Opis przygotowało AI" : "Tryb demo – AI niedostępne"}
            </span>
          </div>
          {isDesktop && location}
        </div>

        <div className="lg:pt-4">
          {notDetected && (
            <div className="mt-5 rounded-lg bg-warn-bg px-4 py-3 text-warn-ink lg:mt-0" role="status">
              <p className="flex items-center gap-2 font-bold">
                <ScanSearch className="size-5" aria-hidden /> Nie rozpoznaliśmy problemu na zdjęciu
              </p>
              <p className="mt-1 text-[15px] leading-snug">
                Opisz go własnymi słowami – AI przygotuje zgłoszenie na tej podstawie. Możesz też wybrać kategorię ręcznie.
              </p>
            </div>
          )}
          {notDetected && <Section>{notesSection}</Section>}

          <Section first={!notDetected}>
            <CategoryPicker
              value={analysis.category}
              onChange={(category) => onChange({ ...analysis, category })}
              forceOpen={notDetected}
            />
          </Section>

          <Section>
            <label className="block">
              <span className="label">Tytuł</span>
              <input
                value={analysis.title}
                onChange={(e) => onChange({ ...analysis, title: e.target.value })}
                className="input mt-2 text-lg font-medium"
              />
            </label>
          </Section>

          <Section>
            <label className="block">
              <span className="label">Treść pisma do urzędu</span>
              <textarea
                value={analysis.formal_report}
                onChange={(e) => onChange({ ...analysis, formal_report: e.target.value })}
                rows={8}
                className="input mt-2 field-sizing-content min-h-40 bg-surface text-[15px] leading-relaxed focus:bg-paper"
              />
              <span className="mt-1.5 block text-sm text-ink-muted">Lokalizację i datę system dopisze automatycznie.</span>
            </label>
          </Section>

          {!isDesktop && location}

          {!notDetected && <Section>{notesSection}</Section>}

          {isDesktop && <div className="mt-8 border-t border-rule pt-6">{sendBar}</div>}
        </div>
      </div>
      {!isDesktop && (
        <div className="sticky bottom-0 border-t border-rule bg-paper/95 backdrop-blur px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {sendBar}
        </div>
      )}
    </div>
  );
}

function Section({ children, first = false }: { children: React.ReactNode; first?: boolean }) {
  return <div className={`mt-5 border-t border-rule pt-4 ${first ? "lg:mt-0 lg:border-t-0 lg:pt-0" : ""}`}>{children}</div>;
}

/** Shows the AI-chosen category compactly; the full list opens only when the resident wants to change it. */
function CategoryPicker(props: { value: Category; onChange: (c: Category) => void; forceOpen: boolean }) {
  const [open, setOpen] = useState(false);
  const expanded = open || props.forceOpen;
  const selected = props.value === DEFAULT_CATEGORY ? null : props.value;
  const SelectedIcon = selected ? CATEGORY_ICONS[selected] : null;

  return (
    <fieldset>
      <legend className="label">Kategoria</legend>
      {selected && SelectedIcon && (
        <div className="mt-2 flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary">
            <SelectedIcon className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 text-lg font-medium leading-tight">{CATEGORY_LABELS[selected]}</span>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={expanded}
            className="link shrink-0 px-1 text-[15px]"
          >
            {expanded ? "Zwiń" : "Zmień"}
          </button>
        </div>
      )}
      {expanded && (
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {REPORTABLE_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c];
            const active = props.value === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  props.onChange(c);
                  setOpen(false);
                }}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[15px] leading-tight transition-colors ${
                  active ? "border-primary bg-primary-tint font-bold text-primary-dark" : "border-rule bg-paper hover:border-primary"
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {CATEGORY_LABELS[c]}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
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
      <div
        className={`mt-2 grid gap-1 rounded-lg bg-surface p-1 ${visible.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
      >
        {visible.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={locationChoice === id}
            onClick={() => props.onLocationChoice(id)}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[15px] font-bold transition-colors ${
              locationChoice === id ? "bg-paper text-primary shadow-sm ring-1 ring-rule" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden /> {label}
          </button>
        ))}
      </div>

      {locationChoice === "map" && (
        <div className="mt-2 h-56 overflow-hidden rounded-lg border border-rule-strong lg:h-80">
          <PickerMap
            value={locations.map ?? locations.exif ?? locations.device}
            reference={locations.device}
            onPick={props.onMapPick}
          />
        </div>
      )}

      <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
        <MapPin className="size-4 shrink-0" aria-hidden />
        {locationChoice === "map" && !locations.map ? (
          "Dotknij mapy, aby wskazać miejsce problemu."
        ) : position.source === "demo" ? (
          "Brak dostępu do lokalizacji – użyto lokalizacji demonstracyjnej."
        ) : (
          <span className="font-mono text-[13px]">
            {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            {position.accuracy ? ` · ±${Math.round(position.accuracy)} m` : ""}
          </span>
        )}
      </p>
    </section>
  );
}

function NotesSection(props: {
  notes: string;
  onNotes: (n: string) => void;
  onRegenerate: () => Promise<boolean>;
  highlight: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<"updated" | "ignored" | "failed" | null>(null);
  const feedback = useRef<HTMLDivElement>(null);

  // The result appears at the bottom of the screen, under the sticky send bar; bring it into view.
  useEffect(() => {
    if (!outcome) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    feedback.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }, [outcome]);

  async function run() {
    setBusy(true);
    setOutcome(null);
    try {
      setOutcome((await props.onRegenerate()) ? "updated" : "ignored");
    } catch {
      setOutcome("failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <label className="block">
        <span className="label">{props.highlight ? "Twój opis problemu" : "Twój opis (opcjonalnie)"}</span>
        <textarea
          value={props.notes}
          onChange={(e) => {
            props.onNotes(e.target.value);
            setOutcome(null);
          }}
          maxLength={NOTES_MAX_LENGTH}
          rows={3}
          placeholder="Np. dziura jest tu od tygodnia, wieczorem jej nie widać, wpadł w nią rowerzysta"
          className={`input mt-2 text-[15px] ${props.highlight ? "border-primary ring-4 ring-primary/15" : ""}`}
        />
      </label>
      <button type="button" onClick={run} disabled={busy || !props.notes.trim()} className="btn-secondary mt-2 py-2.5">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
        {busy ? "Generuję zgłoszenie…" : "Uwzględnij opis w zgłoszeniu"}
      </button>
      <div ref={feedback}>
        {outcome === "updated" && (
          <p role="status" className="mt-2 flex items-start gap-1.5 text-sm font-medium text-ok">
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> Zaktualizowano zgłoszenie na podstawie Twojego opisu.
          </p>
        )}
        {outcome === "ignored" && (
          <p role="status" className="mt-2 flex items-start gap-1.5 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-ink">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn-ink" aria-hidden />
            Opis nie dotyczy zgłaszanego problemu, więc treść zgłoszenia nie została zmieniona. Opisz, co jest nie tak w
            tym miejscu.
          </p>
        )}
        {outcome === "failed" && (
          <p role="alert" className="mt-2 text-sm font-medium text-sev-high">
            Nie udało się wygenerować zgłoszenia. Spróbuj ponownie.
          </p>
        )}
      </div>
    </section>
  );
}

function AuthMock({ busy, onBack, onConfirm }: { busy: boolean; onBack: () => void; onConfirm: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Potwierdzenie tożsamości" step={3} onBack={busy ? undefined : onBack} />
      <div className="flex flex-1 flex-col px-5 pt-6 lg:mx-auto lg:w-full lg:max-w-lg lg:pt-16">
        <p className="label">Logowanie przez mObywatel · symulacja w prototypie</p>
        <h2 className="display mt-2 text-3xl leading-none">Potwierdź, że to Ty</h2>
        <p className="mt-3 leading-snug text-ink-muted">
          Urząd przyjmie zgłoszenie jako oficjalne pismo podpisane Twoimi danymi.
        </p>
        <dl className="mt-6 border-y border-rule">
          <div className="flex justify-between border-b border-rule py-3">
            <dt className="text-ink-muted">Imię i nazwisko</dt>
            <dd className="font-medium">Jan Kowalski</dd>
          </div>
          <div className="flex justify-between py-3">
            <dt className="text-ink-muted">PESEL</dt>
            <dd className="font-mono">•••••••1234</dd>
          </div>
        </dl>
        <div className="mt-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 lg:mt-10">
          <button onClick={onConfirm} disabled={busy} className="btn-ink">
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Check className="size-5" aria-hidden />}
            {busy ? "Wysyłanie zgłoszenia…" : "Potwierdź w mObywatel i wyślij"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Done({ result, title, onAgain }: { result: SubmitResult; title?: string; onAgain: () => void }) {
  return (
    <div className="flex flex-1 flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-8 lg:pt-6">
      <Wordmark />
      <div className="flex flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-lg lg:flex-none lg:pt-10">
      <div className="mt-10">
        <span className="flex size-12 items-center justify-center rounded-xl bg-ok-tint text-ok">
          <Check className="size-7" aria-hidden />
        </span>
        <h2 className="display mt-5 text-[2.8rem] leading-[0.95]">Zgłoszenie wysłane</h2>
        {title && <p className="mt-2 text-lg text-ink-muted">{title}</p>}
      </div>

      {/* Receipt-style summary with the reference number. */}
      <dl className="mt-8 rounded-xl bg-surface px-4">
        <div className="flex items-baseline justify-between border-b border-rule py-3">
          <dt className="label">Numer zgłoszenia</dt>
          <dd className="font-mono text-lg font-medium" data-ticket-id={result.ticketId}>
            {ticketNumber(result.ticketId)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="label">Zgłosili ten problem</dt>
          <dd className="display text-4xl leading-none tabular-nums">{result.severity_score}</dd>
        </div>
      </dl>
      <p className="mt-4 leading-snug">
        {result.merged ? (
          <>
            <strong>{reportersText(result.severity_score)}.</strong> Dołączyliśmy Twoje zdjęcie do istniejącego zgłoszenia
            i podnieśliśmy jego priorytet w urzędzie.
          </>
        ) : (
          <>
            <strong>Jesteś pierwszą osobą, która to zgłosiła.</strong> Urząd otrzymał nowe zgłoszenie z Twoim zdjęciem i
            lokalizacją.
          </>
        )}
      </p>

      <div className="mt-auto space-y-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 lg:mt-4">
        <Link href="/moje-zgloszenia" className="btn-secondary">
          Śledź status w „Moich zgłoszeniach”
        </Link>
        <button onClick={onAgain} className="btn-primary">
          <Camera className="size-5" aria-hidden /> Zgłoś kolejny problem
        </button>
      </div>
      </div>
    </div>
  );
}

// Polish plural: 2–4 (except 12–14) "osoby zgłosiły", otherwise "osób zgłosiło".
function reportersText(n: number) {
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
  return few ? `Ten problem zgłosiły już ${n} osoby` : `Ten problem zgłosiło już ${n} osób`;
}

function TopBar({ title, step, onBack }: { title: string; step?: number; onBack?: () => void }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-rule bg-paper px-3 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] lg:mb-6 lg:px-6 lg:py-4">
      {onBack ? (
        <button onClick={onBack} aria-label="Wstecz" className="rounded-lg p-2 hover:bg-surface">
          <ArrowLeft className="size-5" />
        </button>
      ) : (
        <span className="size-9" />
      )}
      <h1 className="display flex-1 text-xl leading-none">{title}</h1>
      {step && <span className="font-mono text-[13px] text-ink-muted">Krok {step}/3</span>}
    </header>
  );
}

function PhotoPreview({ url }: { url: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- local object URL
  return <img src={url} alt="Zdjęcie zgłoszenia" className="mt-4 aspect-[4/3] w-full rounded-xl object-cover" />;
}
