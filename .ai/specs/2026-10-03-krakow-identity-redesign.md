# Kraków Identity Redesign

- Status: `Implemented`
- Type: `design`
- Branch: `None (user manages Git; work stays in the current working tree)`
- Created: `2026-10-03`
- Updated: `2026-10-03`
- Owner: `Marek55S`
- Authorization: `2026-10-03: user rejected the civic-signage look ("wygląda jak aplikacja InPost") and asked for a nice, modern, minimal, usable UI that fits the colours and graphic style of City of Kraków websites and apps.`

## Evidence

- City of Kraków visual identity, "Księga Znaku | Logo" (krakow.pl/zalacznik/284611): primary blue Pantone 2945 C = RGB 0/100/167 (#0064A7); red 185 C = 228/5/33 (#E40521); yellow 116 C = 255/204/0 (#FFCC00); beige 465 C = 205/183/148 (#CDB794); colours derive from the city's heraldry; logotype set in Ubuntu Medium; the logo is based on the square plan of the Main Square.
- "Wytyczne dla programów miejskich" (krakow.pl/zalacznik/381568) and Budżet Obywatelski book (krakow.pl/zalacznik/383415): Lato is the official typeface for official and promotional texts.
- Screenshots 2026-10-03: ZDMK (zdmk.krakow.pl) and BIP Kraków (bip.krakow.pl) use white pages, the city blue for navigation and actions (BIP button computed as rgb(0,100,167)), Lato, square brand motif. krakow.pl and budzet.krakow.pl blocked automated browsers.

## Design contract

- Modern and minimal: white background, light surfaces (#F3F6F9), hairline rules, 8–12 px radii, sentence case, no gradients or heavy shadows.
- Colour roles: Kraków blue for primary actions, links, active states and the app mark; heraldic beige/yellow/red as the low/medium/high severity scale; green only for "resolved"; amber tint for warnings.
- Type: Lato 400/700/900 for all UI; Ubuntu Medium only for the "QuickReport" wordmark; Geist Mono for ticket numbers and coordinates.
- Identity: own app mark (blue rounded square with a square outline and a dot, a nod to the Main Square plan). The official city logo and crest are not used, to avoid presenting the prototype as an official city service.
- Structure and behaviour unchanged from the previous redesign (review sections, compact category picker, list + map dashboard, ticket numbers).
- Contrast checked: white on blue 6.2:1, ink on white 15.2:1, muted on white 5.9:1, ink on beige 7.8:1, ink on yellow 10.0:1, white on red 4.8:1, white on green 5.4:1.

## Execution result

- Actual files: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/icon.svg`, `public/icon.svg`, `src/app/manifest.ts`, `src/components/ui.tsx`, `src/components/admin/severity.ts`, `src/components/admin/Dashboard.tsx`, `src/components/admin/LoginForm.tsx`, `src/components/admin/TicketMap.tsx`, `src/components/resident/ReportFlow.tsx`, `src/components/resident/MyReports.tsx`, `src/components/resident/PickerMap.tsx`
- Validation: production build captured with Playwright at 390 × 844 (home, analysing, review, expanded categories, map picker, mObywatel, confirmation, "Moje zgłoszenia", not-detected) and 1440 × 900 / 1280 × 800 (dashboard with selected ticket, mobile dashboard, login with error). One fix pass: crowded home header ("Kraków" moved to an eyebrow above the headline). `pnpm build` and `pnpm lint` passed. Test ticket removed.
- Observed: one Gemini call returned 429 RESOURCE_EXHAUSTED during the capture run and the app fell back to demo mode as designed.
- Not verified: physical phone, Safari, keyboard-only walkthrough.

## Follow-up (2026-10-03)

- Request: remove the "Dla mieszkańców Krakowa" caption, restore the colour map, adapt the resident UI to desktop (mobile stays as is).
- Changes: caption and the "Kraków" label next to the wordmark removed; grayscale basemap filter removed (dashboard map in full colour); resident app widens to `max-w-6xl` at `lg`: home becomes two columns with a drag-and-drop photo zone (desktop only; phone keeps camera and gallery buttons), analysis screen two columns, review two columns (photo + location sticky on the left, category/title/letter/notes and the send button on the right; mobile keeps the sticky bottom bar), mObywatel and confirmation centred at `max-w-lg`, "Moje zgłoszenia" at `max-w-3xl`, taller map picker on desktop.
- Validation: production build captured at 1440 × 900 (home, analysing, review, review with map, review scrolled, mObywatel, confirmation, "Moje zgłoszenia", dashboard with colour map) and 390 × 844 (home). `pnpm build` and `pnpm lint` passed. The final `lg:h-80` map height change was build-checked but not recaptured. Test ticket removed.
