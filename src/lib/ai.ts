import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { CATEGORIES, CATEGORY_LABELS, type Analysis } from "./types";

const TIMEOUT_MS = 25_000;

const SYSTEM_PROMPT = `Jesteś asystentem urzędu miasta, który analizuje zdjęcia problemów w przestrzeni miejskiej zgłaszanych przez mieszkańców.
Na podstawie zdjęcia:
1. Przypisz dokładnie jedną kategorię:
${CATEGORIES.map((c) => `   - ${c}: ${CATEGORY_LABELS[c]}`).join("\n")}
   ROAD_DAMAGE: dziury, wyrwy, spękania jezdni, chodnika, ścieżki rowerowej.
   ACCESSIBILITY_BARRIER: przeszkody dla osób z niepełnosprawnościami, starszych, z wózkami (wysokie krawężniki, schody bez podjazdu, zastawione przejścia).
   INFRASTRUCTURE_FAILURE: uszkodzone oświetlenie, sygnalizacja, znaki, wiaty, ławki, hydranty, wycieki wody.
   OTHER: wszystko inne lub gdy na zdjęciu nie widać problemu.
2. Napisz krótki tytuł (maksymalnie 8 słów, po polsku), np. "Uszkodzona nawierzchnia chodnika".
3. Napisz treść oficjalnego zgłoszenia do urzędu miasta po polsku, profesjonalnym językiem urzędowym (3–6 zdań):
   zacznij od "Szanowni Państwo,", opisz rzeczowo, co widać na zdjęciu, wskaż potencjalne zagrożenie i wnieś o konkretne działanie.
   Podaj lokalizację i datę z danych zgłoszenia. Nie wymyślaj adresu, nazw ulic ani szczegółów, których nie widać na zdjęciu.
   Nie dodawaj podpisu ani danych osobowych – dane zgłaszającego dołącza system.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: [...CATEGORIES] },
    title: { type: "string" },
    formal_report: { type: "string" },
  },
  required: ["category", "title", "formal_report"],
};

// Model output is untrusted: unknown categories fall back to OTHER.
const ModelOutputSchema = z.object({
  category: z.enum(CATEGORIES).catch("OTHER"),
  title: z.string().trim().min(3).max(120),
  formal_report: z.string().trim().min(20).max(4000),
});

export type AnalyzeInput = {
  image: Buffer;
  mimeType: string;
  lat?: number;
  lng?: number;
};

export type AnalyzeResult = {
  analysis: Analysis;
  source: "ai" | "mock";
};

let client: GoogleGenAI | undefined;

function getClient() {
  client ??= new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION ?? "europe-west1",
  });
  return client;
}

function reportContext({ lat, lng }: AnalyzeInput) {
  const date = new Date().toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" });
  const location =
    lat !== undefined && lng !== undefined
      ? `współrzędne GPS ${lat.toFixed(6)}, ${lng.toFixed(6)}`
      : "lokalizacja nieznana";
  return `Dane zgłoszenia: data ${date}, ${location}.`;
}

export async function analyzeImage(input: AnalyzeInput): Promise<AnalyzeResult> {
  if (process.env.AI_MOCK === "1" || !process.env.GOOGLE_CLOUD_PROJECT) {
    return { analysis: mockAnalysis(input), source: "mock" };
  }

  try {
    const response = await getClient().models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: input.mimeType, data: input.image.toString("base64") } },
            { text: reportContext(input) },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      },
    });
    const analysis = ModelOutputSchema.parse(JSON.parse(response.text ?? ""));
    return { analysis, source: "ai" };
  } catch (error) {
    // Keep the resident flow working (and the demo alive) if Vertex AI is unavailable.
    console.error("Gemini analysis failed, using mock", error);
    return { analysis: mockAnalysis(input), source: "mock" };
  }
}

function mockAnalysis(input: AnalyzeInput): Analysis {
  return {
    category: "ROAD_DAMAGE",
    title: "Uszkodzona nawierzchnia chodnika",
    formal_report: `Szanowni Państwo,
uprzejmie informuję o uszkodzeniu nawierzchni chodnika widocznym na załączonym zdjęciu. Ubytki w nawierzchni stwarzają ryzyko potknięcia się pieszych oraz utrudniają poruszanie się osobom na wózkach. ${reportContext(input)} Wnoszę o zabezpieczenie miejsca oraz naprawę nawierzchni w możliwie najkrótszym terminie.`,
  };
}
